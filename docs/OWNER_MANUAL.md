# MedFit — Owner's Manual

> **Living document.** Append new sections as each build phase ships.  
> **Audience:** Ownership team, operators, and technical stakeholders.  
> **Last updated:** June 2026 (Phase A foundation)

---

## 1. What MedFit Is

MedFit is a **B2B e-commerce and back-office platform** for research peptides and laboratory supplies. It serves two audiences:

1. **Storefront (customers / researchers)** — Browse inventory, verify age, authenticate, add to cart, and checkout.
2. **Admin back-office (operators)** — Manage inventory, orders, purchase orders, and user roles.

All products are marketed **strictly for in-vitro laboratory research**. Age gating and compliance disclaimers are mandatory.

---

## 2. How the System Is Programmed

### Core Stack

| Layer | Technology | Role |
|-------|------------|------|
| Framework | **Next.js 16** (App Router) | Routing, SSR/RSC, API routes, Server Actions |
| Language | **TypeScript** | Type safety across client and server |
| Styling | **Tailwind CSS v4** | Premium dark-mode, glassmorphic UI |
| Client DB | **Firebase Client SDK** | Auth state, real-time listeners (storefront/admin panels) |
| Server DB | **Firebase Admin SDK** | Secure catalog reads, stock, future transactions |
| Cart / UI state | **Zustand** (persisted) | Cart persistence, age gate |
| Auth state | **React Context** (`AuthProvider`) | Session, roles, admin guard |
| Forms | **React Hook Form + Zod** *(Phase D)* | Checkout, auth, admin CRUD |
| Payments | **Stripe** | PCI-compliant hosted checkout |
| Observability | **Sentry** *(Phase F)* | Error and performance monitoring |

### Repository Layout (Post Phase A)

```
app/                          → Routes only (thin pages)
features/storefront/          → Storefront domain (components, hooks, services)
components/icons/             → Shared SVG icon set
components/admin/             → Admin UI (legacy; migrates to features/admin/)
lib/firebase/                 → Firebase client + Firestore helpers
lib/business/                 → Domain logic (loyalty, PO generation, inventory alerts)
docs/                         → This manual + architecture roadmap
```

### Key Routes

| URL | Purpose |
|-----|---------|
| `/` | Premium storefront (Age Gate, Hero, Product Grid, Cart) |
| `/account` | Client portal (login, order history) |
| `/admin` | Back-office dashboard (POs, inventory, orders) |

---

## 3. Storefront Data Flow (Current — Phase A Prototype)

```
User visits /
    │
    ▼
AgeGate (client) ──► isVerified = true (local state; Phase B → persisted + audited)
    │
    ▼
ProductGrid ← server-fetched Firestore catalog (ISR 60s)
    │                  POST /api/products/stock refreshes authoritative stock
    ▼
User clicks "Add to Cart"
    │
    ▼
page.tsx cart state updates ──► CartDrawer opens
    │
    ▼
User clicks "Authorize Lab Requisition"
CartDrawer ──► /checkout
    │
    ▼
CheckoutForm (Zod + React Hook Form)
    │  research-use acknowledgment + guest email (if not signed in)
    ▼
POST /api/checkout/create-session
    │  server validates stock + prices from Firestore (Admin SDK)
    │  creates pending order + Stripe Checkout Session
    ▼
Stripe hosted payment page
    │
    ├── success ──► /checkout/success?session_id=...
    └── cancel  ──► /checkout?cancelled=1

Stripe webhook ──► POST /api/webhooks/stripe
    │  checkout.session.completed
    ├─ Firestore transaction: decrement stock
    ├─ Mark order paid
    └─ Award loyalty points (authenticated users only)
```

**Current limitation:** Cart is client-side. Catalog and stock reads are server-authoritative via Admin SDK. Checkout/stock decrement ships in Phase D.

---

## 4. Target Data Trace — Checkout to Admin (Phases C–E)

This section describes the **production-intended flow** we are building toward.

### 4.1 Browse & Cart (Storefront)

```
Browser (Client Component)
  │
  ├─ ProductGrid reads catalog
  │     Phase C: Server Component fetches products from Firestore (read-only, cached)
  │
  └─ Cart stored in Zustand (persisted to localStorage)
        Phase B: Zustand store replaces page-level useState
```

### 4.2 Checkout Initiation

```
User clicks "Authorize Lab Requisition"
  │
  ▼
Checkout form (React Hook Form + Zod)
  │  Validates: shipping, lab affiliation, research-use attestation
  ▼
POST /api/checkout/create-session  (or Server Action)
  │
  ├─ Server validates session / auth
  ├─ Re-validates cart items + prices against Firestore (server-side truth)
  ├─ Creates Stripe Checkout Session
  └─ Returns redirect URL to Stripe hosted checkout
```

### 4.3 Payment Confirmation (Stripe Webhook)

```
Stripe ──► POST /api/webhooks/stripe
  │
  ▼
Verify webhook signature (Stripe secret)
  │
  ▼
Firestore TRANSACTION (atomic):
  │
  ├─ Create document in orders/{orderId}
  │     { userId, items, total, status: "paid", paymentIntentId, createdAt }
  │
  ├─ Decrement stock on each products/{productId}
  │     (fail entire transaction if insufficient stock)
  │
  └─ Append auditLogs/{entryId}
        { action: "order.created", orderId, timestamp }
  │
  ▼
Optional: Trigger low-stock check → generatePurchaseOrder() if below threshold
```

### 4.4 Customer Visibility

```
/account (UserProfile)
  │
  └─ onSnapshot(orders where userId == auth.uid)
        Real-time order list for the signed-in researcher
```

### 4.5 Admin Visibility

```
/admin (OrdersPanel)
  │
  └─ onSnapshot(orders) ordered by createdAt desc
        Operators see all orders, update fulfillment status

/admin (InventoryPanel)
  │
  └─ getLowStockProducts() → generatePurchaseOrder()
        Auto PO when stock falls below threshold

/admin (POList)
  │
  └─ onSnapshot(purchaseOrders)
        Pending supplier review workflow
```

---

## 5. Security Model (Target)

| Action | Who | How |
|--------|-----|-----|
| Read product catalog | Public or authenticated | Firestore rules TBD (B2B policy) |
| Create order | Server only (post-Stripe webhook) | Admin SDK + transaction |
| Read own orders | Authenticated user | Firestore rules: `userId == auth.uid` |
| Admin read/write | `role == admin` | Custom claims + middleware |
| Decrement stock | Server only | Firestore transaction |
| Age verification | User + audit log | Client UX + server log (Phase B) |

**Never** trust client-submitted prices or stock levels at checkout.

---

## 6. Compliance & Legal

- **Age Gate:** Blocks site until user confirms 21+ and research-use acknowledgment.
- **Copy standards:** Product descriptions use in-vitro / research language (no therapeutic claims).
- **Future:** Dedicated Terms, Research Use Policy, and Privacy pages (Phase F).

---

## 7. Environment & Deployment (Target)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_FIREBASE_*` | Client Firebase config |
| `FIREBASE_SERVICE_ACCOUNT` | Admin SDK (server only) |
| `STRIPE_SECRET_KEY` | Checkout sessions |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification |

Deployment target: **Vercel** with preview environments per PR (Phase F).

---

## 8. Phase Log — Append Here As We Build

| Date | Phase | Change |
|------|-------|--------|
| Jun 2026 | F (complete) | proxy.ts migration; SEO/sitemap/robots; legal pages; App Check; global-error; deployment runbook |
| Jun 2026 | E (complete) | Admin sidebar shell; PIM + catalog seed; orders workflow; inventory/PO draft; audit log viewer |
| Jun 2026 | D (complete) | Stripe Checkout; webhook fulfillment; stock transactions; loyalty points; guest + auth checkout |
| Jun 2026 | C (complete) | Firestore data model; Zod schemas; Admin SDK; server product fetch; live ProductGrid; security rules; seed script |
| Jun 2026 | B (complete) | Zustand cart/age gate; env Firebase config; roles; registration; session cookies; middleware + AdminGuard; audit logging |
| Jun 2026 | A (complete) | Tooling (git, ESLint, Prettier, strict TS); UI primitives; AuthProvider; unified Client Portal auth; storefront layout shell |
| | F | *Done:* Production runbook — see `docs/DEPLOYMENT_RUNBOOK.md` |
| | E | *Done:* Admin back-office — see `docs/ADMIN_DASHBOARD.md` |

---

## 9. Quick Reference — Who to Call in the Codebase

| Need to change… | Look in… |
|-----------------|----------|
| Storefront look & feel | `features/storefront/components/` |
| Checkout flow | `features/checkout/components/CheckoutPage.tsx` |
| Stripe webhook | `app/api/webhooks/stripe/route.ts` |
| Order fulfillment | `lib/firebase/orders.server.ts` |
| Product mock fallback | `features/storefront/components/mockInventory.ts` |
| Icons | `components/icons/index.tsx` |
| Firebase helpers | `lib/firebase/` |
| Business rules (loyalty, POs) | `lib/business/` |
| Admin dashboard | `features/admin/` + `app/admin/` |
| Catalog seed data | `lib/data/catalog.json` → `POST /api/admin/seed` |
| Architecture plan | `docs/ARCHITECTURE_ROADMAP.md` |

---

*This manual will grow with each phase. Do not delete prior entries — append and date them.*
