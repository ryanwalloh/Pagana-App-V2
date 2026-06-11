# Pagana Project Progress Summary

> Last updated: June 11, 2026
> Audience: anyone (including future you) returning to the project after time away.
> Companion docs: `system-context.md`, `migration-analysis.md`, `docs-pagana-api/`, `modules/`

---

## 1. What Pagana Is

Pagana is a **food-delivery-style marketplace platform** (Foodpanda / Grab-style) being rebuilt from a legacy Django monolith into a modern, API-first, multi-client system.

The platform serves four role surfaces:

- **Customer** — browses merchant storefronts, manages a cart, checks out, pays, and tracks deliveries
- **Merchant / Vendor** — manages a product catalog, accepts and prepares orders
- **Rider** — receives exclusive dispatch offers, executes deliveries, shares live location
- **Admin / Ops** — monitors operations, performs audited overrides and interventions

All surfaces share one backend: `pagana-api`, a Django + DRF **modular monolith** that is the single source of truth for identity, business rules, and data.

### Repository Layout

```
pagana/
├── pagana-api/              # Django + DRF backend (ACTIVE — core foundation built)
├── pagana-web/              # React + Vite + TS customer web app (skeleton)
├── pagana-admin/
│   ├── pagana-superadmin/   # Full system admin portal (skeleton)
│   └── pagana-ops/          # Operations staff portal (skeleton)
├── pagana-mobile-customer/  # React Native + Expo customer app (skeleton)
├── pagana-mobile-vendor/    # React Native + Expo vendor app (skeleton)
├── pagana-mobile-rider/     # React Native + Expo rider app (skeleton)
├── pagana-mobile/           # Empty leftover directory from earlier structure
├── To-Refactor/Pagana-App/  # Legacy monolith (reference only — do not build on it)
└── docs/                    # Architecture, migration, and module documentation
```

Each client is a separate root-level project by design: independent App Store / Play Store deployments, clean CI/CD pipelines, and no role-based conditionals inside a single codebase.

---

## 2. Project History and Timeline

| Date | Milestone |
|---|---|
| Jan 2026 | Repo scaffolded: multi-app structure, UI toolkits configured for web/admin/mobile skeletons |
| Apr 20, 2026 | Initial commit; documentation suite prepared (`system-context.md`, `migration-analysis.md`, module docs) to drive the backend rebuild |
| Apr 21, 2026 | Legacy backend refactored into `pagana-api` (PR #1, `dev-back-api-initial-rw` merged) — all 5 migration phases of the backend migration matrix implemented |
| Apr 23, 2026 | README updated; last activity before the current pause |

Git state at time of writing: branch `dev-git-readme-rw` checked out, working tree clean. Branches: `main`, `dev`, `dev-back-api-initial-rw`, `dev-git-readme-rw` (all pushed to origin).

---

## 3. The Big Picture: Where the Project Stands

**The backend migration is done at the foundation level. Every client application is still a skeleton.**

That is the one-sentence status. In more detail:

| Component | Status |
|---|---|
| `pagana-api` | ✅ **Working backend foundation** — 9 modules, ~50 endpoints under `/api/v1/`, JWT auth, Stripe, dispatch, audit logging, ~1,200 lines of tests |
| `docs/` | ✅ Comprehensive and current as of the April milestone |
| `pagana-web` | ⚠️ Configured skeleton — Vite/TS/Tailwind/Shadcn/React Query set up; only Landing/Login/Register/Dashboard placeholder pages |
| `pagana-admin` (superadmin + ops) | ⚠️ Configured skeletons — tooling ready, no real pages |
| `pagana-mobile-customer` | ⚠️ Skeleton — Expo + NativeWind configured, single `HomeScreen.js`, empty `api/`, `components/`, `navigation/` folders |
| `pagana-mobile-vendor` | ⚠️ Skeleton — same shape as customer app |
| `pagana-mobile-rider` | ⚠️ Skeleton — same shape as customer app |
| `To-Refactor/Pagana-App` | 🗄️ Legacy reference only — superseded by `pagana-api` |

**Key working stance** (from `docs-pagana-api/pagana-api-progress.md`): `pagana-api` is the backend baseline. The legacy code should only be consulted for historical business behavior, never as an implementation reference.

---

## 4. The Backend (`pagana-api`) in Detail

### 4.1 Why It Was Rebuilt Instead of Ported

The legacy backend (`To-Refactor/Pagana-App`, Django project `soti_delivery`) was analyzed in `migration-analysis.md` and judged structurally unsuitable as a shared API platform:

- mixed HTML, JSON, DRF CRUD, SSE, and WebSocket transports with no boundary strategy
- business logic concentrated in a catch-all `core/views.py`
- **broken trust model**: endpoints accepted client-supplied `user_id` instead of authenticated context
- DRF defaults set to `AllowAny`, serializers using `fields='__all__'`, widespread `@csrf_exempt`
- in-memory real-time coordination that cannot scale horizontally

The decision: **migrate concepts, not code.** The legacy system was mined for domain vocabulary, workflows, and business rules, then the backend was rebuilt module-by-module per the `backend-migration-matrix.md`.

### 4.2 Module Map

```
pagana-api/apps/
├── core/        # Health check, shared plumbing
├── identity/    # Custom user model, roles, JWT auth (signup/login/refresh/me)
├── customers/   # Customer profile, separated from identity
├── merchants/   # Merchant business entity, membership, approval/status model
├── catalog/     # Merchant-owned products; public storefront reads
├── orders/      # Cart, checkout preparation, order aggregate, timeline events
├── payments/    # Payment attempts, Stripe intents, idempotent webhook ingestion
├── dispatch/    # Rider profiles, sequential exclusive offers, assignments, location
└── ops/         # Audit logging, admin/ops override APIs
```

Stack: Django 4.2 + DRF, SimpleJWT, Celery + Redis (async email side effects), Stripe SDK, django-cors-headers. Currently running on SQLite locally (`db.sqlite3`); PostgreSQL is the intended production database (commented in `requirements.txt`).

### 4.3 What Was Implemented (All 5 Migration Phases)

1. **Security and Ownership Foundations** — custom identity model with roles, JWT flows, customer/merchant ownership separated from identity, actor-derived access everywhere. The client-supplied `user_id` trust pattern is gone.
2. **Commercial Surfaces** — merchant-owned catalog, customer cart, checkout preparation, backend-derived order creation (totals computed server-side), order listing and tracking.
3. **Financial Surfaces** — payment attempt records, Stripe payment intent flow, verified and idempotent webhook ingestion, explicit order–payment linkage, COD as a concept.
4. **Fulfillment and Marketplace Operations** — merchant order transitions (accept/reject/prepare/ready), dispatch assignments with **sequential exclusive offers** (replacing the legacy rider self-selection pool), rider profile/location/acceptance/execution flows, customer tracking.
5. **Ops and Hardening** — structured `AuditLog` for sensitive internal actions, admin/ops override APIs, inspection-oriented Django admin.

### 4.4 Architectural Patterns That Define the Codebase

These are the conventions any new backend work must follow (full detail in `docs-pagana-api/pagana-api-development-guide.md`):

1. **Module-owned responsibilities** — each concern has exactly one owning app
2. **Authenticated actor as source of truth** — never trust client-supplied identity
3. **Explicit endpoints over broad CRUD** — purpose-built APIs, no open `ModelViewSet` exposure
4. **Service-led workflow logic** — checkout, payment orchestration, webhooks, dispatch progression live in `services.py`, not views
5. **Explicit state machines** — named states for orders, payments, assignments, offers, merchant readiness
6. **Historical snapshots** — committed orders snapshot product/pricing data
7. **Idempotency where it matters** — checkout confirmation, payment intents, webhook ingestion
8. **Customer history vs internal audit** — `OrderTimelineEvent` (support-facing) is distinct from `AuditLog` (internal)

### 4.5 API Surface

~50 endpoints under `/api/v1/`, fully cataloged in `docs-pagana-api/api-endpoints-reference.md`. Highlights:

- **Identity**: `POST /auth/signup`, `POST /auth/login`, `POST /auth/refresh`, `GET /me`
- **Customer**: profile CRUD, public catalog browsing, cart, checkout, order list/detail/tracking, payment intent creation
- **Merchant**: business profile/status, membership context, product management, order queue and transitions
- **Rider**: rider profile, offer acceptance, assignment detail, location updates
- **Ops**: audited admin override endpoints
- **Integration**: Stripe webhook ingestion

### 4.6 Testing

Test files exist in every app (~1,240 lines total), weighted toward the critical flows: `orders` (266), `payments` (187), `ops` (173), `dispatch`, `identity`, `merchants`, `catalog`, `customers`.

---

## 5. The Clients in Detail

### 5.1 `pagana-web` (Customer Web)

- Tooling fully configured: React 18, Vite, TypeScript, Tailwind, Shadcn UI, TanStack Query, React Router v6
- Folder structure in place (`api/`, `components/`, `features/`, `hooks/`, `pages/`)
- Pages are placeholders only: `LandingPage`, `LoginPage`, `RegisterPage`, `DashboardPage`
- **Nothing is wired to `pagana-api` yet**

### 5.2 `pagana-admin` (Superadmin + Ops Portals)

- Both portals configured with the same React/Vite/Tailwind/Shadcn/React Query stack
- `api/client.ts` exists but no real pages or features built

### 5.3 Mobile Apps (Customer / Vendor / Rider)

- All three are independent Expo projects with unique bundle IDs (`com.pagana.customer|vendor|rider`)
- NativeWind + React Native Paper configured; Metro/Babel/Tailwind config files in place
- Each has only a `HomeScreen.js`; `api/`, `components/`, `navigation/` folders are empty
- `pagana-mobile/` (no suffix) is an empty leftover directory and can likely be deleted

---

## 6. Plans: What Comes Next

### 6.1 Immediate Direction (from existing docs)

The migration foundation is complete, so all future work is **forward development on top of `pagana-api`**, not legacy cleanup. The development guide anticipates that endpoints will be added incrementally as each client UI is built:

- **Customer delivery flow UI** → richer order tracking, address management (multiple saved addresses — the legacy one-address limit was explicitly rejected), live tracking reads
- **Merchant kitchen / ops UI** → richer queue views, readiness signals, reporting reads
- **Rider app** → deeper offer/assignment lifecycle, earnings views (earnings model deliberately deferred), proof-of-delivery handling
- **Finance and support workflows** → refunds, settlement reporting, reconciliation

### 6.2 Backend Areas Intentionally Left Light (Deferred, Not Forgotten)

From `pagana-api-progress.md`:

- broader reporting and reconciliation
- richer internal backoffice tooling
- **real-time dispatch/tracking delivery** — the platform is polling-first today by design; real-time infra (e.g., channels/WebSockets done properly, or push) is a future layer
- deeper finance operations: refunds, settlements, rider earnings
- dispatch ranking, batching, and operational optimization
- magic-link / passwordless auth (deferred — revisit only if the product deliberately keeps it)
- notifications as a dedicated module (concepts exist; centralization can wait)

### 6.3 Suggested Resumption Roadmap

A practical order of attack for picking the project back up:

1. **Re-verify the backend runs locally** — create venv, install `requirements.txt`, run migrations and the test suite, hit `GET /api/v1/health/`
2. **Production hardening pass on `pagana-api`** — switch to PostgreSQL, move secrets to env vars (`python-dotenv`), pin a deploy story (gunicorn/whitenoise are stubbed in requirements)
3. **Build the first real client** — the customer web app (`pagana-web`) is the natural start: auth flow against `/auth/*` + `/me`, storefront browsing, cart, checkout, order tracking. This exercises the largest portion of the API
4. **Merchant surface next** — either `pagana-admin`-style web for merchants or the vendor mobile app: product management + order queue
5. **Rider mobile app** — offers, assignment execution, location updates; this will surface the need for the real-time layer
6. **Admin/ops portals** — wire the existing ops override and audit endpoints into `pagana-superadmin` / `pagana-ops`
7. **Then the deferred backend layers** — real-time delivery, earnings/finance, reporting — driven by what the client builds actually demand
8. **Housekeeping** — delete the empty `pagana-mobile/` directory; decide when `To-Refactor/Pagana-App` can be archived out of the repo; merge or prune stale branches (`dev-git-readme-rw` → `main`)

---

## 7. Documentation Map (Where to Read More)

| Doc | What it covers |
|---|---|
| `docs/system-context.md` | Stable product/architecture context; the shared reference point |
| `docs/migration-analysis.md` | Legacy backend findings, risks, keep/modify/discard decisions |
| `docs/docs-pagana-api/backend-migration-matrix.md` | Surface-by-surface legacy → target migration decisions (the execution map that was followed) |
| `docs/docs-pagana-api/pagana-api-progress.md` | Backend implementation status and the patterns that now define it |
| `docs/docs-pagana-api/api-endpoints-reference.md` | Every implemented endpoint: method, auth, use case |
| `docs/docs-pagana-api/pagana-api-development-guide.md` | How to extend the backend safely; what must never be reintroduced |
| `docs/modules/*.md` | Target-state design per module: identity, merchants, catalog, orders, payments, dispatch |
| `README.md` (repo root) | Multi-platform structure overview and getting-started commands |

---

## 8. Guardrails to Remember When Resuming

- **Never** reintroduce legacy patterns: client-supplied `user_id`, open CRUD viewsets, `fields='__all__'` serializers, `AllowAny` defaults, logic-in-controllers, in-memory real-time coordination
- New backend features go into the **owning module** and follow the service-led, explicit-endpoint, state-machine patterns already established
- The legacy app is a **requirements archive**, not a codebase — consult it only for historical business behavior
- Keep docs separated by lifetime: stable context in `system-context.md`, transitional notes elsewhere; update `api-endpoints-reference.md` as endpoints are added
