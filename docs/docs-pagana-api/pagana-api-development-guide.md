# Pagana API Development Guide

## Purpose

This document explains how `pagana-api` should be understood and extended during actual product development.

It is meant to serve as a practical development guide rather than a migration-status document.

It focuses on:

- what `pagana-api` is responsible for
- the core patterns that should continue to shape new backend work
- the main use cases it already supports
- the prerequisites for local development and extension
- the kinds of additions that should happen as real client flows are built out

## What `pagana-api` Is

`pagana-api` is the central backend for the Pagana platform.

It is intended to serve:

- customer-facing clients
- merchant-facing clients
- rider-facing clients
- admin and operations tooling

It should be treated as:

- the system of record for backend business logic
- the main owner of authentication and authorization
- the owner of shared platform workflows
- the backend contract consumed by first-party client applications

It should not be treated as:

- a server-rendered app
- a place for transport-specific shortcuts
- a direct continuation of the legacy monolith

## Current Module Shape

The current backend is organized around explicit module ownership.

Current major modules:

- `identity`
- `customers`
- `merchants`
- `catalog`
- `orders`
- `payments`
- `dispatch`
- `ops`

Working interpretation:

- `identity` owns users, login, tokens, and core role state
- `customers` owns customer profile data
- `merchants` owns merchant business state and membership
- `catalog` owns merchant products and orderability
- `orders` owns cart, checkout, orders, and customer-facing order history
- `payments` owns payment attempts, provider interaction, and webhook state
- `dispatch` owns rider operations, offers, assignments, and rider location
- `ops` owns auditability and sensitive admin or operations overrides

## Core Development Patterns

New backend work should keep following the same patterns already established in `pagana-api`.

### 1. Module-Owned Responsibilities

A feature should be placed where its long-term ownership belongs.

Examples:

- do not put cart logic in `catalog`
- do not put merchant profile logic in `identity`
- do not put Stripe orchestration in `orders`
- do not put dispatch policy in generic views

When unsure, ask:

- who owns this business concept?
- who should still own it one year from now?

### 2. Authenticated Actor as Source of Truth

Protected behavior must derive the acting user from the authenticated request.

Do not design new APIs that rely on:

- raw client-submitted `user_id`
- raw client-submitted merchant identity
- raw client-submitted rider identity

The API should determine who is acting from auth context and object ownership checks.

### 3. Explicit Endpoints Over Broad CRUD

The backend should keep using purpose-built APIs rather than exposing unrestricted CRUD for important models.

Good examples:

- `checkout/prepare`
- `checkout/confirm`
- merchant order transition endpoints
- rider offer accept or reject endpoints
- payment intent creation endpoint
- ops override endpoints

This pattern is important because it preserves state validation and business invariants.

### 4. Service-Led Workflow Logic

Complex workflows should live in reusable service functions, not only inside request handlers.

This makes it easier to:

- test workflows
- reuse them from ops or admin surfaces
- keep views thin
- preserve transaction boundaries

Examples already present in the codebase:

- checkout flow
- payment intent flow
- webhook application
- dispatch triggering
- dispatch offer progression
- admin or ops overrides

### 5. Explicit State Machines

New flows should continue using explicit state transitions.

The backend already models:

- order fulfillment state
- payment state
- dispatch assignment state
- dispatch offer state
- merchant readiness state

When adding new behavior, prefer:

- controlled transitions
- validation against current state
- clear actor-specific rules

Avoid:

- arbitrary status writes
- loosely structured string changes
- hidden state mutations in unrelated controllers

### 6. Historical Snapshots for Transactions

If a live resource can change over time, committed transactions should usually snapshot what mattered at the moment of commitment.

This is already true for orders and should remain a guiding rule for:

- order items
- payment context
- fulfillment history
- support investigation data

### 7. Separate Customer History From Internal Audit

Use customer-facing event history and internal audit for different purposes.

Current pattern:

- `OrderTimelineEvent`: order-facing/support-facing lifecycle history
- `AuditLog`: internal traceability for sensitive actions

Future work should preserve this distinction.

## Main Use Cases Already Supported

The backend already supports the following broad use cases.

### Identity and Access

- signup
- login
- token refresh
- authenticated `me` lookup
- role-based access control

### Customer Commerce

- browse merchant catalog
- manage cart
- prepare checkout
- confirm checkout
- list and inspect orders
- track order progress

### Merchant Operations

- manage merchant profile and status
- manage merchant products
- view merchant orders
- move orders through merchant operational transitions

### Payments

- create Stripe payment intents for eligible card orders
- persist payment attempts
- ingest Stripe webhooks
- expose order-linked payment summary state

### Rider Operations

- receive dispatch offers
- accept or reject offers
- view assignments
- update rider location
- progress active delivery states

### Ops and Hardening

- structured audit logging
- internal override actions for selected operational cases
- admin inspection of sensitive entities

## Development Prerequisites

The backend can be developed locally with a relatively small setup, but some pieces matter more once actual client features start using the system.

### Minimum Local Setup

- Python 3.10+ or a compatible local version
- virtual environment
- `pip install -r pagana-api/requirements.txt`
- Django migrations applied
- superuser for Django admin when needed

### Recommended Runtime Dependencies

- PostgreSQL for realistic development beyond basic local prototyping
- Redis for Celery broker and result backend
- Stripe test credentials for card payment flows
- mail backend configuration for async email testing

### Important Environment Variables

At minimum, real development should think about:

- `SECRET_KEY`
- `DEBUG`
- `DATABASE_URL`
- `DEFAULT_FROM_EMAIL`
- `EMAIL_BACKEND`
- `CELERY_BROKER_URL`
- `CELERY_RESULT_BACKEND`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CURRENCY`

### Operational Prerequisites

Some flows depend on more than just `runserver`.

Examples:

- Celery worker for async email and future background tasks
- Celery beat if scheduled tasks become active
- Stripe webhook forwarding during payment work
- representative test data for customer, merchant, rider, and admin roles

## How To Extend `pagana-api` Safely

When adding a new feature, use this rough checklist:

1. Decide the owning module first.
2. Decide which actor is allowed to perform the action.
3. Define or reuse the relevant state model.
4. Put multi-step business logic into a service function.
5. Keep the API explicit and purpose-built.
6. Add timeline and audit behavior if the action is operationally meaningful.
7. Add tests for authorization, state validity, and edge cases.

If a feature seems to belong equally to multiple modules, that usually means:

- the boundary is still unclear
- or the feature should be split into module-specific responsibilities

## What Gets Added During Real App Development

The matrix foundation is complete, but actual product development will still add important behavior. That is expected.

What changes now is not the architecture baseline, but the level of product detail.

### Example: When Building the Delivery Flow UI

When the customer and rider delivery flow becomes a real UI, backend additions will likely include:

- richer delivery tracking payloads
- rider ETA or delivery estimate logic
- delivery-proof handling
- more refined rider assignment visibility rules
- dispatch polling optimization or eventual real-time transport

Possible additions might look like:

```python
def estimate_delivery_eta(order, assignment, rider_location):
    # Future example: replace placeholder tracking with a real ETA strategy
    # based on merchant readiness, rider assignment, and active location.
    pass
```

Or a future projection model:

```python
class DeliveryTrackingSnapshot(BaseModel):
    order = models.OneToOneField("orders.Order", on_delete=models.CASCADE)
    rider_display_name = models.CharField(max_length=255, blank=True)
    estimated_arrival_at = models.DateTimeField(null=True, blank=True)
    customer_visible_status = models.CharField(max_length=64)
```

These would be product-depth additions on top of the existing `orders` and `dispatch` foundation, not replacements for it.

### Example: When Building the Merchant Kitchen or Ops UI

Likely future additions:

- queue filtering
- preparation-time estimation
- rejection reasons
- kitchen throughput metrics
- merchant-side operational notes

Possible future service example:

```python
def update_preparation_estimate(order, estimated_ready_at, actor):
    # Future example: support kitchen-facing preparation timing.
    pass
```

### Example: When Building the Rider App More Deeply

Likely future additions:

- rider online or offline state history
- offer expiration timestamps
- richer assignment filtering
- delivery proof upload
- rider incident reporting

Possible future model example:

```python
class DeliveryProof(BaseModel):
    order = models.ForeignKey("orders.Order", on_delete=models.CASCADE)
    rider = models.ForeignKey("dispatch.RiderProfile", on_delete=models.CASCADE)
    image_url = models.URLField()
    note = models.TextField(blank=True)
```

### Example: When Building Stronger Finance and Support Workflows

Likely future additions:

- refunds
- payment reconciliation
- support investigation views
- operational dashboards
- merchant settlement or payout views

Possible future service example:

```python
def reconcile_payment_attempt(payment_attempt):
    # Future example: compare internal payment state with provider truth
    # and generate support or finance follow-up signals.
    pass
```

## What Should Not Be Reintroduced

As real feature work continues, avoid falling back into the old patterns the migration removed.

Do not reintroduce:

- generic unsafe CRUD for sensitive resources
- payment logic directly inside generic order views
- dispatch logic that depends on riders browsing an open order pool
- merchant profile logic that absorbs order operations
- client-trusted totals or identities
- mixed frontend-plus-backend assumptions in the API layer

## Recommended Documentation Relationship

Use the docs with this separation:

- `system-context.md`: stable backend role in the broader platform
- `migration-analysis.md`: legacy findings and lessons
- `backend-migration-matrix.md`: migration execution map
- `pagana-api-progress.md`: implementation success and current state
- `pagana-api-development-guide.md`: how to keep building the new backend correctly
- module docs under `docs/modules/`: target-state boundaries for each major area

## Working Conclusion

`pagana-api` is now in the right architectural shape for product development.

Future development should mainly add:

- product depth
- operational depth
- infrastructure depth
- reporting depth

It should not require a return to legacy backend patterns or a rethinking of the core module boundaries unless product strategy changes materially.
