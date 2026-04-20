# Catalog Module

## Purpose

The catalog module defines how `pagana-api` handles:

- merchant-owned products
- menu and catalog presentation structure
- item pricing
- item availability
- customer-facing item discovery inputs
- merchant-facing product management

This module is responsible for what a merchant offers for sale and what customers are allowed to browse and purchase.

This document describes the target-state direction for the catalog module based on the current system context, the migration analysis, and the currently visible legacy product and menu implementation.

## Why Catalog Matters

The legacy backend currently keeps catalog behavior very small:

- `Product` belongs to a restaurant
- product data contains name, description, price, and image
- cart operations are mixed into the same app area
- there is no meaningful category, inventory, or availability model

That is enough for a prototype, but not enough for a scalable backend where:

- merchants need structured catalog management
- orders need reliable orderability checks
- storefront listing needs visibility and availability rules
- product data must evolve without collapsing into checkout or merchant profile logic

Catalog needs its own module so the system can clearly answer:

- what products exist
- which merchant owns them
- whether they are currently visible
- whether they are currently orderable
- what price should be shown or used for checkout input

## Responsibilities

The catalog module should own:

- products
- menu items and menu structure
- item descriptions and media references
- item pricing
- item-level availability
- customer-facing catalog listing inputs
- merchant-facing product management

It should not own:

- merchant identity and approval
- cart and checkout logic
- committed order items
- payment processing
- rider dispatch or delivery execution

Those belong to `merchants`, `orders`, `payments`, and `dispatch`.

## Module Boundaries

### Catalog Owns

- product definitions
- menu structure
- item media and display attributes
- item pricing and orderability state
- product-level visibility flags

### Catalog References But Does Not Own

- merchant ownership from `merchants`
- order item snapshots from `orders`
- customer-facing storefront discovery surfaces

Catalog should define what is currently being sold, but once an order is committed, catalog should no longer be the source of truth for that transaction’s historical item details.

## Core Design Principles

### 1. Catalog is mutable, orders are snapshots

The live catalog can change over time:

- names can change
- prices can change
- images can change
- availability can change

Orders must therefore snapshot the relevant item data at purchase time. Catalog remains the live source of what is currently being offered, not what was historically sold.

### 2. Merchant owns the catalog, but catalog owns the products

The merchant module determines who owns the storefront.
The catalog module determines what that storefront is selling.

This distinction keeps merchant profile logic separate from product logic.

### 3. Availability must be explicit

A product existing in the database is not enough. The system must distinguish between:

- exists
- visible
- orderable
- temporarily unavailable

### 4. Pricing should be backend-owned

Prices shown to customers may come from the catalog, but checkout and order creation must still validate and re-derive totals on the backend. Catalog owns the current item price definition; orders owns the committed transaction total.

### 5. Cart behavior does not belong inside catalog long term

The legacy backend stores `CartItem` in the same app area as `Product`. That was acceptable in the prototype, but target-state ownership should move cart and checkout concerns into the orders module.

## Legacy Input from Source System

The current legacy `Product` model contains:

- merchant or restaurant reference
- name
- description
- price
- image

That confirms the basic product concept is already present.

However, the legacy catalog has important limitations:

- no categories
- no explicit inventory or stock model
- no explicit item availability flag
- no menu section structure
- cart tightly coupled to product app
- unrestricted product serialization

These gaps should shape the new design without encouraging overdesign on day one.

## Recommended Entity Direction

Recommended core entities:

- `Product`
- optional `Category`
- optional `MenuSection`
- optional `ProductAvailabilityState`
- product media reference fields or a related media structure later

### Suggested Product fields

At minimum, catalog products will likely need:

- product ID
- merchant reference
- display name
- description
- base price
- image or media reference
- visibility flag
- orderability flag
- created and updated timestamps

Possible additional fields later:

- SKU or internal code
- sort order
- preparation time override
- dietary or tagging metadata
- item-level tax or fee configuration if ever needed

## Categories and Menu Structure

The legacy backend currently has no category or menu section model.

That means the new module should document category support as a target capability, but not assume a mature menu taxonomy already exists.

Recommended stance:

- first version may launch with simple flat product lists if needed
- the module should still be designed so categories and menu sections can be added cleanly

Suggested future entities:

- `Category`
- `MenuSection`
- product-to-category relationship

This gives the platform room to evolve without pretending the legacy structure already supports it.

## Availability and Orderability

The legacy system has no explicit item availability model.

The catalog module should introduce a clearer distinction such as:

- visible to customers
- hidden from customers
- orderable
- temporarily unavailable
- archived

This is important because orders and checkout need a reliable answer to:

- can this customer order this item right now?

Catalog should own that answer at the item level, while merchants may contribute higher-level merchant readiness at the storefront level.

## Relationship to Merchants

The merchants module owns business identity and storefront ownership.

### Merchants owns

- merchant business entity
- merchant visibility and approval state
- merchant operational readiness

### Catalog owns

- products
- menu structure
- item pricing
- item visibility and orderability

This means:

- merchant suspension may hide the whole catalog
- merchant closure may make items non-orderable indirectly
- catalog still owns item-level structure and configuration

## Relationship to Orders

Orders depends on catalog for:

- current item existence
- current item price input
- current item orderability
- merchant association for the selected items

Catalog should not own:

- cart conversion to order
- committed order items
- historical line item truth after checkout

Once an order is created, the catalog can change without rewriting the historical order.

## Relationship to Customer Discovery

Customer-facing browsing will depend on catalog and merchant visibility together.

Catalog likely feeds:

- storefront product listings
- search
- featured or filtered item surfaces later

At this stage, it is enough to say the catalog module should provide orderable item data for customer-facing surfaces, while richer discovery ranking can be designed later if needed.

## Merchant Product Management

The legacy backend includes a basic product-creation flow from the merchant side.

The new catalog module should support merchant-facing product operations such as:

- create product
- update product
- hide or unhide product
- mark product unavailable
- list merchant products

These are catalog actions authorized through merchant ownership, not merchant profile actions.

## Pricing Direction

The legacy backend stores a single `price` field on `Product`.

That is a valid starting point, but the new system should distinguish between:

- current live product price in catalog
- committed item price snapshot in orders

The first version can still use a single current price field in catalog if that meets product needs.

Possible later extensions:

- scheduled price changes
- promotional pricing
- region-specific pricing

Those should not be documented as core today unless the product actually requires them now.

## Media and Presentation

The legacy backend stores a single product image reference.

That is enough for the first version.

The catalog module should remain open to later support for:

- multiple media assets
- richer display metadata
- merchandising information

But none of that needs to be treated as foundational unless product requirements demand it.

## Recommended API Surface

The exact endpoint design can evolve, but the catalog module will likely need endpoints in these categories:

- list public merchant catalog
- get product detail
- list merchant-owned products
- create merchant product
- update merchant product
- change item visibility or availability

Representative examples:

- `GET /api/v1/merchants/{merchant_id}/catalog`
- `GET /api/v1/products/{id}`
- `GET /api/v1/merchant/products`
- `POST /api/v1/merchant/products`
- `PATCH /api/v1/merchant/products/{id}`
- `PATCH /api/v1/merchant/products/{id}/availability`

These are examples of shape, not final contracts.

## Security Requirements

The catalog module must enforce:

- only authorized merchant users can manage products for their merchant
- public catalog endpoints never expose merchant-internal or hidden products unintentionally
- item availability checks are reliable enough for checkout validation
- product write operations do not bypass merchant ownership rules

The legacy `ModelViewSet` plus unrestricted serializer approach is not suitable for the target backend.

## Migration Guidance from Legacy Backend

### Keep as input

- basic product entity concept
- merchant-owned catalog ownership model
- image, description, and price as baseline product attributes

### Redesign before adoption

- cart coupling with the product app
- unrestricted product serialization
- implicit availability assumptions
- flat catalog structure if richer merchant menus are needed

### Discard

- treating product existence as equivalent to orderability
- leaving cart concerns embedded inside the product app boundary
- open CRUD exposure without merchant ownership controls

## Dependencies

Catalog depends on:

- `merchants` for merchant ownership and storefront linkage

Modules that depend on catalog:

- `orders`
- customer-facing browsing and discovery surfaces
- merchant product management surfaces

Catalog should remain the live source of what can currently be sold, but not the owner of transactional order history.

## What This Doc Does Not Yet Lock In

This document intentionally does not finalize:

- category structure in v1
- inventory or stock management
- advanced search and merchandising
- scheduled pricing or promotions
- multi-branch catalog inheritance

Those should be documented later only if the next project stage confirms they are required.

## Recommendation

The catalog module should be implemented as the live orderable item layer between merchants and orders.

If it is designed cleanly:

- merchants has a clear owned business entity
- orders can validate real product state without owning the catalog
- customer-facing browsing gets a stable backend contract
- product evolution stays out of checkout and merchant profile logic

If it is not designed cleanly, the backend will repeat the legacy pattern where products, cart, merchant profile, and checkout blur together.
