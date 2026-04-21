from decimal import Decimal

from rest_framework import serializers

from apps.catalog.models import Product

from .models import Cart, CartItem, Order, OrderItem, OrderTimelineEvent


class CartItemSerializer(serializers.ModelSerializer):
    product = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ("id", "product", "quantity", "unit_price", "subtotal")
        read_only_fields = fields

    def get_product(self, obj):
        return {
            "id": obj.product_id,
            "display_name": obj.product.display_name,
            "description": obj.product.description,
            "image_url": obj.product.image_url,
        }

    def get_subtotal(self, obj):
        return obj.subtotal


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    merchant = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()
    total_quantity = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = (
            "id",
            "merchant",
            "items",
            "subtotal",
            "total_quantity",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_merchant(self, obj):
        if not obj.merchant:
            return None
        return {
            "id": obj.merchant_id,
            "display_name": obj.merchant.display_name,
        }

    def get_subtotal(self, obj):
        return sum((item.subtotal for item in obj.items.all()), Decimal("0.00"))

    def get_total_quantity(self, obj):
        return sum(item.quantity for item in obj.items.all())


class CartItemMutationSerializer(serializers.Serializer):
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.select_related("merchant"),
        source="product",
    )
    quantity = serializers.IntegerField(min_value=1)


class CartItemQuantitySerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1)


class CheckoutPrepareSerializer(serializers.Serializer):
    recipient_name = serializers.CharField(max_length=255)
    recipient_phone = serializers.CharField(max_length=32)
    delivery_address_line_1 = serializers.CharField(max_length=255)
    delivery_address_line_2 = serializers.CharField(max_length=255, required=False, allow_blank=True)
    delivery_city = serializers.CharField(max_length=120)
    delivery_state = serializers.CharField(max_length=120, required=False, allow_blank=True)
    delivery_postal_code = serializers.CharField(max_length=32)
    delivery_country = serializers.CharField(max_length=2)
    delivery_notes = serializers.CharField(required=False, allow_blank=True)


class CheckoutConfirmSerializer(CheckoutPrepareSerializer):
    payment_method = serializers.ChoiceField(choices=Order.PaymentMethod.choices)
    idempotency_key = serializers.CharField(max_length=128, required=False, allow_blank=True)


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = (
            "id",
            "product_display_name",
            "product_description",
            "quantity",
            "unit_price",
            "subtotal",
        )
        read_only_fields = fields


class OrderTimelineEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderTimelineEvent
        fields = ("event_type", "message", "created_at")
        read_only_fields = fields


class OrderListSerializer(serializers.ModelSerializer):
    merchant = serializers.SerializerMethodField()
    payment_summary = serializers.SerializerMethodField()
    dispatch_summary = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "public_id",
            "merchant",
            "fulfillment_status",
            "payment_method",
            "payment_status",
            "payment_summary",
            "dispatch_summary",
            "total_amount",
            "created_at",
        )
        read_only_fields = fields

    def get_merchant(self, obj):
        return {
            "id": obj.merchant_id,
            "display_name": obj.merchant_display_name,
        }

    def get_payment_summary(self, obj):
        latest_attempt = getattr(obj, "latest_payment_attempt", None)
        if latest_attempt is None:
            latest_attempt = obj.payment_attempts.order_by("-created_at").first()
        if not latest_attempt:
            return None

        from apps.payments.serializers import PaymentSummarySerializer

        return PaymentSummarySerializer(latest_attempt).data

    def get_dispatch_summary(self, obj):
        try:
            assignment = obj.dispatch_assignment
        except Order.dispatch_assignment.RelatedObjectDoesNotExist:
            return None
        rider = assignment.rider
        return {
            "status": assignment.status,
            "rider": None
            if not rider
            else {
                "id": rider.id,
            },
        }


class OrderDetailSerializer(serializers.ModelSerializer):
    merchant = serializers.SerializerMethodField()
    items = OrderItemSerializer(many=True, read_only=True)
    timeline_events = OrderTimelineEventSerializer(many=True, read_only=True)
    payment_summary = serializers.SerializerMethodField()
    dispatch_summary = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "public_id",
            "merchant",
            "fulfillment_status",
            "payment_method",
            "payment_status",
            "payment_summary",
            "dispatch_summary",
            "item_subtotal",
            "delivery_fee",
            "service_fee",
            "total_amount",
            "recipient_name",
            "recipient_phone",
            "delivery_address_line_1",
            "delivery_address_line_2",
            "delivery_city",
            "delivery_state",
            "delivery_postal_code",
            "delivery_country",
            "delivery_notes",
            "items",
            "timeline_events",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_merchant(self, obj):
        return {
            "id": obj.merchant_id,
            "display_name": obj.merchant_display_name,
        }

    def get_payment_summary(self, obj):
        latest_attempt = getattr(obj, "latest_payment_attempt", None)
        if latest_attempt is None:
            latest_attempt = obj.payment_attempts.order_by("-created_at").first()
        if not latest_attempt:
            return None

        from apps.payments.serializers import PaymentSummarySerializer

        return PaymentSummarySerializer(latest_attempt).data

    def get_dispatch_summary(self, obj):
        try:
            assignment = obj.dispatch_assignment
        except Order.dispatch_assignment.RelatedObjectDoesNotExist:
            return None

        rider = assignment.rider
        rider_location = getattr(rider, "location", None) if rider else None
        return {
            "status": assignment.status,
            "rider": None
            if not rider
            else {
                "id": rider.id,
            },
            "location": None
            if not rider_location
            else {
                "latitude": rider_location.latitude,
                "longitude": rider_location.longitude,
                "updated_at": rider_location.updated_at,
            },
        }


class OrderTrackingSerializer(serializers.ModelSerializer):
    timeline_events = OrderTimelineEventSerializer(many=True, read_only=True)
    payment_summary = serializers.SerializerMethodField()
    dispatch_summary = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "public_id",
            "fulfillment_status",
            "payment_status",
            "payment_summary",
            "dispatch_summary",
            "timeline_events",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_payment_summary(self, obj):
        latest_attempt = getattr(obj, "latest_payment_attempt", None)
        if latest_attempt is None:
            latest_attempt = obj.payment_attempts.order_by("-created_at").first()
        if not latest_attempt:
            return None

        from apps.payments.serializers import PaymentSummarySerializer

        return PaymentSummarySerializer(latest_attempt).data

    def get_dispatch_summary(self, obj):
        try:
            assignment = obj.dispatch_assignment
        except Order.dispatch_assignment.RelatedObjectDoesNotExist:
            return None

        rider = assignment.rider
        rider_location = getattr(rider, "location", None) if rider else None
        return {
            "status": assignment.status,
            "rider": None
            if not rider
            else {
                "id": rider.id,
            },
            "location": None
            if not rider_location
            else {
                "latitude": rider_location.latitude,
                "longitude": rider_location.longitude,
                "updated_at": rider_location.updated_at,
            },
        }
