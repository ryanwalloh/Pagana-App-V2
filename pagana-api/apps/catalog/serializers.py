from rest_framework import serializers

from .models import Category, Product


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "is_visible", "sort_order")
        read_only_fields = ("id",)


class PublicProductSerializer(serializers.ModelSerializer):
    merchant = serializers.SerializerMethodField()
    category = CategorySerializer(read_only=True)

    class Meta:
        model = Product
        fields = (
            "id",
            "display_name",
            "description",
            "price",
            "image_url",
            "category",
            "merchant",
        )
        read_only_fields = fields

    def get_merchant(self, obj):
        return {
            "id": obj.merchant_id,
            "display_name": obj.merchant.display_name,
        }


class MerchantProductSerializer(serializers.ModelSerializer):
    category_id = serializers.PrimaryKeyRelatedField(
        source="category",
        queryset=Category.objects.all(),
        allow_null=True,
        required=False,
    )
    category = CategorySerializer(read_only=True)

    class Meta:
        model = Product
        fields = (
            "id",
            "category",
            "category_id",
            "display_name",
            "description",
            "price",
            "image_url",
            "is_visible",
            "is_orderable",
            "is_archived",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_category(self, value):
        if value is None:
            return value

        membership = self.context["membership"]
        if value.merchant_id != membership.merchant_id:
            raise serializers.ValidationError("Category must belong to the authenticated merchant.")
        return value

    def create(self, validated_data):
        membership = self.context["membership"]
        return Product.objects.create(merchant=membership.merchant, **validated_data)
