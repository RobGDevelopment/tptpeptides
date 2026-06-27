# Sprint 1 — Technical Execution Plan

> **TPTPeptides V2 · Phase 0 foundation + email + caching**  
> **Duration:** ~2 weeks · **Status:** In progress

---

## Goals

| # | Deliverable | Exit criteria |
|---|-------------|---------------|
| 1 | Phase 0 feature flags | `settings/modules` in Firestore; `/admin/modules` toggles; API guard helper |
| 2 | Resend email base | Order confirmation sends via Resend when flag + API key set |
| 3 | Firebase quota fix | CMS + product reads use `unstable_cache`; build no longer hammers Firestore |

---

## 1. Phase 0 — Feature Flag Schema

### 1.1 Schema & defaults

```
lib/schemas/modules.ts          — Zod schema + ModuleFlags type
lib/data/moduleDefaults.ts      — all flags false by default
```

Flags map 1:1 to V2 phases (see MASTER_ARCHITECTURE_V2.md).

### 1.2 Server layer

```
lib/firebase/modules.server.ts  — getModuleFlags() via unstable_cache (60s)
lib/modules/flags.ts            — isModuleEnabled(flags, key)
lib/modules/requireModule.server.ts — throws ModuleDisabledError for API routes
```

### 1.3 Firestore

- Document path: `settings/modules`
- Rules: admin read/write only (server uses Admin SDK for storefront reads)
- Seed: first PATCH from admin UI or deploy script writes defaults

### 1.4 Admin API

```
GET  /api/admin/modules   — requireAdminSession → return flags + metadata
PATCH /api/admin/modules  — partial update, revalidateTag('module-flags')
```

### 1.5 Admin UI

```
app/admin/modules/page.tsx
features/admin/components/ModulesPageContent.tsx
```

- Grouped toggles by phase (0–5)
- Science Luxury styling (TerminalPanel, gold active state)
- Optimistic PATCH with error rollback
- Nav link in AdminShell (super-admin section)

### 1.6 Integration pattern (ongoing)

**Server component:**

```tsx
const flags = await getModuleFlags();
if (flags.isInstitutionVerificationEnabled) { ... }
```

**API route:**

```ts
await requireAdminSession(request);
const flags = await getModuleFlags();
requireModule(flags, 'isQuoteWorkflowEnabled');
```

**Client component:** pass `flags` as props from server parent — no client Firestore reads for flags.

---

## 2. Resend Transactional Email Base

### 2.1 Environment

```env
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=orders@tptpeptides.com
```

### 2.2 Library layout

```
lib/email/resend.server.ts              — sendEmail(), isResendConfigured()
lib/email/templates/orderConfirmation.ts — HTML + text templates
lib/email/orderConfirmation.server.ts   — gate on isTransactionalEmailEnabled
```

### 2.3 Behavior

- If `isTransactionalEmailEnabled` is **false** → log only (current behavior)
- If **true** but no API key → log warning, do not throw (webhook must succeed)
- If **true** + key → POST `https://api.resend.com/emails`

### 2.4 First template

Order confirmation (Stripe webhook): order ID, total, loyalty points, link to `/account`.

### 2.5 Follow-up (Sprint 2+)

Shipping updates, verification nudges, quote PDFs, abandoned cart.

---

## 3. Firebase Caching / Quota Hardening

### Problem

`next build` runs 15 workers; each static page calls CMS/product helpers → `RESOURCE_EXHAUSTED`.

### Solution

| Function | Cache | Revalidate |
|----------|-------|------------|
| `getSiteSettings` | `unstable_cache` | 3600s |
| `getHomepageMerchandising` | `unstable_cache` | 3600s |
| `getCategoryMerchandising` | `unstable_cache` | 3600s |
| `getResearchArticlesCms` | `unstable_cache` | 60s |
| `getProtocolTemplatesCms` | `unstable_cache` | 60s |
| `getVariantOverrides` | `unstable_cache` | 300s |
| `getModuleFlags` | `unstable_cache` | 60s |

Tags: `cms-settings`, `cms-homepage`, `cms-categories`, `cms-research`, `cms-protocols`, `product-overrides`, `module-flags`.

Admin CMS PATCH routes call `revalidateTag()` for affected tags.

### Fallback

Existing code defaults (`storefrontCmsDefaults`, `demoStock`) remain when Admin SDK missing or quota exceeded.

---

## Sprint 2 (in progress)

See institutional verification + accounting export deliverables.

1. Institution verification (`/account/verify`, `/admin/verifications`) behind `isInstitutionVerificationEnabled`
2. Order financial schema + `/api/admin/export-orders` behind `isAccountingExportEnabled`
3. Product save cache invalidation via `revalidateTag('product-overrides', 'max')`

---

## Sprint 1 task checklist

- [x] `MASTER_ARCHITECTURE_V2.md` + roadmap pointer
- [x] Module Zod schema + defaults
- [x] `modules.server.ts` + requireModule helper
- [x] Firestore rules for `settings/modules`
- [x] `/api/admin/modules` GET/PATCH
- [x] `/admin/modules` toggle UI
- [x] Resend client + order confirmation template
- [x] Wire webhook to gated Resend send
- [x] `unstable_cache` on hot Firestore reads
- [ ] Deploy Firestore rules (`firebase deploy --only firestore:rules`)
- [ ] Set `RESEND_API_KEY` in Vercel + enable `isTransactionalEmailEnabled` in admin

---

## Sprint 2 preview

1. Institution verification MVP (`/account/verify` + admin queue) behind `isInstitutionVerificationEnabled`
2. Order financial schema + CSV export behind `isAccountingExportEnabled`
3. Newsletter → Resend audience behind `isTransactionalEmailEnabled`
