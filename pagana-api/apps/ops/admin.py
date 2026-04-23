from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("action_type", "source", "actor", "target_repr", "created_at")
    search_fields = ("action_type", "actor__email", "target_repr", "reason")
    list_filter = ("source", "action_type")
    readonly_fields = (
        "actor",
        "action_type",
        "source",
        "reason",
        "metadata",
        "target_content_type",
        "target_object_id",
        "target_repr",
        "created_at",
        "updated_at",
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
