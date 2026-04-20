# Payments Module

## Purpose

The payments module defines how `pagana-api` handles:

- payment method support
- payment attempt creation
- payment processor interaction
- authorization and capture outcomes
- webhook processing
- payment status tracking
- refund and failure handling
- reconciliation between financial events and commercial orders

This module is adjacent to orders, but it is not the same thing as orders. Its purpose is to manage the financial side of a transaction without allowing payment concerns to take over the commercial order workflow.

This document describes the target-state direction for the payments module based on the current system context, the legacy backend analysis, and the visible Stripe implementation in the legacy application.

## Why Payments Comes After Orders

The legacy backend shows that payment handling was introduced directly inside `core/views.py` and coupled to order creation.

The current source flow does the following in one place:

- accepts client-submitted totals
- creates a Stripe PaymentIntent
- confirms payment
- creates the order
- stores some Stripe fields on the order
- updates payment status through a webhook

That flow works as a prototype, but it collapses commercial and financial responsibilities into one controller path. The payments module is needed so that:

- orders stays the owner of the transaction
- payments becomes the owner of processor interaction
- webhook handling is isolated and auditable
- payment state is explicit and safe to reconcile

## Responsibilities

The payments module should own:

- payment intent or payment attempt lifecycle
- processor request and response handling
- payment processor reference IDs
- webhook verification and ingestion
- payment outcome tracking
- refund workflow tracking
- reconciliation logic between processor events and internal payment records
- normalized payment state exposed to other modules

It should not own:

- cart contents
- checkout business rules
- merchant catalog pricing
- order fulfillment state
- rider assignment or delivery execution
- user identity lifecycle

Those belong to orders, catalog, dispatch, or identity.

## Module Boundaries

### Payments Owns

- `Payment` or `PaymentAttempt` records
- payment processor references
- payment provider payload handling
- webhook verification
- refund records or refund state
- payment event history if needed
- normalized payment statuses

### Payments References But Does Not Own

- orders from `orders`
- identity from `identity`
- merchant references where needed for processor metadata
- notification triggers from `notifications`

Payments should understand what order a payment relates to, but it should not become the owner of order creation or fulfillment logic.

## Core Design Principles

### 1. Payment state is not order state

The legacy backend already stores `status` and `payment_status` separately on the order, which is the right conceptual direction.

The payments module should make this separation explicit:

- order state answers "what is happening operationally?"
- payment state answers "what happened financially?"

### 2. The backend derives payment amounts

A payment request must never trust a raw client-submitted total as final truth. Amounts sent to the payment processor must come from backend-derived checkout data or committed order totals.

### 3. Webhooks are authoritative for processor outcomes where applicable

Client-side confirmation can improve UX, but processor callbacks remain the most trustworthy signal for final financial outcome in many payment flows.

### 4. Payment attempts are first-class records

The system should not treat payment processor IDs as loose fields sprinkled across the order record. Payment attempts should be modeled deliberately so retries, failures, and refunds can be reasoned about cleanly.

### 5. Idempotency is mandatory

Payment operations, especially order-linked flows and webhook processing, must be designed to handle retries safely without creating duplicate orders or corrupting status.

## Recommended Entity Direction

The legacy backend stores the following payment-related fields directly on `Order`:

- `payment_method`
- `payment_status`
- `stripe_payment_intent_id`
- `stripe_client_secret`
- `stripe_charge_id`

Those fields are useful signals, but the new backend should move toward an explicit payment model.

Recommended entities:

- `PaymentMethodType` or enum-like configuration
- `Payment`
- `PaymentAttempt`
- optional `Refund`
- optional `PaymentEvent`

### Suggested Payment Record Direction

At minimum, a payment-oriented record should capture:

- internal payment ID
- linked order ID
- linked customer ID
- payment provider name
- provider payment reference
- amount
- currency
- method type
- current payment status
- created and updated timestamps
- last processor response metadata or normalized outcome details

### Suggested Payment Attempt Direction

If multiple payment attempts per order are allowed, the system should represent them explicitly rather than overwriting one set of processor fields repeatedly.

That makes it easier to support:

- retries
- failure analysis
- refunds
- reconciliation

## Recommended Status Model

The legacy backend uses:

- `pending`
- `succeeded`
- `failed`
- `cancelled`
- `refunded`

That is a good starting point, but the payments module should treat payment state as its own lifecycle with deliberate transitions.

Suggested normalized states:

- `pending`
- `requires_action`
- `authorized`
- `succeeded`
- `failed`
- `cancelled`
- `refunded`
- `partially_refunded` if needed later

Not all states need to ship immediately, but the model should be designed so they can be added without breaking the whole module.

## Processor Integration Strategy

### Current Known Processor

The legacy backend currently integrates Stripe.

Visible capabilities in the source system:

- PaymentIntent creation
- payment confirmation path
- webhook verification
- success and failure status updates

### Target Direction

The payments module should isolate payment providers behind infrastructure adapters rather than embedding provider calls directly in request handlers.

This enables:

- easier testing
- safer retries
- cleaner module boundaries
- possible future support for additional payment methods

Stripe can remain the first processor, but the module should be written as a payments capability, not as a `stripe` namespace leaking through the whole backend.

## Relationship to Orders

The payments module depends heavily on the orders module, but the ownership boundary must stay clear.

### Orders owns

- whether a commercial transaction should exist
- what was purchased
- the backend-derived final total
- fulfillment lifecycle

### Payments owns

- whether money was authorized, captured, failed, or refunded
- payment processor references
- payment attempts and retries
- webhook ingestion and verification

### Recommended interaction model

Orders should call into payments when a payable checkout needs processor interaction.

Payments should emit normalized outcomes back to orders or update a shared reference model so orders can reflect financial state without embedding processor logic.

## Order Creation Strategies

The system may support more than one order and payment sequence depending on payment method.

### Option A: Create order before payment completion

Useful for:

- cash on delivery
- flows where a pending order should exist before card settlement completes

Risks:

- abandoned payment attempts can leave dangling pending orders

### Option B: Create order after successful payment confirmation

Useful for:

- card-first or prepaid flows

Risks:

- requires stronger idempotency and cart revalidation at commit time

### Recommended approach

The module design should support either policy, but the implementation must make the policy explicit per payment method.

Whatever policy is chosen:

- the backend must derive totals
- the order/payment sequence must be idempotent
- webhook outcomes must not create duplicates

## Webhook Handling

The legacy backend already verifies Stripe webhook signatures, which is conceptually correct.

The target payments module should formalize webhook processing with:

- signature verification
- processor event normalization
- idempotent event handling
- payment record lookup by trusted processor reference
- safe update rules
- audit trail of received events if useful operationally

Webhook logic should not live inside a generic controller file that also handles unrelated checkout or catalog behavior.

## Refunds and Reversals

The legacy backend already includes `refunded` in payment status choices, which suggests refund handling is expected even if it is not fully implemented.

The payments module should be designed to support:

- full refund
- partial refund later if needed
- refund status tracking
- linking refunds to the original payment
- reconciliation of refund events from the processor

Refund approval policy itself may belong partly to admin or support workflows, but payment execution and status belong here.

## Payment Methods

Based on current system knowledge, the platform likely needs to support at least:

- cash on delivery
- card-based payment via Stripe

Additional methods may be added later, but should fit into the same model:

- a normalized internal payment method type
- processor-specific implementation behind adapters

Cash on delivery should still be modeled deliberately as a payment method even though it does not use an external processor.

## Security Requirements

The payments module must launch with stronger controls than the legacy implementation.

Required principles:

- never trust client-submitted `user_id` as actor identity
- never trust client-submitted totals as processor charge truth
- verify all processor webhooks
- use idempotency for payment creation and confirmation paths
- avoid exposing raw processor payloads unnecessarily
- keep secret keys and webhook secrets out of application code
- enforce strong auditability for sensitive payment state changes

## Operational Requirements

Payments are sensitive operationally and financially. The module should support:

- structured logging
- failure visibility
- reconciliation support
- retry-safe webhook processing
- tracing from order to payment attempt to processor event
- support investigation when customer-reported payment mismatches occur

If operational visibility is weak here, debugging financial discrepancies becomes expensive very quickly.

## Recommended API Surface

The exact endpoint shape can still evolve, but the payments module will likely need endpoints in these categories:

- create payment attempt or payment intent
- confirm or finalize payment where needed
- get payment status for an order or checkout
- process webhooks
- request refund through internal or admin-facing flows

Representative examples:

- `POST /api/v1/payments/intents`
- `POST /api/v1/payments/confirm`
- `GET /api/v1/payments/{id}`
- `POST /api/v1/payments/webhooks/stripe`

Depending on final checkout design, some of these may be invoked internally by orders rather than exposed broadly as public client endpoints.

## Migration Guidance from Legacy Backend

### Keep as input

- the need for explicit payment status tracking
- the current Stripe integration requirement
- webhook verification as a concept
- processor reference storage as a requirement

### Redesign before adoption

- storing processor fields directly on orders as the main payment model
- payment confirmation flow
- payment creation based on client-submitted totals
- webhook-to-order update coupling
- request handlers that combine payment orchestration and order creation

### Discard

- trusting `user_id` and `restaurant_id` from clients as financial source-of-truth context
- embedding Stripe orchestration directly in catch-all controller code
- using payment confirmation endpoints to directly create orders without a stronger transactional boundary

## Dependencies

Payments depends on:

- `orders` for payable transaction context
- `identity` for actor identity and access control
- infrastructure adapters for Stripe and future providers
- `notifications` for payment-related customer or operational events

Payments should not become the owner of checkout, merchant availability, or rider execution behavior.

## What This Doc Does Not Yet Lock In

This document intentionally does not finalize:

- whether payment records and payment attempts are separate tables on day one
- whether capture is immediate or authorization-first for future methods
- whether partial refunds are needed at launch
- whether additional local payment methods beyond Stripe and COD are in scope yet
- how finance reporting will be modeled long term

These questions should be documented later once the product and operations requirements are clearer.

## Recommendation

Payments should be implemented soon after orders because the legacy backend’s Stripe flow is one of the clearest examples of why clean module boundaries matter.

If payments is designed well:

- orders remains the owner of the transaction
- payment processors remain replaceable infrastructure
- webhook handling becomes safe and auditable
- customer and merchant payment state can be exposed without leaking processor complexity

If payments is not designed well, the new backend will recreate the same coupling currently visible in the legacy `core/views.py` flow.
