from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Merchant, MerchantUserMembership

User = get_user_model()


class MerchantApiTests(APITestCase):
    def setUp(self):
        self.merchant_user = User.objects.create_user(
            email="merchant@example.com",
            password="StrongPass123",
            role=User.Roles.MERCHANT,
        )
        self.merchant = Merchant.objects.create(
            display_name="Merchant One",
            contact_email="merchant@example.com",
            approval_status=Merchant.ApprovalStatus.APPROVED,
            is_visible=True,
            operational_status=Merchant.OperationalStatus.ACTIVE,
        )
        MerchantUserMembership.objects.create(
            merchant=self.merchant,
            user=self.merchant_user,
            membership_role=MerchantUserMembership.Roles.OWNER,
            is_primary=True,
        )

    def test_merchant_can_view_and_update_own_profile(self):
        self.client.force_authenticate(user=self.merchant_user)
        response = self.client.patch(
            "/api/v1/merchant/profile",
            {
                "display_name": "Merchant Updated",
                "city": "Jakarta",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["display_name"], "Merchant Updated")
        self.assertEqual(response.data["city"], "Jakarta")

    def test_merchant_status_ignores_approval_escalation(self):
        self.client.force_authenticate(user=self.merchant_user)
        response = self.client.patch(
            "/api/v1/merchant/status",
            {
                "approval_status": Merchant.ApprovalStatus.SUSPENDED,
                "operational_status": Merchant.OperationalStatus.PAUSED,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.merchant.refresh_from_db()
        self.assertEqual(self.merchant.approval_status, Merchant.ApprovalStatus.APPROVED)
        self.assertEqual(self.merchant.operational_status, Merchant.OperationalStatus.PAUSED)

    def test_non_merchant_cannot_access_merchant_profile(self):
        customer_user = User.objects.create_user(
            email="customer@example.com",
            password="StrongPass123",
            role=User.Roles.CUSTOMER,
        )

        self.client.force_authenticate(user=customer_user)
        response = self.client.get("/api/v1/merchant/profile")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
