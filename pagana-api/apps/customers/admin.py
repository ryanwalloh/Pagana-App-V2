from django.contrib import admin

from .models import CustomerProfile


@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "display_name", "preferred_contact_phone")
    search_fields = ("user__email", "display_name", "preferred_contact_phone")
