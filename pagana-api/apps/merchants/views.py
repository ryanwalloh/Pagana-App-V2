from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import IsMerchantUser

from .models import Merchant, MerchantUserMembership
from .serializers import (
    MerchantMembershipSerializer,
    MerchantProfileSerializer,
    MerchantStatusSerializer,
    PublicMerchantSerializer,
)


def public_merchant_queryset():
    """Merchants eligible to appear on customer-facing surfaces.

    Mirrors the orderability gate used by orders and catalog so a storefront
    is never listed publicly while it cannot actually receive orders.
    """
    return Merchant.objects.filter(
        approval_status=Merchant.ApprovalStatus.APPROVED,
        is_active=True,
        is_visible=True,
        operational_status=Merchant.OperationalStatus.ACTIVE,
    )


class PublicMerchantListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = PublicMerchantSerializer
    search_fields = ("display_name",)
    ordering_fields = ("display_name", "created_at")
    ordering = ("display_name",)

    def get_queryset(self):
        return public_merchant_queryset()


class PublicMerchantDetailView(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = PublicMerchantSerializer
    lookup_url_kwarg = "merchant_id"

    def get_queryset(self):
        return public_merchant_queryset()


class MerchantContextMixin:
    permission_classes = [IsAuthenticated, IsMerchantUser]

    def get_membership(self):
        return get_object_or_404(
            MerchantUserMembership.objects.select_related("merchant"),
            user=self.request.user,
            is_primary=True,
        )


class MerchantProfileView(MerchantContextMixin, generics.RetrieveUpdateAPIView):
    serializer_class = MerchantProfileSerializer

    def get_object(self):
        return self.get_membership().merchant


class MerchantStatusView(MerchantContextMixin, generics.RetrieveUpdateAPIView):
    serializer_class = MerchantStatusSerializer

    def get_object(self):
        return self.get_membership().merchant


class MerchantMembershipView(MerchantContextMixin, generics.GenericAPIView):
    serializer_class = MerchantMembershipSerializer

    def get(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_membership())
        return Response(serializer.data)
