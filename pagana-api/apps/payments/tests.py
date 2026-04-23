from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.customers.models import CustomerProfile
from apps.merchants.models import Merchant
from apps.orders.models import Order

from .models import PaymentAttempt, PaymentWebhookEvent

User = get_user_model()


class PaymentsApiTests(APITestCase):
    def setUp(self):
        self.customer = User.objects.create_user(
            email="customer@example.com",
            password="StrongPass123",
            role=User.Roles.CUSTOMER,
        )
        CustomerProfile.objects.create(user=self.customer, display_name="Customer One")
        self.other_customer = User.objects.create_user(
            email="other@example.com",
            password="StrongPass123",
            role=User.Roles.CUSTOMER,
        )
        CustomerProfile.objects.create(user=self.other_customer, display_name="Customer Two")
        self.merchant = Merchant.objects.create(
            display_name="Merchant One",
            approval_status=Merchant.ApprovalStatus.APPROVED,
            is_active=True,
            is_visible=True,
            operational_status=Merchant.OperationalStatus.ACTIVE,
        )

    def authenticate(self, user=None):
        self.client.force_authenticate(user=user or self.customer)

    def create_order(self, payment_method=Order.PaymentMethod.CARD):
        return Order.objects.create(
            customer=self.customer,
            merchant=self.merchant,
            payment_method=payment_method,
            payment_status=Order.PaymentStatus.PENDING,
            item_subtotal=Decimal("25.00"),
            delivery_fee=Decimal("0.00"),
            service_fee=Decimal("0.00"),
            total_amount=Decimal("25.00"),
            recipient_name="Customer One",
            recipient_phone="+12025550123",
            delivery_address_line_1="123 Main St",
            delivery_city="Jakarta",
            delivery_postal_code="10110",
            delivery_country="ID",
            merchant_display_name=self.merchant.display_name,
        )

    def test_card_order_can_create_and_reuse_payment_intent(self):
        order = self.create_order()
        self.authenticate()

        with patch("apps.payments.services.create_stripe_payment_intent") as mocked_create:
            mocked_create.return_value = {
                "id": "pi_123",
                "client_secret": "secret_123",
                "status": "requires_action",
            }
            response_one = self.client.post(f"/api/v1/payments/orders/{order.public_id}/intent")
            response_two = self.client.post(f"/api/v1/payments/orders/{order.public_id}/intent")

        self.assertEqual(response_one.status_code, status.HTTP_200_OK)
        self.assertEqual(response_two.status_code, status.HTTP_200_OK)
        self.assertEqual(mocked_create.call_count, 1)
        self.assertEqual(PaymentAttempt.objects.filter(order=order).count(), 1)
        attempt = PaymentAttempt.objects.get(order=order)
        self.assertEqual(attempt.provider_payment_intent_id, "pi_123")
        self.assertEqual(attempt.status, PaymentAttempt.Status.REQUIRES_ACTION)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, Order.PaymentStatus.REQUIRES_ACTION)

    def test_cod_order_cannot_create_stripe_intent(self):
        order = self.create_order(payment_method=Order.PaymentMethod.CASH_ON_DELIVERY)
        self.authenticate()

        response = self.client.post(f"/api/v1/payments/orders/{order.public_id}/intent")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_payment_summary_endpoint_returns_latest_attempt(self):
        order = self.create_order()
        PaymentAttempt.objects.create(
            order=order,
            customer=self.customer,
            provider=PaymentAttempt.Provider.STRIPE,
            method_type=Order.PaymentMethod.CARD,
            status=PaymentAttempt.Status.PENDING,
            amount=order.total_amount,
            currency="usd",
            provider_payment_intent_id="pi_123",
        )
        self.authenticate()

        response = self.client.get(f"/api/v1/payments/orders/{order.public_id}")
        order_response = self.client.get(f"/api/v1/orders/{order.public_id}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(order_response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["payment_method"], Order.PaymentMethod.CARD)
        self.assertEqual(response.data["latest_attempt"]["provider_payment_intent_id"], "pi_123")
        self.assertEqual(
            order_response.data["payment_summary"]["provider_payment_intent_id"],
            "pi_123",
        )

    def test_invalid_stripe_signature_is_rejected(self):
        response = None
        with patch("apps.payments.views.construct_stripe_webhook_event", side_effect=ValueError):
            response = self.client.post(
                "/api/v1/payments/webhooks/stripe",
                data=b"{}",
                content_type="application/json",
                HTTP_STRIPE_SIGNATURE="bad-signature",
            )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_webhook_updates_payment_and_order_status_idempotently(self):
        order = self.create_order()
        attempt = PaymentAttempt.objects.create(
            order=order,
            customer=self.customer,
            provider=PaymentAttempt.Provider.STRIPE,
            method_type=Order.PaymentMethod.CARD,
            status=PaymentAttempt.Status.PENDING,
            amount=order.total_amount,
            currency="usd",
            provider_payment_intent_id="pi_123",
            provider_client_secret="secret_123",
        )
        event = {
            "id": "evt_123",
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_123",
                    "status": "succeeded",
                    "client_secret": "secret_123",
                    "latest_charge": "ch_123",
                }
            },
        }

        with patch("apps.payments.views.construct_stripe_webhook_event", return_value=event):
            with patch("apps.core.email.send_email_task.delay") as mocked_delay:
                with self.captureOnCommitCallbacks(execute=True):
                    response_one = self.client.post(
                        "/api/v1/payments/webhooks/stripe",
                        data=b"{}",
                        content_type="application/json",
                        HTTP_STRIPE_SIGNATURE="good-signature",
                    )
                    response_two = self.client.post(
                        "/api/v1/payments/webhooks/stripe",
                        data=b"{}",
                        content_type="application/json",
                        HTTP_STRIPE_SIGNATURE="good-signature",
                    )

        self.assertEqual(response_one.status_code, status.HTTP_200_OK)
        self.assertEqual(response_two.status_code, status.HTTP_200_OK)
        attempt.refresh_from_db()
        order.refresh_from_db()
        self.assertEqual(attempt.status, PaymentAttempt.Status.SUCCEEDED)
        self.assertEqual(order.payment_status, Order.PaymentStatus.SUCCEEDED)
        self.assertEqual(PaymentWebhookEvent.objects.filter(event_id="evt_123").count(), 1)
        mocked_delay.assert_called_once()

    def test_other_customer_cannot_access_payment_intent_endpoint(self):
        order = self.create_order()
        self.authenticate(user=self.other_customer)

        response = self.client.post(f"/api/v1/payments/orders/{order.public_id}/intent")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
