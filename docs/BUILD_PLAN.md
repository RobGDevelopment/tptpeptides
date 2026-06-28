# BUILD_PLAN.md — TPT Peptides Master Architecture & Commercialization Engine

> **Status:** Phases 0–5 + Sprints A–E + B2 + **F/G Financial OS** complete (flag-gated) · **Blocked:** Sprint F503A (503A — FDA PCAC)  
> **Last reviewed:** June 2026  
> **Live deploy:** [medfit-pro.vercel.app](https://medfit-pro.vercel.app)  
> **Companion docs:** [MASTER_ARCHITECTURE_V2.md](./MASTER_ARCHITECTURE_V2.md) · [EXECUTION_PLAN.md](./EXECUTION_PLAN.md) · [Rollout Guide](/admin/rollout)

---

## 1. Executive Summary & Core Objectives

TPT Peptides is an enterprise-grade ERP, compliance engine, and multi-tenant e-commerce platform built on **Next.js**, **Vercel**, and **Firebase**.

The primary business objective is to aggressively scale revenue while maintaining strict regulatory compliance and shielding the core business from high-risk merchant account shutdowns. To achieve this, the system operates distinct, ring-fenced operational lanes from a single codebase:

| Lane | Audience | Payment rail | Risk profile |
|------|----------|--------------|--------------|
| **B2B Institutional Hub** | Research labs, compounding pharmacies | High-risk card gateway (Authorize.net / NMI) | Underwriter-audited, high-friction |
| **B2C Retail Fleet** | Direct-to-consumer | ACH / crypto (no cards on B2B MID) | Ring-fenced satellite domains |
| **503A Wholesale** (future) | Licensed compounders | B2B terms + bulk SKU UX | FDA PCAC-driven demand capture |

---

## 2. Infrastructure: The Multi-Tenant Nexus

### Target architecture

- **Monorepo:** Single Next.js codebase + single Firebase backend power multiple web domains.
- **Middleware routing:** Edge middleware detects incoming host (e.g. `tptpeptides.com` vs `burner-retail.com`) and injects `x-tenant-id`.
- **Global PIM:** Firestore `products` is the single source of truth. `tenantVisibility: string[]` controls B2B vs B2C SKU exposure.
- **Database segregation:** Firestore rules enforce tenant + lane isolation — B2C tokens cannot read B2B pricing, quotes, or institution data.
- **Compliance shielding:** B2B and B2C domains must never cross-link in UI, share support emails, or reference each other in Terms of Service (BRAM / merchant audit isolation).

### Current codebase state (June 2026)

| Capability | Status | Notes |
|------------|--------|-------|
| Edge tenant routing | **Live** | `proxy.ts` injects `x-tenant-id` from Host |
| `tenantVisibility` on products | **Live** | `lib/schemas/product.ts`; catalog filtered server-side |
| `tenant_config` collection | **Live** | Bootstraps `tpt-b2b`; includes `payment` config scaffold |
| Tenant context providers | **Live** | `TenantProvider` in `app/providers.tsx` |
| Firestore tenant RLS | **Live** | Claims-based super-admin; `effectiveAuthTenantId()` |
| Cross-lane UI isolation | **Partial** | BRAM checklist in rollout guide; per-tenant legal copy still operator-owned |

**Verdict:** Lane 1 (B2B) is effectively the only live lane today. Multi-tenant nexus is the largest structural gap before B2C satellites can launch safely.

---

## 3. Lane 1: The Institutional B2B Fortress

Designed to survive manual underwriting from high-risk processors (Soar Payments, Easy Pay Direct).

### Target capabilities

| Feature | Requirement |
|---------|-------------|
| **KYB Gate** | W-9 upload + EIN; admin manual verify → Bronze / Silver / Gold tier |
| **High-friction checkout** | Age gate, intent dropdown, **typed legal attestation** (not checkbox-only) |
| **Immutable attestation logs** | Write-only `attestation_logs`: signature text, UID, User-Agent, IP, UTC timestamp |
| **Gateway metadata** | Attestation doc ID injected into Authorize.net / NMI transaction metadata |
| **Lexical quarantine** | Inbound email monitoring; prohibited terms → auto-ban + refund |

### Current codebase state

| Feature | Status | Location / gap |
|---------|--------|------------------|
| W-9 + EIN capture | **Live** | `/account/verify`, `institutionVerifications` |
| Manual admin KYB | **Live** | `/admin/verifications`, tax-exempt checkbox on approve |
| Tier pricing | **Live** | `priceLists`, `isTieredPricingEnabled` |
| Age gate | **Live** | 21+ dropdown confirmation + server audit log (IP, tenant, user-agent) |
| Checkout RUO ack | **Live (flag-gated)** | Checkbox legacy, or typed signature when `isTypedAttestationEnabled` |
| Attestation on order | **Live (flag-gated)** | `attestationLogId` on order when typed attestation enabled |
| `attestation_logs` collection | **Live (flag-gated)** | Server-only create via Admin SDK; Firestore rules immutable |
| Authorize.net / NMI | **Wired (flag-gated)** | `/api/checkout/charge` + webhooks when alternate rails enabled |
| Attestation → gateway metadata | **Live (flag-gated)** | Adapters map `attestationLogId`; Stripe metadata includes ID when flag on |
| Middesk EIN automation | **Live** | Flag `isMiddeskVerificationEnabled`; manual review fallback |
| Lexical quarantine | **Live (flag-gated)** | `/api/webhooks/resend-inbound` when `isLexicalQuarantineEnabled` |

**Verdict:** B2B procurement workflows are strong (quotes, Net-30, tax-exempt, tier pricing). **Compliance depth and payment-gateway shielding are not production-ready for high-risk underwriting** until Sprint B + Sprint C land.

---

## 4. Lane 2: The B2C Retail Fleet & Satellite Provisioning

Captures DTC revenue without exposing the B2B card MID.

### Target capabilities

| Feature | Requirement |
|---------|-------------|
| **Vercel Domains API** | Super Admin “Provision Satellite” → attach domain, SSL, DNS guidance |
| **Dynamic tenant config** | `tenant_config` per domain: visible SKUs, payment keys, branding |
| **ACH / eCheck** | SeamlessChex (or equivalent) REST integration |
| **Self-hosted crypto** | PayRam (or equivalent) — USDC / USDT / BTC to cold wallets |
| **No credit cards on B2C** | Card rails isolated to B2B lane only |

### Current codebase state

| Feature | Status |
|---------|--------|
| Satellite provisioning UI | **Live (flag-gated)** | `/admin/satellites` when `isSatelliteProvisioningEnabled` |
| Vercel Domains API integration | **Live (flag-gated)** | `lib/vercel/domains.server.ts` |
| ACH / crypto payment adapters | **Wired (flag-gated)** | Webhooks + `/api/checkout/charge`; Stripe default until cutover |
| B2C-specific checkout flow | **Partial** | Direct charge API; satellite domains need operator DNS + cutover |
| Tenant-scoped API keys in Firestore | **Live** | `tenant_config.payment` drives provider resolution |

**Verdict:** Backend scaffolding complete. **Production B2C traffic blocked** until operator enables flags, provisions satellite domain, and completes BRAM isolation checklist.

---

## 5. Lane 3: 503A Wholesale Pipeline (Future-Proofing)

FDA PCAC is evaluating peptides (BPC-157, TB-500, KPV, MOTs-C) for potential 503A Bulks List inclusion (July 23–24, 2026 meeting).

### Target capabilities

- **Licensed Compounder tier** — RBAC role for 503A/503B state-licensed facilities
- **Batch & COA genealogy** — API lots linked to FDA-registered manufacturers + third-party COAs
- **Bulk procurement UI** — gram/kilo raw API checkout, bypassing vial UX

### Current codebase state

| Feature | Status | Notes |
|---------|--------|-------|
| Batch & COA module | **Live** | `isBatchCoaEnabled`, admin inventory, account COA download |
| Licensed compounder role | **Not started** | Roles: admin / partner / staff / user only |
| Bulk gram/kilo SKUs | **Not started** | Product schema is vial-centric (`tag: "50mg"`) |
| 503A-specific compliance copy | **Not started** | |

**Verdict:** Batch/COA foundation exists. **503A lane blocked** (Sprint F503A) until FDA PCAC outcome.

---

## 6. Phase 6: Zero-Touch Operations (STP Fulfillment)

Exception-based management via Straight-Through Processing.

### Target capabilities

| Feature | Requirement |
|---------|-------------|
| **Algorithmic replenishment** | Low stock → auto Purchase Order |
| **Hybrid Auto-PO routing** | Protocol A: PDF + Resend email; Protocol B: EDI/REST POST with failover to A |
| **Automated fulfillment** | EasyPost rate-shop + label on cleared payment; tracking → Resend delivery emails |

### Current codebase state

| Feature | Status | Notes |
|---------|--------|-------|
| EasyPost rates + labels | **Live** | `isRealShippingEnabled`; manual label from admin orders |
| Low-stock **alert email** | **Live** | Cron `/api/cron/low-stock` → `OPS_ALERT_EMAIL` |
| Auto PO on stock breach | **Live (flag-gated)** | Server trigger when `isZeroTouchOpsEnabled` |
| Hybrid PO routing (email + EDI) | **Live (flag-gated)** | `lib/procurement/poRouter.server.ts` |
| Auto-label on payment cleared | **Live (flag-gated)** | Webhook path when zero-touch flag on |
| EasyPost tracking webhooks → email | **Live (flag-gated)** | `/api/webhooks/easypost` |
| Exception queue | **Live (flag-gated)** | `/admin/exceptions` |
| Predictive replenishment emails | **Live** | Cron `/api/cron/replenishment` (Phase 4) |

**Verdict:** STP scaffolding complete (Sprint E). **Human-in-the-loop remains default** until operator enables `isZeroTouchOpsEnabled` on preview/production.

---

## 7. Completed Foundation (Do Not Rebuild)

The following shipped behind feature flags and is production-verified (`npm run build`, 80 routes):

### V2 Phases 0–5 (see `/admin/modules`, `/admin/rollout`)

- **Phase 0:** Module control center, rollout guide, system map
- **Phase 1:** KYB, tier pricing, quotes, Net-30, Stripe Tax, tax-exempt, accounting export, promo pre-apply, quote-sent email
- **Phase 2:** Batch/COA, EasyPost, geo block, low-stock alerts
- **Phase 3:** Sales command center, impersonation, lead routing, margins, granular RBAC (admin/partner/staff)
- **Phase 4:** Resend transactional, abandoned cart, loyalty redemption, replenishment cron
- **Phase 5:** Algolia, Research Co-Pilot, interactive 3D

### Polish sprint (complete)

Tax-exempt wiring, quote email, promo pre-apply, low-stock cron, verifications UI checkbox.

**Agent rule:** Do not modify SVG system map components, global Tailwind defaults, or beam animation CSS during structural sprints unless explicitly scoped.

---

## 8. Gap Bridge Sprints (Recommended Before A–E)

These close documented gaps between V2 and the master architecture without requiring multi-tenant work first.

### Sprint P1 — KYB automation & EIN validation

| Deliverable | Detail |
|-------------|--------|
| Middesk (or similar) integration | Verify EIN + business name on submit; store `middeskReportId` on verification doc |
| Admin review UX | Surface Middesk status badge; auto-reject obvious mismatches |
| Flag | `isMiddeskVerificationEnabled` (default off) |

**Why first:** Low risk, high underwriting value, no payment rail change.

### Sprint P2 — ShipStation adapter

| Deliverable | Detail |
|-------------|--------|
| Provider abstraction | `lib/shipping/providers/` — EasyPost (existing) + ShipStation |
| Module flag split | Keep `isRealShippingEnabled`; add `shippingProvider: 'easypost' \| 'shipstation'` in settings |
| Admin ship flow | Same `/api/admin/orders/[orderId]/ship` entry point |

**Why:** Doc and module copy already promise ShipStation; only EasyPost is implemented.

### Sprint P3 — Finer-grained RBAC roles

| Deliverable | Detail |
|-------------|--------|
| Roles | `ops`, `finance`, `sales`, `support` (map to route prefixes) |
| Firestore rules | Replace hardcoded master-admin email with claims-based super-admin |
| Migration | Map existing `staff` → `ops`, `partner` → `sales` |

**Why:** Architecture doc and module label mention ops/finance/sales; code has admin/partner/staff only.

---

## 9. Master Build Sprints (Sequential — Do Not Combine)

> **Agent instruction:** Proceed **one sprint at a time**. Do not merge Sprint A middleware with Sprint C payment work in a single PR. Do not overwrite system map SVGs or global styling.

### Sprint A — Multi-Tenant Core

**Goal:** Host-based tenant resolution without breaking the current B2B production domain.

| # | Deliverable | Acceptance criteria |
|---|-------------|---------------------|
| A1 | Edge middleware | **Done** | `proxy.ts` (Next.js 16 — not `middleware.ts`) |
| A2 | `tenant_config` schema | Firestore doc: `{ slug, domains[], branding, paymentLane, featureFlags, apiKeyRefs }` |
| A3 | `tenantVisibility` on products | Array of tenant slugs; catalog queries filter server-side |
| A4 | `TenantProvider` | React context: brand, legal footer, support email, lane (b2b \| b2c) |
| A5 | Firestore rules v2 | Tenant-scoped reads; institution fields denied to B2C tokens |
| A6 | Default tenant bootstrap | Existing deploy maps to `tenantId: 'tpt-b2b'` — zero regression |

**Dependencies:** None (but deploy Firestore rules before enabling second domain).

**Risk:** Highest complexity sprint. Budget 2–3 weeks. Test with Vercel preview alias before second production domain.

---

### Sprint B — Compliance Engine (B2B Fortress)

**Goal:** Underwriter-grade attestation evidence chain.

| # | Deliverable | Status | Acceptance criteria |
|---|-------------|--------|---------------------|
| B1 | Checkout intent capture | **Done** | Research intent dropdown (Zod-validated) |
| B2 | Typed signature field | **Done** | Exact phrase match on checkout + attestation API |
| B3 | `attestation_logs` collection | **Done** | `POST /api/checkout/attestation` + Admin SDK writes |
| B4 | Immutable rules | **Done** | Client create/update/delete denied; admin read-only |
| B5 | Order linkage | **Done** | `attestationLogId` on order + Stripe session metadata |
| B6 | Age gate hardening | **Done** | 21+ dropdown + audit log with IP / tenant / user-agent |

**Dependencies:** Sprint A optional for B2B-only first deploy on default tenant.

**Does not include:** Authorize.net (Sprint C) or lexical quarantine (Sprint B2 sub-epic).

---

### Sprint B2 — Lexical Quarantine (Optional sub-epic)

| # | Deliverable |
|---|-------------|
| B2.1 | Resend inbound webhook (or support inbox poll) |
| B2.2 | Term dictionary + severity scoring |
| B2.3 | Auto-flag account + hold orders + admin alert |
| B2.4 | Refund orchestration hook (Stripe refund API) |

**Dependencies:** Sprint B, transactional email live introspection.

---

### Sprint C — Financial Routing (Dual Rails)

**Goal:** B2B high-risk card gateway + B2C alternative rails, selected by tenant lane.

| # | Deliverable | Acceptance criteria |
|---|-------------|---------------------|
| C1 | Payment provider abstraction | **Done** | `lib/payments/providers/` |
| C2 | B2B Authorize.net / NMI | **Done (flag-gated)** | `/api/checkout/charge` + webhooks |
| C3 | Tenant payment config | **Done** | `resolveCheckoutPaymentPlan` + tenant_config |
| C4 | B2C ACH (SeamlessChex) | **Done (scaffold)** | Charge + webhook routes |
| C5 | B2C crypto (PayRam) | **Done (scaffold)** | Charge + webhook routes |
| C6 | Stripe deprecation path | **Done** | `useStripeUntilCutover` + module flag rollback |

**Dependencies:** Sprint A (lane detection), Sprint B (attestation ID).

**Risk:** PCI scope, webhook secrets per provider, sandbox certification lead time.

---

### Sprint D — Satellite Provisioning

**Goal:** Super Admin can attach burner retail domains without Vercel dashboard access.

| # | Deliverable | Acceptance criteria |
|---|-------------|---------------------|
| D1 | Vercel Domains API client | `POST /v10/projects/{id}/domains` wrapper |
| D2 | Admin UI | `/admin/satellites` — domain input, DNS instructions, status poll |
| D3 | Auto `tenant_config` | New domain → new tenant doc with B2C lane defaults |
| D4 | SSL / verification polling | Surface domain verification state in admin |
| D5 | Rollout checklist | BRAM isolation checklist (no cross-links, separate ToS template) |

**Dependencies:** Sprint A (tenant_config), Sprint C B2C payment adapter (before taking money on satellite).

---

### Sprint E — Zero-Touch Operations (STP)

**Goal:** Exception-only ops — auto PO, auto label, tracking emails.

| # | Deliverable | Acceptance criteria |
|---|-------------|---------------------|
| E1 | Server-side auto-PO trigger | On stock decrement (webhook fulfillment txn), if below threshold → create PO |
| E2 | Hybrid PO router | `lib/procurement/poRouter.server.ts` — Protocol A (PDF+Resend), Protocol B (REST EDI) |
| E3 | Supplier config | `suppliers/{id}`: `{ poProtocol, email, ediEndpoint, ediAuthRef }` |
| E4 | Failover | Protocol B 5xx → automatic Protocol A retry + audit log |
| E5 | Auto-label on paid | When `isRealShippingEnabled` + address complete → EasyPost buy label in webhook |
| E6 | Tracking webhook | EasyPost tracker webhook → Resend shipment email |
| E7 | Exception queue | `/admin/exceptions` — failed PO, failed label, failed tracking |

**Dependencies:** Phase 2 ops modules enabled; EasyPost configured.

---

### Sprint F/G — Financial OS (Proforma, Native Ledger, QBO Sync)

**Goal:** Immutable double-entry ledger, automated order journaling, proforma underwriting math, and headless QuickBooks Online sync for the CPA.

| # | Deliverable | Status | Location |
|---|-------------|--------|----------|
| FG1 | Immutable `journal_entries` schema | **Done** | `lib/schemas/ledger.ts` — balanced debits/credits enforced before write |
| FG2 | Append-only Firestore rules | **Done** | `firestore.rules` — client create/update/delete denied; admin read-only |
| FG3 | Ledger server append API | **Done** | `lib/firebase/ledger.server.ts` — idempotent by `orderId` + `entryType` |
| FG4 | Automated order journaling | **Done** | `lib/finance/journaling.server.ts` → `fulfillPaidOrder` on checkout clear |
| FG5 | Proforma scenario context | **Done** | `lib/finance/ProformaContext.tsx` — CAC, COGS%, fees, churn, GP/LP sliders |
| FG6 | EBITDA waterfall utility | **Done** | `lib/finance/waterfall.ts` — revenue → EBITDA → GP/LP distributions |
| FG7 | QBO sync + OAuth refresh | **Done** | `qboAuth.server.ts` refreshes tokens → `settings/accounting` |
| FG8 | QBO OAuth env placeholders | **Done** | `.env.example` — client ID/secret + tokens + account ID refs |
| FG9 | Proforma admin UI | **Done** | `/admin/proforma` — sliders + EBITDA waterfall |
| FG10 | Lexical auto-refund | **Done** | High-severity inbound hits refund recent paid orders |

**Does not include:** Live QBO OAuth app registration (operator completes in Intuit Developer portal).

**Completed this sprint:** Proforma admin UI at `/admin/proforma`; QBO token refresh with Firestore persistence; lexical quarantine auto-refund on high severity; BRAM checklist in rollout guide.

**Operator action:** `firebase deploy --only firestore:rules` after deploy; schedule monthly cron to `/api/cron/accounting-sync`.

---

### Sprint F503A — 503A Wholesale (Post-PCAC)

| # | Deliverable |
|---|-------------|
| F1 | `compounder` role + license verification workflow |
| F2 | Bulk SKU schema (`unit: 'g' \| 'kg'`, MOQ, COA requirements) |
| F3 | Bulk checkout flow (separate from vial cart) |
| F4 | Manufacturer registry on batch docs |

**Dependencies:** PCAC regulatory clarity; Sprint A tenant rules for compounder-only SKUs.

**Target window:** Q3–Q4 2026 contingent on FDA PCAC outcome.

---

## 10. Recommended Execution Order

```
[COMPLETE] V2 Phases 0–5 + Polish
     ↓
P1 Middesk  →  P2 ShipStation  →  P3 Finer RBAC   (parallel-safe: P1 ‖ P2)
     ↓
Sprint A (Multi-Tenant Core)          ← blocking for B2C
     ↓
Sprint B (Compliance Engine)
     ↓
Sprint C (Financial Routing)
     ↓
Sprint D (Satellite Provisioning)     ← can start UI after A; prod traffic after C
     ↓
Sprint E (Zero-Touch Ops)
     ↓
Sprint B2 (Lexical Quarantine)        ← optional parallel to E
     ↓
Sprint F/G (Financial OS)             ← native ledger + QBO sync
     ↓
Sprint F503A (503A Wholesale)         ← calendar-driven
```

---

## 11. Environment Variables (Cumulative)

| Variable | Sprint | Purpose |
|----------|--------|---------|
| `OPS_ALERT_EMAIL` | Done | Low-stock ops inbox |
| `MIDDESK_API_KEY` | P1 | EIN / business verification |
| `SHIPSTATION_API_KEY` | P2 | Alternate carrier provider |
| `AUTHORIZE_NET_*` / `NMI_*` | C | B2B high-risk gateway |
| `SEAMLESSCHEX_*` | C | B2C ACH |
| `PAYRAM_*` | C | B2C crypto node |
| `VERCEL_TOKEN` + `VERCEL_PROJECT_ID` | D | Domain provisioning |
| `SUPPLIER_EDI_*` | E | Auto-PO Protocol B |
| `QBO_REALM_ID` / `QBO_ACCESS_TOKEN` / `QBO_REFRESH_TOKEN` | F/G | Headless QuickBooks journal sync |
| `QBO_ACCOUNT_*_ID` | F/G | Chart-of-accounts mapping for QBO push |

Full rollout checklist: **`/admin/rollout`**.

---

## 12. Success Metrics by Sprint

| Sprint | Business outcome | Engineering proof |
|--------|------------------|-------------------|
| P1 | Faster KYB, fewer fraudulent EINs | Middesk report on verification doc |
| P2 | Carrier flexibility | Label created via ShipStation adapter |
| P3 | Least-privilege admin | Finance role blocked from `/admin/modules` |
| A | Second domain serves filtered catalog | `x-tenant-id` + visibility filter integration test |
| B | Chargeback packet includes attestation ID | Immutable log + gateway metadata match |
| C | B2C satellite accepts ACH | No Stripe session on B2C tenant |
| D | New domain live in <15 min | Vercel API + tenant_config created |
| E | Paid order → label without admin click | Webhook creates EasyPost shipment |
| F/G | CPA receives monthly QBO journal batch | Cron aggregates `journal_entries` → QBO REST |
| F503A | Compounder bulk order with COA | Bulk checkout + batch assignment |

---

## 13. Related Documentation

| Document | Purpose |
|----------|---------|
| [MASTER_ARCHITECTURE_V2.md](./MASTER_ARCHITECTURE_V2.md) | V2 phase flags (0–5) — **complete** |
| [EXECUTION_PLAN.md](./EXECUTION_PLAN.md) | Phased agent protocol + verification gates |
| [ARCHITECTURE_ROADMAP.md](./ARCHITECTURE_ROADMAP.md) | Historical Phases A–F foundation |
| [DEPLOYMENT_RUNBOOK.md](./DEPLOYMENT_RUNBOOK.md) | Vercel + Firebase deploy |
| [SPRINT_2_EXECUTION.md](./SPRINT_2_EXECUTION.md) | Institution verification reference |
| `/admin/rollout` | In-app phased go-live instructions |

---

*This document supersedes ad-hoc sprint notes for all work **after** V2 Phase 5. Update the "Current codebase state" tables when each sprint ships.*
