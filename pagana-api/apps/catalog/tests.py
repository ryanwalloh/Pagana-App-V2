from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.merchants.models import Merchant, MerchantUserMembership

from .models import Product

User = get_user_model()


class CatalogApiTests(APITestCase):
    def setUp(self):
        self.merchant_user = User.objects.create_user(
            email="merchant@example.com",
            password="StrongPass123",
            role=User.Roles.MERCHANT,
        )
        self.merchant = Merchant.objects.create(
            display_name="Visible Merchant",
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
        self.visible_product = Product.objects.create(
            merchant=self.merchant,
            display_name="Burger",
            description="Classic burger",
            price=Decimal("12.50"),
            is_visible=True,
            is_orderable=True,
        )
        Product.objects.create(
            merchant=self.merchant,
            display_name="Hidden Burger",
            price=Decimal("10.00"),
            is_visible=False,
            is_orderable=True,
        )
        hidden_merchant = Merchant.objects.create(
            display_name="Closed Merchant",
            approval_status=Merchant.ApprovalStatus.APPROVED,
            is_active=True,
            is_visible=False,
            operational_status=Merchant.OperationalStatus.ACTIVE,
        )
        Product.objects.create(
            merchant=hidden_merchant,
            display_name="Invisible Item",
            price=Decimal("9.00"),
            is_visible=True,
            is_orderable=True,
        )

    def test_public_catalog_only_returns_customer_available_products(self):
        response = self.client.get(f"/api/v1/merchants/{self.merchant.id}/catalog")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["display_name"], "Burger")

    def test_public_product_detail_rejects_hidden_product(self):
        hidden_product = Product.objects.get(display_name="Hidden Burger")

        response = self.client.get(f"/api/v1/products/{hidden_product.id}")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_merchant_can_create_and_update_own_product(self):
        self.client.force_authenticate(user=self.merchant_user)

        create_response = self.client.post(
            "/api/v1/merchant/products",
            {
                "display_name": "Pizza",
                "description": "Stone baked",
                "price": "18.00",
                "is_visible": True,
                "is_orderable": True,
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        product_id = create_response.data["id"]

        update_response = self.client.patch(
            f"/api/v1/merchant/products/{product_id}",
            {"is_orderable": False},
            format="json",
        )

        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertFalse(update_response.data["is_orderable"])

    def test_merchant_cannot_update_other_merchant_product(self):
        other_user = User.objects.create_user(
            email="other@example.com",
            password="StrongPass123",
            role=User.Roles.MERCHANT,
        )
        other_merchant = Merchant.objects.create(
            display_name="Other Merchant",
            approval_status=Merchant.ApprovalStatus.APPROVED,
            is_active=True,
            is_visible=True,
            operational_status=Merchant.OperationalStatus.ACTIVE,
        )
        MerchantUserMembership.objects.create(
            merchant=other_merchant,
            user=other_user,
            membership_role=MerchantUserMembership.Roles.OWNER,
            is_primary=True,
        )

        self.client.force_authenticate(user=other_user)
        response = self.client.patch(
            f"/api/v1/merchant/products/{self.visible_product.id}",
            {"display_name": "Hijacked"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
