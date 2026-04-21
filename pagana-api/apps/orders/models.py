import uuid

from django.conf import settings
from django.db import models

from apps.catalog.models import Product
from apps.core.models import BaseModel
from apps.merchants.models import Merchant


class Cart(BaseModel):
    customer = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cart",
    )
    merchant = models.ForeignKey(
        Merchant,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="carts",
    )

    def __str__(self):
        return f"Cart<{self.customer.email}>"


class CartItem(BaseModel):
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="cart_items",
    )
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("cart", "product"),
                name="unique_cart_item_product",
            )
        ]

    @property
    def subtotal(self):
        return self.unit_price * self.quantity

    def __str__(self):
        return f"{self.product.display_name} x {self.quantity}"


class Order(BaseModel):
    class FulfillmentStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        PREPARING = "preparing", "Preparing"
        READY_FOR_PICKUP = "ready_for_pickup", "Ready for pickup"
        ASSIGNED_TO_RIDER = "assigned_to_rider", "Assigned to rider"
        IN_TRANSIT = "in_transit", "In transit"
        ARRIVED = "arrived", "Arrived"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"

    class PaymentMethod(models.TextChoices):
        CASH_ON_DELIVERY = "cash_on_delivery", "Cash on delivery"
        CARD = "card", "Card"

    class PaymentStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        REQUIRES_ACTION = "requires_action", "Requires action"
        AUTHORIZED = "authorized", "Authorized"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled"
        REFUNDED = "refunded", "Refunded"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="orders",
    )
    merchant = models.ForeignKey(
        Merchant,
        on_delete=models.PROTECT,
        related_name="orders",
    )
    fulfillment_status = models.CharField(
        max_length=32,
        choices=FulfillmentStatus.choices,
        default=FulfillmentStatus.PENDING,
    )
    payment_method = models.CharField(
        max_length=32,
        choices=PaymentMethod.choices,
    )
    payment_status = models.CharField(
        max_length=32,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
    )
    item_subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    delivery_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    service_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    idempotency_key = models.CharField(max_length=128, blank=True, db_index=True)
    recipient_name = models.CharField(max_length=255)
    recipient_phone = models.CharField(max_length=32)
    delivery_address_line_1 = models.CharField(max_length=255)
    delivery_address_line_2 = models.CharField(max_length=255, blank=True)
    delivery_city = models.CharField(max_length=120)
    delivery_state = models.CharField(max_length=120, blank=True)
    delivery_postal_code = models.CharField(max_length=32)
    delivery_country = models.CharField(max_length=2)
    delivery_notes = models.TextField(blank=True)
    merchant_display_name = models.CharField(max_length=255)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"Order<{self.public_id}>"


class OrderItem(BaseModel):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_items",
    )
    product_display_name = models.CharField(max_length=255)
    product_description = models.TextField(blank=True)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"{self.product_display_name} x {self.quantity}"


class OrderTimelineEvent(BaseModel):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="timeline_events",
    )
    event_type = models.CharField(max_length=64)
    message = models.CharField(max_length=255)

    class Meta:
        ordering = ("created_at",)

    def __str__(self):
        return f"{self.order.public_id}: {self.event_type}"
