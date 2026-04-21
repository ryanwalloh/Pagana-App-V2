from django.db import models

from apps.core.models import BaseModel
from apps.merchants.models import Merchant


class Category(BaseModel):
    merchant = models.ForeignKey(
        Merchant,
        on_delete=models.CASCADE,
        related_name="categories",
    )
    name = models.CharField(max_length=255)
    is_visible = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ("sort_order", "name")
        constraints = [
            models.UniqueConstraint(
                fields=("merchant", "name"),
                name="unique_category_name_per_merchant",
            )
        ]

    def __str__(self):
        return f"{self.merchant.display_name}: {self.name}"


class Product(BaseModel):
    merchant = models.ForeignKey(
        Merchant,
        on_delete=models.CASCADE,
        related_name="products",
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )
    display_name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    image_url = models.URLField(blank=True)
    is_visible = models.BooleanField(default=True)
    is_orderable = models.BooleanField(default=True)
    is_archived = models.BooleanField(default=False)

    class Meta:
        ordering = ("display_name",)

    @property
    def is_customer_available(self):
        merchant = self.merchant
        return (
            not self.is_archived
            and self.is_visible
            and self.is_orderable
            and merchant.approval_status == Merchant.ApprovalStatus.APPROVED
            and merchant.is_active
            and merchant.is_visible
            and merchant.operational_status == Merchant.OperationalStatus.ACTIVE
        )

    def __str__(self):
        return f"{self.display_name} ({self.merchant.display_name})"
