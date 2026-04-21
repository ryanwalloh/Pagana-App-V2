from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    ordering = ("email",)
    list_display = (
        "email",
        "role",
        "is_active",
        "is_staff",
        "is_email_verified",
        "is_phone_verified",
    )
    search_fields = ("email", "phone_number")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            "Identity",
            {
                "fields": (
                    "role",
                    "phone_number",
                    "is_email_verified",
                    "is_phone_verified",
                )
            },
        ),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Important dates", {"fields": ("last_login", "created_at", "updated_at")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2", "role"),
            },
        ),
    )
