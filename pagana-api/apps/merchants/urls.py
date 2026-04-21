from django.urls import path

from .views import MerchantMembershipView, MerchantProfileView, MerchantStatusView

app_name = "merchants"

urlpatterns = [
    path("merchant/profile", MerchantProfileView.as_view(), name="profile"),
    path("merchant/status", MerchantStatusView.as_view(), name="status"),
    path("merchant/membership", MerchantMembershipView.as_view(), name="membership"),
]
