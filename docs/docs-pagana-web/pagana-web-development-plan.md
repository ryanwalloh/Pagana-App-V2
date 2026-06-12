# Pagana Web Development Plan

> Last updated: June 11, 2026
> Scope: `pagana-web` — the customer-facing web application
> Companion docs: `docs-pagana-api/api-endpoints-reference.md`, `docs-pagana-api/pagana-api-development-guide.md`, `project-progress-summary.md`

## Purpose

This document is the step-by-step build plan for `pagana-web`. It turns the configured skeleton into the first real client of `pagana-api`, covering the full customer journey: browse → register/login → cart → checkout → pay → track.

Because `pagana-web` is the first API consumer, every milestone doubles as an integration test of the backend. Contract gaps found here should be fixed in `pagana-api` immediately, since fixes propagate to all future clients (admin portals, mobile apps).

## Current State of the Skeleton

What already exists and works:

- Vite + React 18 + TypeScript + Tailwind + Shadcn UI tooling, fully configured
- TanStack Query v5 and Axios installed
- `src/api/client.ts`: Axios instance with `VITE_API_BASE_URL` (defaults to `http://localhost:8000/api/v1`), bearer-token request interceptor, naive 401 redirect
- `src/router.tsx`: React Router v6 with Landing / Login / Register / Dashboard routes and a token-presence `ProtectedRoute`
- `src/hooks/useAuth.ts`: login/register/logout mutation hooks
- Theme provider and dark-mode toggle components

Known defects in the skeleton (written before the API existed — must be corrected in Milestone 0):

- `src/api/auth.ts` calls `/auth/register/` — the real endpoint is `POST /auth/signup`
- Skeleton paths use trailing slashes (`/auth/login/`); the API defines paths **without** trailing slashes — POSTs with a trailing slash will 404
- `RegisterData` sends a `name` field; the API's signup contract is `email`, `password`, `role`, optional `phone_number` (and `merchant_name` for merchants — not used by this customer app)
- `AuthResponse.user` expects a `name` field; the real user object has `role`, `phone_number`, verification flags, etc.
- The refresh token is never stored; the 401 interceptor clears the access token and hard-redirects instead of attempting a refresh
- `authApi.logout()` calls `POST /auth/logout/`, which does not exist in the API (no token blacklist yet); logout is client-side for now

## Verified API Contract (June 2026 smoke test)

The backend was smoke-tested end-to-end: 38/38 tests pass, health/signup/login/`me`/profile round-trips verified live. After the auth-shape fix, all three auth endpoints share one contract:

- `POST /auth/signup` and `POST /auth/login` → `{ "access", "refresh", "user": {...} }`
- `POST /auth/refresh` → top-level token response
- JWTs carry a `role` claim
- Customer signup auto-creates the `CustomerProfile` (no second call needed)
- CORS already allows `http://localhost:5173`

## Known Backend Gaps This Plan Will Surface

These are missing from `pagana-api` and are scheduled as backend work inside the milestones below:

1. **No public merchant list endpoint.** Customers can fetch `GET /merchants/<id>/catalog` but there is no `GET /merchants` to discover storefronts. Required for the browse page (Milestone 2).
2. **No logout/token revocation.** Client-side logout is acceptable for v1; SimpleJWT blacklist can be added later.
3. **No saved addresses.** Checkout takes `delivery_address_line_1/2` inline per order (by design, per the migration matrix). Saved/multiple addresses are deferred backend work; the UI should not block on it.

## Architectural Decisions

- **Auth strategy:** JWT access token in memory + localStorage, refresh token in localStorage; Axios response interceptor performs a single refresh-and-retry on 401 before logging out. (Cookie-based auth can be revisited before production.)
- **Server state:** TanStack Query owns all API data; no Redux or global client-state store. Auth context only holds the session.
- **Folder convention:** feature-based modules under `src/features/` (e.g. `auth`, `storefront`, `cart`, `checkout`, `orders`), with `src/api/` holding the typed endpoint layer and `src/pages/` holding route-level composition only.
- **Types mirror the API:** every response/request type in `src/api/` must match the real serializer output, verified against a running backend — never guessed.
- **Polling, not websockets:** order tracking uses TanStack Query `refetchInterval`, matching the backend's polling-first design.

---

## Milestones

Execution rule (per project working agreement): implement **one milestone at a time**, validate it against a running backend, and confirm before moving to the next.

### Milestone 0 — Foundation and Contract Alignment

Goal: a correct, typed API layer and a real auth session, with zero UI work.

Work items:

1. Add `.env.development` with `VITE_API_BASE_URL=http://localhost:8000/api/v1`; document backend startup in `pagana-web/README.md`
2. Rewrite `src/api/auth.ts`: correct paths (`/auth/signup`, `/auth/login`, `/auth/refresh`, `/me` — no trailing slashes), correct request/response types matching the unified auth contract
3. Rewrite token handling in `src/api/client.ts`:
   - store both `access` and `refresh` tokens
   - 401 interceptor: attempt one `POST /auth/refresh` and retry the original request; on refresh failure, clear session and redirect to `/login`
   - skip refresh logic for the auth endpoints themselves
4. Create an `AuthProvider` (context) that hydrates from `GET /me` on app load, exposing `{ user, isAuthenticated, isLoading, login, signup, logout }`
5. Replace the token-presence `ProtectedRoute` with one driven by `AuthProvider` state
6. Delete or rewrite stale skeleton files (`src/api/users.ts`, `useAuth.ts` hooks) to match

Endpoints used: `POST /auth/signup`, `POST /auth/login`, `POST /auth/refresh`, `GET /me`

Acceptance criteria:

- With the backend running, a scripted login from the browser console stores tokens, and a page reload re-hydrates the session via `/me`
- An expired access token triggers exactly one refresh attempt and the original request succeeds
- `npm run lint` and `npm run build` pass

### Milestone 1 — Auth UI

Goal: real signup, login, and logout flows.

Work items:

1. Login page: email/password form, inline validation, API error display (invalid credentials, throttle responses — the API throttles auth at 10/min)
2. Register page: customer signup (`role: "customer"` fixed, hidden from the user), optional phone number
3. Logged-in shell: nav bar with user identity and logout; logout clears tokens and query cache client-side
4. Redirect rules: authenticated users away from `/login`/`/register`; post-login redirect to the page originally requested

Endpoints used: same as Milestone 0.

Acceptance criteria:

- A new user can register, land authenticated, log out, and log back in
- Wrong password and throttled requests show meaningful errors, not crashes

### Milestone 2 — Public Storefront Browse (Marketing Surface)

Goal: the unauthenticated entry point — landing page and merchant storefronts.

Backend prerequisite (small `pagana-api` addition, follows the development guide patterns):

- `GET /api/v1/merchants` — public, paginated list of approved + active merchants (display name, id, basic storefront fields); add tests and update `api-endpoints-reference.md`

Work items:

1. Landing page: hero/marketing section plus the merchant grid (public, no auth)
2. Storefront page (`/merchants/:id`): merchant header + product catalog via `GET /merchants/<id>/catalog`
3. Product detail view via `GET /products/<id>` (page or modal)
4. Loading/empty/error states for all public queries

Endpoints used: `GET /merchants` (new), `GET /merchants/<id>/catalog`, `GET /products/<id>`

Acceptance criteria:

- A logged-out visitor can browse merchants and products end-to-end
- Unapproved/inactive merchants never appear

### Milestone 3 — Cart

Goal: authenticated, merchant-scoped cart management.

Work items:

1. "Add to cart" on storefront products (auth required; prompt login if not)
2. Cart page: line items, quantities, update/remove, totals as returned by the API (never computed client-side)
3. Enforce the single-merchant cart invariant in UI: adding from a different merchant prompts to clear the cart (match whatever the API enforces — verify its error response and surface it cleanly)
4. Cart badge in the nav shell

Endpoints used: `GET /cart`, `POST /cart/items`, `PATCH|DELETE /cart/items/<id>`

Acceptance criteria:

- Full add/update/remove cycle works against the live API
- Cross-merchant add is blocked with a clear UX, consistent with the API error

### Milestone 4 — Checkout (Cash on Delivery First)

Goal: convert a cart into an order with backend-derived totals.

Work items:

1. Checkout page driven by `POST /checkout/prepare`: review line items, fees, totals (all server-derived)
2. Delivery address form (`delivery_address_line_1/2` inline — no saved addresses in v1), delivery notes
3. `POST /checkout/confirm` with COD as the payment method; handle the idempotent-confirm behavior gracefully (double-click safe)
4. Order confirmation screen linking to the order detail page

Endpoints used: `POST /checkout/prepare`, `POST /checkout/confirm`

Acceptance criteria:

- A cart becomes an order with totals matching the backend's calculation
- Re-submitting confirm does not create a duplicate order

### Milestone 5 — Online Payments (Stripe)

Goal: card payment path alongside COD.

Work items:

1. Add `@stripe/stripe-js` + `@stripe/react-stripe-js`; payment method selection at checkout (COD vs card)
2. Card flow: create the order, then `POST /payments/orders/<public_id>/intent`, mount Stripe Elements with the client secret, confirm on the client
3. Payment status screen polling `GET /payments/orders/<public_id>` until the webhook lands
4. Local webhook testing documented via Stripe CLI (`stripe listen --forward-to localhost:8000/api/v1/payments/webhooks/stripe`); real test keys in backend env

Endpoints used: `POST /payments/orders/<id>/intent`, `GET /payments/orders/<id>`, Stripe webhook (backend-side)

Acceptance criteria:

- A test-card payment completes and the order's payment summary reflects the webhook-driven state
- Intent creation is idempotent from the UI's perspective (retry-safe)

### Milestone 6 — Orders and Tracking

Goal: the customer can see history and follow an active delivery.

Work items:

1. Orders page: paginated history via `GET /orders`
2. Order detail (`/orders/:publicId`): snapshot line items, payment summary, status timeline
3. Tracking view via `GET /orders/<public_id>/tracking` with TanStack Query polling (`refetchInterval` ~10–15s while the order is active, off when terminal)
4. Replace the placeholder Dashboard page with a real account home (recent orders, profile summary via `GET /customer/profile`)

Endpoints used: `GET /orders`, `GET /orders/<id>`, `GET /orders/<id>/tracking`, `GET /customer/profile`, `PATCH /customer/profile`

Acceptance criteria:

- An order placed in Milestone 4/5 is visible, inspectable, and its status updates appear within one polling interval (drive transitions via merchant endpoints or Django admin during testing)

### Milestone 7 — Hardening and Polish

Goal: production-quality finish before starting the next client.

Work items:

1. Global error boundary + consistent API error toast/banner pattern
2. Responsive pass on all pages (mobile-width web matters for a delivery product)
3. Accessibility pass on forms and interactive elements
4. E2E smoke suite (Playwright) covering: browse → register → cart → COD checkout → order visible
5. CI: lint + typecheck + build (+ e2e if feasible) on PRs
6. Update `project-progress-summary.md` and `api-endpoints-reference.md` for everything added

Acceptance criteria:

- E2E smoke passes against a freshly migrated backend
- CI is green

---

## Backend Work Expected Along the Way

| Item | Milestone | Size |
|---|---|---|
| Unify auth response shape (signup/login) | done (June 2026) | — |
| `GET /merchants` public storefront list | 2 | small |
| Verify/clean cart cross-merchant error contract | 3 | trivial |
| Stripe test keys + webhook env documentation | 5 | config only |
| SimpleJWT token blacklist (logout) | deferred | small |
| Saved customer addresses | deferred | medium |

## Definition of Done (Project Level)

`pagana-web` v1 is done when a new visitor can: discover a merchant, register, fill a cart, pay by COD or test card, and watch the order progress to delivered — entirely through `pagana-api`, with CI green and docs updated.
