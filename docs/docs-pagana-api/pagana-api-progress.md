# Pagana API Progress

## Purpose

This document records the current implementation status of `pagana-api` after executing the backend migration matrix.

It is meant to answer four questions clearly:

- what has been built
- why the migration can be considered successful at the foundation level
- what code patterns now define the new backend
- what has improved compared with the legacy backend

## Current Status

`pagana-api` is no longer a placeholder architecture shell.

The backend migration matrix has been implemented through its core phases, and `pagana-api` now functions as the active backend foundation for the refactor.

At this stage, the correct working assumption is:

- `pagana-api` is the backend source of truth
- the legacy backend is no longer needed as an implementation reference
- legacy code should only be consulted for historical business behavior or edge-case research

## Migration Outcome

The migration should be considered successful in the following sense:

- the legacy backend was not copied forward directly
- the target backend was rebuilt around explicit module boundaries
- the main platform flows now exist in `pagana-api`
- the trust model has been replaced with authenticated actor-derived behavior
- payment, dispatch, and merchant operations are separated from the legacy monolithic controller style

This does not mean backend work is permanently finished.

It means the migration objective of establishing a clean target backend foundation has been achieved.

## Implementation Progress

### Phase 1: Security and Ownership Foundations

Implemented:

- custom identity model with role-based access
- JWT-based authentication flows
- customer ownership separated from identity
- merchant ownership separated from identity
- safer defaults around route protection, explicit serializers, and actor-derived access

Main result:

`pagana-api` no longer depends on the legacy pattern of trusting client-supplied identity.

### Phase 2: Commercial Surfaces

Implemented:

- merchant-owned catalog
- customer cart
- checkout preparation
- backend-derived order creation
- customer order listing and tracking

Main result:

catalog, cart, checkout, and order history now live under clean target ownership instead of being split across unrelated legacy app areas.

### Phase 3: Financial Surfaces

Implemented:

- payment attempt records
- Stripe payment intent flow
- Stripe webhook ingestion
- explicit order-payment linkage
- customer-facing payment summary behavior

Main result:

payments are now modeled as a separate financial concern rather than being embedded directly into order controller logic.

### Phase 4: Fulfillment and Marketplace Operations

Implemented:

- merchant operational order transitions
- dispatch assignments and offers
- rider profile and rider location
- rider acceptance and execution flows
- customer tracking updated to reflect fulfillment progress

Main result:

the backend no longer relies on the legacy manual rider self-selection model as the primary dispatch strategy.

### Phase 5: Ops and Hardening

Implemented:

- structured audit logging
- internal admin or ops override APIs
- stronger Django admin inspection support

Main result:

the backend is now more supportable operationally and can explain sensitive internal actions through explicit audit records.

## Core Code Patterns in `pagana-api`

The new backend now follows several repeatable implementation patterns.

### 1. Module-Owned Responsibilities

Each major concern has a clear module owner:

- `identity`
- `merchants`
- `catalog`
- `orders`
- `payments`
- `dispatch`
- `ops`

This is the main architectural correction from the legacy backend.

### 2. Authenticated Actor as Source of Truth

Protected actions derive identity from the authenticated request context.

The new backend avoids:

- trusting raw `user_id`
- open CRUD for sensitive resources
- role inference from frontend behavior

### 3. Explicit APIs Instead of Broad CRUD

The backend favors purpose-built endpoints over generic `ModelViewSet` exposure.

Examples of this pattern include:

- checkout preparation vs direct order creation
- merchant order transitions vs unrestricted order mutation
- rider offer acceptance vs generic assignment editing
- payment intent creation vs raw payment field writes

### 4. Service-Led Workflow Logic

Critical business workflows are implemented in service-style functions rather than being buried entirely inside request handlers.

Important examples:

- checkout and order creation
- payment intent orchestration
- webhook application
- dispatch triggering and offer progression
- admin or ops override behavior

### 5. Explicit State Models

The new backend uses named states for:

- order fulfillment
- payment lifecycle
- dispatch assignment
- dispatch offers
- merchant readiness

This is a major improvement over loosely coupled controller-driven status behavior.

### 6. Historical Snapshots for Transactions

Committed orders snapshot product and pricing data instead of relying forever on live catalog records.

That preserves historical accuracy even when catalog entries change later.

### 7. Idempotent Financial and Workflow Handling

The new backend uses idempotent behavior where it matters most:

- checkout confirmation
- payment intent creation
- payment webhook ingestion

This reduces duplication risk and makes retries safer.

### 8. Separation Between Customer History and Internal Audit

`OrderTimelineEvent` is used for order-facing or support-relevant history.

`AuditLog` is used for internal traceability of sensitive actions.

This avoids confusing customer-visible event feeds with true internal audit records.

## Improvements Over the Legacy Backend

The new `pagana-api` improves on the legacy backend in several important ways.

### Security and Trust Model

Improvements:

- authenticated actor context replaces client-supplied identity trust
- explicit role permissions replace inconsistent access assumptions
- serializers are scoped instead of using unrestricted field exposure
- webhook verification and payment idempotency are modeled intentionally

### Architecture and Separation of Concerns

Improvements:

- modular backend ownership replaces catch-all controller logic
- payments no longer own order creation logic
- dispatch no longer depends on rider self-selection pool behavior
- merchant business state is separated from user identity
- cart no longer lives under catalog ownership

### Transaction Correctness

Improvements:

- checkout totals are backend-derived
- orders capture snapshots of purchased items
- payment attempts are first-class records
- webhook events are persisted and applied safely
- assignment and offer records are explicit instead of inferred

### Operational Support

Improvements:

- audit records exist for sensitive internal actions
- admin or ops override APIs exist for controlled interventions
- Django admin is now inspection-oriented for sensitive models
- dispatch, orders, and payments can be investigated more cleanly

### Platform Readiness

Improvements:

- one backend can now support customer, merchant, rider, and admin surfaces
- Celery-backed async delivery exists for email side effects
- the backend is structured so polling-first operations can later grow into real-time infrastructure
- the codebase is now shaped like a maintainable modular monolith instead of a transport-mixed prototype

## What Success Means Now

At the current project stage, success does not mean:

- every future feature is already implemented
- all reporting and reconciliation work is complete
- all operational tooling is finished
- production infrastructure is fully finalized

Success does mean:

- the target backend architecture exists in working code
- the core business modules are implemented in the right ownership boundaries
- legacy backend code is no longer needed as the design baseline
- future backend work can proceed on top of `pagana-api` without architectural backtracking

## Recommended Working Stance Going Forward

From this point onward:

- use `pagana-api` as the backend baseline
- use the docs in `docs/` as the architecture and migration reference
- use legacy backend code only when investigating historical behavior
- avoid using legacy implementation patterns as examples for new backend work

## Remaining Lightly Scoped Areas

The migration matrix foundation is complete, but some areas remain intentionally lighter or future-facing:

- broader reporting and reconciliation
- richer internal backoffice tooling
- real-time dispatch or tracking delivery
- deeper finance operations such as refunds and settlement reporting
- future optimizations in dispatch ranking, batching, and operations workflows

Those should now be treated as forward development on top of `pagana-api`, not as unfinished legacy migration fundamentals.
