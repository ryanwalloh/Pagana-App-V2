# Pagana Backend Migration Matrix

## Purpose

This document translates the legacy backend analysis into an execution-oriented migration matrix for `pagana-api`.

It connects:

- the legacy backend surfaces in `To-Refactor/Pagana-App`
- the target module boundaries already documented
- the migration decision for each surface

This is the bridge between architecture documentation and implementation planning.

Read this together with:

- `docs/system-context.md`
- `docs/migration-analysis.md`
- `docs/modules/identity.md`
- `docs/modules/merchants.md`
- `docs/modules/catalog.md`
- `docs/modules/orders.md`
- `docs/modules/payments.md`
- `docs/modules/dispatch.md`

## Decision Legend

- `rewrite`: rebuild in the target module; do not carry implementation over
- `concept-only`: keep the business idea, not the code
- `partial`: selectively reuse data shape or logic after redesign
- `discard`: remove from the target backend model
- `defer`: do not design or migrate yet; revisit later if product needs it

## Migration Principles

These rules apply across the whole matrix:

- do not port legacy view or controller code directly into `pagana-api`
- do not preserve client-supplied `user_id` as a trust model
- do not preserve broad DRF CRUD exposure
- preserve domain concepts and workflow intent where useful
- move responsibilities into the target modules already documented
- prefer explicit APIs and ownership boundaries over legacy route parity

## Target Module Map

The target modules used in this matrix are:

- `identity`
- `merchants`
- `catalog`
- `orders`
- `payments`
- `dispatch`
- `customer profile` (required conceptually, not yet fully documented)
- `ops/admin` (required conceptually, not yet fully documented)

## Suggested Execution Order

Recommended implementation order based on dependency flow:

1. `identity`
2. `merchants`
3. `catalog`
4. `orders`
5. `payments`
6. `dispatch`
7. `customer profile`
8. `ops/admin`

This order matches the currently documented module boundaries and reduces architectural backtracking.

---

## 1. Platform and Router Surfaces

| Legacy Surface | Current Purpose | Target Module | Decision | Target Direction | Notes |
|---|---|---|---|---|---|
| `soti_delivery/urls.py` router: `/api/users/` | Open CRUD for users | `identity` | `rewrite` | Replace with explicit auth, account, and admin-controlled identity APIs | Do not preserve `ModelViewSet` exposure |
| `soti_delivery/urls.py` router: `/api/products/` | Open CRUD for products | `catalog` | `rewrite` | Replace with public catalog read APIs and merchant-auth product management APIs | Must enforce merchant ownership |
| `soti_delivery/urls.py` router: `/api/orders/` | Open CRUD for orders | `orders` | `rewrite` | Replace with role-scoped order APIs | Unrestricted CRUD must not survive |
| `soti_delivery/urls.py` router: `/api/order-lines/` | Open CRUD for order items | `orders` | `discard` | Order items should not be managed as independent public CRUD resources | Items belong under the order aggregate |
| `soti_delivery/urls.py` router: `/api/rider-locations/` | Open CRUD for rider locations | `dispatch` | `rewrite` | Replace with rider-auth location update APIs and controlled tracking reads | Current shape is unsafe |
| Root mixed includes under `soti_delivery/urls.py` | Combines HTML, JSON, DRF, and app routes | all target modules | `rewrite` | Replace with versioned API route layout under `pagana-api` | No server-rendered backend routing in target API |

---

## 2. Identity and Auth Surfaces

| Legacy Surface | Current Purpose | Target Module | Decision | Target Direction | Notes |
|---|---|---|---|---|---|
| `users.models.User` | Custom user with role and phone fields | `identity` | `partial` | Keep custom user concept; redesign fields and role semantics | Keep compact and avoid profile sprawl |
| `users.models.SMSVerification` | Verification codes with expiry and attempts | `identity` | `concept-only` | Keep verification workflow concept; redesign storage and flow | Good conceptual input |
| `users.views.UserViewSet` | Full user CRUD via API | `identity` | `discard` | Replace with explicit identity and admin APIs only | Current serializer is unsafe |
| `users/serializers.py` with `fields='__all__'` | Unrestricted user serialization | `identity` | `discard` | Replace with purpose-specific serializers | Must not be reused |
| `users/send-verification-code/` | Signup verification start | `identity` | `rewrite` | Move into structured signup and verification flow | Preserve expiry and retry concepts |
| `users/verify-sms-code/` | Verification plus account creation | `identity` + adjacent modules | `rewrite` | Split identity creation from role-specific profile creation | Current flow mixes multiple module concerns |
| `users/resend-verification-code/` | Verification retry | `identity` | `rewrite` | Keep capability with rate limiting and auditability | Useful feature to retain |
| `core/request-magic-link/` | Magic-link login initiation | `identity` | `defer` | Support only if product deliberately keeps passwordless flow | Not core for v1 |
| `core/magic-link-login/<token>/` | Magic-link completion | `identity` | `defer` | Revisit only if passwordless auth is kept | Avoid keeping by inertia |
| `core/loginByPassword/` | Password login returning role-specific payloads | `identity` | `rewrite` | Replace with token-based login and `GET /me` pattern | Do not return mixed role profile payloads here |
| `core/registerAccount/` | Generic registration path | `identity` + adjacent modules | `rewrite` | Replace with explicit signup plus downstream profile creation flow | Current logic creates too many side effects in one controller |

---

## 3. Merchant / Restaurant Surfaces

| Legacy Surface | Current Purpose | Target Module | Decision | Target Direction | Notes |
|---|---|---|---|---|---|
| `restaurant.models.Restaurant` | Merchant business record | `merchants` | `partial` | Keep merchant entity concept; redesign ownership and state model | `is_approved` concept should survive |
| `core/getRestaurants/` | Public approved storefront listing | `merchants` + `catalog` | `rewrite` | Replace with explicit public merchant/storefront APIs | Approval and visibility should be module-driven |
| `restaurant/<id>/` storefront detail | Merchant storefront page | `merchants` + `catalog` | `rewrite` | Replace with API-backed storefront detail endpoints | HTML view should not be ported |
| `restaurant/dashboard/` and `core/restaurant-home/` | Merchant dashboard | `orders` + `merchants` | `rewrite` | Split merchant profile and status concerns from merchant order queues | Current view mixes profile and order ops |
| `restaurant/order/<id>/accept/` | Merchant accepts order | `orders` | `rewrite` | Keep as merchant-scoped order action | Authorized through merchant ownership |
| `restaurant/order/<id>/reject/` | Merchant rejects order | `orders` | `rewrite` | Keep as merchant-scoped order action | Likely needs reason capture later |
| `restaurant/prepare-order/` | Merchant marks preparing | `orders` | `rewrite` | Keep as explicit merchant order transition | Important dispatch signal |
| `restaurant/pending-orders/` | Merchant order queue | `orders` | `rewrite` | Replace with merchant order listing APIs | Avoid bespoke serializer shape |
| `Restaurant.is_approved` | Merchant approval flag | `merchants` | `concept-only` | Replace with approval, visibility, and readiness distinctions | Good domain input, weak final model |

---

## 4. Catalog / Product Surfaces

| Legacy Surface | Current Purpose | Target Module | Decision | Target Direction | Notes |
|---|---|---|---|---|---|
| `menu.models.Product` | Product entity | `catalog` | `partial` | Keep basic product concept; redesign orderability and visibility | Good starting point |
| `menu/serializers.py` with `fields='__all__'` | Unrestricted product serialization | `catalog` | `discard` | Replace with public and merchant-specific serializers | Do not reuse as-is |
| `ProductViewSet` | Product CRUD | `catalog` | `rewrite` | Replace with explicit public read and merchant write APIs | Must enforce merchant ownership |
| `restaurant/add-product/` | Merchant product creation | `catalog` | `rewrite` | Replace with merchant-auth catalog management APIs | Belongs to catalog, not merchants |
| `core/getRestaurantProducts/<id>/` | Public storefront product listing | `catalog` | `rewrite` | Replace with merchant catalog listing endpoints | Must enforce visibility and orderability |
| Product image field and storefront display data | Product presentation | `catalog` | `partial` | Keep image and media concept; keep schema simple initially | No need to overdesign media in v1 |
| Categories / inventory / availability | Not really modeled in legacy | `catalog` | `defer` / `rewrite` | Add only item-level visibility and orderability in early phases; richer structures later | No meaningful legacy logic to migrate |

---

## 5. Customer Profile and Address Surfaces

| Legacy Surface | Current Purpose | Target Module | Decision | Target Direction | Notes |
|---|---|---|---|---|---|
| `customer.models.Customer` | Customer profile record | `customer profile` | `partial` | Keep profile concept; reduce duplication with identity | Profile should not hold identity truth |
| `customer.models.Address` | One address per user | `customer profile` | `rewrite` | Support explicit address management and likely multiple saved addresses later | One-to-one is too limiting |
| `core/saveAddress/` | Mobile address save using `user_id` | `customer profile` | `rewrite` | Replace with authenticated customer address APIs | Never trust client user IDs |
| `core/getUserAddress/` | Mobile address fetch | `customer profile` | `rewrite` | Replace with authenticated customer address reads | Current flow mixes identity lookup behavior |
| `customer/save_address/` | Web/session address update | `customer profile` | `rewrite` | Replace with API-driven address management | HTML form flow should not be ported |
| `customer/update_personal_details/` and `core/updatePersonalDetails/` | Profile updates | `identity` + `customer profile` | `rewrite` | Split identity fields from customer profile fields | Current flow blurs ownership |

---

## 6. Cart, Checkout, and Orders Surfaces

| Legacy Surface | Current Purpose | Target Module | Decision | Target Direction | Notes |
|---|---|---|---|---|---|
| `menu.models.CartItem` | Cart item persistence in menu app | `orders` | `concept-only` | Keep cart concept; move ownership into orders module | Must stop living under catalog boundary |
| `menu/add-to-cart/` | Cart add for session-auth web flow | `orders` | `rewrite` | Replace with authenticated cart APIs | Keep merchant-scoped cart invariant |
| `core/addToCart/` | Mobile cart add using `user_id` | `orders` | `rewrite` | Replace with authenticated cart APIs | Current trust model is unsafe |
| `core/removeFromCart/` | Mobile cart removal using `user_id` | `orders` | `rewrite` | Replace with authenticated cart APIs | |
| `menu/get-cart-json/` | Cart read endpoint | `orders` | `rewrite` | Replace with `GET /cart` and item-level APIs | |
| `customer/checkout/` | Server-rendered checkout page | `orders` + `customer profile` | `rewrite` | Replace with API-driven checkout preparation | HTML flow should not be ported |
| `customer/finalize_order/` | Session-based order creation | `orders` | `rewrite` | Keep checkout-to-order concept; rebuild as atomic API flow | |
| `core/placeOrder/` | Mobile order creation using `user_id` and client total | `orders` | `rewrite` | Replace with backend-derived checkout and order creation | Major security and consistency issue |
| `orders.models.Order` | Core order aggregate | `orders` | `partial` | Keep order concept and high-level state model; redesign ownership and snapshots | Important base concept |
| `orders.models.OrderLine` | Order item concept | `orders` | `partial` | Keep item concept; redesign as order snapshot item | |
| `core/getOrderStatus/<id>/` | Mobile order tracking | `orders` | `rewrite` | Replace with authenticated customer order detail and tracking APIs | |
| `customer/api/order-status/<id>/` | Web/session order status | `orders` | `rewrite` | Unify with target order detail APIs | |
| `core/getCustomerOrders/` | Customer order history using `user_id` | `orders` | `rewrite` | Replace with authenticated customer order listing | |
| `customer/order_complete/<id>/` | HTML order completion and tracking page | `orders` | `rewrite` | Replace with client-driven order detail consumption | |
| `orders/prepare/`, `orders/ready/`, `orders/arrived/` | Merchant-side status transitions | `orders` | `rewrite` | Keep capability, but express through role-scoped order action APIs | `arrived` legacy naming needs cleanup |
| `restaurant` merchant order actions | Merchant operational order transitions | `orders` | `rewrite` | Consolidate under one target merchant-order action surface | Avoid scattered transition endpoints |

---

## 7. Payments Surfaces

| Legacy Surface | Current Purpose | Target Module | Decision | Target Direction | Notes |
|---|---|---|---|---|---|
| Order payment-related fields (`payment_method`, `payment_status`, Stripe IDs) | Payment summary mixed into order model | `payments` + `orders` | `partial` | Keep payment summary concept; move processor interaction into payments module | Orders may retain summary or reference only |
| `core/api/stripe/create-payment-intent/` | Stripe intent creation using client total and `user_id` | `payments` | `rewrite` | Rebuild behind backend-derived payable amount and authenticated context | |
| `core/api/stripe/confirm-payment/` | Confirm payment then create order | `payments` + `orders` | `rewrite` | Split payment orchestration from order creation responsibility | Current coupling is a key anti-pattern |
| `core/api/stripe/webhook/` | Stripe webhook handling | `payments` | `rewrite` | Keep webhook verification concept; rebuild as idempotent payment event ingestion | |
| Cash on delivery as stored `payment_method` | COD support | `payments` + `orders` | `concept-only` | Keep COD as a supported payment method in target design | |
| Legacy Stripe docs in `To-Refactor/Pagana-App/docs` | Historical payment implementation notes | `payments` | `concept-only` | Use as reference only; do not port assumptions blindly | |

---

## 8. Dispatch, Rider Ops, and Live Delivery Surfaces

| Legacy Surface | Current Purpose | Target Module | Decision | Target Direction | Notes |
|---|---|---|---|---|---|
| `rider.models.Rider` | Rider operational profile with availability | `dispatch` + rider-operational data | `partial` | Keep rider operational profile concept; separate from identity core | |
| `Rider.is_available` and `rider/status/`, `toggle-status/` | Simple rider availability toggle | `dispatch` | `concept-only` | Replace with richer rider dispatch state model | |
| `rider/fetch-orders/` and `get_available_orders` | Shared pool of unassigned orders for rider browsing | `dispatch` | `discard` | Do not preserve as the primary dispatch model | Replaced by exclusive sequential offers |
| `rider/update-order-status/` | Rider self-assignment and delivery status updates | `dispatch` + `orders` | `rewrite` | Keep rider execution state updates, but remove self-service queue assignment behavior | |
| `rider/update-order-with-proof/` | Delivery proof upload and state update | `dispatch` + `orders` | `rewrite` | Keep proof concept, but attach to assignment and execution lifecycle | |
| `rider/fetch-order-details/` | Rider assigned-order detail | `dispatch` | `rewrite` | Replace with rider assignment detail APIs | |
| `rider/recent-transactions/` | Rider delivery history | `dispatch` + ops/reporting | `rewrite` | Keep rider historical activity concept; authenticate by rider context only | |
| `rider/add_earnings/` | Direct rider earnings creation endpoint | `dispatch` / ops / finance | `discard` | Do not expose as direct mutation endpoint | High abuse risk |
| `rider/fetch_updated_earnings/` | Rider earnings refresh | `dispatch` / finance | `defer` | Revisit after finance and earnings model is defined | Not enough target clarity yet |
| `delivery/update-rider-location/` | Rider location update | `dispatch` | `rewrite` | Keep capability as rider-auth active-job location update | |
| `delivery/rider-location/<id>/` | Public rider tracking lookup | `dispatch` | `rewrite` | Keep tracking capability with strong access control and purpose limits | Current shape is too open |
| `orders/sse-stream/`, `orders/signals.py`, `orders/consumers.py` | Rider notification and real-time count updates | `dispatch` | `rewrite` | Replace with infrastructure-backed real-time offer and assignment delivery | Do not keep in-memory coordination |

---

## 9. Notifications and Verification Delivery Surfaces

| Legacy Surface | Current Purpose | Target Module | Decision | Target Direction | Notes |
|---|---|---|---|---|---|
| `users/sms_service.py` | Verification delivery via email-first service | `identity` + future `notifications` | `partial` | Keep outbound verification delivery concept; redesign behind adapters | Name and implementation are mismatched |
| Email sending inside `core` magic-link and registration flows | Inline notification side effects | `identity` / future `notifications` | `rewrite` | Move behind module-owned services and async delivery where appropriate | |
| Notification side effects mixed into controllers | Controller-embedded delivery behavior | future `notifications` | `rewrite` | Centralize outbound event delivery later | Enough concept exists; full module can wait |

---

## 10. Demo, HTML, and Legacy-Only Surfaces

| Legacy Surface | Current Purpose | Target Module | Decision | Target Direction | Notes |
|---|---|---|---|---|---|
| `demo` app routes and dashboard | Demo-only HTML dashboard | `ops/admin` or none | `discard` | Do not migrate as part of target API | Only revisit if an ops dashboard truly needs similar metrics |
| `customer-home/`, `restaurant-home/`, `rider-home/` | Server-rendered role home pages | none in backend API | `discard` | Replace with frontend apps consuming APIs | |
| Template-driven checkout, storefront, rider pages | Server-rendered client UI | none in backend API | `discard` | Move entirely to client applications | |
| Session-cart synchronization logic in `restaurant/views.py` | Hybrid session and DB cart behavior | `orders` | `discard` | Do not keep hybrid session cart architecture | |

---

## 11. Cross-Cutting Risks by Migration Area

| Area | Main Risk | Mitigation |
|---|---|---|
| Identity | Carrying forward client-supplied identity and mixed auth models | Implement token-based auth first and make every protected action derive actor from auth context |
| Merchants | Blurring merchant business state with merchant user identity | Keep merchant business entity separate from identity and role membership |
| Catalog | Letting cart and checkout stay coupled to product management | Keep cart under orders; catalog owns only live sellable items |
| Orders | Preserving controller-level order creation and client total trust | Rebuild checkout and order creation as backend-derived, atomic workflows |
| Payments | Repeating Stripe-in-controller coupling | Isolate processor logic in payments and keep idempotent webhook handling |
| Dispatch | Preserving rider self-selection queue behavior | Implement sequential exclusive offers and explicit assignment records |
| Customer profile | Keeping one-address-only and mixed identity/profile updates | Separate identity and customer profile ownership cleanly |
| Real-time | Reusing in-memory or ad hoc event coordination | Use persistent state plus infrastructure-backed messaging |

---

## 12. Implementation Phase View

### Phase 1: Security and Ownership Foundations

- rebuild identity
- define merchant ownership
- define customer profile ownership
- remove legacy trust patterns from target APIs

### Phase 2: Commercial Surfaces

- rebuild catalog
- rebuild cart
- rebuild checkout
- rebuild order listing and tracking

### Phase 3: Financial Surfaces

- rebuild payment intent and payment attempt flows
- rebuild webhook processing
- link orders and payments through explicit module boundaries

### Phase 4: Fulfillment and Marketplace Operations

- rebuild dispatch
- rebuild rider location and assignment
- rebuild merchant operational order actions

### Phase 5: Ops and Hardening

- add auditability
- add admin or ops override surfaces
- add reporting and reconciliation where needed

## Recommendation

This matrix should be treated as the working migration map for backend implementation.

The most important takeaway is:

- migrate concepts, not controller code
- rebuild route surfaces around target module ownership
- use this matrix to decide what gets rewritten first and what should never be ported at all

If a legacy surface does not map cleanly to a target module, that is usually a sign that the legacy implementation was blending responsibilities and should be redesigned rather than copied.
