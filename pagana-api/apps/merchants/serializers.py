from rest_framework import serializers

from .models import Merchant, MerchantUserMembership


class PublicMerchantSerializer(serializers.ModelSerializer):
    """Customer-facing storefront listing. Excludes legal, contact, and
    moderation fields, which are not public concerns."""

    class Meta:
        model = Merchant
        fields = (
            "id",
            "display_name",
            "storefront_image_url",
            "city",
        )
        read_only_fields = fields


class MerchantProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Merchant
        fields = (
            "id",
            "display_name",
            "legal_name",
            "contact_email",
            "contact_phone",
            "address_line_1",
            "address_line_2",
            "city",
            "state",
            "postal_code",
            "country",
            "storefront_image_url",
            "approval_status",
            "is_active",
            "is_visible",
            "operational_status",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "approval_status",
            "is_active",
            "is_visible",
            "created_at",
            "updated_at",
        )


class MerchantStatusSerializer(serializers.ModelSerializer):
    can_receive_orders = serializers.SerializerMethodField()

    class Meta:
        model = Merchant
        fields = (
            "id",
            "approval_status",
            "is_active",
            "is_visible",
            "operational_status",
            "can_receive_orders",
        )
        read_only_fields = (
            "id",
            "approval_status",
            "is_active",
            "is_visible",
            "can_receive_orders",
        )

    def get_can_receive_orders(self, obj):
        return (
            obj.approval_status == Merchant.ApprovalStatus.APPROVED
            and obj.is_active
            and obj.is_visible
            and obj.operational_status == Merchant.OperationalStatus.ACTIVE
        )


class MerchantMembershipSerializer(serializers.ModelSerializer):
    merchant = MerchantProfileSerializer(read_only=True)

    class Meta:
        model = MerchantUserMembership
        fields = ("id", "membership_role", "is_primary", "merchant")
        read_only_fields = fields
