# TPT Clinic — Scaling Build Plan

> **Companion:** [strategic-blueprint.md](./uploaded_review/strategic-blueprint.md) · **Live clinic:** [www.tptclinic.com](https://www.tptclinic.com)  
> **Last updated:** June 2026

This plan translates the strategic blueprint into executable sprints for the telehealth lane (Supabase, `tptclinic.com`). B2B lane work remains in [BUILD_PLAN.md](./BUILD_PLAN.md).

---

## Sprint 1 — Supabase Resilience & Connection Pooling

**Goal:** Eliminate serverless connection saturation and harden PostgREST calls against transient 429/5xx failures.

| Task | Status | Location |
|------|--------|----------|
| Central Supabase env getters | Done | `lib/supabase/config.ts` |
| Retry fetch for PostgREST (429/5xx) | Done | `lib/supabase/fetch.server.ts` |
| `withSupabaseRetry()` for server actions | Done | `lib/supabase/retry.server.ts` |
| Wire retry into server + admin clients | Done | `lib/supabase/server.ts`, `admin.ts` |
| Wrap patient care reads | Done | `features/clinic/actions/careActions.ts` |
| Wrap Integration Hub DB reads | Done | `lib/integrations/resolver.server.ts` |
| Pooler guard for direct SQL | Done | `lib/supabase/pool.ts` |
| Migration verify script | Done | `scripts/verify-supabase-migrations.ts` |
| Env documentation | Done | `.env.example` |

### Operator checklist

```bash
npm run verify:supabase-env
npm run verify:supabase-migrations
```

**Vercel Production env (required for pooler path):**

```env
SUPABASE_POOLER_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
SUPABASE_DB_USE_POOLER=true
```

> PostgREST clients (`createClient`, `createAdminClient`) continue using `NEXT_PUBLIC_SUPABASE_URL` — never the pooler host. The pooler URL is for future direct SQL / batch jobs only.

---

## Sprint 2 — NMI → QBO Clearing Ledger

**Goal:** Reconcile high-risk processor rolling reserves without fracturing gross revenue.

| Task | Status |
|------|--------|
| Migration `0010_nmi_clearing_ledger.sql` | Planned |
| Supabase `clinic_payment_settlements` table | Planned |
| Admin settlement import UI | Planned |
| QBO journal entry generator (clearing account) | Planned |
| Integration Hub: QBO OAuth via registry | Planned |

See strategic blueprint Pillar 2 — *Accounting and NMI Reconciliation Architecture*.

---

## Sprint 3 — Integration Expansion & Ambient Scribe Foundation

| Task | Status |
|------|--------|
| Fullscript / Rupa Health webhook pipeline | Planned |
| GoHighLevel CRM handoff | Planned |
| Ambient AI scribe event schema + BAA vendor eval | Planned |

---

## Domain Sanitization — Research Scrub & SEO (Required)

**Context:** `tptclinic.com` must present exclusively as a legitimate telehealth clinic. Legacy B2B/research URLs must not resolve or be indexed on the clinic host.

### 1. Immediate Sanitization ("Research" Scrub)

| Action | Status | Implementation |
|--------|--------|----------------|
| Block research/B2B paths on clinic lane | Done | `proxy.ts` → 308 redirect to `/` via `isClinicBlockedPublicPath()` |
| Shared blocked-path list | Done | `lib/tenant/clinicSeo.ts` → `CLINIC_BLOCKED_PUBLIC_PATHS` |
| Clinic-only sitemap | Done | `app/sitemap.ts` — telehealth lane uses `CLINIC_SITEMAP_ROUTES` only |
| Robots disallow admin/API/research | Done | `app/robots.ts` — clinic lane disallows `/catalog`, `/research`, `/api`, `/admin`, etc. |
| Workspace audit for public clinic routes | Done | Clinic lane pages contain no Research/Peptides/Inventory/Terminal copy |

**Blocked paths on clinic host:** `/catalog`, `/research`, `/research-policy`, `/lab-results`, `/protocols`, `/checkout`, `/cart`, `/account`, `/b2b`, `/design-system`, `/invite`.

> B2B research assets remain on `tptpeptides.com` / `medfit-pro.vercel.app`. They are never rewritten onto the clinic lane.

### 2. SEO & Domain Optimization

| Action | Status | Implementation |
|--------|--------|----------------|
| Meta tag overhaul (telehealth language) | Done | `app/(telehealth-clinic)/layout.tsx` + `CLINIC_SEO` |
| OpenGraph / Twitter cards | Done | Clinic layout metadata |
| Clinic sitemap routes | Done | `/`, `/intake`, `/dashboard`, `/about`, `/terms`, `/privacy` |
| Robots.txt clinic rules | Done | `app/robots.ts` |
| About page with trust signals | Done | `app/(telehealth-clinic)/clinic/about/page.tsx` |
| Footer compliance line | Done | `ClinicFooter.tsx` — HIPAA, physician-led, BAA |

### 3. Ongoing Sanitization Actions (Operator)

- [ ] **Google Search Console:** Request removal of any indexed `/catalog` or `/research` URLs that appeared before cutover.
- [ ] **Bing Webmaster Tools:** Same URL removal for clinic property.
- [ ] **LegitScript:** Pursue Healthcare Merchant Certification before paid drug-term campaigns (see strategic blueprint Pillar 5).
- [ ] **Quarterly grep audit:** Run workspace search for `Research`, `Peptides`, `Inventory`, `Terminal` — confirm hits are B2B-only (`/b2b/`, `features/storefront/`, admin).

### 4. Verification Commands

```bash
# Clinic host should 308 redirect research paths
curl -I https://www.tptclinic.com/catalog
curl -I https://www.tptclinic.com/research

# Sitemap should list clinic routes only (no /catalog)
curl https://www.tptclinic.com/sitemap.xml

# Robots should disallow research paths
curl https://www.tptclinic.com/robots.txt
```

---

## Manual Steps (Not Automatable)

1. Apply Supabase migrations `0001`–`0009` in Dashboard (or `supabase link` + `db push`)
2. Set `INTEGRATIONS_MASTER_KEY` in Vercel Production
3. Set `SUPABASE_POOLER_URL` + `SUPABASE_DB_USE_POOLER=true` in Vercel
4. Confirm Supabase Auth redirect URLs include `tptclinic.com`
