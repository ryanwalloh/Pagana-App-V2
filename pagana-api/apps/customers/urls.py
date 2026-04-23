from django.urls import path

from .views import CustomerProfileView

app_name = "customers"

urlpatterns = [
    path("customer/profile", CustomerProfileView.as_view(), name="profile"),
]
