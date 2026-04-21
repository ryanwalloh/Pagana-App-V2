from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import IsMerchantUser

from .models import MerchantUserMembership
from .serializers import (
    MerchantMembershipSerializer,
    MerchantProfileSerializer,
    MerchantStatusSerializer,
)


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
