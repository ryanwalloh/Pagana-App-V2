from django.contrib import admin

from .models import PaymentAttempt, PaymentWebhookEvent


@admin.register(PaymentAttempt)
class PaymentAttemptAdmin(admin.ModelAdmin):
    list_display = (
        "order",
        "provider",
        "method_type",
        "status",
        "amount",
        "currency",
        "provider_payment_intent_id",
    )
    search_fields = (
        "order__public_id",
        "customer__email",
        "provider_payment_intent_id",
        "provider_charge_id",
    )
    list_filter = ("provider", "method_type", "status", "currency")
    readonly_fields = (
        "order",
        "customer",
        "provider",
        "method_type",
        "status",
        "amount",
        "currency",
        "idempotency_key",
        "provider_payment_intent_id",
        "provider_client_secret",
        "provider_charge_id",
        "last_error_message",
        "processor_response",
        "created_at",
        "updated_at",
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(PaymentWebhookEvent)
class PaymentWebhookEventAdmin(admin.ModelAdmin):
    list_display = ("provider", "event_id", "event_type", "payment_attempt", "processed_at")
    search_fields = ("event_id", "event_type", "payment_attempt__order__public_id")
    list_filter = ("provider", "event_type")
    readonly_fields = (
        "provider",
        "event_id",
        "event_type",
        "payment_attempt",
        "payload",
        "processed_at",
        "created_at",
        "updated_at",
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
