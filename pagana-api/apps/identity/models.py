from django.contrib.auth.models import AbstractUser
from django.db import models

from apps.core.models import BaseModel

from .managers import UserManager


class User(BaseModel, AbstractUser):
    class Roles(models.TextChoices):
        CUSTOMER = "customer", "Customer"
        RIDER = "rider", "Rider"
        MERCHANT = "merchant", "Merchant"
        ADMIN = "admin", "Admin"

    username = None
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=32, blank=True)
    role = models.CharField(
        max_length=20,
        choices=Roles.choices,
        default=Roles.CUSTOMER,
    )
    is_email_verified = models.BooleanField(default=False)
    is_phone_verified = models.BooleanField(default=False)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return f"{self.email} ({self.role})"
