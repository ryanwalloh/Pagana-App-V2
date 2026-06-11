from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from apps.core.email import queue_email
from apps.merchants.models import Merchant
from apps.ops.audit import record_audit

from .models import Cart, CartItem, Order, OrderItem, OrderTimelineEvent

ZERO = Decimal("0.00")


def merchant_can_receive_orders(merchant):
    return (
        merchant.approval_status == Merchant.ApprovalStatus.APPROVED
        and merchant.is_active
        and merchant.is_visible
        and merchant.operational_status == Merchant.OperationalStatus.ACTIVE
    )


def product_is_orderable(product):
    return (
        not product.is_archived
        and product.is_visible
        and product.is_orderable
        and merchant_can_receive_orders(product.merchant)
    )


def get_or_create_cart(user):
    cart, _ = Cart.objects.select_related("merchant").get_or_create(customer=user)
    return cart


def build_cart_summary(cart):
    items = list(cart.items.select_related("product", "product__merchant"))
    subtotal = sum((item.subtotal for item in items), ZERO)
    return {
        "cart": cart,
        "items": items,
        "subtotal": subtotal,
        "delivery_fee": ZERO,
        "service_fee": ZERO,
        "total_amount": subtotal,
        "allowed_payment_methods": [
            Order.PaymentMethod.CASH_ON_DELIVERY,
            Order.PaymentMethod.CARD,
        ],
    }


def add_or_update_cart_item(user, product, quantity):
    if not product_is_orderable(product):
        raise serializers.ValidationError({"product_id": ["Product is not currently orderable."]})

    cart = get_or_create_cart(user)
    if cart.merchant_id and cart.merchant_id != product.merchant_id:
        raise serializers.ValidationError(
            {"product_id": ["Cart can only contain items from one merchant at a time."]}
        )

    with transaction.atomic():
        cart = Cart.objects.select_for_update().select_related("merchant").get(pk=cart.pk)
        if cart.merchant_id and cart.merchant_id != product.merchant_id:
            raise serializers.ValidationError(
                {"product_id": ["Cart can only contain items from one merchant at a time."]}
            )

        cart.merchant = product.merchant
        cart.save(update_fields=["merchant", "updated_at"])

        item, _ = CartItem.objects.update_or_create(
            cart=cart,
            product=product,
            defaults={"quantity": quantity, "unit_price": product.price},
        )
    return item


def update_cart_item_quantity(cart_item, quantity):
    if not product_is_orderable(cart_item.product):
        raise serializers.ValidationError({"product_id": ["Product is not currently orderable."]})

    cart_item.quantity = quantity
    cart_item.unit_price = cart_item.product.price
    cart_item.save(update_fields=["quantity", "unit_price", "updated_at"])
    return cart_item


def remove_cart_item(cart_item):
    cart = cart_item.cart
    cart_item.delete()
    if not cart.items.exists() and cart.merchant_id:
        cart.merchant = None
        cart.save(update_fields=["merchant", "updated_at"])


def clear_cart(cart):
    """Empty the cart and reset its merchant context.

    Used when a customer switches to ordering from a different merchant.
    """
    with transaction.atomic():
        cart.items.all().delete()
        if cart.merchant_id:
            cart.merchant = None
            cart.save(update_fields=["merchant", "updated_at"])


def validate_checkout(cart):
    items = list(cart.items.select_related("product", "product__merchant"))
    if not items:
        raise serializers.ValidationError({"cart": ["Cart is empty."]})

    if not cart.merchant_id:
        raise serializers.ValidationError({"cart": ["Cart does not have a merchant context."]})

    if not merchant_can_receive_orders(cart.merchant):
        raise serializers.ValidationError({"merchant": ["Merchant is not currently accepting orders."]})

    subtotal = ZERO
    for item in items:
        if item.product.merchant_id != cart.merchant_id:
            raise serializers.ValidationError({"cart": ["Cart contains mixed merchant items."]})
        if not product_is_orderable(item.product):
            raise serializers.ValidationError(
                {"product_id": [f"Product {item.product_id} is not currently orderable."]}
            )
        item.unit_price = item.product.price
        subtotal += item.product.price * item.quantity

    return {
        "items": items,
        "item_subtotal": subtotal,
        "delivery_fee": ZERO,
        "service_fee": ZERO,
        "total_amount": subtotal,
        "allowed_payment_methods": [
            Order.PaymentMethod.CASH_ON_DELIVERY,
            Order.PaymentMethod.CARD,
        ],
    }


def checkout_cart(user, payload):
    cart = get_or_create_cart(user)
    cart = Cart.objects.select_related("merchant").get(pk=cart.pk)

    idempotency_key = payload.get("idempotency_key") or ""
    if idempotency_key:
        existing = Order.objects.filter(customer=user, idempotency_key=idempotency_key).first()
        if existing:
            return existing

    with transaction.atomic():
        cart = Cart.objects.select_for_update().select_related("merchant").get(pk=cart.pk)
        validation = validate_checkout(cart)

        order = Order.objects.create(
            customer=user,
            merchant=cart.merchant,
            payment_method=payload["payment_method"],
            payment_status=Order.PaymentStatus.PENDING,
            item_subtotal=validation["item_subtotal"],
            delivery_fee=validation["delivery_fee"],
            service_fee=validation["service_fee"],
            total_amount=validation["total_amount"],
            idempotency_key=idempotency_key,
            recipient_name=payload["recipient_name"],
            recipient_phone=payload["recipient_phone"],
            delivery_address_line_1=payload["delivery_address_line_1"],
            delivery_address_line_2=payload.get("delivery_address_line_2", ""),
            delivery_city=payload["delivery_city"],
            delivery_state=payload.get("delivery_state", ""),
            delivery_postal_code=payload["delivery_postal_code"],
            delivery_country=payload["delivery_country"],
            delivery_notes=payload.get("delivery_notes", ""),
            merchant_display_name=cart.merchant.display_name,
        )

        for item in validation["items"]:
            OrderItem.objects.create(
                order=order,
                product=item.product,
                product_display_name=item.product.display_name,
                product_description=item.product.description,
                quantity=item.quantity,
                unit_price=item.product.price,
                subtotal=item.product.price * item.quantity,
            )

        OrderTimelineEvent.objects.create(
            order=order,
            event_type="order_created",
            message="Order created and awaiting merchant confirmation.",
        )

        cart.items.all().delete()
        cart.merchant = None
        cart.save(update_fields=["merchant", "updated_at"])

        queue_email(
            subject="Your Pagana order has been created",
            message=f"Order {order.public_id} has been created successfully.",
            recipient_list=[user.email],
        )

    return order


def transition_order_by_merchant(order, target_status, actor=None, reason=""):
    allowed_transitions = {
        Order.FulfillmentStatus.PENDING: {
            Order.FulfillmentStatus.ACCEPTED,
            Order.FulfillmentStatus.CANCELLED,
        },
        Order.FulfillmentStatus.ACCEPTED: {
            Order.FulfillmentStatus.PREPARING,
            Order.FulfillmentStatus.CANCELLED,
        },
        Order.FulfillmentStatus.PREPARING: {
            Order.FulfillmentStatus.READY_FOR_PICKUP,
        },
    }
    current = order.fulfillment_status
    if target_status not in allowed_transitions.get(current, set()):
        raise serializers.ValidationError("Invalid merchant fulfillment transition.")

    order.fulfillment_status = target_status
    order.save(update_fields=["fulfillment_status", "updated_at"])

    event_map = {
        Order.FulfillmentStatus.ACCEPTED: "merchant_accepted_order",
        Order.FulfillmentStatus.CANCELLED: "merchant_rejected_order",
        Order.FulfillmentStatus.PREPARING: "merchant_started_preparing",
        Order.FulfillmentStatus.READY_FOR_PICKUP: "merchant_ready_for_pickup",
    }
    message_map = {
        Order.FulfillmentStatus.ACCEPTED: "Merchant accepted the order.",
        Order.FulfillmentStatus.CANCELLED: "Merchant rejected the order.",
        Order.FulfillmentStatus.PREPARING: "Merchant started preparing the order.",
        Order.FulfillmentStatus.READY_FOR_PICKUP: "Merchant marked the order ready for pickup.",
    }
    OrderTimelineEvent.objects.create(
        order=order,
        event_type=event_map[target_status],
        message=message_map[target_status],
    )
    record_audit(
        action_type=f"orders.merchant.{target_status}",
        target=order,
        actor=actor,
        source="api",
        reason=reason,
        metadata={"fulfillment_status": order.fulfillment_status},
    )

    if target_status == Order.FulfillmentStatus.PREPARING:
        from apps.dispatch.services import trigger_dispatch_for_order

        trigger_dispatch_for_order(order, actor=actor, reason=reason)

    return order
