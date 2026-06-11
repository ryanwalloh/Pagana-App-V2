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


class PublicMerchantApiTests(APITestCase):
    def setUp(self):
        self.eligible = Merchant.objects.create(
            display_name="Eligible Eats",
            approval_status=Merchant.ApprovalStatus.APPROVED,
            is_active=True,
            is_visible=True,
            operational_status=Merchant.OperationalStatus.ACTIVE,
        )

    def _create_ineligible(self, **overrides):
        defaults = {
            "display_name": "Ineligible",
            "approval_status": Merchant.ApprovalStatus.APPROVED,
            "is_active": True,
            "is_visible": True,
            "operational_status": Merchant.OperationalStatus.ACTIVE,
        }
        defaults.update(overrides)
        return Merchant.objects.create(**defaults)

    def test_anonymous_can_list_eligible_merchants(self):
        response = self.client.get("/api/v1/merchants")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        result = response.data["results"][0]
        self.assertEqual(result["display_name"], "Eligible Eats")
        self.assertEqual(
            sorted(result.keys()),
            ["city", "display_name", "id", "storefront_image_url"],
        )

    def test_each_ineligibility_dimension_is_excluded(self):
        self._create_ineligible(approval_status=Merchant.ApprovalStatus.PENDING_REVIEW)
        self._create_ineligible(is_active=False)
        self._create_ineligible(is_visible=False)
        self._create_ineligible(
            operational_status=Merchant.OperationalStatus.TEMPORARILY_CLOSED
        )

        response = self.client.get("/api/v1/merchants")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], self.eligible.id)

    def test_anonymous_can_retrieve_eligible_merchant_detail(self):
        response = self.client.get(f"/api/v1/merchants/{self.eligible.id}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["display_name"], "Eligible Eats")

    def test_ineligible_merchant_detail_returns_404(self):
        hidden = self._create_ineligible(is_visible=False)

        response = self.client.get(f"/api/v1/merchants/{hidden.id}")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_supports_display_name_search(self):
        self._create_ineligible(display_name="Other Shop")  # eligible but different name
        Merchant.objects.create(
            display_name="Eligible Bistro",
            approval_status=Merchant.ApprovalStatus.APPROVED,
            is_active=True,
            is_visible=True,
            operational_status=Merchant.OperationalStatus.ACTIVE,
        )

        response = self.client.get("/api/v1/merchants", {"search": "Eligible"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item["display_name"] for item in response.data["results"]]
        self.assertEqual(names, ["Eligible Bistro", "Eligible Eats"])
