from django.urls import path

from .views import OrderPaymentIntentView, OrderPaymentSummaryView, StripeWebhookView

app_name = "payments"

urlpatterns = [
    path("payments/orders/<uuid:public_id>/intent", OrderPaymentIntentView.as_view(), name="order-payment-intent"),
    path("payments/orders/<uuid:public_id>", OrderPaymentSummaryView.as_view(), name="order-payment-summary"),
    path("payments/webhooks/stripe", StripeWebhookView.as_view(), name="stripe-webhook"),
]
