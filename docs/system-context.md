# Pagana System Context

## Purpose

This document defines the stable system context for the Pagana refactor. It is the shared reference point for backend planning, migration analysis, and future module design.

It should stay small and durable. Legacy implementation details, migration risks, and deep module design belong in separate docs.

## System Goal

Pagana is being refactored from a legacy monolithic application into a multi-application platform with a dedicated backend API and separate client applications for each major user surface.

The target direction is an API-first system where `pagana-api` serves as the central backend for all first-party clients.

## Repository Context

The repository currently contains:

- `pagana-api`: target backend service
- `pagana-web`: customer-facing web application
- `pagana-admin`: administrative interfaces
- `pagana-mobile-customer`: customer mobile application
- `pagana-mobile-vendor`: vendor mobile application
- `pagana-mobile-rider`: rider mobile application
- `pagana-mobile`: additional mobile-related project area retained from earlier structure
- `To-Refactor/Pagana-App`: legacy application being analyzed and decomposed

The legacy backend review and migration strategy should treat `To-Refactor/Pagana-App` as the source system and `pagana-api` as the target backend.

Some client naming is still transitional across the repository. This doc treats the current directory structure as the source of truth for repository context and uses role-based terms where final product naming is still evolving.

## Target Platform Shape

The intended platform is composed of separate deployable clients that rely on one central backend:

- `pagana-api` is the system of record for business logic, authentication, authorization, and shared data access.
- `pagana-web` consumes backend APIs for customer-facing web flows.
- `pagana-admin` consumes backend APIs for operational and administrative workflows.
- `pagana-mobile-customer` consumes backend APIs for customer mobile flows.
- `pagana-mobile-vendor` consumes backend APIs for vendor mobile flows.
- `pagana-mobile-rider` consumes backend APIs for rider mobile flows.

This structure favors clear responsibility boundaries, cleaner deployments, and product growth without reintroducing legacy coupling.

## Role Surfaces

The platform currently assumes multiple role-based product surfaces:

- customer
- rider
- merchant or restaurant operator
- admin or operations staff

These roles may map to different applications, permission models, and workflows, but they should share a consistent backend identity and authorization model through `pagana-api`.

## Backend Responsibility of `pagana-api`

`pagana-api` is expected to own:

- API contracts for all first-party clients
- authentication and authorization
- business rules and workflow orchestration
- persistent domain data
- payment integration
- notification triggering
- rider, order, and customer state transitions
- internal integration boundaries for future scaling

`pagana-api` should not become a mixed UI-plus-backend monolith. It is the backend platform, not a server-rendered application layer.

## Architectural Direction

The refactor should move toward a clean, modular backend architecture with clear boundaries between transport, application logic, domain logic, and infrastructure concerns.

The current working assumption is:

- API-first design
- modular backend structure
- production-ready security defaults
- separation between client apps and backend concerns
- startup-scalable design without premature microservice complexity

At this stage, the preferred target is a modular monolith rather than a direct port of the legacy system or an early microservices split.

## Relationship to Legacy System

The legacy application in `To-Refactor/Pagana-App` is important as:

- a source of business rules
- a source of existing flows and domain vocabulary
- a source of current data model assumptions
- a source of migration constraints

It should not be assumed to represent the desired target architecture.

Legacy implementation analysis, reusability assessment, and extraction strategy should be captured separately in `migration-analysis.md`.

## Documentation Boundaries

To keep docs maintainable, use the following separation:

- `system-context.md`: stable product and architecture context
- `migration-analysis.md`: legacy backend findings, risks, and reuse decisions
- module docs such as `orders.md` or `identity.md`: target-state responsibilities, boundaries, and design details

If information is still uncertain, it should not be promoted into this doc until it becomes stable enough to serve as shared context.

## Current Working Assumptions

These assumptions are stable enough to guide current planning:

- `pagana-api` is the backend target for the refactor
- the legacy backend is being mined for business logic, not copied wholesale
- multiple client applications will rely on a shared backend contract
- backend design should optimize for clean boundaries, security, and maintainability
- documentation should separate long-lived context from transitional migration notes

## Out of Scope for This Doc

This doc intentionally does not define:

- endpoint-level migration mapping
- final module internals
- full domain model details
- database migration plans
- implementation sequencing beyond high-level context

Those belong in later refactor and module documents once the supporting analysis is complete.
