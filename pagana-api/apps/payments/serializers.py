from rest_framework import serializers

from .models import PaymentAttempt


class PaymentIntentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentAttempt
        fields = (
            "id",
            "provider",
            "method_type",
            "status",
            "amount",
            "currency",
            "provider_payment_intent_id",
            "provider_client_secret",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class PaymentSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentAttempt
        fields = (
            "id",
            "provider",
            "method_type",
            "status",
            "amount",
            "currency",
            "provider_payment_intent_id",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields
