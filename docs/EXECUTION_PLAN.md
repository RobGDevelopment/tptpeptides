# EXECUTION_PLAN.md — Phased Build Protocol

> **Purpose:** Execute remaining master-architecture work in **small, verifiable phases** with explicit scope boundaries.  
> **Last updated:** June 2026 — Phases 2–6 + Sprint F/G Financial OS complete (flag-gated)  
> **Companion:** [BUILD_PLAN.md](./BUILD_PLAN.md)

---

## 1. Current Baseline

| Area | Status |
|------|--------|
| V2 Phases 0–5 + Polish | **Complete** |
| Bridge P1 Middesk · P3 RBAC | **Complete** |
| Sprint A Multi-Tenant | **Complete** |
| Sprint B Compliance | **Complete** (`isTypedAttestationEnabled`) |
| Sprint C Payment Routing | **Complete** (`isAlternatePaymentRailsEnabled`) |
| Bridge P2 ShipStation | **Complete** (provider resolver + adapter) |
| Sprint D Satellites | **Complete** (`isSatelliteProvisioningEnabled`) |
| Sprint E Zero-Touch Ops | **Complete** (`isZeroTouchOpsEnabled`) |
| Sprint B2 Lexical Quarantine | **Complete** (`isLexicalQuarantineEnabled`) |
| Sprint F/G Financial OS | **Complete** — ledger, proforma UI, QBO refresh, auto-refund |
| Sprint F503A 503A Wholesale | **Blocked** — FDA PCAC calendar |

**Build proof:** `npm run build` — 80 routes, exit 0.

---

## 2. Module Flags (all default OFF)

| Flag | Phase | Enables |
|------|-------|---------|
| `isTypedAttestationEnabled` | B | Typed signature + attestation_logs |
| `isAlternatePaymentRailsEnabled` | C | `/api/checkout/charge` + provider webhooks |
| `isSatelliteProvisioningEnabled` | D | `/admin/satellites` + Vercel Domains API |
| `isZeroTouchOpsEnabled` | E | Auto-PO, auto-label, `/admin/exceptions` |
| `isLexicalQuarantineEnabled` | B2 | `/api/webhooks/resend-inbound` term scan |

**Production Stripe checkout is unchanged** until `tenant_config.payment.useStripeUntilCutover` is set `false` **and** alternate rails flag is on.

---

## 3. Operator Go-Live Order

1. `firebase deploy --only firestore:rules`
2. Enable flags one at a time on **Vercel preview**
3. Configure sandbox credentials (see `.env.example`)
4. Verify webhooks point to preview URLs
5. Sign off cutover checklist at `/admin/rollout`
6. Enable on production domain

---

## 4. Sandbox Verification Checklist

| Flow | Endpoint | Proof |
|------|----------|-------|
| Stripe (default) | `POST /api/checkout/create-session` | Returns `{ paymentMode: 'stripe_checkout', url }` |
| B2B direct charge | `POST /api/checkout/charge` | Requires flag + cutover + gateway keys |
| Provider webhooks | `/api/webhooks/{authorizenet,nmi,seamlesschex,payram}` | Order → `paid` |
| ShipStation label | `POST /api/admin/orders/[id]/ship` | Set `settings/operations.shippingProvider` |
| Satellite domain | `POST /api/admin/satellites` | `tenant_config` + DNS instructions |
| Auto-PO / label | Stripe webhook → paid | `ops_exceptions` empty on happy path |
| Lexical quarantine | `POST /api/webhooks/resend-inbound` | Flagged terms → `ops_exceptions` |
| Native ledger | Stripe webhook → paid | `journal_entries` doc + `journalEntryId` on order |
| QBO sync (scaffold) | `POST /api/cron/accounting-sync` | Returns aggregated payload; push when QBO tokens set |

---

## 5. Anti-Hallucination Protocol

1. Read before write — grep + open target files
2. Mark uncertain API fields `// VERIFY WITH SANDBOX`
3. Never remove Stripe path without explicit cutover
4. `npm run build` must exit 0 before marking done
5. Do not edit system map SVGs or global CSS

---

## 6. Sprint F503A — Do Not Implement

503A bulk SKU schema and compounder role remain **blocked** until FDA PCAC outcome (Q3–Q4 2026).

**Sprint F/G Financial OS is complete** — ledger, journaling hooks, proforma utilities, and QBO cron scaffold ship without UI changes.

---

*Phases 2–6 shipped as backend + admin scaffolding. Live money movement requires sandbox certification and operator sign-off.*
