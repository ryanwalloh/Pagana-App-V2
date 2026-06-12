from rest_framework import serializers

from apps.payments.models import PaymentAttempt

from .models import AuditLog


class OpsReasonSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True)


class AuditLogSerializer(serializers.ModelSerializer):
    actor = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = (
            "id",
            "action_type",
            "source",
            "reason",
            "metadata",
            "target_repr",
            "actor",
            "created_at",
        )
        read_only_fields = fields

    def get_actor(self, obj):
        if not obj.actor_id:
            return None
        return {
            "id": obj.actor_id,
            "email": obj.actor.email,
            "role": obj.actor.role,
        }


class PaymentAttemptOpsSerializer(serializers.ModelSerializer):
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
            "provider_charge_id",
            "last_error_message",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields
