from django.urls import path

from .views import (
    RiderAssignmentListView,
    RiderAssignmentStatusView,
    RiderLocationView,
    RiderOfferAcceptView,
    RiderOfferListView,
    RiderOfferRejectView,
    RiderProfileView,
)

app_name = "dispatch"

urlpatterns = [
    path("rider/profile", RiderProfileView.as_view(), name="rider-profile"),
    path("rider/offers", RiderOfferListView.as_view(), name="rider-offers"),
    path("rider/offers/<int:offer_id>/accept", RiderOfferAcceptView.as_view(), name="rider-offer-accept"),
    path("rider/offers/<int:offer_id>/reject", RiderOfferRejectView.as_view(), name="rider-offer-reject"),
    path("rider/assignments", RiderAssignmentListView.as_view(), name="rider-assignments"),
    path(
        "rider/assignments/<uuid:public_id>/status",
        RiderAssignmentStatusView.as_view(),
        name="rider-assignment-status",
    ),
    path("rider/location", RiderLocationView.as_view(), name="rider-location"),
]
