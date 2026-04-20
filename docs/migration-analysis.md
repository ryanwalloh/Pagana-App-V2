# Pagana Legacy Backend Migration Analysis

## Purpose

This document records the backend-focused analysis of the legacy application in `To-Refactor/Pagana-App` and explains how that analysis should influence the migration into `pagana-api`.

It is a reference document, not a target architecture spec. Its job is to answer:

- what backend logic exists today
- how the current backend is structured
- what can be reused, partially reused, or discarded
- what risks and technical debt must be addressed during migration
- what extraction strategy is realistic for `pagana-api`

This document should be read together with `docs/system-context.md`.

## Scope

This analysis covers backend concerns only:

- Django project structure
- routes and API surfaces
- controllers and views
- models and serializers
- authentication and authorization
- data ownership and persistence
- payments, notifications, and real-time behavior
- backend scalability and security implications

It does not attempt to review frontend UI quality, styling, or client experience.

## Source System

The legacy source system is `To-Refactor/Pagana-App`.

It is a Django monolith under the `soti_delivery` project and currently acts as a mixed backend-plus-server-rendered application rather than a clean API platform.

## Executive Summary

The legacy backend should not be migrated into `pagana-api` by copying apps or moving controller files over directly.

The system contains usable business knowledge and domain concepts, but the backend delivery layer is structurally unsuitable as a startup-grade central API because it is:

- tightly coupled
- inconsistent in auth patterns
- unsafe in its default API exposure
- mixed across HTML, JSON, DRF, SSE, and WebSockets
- weakly separated by responsibility

The safest migration approach is:

- keep the domain knowledge
- keep only selected model ideas and workflows as input
- redesign the API and application boundaries inside `pagana-api`
- treat the legacy implementation as a source of requirements rather than a baseline implementation

## Current Backend Analysis

### High-Level Structure

The backend is spread across multiple Django apps:

- `users`
- `core`
- `customer`
- `restaurant`
- `rider`
- `menu`
- `orders`
- `delivery`
- `demo`

At a glance this looks modular, but the structure is misleading. The actual business logic is not cleanly divided by module. Instead, it is heavily concentrated in a few large view files, especially `core/views.py`.

### Main Backend Patterns

The legacy backend mixes several patterns in the same system:

- server-rendered HTML views
- JSON endpoints for mobile usage
- DRF `ModelViewSet` CRUD endpoints
- session-driven authentication flows
- magic-link login flow
- Stripe payment endpoints
- WebSocket updates through Channels
- SSE streaming for rider order updates

This creates a backend that is neither a clean web backend nor a clean API backend. It serves multiple interaction styles without a coherent boundary strategy.

### Route Surface

The route surface is fragmented across root router configuration and per-app route files.

#### DRF router endpoints

`soti_delivery/urls.py` exposes:

- `/api/users/`
- `/api/products/`
- `/api/orders/`
- `/api/order-lines/`
- `/api/rider-locations/`

#### Ad hoc JSON and mobile-oriented endpoints

`core/urls.py` exposes operational endpoints such as:

- `loginByPassword/`
- `registerAccount/`
- `getRestaurants/`
- `getRestaurantProducts/<id>/`
- `addToCart/`
- `removeFromCart/`
- `getUserAddress/`
- `saveAddress/`
- `updatePersonalDetails/`
- `placeOrder/`
- `getOrderStatus/<id>/`
- `getCustomerOrders/`
- `search/`
- Stripe endpoints under `api/stripe/...`

#### App-specific endpoints

Additional app routes exist for:

- rider operations
- delivery location updates
- order transition actions
- verification flow
- customer and restaurant HTML/session pages

### Core Structural Finding

The backend is not API-first. It is a mixed monolith where:

- transport concerns are mixed with business logic
- API and HTML concerns are mixed in the same apps
- role-specific flows are handled inconsistently
- the same domain is exposed through multiple route styles

The most important example is `core/views.py`, which acts as a catch-all backend controller for auth, registration, restaurants, cart, customer profile updates, address handling, orders, search, and Stripe.

### Auth and Identity Model

The system uses a custom `users.User` model with:

- role
- phone number
- phone verification status

Role values currently include:

- customer
- restaurant
- rider
- admin
- demo

This is a valid domain starting point, but the authentication model around it is inconsistent.

The backend currently mixes:

- session-based web auth
- magic-link login
- verification-based onboarding
- mobile/API flows that rely on client-supplied `user_id`

No proper API-first token or JWT strategy was found in the legacy backend.

### Data and Domain Shape

The system captures the expected food-delivery-style entities:

- users
- customers
- restaurants
- riders
- products
- cart items
- orders
- order lines
- rider locations
- SMS or verification records
- magic links

This means the system contains useful business concepts. However, the schema choices are inconsistent:

- `Order` uses `User` foreign keys for customer, restaurant, and rider
- `Product` points to `Restaurant`
- `Address` is one-to-one with user, limiting customers to a single address
- phone and identity data are duplicated across profile tables
- some fields appear to be implementation shortcuts rather than durable domain modeling

### Real-Time and Integration Layer

The backend includes:

- Stripe integration
- Channels-based WebSockets
- SSE for rider order updates
- Cloudinary media handling
- email-based verification flow
- some mapping or geocoding behavior

The problem is not that these integrations exist. The problem is that they are embedded directly into controllers and weakly isolated from the rest of the application.

## Reusability Assessment

### Reusable As-Is

Very little should be reused as-is.

The following categories are not safe to reuse directly:

- DRF viewsets
- request handlers in `core/views.py`
- rider operational endpoints
- current cart and order JSON endpoints
- current serializer definitions using unrestricted fields
- current real-time delivery mechanism
- current payment endpoint implementation

These parts reflect transport and security decisions that are not acceptable for the target backend.

### Reusable With Significant Modification

These are useful as source material, but not as direct implementation:

#### Domain concepts

- user roles
- customer, restaurant, and rider profiles
- products and restaurant catalog
- order and order-line concepts
- rider availability and rider location
- payment status and order status fields
- verification and magic-link concepts

#### Business rules

- restaurant approval as a concept
- rider availability state
- order lifecycle state machine
- order assignment and fulfillment flow
- payment intent and webhook concepts

#### Data model direction

Some tables and fields can guide the new design, but should be redesigned before adoption. They are useful for understanding the business, not for defining the final schema.

### Rewrite

The following areas should be rebuilt in `pagana-api` rather than extracted:

- authentication and authorization
- API contracts
- request and serializer layer
- payment orchestration
- order orchestration
- rider assignment and live tracking APIs
- notification and real-time delivery mechanisms
- controller layout and application/service boundaries

## Risks and Technical Debt

### Critical Risks

#### Broken authorization pattern

Many mobile-oriented endpoints trust `user_id` from the request payload instead of deriving identity from authenticated context.

Impact:

- users may be able to read or mutate another user's resources
- cart, address, and order actions are not safely bound to ownership
- the current API shape is not suitable for a shared backend used by multiple clients

#### Unsafe DRF defaults

The legacy backend sets DRF default permissions to `AllowAny`.

Impact:

- core resources may be exposed without proper authorization
- route-level protection cannot be assumed
- the router-based API surface is not production-safe

#### Broad CSRF exemptions

Many endpoints are marked `@csrf_exempt`, including sensitive operational endpoints.

Impact:

- unsafe browser interaction model
- poor security posture
- higher chance of inconsistent protection across surfaces

#### Weak secrets and integration handling

The system shows signs of environment inconsistency and weak secret hygiene.

Impact:

- operational fragility
- hard-to-audit integration behavior
- increased security exposure during scale-up

### High-Risk Technical Debt

#### Monolithic controller concentration

`core/views.py` is carrying too many responsibilities.

Impact:

- difficult to test
- difficult to reason about
- difficult to migrate incrementally
- every new change increases coupling

#### No API-first auth model

The backend does not present a clean authentication story for first-party web, admin, and mobile clients.

Impact:

- inconsistent client integration
- high migration cost if legacy assumptions are preserved
- permission logic remains fragile

#### Mixed transport styles

HTML views, JSON endpoints, DRF CRUD, SSE, and WebSockets all coexist without a clear contract boundary.

Impact:

- hard to version
- hard to document
- hard to secure consistently
- hard to decompose into clear backend modules

#### Weak serializer discipline

Some serializers expose `fields = '__all__'`, including `users/serializers.py`.

Impact:

- accidental overexposure of internal fields
- weak API contracts
- poor control over backward compatibility

#### Real-time implementation does not scale cleanly

The current real-time approach uses in-memory and long-lived request patterns, including SSE loops.

Impact:

- poor horizontal scalability
- worker exhaustion risk
- behavior may break across multiple instances

### Moderate Risks

- very limited automated test coverage
- broad `except` blocks and `print()` debugging
- inconsistent validation patterns
- mixed data ownership conventions
- operational logic directly embedded in request handlers

## Architectural Implications for `pagana-api`

This analysis supports the architectural direction defined in `docs/system-context.md`.

The legacy backend confirms that `pagana-api` must be:

- API-first
- modular
- strongly authenticated and authorized
- explicit in contracts and permissions
- separated from server-rendered client logic

It also reinforces that the preferred target should be a modular monolith rather than a direct legacy port. The main challenge is not service count. The main challenge is boundary clarity, secure defaults, and disciplined domain ownership.

## Recommended Extraction Strategy

### Migration Principle

Do not migrate by moving Django apps from the legacy project into `pagana-api`.

Instead:

- extract business concepts
- extract workflows and rules
- extract useful data relationships
- redesign delivery and application layers around clean boundaries

### Practical Strategy

#### 1. Treat the legacy backend as a source of requirements

Use it to understand:

- user roles
- ordering workflow
- rider workflow
- restaurant workflow
- payment behavior
- address and profile expectations

#### 2. Separate source knowledge from source code

Not all existing code has future value. The main reusable artifact is understanding, not implementation.

#### 3. Rebuild target modules intentionally

`pagana-api` should be designed around target modules and use cases rather than legacy app names alone.

#### 4. Delay uncertain target docs

Module docs should only be written where enough data exists to define responsibilities and boundaries with confidence.

This avoids documenting speculative architecture as if it were already decided.

## Keep / Modify / Discard Summary

### Keep as reference

- role vocabulary
- order lifecycle concepts
- restaurant, rider, and customer domain terminology
- payment and fulfillment flow requirements
- current data relationships as migration input

### Modify heavily before reuse

- model boundaries
- route design
- serializer design
- verification flows
- payment flows
- real-time updates
- rider operations

### Discard as implementation baseline

- open DRF CRUD exposure
- client-supplied identity patterns
- monolithic catch-all view logic
- mixed HTML and API backend approach
- in-memory real-time coordination

## What This Document Does Not Yet Define

This document intentionally does not define:

- endpoint-by-endpoint migration mapping
- final module ownership boundaries
- exact database target schema
- target authentication protocol details
- module internals for orders, identity, dispatch, or payments

Those should be documented only when the next stage of design work produces enough confidence to write them cleanly.

## Conclusion

The legacy backend is valuable, but mostly as a map of the business rather than a base for direct reuse.

Its domain concepts are useful.
Its implementation patterns are not.

The correct migration mindset is:

- preserve the business understanding
- redesign the backend architecture
- move into `pagana-api` through controlled module design
- avoid carrying legacy security, coupling, and transport mistakes into the new platform
