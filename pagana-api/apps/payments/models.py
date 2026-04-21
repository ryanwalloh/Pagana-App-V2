from django.conf import settings
from django.db import models

from apps.core.models import BaseModel
from apps.orders.models import Order


class PaymentAttempt(BaseModel):
    class Provider(models.TextChoices):
        STRIPE = "stripe", "Stripe"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        REQUIRES_ACTION = "requires_action", "Requires action"
        AUTHORIZED = "authorized", "Authorized"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled"
        REFUNDED = "refunded", "Refunded"

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="payment_attempts",
    )
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="payment_attempts",
    )
    provider = models.CharField(
        max_length=24,
        choices=Provider.choices,
        default=Provider.STRIPE,
    )
    method_type = models.CharField(
        max_length=32,
        choices=Order.PaymentMethod.choices,
    )
    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.PENDING,
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="usd")
    idempotency_key = models.CharField(max_length=128, blank=True, db_index=True)
    provider_payment_intent_id = models.CharField(max_length=255, blank=True, db_index=True)
    provider_client_secret = models.CharField(max_length=255, blank=True)
    provider_charge_id = models.CharField(max_length=255, blank=True)
    last_error_message = models.TextField(blank=True)
    processor_response = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(
                fields=("order", "idempotency_key"),
                condition=~models.Q(idempotency_key=""),
                name="unique_payment_attempt_idempotency_per_order",
            )
        ]

    def __str__(self):
        return f"{self.order.public_id} {self.provider} {self.status}"


class PaymentWebhookEvent(BaseModel):
    class Provider(models.TextChoices):
        STRIPE = "stripe", "Stripe"

    provider = models.CharField(
        max_length=24,
        choices=Provider.choices,
        default=Provider.STRIPE,
    )
    event_id = models.CharField(max_length=255, db_index=True)
    event_type = models.CharField(max_length=255)
    payment_attempt = models.ForeignKey(
        PaymentAttempt,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="webhook_events",
    )
    payload = models.JSONField(default=dict, blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(
                fields=("provider", "event_id"),
                name="unique_payment_webhook_event_per_provider",
            )
        ]

    def __str__(self):
        return f"{self.provider}:{self.event_id}"
