from django.urls import path

from .views import (
    MerchantMembershipView,
    MerchantProfileView,
    MerchantStatusView,
    PublicMerchantDetailView,
    PublicMerchantListView,
)

app_name = "merchants"

urlpatterns = [
    path("merchants", PublicMerchantListView.as_view(), name="public-list"),
    path("merchants/<int:merchant_id>", PublicMerchantDetailView.as_view(), name="public-detail"),
    path("merchant/profile", MerchantProfileView.as_view(), name="profile"),
    path("merchant/status", MerchantStatusView.as_view(), name="status"),
    path("merchant/membership", MerchantMembershipView.as_view(), name="membership"),
]
