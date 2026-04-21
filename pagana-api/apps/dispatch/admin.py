from django.contrib import admin

from .models import DispatchAssignment, DispatchOffer, RiderLocation, RiderProfile


@admin.register(RiderProfile)
class RiderProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "is_active", "is_online", "is_available")
    search_fields = ("user__email",)
    list_filter = ("is_active", "is_online", "is_available")
    readonly_fields = ("user", "is_active", "is_online", "is_available", "created_at", "updated_at")

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(DispatchAssignment)
class DispatchAssignmentAdmin(admin.ModelAdmin):
    list_display = ("order", "rider", "status", "created_at")
    search_fields = ("order__public_id", "rider__user__email")
    list_filter = ("status",)
    readonly_fields = ("order", "rider", "status", "created_at", "updated_at")

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(DispatchOffer)
class DispatchOfferAdmin(admin.ModelAdmin):
    list_display = ("assignment", "rider", "sequence_number", "status", "created_at")
    search_fields = ("assignment__order__public_id", "rider__user__email")
    list_filter = ("status",)
    readonly_fields = (
        "assignment",
        "rider",
        "sequence_number",
        "status",
        "responded_at",
        "created_at",
        "updated_at",
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(RiderLocation)
class RiderLocationAdmin(admin.ModelAdmin):
    list_display = ("rider", "latitude", "longitude", "updated_at")
    search_fields = ("rider__user__email",)
    readonly_fields = ("rider", "latitude", "longitude", "created_at", "updated_at")

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
