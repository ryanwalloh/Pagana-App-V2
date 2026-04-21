from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models

from apps.core.models import BaseModel


class AuditLog(BaseModel):
    class Source(models.TextChoices):
        API = "api", "API"
        WEBHOOK = "webhook", "Webhook"
        SYSTEM = "system", "System"
        ADMIN = "admin", "Admin"

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action_type = models.CharField(max_length=64, db_index=True)
    source = models.CharField(
        max_length=24,
        choices=Source.choices,
        default=Source.SYSTEM,
    )
    reason = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    target_content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        related_name="audit_logs",
    )
    target_object_id = models.CharField(max_length=64)
    target = GenericForeignKey("target_content_type", "target_object_id")
    target_repr = models.CharField(max_length=255)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.action_type} -> {self.target_repr}"
