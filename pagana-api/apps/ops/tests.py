from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.customers.models import CustomerProfile
from apps.dispatch.models import DispatchAssignment, DispatchOffer, RiderProfile
from apps.merchants.models import Merchant, MerchantUserMembership
from apps.ops.models import AuditLog
from apps.orders.models import Order

User = get_user_model()


class OpsAndAuditTests(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(
            email="admin@example.com",
            password="StrongPass123",
            role=User.Roles.ADMIN,
            is_staff=True,
        )
        self.customer = User.objects.create_user(
            email="customer@example.com",
            password="StrongPass123",
            role=User.Roles.CUSTOMER,
        )
        CustomerProfile.objects.create(user=self.customer, display_name="Customer One")
        self.merchant_user = User.objects.create_user(
            email="merchant@example.com",
            password="StrongPass123",
            role=User.Roles.MERCHANT,
        )
        self.merchant = Merchant.objects.create(
            display_name="Merchant One",
            approval_status=Merchant.ApprovalStatus.APPROVED,
            is_active=True,
            is_visible=True,
            operational_status=Merchant.OperationalStatus.ACTIVE,
        )
        MerchantUserMembership.objects.create(
            merchant=self.merchant,
            user=self.merchant_user,
            membership_role=MerchantUserMembership.Roles.OWNER,
            is_primary=True,
        )
        self.rider_user = User.objects.create_user(
            email="rider@example.com",
            password="StrongPass123",
            role=User.Roles.RIDER,
        )
        self.rider_profile = RiderProfile.objects.create(user=self.rider_user)

    def create_order(self, payment_method=Order.PaymentMethod.CASH_ON_DELIVERY):
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

    def test_merchant_transition_emits_audit_log(self):
        order = self.create_order()
        self.client.force_authenticate(user=self.merchant_user)

        response = self.client.post(
            f"/api/v1/merchant/orders/{order.public_id}/accepted",
            {"reason": "Kitchen confirmed capacity."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        audit = AuditLog.objects.get(action_type="orders.merchant.accepted")
        self.assertEqual(audit.actor, self.merchant_user)
        self.assertEqual(audit.reason, "Kitchen confirmed capacity.")

    def test_payment_intent_creation_emits_audit_log(self):
        order = self.create_order(payment_method=Order.PaymentMethod.CARD)
        self.client.force_authenticate(user=self.customer)

        with patch("apps.payments.services.create_stripe_payment_intent") as mocked_create:
            mocked_create.return_value = {
                "id": "pi_123",
                "client_secret": "secret_123",
                "status": "requires_action",
            }
            response = self.client.post(f"/api/v1/payments/orders/{order.public_id}/intent")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        audit = AuditLog.objects.get(action_type="payments.intent.created")
        self.assertEqual(audit.actor, self.customer)
        self.assertEqual(audit.metadata["order_public_id"], str(order.public_id))

    def test_dispatch_acceptance_emits_audit_log(self):
        order = self.create_order()
        self.client.force_authenticate(user=self.merchant_user)
        self.client.post(f"/api/v1/merchant/orders/{order.public_id}/accepted")
        self.client.post(f"/api/v1/merchant/orders/{order.public_id}/preparing")

        offer = DispatchOffer.objects.get()
        self.client.force_authenticate(user=self.rider_user)
        response = self.client.post(
            f"/api/v1/rider/offers/{offer.id}/accept",
            {"reason": "Rider is nearby."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        audit = AuditLog.objects.get(action_type="dispatch.offer.accepted")
        self.assertEqual(audit.actor, self.rider_user)
        self.assertEqual(audit.reason, "Rider is nearby.")

    def test_admin_ops_cancel_endpoint_requires_admin_and_emits_audit(self):
        order = self.create_order()

        self.client.force_authenticate(user=self.customer)
        forbidden = self.client.post(f"/api/v1/ops/orders/{order.public_id}/cancel", format="json")
        self.assertEqual(forbidden.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            f"/api/v1/ops/orders/{order.public_id}/cancel",
            {"reason": "Customer support intervention."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.fulfillment_status, Order.FulfillmentStatus.CANCELLED)
        audit = AuditLog.objects.get(action_type="ops.order.cancelled")
        self.assertEqual(audit.actor, self.admin_user)

    def test_admin_ops_dispatch_reset_and_audit_view(self):
        order = self.create_order()
        self.client.force_authenticate(user=self.merchant_user)
        self.client.post(f"/api/v1/merchant/orders/{order.public_id}/accepted")
        self.client.post(f"/api/v1/merchant/orders/{order.public_id}/preparing")
        offer = DispatchOffer.objects.get(sequence_number=1)

        self.client.force_authenticate(user=self.rider_user)
        self.client.post(f"/api/v1/rider/offers/{offer.id}/accept")

        self.client.force_authenticate(user=self.admin_user)
        reset_response = self.client.post(
            f"/api/v1/ops/orders/{order.public_id}/dispatch/reset",
            {"reason": "Manual reassignment needed."},
            format="json",
        )
        payments_response = self.client.get(f"/api/v1/ops/orders/{order.public_id}/payments")
        audit_response = self.client.get(f"/api/v1/ops/orders/{order.public_id}/audit")

        self.assertEqual(reset_response.status_code, status.HTTP_200_OK)
        self.assertEqual(payments_response.status_code, status.HTTP_200_OK)
        self.assertEqual(audit_response.status_code, status.HTTP_200_OK)

        assignment = DispatchAssignment.objects.get(order=order)
        self.rider_profile.refresh_from_db()
        self.assertEqual(assignment.status, DispatchAssignment.Status.OFFER_PENDING)
        self.assertTrue(self.rider_profile.is_available)
        self.assertTrue(any(log["action_type"] == "ops.dispatch.reset" for log in audit_response.data))
