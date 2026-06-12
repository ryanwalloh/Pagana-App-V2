# Pagana Web — Work Breakdown Structure (WBS)

> Last updated: June 11, 2026
> Source roadmap: `docs/docs-pagana-web/pagana-web-development-plan.md`
> Status: engineering execution plan — implementation-ready
> Contract source of truth: verified directly against `pagana-api` source (serializers, models, services) on June 11, 2026

## How To Read This

- Hierarchy: **Milestone → Feature → Task → Subtask**
- Task IDs: `M<milestone>-F<feature>-T<task>` (e.g. `M2-F1-T3`)
- Tags: `[FE]` frontend, `[BE]` backend, `[API]` API contract change, `[DB]` database change, `[TEST]` testing work
- Complexity: **Low** (≤ half day), **Medium** (~1–2 days), **High** (3+ days or elevated risk)
- Every task lists: Objective, Dependencies, Complexity, Definition of Done (DoD)
- Execution rule: one milestone at a time; each milestone validated against a live backend before the next begins

## Verified API Contract Facts (used throughout)

These were read from `pagana-api` source, not guessed:

- Auth responses (signup/login) are unified: `{ access, refresh, user }`; JWT carries a `role` claim; refresh returns top-level tokens
- `user` object: `id, email, phone_number, role, is_active, is_email_verified, is_phone_verified, created_at, updated_at` — there is **no `name` field on User**
- Customer profile: `display_name, preferred_contact_phone, default_delivery_notes`
- Paths have **no trailing slashes** (e.g. `/api/v1/auth/login`)
- Pagination: DRF PageNumber, `PAGE_SIZE=100`, shape `{ count, next, previous, results }`
- Throttles: anon 30/min, authenticated 120/min, auth endpoints 10/min (scope `auth`)
- Cart: `GET /cart` → `{ id, merchant{id,display_name}|null, items[{id, product{id,display_name,description,image_url}, quantity, unit_price, subtotal}], subtotal, total_quantity }`
- `POST /cart/items` body `{ product_id, quantity≥1 }` — **upsert semantics**: it *sets* the quantity (`update_or_create`), it does not increment
- Cross-merchant add → 400 `{ "product_id": ["Cart can only contain items from one merchant at a time."] }`
- Checkout prepare/confirm body: `recipient_name, recipient_phone, delivery_address_line_1, delivery_address_line_2?, delivery_city, delivery_state?, delivery_postal_code, delivery_country (ISO-2), delivery_notes?`; confirm adds `payment_method` + optional `idempotency_key`
- Prepare response includes server-derived `subtotal, delivery_fee, service_fee, total_amount, allowed_payment_methods` (currently `["cash_on_delivery","card"]`; fees currently 0.00)
- `Order.fulfillment_status` enum: `pending → accepted → preparing → ready_for_pickup → assigned_to_rider → in_transit → arrived → delivered`, plus `cancelled`
- `Order.payment_status` enum: `pending, requires_action, authorized, succeeded, failed, cancelled, refunded`
- Orders are addressed by `public_id` (UUID); list/detail/tracking serializers include `payment_summary` and `dispatch_summary` (tracking/detail include rider `location {latitude, longitude, updated_at}` when assigned)
- Payment intent (`POST /payments/orders/<public_id>/intent`) returns `provider_client_secret`; the summary endpoint deliberately omits it
- Product public availability is gated by `is_customer_available` (product visible/orderable/not archived AND merchant approved/active/visible/operational)

---

## Milestone 0 — Foundation and Contract Alignment

No UI. Outcome: a correct, typed, token-refreshing API layer and a real session provider.

```
M0 Foundation and Contract Alignment
├── F1 Environment & Tooling Baseline
│   ├── T1 Environment files and run documentation
│   ├── T2 Install and build verification
│   └── T3 Add missing dev tooling (vitest, testing-library)
├── F2 Typed API Contract Layer
│   ├── T1 Shared API types module
│   ├── T2 Rewrite auth API module
│   └── T3 Remove/rewrite stale skeleton API files
├── F3 Token Lifecycle & HTTP Client
│   ├── T1 Token storage module
│   ├── T2 Refresh-and-retry response interceptor
│   └── T3 API error normalization helper
├── F4 Auth Session Provider
│   ├── T1 AuthProvider context with /me hydration
│   ├── T2 ProtectedRoute driven by session state
│   └── T3 Rewrite useAuth hooks on top of the provider
└── F5 Verification
    ├── T1 Interceptor unit tests
    └── T2 Live-backend integration pass
```

### M0-F1-T1 — Environment files and run documentation `[FE]`
- **Objective:** Create `.env.development` (`VITE_API_BASE_URL=http://localhost:8000/api/v1`), `.env.example`, and rewrite `pagana-web/README.md` with the two-terminal dev workflow (backend: `pagana-api/.venv/bin/python manage.py runserver`; frontend: `npm run dev`).
- **Dependencies:** none.
- **Complexity:** Low.
- **DoD:** A fresh clone can follow the README to a running app pointed at a local API. `.env*` files (except `.env.example`) are gitignored.

### M0-F1-T2 — Install and build verification `[FE]`
- **Objective:** Run `npm install`, `npm run dev`, `npm run lint`, `npm run build` on the existing skeleton; fix any breakage (the skeleton has never been built against current Node; `package-lock.json` exists but `node_modules` does not).
- **Dependencies:** none.
- **Complexity:** Low (Medium if dependency drift causes TS/ESLint errors).
- **DoD:** All four commands exit 0; dev server renders the placeholder pages.

### M0-F1-T3 — Add missing dev tooling `[FE]` `[TEST]`
- **Objective:** Add `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` as devDependencies; add `npm test` script; one trivial smoke test to prove the harness.
- **Dependencies:** M0-F1-T2.
- **Complexity:** Low.
- **DoD:** `npm test` runs and passes.

### M0-F2-T1 — Shared API types module `[FE]`
- **Objective:** Create `src/api/types.ts` with: `User` (exact field list from the contract facts above), `AuthTokens`, `AuthResponse`, `Paginated<T>`, `ApiFieldErrors` (DRF `{field: string[]}` shape), `ApiError` union (field errors | `{detail: string}` | throttle 429).
- **Dependencies:** M0-F1-T2.
- **Complexity:** Low.
- **DoD:** Types compile; no `name` field on `User`; `Paginated<T>` matches `{count,next,previous,results}`.

### M0-F2-T2 — Rewrite auth API module `[FE]`
- **Objective:** Replace `src/api/auth.ts`: `signup(email, password, phone_number?)` → `POST /auth/signup` with `role:"customer"` hardcoded; `login(email, password)` → `POST /auth/login`; `refresh(refreshToken)` → `POST /auth/refresh`; `me()` → `GET /me`. No trailing slashes. Remove the nonexistent `logout()` API call (logout is client-side; no backend endpoint exists).
- **Dependencies:** M0-F2-T1.
- **Complexity:** Low.
- **DoD:** Each function returns correctly typed data verified against a live backend response (manual or test).

### M0-F2-T3 — Remove/rewrite stale skeleton API files `[FE]`
- **Objective:** Delete `src/api/users.ts` (targets endpoints that don't exist) and any other API modules not matching the real contract; remove `__init__.ts`/`__init__.js` placeholder files (Python convention, meaningless in TS).
- **Dependencies:** M0-F2-T2.
- **Complexity:** Low.
- **DoD:** `rg "register/|logout/|/users" src/` returns nothing; build passes.

### M0-F3-T1 — Token storage module `[FE]`
- **Objective:** `src/lib/tokenStorage.ts`: `getAccess/getRefresh/setTokens/clearTokens` over localStorage keys `pagana.access` / `pagana.refresh`. Single owner of storage keys — no other file touches localStorage directly. Remove the legacy `authToken` key usage everywhere.
- **Dependencies:** none.
- **Complexity:** Low.
- **DoD:** Grep shows zero direct `localStorage` access outside this module.

### M0-F3-T2 — Refresh-and-retry response interceptor `[FE]`
- **Objective:** Rewrite `src/api/client.ts` interceptors: on 401 (excluding requests to `/auth/*`), perform **single-flight** refresh (one in-flight refresh promise shared by concurrent 401s), retry the original request once with the new access token; on refresh failure, `clearTokens()` and emit a `session-expired` event consumed by the AuthProvider (no hard `window.location` redirect from the interceptor).
- **Dependencies:** M0-F3-T1, M0-F2-T2.
- **Complexity:** Medium (single-flight + retry loop protection is the subtle part).
- **Subtasks:**
  - Mark retried requests (e.g. `config._retried = true`) to guarantee at most one retry per request
  - Exclude `/auth/login`, `/auth/signup`, `/auth/refresh` from the refresh path
  - Queue concurrent 401s behind the in-flight refresh promise
- **DoD:** Unit tests (M0-F5-T1) prove: expired access → one refresh call → original request retried and succeeds; failed refresh → tokens cleared, no infinite loop.

### M0-F3-T3 — API error normalization helper `[FE]`
- **Objective:** `src/lib/apiError.ts`: convert Axios errors into a normalized `{ status, fieldErrors?, message }`; handle DRF field-error dicts, `{detail}` strings, 429 throttle responses (auth scope is 10/min — users will hit this), and network errors.
- **Dependencies:** M0-F2-T1.
- **Complexity:** Low.
- **DoD:** Unit-tested against the three DRF error shapes + network failure.

### M0-F4-T1 — AuthProvider context with /me hydration `[FE]`
- **Objective:** `src/features/auth/AuthProvider.tsx`: on mount, if a refresh token exists, fetch `GET /me` (TanStack Query, key `['me']`); expose `{ user, isAuthenticated, isLoading, login, signup, logout }`. `logout` clears tokens + `queryClient.clear()`. Listens for `session-expired` events from the interceptor.
- **Dependencies:** M0-F3-T2, M0-F2-T2.
- **Complexity:** Medium.
- **DoD:** Page reload with valid tokens restores the session without re-login; reload with garbage tokens lands logged-out without a crash or redirect loop.

### M0-F4-T2 — ProtectedRoute driven by session state `[FE]`
- **Objective:** Replace the token-presence check in `src/router.tsx` with AuthProvider state; render a loading state during hydration; on redirect to `/login`, preserve the intended destination in router state for post-login return.
- **Dependencies:** M0-F4-T1.
- **Complexity:** Low.
- **DoD:** Deep-linking to a protected route while logged out → login → returns to the original route.

### M0-F4-T3 — Rewrite useAuth hooks `[FE]`
- **Objective:** Rebuild `src/hooks/useAuth.ts` mutations (`useLogin`, `useSignup`) over the provider; store **both** tokens on success; remove `useLogout`'s nonexistent API call.
- **Dependencies:** M0-F4-T1.
- **Complexity:** Low.
- **DoD:** Mutations set tokens + `['me']` cache; no references to the old `authToken` key remain.

### M0-F5-T1 — Interceptor unit tests `[TEST]`
- **Objective:** Vitest suite for M0-F3-T2/T3 using mocked Axios adapters: refresh-retry success, refresh failure, single-flight under 3 concurrent 401s, no retry of `/auth/*`, error normalization cases.
- **Dependencies:** M0-F3-T2, M0-F3-T3, M0-F1-T3.
- **Complexity:** Medium.
- **DoD:** ≥6 tests pass in CI-able `npm test`.

### M0-F5-T2 — Live-backend integration pass `[TEST]`
- **Objective:** Manual scripted check against running `pagana-api`: signup → tokens stored → reload → `/me` hydration → force-expire access token (wait or shorten lifetime) → request triggers refresh → logout clears state.
- **Dependencies:** all M0 tasks.
- **Complexity:** Low.
- **DoD:** Checklist recorded in PR description; no console errors.

---

## Milestone 1 — Auth UI

```
M1 Auth UI
├── F1 UI Component Foundation (Shadcn generation)
│   ├── T1 Generate core Shadcn primitives
│   └── T2 Form infrastructure (react-hook-form + zod)
├── F2 Login Page
│   ├── T1 Login form and validation
│   └── T2 API error and throttle handling
├── F3 Register Page
│   ├── T1 Customer signup form
│   └── T2 Server-side field error mapping
├── F4 Authenticated App Shell
│   ├── T1 Layout route with nav bar
│   └── T2 User menu and logout
└── F5 Redirect Rules & Tests
    ├── T1 Guest-only route guard
    └── T2 Component tests for auth flows
```

### M1-F1-T1 — Generate core Shadcn primitives `[FE]`
- **Objective:** The skeleton has `components.json` but **`src/components/ui` is empty** — no Shadcn components have ever been generated. Run the Shadcn CLI to add: `button, input, label, card, form, dropdown-menu, dialog, sonner (toast), skeleton, badge, separator`. Verify Tailwind theme tokens render.
- **Dependencies:** M0-F1-T2.
- **Complexity:** Low (watch for CLI version vs config drift — `components.json` is from early 2026).
- **DoD:** All listed components exist under `src/components/ui/` and render in the dev server.

### M1-F1-T2 — Form infrastructure `[FE]`
- **Objective:** Add `react-hook-form`, `zod`, `@hookform/resolvers` (not currently installed). Create a reusable `FormField` pattern wired to Shadcn `form` components and a `applyServerErrors(form, fieldErrors)` util that maps normalized DRF field errors onto form fields.
- **Dependencies:** M1-F1-T1, M0-F3-T3.
- **Complexity:** Low.
- **DoD:** A demo form maps a simulated DRF 400 to inline field messages.

### M1-F2-T1 — Login form and validation `[FE]`
- **Objective:** Rebuild `LoginPage`: email + password fields, zod validation (email format, non-empty password), submit via `useLogin`, loading state on the button, link to register.
- **Dependencies:** M1-F1-T2, M0-F4-T3.
- **Complexity:** Low.
- **DoD:** Valid credentials land on the post-login route; invalid show inline errors without page reload.

### M1-F2-T2 — API error and throttle handling `[FE]`
- **Objective:** Distinguish 401 invalid-credentials ("Incorrect email or password") from 429 throttle ("Too many attempts — try again in a minute"; auth scope is **10/min**, easy to hit in testing) and network failure; never render raw API payloads.
- **Dependencies:** M1-F2-T1.
- **Complexity:** Low.
- **DoD:** All three cases manually verified against the live API.

### M1-F3-T1 — Customer signup form `[FE]`
- **Objective:** Rebuild `RegisterPage`: email, password (min 8 chars to match the API's `min_length=8`; Django also enforces common/numeric password validators — surface those server messages), optional phone number. `role:"customer"` is set in the API layer, never user-visible. Auto-login on success (signup returns tokens).
- **Dependencies:** M1-F1-T2, M0-F4-T3.
- **Complexity:** Low.
- **DoD:** New account → lands authenticated; duplicate email shows the server's field error inline.

### M1-F3-T2 — Server-side field error mapping `[FE]` `[TEST]`
- **Objective:** Verify (live) the exact 400 payloads for: duplicate email, weak password (Django validator messages), invalid phone; ensure `applyServerErrors` maps each onto the right field.
- **Dependencies:** M1-F3-T1.
- **Complexity:** Low.
- **DoD:** Each documented case shows an inline message on the correct field.

### M1-F4-T1 — Layout route with nav bar `[FE]`
- **Objective:** Add a layout route (React Router `<Outlet/>`) wrapping all customer pages: top nav with logo → `/`, future cart badge slot, auth area (Login/Register buttons or user menu). Mobile responsive from day one.
- **Dependencies:** M1-F1-T1, M0-F4-T1.
- **Complexity:** Medium.
- **DoD:** All routes render inside the shell; nav reflects auth state reactively.

### M1-F4-T2 — User menu and logout `[FE]`
- **Objective:** Dropdown showing `user.email` (note: no display name on User; customer profile `display_name` arrives in M6), menu items: Orders (stub until M6), Account (stub), Logout. Logout = client-side token/cache clear → navigate `/`.
- **Dependencies:** M1-F4-T1.
- **Complexity:** Low.
- **DoD:** Logout from a protected page lands on `/` logged out; back-button does not resurrect the session.

### M1-F5-T1 — Guest-only route guard `[FE]`
- **Objective:** Authenticated users visiting `/login` or `/register` are redirected to `/` (or their intended destination).
- **Dependencies:** M0-F4-T2.
- **Complexity:** Low.
- **DoD:** Manual check both directions; no redirect loops with the ProtectedRoute.

### M1-F5-T2 — Component tests for auth flows `[TEST]`
- **Objective:** Testing-library tests: login success path (mocked API), login 401, signup field-error mapping, guards (guest-only + protected).
- **Dependencies:** all M1.
- **Complexity:** Medium.
- **DoD:** Tests pass headlessly via `npm test`.

---

## Milestone 2 — Public Storefront Browse

```
M2 Public Storefront Browse
├── F1 [BE] Public merchant list endpoint
│   ├── T1 Serializer + view + URL
│   ├── T2 Backend tests
│   └── T3 Docs update (api-endpoints-reference)
├── F2 [BE] Development seed data
│   └── T1 Management command: seed demo merchants/products
├── F3 Catalog API layer (FE)
│   └── T1 Types + endpoint functions + query hooks
├── F4 Landing Page
│   ├── T1 Hero / marketing section
│   └── T2 Merchant grid with pagination
├── F5 Storefront Page
│   ├── T1 Route + merchant catalog rendering
│   └── T2 Product detail (modal or page)
└── F6 Query States
    └── T1 Skeleton/empty/error states for all public queries
```

### M2-F1-T1 — Public merchant list endpoint `[BE]` `[API]`
- **Objective:** **This endpoint does not exist and blocks the entire milestone.** Add `GET /api/v1/merchants` to `apps/catalog` or `apps/merchants` (recommend `merchants`, it owns storefront identity): public (`AllowAny`), paginated, returns only merchants satisfying the same gate as `merchant_can_receive_orders` (approved + active + visible + operational). Purpose-built serializer (id, display_name, and whatever public storefront fields exist on `Merchant` — verify model before coding); **no** broad `ModelViewSet`.
- **Dependencies:** none (backend-only).
- **Complexity:** Medium.
- **DoD:** Endpoint returns only eligible merchants; hidden/unapproved merchants excluded; follows the explicit-endpoint pattern from the development guide.
- **DB changes:** none (read-only over existing schema).

### M2-F1-T2 — Backend tests for merchant list `[BE]` `[TEST]`
- **Objective:** APITestCase: eligible merchant appears; each ineligibility dimension (unapproved, inactive, invisible, non-operational) excludes; pagination shape correct; anonymous access allowed.
- **Dependencies:** M2-F1-T1.
- **Complexity:** Low.
- **DoD:** Tests pass within the full suite (currently 38 tests — suite stays green).

### M2-F1-T3 — Docs update `[BE]`
- **Objective:** Add the endpoint to `docs/docs-pagana-api/api-endpoints-reference.md` under a public storefront section.
- **Dependencies:** M2-F1-T1.
- **Complexity:** Low.
- **DoD:** Doc matches implementation.

### M2-F2-T1 — Seed data management command `[BE]`
- **Objective:** **Hidden dependency: the dev database has no merchants or products** — nothing to browse, nothing to test against. Add `python manage.py seed_demo_data`: creates N approved/active merchants with categorized products (mix of visible/hidden/non-orderable to exercise gating), plus a known merchant test user and a known customer test user. Idempotent (safe to re-run). Dev-only guard (`DEBUG` check).
- **Dependencies:** none.
- **Complexity:** Medium.
- **DoD:** Fresh DB + `migrate` + `seed_demo_data` → `GET /merchants` returns data; documented in `pagana-api/README.md`.

### M2-F3-T1 — Catalog API layer `[FE]`
- **Objective:** `src/api/catalog.ts` + types (`MerchantSummary`, `Product`, paginated wrappers) + TanStack hooks: `useMerchants(page)`, `useMerchantCatalog(merchantId)`, `useProduct(productId)`. Verify the catalog response shape live (whether items are grouped by category or flat) before typing — do not guess.
- **Dependencies:** M2-F1-T1, M0-F2-T1.
- **Complexity:** Low.
- **DoD:** Types match live responses byte-for-byte; hooks have sensible `staleTime` (public data, e.g. 60s).

### M2-F4-T1 — Hero / marketing section `[FE]`
- **Objective:** Replace `LandingPage` placeholder: brand hero, value proposition, CTA scrolling to the merchant grid. **Open input needed: brand assets/copy do not exist** — use tasteful placeholder copy and the existing theme; flag for product owner.
- **Dependencies:** M1-F4-T1.
- **Complexity:** Medium (design-heavy).
- **DoD:** Responsive, accessible (landmark roles, contrast), no layout shift on load.

### M2-F4-T2 — Merchant grid with pagination `[FE]`
- **Objective:** Card grid from `useMerchants`; with `PAGE_SIZE=100` a simple "Load more" (or nothing, if count ≤ 100) suffices for v1; each card links to `/merchants/:id`.
- **Dependencies:** M2-F3-T1, M2-F2-T1 (data to render).
- **Complexity:** Low.
- **DoD:** Grid renders seeded merchants; empty state if none.

### M2-F5-T1 — Storefront page `[FE]`
- **Objective:** Route `/merchants/:merchantId`: merchant header + product list from `useMerchantCatalog`; group by category if the API provides it; product cards show name, description, price, image (with fallback for blank `image_url`).
- **Dependencies:** M2-F3-T1.
- **Complexity:** Medium.
- **DoD:** Seeded storefront renders; non-orderable/hidden products never appear (server-gated, verified); 404-style state for bad merchant IDs.
- **Edge cases:** merchant exists but has zero visible products → friendly empty state; merchant ID valid but merchant not eligible → the catalog endpoint's behavior (404 vs empty) must be verified live and handled.

### M2-F5-T2 — Product detail `[FE]`
- **Objective:** Product modal (preferred for flow continuity) or `/products/:id` route over `GET /products/<id>`; shows full description, price, image; "Add to cart" button slot **disabled with tooltip until M3**.
- **Dependencies:** M2-F5-T1.
- **Complexity:** Low.
- **DoD:** Opens from storefront card; deep-linkable if implemented as a route.

### M2-F6-T1 — Query states for public pages `[FE]`
- **Objective:** Skeleton loaders (Shadcn `skeleton`), empty states, and error states (with retry) for merchants list, catalog, and product detail. Note the **anon throttle is 30/min** — aggressive refetching on window focus could 429 anonymous browsers; set `refetchOnWindowFocus: false` for public queries.
- **Dependencies:** M2-F4-T2, M2-F5-T1.
- **Complexity:** Low.
- **DoD:** Simulated slow network and 500s produce designed states, not blank screens.

---

## Milestone 3 — Cart

```
M3 Cart
├── F1 Cart API layer + query hooks
│   └── T1 Types, endpoints, optimistic-free mutation hooks
├── F2 Add-to-cart UX
│   ├── T1 Quantity-aware add control (upsert semantics)
│   └── T2 Auth gate for guests
├── F3 Cart Page
│   ├── T1 Line item list with quantity stepper and remove
│   └── T2 Totals panel and checkout CTA
├── F4 Cross-merchant conflict UX
│   ├── T1 [BE] Clear-cart capability decision/verification
│   └── T2 Conflict dialog ("switch merchant?")
└── F5 Nav cart badge
    └── T1 Badge bound to total_quantity
```

### M3-F1-T1 — Cart API layer + hooks `[FE]`
- **Objective:** `src/api/cart.ts`: `getCart` (`GET /cart`), `setCartItem` (`POST /cart/items` `{product_id, quantity}`), `updateItemQuantity` (`PATCH /cart/items/<id>`), `removeItem` (`DELETE /cart/items/<id>`); hooks with query key `['cart']`, all mutations invalidate `['cart']`. Plain invalidation first — no optimistic updates in v1 (totals are server-derived; correctness over flash).
- **Dependencies:** M0 complete.
- **Complexity:** Medium.
- **DoD:** Full add/update/remove cycle verified against live API; types match `CartSerializer` exactly (incl. `merchant: null` when empty).

### M3-F2-T1 — Quantity-aware add control `[FE]`
- **Objective:** **Critical semantic:** `POST /cart/items` *sets* the quantity (backend `update_or_create`), it does not increment. The product detail "Add to cart" must therefore either (a) read current cart quantity and send `current+1`, or (b) present an explicit quantity picker that sets the value. **Decision: (b) explicit quantity picker** — honest about the API semantics and avoids read-modify-write races. Show current in-cart quantity on the control when the product is already in the cart.
- **Dependencies:** M3-F1-T1, M2-F5-T2.
- **Complexity:** Medium.
- **DoD:** Adding the same product twice with quantities 2 then 3 results in quantity 3 (not 5) and the UI communicated that clearly.

### M3-F2-T2 — Auth gate for guests `[FE]`
- **Objective:** Guest clicking add-to-cart → dialog offering login/register, preserving the return path (M0-F4-T2 mechanism). Post-login returns to the same product.
- **Dependencies:** M3-F2-T1, M1 complete.
- **Complexity:** Low.
- **DoD:** Guest → add → login → back on the product with cart functional.

### M3-F3-T1 — Cart page line items `[FE]`
- **Objective:** Route `/cart` (protected): items with image/name/unit price/subtotal, quantity stepper (PATCH, min 1 — the API rejects 0; quantity 0 is expressed as DELETE), remove button, per-row pending states.
- **Dependencies:** M3-F1-T1.
- **Complexity:** Medium.
- **DoD:** All mutations reflect server state after invalidation; rapid stepper clicks don't interleave (disable while pending).
- **Edge case:** product became non-orderable since being added → PATCH returns 400 `"Product is not currently orderable."` — surface on the row with a prompt to remove it.

### M3-F3-T2 — Totals panel and checkout CTA `[FE]`
- **Objective:** Render server `subtotal` (never recompute client-side), merchant name header, "Checkout" button → `/checkout` (enabled only when cart non-empty). Show fee disclosure note (fees finalized at checkout).
- **Dependencies:** M3-F3-T1.
- **Complexity:** Low.
- **DoD:** Totals always equal API values; CTA disabled on empty cart.

### M3-F4-T1 — Clear-cart capability `[BE]` `[API]`
- **Objective:** Verify whether `CartView` supports `DELETE /cart`; **if not, add it** (small explicit endpoint: clears items, nulls merchant — mirrors existing `remove_cart_item` reset logic) + test + docs entry. Required for a sane cross-merchant switch UX (the alternative — N item deletes from the client — is racy and chatty).
- **Dependencies:** none.
- **Complexity:** Low.
- **DoD:** `DELETE /cart` empties the cart and resets merchant; test green; docs updated.

### M3-F4-T2 — Cross-merchant conflict dialog `[FE]`
- **Objective:** On 400 `"Cart can only contain items from one merchant at a time."`, show dialog: "Your cart contains items from {merchant}. Start a new cart with {newMerchant}?" → Confirm = `DELETE /cart` then retry the add; Cancel = no-op.
- **Dependencies:** M3-F4-T1, M3-F2-T1.
- **Complexity:** Medium.
- **DoD:** Full switch flow works live; cancel leaves the original cart untouched.

### M3-F5-T1 — Nav cart badge `[FE]`
- **Objective:** Badge on the shell's cart icon bound to `['cart']` `total_quantity`; hidden for guests; navigates to `/cart`.
- **Dependencies:** M3-F1-T1, M1-F4-T1.
- **Complexity:** Low.
- **DoD:** Updates after every cart mutation without manual refresh.

### M3 Testing requirements `[TEST]`
- FE component tests: quantity-set semantics, conflict dialog flow, auth gate.
- BE: clear-cart endpoint test (M3-F4-T1).
- Live checklist: add/update/remove/switch-merchant/badge.

---

## Milestone 4 — Checkout (Cash on Delivery)

```
M4 Checkout (COD)
├── F1 Checkout route and guards
│   └── T1 /checkout route, cart-not-empty guard
├── F2 Delivery details form
│   ├── T1 Recipient + address form (full API field set)
│   └── T2 Country and phone input decisions
├── F3 Prepare flow
│   └── T1 POST /checkout/prepare → server-derived summary render
├── F4 Confirm flow
│   ├── T1 Idempotency-key lifecycle
│   ├── T2 POST /checkout/confirm (COD) + double-submit protection
│   └── T3 Failure-path handling (cart drift, merchant offline)
└── F5 Confirmation screen
    └── T1 Success screen → order detail link
```

### M4-F1-T1 — Checkout route and guards `[FE]`
- **Objective:** Protected `/checkout`; redirect to `/cart` when the cart is empty; stepper UI shell (Details → Review → Done).
- **Dependencies:** M3 complete.
- **Complexity:** Low.
- **DoD:** Direct navigation with empty cart bounces to `/cart`.

### M4-F2-T1 — Recipient + address form `[FE]`
- **Objective:** Form with the **exact** API field set: `recipient_name`, `recipient_phone`, `delivery_address_line_1`, `delivery_address_line_2` (optional), `delivery_city`, `delivery_state` (optional), `delivery_postal_code`, `delivery_country` (ISO-2), `delivery_notes` (optional). Zod schema mirrors API max-lengths (255/32/120/2). No saved addresses in v1 (matches backend; deferred by design).
- **Dependencies:** M4-F1-T1, M1-F1-T2.
- **Complexity:** Medium.
- **DoD:** Server 400s map onto fields; all constraints validated client-side first.

### M4-F2-T2 — Country and phone input decisions `[FE]`
- **Objective:** **Open product decision: default country.** `delivery_country` is ISO-2; recommend a single-country default (e.g. `PH`) rendered as a fixed/select field rather than free text. Phone: simple format validation only (API stores max 32 chars, no server-side format rule).
- **Dependencies:** M4-F2-T1.
- **Complexity:** Low.
- **DoD:** Decision recorded in this doc; field never submits invalid ISO codes.

### M4-F3-T1 — Prepare flow `[FE]`
- **Objective:** On reaching Review, `POST /checkout/prepare` with the form payload; render the server response only: line items, `subtotal`, `delivery_fee`, `service_fee`, `total_amount`, `allowed_payment_methods`. Re-run prepare if the user edits details. (Prepare validates merchant/product orderability server-side — surface those 400s by sending the user back to the cart with an explanatory toast.)
- **Dependencies:** M4-F2-T1.
- **Complexity:** Medium.
- **DoD:** Totals on screen are verbatim API values; tampering with client state cannot alter them.

### M4-F4-T1 — Idempotency-key lifecycle `[FE]`
- **Objective:** Generate a UUIDv4 `idempotency_key` when the user first lands on checkout; persist in `sessionStorage`; send with every confirm attempt; rotate only after a confirmed success or explicit cart change. This makes retries after network timeouts safe (server dedupes).
- **Dependencies:** M4-F1-T1.
- **Complexity:** Low.
- **DoD:** Two rapid confirm clicks / a retry after timeout yield exactly one order (verified live against the API's idempotent confirm).

### M4-F4-T2 — Confirm flow (COD) `[FE]`
- **Objective:** `POST /checkout/confirm` with form payload + `payment_method:"cash_on_delivery"` + idempotency key; button disabled while pending; on success invalidate `['cart']` (server empties it — verify live) and navigate to confirmation with the returned order `public_id`.
- **Dependencies:** M4-F4-T1, M4-F3-T1.
- **Complexity:** Medium.
- **DoD:** Order appears in Django admin with correct totals/snapshot items; cart is empty afterward.

### M4-F4-T3 — Failure-path handling `[FE]`
- **Objective:** Map confirm-time 400s: cart emptied/changed in another tab, product became unorderable, merchant stopped accepting orders (`"Merchant is not currently accepting orders."`). Each → toast + redirect to `/cart` with the cart re-fetched.
- **Dependencies:** M4-F4-T2.
- **Complexity:** Medium.
- **DoD:** Each scenario manually induced (toggle product/merchant flags in Django admin) and handled gracefully.

### M4-F5-T1 — Confirmation screen `[FE]`
- **Objective:** Success screen: order number (`public_id`), totals, "Track your order" → `/orders/:publicId` (stub target until M6 — acceptable, M6 follows).
- **Dependencies:** M4-F4-T2.
- **Complexity:** Low.
- **DoD:** Refreshing the confirmation page doesn't re-submit anything.

### M4 Testing requirements `[TEST]`
- FE: form validation suite, idempotency-key lifecycle unit test, failure-path mapping tests (mocked).
- Live checklist: full COD order placed end-to-end; duplicate-click test; merchant-offline test.

---

## Milestone 5 — Online Payments (Stripe)

```
M5 Stripe Payments
├── F1 Stripe setup
│   ├── T1 FE dependencies and publishable key env
│   └── T2 [BE] Test keys, webhook secret, Stripe CLI docs
├── F2 Payment method selection
│   └── T1 COD vs card selector from allowed_payment_methods
├── F3 Card payment flow
│   ├── T1 Order-first confirm with payment_method=card
│   ├── T2 Payment intent creation + Elements mount
│   └── T3 Client-side confirmPayment + requires_action handling
├── F4 Payment status screen
│   └── T1 Poll payment summary until terminal state
└── F5 Currency decision
    └── T1 [BE] Confirm STRIPE_CURRENCY
```

### M5-F1-T1 — FE Stripe dependencies `[FE]`
- **Objective:** Add `@stripe/stripe-js` + `@stripe/react-stripe-js`; `VITE_STRIPE_PUBLISHABLE_KEY` in `.env.development`/`.env.example`; lazy-load Stripe JS only on checkout (bundle hygiene).
- **Dependencies:** M4 complete.
- **Complexity:** Low.
- **DoD:** Elements provider mounts with the test publishable key.

### M5-F1-T2 — Backend Stripe environment + webhook docs `[BE]`
- **Objective:** Document and wire real **test-mode** keys: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` env vars (settings already read them; current values are placeholders). Add a `pagana-api` README section: `stripe listen --forward-to localhost:8000/api/v1/payments/webhooks/stripe` for local webhook delivery.
- **Dependencies:** Stripe test account access (**external blocker — needs account credentials from the owner**).
- **Complexity:** Low (config only).
- **DoD:** `stripe trigger payment_intent.succeeded` reaches the webhook endpoint and is persisted.

### M5-F2-T1 — Payment method selector `[FE]`
- **Objective:** Radio selection on the Review step driven by `allowed_payment_methods` from prepare (`cash_on_delivery` | `card`) — never hardcoded, so backend changes propagate.
- **Dependencies:** M4-F3-T1.
- **Complexity:** Low.
- **DoD:** Removing a method from the API response removes it from the UI.

### M5-F3-T1 — Order-first confirm with card `[FE]`
- **Objective:** Card path: `POST /checkout/confirm` with `payment_method:"card"` (order created, `payment_status:"pending"`), then transition to the payment step with the order's `public_id`. Same idempotency-key discipline as COD.
- **Dependencies:** M5-F2-T1, M4-F4-*.
- **Complexity:** Low.
- **DoD:** Card order exists in `pending` payment state before any Stripe UI shows.

### M5-F3-T2 — Intent creation + Elements mount `[FE]`
- **Objective:** `POST /payments/orders/<public_id>/intent` → response includes `provider_client_secret`; mount `<PaymentElement>` with it. Handle intent-creation errors (e.g. order already paid → treat as success path). Backend intent creation is idempotent — safe to re-call on remount.
- **Dependencies:** M5-F3-T1, M5-F1-T1, M5-F1-T2.
- **Complexity:** Medium.
- **DoD:** Test card `4242…` reaches Stripe's confirm stage; remounting the page does not create duplicate intents (verify via Stripe dashboard).

### M5-F3-T3 — confirmPayment + requires_action `[FE]`
- **Objective:** `stripe.confirmPayment` with redirect `if_required`; handle: success → status screen; `requires_action` (3DS test card `4000 0027 6000 3184`) → Stripe handles the modal; failure (decline card `4000 0000 0000 0002`) → inline retryable error, order remains payable.
- **Dependencies:** M5-F3-T2.
- **Complexity:** High (most intricate client flow in the project).
- **DoD:** All three Stripe test cards behave correctly end-to-end.

### M5-F4-T1 — Payment status screen `[FE]`
- **Objective:** After confirmPayment, poll `GET /payments/orders/<public_id>` (TanStack `refetchInterval` 3s, max ~60s) until `payment_status` is terminal (`succeeded`/`failed`); the authoritative state arrives via **webhook**, not the client. Success → order confirmation; timeout → "payment processing" state with a link to the order (status will catch up).
- **Dependencies:** M5-F3-T3, M5-F1-T2.
- **Complexity:** Medium.
- **DoD:** With Stripe CLI forwarding, the screen resolves within a few polls; with the CLI off, the timeout state appears (this simulates real webhook delay).
- **Technical risk:** local webhook forwarding must be running or payments stay `pending` — documented prominently.

### M5-F5-T1 — Currency decision `[BE]`
- **Objective:** **Open product decision:** `STRIPE_CURRENCY` defaults to `usd`. If the product operates in the Philippines, set `php` via env and confirm amount handling (zero-decimal rules don't apply to PHP, but verify the backend's amount→minor-units conversion against the payments service).
- **Dependencies:** product owner input.
- **Complexity:** Low.
- **DoD:** Decision recorded; Stripe dashboard shows charges in the chosen currency.

### M5 Testing requirements `[TEST]`
- BE: existing webhook/intent tests stay green; add a currency assertion if changed.
- FE: mocked-Stripe component tests for the selector and status screen states.
- Live checklist: 4242 success, 3DS card, decline card, webhook-off timeout.

---

## Milestone 6 — Orders and Tracking

```
M6 Orders and Tracking
├── F1 Orders API layer
│   └── T1 Types + hooks for list/detail/tracking
├── F2 Orders list page
│   └── T1 Paginated history with status badges
├── F3 Order detail page
│   ├── T1 Snapshot items, fees, delivery info, payment summary
│   └── T2 Timeline rendering
├── F4 Live tracking view
│   ├── T1 Status stepper + conditional polling
│   └── T2 Rider/dispatch summary display
└── F5 Account area
    ├── T1 Customer profile view/edit
    └── T2 Replace placeholder Dashboard; checkout prefill
```

### M6-F1-T1 — Orders API layer `[FE]`
- **Objective:** `src/api/orders.ts`: `useOrders(page)` (`GET /orders`, paginated), `useOrder(publicId)` (`GET /orders/<uuid>`), `useOrderTracking(publicId, {poll})` (`GET /orders/<uuid>/tracking`). Types mirror the three serializers exactly, including `payment_summary | null` and `dispatch_summary | null` (with optional rider `location`). Status enums typed as string-literal unions matching the model choices.
- **Dependencies:** M0 complete (orders exist from M4/M5 testing).
- **Complexity:** Medium.
- **DoD:** Types compile against captured live responses for an order in each major state.

### M6-F2-T1 — Orders list page `[FE]`
- **Objective:** Protected `/orders`: rows with merchant name, date, `total_amount`, fulfillment-status badge (color-coded across the 9 statuses), payment badge; click → detail. "Load more" pagination.
- **Dependencies:** M6-F1-T1, M1-F4-T2 (nav link goes live).
- **Complexity:** Medium.
- **DoD:** Orders from M4/M5 appear correctly; empty state for new accounts.

### M6-F3-T1 — Order detail page `[FE]`
- **Objective:** `/orders/:publicId`: snapshot items (`product_display_name`, qty, `unit_price`, `subtotal` — these are historical snapshots, render them, never re-fetch live products), fee breakdown (`item_subtotal`, `delivery_fee`, `service_fee`, `total_amount`), delivery address block, payment summary card.
- **Dependencies:** M6-F1-T1.
- **Complexity:** Medium.
- **DoD:** A delivered order from testing renders fully; 404 state for foreign/unknown UUIDs (the API scopes by owner — verify it returns 404 not 403, render accordingly).

### M6-F3-T2 — Timeline rendering `[FE]`
- **Objective:** Vertical timeline from `timeline_events` (`event_type`, `message`, `created_at`), oldest-first (API orders ascending).
- **Dependencies:** M6-F3-T1.
- **Complexity:** Low.
- **DoD:** Events from a multi-transition order render in chronological order with relative timestamps.

### M6-F4-T1 — Status stepper + conditional polling `[FE]`
- **Objective:** Tracking view (section of detail page or `/orders/:publicId/track`): horizontal stepper over the happy path (`pending → accepted → preparing → ready_for_pickup → assigned_to_rider → in_transit → arrived → delivered`); `cancelled` renders a distinct terminal banner. Poll `useOrderTracking` with `refetchInterval: 12_000` **only while non-terminal** (`delivered`/`cancelled` stop polling — 12s × authenticated 120/min throttle is safe at 5 req/min).
- **Dependencies:** M6-F1-T1.
- **Complexity:** Medium.
- **DoD:** Driving transitions via merchant endpoints/Django admin updates the stepper within one interval; DevTools shows polling stops at terminal states.

### M6-F4-T2 — Rider/dispatch summary display `[FE]`
- **Objective:** When `dispatch_summary` is non-null: assignment status and, when present, rider location (`latitude/longitude/updated_at`) rendered as text + "last updated" for v1 (**no map** — map rendering is deliberately out of scope; flag as a future enhancement requiring a maps key decision).
- **Dependencies:** M6-F4-T1.
- **Complexity:** Low.
- **DoD:** Null dispatch (pre-assignment) renders nothing; populated dispatch shows status/rider/location text.

### M6-F5-T1 — Customer profile view/edit `[FE]`
- **Objective:** `/account`: form over `GET/PATCH /customer/profile` (`display_name`, `preferred_contact_phone`, `default_delivery_notes`).
- **Dependencies:** M0 complete.
- **Complexity:** Low.
- **DoD:** Round-trip edit persists and re-renders.

### M6-F5-T2 — Dashboard replacement + checkout prefill `[FE]`
- **Objective:** Replace placeholder `DashboardPage` with an account home (recent 3 orders, profile snapshot, links). **Hidden integration:** prefill checkout (M4) from profile — `recipient_phone` ← `preferred_contact_phone`, `delivery_notes` ← `default_delivery_notes`, `recipient_name` ← `display_name` (retrofit M4-F2-T1 form defaults).
- **Dependencies:** M6-F5-T1, M6-F2-T1.
- **Complexity:** Low.
- **DoD:** Checkout opens pre-populated for a user with a filled profile.

### M6 Testing requirements `[TEST]`
- FE: stepper mapping unit test (all 9 statuses), polling on/off logic test, timeline ordering test.
- Live checklist: drive one order through every status via merchant transition endpoints and watch the UI follow.

---

## Milestone 7 — Hardening and Polish

```
M7 Hardening and Polish
├── F1 Error handling infrastructure
│   ├── T1 Global error boundary
│   └── T2 Unified toast/banner conventions
├── F2 Responsive and accessibility pass
│   ├── T1 Mobile-width audit of every page
│   └── T2 A11y audit (forms, focus, landmarks, contrast)
├── F3 End-to-end test suite
│   ├── T1 Playwright setup + backend fixture strategy
│   └── T2 Core journey specs
├── F4 CI pipeline
│   └── T1 GitHub Actions: lint, typecheck, unit, build (+e2e)
└── F5 Documentation closure
    └── T1 Update progress summary, endpoints reference, READMEs
```

### M7-F1-T1 — Global error boundary `[FE]`
- **Objective:** Route-level React error boundary with a designed fallback (reload CTA); wire `QueryClient` default `onError` to the toast system for unhandled query errors.
- **Dependencies:** M1-F1-T1 (toast component).
- **Complexity:** Low.
- **DoD:** A thrown render error shows the fallback, not a white screen.

### M7-F1-T2 — Unified toast/banner conventions `[FE]`
- **Objective:** Audit all features: mutations → toast on unexpected failure; inline field errors stay inline; 429s get the standard "slow down" message; no raw `error.message` ever rendered.
- **Dependencies:** all feature milestones.
- **Complexity:** Medium (audit + retrofit).
- **DoD:** Grep finds no ad-hoc error rendering outside the convention.

### M7-F2-T1 — Mobile-width audit `[FE]`
- **Objective:** Every page at 360px/768px/1280px; fix nav (hamburger if needed), cart table → stacked cards on mobile, checkout form spacing, stepper overflow.
- **Dependencies:** all feature milestones.
- **Complexity:** Medium.
- **DoD:** No horizontal scroll or broken layout at the three widths.

### M7-F2-T2 — Accessibility audit `[FE]` `[TEST]`
- **Objective:** Labels on every input, focus management in dialogs (Radix handles most), focus return after modal close, landmark structure, color-contrast check on status badges, keyboard-only walkthrough of browse→checkout.
- **Dependencies:** M7-F2-T1.
- **Complexity:** Medium.
- **DoD:** axe DevTools reports no critical violations on core pages; keyboard-only order placement succeeds.

### M7-F3-T1 — Playwright setup + fixture strategy `[TEST]`
- **Objective:** Add Playwright; strategy: spin a dedicated backend with a fresh SQLite DB, run `migrate` + `seed_demo_data` (M2-F2-T1), run specs against it. Helper for programmatic login (API calls + storage injection) to keep specs fast.
- **Dependencies:** M2-F2-T1.
- **Complexity:** Medium.
- **DoD:** `npx playwright test` runs green locally from a clean checkout (one bootstrap script).

### M7-F3-T2 — Core journey specs `[TEST]`
- **Objective:** Specs: (1) guest browse → product detail; (2) register → login persistence across reload; (3) add to cart → quantity update → cross-merchant switch; (4) COD checkout → order visible in history → detail renders. (Stripe e2e excluded — covered by manual checklist; mocking Stripe in e2e isn't worth v1 cost.)
- **Dependencies:** M7-F3-T1, all features.
- **Complexity:** High.
- **DoD:** All four specs green and stable (no flaky waits — use API-state polling, not sleeps).

### M7-F4-T1 — CI pipeline `[TEST]`
- **Objective:** GitHub Actions workflow on PR: frontend lint + `tsc` + vitest + build; backend `manage.py test` (38+ tests); e2e job (may be a second phase if runtime is heavy). Cache npm/pip.
- **Dependencies:** M7-F3-T2 (for the e2e job), everything else for green status.
- **Complexity:** Medium.
- **DoD:** A PR shows green checks; a deliberate lint error fails the build.

### M7-F5-T1 — Documentation closure `[FE]` `[BE]`
- **Objective:** Update `project-progress-summary.md` (web app no longer skeleton), `api-endpoints-reference.md` (merchant list, clear-cart), both READMEs, and this WBS (mark completion states).
- **Dependencies:** all.
- **Complexity:** Low.
- **DoD:** Docs match shipped reality.

---

## Consolidated: API Contract Changes

| Change | Milestone | Status |
|---|---|---|
| Unified auth response shape (signup ↔ login) + role claim in signup tokens | pre-M0 | ✅ done June 11, 2026 |
| `GET /api/v1/merchants` public storefront list | M2 | **blocker for M2** |
| `DELETE /api/v1/cart` clear-cart (verify; add if missing) | M3 | required for M3-F4 |
| `STRIPE_CURRENCY` env decision | M5 | decision needed |
| Token blacklist / logout endpoint | deferred | not blocking v1 |
| Saved customer addresses | deferred | not blocking v1 |

## Consolidated: Database Changes

- **None required for v1.** M2/M3 backend additions are read/delete operations over existing schema.
- Deferred items that will need migrations later: saved addresses table, SimpleJWT blacklist tables (`rest_framework_simplejwt.token_blacklist`).

## Missing Requirements (need product-owner input)

1. **Brand assets and copy** for the landing page (M2-F4-T1) — placeholder used until provided
2. **Default country + currency** (M4-F2-T2, M5-F5-T1) — recommend `PH` / `php` if operating in the Philippines; affects Stripe charge currency
3. **Stripe test account credentials** (M5-F1-T2) — external dependency, requested before M5 starts
4. **Delivery/service fee policy** — backend currently returns 0.00 for both; if real fees are wanted for v1, that's a new backend pricing task (not currently scheduled)
5. **Password reset flow** — **no endpoint exists in the API.** Not a build blocker, but a launch blocker: users who forget passwords have no recovery. Recommend scheduling a backend task (email-based reset, reusing the Celery email infra) before any public launch
6. **Email verification enforcement** — `is_email_verified` exists but nothing enforces it; decide whether v1 requires verification

## Hidden Dependencies (discovered during planning)

- **Empty `src/components/ui/`** — Shadcn components were never generated; all UI work depends on M1-F1-T1
- **Empty dev database** — no merchants/products exist; M2+ testing depends on the seed command (M2-F2-T1)
- **`POST /cart/items` is a quantity *set*, not an increment** — drove the M3-F2-T1 design decision; any future client must know this
- **Stripe CLI forwarding** must run during local card-payment testing or payments hang in `pending` (M5-F4-T1)
- **Anon throttle (30/min)** constrains public-page refetch behavior (M2-F6-T1)
- **Customer profile fields feed checkout prefill** — cross-milestone integration (M6-F5-T2 retrofits M4's form)
- Skeleton files use Python-style `__init__.ts` placeholders — cleaned in M0-F2-T3

## Architectural Concerns

- **Token storage in localStorage** is XSS-exposed. Accepted for v1 (standard SPA trade-off, no third-party script surface yet); revisit httpOnly-cookie auth before production hardening. Mitigation now: strict avoidance of `dangerouslySetInnerHTML`, CSP header at deploy time
- **No optimistic updates** in cart v1 — correctness first; revisit only if UX demands it
- **Polling-first tracking** matches the backend's design; do not introduce websockets client-side ahead of backend support
- **SQLite in dev vs PostgreSQL in prod** — the PostgreSQL switch (env-driven, already wired) should happen before launch; schedule a one-time verification run of the backend suite against PostgreSQL

## Edge Cases Register

| Case | Handled in |
|---|---|
| Product becomes unorderable while in cart | M3-F3-T1, M4-F4-T3 |
| Merchant goes offline between prepare and confirm | M4-F4-T3 |
| Cross-merchant cart conflict | M3-F4-T2 |
| Double-click / network-retry on confirm | M4-F4-T1 (idempotency key) |
| 3DS challenge and card decline | M5-F3-T3 |
| Webhook delayed/never arrives | M5-F4-T1 timeout state |
| Cart mutated in a second tab during checkout | M4-F4-T3 |
| Auth throttle (10/min) hit during testing/demo | M1-F2-T2 |
| Expired access token mid-session, concurrent requests | M0-F3-T2 single-flight |
| Foreign/unknown order UUID | M6-F3-T1 |
| Merchant with zero visible products | M2-F5-T1 |
| Blank product `image_url` | M2-F5-T1 fallback |

## Blockers That Threaten Later Milestones

1. **M2 hard-blocked** by `GET /merchants` (M2-F1-T1) — schedule it first within M2; it's also a prerequisite for e2e fixtures (M7)
2. **M2+ testing blocked** by seed data (M2-F2-T1) — without it every later milestone's verification stalls
3. **M5 blocked** by Stripe test credentials — external; request at M4 start to avoid idle time
4. **M7 e2e blocked** by the seed command and all feature milestones — any scope slip lands on the test suite; keep M7-F3 specs limited to the four core journeys
5. **Public launch (post-M7) blocked** by the missing password-reset flow and the PostgreSQL verification — both currently unscheduled backend work; decide during M6 whether to fold them into M7

## Suggested Sequencing Notes

- M2-F1 (backend endpoint) and M2-F2 (seed) can be built in parallel with M1 (auth UI) — they have no shared files
- M3-F4-T1 (clear-cart verification/addition) should be done at M3 start, not when the dialog is built
- Request Stripe credentials (M5-F1-T2 dependency) when M4 begins
- The checkout prefill retrofit (M6-F5-T2) is intentionally late; do not over-build M4's form for it
