from django.contrib import admin

from .models import Category, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "merchant", "is_visible", "sort_order")
    search_fields = ("name", "merchant__display_name")
    list_filter = ("is_visible",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "display_name",
        "merchant",
        "price",
        "is_visible",
        "is_orderable",
        "is_archived",
    )
    search_fields = ("display_name", "merchant__display_name")
    list_filter = ("is_visible", "is_orderable", "is_archived")
