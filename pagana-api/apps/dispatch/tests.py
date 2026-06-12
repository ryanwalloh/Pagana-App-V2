from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.customers.models import CustomerProfile
from apps.merchants.models import Merchant, MerchantUserMembership
from apps.orders.models import Order

from .models import DispatchAssignment, DispatchOffer, RiderLocation, RiderProfile
from .services import trigger_dispatch_for_order

User = get_user_model()


class DispatchBaseTestCase(APITestCase):
    def setUp(self):
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
        self.other_merchant_user = User.objects.create_user(
            email="other-merchant@example.com",
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
        self.other_merchant = Merchant.objects.create(
            display_name="Merchant Two",
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
        MerchantUserMembership.objects.create(
            merchant=self.other_merchant,
            user=self.other_merchant_user,
            membership_role=MerchantUserMembership.Roles.OWNER,
            is_primary=True,
        )

        self.rider_user_one = User.objects.create_user(
            email="rider1@example.com",
            password="StrongPass123",
            role=User.Roles.RIDER,
        )
        self.rider_user_two = User.objects.create_user(
            email="rider2@example.com",
            password="StrongPass123",
            role=User.Roles.RIDER,
        )
        self.rider_profile_one = RiderProfile.objects.create(user=self.rider_user_one)
        self.rider_profile_two = RiderProfile.objects.create(user=self.rider_user_two)

    def create_order(self, merchant=None):
        merchant = merchant or self.merchant
        return Order.objects.create(
            customer=self.customer,
            merchant=merchant,
            payment_method=Order.PaymentMethod.CASH_ON_DELIVERY,
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
            merchant_display_name=merchant.display_name,
        )


class MerchantOrderOperationsTests(DispatchBaseTestCase):
    def test_merchant_can_progress_order_and_preparing_triggers_dispatch(self):
        order = self.create_order()
        self.client.force_authenticate(user=self.merchant_user)

        list_response = self.client.get("/api/v1/merchant/orders")
        accept_response = self.client.post(f"/api/v1/merchant/orders/{order.public_id}/accepted")
        preparing_response = self.client.post(f"/api/v1/merchant/orders/{order.public_id}/preparing")
        ready_response = self.client.post(f"/api/v1/merchant/orders/{order.public_id}/ready_for_pickup")

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data["results"]), 1)
        self.assertEqual(accept_response.status_code, status.HTTP_200_OK)
        self.assertEqual(preparing_response.status_code, status.HTTP_200_OK)
        self.assertEqual(ready_response.status_code, status.HTTP_200_OK)

        order.refresh_from_db()
        assignment = DispatchAssignment.objects.get(order=order)
        first_offer = DispatchOffer.objects.get(assignment=assignment, sequence_number=1)

        self.assertEqual(order.fulfillment_status, Order.FulfillmentStatus.READY_FOR_PICKUP)
        self.assertEqual(assignment.status, DispatchAssignment.Status.OFFER_PENDING)
        self.assertEqual(first_offer.rider, self.rider_profile_one)
        self.assertEqual(first_offer.status, DispatchOffer.Status.PENDING)

    def test_other_merchant_cannot_access_or_transition_order(self):
        order = self.create_order()
        self.client.force_authenticate(user=self.other_merchant_user)

        detail_response = self.client.get(f"/api/v1/merchant/orders/{order.public_id}")
        transition_response = self.client.post(f"/api/v1/merchant/orders/{order.public_id}/accepted")

        self.assertEqual(detail_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(transition_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_invalid_merchant_transition_is_rejected(self):
        order = self.create_order()
        self.client.force_authenticate(user=self.merchant_user)

        response = self.client.post(f"/api/v1/merchant/orders/{order.public_id}/ready_for_pickup")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class RiderDispatchApiTests(DispatchBaseTestCase):
    def test_rider_offer_flow_location_and_customer_tracking(self):
        order = self.create_order()
        order.fulfillment_status = Order.FulfillmentStatus.PREPARING
        order.save(update_fields=["fulfillment_status"])
        trigger_dispatch_for_order(order)

        self.client.force_authenticate(user=self.rider_user_one)
        offers_response = self.client.get("/api/v1/rider/offers")
        self.assertEqual(offers_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(offers_response.data["results"]), 1)
        offer_id = offers_response.data["results"][0]["id"]

        reject_response = self.client.post(f"/api/v1/rider/offers/{offer_id}/reject")
        self.assertEqual(reject_response.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(user=self.rider_user_two)
        offers_response_two = self.client.get("/api/v1/rider/offers")
        self.assertEqual(offers_response_two.status_code, status.HTTP_200_OK)
        self.assertEqual(len(offers_response_two.data["results"]), 1)
        second_offer_id = offers_response_two.data["results"][0]["id"]

        accept_response = self.client.post(f"/api/v1/rider/offers/{second_offer_id}/accept")
        self.assertEqual(accept_response.status_code, status.HTTP_200_OK)

        order.refresh_from_db()
        self.assertEqual(order.fulfillment_status, Order.FulfillmentStatus.PREPARING)

        self.client.force_authenticate(user=self.merchant_user)
        ready_response = self.client.post(f"/api/v1/merchant/orders/{order.public_id}/ready_for_pickup")
        self.assertEqual(ready_response.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(user=self.rider_user_two)
        location_response = self.client.put(
            "/api/v1/rider/location",
            {"latitude": "14.599500", "longitude": "120.984200"},
            format="json",
        )
        self.assertEqual(location_response.status_code, status.HTTP_200_OK)

        active_assignments_response = self.client.get("/api/v1/rider/assignments")
        self.assertEqual(active_assignments_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(active_assignments_response.data["results"]), 1)

        in_transit_response = self.client.patch(
            f"/api/v1/rider/assignments/{order.public_id}/status",
            {"fulfillment_status": Order.FulfillmentStatus.IN_TRANSIT},
            format="json",
        )
        arrived_response = self.client.patch(
            f"/api/v1/rider/assignments/{order.public_id}/status",
            {"fulfillment_status": Order.FulfillmentStatus.ARRIVED},
            format="json",
        )
        delivered_response = self.client.patch(
            f"/api/v1/rider/assignments/{order.public_id}/status",
            {"fulfillment_status": Order.FulfillmentStatus.DELIVERED},
            format="json",
        )

        self.assertEqual(in_transit_response.status_code, status.HTTP_200_OK)
        self.assertEqual(arrived_response.status_code, status.HTTP_200_OK)
        self.assertEqual(delivered_response.status_code, status.HTTP_200_OK)

        order.refresh_from_db()
        assignment = DispatchAssignment.objects.get(order=order)
        self.rider_profile_two.refresh_from_db()
        location = RiderLocation.objects.get(rider=self.rider_profile_two)

        self.assertEqual(order.fulfillment_status, Order.FulfillmentStatus.DELIVERED)
        self.assertEqual(assignment.status, DispatchAssignment.Status.COMPLETED)
        self.assertTrue(self.rider_profile_two.is_available)
        self.assertEqual(location.latitude, Decimal("14.599500"))

        self.client.force_authenticate(user=self.customer)
        tracking_response = self.client.get(f"/api/v1/orders/{order.public_id}/tracking")
        self.assertEqual(tracking_response.status_code, status.HTTP_200_OK)
        self.assertEqual(tracking_response.data["dispatch_summary"]["status"], DispatchAssignment.Status.COMPLETED)
        self.assertEqual(
            tracking_response.data["dispatch_summary"]["location"]["latitude"],
            Decimal("14.599500"),
        )

    def test_non_rider_cannot_access_rider_endpoints(self):
        self.client.force_authenticate(user=self.customer)

        response = self.client.get("/api/v1/rider/offers")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
