from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.core.email import queue_email
from apps.ops.audit import record_audit
from apps.orders.models import Order, OrderTimelineEvent

from .models import PaymentAttempt, PaymentWebhookEvent
from .providers import create_stripe_payment_intent


def cents_from_decimal(amount):
    return int((amount * Decimal("100")).quantize(Decimal("1")))


def normalize_processor_payload(payload):
    if hasattr(payload, "to_dict_recursive"):
        return payload.to_dict_recursive()
    return dict(payload)


def map_stripe_status(status):
    mapping = {
        "requires_payment_method": PaymentAttempt.Status.PENDING,
        "requires_confirmation": PaymentAttempt.Status.PENDING,
        "requires_action": PaymentAttempt.Status.REQUIRES_ACTION,
        "processing": PaymentAttempt.Status.PENDING,
        "requires_capture": PaymentAttempt.Status.AUTHORIZED,
        "succeeded": PaymentAttempt.Status.SUCCEEDED,
        "canceled": PaymentAttempt.Status.CANCELLED,
    }
    return mapping.get(status, PaymentAttempt.Status.FAILED)


def sync_order_payment_status(order, status):
    order.payment_status = status
    order.save(update_fields=["payment_status", "updated_at"])


def get_latest_payment_attempt(order):
    return order.payment_attempts.order_by("-created_at").first()


def ensure_card_payment_order(order, user):
    if order.customer_id != user.id:
        raise serializers.ValidationError("Order does not belong to the authenticated user.")
    if order.payment_method != Order.PaymentMethod.CARD:
        raise serializers.ValidationError("Payment intents are only available for card orders.")
    if order.fulfillment_status == Order.FulfillmentStatus.CANCELLED:
        raise serializers.ValidationError("Cancelled orders cannot create payment intents.")
    return order


def get_or_create_payment_intent(order, actor=None, reason=""):
    existing = order.payment_attempts.filter(
        provider=PaymentAttempt.Provider.STRIPE,
        method_type=Order.PaymentMethod.CARD,
        status__in=[
            PaymentAttempt.Status.PENDING,
            PaymentAttempt.Status.REQUIRES_ACTION,
            PaymentAttempt.Status.AUTHORIZED,
            PaymentAttempt.Status.SUCCEEDED,
        ],
        provider_payment_intent_id__gt="",
    ).order_by("-created_at").first()
    if existing:
        return existing

    amount = order.total_amount
    idempotency_key = order.idempotency_key or str(order.public_id)
    stripe_intent = create_stripe_payment_intent(
        amount_cents=cents_from_decimal(amount),
        currency=settings.STRIPE_CURRENCY.lower(),
        metadata={
            "order_id": str(order.id),
            "order_public_id": str(order.public_id),
            "customer_id": str(order.customer_id),
        },
        idempotency_key=f"payment-intent:{idempotency_key}",
    )

    attempt = PaymentAttempt.objects.create(
        order=order,
        customer=order.customer,
        provider=PaymentAttempt.Provider.STRIPE,
        method_type=Order.PaymentMethod.CARD,
        status=map_stripe_status(stripe_intent["status"]),
        amount=amount,
        currency=settings.STRIPE_CURRENCY.lower(),
        idempotency_key=idempotency_key,
        provider_payment_intent_id=stripe_intent["id"],
        provider_client_secret=stripe_intent.get("client_secret", ""),
        processor_response=normalize_processor_payload(stripe_intent),
    )
    sync_order_payment_status(order, attempt.status)
    OrderTimelineEvent.objects.create(
        order=order,
        event_type="payment_intent_created",
        message="Payment intent created for card checkout.",
    )
    record_audit(
        action_type="payments.intent.created",
        target=attempt,
        actor=actor,
        source="api",
        reason=reason,
        metadata={
            "order_public_id": str(order.public_id),
            "status": attempt.status,
        },
    )
    return attempt


def _maybe_queue_payment_notification(order, attempt):
    if attempt.status == PaymentAttempt.Status.SUCCEEDED:
        OrderTimelineEvent.objects.create(
            order=order,
            event_type="payment_succeeded",
            message="Payment succeeded for this order.",
        )
        record_audit(
            action_type="payments.webhook.succeeded",
            target=attempt,
            source="webhook",
            metadata={"order_public_id": str(order.public_id)},
        )
        queue_email(
            subject="Your Pagana payment succeeded",
            message=f"Payment for order {order.public_id} has been completed successfully.",
            recipient_list=[order.customer.email],
        )
    elif attempt.status in {PaymentAttempt.Status.FAILED, PaymentAttempt.Status.CANCELLED}:
        OrderTimelineEvent.objects.create(
            order=order,
            event_type="payment_failed",
            message="Payment failed or was cancelled for this order.",
        )
        record_audit(
            action_type="payments.webhook.failed",
            target=attempt,
            source="webhook",
            metadata={"order_public_id": str(order.public_id)},
        )
        queue_email(
            subject="Your Pagana payment needs attention",
            message=f"Payment for order {order.public_id} did not complete successfully.",
            recipient_list=[order.customer.email],
        )


def apply_stripe_webhook(event):
    event_id = event["id"]
    event_type = event["type"]
    data = event["data"]["object"]
    intent_id = data["id"]

    with transaction.atomic():
        webhook_event, created = PaymentWebhookEvent.objects.select_for_update().get_or_create(
            provider=PaymentWebhookEvent.Provider.STRIPE,
            event_id=event_id,
            defaults={
                "event_type": event_type,
                "payload": normalize_processor_payload(event),
            },
        )
        if not created and webhook_event.processed_at:
            return webhook_event

        webhook_event.event_type = event_type
        webhook_event.payload = normalize_processor_payload(event)

        attempt = PaymentAttempt.objects.select_related("order", "customer").filter(
            provider=PaymentAttempt.Provider.STRIPE,
            provider_payment_intent_id=intent_id,
        ).order_by("-created_at").first()

        if attempt:
            previous_status = attempt.status
            attempt.status = map_stripe_status(data["status"])
            attempt.provider_client_secret = data.get("client_secret", attempt.provider_client_secret)
            latest_charge = data.get("latest_charge")
            attempt.provider_charge_id = latest_charge or attempt.provider_charge_id
            error = data.get("last_payment_error") or {}
            attempt.last_error_message = error.get("message", "")
            attempt.processor_response = normalize_processor_payload(event)
            attempt.save(
                update_fields=[
                    "status",
                    "provider_client_secret",
                    "provider_charge_id",
                    "last_error_message",
                    "processor_response",
                    "updated_at",
                ]
            )

            sync_order_payment_status(attempt.order, attempt.status)
            webhook_event.payment_attempt = attempt
            if attempt.status != previous_status:
                _maybe_queue_payment_notification(attempt.order, attempt)

        webhook_event.processed_at = timezone.now()
        webhook_event.save(update_fields=["event_type", "payload", "payment_attempt", "processed_at", "updated_at"])

    return webhook_event
