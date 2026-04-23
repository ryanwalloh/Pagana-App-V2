from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from apps.core.permissions import IsCustomerUser

from .models import CustomerProfile
from .serializers import CustomerProfileSerializer


class CustomerProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = CustomerProfileSerializer
    permission_classes = [IsAuthenticated, IsCustomerUser]

    def get_object(self):
        return get_object_or_404(CustomerProfile, user=self.request.user)
