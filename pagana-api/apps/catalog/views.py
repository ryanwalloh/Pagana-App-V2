from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated

from apps.core.permissions import IsMerchantUser
from apps.merchants.models import Merchant, MerchantUserMembership

from .models import Product
from .serializers import MerchantProductSerializer, PublicProductSerializer


def customer_product_queryset():
    return Product.objects.select_related("merchant", "category").filter(
        is_archived=False,
        is_visible=True,
        is_orderable=True,
        merchant__approval_status=Merchant.ApprovalStatus.APPROVED,
        merchant__is_active=True,
        merchant__is_visible=True,
        merchant__operational_status=Merchant.OperationalStatus.ACTIVE,
    )


class MerchantCatalogMixin:
    permission_classes = [IsAuthenticated, IsMerchantUser]

    def get_membership(self):
        return get_object_or_404(
            MerchantUserMembership.objects.select_related("merchant"),
            user=self.request.user,
            is_primary=True,
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["membership"] = self.get_membership()
        return context


class MerchantCatalogView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = PublicProductSerializer

    def get_queryset(self):
        return customer_product_queryset().filter(merchant_id=self.kwargs["merchant_id"])


class ProductDetailView(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = PublicProductSerializer
    lookup_url_kwarg = "product_id"

    def get_queryset(self):
        return customer_product_queryset()


class MerchantProductListCreateView(MerchantCatalogMixin, generics.ListCreateAPIView):
    serializer_class = MerchantProductSerializer

    def get_queryset(self):
        membership = self.get_membership()
        return Product.objects.select_related("merchant", "category").filter(
            merchant=membership.merchant
        )


class MerchantProductDetailView(MerchantCatalogMixin, generics.RetrieveUpdateAPIView):
    serializer_class = MerchantProductSerializer
    lookup_url_kwarg = "product_id"

    def get_queryset(self):
        membership = self.get_membership()
        return Product.objects.select_related("merchant", "category").filter(
            merchant=membership.merchant
        )
