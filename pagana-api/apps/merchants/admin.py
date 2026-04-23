from django.contrib import admin

from .models import Merchant, MerchantUserMembership


@admin.register(Merchant)
class MerchantAdmin(admin.ModelAdmin):
    list_display = (
        "display_name",
        "approval_status",
        "is_active",
        "is_visible",
        "operational_status",
    )
    search_fields = ("display_name", "legal_name", "contact_email", "contact_phone")
    list_filter = ("approval_status", "is_active", "is_visible", "operational_status")


@admin.register(MerchantUserMembership)
class MerchantUserMembershipAdmin(admin.ModelAdmin):
    list_display = ("merchant", "user", "membership_role", "is_primary")
    search_fields = ("merchant__display_name", "user__email")
    list_filter = ("membership_role", "is_primary")
