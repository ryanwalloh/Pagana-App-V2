# Identity Module

## Purpose

The identity module defines how `pagana-api` handles:

- user identity
- authentication
- authorization
- role assignment
- account lifecycle
- verification and recovery flows

This module is foundational. Every other module depends on it either directly or through permission and ownership checks.

This document describes the target-state design direction for identity based on the stable system context and the legacy backend analysis currently available.

## Why Identity Comes First

The legacy backend shows that identity is one of the main structural failure points of the old system.

The current source system mixes:

- session-based auth
- magic-link login
- verification-driven onboarding
- mobile/API requests that trust client-supplied `user_id`

That pattern is not acceptable for `pagana-api`, which must serve multiple first-party clients through one central backend. Identity has to be defined first so every other module can assume:

- authenticated user context is trustworthy
- roles are explicit
- ownership is derived server-side
- permissions are enforced consistently

## Responsibilities

The identity module should own:

- user accounts
- credentials and login methods
- access token and refresh token lifecycle
- role assignment
- account status and activation state
- email and phone verification state
- password reset and account recovery
- session or device revocation policy
- authorization primitives used by other modules

It should not own:

- customer profile data
- rider operational data
- merchant business profile data
- restaurant approval workflow
- domain-specific onboarding artifacts outside identity proof and verification

Those belong to adjacent modules that depend on identity.

## Module Boundaries

### Identity Owns

- canonical user record
- role membership
- login and logout flows
- credential verification
- token issuance
- account verification records
- password recovery
- permission checks at the identity layer

### Identity References But Does Not Own

- customer profile
- rider profile
- merchant profile
- admin staff profile

Identity should know that a user has a role. It should not absorb all role-specific business data into the user model.

## Core Design Principles

### 1. API-first authentication

`pagana-api` must authenticate first-party clients through explicit API auth, not through implicit trust patterns or browser-oriented fallback behavior.

### 2. Server-derived identity

No business endpoint should accept a raw `user_id` as the source of truth for who is acting. The acting user must come from the authenticated request context.

### 3. Minimal but durable user model

The core identity model should stay compact. It should store identity and access concerns, not become a dumping ground for customer, rider, or merchant profile fields.

### 4. Explicit roles and permissions

Role semantics must be intentional and enforced at the API boundary. Roles should drive authorization, but object-level ownership and policy checks must still be applied inside module use cases.

### 5. Verification as a controlled workflow

Verification should be modeled as a managed identity workflow with expiry, attempt limits, and auditability. It must not be treated as a loosely structured side path inside generic controller logic.

## Recommended User Model Direction

The legacy backend confirms that a custom user model is appropriate, but the new backend should keep it tighter than the source system.

Recommended identity fields:

- `id`
- `email`
- `phone_number` (nullable if product rules allow)
- `password_hash` or equivalent credential backing
- `role`
- `is_active`
- `is_email_verified`
- `is_phone_verified`
- `created_at`
- `updated_at`
- optional login or security metadata as needed

Recommended profile separation:

- customer details stay in a customer-facing profile module
- rider-specific operational fields stay in a rider or dispatch-adjacent module
- merchant or restaurant operator details stay in a merchant module

### Role Model

Based on current system knowledge, identity should support at least:

- customer
- rider
- merchant
- admin

The legacy role name `restaurant` should not automatically be copied into the new platform without confirming whether the long-term role language should be `merchant`, `vendor`, or `restaurant_operator`.

Until naming is finalized, keep role semantics explicit in code and docs rather than scattering synonyms.

## Authentication Model

### Recommended Primary Approach

Use token-based API authentication suitable for web, mobile, and admin clients.

At this stage, the safest documented assumption is:

- short-lived access token
- longer-lived refresh token
- revocation support where practical

This can be implemented using a JWT-based approach or another token system, but the important architectural requirement is that authentication is API-native and consistent across all client applications.

### Supported Login Flows

The module should be designed to support:

- email plus password login
- phone plus OTP login if product requirements confirm it
- email verification during signup
- password reset or recovery

Magic-link login may be supported later, but it should not be treated as the core identity path unless the product deliberately chooses passwordless auth.

### Explicit Non-Goals

The new identity module should not support:

- client-supplied user identity for authenticated business actions
- session-only assumptions as the primary auth model for all clients
- role resolution in the frontend as a substitute for backend permission checks

## Authorization Model

Authorization in `pagana-api` should work in layers.

### Layer 1: Role-level access

Examples:

- only riders can access rider operational endpoints
- only merchant users can manage merchant-facing resources
- only admin users can access administrative actions

### Layer 2: Object ownership

Examples:

- a customer can only access their own addresses and orders
- a rider can only update deliveries assigned to them
- a merchant can only manage resources belonging to their merchant account

### Layer 3: Business policy checks

Examples:

- suspended users cannot authenticate or act
- unverified users may be blocked from some flows
- some actions may require an approved merchant account, not just a merchant role

Identity should provide the primitives, but downstream modules must still enforce domain-specific rules.

## Verification and Recovery

### Verification

The legacy backend contains useful ideas here:

- verification codes with expiry
- attempt limits
- temporary verification records

These ideas should be preserved conceptually but redesigned.

Recommended verification capabilities:

- email verification
- optional phone verification if required by role or market
- expirations
- retry limits
- replay prevention
- audit logging or event capture for sensitive flows

### Recovery

Identity should support:

- password reset request
- password reset confirmation
- token or code expiry
- invalidation after use

If magic-link auth is retained in the future, it should be implemented as a deliberate identity feature, not as a loosely coupled controller workaround.

## Account Lifecycle

Identity should define a clean account lifecycle that other modules can depend on.

Suggested lifecycle states:

- created
- pending_verification
- active
- suspended
- disabled or archived

Not every state has to be implemented immediately, but the module should be designed so these transitions are possible without redesigning the core model later.

## Expected API Surface

The exact endpoint design can be finalized later, but the identity module will likely need endpoints in these categories:

- signup
- verify email or phone
- resend verification
- login
- refresh token
- logout
- logout all sessions or devices
- request password reset
- confirm password reset
- get current authenticated user

Representative examples:

- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/verify`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/me`

These are examples of shape, not final contracts.

## Data Ownership and Relationships

Other modules should reference identity through stable foreign keys or user references, but they should not redefine identity state locally.

Rules:

- role is owned by identity
- verification state is owned by identity
- credentials are owned by identity
- customer, rider, and merchant profile details are owned outside identity

This prevents the duplication seen in the legacy backend, where identity-adjacent data is spread across multiple profile models and controllers.

## Security Requirements

The identity module must launch with safe defaults.

Required principles:

- secure password storage
- rate limiting on login and verification endpoints
- no unrestricted user serialization
- no broad `AllowAny` exposure outside explicitly public endpoints
- no trust in client-provided identity for protected actions
- audit-friendly handling of verification and reset flows
- token expiry and revocation strategy

## Migration Guidance from Legacy Backend

### Keep as input

- custom user model requirement
- role-based identity
- verification expiry and attempt concepts
- email-based verification and recovery needs

### Redesign before adoption

- the exact legacy role naming
- verification storage structure
- user payload shape returned by auth endpoints
- magic-link handling
- session assumptions

### Discard

- `UserViewSet`-style open CRUD exposure
- `fields = '__all__'` user serialization
- identity flows mixed into broad catch-all controller logic
- client-supplied `user_id` as a trust mechanism

## Dependencies

Identity is upstream of nearly every other module.

Modules that depend on identity:

- orders
- dispatch
- merchants
- customers
- admin operations
- payments

Identity depends on infrastructure such as:

- email delivery
- optional SMS delivery
- token signing and validation
- rate limiting
- audit logging

These integrations should be exposed through infrastructure adapters, not embedded directly in request handlers.

## What This Doc Does Not Yet Lock In

This document intentionally does not finalize:

- the exact token technology
- the final role vocabulary if merchant naming changes
- MFA requirements
- SSO or social login
- admin-specific internal identity flows
- device management detail

Those items can be documented later once the product and operational requirements are clearer.

## Recommendation

Identity should be implemented as one of the first real modules in `pagana-api`.

It is the dependency that determines whether:

- permissions are trustworthy
- user ownership is enforceable
- module APIs stay clean
- mobile, web, and admin clients can share one backend safely

If identity is not redesigned first, the legacy backend’s biggest weakness will leak into every other module.
