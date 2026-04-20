# Dispatch Module

## Purpose

The dispatch module defines how `pagana-api` handles:

- rider availability and working state
- dispatch eligibility
- rider candidate selection
- offer and assignment lifecycle
- reassignment and fallback behavior
- live delivery execution state
- rider location updates relevant to active jobs
- operational dispatch overrides

This module is responsible for getting an order from "ready to be delivered" to "actively handled by a rider" through an automated marketplace-style dispatch flow.

This document describes the target-state direction for dispatch based on the current system context, the migration analysis, and the agreed decision to move away from the legacy manual rider-picks-order model.

## Key Product Direction

The legacy dispatch model should **not** be carried forward as the target behavior.

The old system is centered on:

- riders marking themselves available
- riders viewing a shared pool of available orders
- riders manually accepting from that pool
- riders manually driving order state by direct endpoint calls

That is a prototype workflow, not the target platform behavior.

The target dispatch model for Pagana should instead be:

- automated
- system-assigned
- policy-driven
- sequential-offer based by default
- designed for later evolution if more advanced dispatch behavior is needed

## Dispatch Model Decision

### Primary assignment model

Dispatch uses **exclusive sequential offers** by default.

Flow:

1. An order becomes dispatchable.
2. The system ranks eligible rider candidates.
3. The top rider receives an exclusive offer for a short time window.
4. If the rider rejects or times out, the offer moves to the next rider.
5. The process continues through the configured candidate window.

### Fallback rule

If the current candidate window is exhausted, the system should **not** force-assign the next rider by default.

Instead, fallback strategies should include:

- expanding the candidate pool
- increasing search radius or relaxed ranking criteria
- retrying sequential offers
- optionally moving to a later broadcast-style strategy if ever adopted
- escalating to operations or manual dispatch

### Explicit non-goal

Forced rider assignment after multiple rejections is not the default design.

That creates weak commitment, unreliable rider execution, and misleading assignment state.

## Why Dispatch Exists as a Separate Module

The legacy backend spreads dispatch-like behavior across:

- `rider` for rider availability, available order listing, manual acceptance, and delivery status updates
- `delivery` for rider location handling
- `orders` for SSE and WebSocket rider updates
- `restaurant` and `orders` for operational status changes that affect rider flow

That fragmentation makes it difficult to answer core questions such as:

- when is an order dispatchable?
- who should receive the next offer?
- what happens on timeout?
- who owns rider assignment?
- how is reassignment handled?

Dispatch needs to become its own module so those decisions are explicit and centralized.

## Responsibilities

The dispatch module should own:

- rider dispatch state
- rider candidate ranking inputs relevant to dispatch
- dispatch offer lifecycle
- rider acceptance and rejection handling
- assignment lifecycle
- reassignment policy
- active delivery execution state from the rider side
- rider live location handling for assigned work
- dispatch operational overrides

It should not own:

- commercial order creation
- checkout and cart logic
- payment processor behavior
- merchant catalog and pricing
- user identity lifecycle

Those belong to `orders`, `payments`, `catalog`, and `identity`.

## Module Boundaries

### Dispatch Owns

- rider dispatch readiness state
- assignment and offer records
- dispatch decisioning logic
- assignment expiry or timeout behavior
- active delivery execution workflow
- location data used for live operations
- dispatch event visibility for ops

### Dispatch References But Does Not Own

- orders from `orders`
- riders and authentication context from `identity`
- merchant readiness signals from `orders` or `merchants`
- notifications from `notifications`

Dispatch should know enough about orders to assign and track them, but it should not become the owner of the underlying commercial transaction.

## Core Design Principles

### 1. Dispatch is automated by default

The system should decide who to offer an order to, rather than relying on riders to browse a shared order board as the primary mechanism.

### 2. Assignment is acceptance-based

A rider should normally be considered assigned only after they accept an offer or after a clearly defined operational exception path is used.

### 3. Rejection is part of the normal lifecycle

Dispatch must treat reject, timeout, and no-response as expected events, not edge cases.

### 4. Dispatch state is separate from commercial order state

Orders own the business transaction.
Dispatch owns assignment and rider execution behavior.

The two modules interact, but neither should collapse into the other.

### 5. Real-time behavior must be infrastructure-backed

The legacy in-memory and loosely coordinated notification pattern is not suitable for a scalable dispatch system. Dispatch should assume proper real-time infrastructure and persistent state coordination.

## When an Order Becomes Dispatchable

Dispatch should not attempt assignment for every order immediately on creation.

An order becomes dispatchable only when its policy conditions are satisfied.

Examples of dispatch prerequisites:

- order exists and is valid
- payment state allows fulfillment
- merchant-side preparation state is appropriate for dispatch policy
- delivery address is complete enough
- the order is not already assigned, cancelled, or otherwise terminal

The exact trigger point can vary by product policy:

- some systems dispatch only when the merchant is near ready
- some systems dispatch earlier based on predicted prep timing

This should be a deliberate policy, not an accidental side effect of which endpoint was called first.

## Rider State Model

The legacy backend currently uses a simple `is_available` flag. That is not enough for a modern dispatch system.

Dispatch should define a richer rider dispatch state model, for example:

- `offline`
- `available`
- `offered`
- `assigned`
- `busy`
- `paused`

Optional later states may include:

- `suspended`
- `shadowed`
- `ops_locked`

The point is not the exact labels. The point is that dispatch needs rider states that explain whether a rider can receive a new offer right now.

## Candidate Selection

Dispatch needs a candidate selection policy, even if the first version is simple.

Reasonable ranking inputs may include:

- rider availability
- distance to merchant
- distance to customer
- rider current assignment load
- expected merchant prep timing
- service zone eligibility
- recent offer rejection or timeout behavior

The first version does not need to be overly complex, but the ranking logic should be modular enough to evolve.

## Offer Lifecycle

Exclusive sequential offer requires an explicit offer lifecycle.

Recommended offer states:

- `created`
- `sent`
- `accepted`
- `rejected`
- `expired`
- `cancelled`

Recommended offer behavior:

- one active exclusive offer at a time per order
- short timeout window per rider
- automatic expiry on no response
- immediate handoff to next candidate when rejection or expiry occurs

This should be stored as a first-class record, not inferred from transient client behavior.

## Assignment Lifecycle

Once a rider accepts, the system creates an assignment state for that order.

Recommended assignment states:

- `pending_acceptance`
- `assigned`
- `pickup_in_progress`
- `picked_up`
- `dropoff_in_progress`
- `completed`
- `cancelled`
- `reassigned`

The exact naming can change later, but the assignment lifecycle should stay distinct from:

- payment state
- merchant preparation state
- raw order commercial state

## Reassignment and Fallback

Reassignment is a core dispatch function, not an exception.

### Sequential fallback

Default fallback after rejection or timeout:

- move to next ranked rider

### Candidate window exhaustion

If the configured initial candidate window is exhausted:

- do not force-assign the next rider by default
- expand candidate search
- retry sequential offers under the broader search
- escalate to ops if the order cannot be placed reliably

### Operational fallback

Ops should be able to:

- manually inspect stuck dispatches
- requeue an order
- force an offer or assignment in exceptional cases
- mark a rider temporarily unavailable from dispatch

Forced assignment should exist only as an explicit operational exception, not as the normal automatic fallback.

## Relationship to Orders

The dispatch module depends on orders, but the boundary must remain clear.

### Orders owns

- the commercial transaction
- committed items and totals
- customer and merchant linkage
- fulfillment state at the business level

### Dispatch owns

- who is being offered the job
- who is assigned
- whether assignment timed out
- whether reassignment is required
- rider-side execution status
- rider live operational context

Dispatch may cause order state transitions, but orders remains the source of truth for the commercial order itself.

## Relationship to Identity

Dispatch relies on identity for:

- authenticated rider context
- rider role authorization
- ownership checks for rider actions

Dispatch should not redefine rider identity rules locally.

However, dispatch will likely need rider-specific operational profile data beyond identity, such as:

- vehicle type
- current dispatch status
- current location
- active assignment count

Those should live in dispatch-adjacent or rider-operational models, not in the identity core.

## Relationship to Merchant Operations

The legacy backend uses merchant-side acceptance and preparation status as part of the dispatch path.

For the new system:

- merchant operational readiness may still influence when dispatch begins
- merchant actions should not define the dispatch strategy itself

This means dispatch can depend on signals like:

- order accepted by merchant
- merchant marked order preparing
- merchant marked order ready

But dispatch policy remains system-owned, not merchant-owned.

## Relationship to Live Location

The legacy backend updates rider location and exposes it directly, but the new dispatch module should treat location as operational state with access controls and purpose-specific use.

Dispatch should own or coordinate:

- rider location updates relevant to active assignments
- customer-visible tracking for assigned orders
- ops-visible location context for incident handling

Location should not be an open generic resource.

## Real-Time Requirements

The legacy backend uses in-memory rider connection tracking plus SSE and WebSocket notifications around available order counts.

That approach should not be copied as the target design.

The dispatch module should assume:

- infrastructure-backed real-time messaging
- persistent assignment and offer state
- support for rider-facing offer notifications
- support for customer-facing tracking updates
- support for ops visibility on stuck or delayed assignments

The first version does not need maximum sophistication, but it must not rely on in-memory coordination as the system of record.

## Recommended API Surface

The exact endpoint design can evolve, but the dispatch module will likely need endpoints in these categories:

- update rider dispatch availability
- receive current rider assignment state
- accept or reject offer
- get current active assignment
- update rider execution progress
- update rider location for active job
- operational dispatch controls for admin or ops users

Representative examples:

- `POST /api/v1/rider/availability`
- `GET /api/v1/rider/offers/current`
- `POST /api/v1/rider/offers/{id}/accept`
- `POST /api/v1/rider/offers/{id}/reject`
- `GET /api/v1/rider/assignments/current`
- `POST /api/v1/rider/assignments/{id}/events`
- `POST /api/v1/rider/location`
- `POST /api/v1/ops/dispatch/{order_id}/requeue`

These are examples of shape, not final contracts.

## Suggested Entities

The exact schema can still evolve, but dispatch likely needs explicit records for:

- `RiderDispatchState`
- `DispatchOffer`
- `DispatchAssignment`
- optional `DispatchEvent`
- `RiderLocation`

Possible rider-operational metrics can be added later, but the first version should at least make offers and assignments explicit records.

## Security Requirements

Dispatch is operationally sensitive and must launch with strict protections.

Required principles:

- only authenticated riders can act on rider offers and assignments
- riders can only access offers or assignments belonging to them
- location visibility must be purpose-limited
- no open available-order browsing as the primary assignment model
- assignment and reassignment actions must be auditable
- ops overrides must be explicit and permission-controlled

## Migration Guidance from Legacy Backend

### Keep as input

- rider availability as a real concept
- rider location updates as an operational requirement
- assignment and delivery execution status as necessary capabilities
- real-time rider notification requirement

### Redesign before adoption

- rider availability model
- assignment lifecycle
- status transition ownership
- real-time delivery of dispatch events
- how customer tracking consumes rider location

### Discard

- rider browsing a shared order pool as the primary dispatch model
- manual self-selection of any unassigned order as the core assignment flow
- in-memory coordination for rider notifications
- force assignment after multiple rejections as the default fallback

## Dependencies

Dispatch depends on:

- `identity` for rider authentication and permission checks
- `orders` for dispatchable order context and order-level fulfillment linkage
- `notifications` for rider offer delivery and operational messaging
- infrastructure for real-time transport and background job execution

Dispatch should not become the owner of order creation, checkout, or payment processing.

## What This Doc Does Not Yet Lock In

This document intentionally does not finalize:

- the exact ranking algorithm
- batching or stacked deliveries
- zone-based dispatch optimization
- whether limited broadcast will be introduced later
- exact rider ETA prediction strategy
- the final operational dashboard experience

Those should be documented later when the dispatch product and ops model become more detailed.

## Recommendation

Dispatch should be implemented as an automated system-assignment module, not as a cleaned-up version of the legacy rider-picks-order flow.

For the current direction, the best target is:

- exclusive sequential offer by default
- no force assignment as standard fallback
- candidate expansion and ops escalation after failed offer windows
- explicit separation between dispatch state and commercial order state

If dispatch is designed this way, the backend will move toward an industry-standard delivery marketplace model instead of reproducing the legacy prototype behavior under new endpoints.
