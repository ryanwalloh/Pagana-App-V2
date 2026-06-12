from rest_framework import serializers

from apps.orders.models import Order

from .models import DispatchAssignment, DispatchOffer, RiderLocation, RiderProfile


class RiderProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = RiderProfile
        fields = ("id", "is_active", "is_online", "is_available", "created_at", "updated_at")
        read_only_fields = fields


class RiderLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = RiderLocation
        fields = ("latitude", "longitude", "updated_at")
        read_only_fields = ("updated_at",)


class RiderLocationUpdateSerializer(serializers.Serializer):
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6)


class DispatchOfferSerializer(serializers.ModelSerializer):
    order = serializers.SerializerMethodField()

    class Meta:
        model = DispatchOffer
        fields = (
            "id",
            "sequence_number",
            "status",
            "order",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_order(self, obj):
        order = obj.assignment.order
        return {
            "public_id": str(order.public_id),
            "merchant_display_name": order.merchant_display_name,
            "fulfillment_status": order.fulfillment_status,
            "delivery_city": order.delivery_city,
            "delivery_address_line_1": order.delivery_address_line_1,
        }


class DispatchAssignmentSerializer(serializers.ModelSerializer):
    order = serializers.SerializerMethodField()
    rider = serializers.SerializerMethodField()

    class Meta:
        model = DispatchAssignment
        fields = ("id", "status", "order", "rider", "created_at", "updated_at")
        read_only_fields = fields

    def get_order(self, obj):
        order = obj.order
        return {
            "public_id": str(order.public_id),
            "merchant_display_name": order.merchant_display_name,
            "fulfillment_status": order.fulfillment_status,
        }

    def get_rider(self, obj):
        if not obj.rider_id:
            return None
        return {
            "id": obj.rider_id,
            "email": obj.rider.user.email,
        }


class RiderOrderStatusSerializer(serializers.Serializer):
    fulfillment_status = serializers.ChoiceField(
        choices=[
            Order.FulfillmentStatus.IN_TRANSIT,
            Order.FulfillmentStatus.ARRIVED,
            Order.FulfillmentStatus.DELIVERED,
        ]
    )
