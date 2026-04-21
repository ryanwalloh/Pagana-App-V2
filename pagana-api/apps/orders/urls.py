from django.urls import path

from .views import (
    CartItemDetailView,
    CartItemListCreateView,
    CartView,
    CheckoutConfirmView,
    CheckoutPrepareView,
    MerchantOrderDetailView,
    MerchantOrderListView,
    MerchantOrderTransitionView,
    OrderDetailView,
    OrderListView,
    OrderTrackingView,
)

app_name = "orders"

urlpatterns = [
    path("cart", CartView.as_view(), name="cart"),
    path("cart/items", CartItemListCreateView.as_view(), name="cart-items"),
    path("cart/items/<int:item_id>", CartItemDetailView.as_view(), name="cart-item-detail"),
    path("checkout/prepare", CheckoutPrepareView.as_view(), name="checkout-prepare"),
    path("checkout/confirm", CheckoutConfirmView.as_view(), name="checkout-confirm"),
    path("orders", OrderListView.as_view(), name="order-list"),
    path("orders/<uuid:public_id>", OrderDetailView.as_view(), name="order-detail"),
    path("orders/<uuid:public_id>/tracking", OrderTrackingView.as_view(), name="order-tracking"),
    path("merchant/orders", MerchantOrderListView.as_view(), name="merchant-order-list"),
    path("merchant/orders/<uuid:public_id>", MerchantOrderDetailView.as_view(), name="merchant-order-detail"),
    path(
        "merchant/orders/<uuid:public_id>/<str:target_status>",
        MerchantOrderTransitionView.as_view(),
        name="merchant-order-transition",
    ),
]
