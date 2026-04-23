from django.conf import settings
from django.db import models

from apps.core.models import BaseModel


class CustomerProfile(BaseModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="customer_profile",
    )
    display_name = models.CharField(max_length=255, blank=True)
    preferred_contact_phone = models.CharField(max_length=32, blank=True)
    default_delivery_notes = models.TextField(blank=True)

    def __str__(self):
        return f"CustomerProfile<{self.user.email}>"
