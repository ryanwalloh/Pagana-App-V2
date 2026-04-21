# Pagana API Endpoints Reference

## Purpose

This document lists the currently implemented `pagana-api` endpoints, the HTTP methods they expose, who they are meant for, and the main use case for each one.

Base API prefix:

- `/api/v1/`

Out of scope for this doc:

- Django admin routes under `/admin/`
- future endpoints that are planned but not yet implemented

## How To Read This

For each endpoint, this doc lists:

- method
- path
- main actor or caller
- use case

Auth shorthand used below:

- `public`: no authentication required
- `auth`: any authenticated user
- `customer`: authenticated customer user
- `merchant`: authenticated merchant user
- `rider`: authenticated rider user
- `admin`: authenticated admin or ops user

## Core

### Health

- `GET /api/v1/health/`
  Auth: `public`
  Use case: basic service health check for local development, uptime probes, or deployment verification.

## Identity

### Authentication

- `POST /api/v1/auth/signup`
  Auth: `public`
  Use case: create a new account and bootstrap the correct role-owned record flow, such as customer profile, merchant membership, or rider profile.

- `POST /api/v1/auth/login`
  Auth: `public`
  Use case: exchange credentials for JWT access and refresh tokens.

- `POST /api/v1/auth/refresh`
  Auth: `public`
  Use case: refresh an access token using a valid refresh token.

- `GET /api/v1/me`
  Auth: `auth`
  Use case: return the authenticated user context for the currently signed-in actor.

## Customers

### Customer Profile

- `GET /api/v1/customer/profile`
  Auth: `customer`
  Use case: load the current customer's profile for account or checkout-related screens.

- `PUT /api/v1/customer/profile`
  Auth: `customer`
  Use case: fully update the current customer's stored profile details.

- `PATCH /api/v1/customer/profile`
  Auth: `customer`
  Use case: partially update the current customer's profile details.

## Merchants

### Merchant Account Context

- `GET /api/v1/merchant/profile`
  Auth: `merchant`
  Use case: fetch the primary merchant business profile linked to the signed-in merchant user.

- `PUT /api/v1/merchant/profile`
  Auth: `merchant`
  Use case: fully update merchant business profile information.

- `PATCH /api/v1/merchant/profile`
  Auth: `merchant`
  Use case: partially update merchant business profile information.

- `GET /api/v1/merchant/status`
  Auth: `merchant`
  Use case: inspect merchant operating and visibility status fields exposed to the merchant surface.

- `PUT /api/v1/merchant/status`
  Auth: `merchant`
  Use case: fully update merchant-managed status fields that the API allows merchants to control.

- `PATCH /api/v1/merchant/status`
  Auth: `merchant`
  Use case: partially update merchant-managed status fields.

- `GET /api/v1/merchant/membership`
  Auth: `merchant`
  Use case: fetch the signed-in merchant user's primary membership context, including role and linked merchant.

## Catalog

### Customer Catalog Browsing

- `GET /api/v1/merchants/<merchant_id>/catalog`
  Auth: `public`
  Use case: list all customer-visible, orderable products for a specific approved and active merchant storefront.

- `GET /api/v1/products/<product_id>`
  Auth: `public`
  Use case: fetch one customer-visible product detail record.

### Merchant Product Management

- `GET /api/v1/merchant/products`
  Auth: `merchant`
  Use case: list all products owned by the signed-in merchant.

- `POST /api/v1/merchant/products`
  Auth: `merchant`
  Use case: create a new product inside the signed-in merchant's catalog.

- `GET /api/v1/merchant/products/<product_id>`
  Auth: `merchant`
  Use case: inspect one merchant-owned product for editing or internal review.

- `PUT /api/v1/merchant/products/<product_id>`
  Auth: `merchant`
  Use case: fully update one merchant-owned product.

- `PATCH /api/v1/merchant/products/<product_id>`
  Auth: `merchant`
  Use case: partially update one merchant-owned product.

## Orders

### Customer Cart and Checkout

- `GET /api/v1/cart`
  Auth: `customer`
  Use case: fetch the current customer's active cart, including its items and merchant context.

- `POST /api/v1/cart/items`
  Auth: `customer`
  Use case: add an item to the active cart or update quantity through cart-item mutation logic.

- `PATCH /api/v1/cart/items/<item_id>`
  Auth: `customer`
  Use case: change the quantity of a single cart item.

- `DELETE /api/v1/cart/items/<item_id>`
  Auth: `customer`
  Use case: remove a single item from the cart.

- `POST /api/v1/checkout/prepare`
  Auth: `customer`
  Use case: validate the current cart and return checkout-ready totals, merchant context, and item summary before order creation.

- `POST /api/v1/checkout/confirm`
  Auth: `customer`
  Use case: convert the active cart into an order using backend-derived totals and order snapshots.

### Customer Orders

- `GET /api/v1/orders`
  Auth: `customer`
  Use case: list the signed-in customer's orders.

- `GET /api/v1/orders/<public_id>`
  Auth: `customer`
  Use case: fetch the full detail of one customer-owned order.

- `GET /api/v1/orders/<public_id>/tracking`
  Auth: `customer`
  Use case: fetch customer-facing order tracking data, including fulfillment progress and dispatch context when available.

### Merchant Order Operations

- `GET /api/v1/merchant/orders`
  Auth: `merchant`
  Use case: list orders belonging to the signed-in merchant.

- `GET /api/v1/merchant/orders/<public_id>`
  Auth: `merchant`
  Use case: fetch detailed information for one merchant-owned order.

- `POST /api/v1/merchant/orders/<public_id>/<target_status>`
  Auth: `merchant`
  Use case: move an order through allowed merchant-controlled fulfillment transitions such as accept, reject, preparing, or ready-for-pickup.

## Payments

### Customer Payment Flows

- `POST /api/v1/payments/orders/<public_id>/intent`
  Auth: `customer`
  Use case: create or reuse a Stripe payment intent for an eligible card-payment order.

- `GET /api/v1/payments/orders/<public_id>`
  Auth: `customer`
  Use case: fetch payment status and latest payment-attempt summary for one customer-owned order.

### Payment Provider Integration

- `POST /api/v1/payments/webhooks/stripe`
  Auth: `public`
  Use case: receive Stripe webhook events, verify their signature, and apply payment state changes idempotently.

## Dispatch

### Rider Profile and Offers

- `GET /api/v1/rider/profile`
  Auth: `rider`
  Use case: load the signed-in rider's profile.

- `GET /api/v1/rider/offers`
  Auth: `rider`
  Use case: list pending dispatch offers currently available to the signed-in rider.

- `POST /api/v1/rider/offers/<offer_id>/accept`
  Auth: `rider`
  Use case: accept a pending dispatch offer and claim the assignment.

- `POST /api/v1/rider/offers/<offer_id>/reject`
  Auth: `rider`
  Use case: reject a pending dispatch offer and advance the assignment search flow.

### Rider Assignments and Tracking

- `GET /api/v1/rider/assignments`
  Auth: `rider`
  Use case: list the rider's assigned or completed deliveries.

- `PATCH /api/v1/rider/assignments/<public_id>/status`
  Auth: `rider`
  Use case: update the fulfillment status of a rider-owned delivery flow, such as moving it into transit, arrived, or delivered.

- `GET /api/v1/rider/location`
  Auth: `rider`
  Use case: fetch the latest stored rider location.

- `PUT /api/v1/rider/location`
  Auth: `rider`
  Use case: create or replace the rider's latest location record for tracking purposes.

## Ops

### Admin and Operations Overrides

- `POST /api/v1/ops/orders/<public_id>/cancel`
  Auth: `admin`
  Use case: cancel an order through a controlled internal override path with reason capture and auditability.

- `POST /api/v1/ops/orders/<public_id>/dispatch/retrigger`
  Auth: `admin`
  Use case: manually retrigger dispatch for an order when operational intervention is needed.

- `POST /api/v1/ops/orders/<public_id>/dispatch/reset`
  Auth: `admin`
  Use case: reset an order's dispatch assignment state so the dispatch process can be restarted cleanly.

- `GET /api/v1/ops/orders/<public_id>/payments`
  Auth: `admin`
  Use case: inspect all payment attempts linked to an order for support or finance investigation.

- `GET /api/v1/ops/orders/<public_id>/audit`
  Auth: `admin`
  Use case: retrieve audit history for the order and its related payment or dispatch records.

## Endpoint Groups By Product Surface

### Customer-facing

- auth: signup, login, refresh, me
- customer profile
- public catalog browsing
- cart and checkout
- customer orders
- customer payment status
- customer order tracking

### Merchant-facing

- merchant profile
- merchant status
- merchant membership
- merchant product management
- merchant order listing
- merchant order transitions

### Rider-facing

- rider profile
- rider offer queue
- rider offer accept or reject actions
- rider assignment list
- rider assignment status updates
- rider location updates

### Admin or Ops-facing

- order cancel override
- dispatch retrigger
- dispatch reset
- payment attempt inspection
- audit log retrieval

## Notes For Future Docs

This file is a route-and-use-case reference, not a full contract specification.

If needed later, it can be expanded with:

- request body examples
- response shape examples
- error cases
- auth token examples
- endpoint lifecycle notes for frontend teams
