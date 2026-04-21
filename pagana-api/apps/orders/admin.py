from django.contrib import admin

from .models import Cart, CartItem, Order, OrderItem, OrderTimelineEvent


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ("customer", "merchant", "updated_at")
    search_fields = ("customer__email", "merchant__display_name")


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ("cart", "product", "quantity", "unit_price")
    search_fields = ("cart__customer__email", "product__display_name")


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    can_delete = False
    readonly_fields = (
        "product",
        "product_display_name",
        "quantity",
        "unit_price",
        "subtotal",
        "created_at",
        "updated_at",
    )

    def has_add_permission(self, request, obj=None):
        return False


class OrderTimelineEventInline(admin.TabularInline):
    model = OrderTimelineEvent
    extra = 0
    can_delete = False
    readonly_fields = ("event_type", "message", "created_at", "updated_at")

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "public_id",
        "customer",
        "merchant",
        "fulfillment_status",
        "payment_method",
        "payment_status",
        "total_amount",
        "created_at",
    )
    search_fields = ("public_id", "customer__email", "merchant__display_name")
    list_filter = ("fulfillment_status", "payment_method", "payment_status")
    readonly_fields = (
        "public_id",
        "customer",
        "merchant",
        "fulfillment_status",
        "payment_method",
        "payment_status",
        "item_subtotal",
        "delivery_fee",
        "service_fee",
        "total_amount",
        "idempotency_key",
        "recipient_name",
        "recipient_phone",
        "delivery_address_line_1",
        "delivery_address_line_2",
        "delivery_city",
        "delivery_state",
        "delivery_postal_code",
        "delivery_country",
        "delivery_notes",
        "merchant_display_name",
        "created_at",
        "updated_at",
    )
    inlines = [OrderItemInline, OrderTimelineEventInline]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
