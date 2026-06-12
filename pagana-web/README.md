# Pagana Web — Customer Frontend

React + Vite customer web app for the Pagana food-delivery marketplace. Wired to `pagana-api` for auth, storefront browsing, cart, checkout (COD + Stripe card), order history, and live order tracking.

## Status

**v1 complete (M0–M7).** The app is a working customer surface — not a skeleton. Core journeys are covered by 62 Vitest unit tests and 4 Playwright e2e specs; CI runs lint, typecheck, build, unit tests, backend tests, and e2e on pull requests.

## Stack

- React 18, Vite 5, TypeScript
- Tailwind CSS + Shadcn UI
- TanStack Query, React Router v6, Axios
- React Hook Form + Zod
- Stripe Elements (`@stripe/react-stripe-js`)
- Vitest + Testing Library; Playwright for e2e

## Quick start

**Option A — one command (repo root):**

```bash
./start-dev.sh
```

**Option B — two terminals:**

```bash
# Terminal 1 — backend
cd pagana-api
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed_demo_data   # first time / empty DB
.venv/bin/python manage.py runserver 8000

# Terminal 2 — frontend
cd pagana-web
npm install
npm run dev
```

Open `http://localhost:5173`. Demo customer: `customer@demo.pagana.local` / `DemoPass123!`

### Environment

`.env.development` (committed default):

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Card payments require Stripe test keys and local webhook forwarding — see `pagana-api/README.md`.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server (port 5173) |
| `npm run build` | Typecheck + production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright journeys (starts API on :8001, web on :5174) |
| `npm run test:e2e:ui` | Playwright UI mode |

## Routes (customer)

| Path | Page |
|---|---|
| `/` | Landing + restaurant list |
| `/merchants/:id` | Storefront + product dialog |
| `/cart` | Cart management |
| `/checkout` | Delivery details → review → confirm |
| `/orders/:publicId/pay` | Stripe card payment |
| `/orders/:publicId/payment-status` | Payment polling |
| `/orders/:publicId/confirmation` | Order placed |
| `/orders`, `/orders/:publicId` | History + detail + tracking stepper |
| `/account` | Profile edit |
| `/dashboard` | Account home (recent orders) |
| `/login`, `/register` | Auth |

## Project layout

```
src/
├── api/           # Axios client + React Query hooks (auth, catalog, cart, checkout, orders, payments)
├── components/    # Shared UI (ErrorBoundary, AppLayout, …)
├── features/      # Feature modules (auth, cart, checkout, …)
├── lib/           # queryClient, toast errors, Stripe, currency
├── pages/         # Route pages
└── router.tsx     # Protected / guest-only routes
e2e/
├── journeys/      # Four core Playwright specs
└── helpers/       # Programmatic login, cart polling
```

## Testing

**Unit tests** — `npm test` (Vitest, jsdom).

**E2e** — Playwright spins a dedicated backend (`e2e.sqlite3`, fresh seed per run) and Vite on alternate ports so dev servers on 8000/5173 can stay running:

```bash
CI=true npm run test:e2e
```

Journeys: guest browse, register/login persistence, cart + cross-merchant switch, COD checkout → order detail.

## Architecture notes

- JWT access + refresh tokens in `localStorage`; single-flight refresh on 401
- Global `ErrorBoundary` + QueryClient `onError` → Sonner toasts (inline field errors stay on forms)
- Order tracking polls every 12s while status is in-flight
- Cross-merchant cart conflict: clear cart then add (dialog flow)

## Docs

- WBS & milestone detail: `docs/docs-pagana-web/pagana-web-wbs.md`
- API reference: `docs/docs-pagana-api/api-endpoints-reference.md`
- Project summary: `docs/project-progress-summary.md`
