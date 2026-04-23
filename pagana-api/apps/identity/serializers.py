from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from apps.core.email import queue_email

User = get_user_model()


class CurrentUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "phone_number",
            "role",
            "is_active",
            "is_email_verified",
            "is_phone_verified",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class PaganaTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = CurrentUserSerializer(self.user).data
        return data


class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    merchant_name = serializers.CharField(write_only=True, required=False, allow_blank=False)

    class Meta:
        model = User
        fields = ("email", "password", "phone_number", "role", "merchant_name")
        extra_kwargs = {
            "phone_number": {"required": False, "allow_blank": True},
        }

    def validate_role(self, value):
        if value == User.Roles.ADMIN:
            raise serializers.ValidationError("Admin accounts cannot be self-created.")
        return value

    def validate(self, attrs):
        role = attrs.get("role", User.Roles.CUSTOMER)
        merchant_name = attrs.get("merchant_name")

        if role == User.Roles.MERCHANT and not merchant_name:
            raise serializers.ValidationError(
                {"merchant_name": "Merchant name is required for merchant signups."}
            )

        if role != User.Roles.MERCHANT:
            attrs.pop("merchant_name", None)

        return attrs

    def create(self, validated_data):
        merchant_name = validated_data.pop("merchant_name", None)
        password = validated_data.pop("password")
        with transaction.atomic():
            user = User.objects.create_user(password=password, **validated_data)

            if user.role == User.Roles.CUSTOMER:
                from apps.customers.models import CustomerProfile

                CustomerProfile.objects.create(user=user)
            elif user.role == User.Roles.MERCHANT:
                from apps.merchants.models import Merchant, MerchantUserMembership

                merchant = Merchant.objects.create(
                    display_name=merchant_name,
                    contact_email=user.email,
                    contact_phone=user.phone_number,
                )
                MerchantUserMembership.objects.create(
                    merchant=merchant,
                    user=user,
                    membership_role=MerchantUserMembership.Roles.OWNER,
                    is_primary=True,
                )
            elif user.role == User.Roles.RIDER:
                from apps.dispatch.models import RiderProfile

                RiderProfile.objects.create(user=user)

            queue_email(
                subject="Welcome to Pagana",
                message=(
                    "Your account has been created successfully. "
                    "Verification and onboarding flows can continue from here."
                ),
                recipient_list=[user.email],
            )

        self._refresh = RefreshToken.for_user(user)
        return user

    def to_representation(self, instance):
        data = CurrentUserSerializer(instance, context=self.context).data
        if hasattr(self, "_refresh"):
            data["tokens"] = {
                "refresh": str(self._refresh),
                "access": str(self._refresh.access_token),
            }
        return data
