from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import CustomerProfile

User = get_user_model()


class CustomerProfileApiTests(APITestCase):
    def test_customer_can_view_and_update_own_profile(self):
        user = User.objects.create_user(
            email="customer@example.com",
            password="StrongPass123",
            role=User.Roles.CUSTOMER,
        )
        CustomerProfile.objects.create(user=user, display_name="Initial Name")

        self.client.force_authenticate(user=user)
        response = self.client.patch(
            "/api/v1/customer/profile",
            {
                "display_name": "Updated Name",
                "preferred_contact_phone": "+12025550123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["display_name"], "Updated Name")
        self.assertEqual(response.data["preferred_contact_phone"], "+12025550123")

    def test_non_customer_cannot_access_customer_profile(self):
        merchant_user = User.objects.create_user(
            email="merchant@example.com",
            password="StrongPass123",
            role=User.Roles.MERCHANT,
        )

        self.client.force_authenticate(user=merchant_user)
        response = self.client.get("/api/v1/customer/profile")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
