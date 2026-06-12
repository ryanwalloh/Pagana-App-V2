from django.conf import settings
from django.db import models

from apps.core.models import BaseModel
from apps.orders.models import Order


class RiderProfile(BaseModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="rider_profile",
    )
    is_active = models.BooleanField(default=True)
    is_online = models.BooleanField(default=True)
    is_available = models.BooleanField(default=True)

    def __str__(self):
        return f"RiderProfile<{self.user.email}>"


class DispatchAssignment(BaseModel):
    class Status(models.TextChoices):
        SEARCHING = "searching", "Searching"
        OFFER_PENDING = "offer_pending", "Offer pending"
        ASSIGNED = "assigned", "Assigned"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"
        EXHAUSTED = "exhausted", "Exhausted"

    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name="dispatch_assignment",
    )
    rider = models.ForeignKey(
        RiderProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assignments",
    )
    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.SEARCHING,
    )

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"DispatchAssignment<{self.order.public_id}>"


class DispatchOffer(BaseModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"
        EXPIRED = "expired", "Expired"

    assignment = models.ForeignKey(
        DispatchAssignment,
        on_delete=models.CASCADE,
        related_name="offers",
    )
    rider = models.ForeignKey(
        RiderProfile,
        on_delete=models.CASCADE,
        related_name="offers",
    )
    sequence_number = models.PositiveIntegerField()
    status = models.CharField(
        max_length=24,
        choices=Status.choices,
        default=Status.PENDING,
    )
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("sequence_number", "created_at")
        constraints = [
            models.UniqueConstraint(
                fields=("assignment", "sequence_number"),
                name="unique_dispatch_offer_sequence_per_assignment",
            )
        ]

    def __str__(self):
        return f"{self.assignment.order.public_id} -> {self.rider.user.email}"


class RiderLocation(BaseModel):
    rider = models.OneToOneField(
        RiderProfile,
        on_delete=models.CASCADE,
        related_name="location",
    )
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)

    def __str__(self):
        return f"RiderLocation<{self.rider.user.email}>"
