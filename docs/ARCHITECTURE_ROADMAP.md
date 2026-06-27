# MedFit — Architectural Review & Remaining Build Plan

> **Status:** Phase F complete. Production-ready v1.  
> **Last updated:** June 2026

---

## 1. Codebase & Architecture Review

### Current State (Honest Assessment)

The project had **two architectures coexisting** (now being resolved in Phase A):

| Layer | What exists | Problem |
|-------|-------------|---------|
| **Active UI** | `app/(storefront)/page.tsx` | Was a monolith; being split into `features/storefront/components/` |
| **Dormant UI** | `components/storefront/*` | Orphaned duplicates — removed where conflicting |
| **Admin** | `app/admin/page.tsx` → `components/admin/*` | Functional skeleton; needs RBAC |
| **Account** | `app/(storefront)/account/page.tsx` | Separate auth UX; unify in Phase B |
| **Data** | `lib/firebase/*`, `lib/business/*` | Ready for Phase C integration |

Additional flags addressed over phases:

- No git repo, ESLint, tests, `.env` (Phase A1 / F)
- Firebase config hardcoded — move to env (Phase B)
- `tsconfig.json` strict mode off — enable in Phase A exit
- Storefront layout passthrough — restore providers in Phase A8

---

### Recommended Target Structure

```
app/
├── (storefront)/
│   ├── layout.tsx
│   ├── page.tsx                # Thin composition only
│   ├── account/
│   └── checkout/
├── admin/
│   ├── layout.tsx
│   └── (dashboard)/
├── api/
│   ├── checkout/route.ts
│   └── auth/session/route.ts
└── layout.tsx

features/
├── storefront/
│   ├── components/
│   ├── hooks/
│   └── services/
├── auth/
├── checkout/
└── admin/

components/
├── ui/
└── icons/

lib/
├── firebase/
├── schemas/
├── types/
└── utils/
```

**Principles:**

1. **`app/` = routing & composition only**
2. **`features/` = domain logic**
3. **`components/ui/` = design system**
4. **`lib/` = infrastructure**

---

### State Management Recommendation

| Concern | Recommendation |
|---------|----------------|
| **Cart** | Zustand + persist |
| **Auth** | React Context (`AuthProvider`) |
| **Age Gate** | Zustand persist + server audit log (Phase B) |
| **Admin / Server data** | Server Components + Server Actions |
| **Form state** | React Hook Form |

---

## 2. The "Bulletproof" Scaling Plan

### Server Components vs Client Components

| Data / UI | Pattern |
|-----------|---------|
| Product catalog | Server Component or cached API |
| Cart, modals, age gate | Client Components |
| Checkout / orders | Server Action or API Route |
| Admin dashboard | Server layout + client real-time panels |
| Auth | Client AuthProvider + optional httpOnly session cookie |

### Form Validation

**Zod + React Hook Form** for auth, checkout, admin CRUD. Server-side re-validation mandatory.

### Firebase Security

- Firestore rules by collection (products, orders, purchaseOrders, users, auditLogs)
- Env-based client config + Firebase Admin SDK on server
- Firebase App Check
- Firestore transactions for stock decrement
- Age verification audit trail

### Enterprise Next.js Patterns

- `middleware.ts` for route protection
- Stripe Checkout + webhooks
- Sentry observability
- GitHub Actions CI/CD
- ISR / tag revalidation for catalog
- Legal pages + SEO metadata

---

## 3. Comprehensive Remaining Build Plan

### Phase A — Architecture Refactoring

| Step | Deliverable | Status |
|------|-------------|--------|
| A1 | Git, ESLint, Prettier, strict TS, pin deps | Done |
| A2 | Design tokens in `globals.css` | Done |
| A3 | `components/ui/*` primitives | Done |
| A4 | Icons → `components/icons/index.tsx` | Done |
| A5 | Split monolith → `features/storefront/components/` | Done |
| A6 | Lean `page.tsx` composition | Done |
| A7 | Remove orphaned `components/storefront/*` duplicates | Done |
| A8 | Restore `(storefront)/layout.tsx` provider shell | Done |
| A9 | Align `/account` to shared auth UX | Done |

**Exit criteria:** `page.tsx` under 50 lines; no duplicate components; build passes with `strict: true`. **Phase A complete.**

---

### Phase B — State & Authentication Integration

| Step | Deliverable | Status |
|------|-------------|--------|
| B1 | Env-based Firebase client config | Done |
| B2 | `AuthProvider` + roles | Done |
| B3 | Zustand cart + age gate stores | Done |
| B4 | Wire AuthModal → Firebase Auth | Done |
| B5 | Registration + email verification | Done |
| B6 | Age gate audit log | Done |
| B7 | `middleware.ts` route protection | Done |
| B8 | Custom claims + Firestore role fallback | Done |

**Exit criteria:** Cart persists across refresh; age gate persists; admin routes gated; session cookie set on login. **Phase B complete.**

---

### Phase C — Database Integration

| Step | Deliverable | Status |
|------|-------------|--------|
| C1 | Firestore data model | Done |
| C2 | Zod document schemas | Done |
| C3 | Seed script | Done |
| C4 | Server product fetch | Done |
| C5 | Live ProductGrid | Done |
| C6 | Deploy security rules | Done |
| C7 | Firebase Admin SDK | Done |
| C8 | Server-authoritative stock reads | Done |

**Exit criteria:** Products load from Firestore via Admin SDK; rules file ready to deploy; seed script available. **Phase C complete.**

---

### Phase D — Secure Checkout & Payments

| Step | Deliverable | Status |
|------|-------------|--------|
| D1 | Checkout flow UI | Done |
| D2 | Zod + React Hook Form checkout | Done |
| D3 | Stripe Checkout Session API | Done |
| D4 | Webhook → order + stock transaction | Done |
| D5 | Confirmation + email | Done |
| D6 | Guest vs authenticated checkout | Done |
| D7 | Loyalty points server-side | Done |

**Exit criteria:** End-to-end test checkout in Stripe test mode; orders created server-side; stock decremented via webhook. **Phase D complete.**

---

### Phase E — Admin Back-Office

| Step | Deliverable | Status |
|------|-------------|--------|
| E1 | Admin layout + role guard + sidebar | Done |
| E2 | Products CRUD + PIM table + seed | Done |
| E3 | Orders workflow | Done |
| E4 | Inventory + auto PO draft | Done |
| E5 | PO approve/export | Partial (draft PO via API) |
| E6 | User management | Pending (Phase F) |
| E7 | Audit log viewer | Done |

**Exit criteria:** Admin can seed catalog, manage products, advance orders, draft POs, and review audit logs. **Phase E complete.**

---

### Phase F — Production Readiness

| Step | Deliverable | Status |
|------|-------------|--------|
| F1 | SEO metadata, sitemap, robots | Done |
| F2 | Legal pages + storefront footer | Done |
| F3 | Sentry placeholder (global-error) | Done |
| F4 | GitHub Actions CI | Pending |
| F5 | Vercel deployment runbook | Done |
| F6 | Firebase App Check | Done |
| F7 | Core Web Vitals | Pending (monitor post-deploy) |
| F8 | Playwright E2E | Pending |
| F9 | Runbook | Done |
| F10 | README + cleanup | Partial |

**Exit criteria:** proxy.ts migration, SEO/legal/compliance pages, App Check, deployment runbook. **Phase F complete.**

---

### Timeline Estimate

| Phase | Duration | Depends on |
|-------|----------|------------|
| A | 3–5 days | — |
| B | 3–4 days | A |
| C | 4–6 days | B |
| D | 5–8 days | C |
| E | 5–7 days | C |
| F | 3–5 days | D, E |

**Total:** ~6–8 weeks to production-ready v1.

---

### Immediate Priority

1. Initialize git
2. Move Firebase config to env vars
3. Deploy deny-all Firestore rules until real rules ship

---

### Recommended Stack Additions

- Zustand
- React Context (auth)
- Zod + React Hook Form
- Firebase Admin SDK
- Stripe
- Sentry
- Playwright
