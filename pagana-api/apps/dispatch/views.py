from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsRiderUser
from apps.orders.models import Order

from .models import DispatchAssignment, DispatchOffer, RiderLocation, RiderProfile
from .serializers import (
    DispatchAssignmentSerializer,
    DispatchOfferSerializer,
    RiderLocationSerializer,
    RiderLocationUpdateSerializer,
    RiderOrderStatusSerializer,
    RiderProfileSerializer,
)
from .services import accept_offer, reject_offer, update_rider_order_status


class RiderContextMixin:
    permission_classes = [IsAuthenticated, IsRiderUser]

    def get_rider_profile(self):
        return get_object_or_404(
            RiderProfile.objects.select_related("user"),
            user=self.request.user,
        )


class RiderProfileView(RiderContextMixin, APIView):
    def get(self, request):
        return Response(RiderProfileSerializer(self.get_rider_profile()).data)


class RiderOfferListView(RiderContextMixin, generics.ListAPIView):
    serializer_class = DispatchOfferSerializer

    def get_queryset(self):
        rider_profile = self.get_rider_profile()
        return DispatchOffer.objects.select_related("assignment", "assignment__order").filter(
            rider=rider_profile,
            status=DispatchOffer.Status.PENDING,
        )


class RiderOfferAcceptView(RiderContextMixin, APIView):
    def post(self, request, *args, **kwargs):
        rider_profile = self.get_rider_profile()
        offer = get_object_or_404(
            DispatchOffer.objects.select_related("assignment", "assignment__order"),
            pk=self.kwargs["offer_id"],
        )
        assignment = accept_offer(offer, rider_profile, reason=request.data.get("reason", ""))
        return Response(DispatchAssignmentSerializer(assignment).data)


class RiderOfferRejectView(RiderContextMixin, APIView):
    def post(self, request, *args, **kwargs):
        rider_profile = self.get_rider_profile()
        offer = get_object_or_404(
            DispatchOffer.objects.select_related("assignment", "assignment__order"),
            pk=self.kwargs["offer_id"],
        )
        assignment = reject_offer(offer, rider_profile, reason=request.data.get("reason", ""))
        return Response(DispatchAssignmentSerializer(assignment).data)


class RiderAssignmentListView(RiderContextMixin, generics.ListAPIView):
    serializer_class = DispatchAssignmentSerializer

    def get_queryset(self):
        rider_profile = self.get_rider_profile()
        return DispatchAssignment.objects.select_related("order", "rider", "rider__user").filter(
            rider=rider_profile,
            status__in=[
                DispatchAssignment.Status.ASSIGNED,
                DispatchAssignment.Status.COMPLETED,
            ],
        )


class RiderAssignmentStatusView(RiderContextMixin, APIView):
    def patch(self, request, *args, **kwargs):
        serializer = RiderOrderStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        rider_profile = self.get_rider_profile()
        order = get_object_or_404(Order, public_id=self.kwargs["public_id"])
        order = update_rider_order_status(
            order,
            rider_profile,
            serializer.validated_data["fulfillment_status"],
            reason=request.data.get("reason", ""),
        )
        return Response(
            {
                "public_id": str(order.public_id),
                "fulfillment_status": order.fulfillment_status,
            }
        )


class RiderLocationView(RiderContextMixin, APIView):
    def get(self, request):
        rider_profile = self.get_rider_profile()
        location = RiderLocation.objects.filter(rider=rider_profile).first()
        if not location:
            return Response({"detail": "No location recorded yet."}, status=status.HTTP_404_NOT_FOUND)
        return Response(RiderLocationSerializer(location).data)

    def put(self, request):
        serializer = RiderLocationUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        rider_profile = self.get_rider_profile()
        location, _ = RiderLocation.objects.update_or_create(
            rider=rider_profile,
            defaults=serializer.validated_data,
        )
        return Response(RiderLocationSerializer(location).data)
