# Merchants Module

## Purpose

The merchants module defines how `pagana-api` handles:

- merchant account ownership
- merchant business profile
- merchant onboarding and approval state
- merchant operational readiness
- merchant storefront identity
- merchant-facing operational context used by orders and dispatch

This module represents the business entity that receives orders and fulfills them through its storefront and operations. It is not the same as identity, catalog, or orders, though all three depend on it.

This document describes the target-state direction for the merchants module based on the current system context, the migration analysis, and the legacy restaurant-side implementation.

## Naming Note

The legacy backend uses the term `restaurant`.

Elsewhere in the new repository, the product language also uses `vendor` in some places and `merchant` in others. To keep boundaries clean until naming is finalized, this document uses `merchant` as the module term and treats legacy `restaurant` behavior as the source input.

If product language later standardizes on `vendor` or `restaurant_operator`, the module can be renamed without changing its core responsibility.

## Why Merchants Needs Its Own Module

The legacy backend currently blends several concerns together under the restaurant area:

- business identity and profile
- storefront visibility
- approval gating
- product ownership
- merchant dashboard behavior
- merchant order actions such as accept, reject, and prepare

That mixing makes it difficult to answer clear architectural questions such as:

- what is the merchant entity?
- what does approval actually control?
- what belongs to merchant profile versus catalog?
- what signals does dispatch rely on from merchant operations?

The merchants module is needed so the system can distinguish between:

- who the merchant is
- whether the merchant is allowed to operate
- whether the merchant is currently operationally ready
- which resources belong to that merchant

## Responsibilities

The merchants module should own:

- merchant business entity and ownership
- merchant onboarding state
- merchant approval or activation state
- merchant storefront profile
- merchant contact and business metadata
- merchant operational readiness signals that other modules depend on
- merchant-to-user ownership relationships

It should not own:

- authentication and user credentials
- product and catalog item definitions
- cart and checkout logic
- order transaction state
- rider assignment and delivery execution
- payment processing

Those belong to `identity`, `catalog`, `orders`, `dispatch`, and `payments`.

## Module Boundaries

### Merchants Owns

- merchant business record
- merchant approval state
- storefront profile fields
- merchant operational status flags relevant to platform use
- ownership mapping between merchant entity and merchant users

### Merchants References But Does Not Own

- users and roles from `identity`
- products from `catalog`
- merchant-facing order actions from `orders`
- dispatch readiness dependencies from `dispatch`

The merchants module should make those relationships explicit without absorbing the adjacent domains.

## Core Design Principles

### 1. Merchant is a business entity, not just a role

A merchant is not simply a user with a merchant role. The merchant should be modeled as its own business entity with one or more associated users.

Even if the first version starts with a simple one-to-one operator relationship, the module should not assume that will always remain true.

### 2. Approval is separate from identity

A user may have a merchant role in identity, but that should not automatically mean the merchant storefront is approved to operate publicly.

Identity decides who the user is.
Merchants decides whether the business can transact on the platform.

### 3. Merchant profile is separate from catalog

Merchant business data and catalog item data are related but distinct.

The merchant entity owns:

- brand/storefront identity
- business contact data
- serviceability-related metadata
- approval and readiness state

The catalog module owns:

- products
- menu structure
- pricing
- availability at the item level

### 4. Operational readiness is distinct from approval

Being approved to join the platform is not the same as being operational right now.

The merchants module should distinguish between:

- approved to operate on the platform
- active and visible to customers
- operationally open or ready to receive orders

### 5. Merchant readiness influences orders and dispatch, but does not own them

Merchant state can affect whether an order can be placed or whether dispatch should begin, but merchant operational signals should feed those modules rather than replace their logic.

## Legacy Input from Source System

The legacy `Restaurant` model currently contains:

- linked user
- name
- address fields
- phone
- type
- profile picture
- `is_approved`

This confirms that the old system already treats merchant-like data as a distinct business object, which is useful.

However, it also mixes:

- profile identity
- storefront visibility
- operational assumptions
- merchant-side order workflow

The new module should preserve the business concept while separating those concerns more intentionally.

## Recommended Entity Direction

Recommended core entities:

- `Merchant`
- `MerchantUserMembership` or equivalent ownership mapping if multi-user support is desired later
- optional `MerchantOperationalState`
- optional `MerchantDocument` or onboarding artifact records later

### Suggested Merchant fields

The exact schema can evolve, but the merchant entity will likely need:

- merchant ID
- business display name
- legal or normalized business name if needed later
- primary contact phone
- primary contact email if needed
- storefront address metadata
- storefront image or branding fields
- approval state
- activation state
- visibility state
- created and updated timestamps

### Suggested Operational State Direction

Operational state may be modeled on the merchant itself or on a dedicated operational sub-record.

Likely concepts:

- `pending_review`
- `approved`
- `rejected`
- `suspended`
- `active`
- `temporarily_closed`

Not all of these must launch immediately, but the module should be designed so these distinctions can exist.

## Merchant Ownership Model

The first version may reasonably support a single primary merchant operator user per merchant.

However, the module should not hardcode itself permanently into a strict one-user-equals-one-merchant assumption if multi-user operations are likely later.

Possible future users linked to one merchant:

- owner
- manager
- staff operator

Even if the first release keeps this simple, documenting the boundary now prevents identity and merchant data from collapsing into a single overloaded model later.

## Approval and Activation

The legacy backend already uses a basic `is_approved` flag and filters customer-facing merchant listing by approval.

That confirms the need for merchant approval as a real business concern.

The new module should formalize approval more clearly.

### Recommended distinctions

- approval: can this business operate on the platform?
- visibility: should customers currently see this storefront?
- operational status: can this merchant currently receive orders?

These are related but not identical.

Example:

- a merchant may be approved but temporarily closed
- a merchant may be approved but hidden during ops intervention
- a merchant may be active but out of service for a period

## Relationship to Catalog

Catalog depends on merchants for product ownership and storefront association.

### Merchants owns

- merchant identity
- merchant readiness
- merchant visibility
- merchant ownership

### Catalog owns

- products
- menus
- categories
- pricing
- item availability

This means merchant deletion, suspension, or closure should influence catalog visibility, but merchant profile logic should not absorb product logic.

## Relationship to Orders

Orders depends on merchants to know:

- which merchant owns the order
- whether the merchant is allowed to take orders
- which merchant-facing users may act on an order
- which merchant readiness signals affect the order lifecycle

Merchant-side order actions are still order actions. They should stay inside the orders module, but they depend on merchant ownership and merchant operational state.

Examples:

- accept order
- reject order
- mark preparing
- mark ready for pickup

Those actions should not define the merchant module, but merchant ownership should authorize them.

## Relationship to Dispatch

Dispatch depends on merchant readiness signals but should not be owned by merchants.

Examples of merchant-to-dispatch signals:

- merchant accepted order
- merchant is preparing order
- merchant marked order ready
- merchant currently able or unable to fulfill normal SLA

Dispatch may use those signals to decide when to start rider selection or how to prioritize a job, but dispatch policy remains system-owned.

## Relationship to Identity

Identity owns:

- user record
- login and credential flow
- core role membership

Merchants owns:

- merchant business entity
- merchant approval and operational state
- merchant-user relationship

This distinction is important because the legacy backend currently blurs "restaurant user" and "restaurant business" together more than the new system should.

## Storefront Visibility

The legacy customer-facing flow only lists approved restaurants.

That is the beginning of storefront visibility policy, but the new module should treat visibility more intentionally.

Storefront visibility may depend on:

- merchant approval state
- merchant activation state
- temporary operational closure
- policy or compliance intervention

Visibility should be exposed as a clear merchant module concern rather than buried in ad hoc query filters.

## Operational Readiness

The merchants module should publish operational signals used by adjacent modules.

Examples:

- able to receive new orders
- temporarily closed
- paused
- approved but not launched
- active and orderable

These signals are especially important because:

- orders needs to validate merchant orderability at checkout
- dispatch may need merchant readiness before assignment begins

## Recommended API Surface

The exact endpoint design can evolve, but the merchants module will likely need endpoints in these categories:

- get merchant profile
- update merchant profile
- get merchant operational status
- update merchant operational status
- admin or ops approval actions
- customer-facing storefront listing inputs or merchant detail inputs

Representative examples:

- `GET /api/v1/merchant/profile`
- `PATCH /api/v1/merchant/profile`
- `GET /api/v1/merchant/status`
- `PATCH /api/v1/merchant/status`
- `POST /api/v1/admin/merchants/{id}/approve`
- `POST /api/v1/admin/merchants/{id}/suspend`
- `GET /api/v1/merchants/{id}`

These are examples of shape, not final contracts.

## Security Requirements

The merchants module must enforce:

- only authorized merchant users can manage their merchant profile
- merchant users can only act on merchants they belong to
- approval and suspension actions are restricted to admin or ops roles
- public storefront visibility never leaks unapproved or hidden merchants unintentionally

The legacy backend’s simple role check plus direct model access is not enough for the target system.

## Migration Guidance from Legacy Backend

### Keep as input

- separate merchant business entity concept
- merchant profile fields such as display name, phone, address, and image
- merchant approval as a real platform requirement
- merchant readiness signals that affect order flow

### Redesign before adoption

- exact relationship between merchant users and merchant business record
- separation between approval, visibility, and readiness
- merchant dashboard behavior
- merchant-side operational status modeling

### Discard

- treating merchant business and merchant user as nearly the same object
- embedding merchant order workflow into merchant profile logic
- using ad hoc approval filtering in unrelated controller code as the main visibility model

## Dependencies

Merchants depends on:

- `identity` for merchant user identity and authorization context

Modules that depend on merchants:

- `catalog`
- `orders`
- `dispatch`
- customer-facing listing or discovery surfaces

The merchants module should become the stable business ownership layer that those modules reference.

## What This Doc Does Not Yet Lock In

This document intentionally does not finalize:

- whether one merchant can have multiple branches in the first version
- whether multi-user merchant teams are in v1
- how merchant onboarding documents are modeled
- SLA and ops metrics design
- merchant analytics and reporting

Those concerns should be documented later when the product and operations model becomes clearer.

## Recommendation

The merchants module should be implemented as the platform’s business-ownership layer for storefront operators.

If this module is designed cleanly:

- identity stays focused on users and roles
- catalog has a clean owner
- orders can authorize merchant-side actions correctly
- dispatch can depend on merchant readiness signals without inheriting merchant business logic

If it is not designed cleanly, the new backend will repeat the legacy pattern where merchant profile, storefront state, order actions, and business ownership blur together.
