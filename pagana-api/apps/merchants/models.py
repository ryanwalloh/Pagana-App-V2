from django.conf import settings
from django.db import models

from apps.core.models import BaseModel


class Merchant(BaseModel):
    class ApprovalStatus(models.TextChoices):
        PENDING_REVIEW = "pending_review", "Pending review"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        SUSPENDED = "suspended", "Suspended"

    class OperationalStatus(models.TextChoices):
        ACTIVE = "active", "Active"
        TEMPORARILY_CLOSED = "temporarily_closed", "Temporarily closed"
        PAUSED = "paused", "Paused"

    display_name = models.CharField(max_length=255)
    legal_name = models.CharField(max_length=255, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=32, blank=True)
    address_line_1 = models.CharField(max_length=255, blank=True)
    address_line_2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=120, blank=True)
    state = models.CharField(max_length=120, blank=True)
    postal_code = models.CharField(max_length=32, blank=True)
    country = models.CharField(max_length=2, blank=True)
    storefront_image_url = models.URLField(blank=True)
    approval_status = models.CharField(
        max_length=24,
        choices=ApprovalStatus.choices,
        default=ApprovalStatus.PENDING_REVIEW,
    )
    is_active = models.BooleanField(default=True)
    is_visible = models.BooleanField(default=False)
    operational_status = models.CharField(
        max_length=32,
        choices=OperationalStatus.choices,
        default=OperationalStatus.TEMPORARILY_CLOSED,
    )

    def __str__(self):
        return self.display_name


class MerchantUserMembership(BaseModel):
    class Roles(models.TextChoices):
        OWNER = "owner", "Owner"
        MANAGER = "manager", "Manager"
        STAFF = "staff", "Staff"

    merchant = models.ForeignKey(
        Merchant,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="merchant_memberships",
    )
    membership_role = models.CharField(
        max_length=20,
        choices=Roles.choices,
        default=Roles.OWNER,
    )
    is_primary = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("merchant", "user"),
                name="unique_merchant_user_membership",
            )
        ]

    def __str__(self):
        return f"{self.user.email} -> {self.merchant.display_name}"
