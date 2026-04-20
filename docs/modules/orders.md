# Orders Module

## Purpose

The orders module defines how `pagana-api` handles:

- cart state
- checkout preparation
- order creation
- order item capture
- fulfillment state progression
- customer order history and tracking
- coordination with payments, merchants, and dispatch

This module is one of the central business modules in the platform. It is where customer intent becomes a committed transaction and where multiple other modules intersect.

This document describes the target-state direction for the orders module based on the system context, the migration analysis, and the currently visible legacy backend behavior.

## Why Orders Comes Early

The legacy backend shows that ordering is one of the most cross-cutting workflows in the system.

The current source system spreads order behavior across:

- `menu` for cart items
- `core` for checkout, order placement, status lookup, and Stripe-related order creation
- `orders` for order models, serializer logic, DRF viewsets, and some status transitions
- `restaurant` for merchant-side order actions
- `rider` for assignment and delivery state changes

That fragmentation makes order behavior hard to reason about and easy to break. A target-state orders module is needed early so the rest of the backend can align around one source of truth for:

- what an order is
- when an order is created
- how totals are derived
- how status transitions work
- what belongs to orders versus payments or dispatch

## Responsibilities

The orders module should own:

- customer cart state
- checkout validation and quote preparation
- order creation from cart contents
- order item persistence
- fulfillment lifecycle at the order level
- customer-visible order status
- order history and retrieval
- order invariants such as totals, merchant ownership, and item snapshot rules

It should not own:

- user identity and authentication
- merchant approval state
- rider availability state
- payment processor integration details
- notification delivery
- live rider location

Those are dependencies or adjacent modules.

## Module Boundaries

### Orders Owns

- cart and cart item behavior
- checkout orchestration
- order aggregate
- order line items
- order totals and fee composition
- fulfillment status state machine
- customer and merchant order views
- order tracking payloads

### Orders References But Does Not Own

- identity from `identity`
- merchant or restaurant entities from `merchants`
- catalog products from `catalog`
- customer addresses from a customer-facing profile module
- rider assignment and execution from `dispatch`
- payment attempts and settlement from `payments`

Orders should be the system of record for the business transaction, but not the owner of every operational detail around that transaction.

## Core Design Principles

### 1. Orders are server-derived transactions

An order must never be created from untrusted client totals alone. The backend must derive the final order from server-side cart contents, pricing rules, merchant state, and checkout policy.

### 2. Cart is preparatory, order is committed

Cart state is mutable and temporary.
Order state is immutable in its commercial meaning after creation, except through controlled state transitions and corrections.

### 3. Fulfillment state and payment state are separate

The legacy backend already hints at this by storing both order status and payment status on the order record. The new system should preserve the distinction more intentionally:

- fulfillment answers "where is the order in the delivery lifecycle?"
- payment answers "what happened financially?"

These states influence each other, but they are not the same thing.

### 4. State transitions must be explicit

Orders should move through clearly defined transitions with rule checks, not by allowing any actor to write arbitrary status strings.

### 5. Ownership is enforced by identity context

Customers, merchants, riders, and admins see different views of the same order, but access must be derived from authenticated identity and object relationships, never from raw client-supplied IDs.

## Recommended Aggregate Design

The order should be treated as an aggregate centered on a committed transaction between:

- one customer
- one merchant
- one set of order items
- one delivery or fulfillment path
- zero or more payment attempts

Recommended core entities:

- `Cart`
- `CartItem`
- `Order`
- `OrderItem`
- optional `OrderTimelineEvent` or equivalent event history
- optional `OrderFeeBreakdown` if fee complexity grows

At minimum, the aggregate needs to capture enough information so the order remains understandable even if the catalog changes later.

## Order Data Direction

Based on the legacy backend, the target orders model should likely include:

- stable order identifier
- customer reference
- merchant reference
- current fulfillment status
- payment summary or payment linkage
- total item amount
- fee breakdown
- grand total
- delivery address snapshot
- merchant snapshot fields as needed
- created and updated timestamps
- order items with quantity, unit price, and subtotal snapshot

### Important Directional Change

The new system should prefer item and pricing snapshots on committed orders rather than assuming the live product record remains the source of truth forever.

That avoids retrospective inconsistency when catalog items or prices change after purchase.

## Cart Ownership

The legacy backend stores cart items separately and ties them to a user and restaurant. That is a reasonable starting point conceptually, but it needs stricter invariants.

The orders module should define:

- one active cart per customer context
- explicit merchant scoping rules for cart contents
- server-side quantity and availability validation
- clean cart clear or conversion behavior on successful order creation

The current legacy pattern where cart items can exist with implementation shortcuts should not be carried forward.

## Checkout and Order Creation

### Checkout responsibilities

Checkout should not just place the order immediately. It should validate and prepare the transaction.

Recommended checkout concerns:

- verify cart is not empty
- verify all items still exist and are orderable
- verify merchant is active and orderable
- verify address requirements
- derive fee breakdown
- derive total amount
- determine allowed payment methods
- create a checkout summary for client confirmation

### Order creation responsibilities

When the customer confirms checkout, the backend should:

- revalidate the cart
- rederive totals
- lock in item snapshots
- create the order atomically
- create order items atomically
- link payment intent or payment outcome if applicable
- clear or freeze the originating cart

The legacy backend mixes these concerns directly inside controller code and trusts client-provided totals. The new module must not do that.

## Recommended Fulfillment State Model

The legacy backend currently uses statuses like:

- `pending`
- `accepted`
- `preparing`
- `assigned`
- `ready`
- `otw`
- `arrived`
- `delivered`
- `cancelled`

These are useful inputs, but the new system should define them more intentionally.

Suggested fulfillment progression:

- `pending_confirmation` or `pending`
- `accepted`
- `preparing`
- `ready_for_pickup`
- `assigned_to_rider`
- `in_transit`
- `arrived`
- `delivered`
- `cancelled`

The exact names can still be finalized later, but the key requirement is that transitions are constrained and actor-specific.

### Example transition rules

- customer does not directly move an order to delivered
- merchant can accept, reject, and mark preparing or ready
- dispatch or rider assignment moves the order into assigned state
- rider can move assigned to in_transit, arrived, and delivered where policy allows
- cancelled orders are terminal except for controlled operational correction

## Payment Relationship

Payments must be adjacent to orders, not embedded into controller-level order creation logic.

Recommended boundary:

- orders owns the commercial transaction
- payments owns payment attempts, processor interaction, webhook handling, and financial settlement details

Orders may keep a payment summary or reference for quick status access, but payment orchestration should not live inside the orders module.

### Practical rule

Order creation may occur:

- before payment completion for cash-on-delivery or deferred payment flows
- after payment authorization or confirmation for card-based flows

The exact flow depends on product policy, but the separation of concerns must remain clear.

## Dispatch Relationship

Orders and dispatch are closely related but should remain separate.

Recommended boundary:

- orders owns fulfillment status at the business level
- dispatch owns rider assignment, rider operations, and live execution details

Dispatch may propose or execute a status transition, but the order remains the canonical transaction being updated.

Examples of dispatch-owned details:

- which rider is assigned
- rider acceptance
- rider location
- delivery proof metadata

Examples of orders-owned details:

- whether the order is assigned, in transit, delivered, or cancelled
- what items were purchased
- what totals were committed
- who the customer and merchant are for the order

## Merchant Relationship

The orders module should expose merchant-facing order views but should not absorb merchant business profile logic.

Merchant-side order behavior likely includes:

- listing incoming orders
- accepting or rejecting orders
- viewing order details
- marking preparation progress
- marking ready for pickup

These are still order actions, but merchant identity and merchant approval belong outside the orders module.

## Customer Relationship

Customer-facing order behavior likely includes:

- viewing cart
- preparing checkout
- confirming order
- listing active and historical orders
- viewing a single order
- tracking fulfillment progress
- viewing payment state summary

The customer profile or address module may supply data into checkout, but the order remains the core object being created and tracked.

## Recommended API Surface

The exact endpoint design can be refined later, but the orders module will likely need endpoints in these categories:

- get current cart
- add item to cart
- update cart item quantity
- remove cart item
- prepare checkout
- create order
- list customer orders
- get customer order detail
- list merchant orders
- merchant order actions
- list rider-relevant order queue through dispatch-facing surfaces

Representative examples:

- `GET /api/v1/cart`
- `POST /api/v1/cart/items`
- `PATCH /api/v1/cart/items/{id}`
- `DELETE /api/v1/cart/items/{id}`
- `POST /api/v1/checkout/prepare`
- `POST /api/v1/orders`
- `GET /api/v1/orders`
- `GET /api/v1/orders/{id}`
- `GET /api/v1/merchant/orders`
- `POST /api/v1/merchant/orders/{id}/accept`
- `POST /api/v1/merchant/orders/{id}/ready`

These are examples of shape, not final contracts.

## Pricing and Totals

The legacy backend stores:

- `total_amount`
- `rider_fee`
- `small_order_fee`

This indicates the business needs fee decomposition, but the current implementation is simplistic and partly hardcoded.

The target orders module should define:

- subtotal from committed items
- delivery fee or rider fee
- small-order fee if applicable
- discounts or vouchers later if product adds them
- final total

All totals should be backend-derived at checkout and persisted at order creation.

## Invariants

The orders module should enforce at least these invariants:

- an order belongs to exactly one customer
- an order belongs to exactly one merchant
- committed order items do not disappear if the live catalog changes
- order totals are derived by the backend
- unauthorized actors cannot mutate order state
- state transitions are validated
- cart conversion to order is atomic
- payment state and fulfillment state remain logically consistent

## Operational and Audit Considerations

Orders are operationally sensitive. The module should be designed to support:

- order event history
- structured state change reasons
- merchant and rider action auditability
- cancellation reason capture
- reconciliation with payment events

A lightweight event or timeline table may be worth adding early if operational visibility is important.

## Security Requirements

The orders module must launch with strict protection.

Required principles:

- never trust client-submitted `user_id`
- never trust client-submitted totals as final truth
- enforce customer, merchant, rider, and admin access by identity context
- validate every status transition by actor and current state
- avoid exposing unrestricted CRUD over orders
- ensure payment callbacks cannot arbitrarily corrupt order state

## Migration Guidance from Legacy Backend

### Keep as input

- the concept of cart items leading to order creation
- the current order lifecycle as business input
- fee decomposition concept
- separate payment status concept
- rider assignment and delivery progression needs

### Redesign before adoption

- exact order status naming
- direct storage shape of cart and order models
- payment linkage fields
- checkout workflow design
- how merchant and rider actions are exposed

### Discard

- order creation that trusts client totals
- order creation or lookup based on untrusted `user_id`
- mixed controller ownership across `core`, `orders`, `restaurant`, and `rider`
- open DRF CRUD exposure on order resources
- implicit business rules buried inside view functions

## Dependencies

Orders depends on:

- `identity` for actor identity and permissions
- `catalog` for product availability and pricing inputs
- `merchants` for merchant ownership and operability rules
- customer-facing profile data for delivery address input
- `payments` for payment attempt and settlement coordination
- `dispatch` for assignment and live delivery execution
- `notifications` for customer, merchant, and rider event delivery

Orders should remain the central commercial workflow module, but not become the owner of those adjacent concerns.

## What This Doc Does Not Yet Lock In

This document intentionally does not finalize:

- whether cart is a subdomain inside orders forever or later split out
- final fee policy formulas
- voucher, promotion, or loyalty behavior
- partial refunds and order adjustment policy
- split fulfillment or multi-merchant ordering
- exact event model and timeline implementation

Those should be documented later when the surrounding module decisions are mature enough.

## Recommendation

Orders should be implemented soon after identity, because it is the module that most clearly exposes whether the new backend has real boundaries or is slipping back into a legacy-style monolith.

If the orders module is designed cleanly:

- payments can integrate without owning checkout logic
- dispatch can integrate without owning the commercial transaction
- merchant flows can stay order-focused without coupling to customer internals
- customer clients can rely on consistent cart, checkout, and tracking APIs

If it is not designed cleanly, the same fragmentation seen in the legacy backend will reappear under new filenames.
