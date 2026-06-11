"""Idempotent development seed data for local testing and e2e fixtures.

Creates approved/active merchants with categorized products (including
hidden and non-orderable items to exercise public gating), one ineligible
merchant that must never appear publicly, plus known test accounts:

- customer: customer@demo.pagana.local / DemoPass123!
- merchant: merchant@demo.pagana.local / DemoPass123! (owns "Kusina ni Aling Nena")

Safe to re-run: existing records are matched by natural keys and left in place.
"""

from decimal import Decimal

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.db import transaction

from apps.catalog.models import Category, Product
from apps.customers.models import CustomerProfile
from apps.merchants.models import Merchant, MerchantUserMembership

User = get_user_model()

DEMO_PASSWORD = "DemoPass123!"

MERCHANTS = [
    {
        "display_name": "Kusina ni Aling Nena",
        "city": "Marawi",
        "categories": {
            "Mains": [
                ("Beef Rendang", "Slow-cooked beef in rich coconut and spice paste.", "249.00"),
                ("Chicken Piaparan", "Chicken in turmeric-coconut sauce with palapa.", "199.00"),
                ("Pater Wrap", "Banana-leaf wrapped rice with spiced beef.", "89.00"),
            ],
            "Drinks": [
                ("Calamansi Juice", "Freshly squeezed, served cold.", "45.00"),
                ("Iced Tea", "House-brewed black tea.", "39.00"),
            ],
        },
    },
    {
        "display_name": "Bahay Burger",
        "city": "Iligan",
        "categories": {
            "Burgers": [
                ("Classic Cheeseburger", "Quarter-pound patty, cheddar, house sauce.", "159.00"),
                ("Double Smash", "Two smashed patties with caramelized onions.", "229.00"),
                ("Crispy Chicken Burger", "Buttermilk-fried chicken thigh, slaw.", "179.00"),
            ],
            "Sides": [
                ("Fries", "Skin-on, double-fried.", "79.00"),
                ("Onion Rings", "Beer-battered.", "89.00"),
            ],
        },
    },
    {
        "display_name": "Manam-Manam Seafood",
        "city": "Cagayan de Oro",
        "categories": {
            "Grill": [
                ("Inihaw na Pusit", "Charcoal-grilled squid with soy-calamansi dip.", "289.00"),
                ("Grilled Tuna Belly", "With garlic rice and atchara.", "319.00"),
            ],
            "Soup": [
                ("Sinigang na Hipon", "Sour tamarind broth with prawns.", "259.00"),
            ],
        },
    },
]


class Command(BaseCommand):
    help = "Seed idempotent demo data for local development (DEBUG only)."

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("seed_demo_data is only available when DEBUG=True.")

        with transaction.atomic():
            self._seed_customer()
            merchants = [self._seed_merchant(spec) for spec in MERCHANTS]
            self._seed_merchant_owner(merchants[0])
            self._seed_gating_fixtures(merchants[0])
            self._seed_ineligible_merchant()

        self.stdout.write(self.style.SUCCESS("Demo data seeded."))
        self.stdout.write("customer login:  customer@demo.pagana.local / " + DEMO_PASSWORD)
        self.stdout.write("merchant login:  merchant@demo.pagana.local / " + DEMO_PASSWORD)

    def _seed_customer(self):
        user, created = User.objects.get_or_create(
            email="customer@demo.pagana.local",
            defaults={"role": User.Roles.CUSTOMER},
        )
        if created:
            user.set_password(DEMO_PASSWORD)
            user.save(update_fields=["password"])
        CustomerProfile.objects.get_or_create(
            user=user,
            defaults={"display_name": "Demo Customer"},
        )

    def _seed_merchant(self, spec):
        merchant, _ = Merchant.objects.get_or_create(
            display_name=spec["display_name"],
            defaults={
                "city": spec["city"],
                "country": "PH",
                "approval_status": Merchant.ApprovalStatus.APPROVED,
                "is_active": True,
                "is_visible": True,
                "operational_status": Merchant.OperationalStatus.ACTIVE,
            },
        )

        for sort_order, (category_name, products) in enumerate(spec["categories"].items()):
            category, _ = Category.objects.get_or_create(
                merchant=merchant,
                name=category_name,
                defaults={"is_visible": True, "sort_order": sort_order},
            )
            for display_name, description, price in products:
                Product.objects.get_or_create(
                    merchant=merchant,
                    display_name=display_name,
                    defaults={
                        "category": category,
                        "description": description,
                        "price": Decimal(price),
                        "is_visible": True,
                        "is_orderable": True,
                    },
                )
        return merchant

    def _seed_merchant_owner(self, merchant):
        user, created = User.objects.get_or_create(
            email="merchant@demo.pagana.local",
            defaults={"role": User.Roles.MERCHANT},
        )
        if created:
            user.set_password(DEMO_PASSWORD)
            user.save(update_fields=["password"])
        MerchantUserMembership.objects.get_or_create(
            merchant=merchant,
            user=user,
            defaults={
                "membership_role": MerchantUserMembership.Roles.OWNER,
                "is_primary": True,
            },
        )

    def _seed_gating_fixtures(self, merchant):
        """Products that must never show up on public surfaces."""
        Product.objects.get_or_create(
            merchant=merchant,
            display_name="Hidden Special",
            defaults={
                "description": "Visible flag off — must not appear publicly.",
                "price": Decimal("999.00"),
                "is_visible": False,
                "is_orderable": True,
            },
        )
        Product.objects.get_or_create(
            merchant=merchant,
            display_name="Sold Out Item",
            defaults={
                "description": "Orderable flag off — must not appear publicly.",
                "price": Decimal("149.00"),
                "is_visible": True,
                "is_orderable": False,
            },
        )

    def _seed_ineligible_merchant(self):
        Merchant.objects.get_or_create(
            display_name="Unapproved Kitchen",
            defaults={
                "city": "Marawi",
                "country": "PH",
                "approval_status": Merchant.ApprovalStatus.PENDING_REVIEW,
                "is_active": True,
                "is_visible": False,
                "operational_status": Merchant.OperationalStatus.TEMPORARILY_CLOSED,
            },
        )
