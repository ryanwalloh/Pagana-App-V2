from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from apps.customers.models import CustomerProfile
from apps.dispatch.models import RiderProfile
from apps.merchants.models import MerchantUserMembership

User = get_user_model()


class IdentityApiTests(APITestCase):
    def test_customer_signup_creates_profile_and_tokens(self):
        with patch("apps.core.email.send_email_task.delay") as mocked_delay:
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(
                    "/api/v1/auth/signup",
                    {
                        "email": "customer@example.com",
                        "password": "StrongPass123",
                        "role": "customer",
                        "phone_number": "+12025550111",
                    },
                    format="json",
                )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["email"], "customer@example.com")

        access_token = AccessToken(response.data["access"])
        self.assertEqual(access_token["role"], "customer")

        self.assertTrue(User.objects.filter(email="customer@example.com").exists())
        self.assertTrue(CustomerProfile.objects.filter(user__email="customer@example.com").exists())
        mocked_delay.assert_called_once()

    def test_merchant_signup_creates_membership(self):
        with patch("apps.core.email.send_email_task.delay") as mocked_delay:
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(
                    "/api/v1/auth/signup",
                    {
                        "email": "merchant@example.com",
                        "password": "StrongPass123",
                        "role": "merchant",
                        "merchant_name": "Merchant One",
                    },
                    format="json",
                )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        membership = MerchantUserMembership.objects.get(user__email="merchant@example.com")
        self.assertEqual(membership.membership_role, MerchantUserMembership.Roles.OWNER)
        self.assertEqual(membership.merchant.display_name, "Merchant One")
        mocked_delay.assert_called_once()

    def test_rider_signup_creates_rider_profile(self):
        with patch("apps.core.email.send_email_task.delay") as mocked_delay:
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(
                    "/api/v1/auth/signup",
                    {
                        "email": "rider@example.com",
                        "password": "StrongPass123",
                        "role": "rider",
                    },
                    format="json",
                )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(RiderProfile.objects.filter(user__email="rider@example.com").exists())
        mocked_delay.assert_called_once()

    def test_login_uses_email_credentials(self):
        User.objects.create_user(
            email="login@example.com",
            password="StrongPass123",
            role=User.Roles.CUSTOMER,
        )

        response = self.client.post(
            "/api/v1/auth/login",
            {"email": "login@example.com", "password": "StrongPass123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["email"], "login@example.com")

    def test_me_uses_authenticated_context(self):
        acting_user = User.objects.create_user(
            email="acting@example.com",
            password="StrongPass123",
            role=User.Roles.CUSTOMER,
        )
        User.objects.create_user(
            email="other@example.com",
            password="StrongPass123",
            role=User.Roles.CUSTOMER,
        )

        self.client.force_authenticate(user=acting_user)
        response = self.client.get("/api/v1/me?user_id=9999")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "acting@example.com")
