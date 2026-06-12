from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsCustomerUser, IsMerchantUser
from apps.merchants.models import MerchantUserMembership

from .models import Cart, CartItem, Order
from .serializers import (
    CartItemMutationSerializer,
    CartItemQuantitySerializer,
    CartSerializer,
    CheckoutConfirmSerializer,
    CheckoutPrepareSerializer,
    OrderDetailSerializer,
    OrderListSerializer,
    OrderTrackingSerializer,
)
from .services import (
    add_or_update_cart_item,
    checkout_cart,
    clear_cart,
    get_or_create_cart,
    remove_cart_item,
    transition_order_by_merchant,
    update_cart_item_quantity,
    validate_checkout,
)


class CustomerOrderContextMixin:
    permission_classes = [IsAuthenticated, IsCustomerUser]


class MerchantOrderContextMixin:
    permission_classes = [IsAuthenticated, IsMerchantUser]

    def get_membership(self):
        return get_object_or_404(
            MerchantUserMembership.objects.select_related("merchant"),
            user=self.request.user,
            is_primary=True,
        )


class CartView(CustomerOrderContextMixin, APIView):
    def get(self, request):
        cart = get_or_create_cart(request.user)
        cart = Cart.objects.select_related("merchant").prefetch_related(
            "items__product"
        ).get(pk=cart.pk)
        return Response(CartSerializer(cart).data)

    def delete(self, request):
        cart = get_or_create_cart(request.user)
        clear_cart(cart)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CartItemListCreateView(CustomerOrderContextMixin, APIView):
    def post(self, request):
        serializer = CartItemMutationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        add_or_update_cart_item(request.user, **serializer.validated_data)
        cart = get_or_create_cart(request.user)
        cart = Cart.objects.select_related("merchant").prefetch_related(
            "items__product"
        ).get(pk=cart.pk)
        return Response(CartSerializer(cart).data, status=status.HTTP_200_OK)


class CartItemDetailView(CustomerOrderContextMixin, APIView):
    def get_object(self):
        return get_object_or_404(
            CartItem.objects.select_related("cart", "product", "product__merchant"),
            pk=self.kwargs["item_id"],
            cart__customer=self.request.user,
        )

    def patch(self, request, *args, **kwargs):
        serializer = CartItemQuantitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cart_item = self.get_object()
        update_cart_item_quantity(cart_item, serializer.validated_data["quantity"])
        cart = get_or_create_cart(request.user)
        cart = Cart.objects.select_related("merchant").prefetch_related(
            "items__product"
        ).get(pk=cart.pk)
        return Response(CartSerializer(cart).data)

    def delete(self, request, *args, **kwargs):
        cart_item = self.get_object()
        remove_cart_item(cart_item)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CheckoutPrepareView(CustomerOrderContextMixin, APIView):
    def post(self, request):
        serializer = CheckoutPrepareSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cart = get_or_create_cart(request.user)
        cart = Cart.objects.select_related("merchant").prefetch_related(
            "items__product",
            "items__product__merchant",
        ).get(pk=cart.pk)
        summary = validate_checkout(cart)
        summary.update(serializer.validated_data)
        summary["merchant"] = {
            "id": cart.merchant_id,
            "display_name": cart.merchant.display_name,
        }
        summary["items"] = CartSerializer(cart).data["items"]
        return Response(summary)


class CheckoutConfirmView(CustomerOrderContextMixin, APIView):
    def post(self, request):
        serializer = CheckoutConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = checkout_cart(request.user, serializer.validated_data)
        return Response(OrderDetailSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderListView(CustomerOrderContextMixin, generics.ListAPIView):
    serializer_class = OrderListSerializer

    def get_queryset(self):
        return (
            Order.objects.filter(customer=self.request.user)
            .select_related("merchant")
            .prefetch_related("payment_attempts", "dispatch_assignment__rider__user")
        )


class OrderDetailView(CustomerOrderContextMixin, generics.RetrieveAPIView):
    serializer_class = OrderDetailSerializer
    lookup_field = "public_id"
    lookup_url_kwarg = "public_id"

    def get_queryset(self):
        return (
            Order.objects.filter(customer=self.request.user)
            .select_related("merchant")
            .prefetch_related(
                "items",
                "timeline_events",
                "payment_attempts",
                "dispatch_assignment__rider__user",
                "dispatch_assignment__rider__location",
            )
        )


class OrderTrackingView(CustomerOrderContextMixin, generics.RetrieveAPIView):
    serializer_class = OrderTrackingSerializer
    lookup_field = "public_id"
    lookup_url_kwarg = "public_id"

    def get_queryset(self):
        return Order.objects.filter(customer=self.request.user).prefetch_related(
            "timeline_events",
            "payment_attempts",
            "dispatch_assignment__rider__location",
        )


class MerchantOrderListView(MerchantOrderContextMixin, generics.ListAPIView):
    serializer_class = OrderListSerializer

    def get_queryset(self):
        membership = self.get_membership()
        return (
            Order.objects.filter(merchant=membership.merchant)
            .select_related("merchant")
            .prefetch_related("payment_attempts", "dispatch_assignment__rider__user")
        )


class MerchantOrderDetailView(MerchantOrderContextMixin, generics.RetrieveAPIView):
    serializer_class = OrderDetailSerializer
    lookup_field = "public_id"
    lookup_url_kwarg = "public_id"

    def get_queryset(self):
        membership = self.get_membership()
        return (
            Order.objects.filter(merchant=membership.merchant)
            .select_related("merchant")
            .prefetch_related(
                "items",
                "timeline_events",
                "payment_attempts",
                "dispatch_assignment__rider__user",
                "dispatch_assignment__rider__location",
            )
        )


class MerchantOrderTransitionView(MerchantOrderContextMixin, APIView):
    def post(self, request, *args, **kwargs):
        membership = self.get_membership()
        order = get_object_or_404(
            Order.objects.filter(merchant=membership.merchant),
            public_id=self.kwargs["public_id"],
        )
        target_status = self.kwargs["target_status"]
        reason = request.data.get("reason", "")
        order = transition_order_by_merchant(order, target_status, actor=request.user, reason=reason)
        order = (
            Order.objects.select_related("merchant")
            .prefetch_related(
                "items",
                "timeline_events",
                "payment_attempts",
                "dispatch_assignment__rider__user",
                "dispatch_assignment__rider__location",
            )
            .get(pk=order.pk)
        )
        return Response(OrderDetailSerializer(order).data)
