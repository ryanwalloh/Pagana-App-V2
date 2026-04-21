from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalog.models import Product
from apps.customers.models import CustomerProfile
from apps.merchants.models import Merchant, MerchantUserMembership

from .models import Cart, CartItem, Order

User = get_user_model()


class OrdersApiTests(APITestCase):
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
        self.product = Product.objects.create(
            merchant=self.merchant,
            display_name="Burger",
            description="Classic",
            price=Decimal("12.50"),
            is_visible=True,
            is_orderable=True,
        )
        self.second_product = Product.objects.create(
            merchant=self.merchant,
            display_name="Fries",
            description="Crispy",
            price=Decimal("5.00"),
            is_visible=True,
            is_orderable=True,
        )
        self.other_merchant = Merchant.objects.create(
            display_name="Merchant Two",
            approval_status=Merchant.ApprovalStatus.APPROVED,
            is_active=True,
            is_visible=True,
            operational_status=Merchant.OperationalStatus.ACTIVE,
        )
        self.other_product = Product.objects.create(
            merchant=self.other_merchant,
            display_name="Other Item",
            price=Decimal("4.50"),
            is_visible=True,
            is_orderable=True,
        )

    def authenticate(self):
        self.client.force_authenticate(user=self.customer)

    def test_customer_can_add_update_and_remove_cart_items(self):
        self.authenticate()

        add_response = self.client.post(
            "/api/v1/cart/items",
            {"product_id": self.product.id, "quantity": 2},
            format="json",
        )

        self.assertEqual(add_response.status_code, status.HTTP_200_OK)
        self.assertEqual(add_response.data["merchant"]["id"], self.merchant.id)
        self.assertEqual(add_response.data["subtotal"], Decimal("25.00"))

        item_id = add_response.data["items"][0]["id"]
        patch_response = self.client.patch(
            f"/api/v1/cart/items/{item_id}",
            {"quantity": 3},
            format="json",
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_response.data["subtotal"], Decimal("37.50"))

        delete_response = self.client.delete(f"/api/v1/cart/items/{item_id}")
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
        cart = Cart.objects.get(customer=self.customer)
        self.assertIsNone(cart.merchant)

    def test_cart_rejects_cross_merchant_items(self):
        self.authenticate()
        self.client.post(
            "/api/v1/cart/items",
            {"product_id": self.product.id, "quantity": 1},
            format="json",
        )

        response = self.client.post(
            "/api/v1/cart/items",
            {"product_id": self.other_product.id, "quantity": 1},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("product_id", response.data)

    def test_checkout_prepare_returns_summary_and_allowed_payment_methods(self):
        self.authenticate()
        self.client.post(
            "/api/v1/cart/items",
            {"product_id": self.product.id, "quantity": 2},
            format="json",
        )
        response = self.client.post(
            "/api/v1/checkout/prepare",
            {
                "recipient_name": "Customer One",
                "recipient_phone": "+12025550123",
                "delivery_address_line_1": "123 Main St",
                "delivery_city": "Jakarta",
                "delivery_postal_code": "10110",
                "delivery_country": "ID",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_amount"], Decimal("25.00"))
        self.assertEqual(
            response.data["allowed_payment_methods"],
            [Order.PaymentMethod.CASH_ON_DELIVERY, Order.PaymentMethod.CARD],
        )

    def test_checkout_creates_order_snapshots_clears_cart_and_is_idempotent(self):
        self.authenticate()
        self.client.post(
            "/api/v1/cart/items",
            {"product_id": self.product.id, "quantity": 2},
            format="json",
        )
        with patch("apps.core.email.send_email_task.delay") as mocked_delay:
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(
                    "/api/v1/checkout/confirm",
                    {
                        "recipient_name": "Customer One",
                        "recipient_phone": "+12025550123",
                        "delivery_address_line_1": "123 Main St",
                        "delivery_city": "Jakarta",
                        "delivery_postal_code": "10110",
                        "delivery_country": "ID",
                        "payment_method": Order.PaymentMethod.CASH_ON_DELIVERY,
                        "idempotency_key": "checkout-123",
                    },
                    format="json",
                )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        order = Order.objects.get(customer=self.customer)
        self.assertEqual(order.total_amount, Decimal("25.00"))
        self.assertEqual(order.items.count(), 1)
        self.assertEqual(order.items.first().product_display_name, "Burger")
        self.assertEqual(CartItem.objects.filter(cart__customer=self.customer).count(), 0)
        mocked_delay.assert_called_once()

        duplicate_response = self.client.post(
            "/api/v1/checkout/confirm",
            {
                "recipient_name": "Customer One",
                "recipient_phone": "+12025550123",
                "delivery_address_line_1": "123 Main St",
                "delivery_city": "Jakarta",
                "delivery_postal_code": "10110",
                "delivery_country": "ID",
                "payment_method": Order.PaymentMethod.CASH_ON_DELIVERY,
                "idempotency_key": "checkout-123",
            },
            format="json",
        )

        self.assertEqual(duplicate_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(duplicate_response.data["public_id"], str(order.public_id))
        self.assertEqual(Order.objects.filter(customer=self.customer).count(), 1)

    def test_checkout_rejects_closed_merchant(self):
        self.authenticate()
        self.client.post(
            "/api/v1/cart/items",
            {"product_id": self.product.id, "quantity": 1},
            format="json",
        )
        self.merchant.operational_status = Merchant.OperationalStatus.PAUSED
        self.merchant.save(update_fields=["operational_status"])

        response = self.client.post(
            "/api/v1/checkout/confirm",
            {
                "recipient_name": "Customer One",
                "recipient_phone": "+12025550123",
                "delivery_address_line_1": "123 Main St",
                "delivery_city": "Jakarta",
                "delivery_postal_code": "10110",
                "delivery_country": "ID",
                "payment_method": Order.PaymentMethod.CASH_ON_DELIVERY,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("merchant", response.data)

    def test_customer_can_only_view_own_orders(self):
        self.authenticate()
        self.client.post(
            "/api/v1/cart/items",
            {"product_id": self.product.id, "quantity": 1},
            format="json",
        )
        with patch("apps.core.email.send_email_task.delay"):
            with self.captureOnCommitCallbacks(execute=True):
                create_response = self.client.post(
                    "/api/v1/checkout/confirm",
                    {
                        "recipient_name": "Customer One",
                        "recipient_phone": "+12025550123",
                        "delivery_address_line_1": "123 Main St",
                        "delivery_city": "Jakarta",
                        "delivery_postal_code": "10110",
                        "delivery_country": "ID",
                        "payment_method": Order.PaymentMethod.CASH_ON_DELIVERY,
                    },
                    format="json",
                )

        order_public_id = create_response.data["public_id"]
        list_response = self.client.get("/api/v1/orders")
        tracking_response = self.client.get(f"/api/v1/orders/{order_public_id}/tracking")

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data["results"]), 1)
        self.assertEqual(tracking_response.status_code, status.HTTP_200_OK)
        self.assertEqual(tracking_response.data["fulfillment_status"], Order.FulfillmentStatus.PENDING)

        self.client.force_authenticate(user=self.other_customer)
        forbidden_response = self.client.get(f"/api/v1/orders/{order_public_id}")
        self.assertEqual(forbidden_response.status_code, status.HTTP_404_NOT_FOUND)
