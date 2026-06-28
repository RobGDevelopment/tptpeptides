# TPTPeptides — Enterprise Scaling Plan (V2)

> **Brand:** TPTPeptides · **Aesthetic:** Science Luxury  
> **Stack:** Next.js 16 · Firebase · Stripe · Vercel  
> **Architecture:** Feature-flagged phased rollout (Phase 0 → 5)  
> **Last updated:** June 2026

---

## Vision

Evolve the TPTPeptides storefront into a multi-million dollar B2B **ERP and procurement ecosystem**. The UI remains obsidian dark mode, gold accents, hyper-clean typography, and signature gold beam dividers.

All epics ship behind **Phase 0 module toggles** so the core team can build in the background and go live dynamically.

---

## Phase 0 — Module Control Center (Feature Flags)

| Component | Location / pattern |
|-----------|-------------------|
| Firestore doc | `settings/modules` — boolean toggles per epic |
| Zod schema | `lib/schemas/modules.ts` |
| Server reads | `lib/firebase/modules.server.ts` (cached) |
| Admin UI | `/admin/modules` — Super Admin toggle board |
| API | `GET/PATCH /api/admin/modules` |
| Guards | `lib/modules/requireModule.server.ts` for API routes; server components call `getModuleFlags()` |

**Rule:** Frontend components and backend routes check their flag before render/execute. Defaults are `false` until explicitly enabled.

---

## Phase 1 — Financial & Procurement Core

- Institution verification & KYB (`/account/verify`, W-9 upload, Middesk EIN)
- Algorithmic tiered pricing (`priceLists`, Bronze/Silver/Gold overrides)
- Quote & net-terms workflow (`quotes` → PDF → Net-30 Stripe Invoices)
- Stripe Tax, tax-exempt overrides, QuickBooks-ready order export

**Flags:** `isInstitutionVerificationEnabled`, `isTieredPricingEnabled`, `isQuoteWorkflowEnabled`, `isNetTermsEnabled`, `isStripeTaxEnabled`, `isAccountingExportEnabled`, `isB2BProcurementEnabled`

---

## Phase 2 — Operations, Compliance & Fulfillment

- Immutable batch genealogy — `batches` + Storage COA PDFs, order line assignment
- EasyPost / ShipStation, low-stock alerts from receiving
- RUO attestation timestamp + IP on orders; geo-blocking

**Flags:** `isBatchCoaEnabled`, `isRealShippingEnabled`, `isComplianceGeoBlockEnabled`

---

## Phase 3 — Sales Command Center

- `/admin/sales` — AE workspace
- Client impersonation (co-browsing carts)
- Clearbit lead routing on registration
- Gross margin reporting; RBAC (ops, support, finance, sales)

**Flags:** `isSalesCommandCenterEnabled`, `isClientImpersonationEnabled`, `isLeadRoutingEnabled`, `isMarginReportingEnabled`, `isGranularRbacEnabled`

---

## Phase 4 — Growth Marketing & Retention

- Resend / SendGrid transactional base
- Predictive replenishment (90-day velocity → 1-click restock email)
- Abandoned cart recovery; loyalty redemption; research citation rewards

**Flags:** `isTransactionalEmailEnabled`, `isPredictiveReplenishmentEnabled`, `isAbandonedCartEnabled`, `isLoyaltyRedemptionEnabled`

---

## Phase 5 — Tech Infrastructure & Science Luxury UX

- React `cache()` + Next.js `unstable_cache` for Firebase quota protection
- Algolia millisecond search
- TPTPeptides Research Co-Pilot (RAG on `catalog.json`, no medical advice)
- WebGL molecules + dynamic SVG vials

**Flags:** `isAlgoliaSearchEnabled`, `isAiCoPilotEnabled`, `isInteractive3dEnabled`

---

## Completed foundation (pre-V2)

Phases A–F + Storefront CMS (Phase I) + beam UI system — see [ARCHITECTURE_ROADMAP.md](./ARCHITECTURE_ROADMAP.md).

---

## Sprint 1 (in progress)

See [SPRINT_1_EXECUTION.md](./SPRINT_1_EXECUTION.md).

1. Phase 0 feature flag schema + admin toggle board  
2. Resend transactional email base  
3. Firebase caching / quota hardening  

---

## Related docs

| Doc | Purpose |
|-----|---------|
| [BUILD_PLAN.md](./BUILD_PLAN.md) | **Master commercialization plan** — multi-tenant lanes, Sprints A–E, STP ops |
| [SPRINT_1_EXECUTION.md](./SPRINT_1_EXECUTION.md) | Sprint 1 technical steps |
| [ARCHITECTURE_ROADMAP.md](./ARCHITECTURE_ROADMAP.md) | Historical Phases A–F |
| [STOREFRONT_CMS.md](./STOREFRONT_CMS.md) | CMS admin reference |
| [DEPLOYMENT_RUNBOOK.md](./DEPLOYMENT_RUNBOOK.md) | Vercel + Firebase deploy |
