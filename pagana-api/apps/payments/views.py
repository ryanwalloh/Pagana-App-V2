import stripe
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsCustomerUser
from apps.orders.models import Order

from .models import PaymentAttempt
from .providers import construct_stripe_webhook_event
from .serializers import PaymentIntentSerializer, PaymentSummarySerializer
from .services import (
    apply_stripe_webhook,
    ensure_card_payment_order,
    get_latest_payment_attempt,
    get_or_create_payment_intent,
)


class CustomerPaymentContextMixin:
    permission_classes = [IsAuthenticated, IsCustomerUser]

    def get_order(self):
        return get_object_or_404(
            Order,
            public_id=self.kwargs["public_id"],
            customer=self.request.user,
        )


class OrderPaymentIntentView(CustomerPaymentContextMixin, APIView):
    def post(self, request, *args, **kwargs):
        attempt = get_or_create_payment_intent(
            ensure_card_payment_order(self.get_order(), self.request.user),
            actor=request.user,
        )
        return Response(PaymentIntentSerializer(attempt).data, status=status.HTTP_200_OK)


class OrderPaymentSummaryView(CustomerPaymentContextMixin, APIView):
    def get(self, request, *args, **kwargs):
        order = self.get_order()
        attempt = get_latest_payment_attempt(order)
        if not attempt:
            return Response(
                {
                    "order_public_id": str(order.public_id),
                    "payment_method": order.payment_method,
                    "payment_status": order.payment_status,
                    "latest_attempt": None,
                }
            )
        return Response(
            {
                "order_public_id": str(order.public_id),
                "payment_method": order.payment_method,
                "payment_status": order.payment_status,
                "latest_attempt": PaymentSummarySerializer(attempt).data,
            }
        )


@method_decorator(csrf_exempt, name="dispatch")
class StripeWebhookView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        signature = request.META.get("HTTP_STRIPE_SIGNATURE", "")
        try:
            event = construct_stripe_webhook_event(payload=request.body, signature=signature)
        except (ValueError, stripe.error.SignatureVerificationError):
            return Response({"detail": "Invalid Stripe webhook signature."}, status=400)
        apply_stripe_webhook(event)
        return Response({"status": "ok"})
