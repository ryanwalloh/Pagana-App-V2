from django.urls import path

from .views import (
    MerchantCatalogView,
    MerchantProductDetailView,
    MerchantProductListCreateView,
    ProductDetailView,
)

app_name = "catalog"

urlpatterns = [
    path("merchants/<int:merchant_id>/catalog", MerchantCatalogView.as_view(), name="merchant-catalog"),
    path("products/<int:product_id>", ProductDetailView.as_view(), name="product-detail"),
    path("merchant/products", MerchantProductListCreateView.as_view(), name="merchant-products"),
    path(
        "merchant/products/<int:product_id>",
        MerchantProductDetailView.as_view(),
        name="merchant-product-detail",
    ),
]
