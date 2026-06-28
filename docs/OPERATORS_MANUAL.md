# Operator's Manual — Admin Control Center

> **Audience:** Super Admins, Operations, Finance, Sales, and Support operators  
> **Scope:** Human-facing runbooks for every module in the Back-Office sidebar  
> **Source of truth:** Derived from live routes under `app/admin/`, API handlers under `app/api/admin/`, and server utilities under `lib/`  
> **Last updated:** June 2026

---

## Partner Orientation & Underwriting Guide

> **Audience:** Ownership partners, GP/LP principals, and Super Admins  
> **Purpose:** High-level orientation to financial transparency and multi-lane revenue architecture

This section is written for **ownership partners** evaluating platform performance, underwriting deal economics, and monitoring B2B vs. B2C satellite lanes. Operational staff should continue with the module runbooks below.

### Step 1 — Open the Proforma Dashboard

1. Sign in with your Super Admin or partner account.
2. In the Back-Office sidebar under **System**, click **Proforma** (`/admin/proforma`).
3. Review the default scenario: gross revenue, CAC, OpEx, COGS %, merchant fees, churn, and GP/LP split sliders.

The Proforma workspace is a **forward-looking model** — it does not read live books. Use it to stress-test assumptions before capital commitments or board reviews.

### Step 2 — Model EBITDA with the Dynamic Scenario Matrix

1. On the Proforma page, adjust sliders in the left column (all update in real time):
   - **Gross revenue** — top-line monthly or annual run-rate (keep units consistent).
   - **COGS %** and **Merchant fee %** — align with historical ranges from product `baseCost` and payment rails.
   - **Churn %** — models revenue retention decay before COGS.
   - **CAC** and **OpEx** — acquisition spend and fixed operating load below gross profit.
   - **GP split %** / **LP split %** — ownership waterfall on positive EBITDA.
2. Read the waterfall panel (right column): revenue after churn → gross profit → EBITDA → GP/LP distributions → retained EBITDA.
3. Capture screenshots or note slider values for IC memos. Reset defaults with the workspace reset control when starting a new scenario.

**Partner tip:** Cross-calibrate COGS % against the native ledger’s `cogs` account postings after the first month of live volume.

### Step 3 — Audit-Grade Transparency via the Native Ledger

1. Navigate to **Fleet OS → Ledger** (`/admin/ledger`).
2. Review immutable double-entry journal entries — each cleared order produces balanced debit/credit lines (`order_cleared` type).
3. Confirm QBO sync status badges: unsynced entries await the monthly `accounting-sync` cron; synced entries show `syncedToQbo` metadata.
4. For deep dives, inspect Firestore `journal_entries` (append-only) or wait for Headless QuickBooks sync to mirror aggregated batches.

The ledger is the **system of record** inside MedFit; Proforma is the **scenario layer** above it.

### Step 4 — Monitor Multi-Lane Revenue (B2B vs. Retail Satellites)

| Lane | Tenant | Payment rail | Admin surface |
|------|--------|--------------|---------------|
| **B2B Hub** | `tpt-b2b` (default) | Stripe / Net-30 invoice | Dashboard, Orders, Sales CC, Verifications |
| **B2C Satellites** | `tenant_config` slug per domain | SeamlessChex ACH or PayRam crypto | **Fleet OS → Satellites**, lane-specific catalog via `tenantVisibility` |

**Partner workflow:**

1. **B2B performance** — Dashboard stat cards + **Sales Command Center** for institution pipeline and margin intelligence.
2. **Satellite deployment** — Enable `isSatelliteProvisioningEnabled`, then **Fleet OS → Satellites** to attach Vercel domains and bootstrap B2C tenants.
3. **Lane isolation verification** — Confirm satellite domains in `tenant_config`, SKU visibility in **Products**, and BRAM checklist in **Rollout Guide** before taking live consumer traffic.
4. **Exception monitoring** — **Fleet OS → Exceptions** surfaces auto-PO, auto-label, and carrier webhook failures across lanes.

### Step 5 — Read the Full Operator's Manual (Executive Flipbook)

1. In the sidebar, open **Operating System** (`/admin/manual`) — the full-screen Executive Flipbook.
2. Page through this document with the 3D flip interaction; content is parsed live from this file.
3. Use module runbooks below for day-to-day operator procedures.

---

## How to use this manual

Each module section follows the same four-part structure:

1. **Strategic Purpose** — why the module exists in the multi-lane architecture  
2. **Operational Workflow** — click path, inputs, and toggles  
3. **System Telemetry** — databases, APIs, and middleware behavior  
4. **Exception Handling & Troubleshooting** — failure modes and fixes  

### Sidebar map (complete)

| Section | Module | Route | Manual status |
|---------|--------|-------|---------------|
| Core | Dashboard | `/admin` | **Part 1 ✓** |
| Core | Products | `/admin/products` | **Part 1 ✓** |
| Core | Storefront | `/admin/storefront` | **Part 1 ✓** |
| Core | Orders | `/admin/orders` | **Part 3 ✓** |
| Core | Inventory | `/admin/inventory` | **Part 3 ✓** |
| Commercial | Verifications | `/admin/verifications` | **Part 3 ✓** |
| Commercial | Quotes | `/admin/quotes` | **Part 3 ✓** |
| Commercial | Sales | `/admin/sales` | **Part 3 ✓** |
| Commercial | Growth | `/admin/growth` | **Part 3 ✓** |
| Commercial | Users | `/admin/users` | **Part 3 ✓** |
| Fleet OS | Satellites | `/admin/satellites` | **Part 2 ✓** |
| Fleet OS | Exceptions | `/admin/exceptions` | **Part 2 ✓** |
| Fleet OS | Ledger | `/admin/ledger` | **Part 2 ✓** |
| System | Proforma | `/admin/proforma` | **Part 2 ✓** |
| System | Rollout Guide | `/admin/rollout` | **Part 3 ✓** |
| System | Modules | `/admin/modules` | **Part 2 ✓** |
| System | Operating System | `/admin/manual` | **Executive Flipbook ✓** |
| System | Master Map | `/admin/system-map` | **Part 3 ✓** |
| System | Audit Logs | `/admin/audit` | **Part 3 ✓** |

**Part 1** — Dashboard, Products, Storefront. **Part 2** — Fleet OS, Proforma, Modules. **Part 3** — Orders through Audit Logs (remaining sidebar).

---

## Global prerequisites (all modules)

Before using any Back-Office surface:

- **Admin access:** Your Firebase user must have `role: "admin"` (or a granular role allowed by RBAC when `isGranularRbacEnabled` is on). Non-admins are redirected to the storefront by `AdminGuard`.
- **Session:** Admin API calls use `adminFetch`, which syncs the Firebase ID token into a session cookie via `/api/session/sync`. If saves fail with 401, sign out and back in.
- **Firebase Admin SDK:** Server routes return **503** when `FIREBASE_*` service account env vars are missing on Vercel.
- **Tenant context:** Edge `proxy.ts` resolves `x-tenant-id` from the request `Host` header. Product writes stamp `tenantId` and `tenantVisibility` for the active tenant. Default production tenant is `tpt-b2b`.

---

### Lab Operations Dashboard

**Route:** `/admin`

#### 1. Strategic Purpose

The Dashboard is the **command center for daily lab operations**. It exists to give operators a single-pane, near-real-time view of catalog health, order pipeline pressure, and low-stock risk—without drilling into each module. It also surfaces **Enabled Modules** quick links so operators can jump directly to feature-flagged capabilities (B2B verification, tier pricing, growth jobs, Fleet OS, etc.) that are currently live in production.

In the multi-lane architecture, this is the **B2B hub's operational heartbeat**: it does not provision satellites or move money, but it tells you whether the PIM (Product Information Management) and order queue are healthy before you open Orders, Inventory, or Fleet OS.

#### 2. Operational Workflow (How-To)

1. Sign in with an admin account and navigate to **Back-Office → Dashboard** (sidebar top item).
2. Review the four stat cards:
   - **Catalog Products** — count of product groups and total variants in Firestore `products`.
   - **Total Orders** — all orders; subtitle shows count in `pending_payment` or `paid` (needs fulfillment attention).
   - **Low Stock SKUs** — variants at or below their `reorderThreshold` (default 20 if unset).
   - **Active Categories** — distinct category count across catalog groups.
3. Scroll to **Enabled Modules** — click any card to deep-link into an active module (links are generated from `settings/modules` flags via `getAdminModuleLinks`).
4. Review **Catalog Snapshot** — read-only table of the first eight product groups (name, category, variants, cost range, retail range, aggregate stock).

**No write actions** exist on this page. To change catalog or orders, use **Products**, **Orders**, or **Inventory**.

#### 3. System Telemetry (Under the Hood)

| Layer | Behavior |
|-------|----------|
| **Server (page load)** | `app/admin/page.tsx` reads `settings/modules` via `getModuleFlags()` and builds the enabled-module link list server-side. |
| **Client (live data)** | `AdminDashboard` opens Firestore **real-time listeners** (`onSnapshot`) on collections `products` (all docs) and `orders` (ordered by `createdAt` desc). Updates propagate without refresh. |
| **Grouping logic** | Raw product docs are grouped by `catalogId` in `groupProductsFromDocs()` — variants sharing a catalog ID appear as one row in the snapshot. |
| **Low-stock math** | Any product doc where `stock <= reorderThreshold` increments the low-stock counter. |
| **Edge middleware** | `proxy.ts` injects `x-tenant-id` on all requests; the Dashboard itself does not filter by tenant client-side—it reads the full `products` and `orders` collections visible to the admin Firebase rules/token. |
| **External APIs** | None on this page. Pure Firestore reads. |

**Collections read:** `products`, `orders`  
**Collections written:** None  
**Audit:** None (read-only surface)

#### 4. Exception Handling & Troubleshooting

| Symptom | Likely cause | Operator action |
|---------|--------------|-----------------|
| Spinner never clears | Firestore rules deny read, or client Firebase config wrong | Verify admin role in Firestore `users/{uid}`; check browser console for permission errors |
| Stats show zero but catalog exists | Empty `products` / `orders` collections | Run **Products → Run Seed** or complete a test checkout |
| **Enabled Modules** empty | All module flags OFF in `settings/modules` | Open **Modules** (`/admin/modules`) and enable required flags per Rollout Guide |
| Low-stock count seems high | `reorderThreshold` too aggressive | Edit variants in **Products** or adjust thresholds in **Inventory** |
| Pending orders stuck | Payment webhook or manual status issue | Open **Orders** and advance status; check Stripe webhook logs |

---

### Product Information Management (PIM)

**Route:** `/admin/products`

#### 1. Strategic Purpose

Products is the **global PIM** for TPT Peptides. Every SKU variant lives in Firestore `products` as the single source of truth for name, price, cost, stock, RUO-compliant copy, and **multi-tenant visibility** (`tenantVisibility`). Storefront catalog, checkout, tier pricing, batch assignment, and auto-PO logic all consume this collection.

In enterprise terms, this module separates **catalog authoring** (what you sell and at what base price) from **merchandising** (Storefront CMS) and **fulfillment** (Orders/Inventory). B2B tier overrides are managed here when `isTieredPricingEnabled` is enabled via the **Tier Pricing** panel (`priceLists` collection).

#### 2. Operational Workflow (How-To)

1. Navigate to **Back-Office → Products**.
2. **Empty catalog bootstrap:** Click **Run Seed** to inject all variants from `lib/data/catalog.json` via `POST /api/admin/seed`. Use after fresh Firebase project setup or disaster recovery.
3. **Add product:** Click **Add Product** → complete the modal:
   - Catalog ID, name, category, RUO description, research areas
   - One or more **variants** (tag e.g. `50mg`, price, base cost, stock, active flag, reorder threshold, optional storefront badge and date windows)
4. **Edit product:** Click **Edit** on a row → same modal pre-filled for that product group.
5. **Save** in the modal → writes all variants in the group.
6. **Tier Pricing** (visible only when `isTieredPricingEnabled`):
   - Scroll to the Tier Pricing panel below the table
   - Set Bronze / Silver / Gold discount percentages
   - Save per tier → `PUT /api/admin/price-lists`

**Required inputs for new products:** name, category, RUO description (compliance-scanned), at least one variant with positive price and non-negative stock.

#### 3. System Telemetry (Under the Hood)

| Action | API / path | Backend behavior |
|--------|------------|------------------|
| **Run Seed** | `POST /api/admin/seed` | Admin session required. Batch-writes every variant from `getCatalogSeedProducts()` into `products/{variantId}` with merge. Logs `catalog_seed` to admin audit. Revalidates Next.js cache tags `product-overrides`, `catalog-summaries`. |
| **Save product** | `PUT /api/admin/products` | Validates body with Zod. Runs **compliance copy guard** (`assertRuOProductDescription`, `findComplianceViolations`) on name, description, research areas—blocks save if prohibited terms detected. Stamps `tenantId` from `getActiveTenantId()` and sets `tenantVisibility: [tenantId]`. Writes each variant doc in a Firestore batch. Logs `product_save`. Revalidates catalog cache tags. |
| **Live table** | Client Firestore listener | `onSnapshot` on `products` — table regroups by `catalogId` on every change. |
| **Tier pricing** | `GET/PUT /api/admin/price-lists` | Reads/writes `priceLists/{tier}` docs (Bronze, Silver, Gold). Gated by `isTieredPricingEnabled`. |

**Product document fields (key):** `name`, `tag`, `price`, `baseCost`, `stock`, `desc`, `category`, `catalogId`, `variantId`, `reorderThreshold`, `supplierId`, `tenantId`, `tenantVisibility`, `active`, `storefrontBadge`, `activeFrom`/`activeUntil`

**Edge middleware:** `proxy.ts` sets tenant context for server-side saves; new products default visibility to the active tenant only.

**External APIs:** None directly. Seed source is local `catalog.json`.

#### 4. Exception Handling & Troubleshooting

| Symptom | Likely cause | Operator action |
|---------|--------------|-----------------|
| Seed returns 503 | Firebase Admin SDK not configured on server | Set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` in Vercel; redeploy |
| Save blocked with "Non-compliant product copy" | RUO copy guard flagged medical/prohibited terms | Rewrite description/name to research-use-only language |
| Product not visible on storefront | `active: false`, date window, or `tenantVisibility` excludes current tenant | Edit variant; confirm tenant slug in visibility array for satellite domains |
| Tier panel missing | `isTieredPricingEnabled` OFF | Enable in **Modules** |
| Tier save 404 | Same flag off server-side | Enable flag; wait ~60s for module cache refresh |
| Stock out of sync with orders | Fulfillment decrements stock in webhook transaction | Check **Orders** for stuck `paid` orders; verify Stripe webhook delivery |

---

### Storefront CMS

**Route:** `/admin/storefront`

#### 1. Strategic Purpose

Storefront CMS controls **consumer-facing merchandising and content** without redeploying code: homepage hero, featured SKUs, category presentation, research articles, and protocol templates. It exists to separate **brand/marketing layer** from the **PIM** (Products) and to keep RUO compliance enforced on public copy.

For multi-tenant operations, CMS content is currently **global per Firebase project** (not per `tenant_config` doc). Satellite domains share the same CMS docs unless you extend tenant-scoped CMS in a future sprint. Product **visibility** on each domain is still controlled by `tenantVisibility` on `products` plus edge tenant resolution.

#### 2. Operational Workflow (How-To)

1. Navigate to **Back-Office → Storefront**.
2. Use the tab bar:
   - **Homepage** — edit site settings (hero headline/body) and homepage merchandising (featured product slugs, featured limit). Click **Save Homepage** → `PUT /api/admin/storefront/settings`.
   - **Categories** — configure category display names, sort order, and merchandising flags. Click **Save Categories** → `PATCH /api/admin/storefront/settings` (category payload).
   - **Research** — list, create, edit research articles (title, slug, body, published flag). Save per article → `PUT /api/admin/storefront/research`.
   - **Protocols** — list, create, edit protocol templates. Save per protocol → `PUT /api/admin/storefront/protocols`.
   - **Tools** — **Seed CMS** (bootstrap defaults), **Export Catalog** (download CSV), links to preview storefront.
3. Click **Preview Storefront** (header) to open `/` in a new tab and verify changes.

**Compliance note:** Hero body and featured subtitle are scanned for prohibited terms before save. Violations return HTTP 400 with the flagged terms listed.

#### 3. System Telemetry (Under the Hood)

| Tab / action | Firestore path | API route |
|--------------|----------------|-----------|
| Site settings | `cms/settings` | `GET/PUT /api/admin/storefront/settings` |
| Homepage merchandising | `cms/homepage` | `GET/PUT /api/admin/storefront/settings` |
| Category merchandising | `cms/categories` | `GET/PATCH /api/admin/storefront/settings` |
| Research articles | `researchArticles/{slug}` | `GET/PUT /api/admin/storefront/research` |
| Protocol templates | `protocols/{id}` | `GET/PUT /api/admin/storefront/protocols` |
| Seed CMS | Multiple CMS docs | `POST /api/admin/storefront/seed` |
| Export catalog | — | `GET /api/admin/storefront/export-catalog` |

**On save:**

- Admin action logged (`cms_storefront_save`, `cms_categories_save`, etc.) to audit pipeline via `logAdminAction`.
- Next.js **cache revalidation**: `revalidatePath('/')`, `/catalog`, `/research`, `/protocols`; tags `cms-settings`, `cms-homepage`, `cms-categories`.
- Storefront reads use `unstable_cache` with hourly revalidation for settings/homepage/categories; research/protocols refresh more frequently.

**Catalog picker:** Homepage featured-slug toggles load options from `GET /api/products` (public catalog API filtered by tenant visibility server-side).

**Edge middleware:** `proxy.ts` resolves tenant for storefront renders; featured products must exist in PIM and be visible to that tenant's slug.

**External APIs:** None. Resend/Algolia are unrelated to CMS saves.

#### 4. Exception Handling & Troubleshooting

| Symptom | Likely cause | Operator action |
|---------|--------------|-----------------|
| 401 on load/save | Session expired | Refresh page; re-authenticate |
| 503 Admin SDK not configured | Missing Firebase server credentials | Fix Vercel env vars |
| Save blocked — non-compliant copy | Copy guard violation | Edit hero/subtitle/article text |
| Homepage changes not visible | CDN/cache delay | Wait for revalidation; hard-refresh storefront; confirm **Seed CMS** didn't overwrite |
| Featured product missing on homepage | Slug not in catalog or filtered by `tenantVisibility` | Add product in **Products**; confirm slug matches |
| Research tab empty | No published docs in `researchArticles` | Create article with `published: true` or run **Seed CMS** |
| Categories wrong on `/catalog` | `cms/categories` out of date | Re-save Categories tab; verify sort order |

---

## Part 2 — Fleet OS & Financial Architecture

---

### Satellite Provisioning

**Route:** `/admin/satellites` (sidebar: **Fleet OS → Satellites**)  
**Module flag required:** `isSatelliteProvisioningEnabled` (enable in **Modules**)

#### 1. Strategic Purpose

Satellite Provisioning exists to deploy **B2C burner retail domains** that run on **alternative payment rails** (ACH via SeamlessChex or crypto via PayRam), ring-fencing the core **B2B Merchant ID** from direct-to-consumer card risk. Each satellite is a separate logical tenant in the multi-lane architecture: its own domain, payment configuration, and (when catalog rules are applied) SKU visibility—without forking the codebase or opening the Vercel dashboard for every new domain.

This module is the operator-facing control plane for **Sprint D**: attach domain → bootstrap `tenant_config` → wire B2C payment defaults → complete DNS for SSL.

#### 2. Operational Workflow (How-To)

1. Enable **`isSatelliteProvisioningEnabled`** in **Modules** (`/admin/modules`).
2. Set Vercel credentials in deployment env: `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` (optional `VERCEL_TEAM_ID`).
3. Navigate to **Fleet OS → Satellites**.
4. If the amber banner appears, Vercel is not configured—fix env vars before deploying.
5. In **Deploy Satellite**:
   - **Domain name** (required) — e.g. `retail-example.com`
   - **Display name** (optional) — human label in admin table
   - **Tenant slug** (optional) — defaults to `b2c-{slugified-domain}`
   - **Alternative payment rail** — select **SeamlessChex ACH** or **PayRam Crypto**
6. Click **Deploy Satellite**.
7. Copy **DNS instructions** from the success panel into your registrar (TXT/CNAME records from Vercel verification).
8. Confirm the new row appears in **Active Satellites** with correct payment rail and **Active** status.
9. Complete BRAM isolation checklist in **Rollout Guide** (separate ToS, support email, no cross-links to B2B) before taking live traffic.

**Important:** New satellites boot with `payment.useStripeUntilCutover: true`—Stripe remains the checkout default until you explicitly cut over per tenant after sandbox certification.

#### 3. System Telemetry (Under the Hood)

| Step | System action |
|------|----------------|
| **Page load** | `GET /api/admin/satellites` → returns `{ configured, satellites[] }`. Lists all `tenant_config` docs where `lane === 'b2c'`. Returns **404** if module flag is OFF. |
| **Deploy** | `POST /api/admin/satellites` with `{ domain, tenantSlug?, name?, primaryProvider? }`. |

**Vercel Domains API (on deploy):**

- `POST https://api.vercel.com/v10/projects/{VERCEL_PROJECT_ID}/domains` with Bearer `VERCEL_TOKEN`
- Attaches the domain to the MedFit Vercel project; response includes `verification[]` DNS records
- Optional team scope via `VERCEL_TEAM_ID` query param

**Firestore write — `tenant_config/{slug}`:**

```text
{
  slug, name, lane: "b2c", domains: [domain],
  payment: {
    primaryProvider: "seamlesschex" | "payram",
    rail: "b2c_ach" | "b2c_crypto",
    useStripeUntilCutover: true
  },
  active: true, createdAt, updatedAt
}
```

**Database isolation model:**

- **`tenant_config`** — one document per tenant slug; stores domains, lane, payment rail, branding hooks
- **`products.tenantVisibility`** — array of tenant slugs allowed to surface each SKU; B2B hub uses `tpt-b2b` by default
- **Firestore rules** — `tenant_config` readable by admins or default tenant; **writes require Super Admin** (`isSuperAdmin()`)
- **Edge `proxy.ts`** — injects `x-tenant-id` from Host header via `resolveTenantIdFromHost()`. Primary B2B hosts map to `tpt-b2b`. *Operator note:* host→satellite slug resolution is extended as `tenant_config.domains[]` entries are populated; verify tenant routing on preview alias before production cutover.

**External APIs:** Vercel Domains API only on this page. Payment providers are configured at cutover, not during deploy.

#### 4. Exception Handling & Troubleshooting

| Symptom | Likely cause | Operator action |
|---------|--------------|-----------------|
| Page shows "Enable isSatelliteProvisioningEnabled" | Module flag OFF | Toggle flag in **Modules**; wait ~60s for cache |
| Deploy fails — Vercel not configured | Missing `VERCEL_TOKEN` / `VERCEL_PROJECT_ID` | Set in Vercel env; redeploy |
| Vercel API error (domain in use) | Domain attached to another project | Remove from other Vercel project or use subdomain |
| DNS instructions empty | Domain already verified in Vercel | Check domain status in Vercel dashboard |
| SSL not active | DNS not propagated | Wait 24–48h; verify records at registrar |
| Satellite live but wrong checkout rail | Cutover not completed | Update `tenant_config.payment`; enable alternate rails flag; disable Stripe cutover |
| Catalog empty on satellite | SKUs lack satellite slug in `tenantVisibility` | Edit products in **Products** to include B2C tenant slug |

---

### Zero-Touch Ops — Exceptions Queue

**Route:** `/admin/exceptions` (sidebar: **Fleet OS → Exceptions**)  
**Module flag required:** `isZeroTouchOpsEnabled`

#### 1. Strategic Purpose

The Exceptions Queue is the **human escalation layer** for Zero-Touch Ops: when automated fulfillment (purchase orders, shipping labels, webhooks) fails, the system records a durable exception instead of silently dropping the order. Operators see a single inbox for **auto-PO failures**, **EasyPost label failures**, and other ops events—then either **retry** the automation or **manually resolve** the queue item.

This prevents revenue leakage and compliance gaps when vendor APIs, carrier APIs, or webhook delivery hiccups during peak volume.

#### 2. Operational Workflow (How-To)

1. Enable **`isZeroTouchOpsEnabled`** in **Modules**.
2. Navigate to **Fleet OS → Exceptions**.
3. Review the **Open Exceptions** table: type, message, linked order, created time.
4. For **`auto_po_failed`** or **`auto_label_failed`**:
   - Click **Retry** — `POST /api/admin/exceptions/retry` re-invokes PO routing or EasyPost label creation.
   - On success, the row disappears (status set to **resolved** server-side).
5. For **`tracking_webhook_failed`**, **`lexical_quarantine`**, or unrecoverable cases:
   - Click **Manually Resolve** — `PATCH /api/admin/exceptions` marks the exception **resolved** without re-running automation.
   - Follow up in **Orders** or support tooling as needed.
6. Empty queue message **"No open exceptions — STP happy path"** means automation is healthy.

**Typical failover sources:**

- **EasyPost webhook failures** (`tracking_webhook_failed`) — carrier tracker event received but notification/processing threw; created by `POST /api/webhooks/easypost` error handler.
- **Auto-PO failures** (`auto_po_failed`) — wholesale PO routing threw after Stripe/provider payment clearance.
- **Auto-label failures** (`auto_label_failed`) — EasyPost label purchase failed when `autoLabelOnPaidEnabled` and **`isRealShippingEnabled`** are both ON.

#### 3. System Telemetry (Under the Hood)

| Component | Detail |
|-----------|--------|
| **Collection** | `ops_exceptions` — durable failure records |
| **Page load** | `GET /api/admin/exceptions` → `listOpenOpsExceptions()` (open items only). **404** if module OFF. |
| **Retry** | `POST /api/admin/exceptions/retry` `{ exceptionId }` → `lib/ops/retryException.server.ts` |
| **Manual resolve** | `PATCH /api/admin/exceptions` `{ exceptionId }` → `resolveOpsException()` |

**Exception types:**

| Type | Retry? | Created by |
|------|--------|------------|
| `auto_po_failed` | Yes | `runPostPaymentAutomation()` when PO routing throws |
| `auto_label_failed` | Yes (requires `isRealShippingEnabled`) | Same, when `createAutoShippingLabel()` throws |
| `tracking_webhook_failed` | No — manual only | EasyPost webhook handler on processing error |
| `lexical_quarantine` | No — manual only | Lexical quarantine / refund compliance flows |

**Retry orchestration:**

- Validates exception is **open** and has a linked `orderId`
- **`auto_po_failed`** → re-runs `routePurchaseOrder()` per low-stock line item; requires `autoPurchaseOrderEnabled` in operations settings
- **`auto_label_failed`** → re-calls `createAutoShippingLabel(orderId, flags)`
- Success → `status: resolved`, `resolvedAt` timestamp

**Document shape:**

```text
{
  type, status: "open" | "resolved" | "ignored",
  message, orderId?, metadata?, tenantId?,
  createdAt, resolvedAt?
}
```

#### 4. Exception Handling & Troubleshooting

| Symptom | Likely cause | Operator action |
|---------|--------------|-----------------|
| Page 404 | `isZeroTouchOpsEnabled` OFF | Enable in **Modules** |
| Retry returns 400 | Wrong type, closed exception, or missing orderId | Only retry open auto-PO/label rows |
| Retry fails — Real shipping not enabled | `isRealShippingEnabled` OFF | Enable in **Modules** before label retry |
| Retry fails — Auto-PO disabled | Operations setting off | Enable auto-PO in operations settings |
| Repeated `auto_label_failed` | Invalid ship-to or EasyPost credentials | Fix address in order; verify EasyPost env keys |
| Repeated `auto_po_failed` | Vendor SKU mapping or credit | Fix product vendor IDs; contact wholesaler |
| No exceptions but orders pending | Failures not wired to queue | Check logs; confirm Zero-Touch module enabled before incident |

---

### Native Ledger (Double-Entry Journal)

**Route:** `/admin/ledger` (sidebar: **Fleet OS → Ledger**)  
**Module flag:** None required for read-only UI; journaling runs when orders fulfill

#### 1. Strategic Purpose

The Native Ledger is MedFit's **immutable double-entry accounting substrate** inside Firestore. Every paid order fulfillment generates balanced **journal entries** (debit/credit lines) before any external accounting system sees revenue. This gives Finance a source-of-truth audit trail independent of QuickBooks latency, and powers the **Headless QuickBooks sync** that pushes summarized activity without operators touching QBO UI.

#### 2. Operational Workflow (How-To)

1. Navigate to **Fleet OS → Ledger**.
2. Review the recent entries table: entry ID, date, description, line count, balanced total, QBO sync status.
3. **Normal ops:** No manual posting—entries appear when `fulfillPaidOrder()` completes and calls `recordOrderJournalEntry()`.
4. **QuickBooks sync (automated):**
   - Vercel cron hits `GET/POST /api/cron/accounting-sync` monthly (prior calendar month window).
   - Requires `CRON_SECRET`, valid QBO OAuth tokens in `settings/accounting`.
5. **Manual sync verification:**
   - Check `settings/accounting.lastQboSyncAt` in Firestore or admin tooling.
   - Confirm entries show **Synced to QBO** badge after successful run.
6. **OAuth refresh:** If sync fails with auth errors, re-authorize QuickBooks via the accounting settings flow (`lib/finance/qboAuth.server.ts`).

Operators do **not** create, edit, or delete journal lines from this UI—it is read-only by design.

#### 3. System Telemetry (Under the Hood)

**Immutable schema — `journal_entries/{id}`:**

```text
{
  orderId, tenantId,
  entryType: "order_cleared",
  period: "YYYY-MM",
  lines: [{ account, type: "debit"|"credit", amount, memo? }],
  totalDebits, totalCredits, currency: "USD",
  createdAt,
  syncedToQbo: boolean,
  qboSyncId?, syncedAt?
}
```

**Chart-of-accounts codes:** `cash`, `revenue`, `cogs`, `inventory`, `merchant_fees`, `tax_payable`, `shipping_revenue`.

**Balance invariant:** `assertBalancedLines()` in `lib/schemas/ledger.ts` — debits must equal credits to the cent.

| Flow | Code path |
|------|-----------|
| **Auto-journal on payment fulfill** | `fulfillPaidOrder()` → `recordOrderJournalEntry()` → `appendJournalEntry()` |
| **Admin list** | `GET /api/admin/ledger` → `listRecentJournalEntries(100)` + QBO sync metadata |
| **QBO sync** | `lib/finance/qboSync.server.ts` — aggregates **unsynced** entries for a period into one QBO JournalEntry batch |
| **Cron** | `app/api/cron/accounting-sync/route.ts` — prior calendar month; requires `CRON_SECRET` |

**Headless QBO process:**

1. Cron loads journal entries for target period where `syncedToQbo === false`
2. `aggregateJournalEntries()` rolls up debits/credits by account
3. OAuth token refresh via `lib/finance/qboAuth.server.ts`
4. POST aggregated journal to QuickBooks REST API (account refs from `QBO_ACCOUNT_*_ID` env vars)
5. `markJournalEntriesSyncedToQbo()` sets `syncedToQbo`, `syncedAt`, `qboSyncId` on each entry
6. Updates `settings/accounting.lastQboSyncAt`, `lastQboSyncPeriod`, `lastQboSyncId`

**Firestore rules:** `journal_entries` is append-only for clients; Admin SDK performs writes and QBO sync marking.

#### 4. Exception Handling & Troubleshooting

| Symptom | Likely cause | Operator action |
|---------|--------------|-----------------|
| No entries for fulfilled orders | Journaling hook skipped or fulfill path error | Check order status; review server logs for `journaling` |
| Unbalanced entry rejected | Schema validation failure | Engineering review—should not reach prod |
| QBO sync 401 | Expired OAuth | Re-run QBO connect flow; verify `QBO_*` env vars |
| Entries stuck unsynced | Cron not running or CRON_SECRET mismatch | Verify `vercel.json` cron; test `/api/cron/accounting-sync` with secret |
| Duplicate QBO posts | Retry without idempotency | Check `qboSync.externalId`; engineering fix |
| Ledger page empty | No fulfillments yet or API error | Fulfill test order; check network tab for `/api/admin/ledger` |

---

### Proforma Underwriting Engine

**Route:** `/admin/proforma` (sidebar: **System → Proforma**)  
**Module flag:** None (client-side analysis tool)

#### 1. Strategic Purpose

Proforma is the **interactive underwriting sandbox** for deal economics: operators adjust revenue, COGS, opex, and capital structure sliders to model **GP/LP profit splits** and waterfall returns **before** committing terms. It aligns conceptually with the Native Ledger account structure but does **not** read live `journal_entries`—it is a forward-looking model, not a reporting dashboard.

#### 2. Operational Workflow (How-To)

1. Navigate to **System → Proforma**.
2. Adjust sliders (all client-side, session-only state):
   - **Gross revenue**, **CAC**, **OpEx**
   - **COGS %**, **Merchant fee %**, **Churn %**
   - **GP split %** and **LP split %** (must sum meaningfully for distribution)
3. Watch the waterfall panel update in real time: revenue after churn → gross profit → EBITDA → GP/LP distributions.
4. Use outputs for investor memos or term-sheet drafts—export values manually (no PDF in v1).
5. Cross-check COGS and merchant-fee assumptions against **Ledger** actuals when calibrating models.

#### 3. System Telemetry (Under the Hood)

| Piece | Location |
|-------|----------|
| **UI** | `features/admin/components/ProformaPageContent.tsx` |
| **State** | `lib/finance/ProformaContext.tsx` — slider variables in React context |
| **Math** | `lib/finance/waterfall.ts` — `calculateEbitdaWaterfall()` |

**Slider → native ledger alignment (conceptual, not live sync):**

| Proforma input | Ledger account code |
|----------------|---------------------|
| Revenue lines | `revenue`, `shipping_revenue` |
| COGS % | `cogs` / `inventory` pairing on order journal |
| Merchant fee % | `merchant_fees` |
| GP/LP split | Distributable **EBITDA** only — not posted to `journal_entries` |

Proforma is **read-only with respect to Firestore**—no writes to `journal_entries`. The native ledger records actual cleared orders; Proforma models hypothetical unit economics.

**Waterfall sequence:**

1. Apply churn to gross revenue
2. Subtract COGS → gross profit
3. Subtract merchant fees, CAC, OpEx → **EBITDA**
4. Split positive EBITDA between GP and LP by slider percentages (residual = retained EBITDA)

#### 4. Exception Handling & Troubleshooting

| Symptom | Likely cause | Operator action |
|---------|--------------|-----------------|
| Sliders reset on refresh | Expected—state is session-only | Re-enter assumptions or note values |
| Numbers disagree with Ledger | Proforma is hypothetical; Ledger is actual | Use Ledger for historical truth; Proforma for scenarios |
| Negative distributable | Opex/COGS exceed revenue | Adjust inputs; validate assumptions |
| Waterfall looks wrong | GP/LP split math | GP + LP percentages split distributable EBITDA proportionally; check `retainedEbitda` row |

---

### Modules Control Center

**Route:** `/admin/modules` (sidebar: **System → Modules**)  
**Access:** Super Admin recommended; toggles global application behavior

#### 1. Strategic Purpose

The Modules Control Center is the **feature-flag command plane** for MedFit. Each boolean in `settings/modules` gates routes, API handlers, and sidebar visibility **without a code deployment**. This is how preview/staging certifies payment rails, Zero-Touch Ops, and satellite provisioning before production cutover.

#### 2. Operational Workflow (How-To)

1. Navigate to **System → Modules**.
2. Review phased toggle groups (Compliance, Commercialization, Sales, Growth, etc.) from `lib/schemas/modules.ts`.
3. Enable a module on **preview** first; run the linked checklist in **Rollout Guide**.
4. Toggle saves via **PATCH** `/api/admin/modules` with partial flag keys—no redeploy required.
5. After save, `revalidateTag('module-flags')` invalidates cache; reads also use a **60-second** `unstable_cache` TTL as fallback.
6. Confirm gated pages return **200** instead of **404**—for example:
   - `isSatelliteProvisioningEnabled` → `/admin/satellites`
   - `isZeroTouchOpsEnabled` → `/admin/exceptions`
7. Disable modules to instantly **fail-closed** (404) on risky features during incidents.

**Do not** enable B2C payment rails or satellite provisioning in production until BRAM and provider sandbox sign-off are complete.

#### 3. System Telemetry (Under the Hood)

| Component | Detail |
|-----------|--------|
| **Storage** | Firestore `settings/modules` — boolean map merged with `DEFAULT_MODULE_FLAGS` |
| **Read path** | `getModuleFlags()` in `lib/firebase/modules.server.ts` — cached 60s, tag `module-flags` |
| **Write path** | `PATCH /api/admin/modules` → `writeModuleFlags()` + audit log `modules_update` |
| **Gate pattern** | API routes call `isModuleEnabled()` or `requireModule()` → **404** when OFF |
| **Nav** | `lib/modules/adminNav.ts` / `adminModuleLinks.ts` — sidebar links filtered by flags |
| **RBAC** | `lib/modules/rbac.ts` — route permissions for admin sections |

**Representative flags:**

| Flag | Effect when OFF |
|------|-----------------|
| `isSatelliteProvisioningEnabled` | `/admin/satellites`, deploy API 404 |
| `isZeroTouchOpsEnabled` | `/admin/exceptions`, retry API 404 |
| Payment rail flags | Checkout/API paths for SeamlessChex, PayRam, etc. hidden |
| Commercial modules | Quotes, Growth, Verifications routes gated |

**Global state without deploy:** Changing `settings/modules` updates the next API request and nav render after cache TTL—no Vercel redeploy required.

#### 4. Exception Handling & Troubleshooting

| Symptom | Likely cause | Operator action |
|---------|--------------|-----------------|
| Toggle saves but page still 404 | Cache not refreshed | Wait 60s; hard refresh; verify Firestore doc |
| Module ON in UI but API 404 | Mismatch flag key name | Compare toggle ID to `requireModule()` string in API |
| Sidebar missing Fleet OS | All Fleet flags OFF | Enable at least one Fleet module |
| Production incident | Bad module enabled | Turn OFF flag immediately—fail-closed |
| Duplicate key console warning | Fixed in `EnabledModulesPanel` — use phase label keys | Update app if warning persists on old build |

---

## Part 3 — Core Operations, Commercial & System Reference

---

### Order Workflow

**Route:** `/admin/orders` (sidebar: **Core → Orders**)  
**Module flags (optional panels):** `isAccountingExportEnabled`, `isBatchCoaEnabled`, `isRealShippingEnabled`

#### 1. Strategic Purpose

Orders is the **fulfillment control tower** for every customer requisition—B2B institution buyers, guest checkout, and quote conversions. Operators advance orders through a defined status pipeline, attach batch traceability, create carrier labels, and (when enabled) export accounting CSV. Payment capture and stock decrement happen via Stripe/provider webhooks (`fulfillPaidOrder`); this UI is where humans **unblock, verify, and close the loop** when automation needs eyes.

#### 2. Operational Workflow (How-To)

1. Navigate to **Core → Orders**.
2. Use status filters: **All**, **Pending Payment**, **Pending Invoice**, **Paid**, **Processing**, **Fulfilled**, **Cancelled**.
3. For each order row:
   - Review customer (`guestEmail` or `userId`), line items, total, tracking (if present).
   - Change status via the dropdown — saves immediately via `PATCH /api/admin/orders/{orderId}`.
4. **When `isBatchCoaEnabled`:** On **Paid** or **Processing** orders, click **Assign Batches** → `POST /api/admin/orders/{orderId}/assign-batches`.
5. **When `isRealShippingEnabled`:** On signed-in orders without tracking, click **Create Label** → `POST /api/admin/orders/{orderId}/ship` (EasyPost).
6. **When `isAccountingExportEnabled`:** Use the **QuickBooks Export** panel at top — pick date range, download CSV of completed orders (`GET /api/admin/export-orders`). Requires admin or finance role.

**Status progression (typical happy path):**

`pending_payment` → `paid` → `processing` → `fulfilled`

Net-30 institutional buyers may sit in `pending_invoice` until Stripe invoice clears.

#### 3. System Telemetry (Under the Hood)

| Layer | Behavior |
|-------|----------|
| **Page load** | Real-time Firestore listener on `orders` ordered by `createdAt` desc |
| **Status update** | `PATCH /api/admin/orders/[orderId]` — writes `status`, logs `order_status_update` to `auditLogs` |
| **Fulfilled transition** | Sends shipping notification email if recipient email resolvable |
| **Batch assign** | Module-gated `isBatchCoaEnabled`; links order lines to `batches` collection |
| **Label create** | Module-gated `isRealShippingEnabled`; calls EasyPost via `createAutoShippingLabel` |
| **Payment fulfill (automatic)** | Stripe/provider webhooks call `fulfillPaidOrder()` — decrements stock, journals ledger, triggers Zero-Touch auto-PO/label when enabled |

**Collections read:** `orders` (client listener)  
**Collections written:** `orders` (via Admin SDK on PATCH); batch/shipment side effects via sub-routes

#### 4. Exception Handling & Troubleshooting

| Symptom | Likely cause | Operator action |
|---------|--------------|-----------------|
| Order stuck in pending_payment | Webhook failure or abandoned checkout | Verify Stripe dashboard; manually advance only if payment confirmed |
| Assign Batches button missing | `isBatchCoaEnabled` OFF | Enable in **Modules** |
| Create Label missing | Flag OFF, guest order, or tracking exists | Enable real shipping; labels require `userId` |
| Label creation fails | EasyPost env or bad ship-to | Check **Exceptions** queue; fix address |
| Export 404 | `isAccountingExportEnabled` OFF | Enable module or use **Ledger** QBO sync |
| Export 403 | Non-finance role with granular RBAC | Use admin/finance account |
| Status change no effect | Firestore rules or 401 session | Re-authenticate; check browser network tab |

---

### Inventory & Purchase Orders

**Route:** `/admin/inventory` (sidebar: **Core → Inventory**)  
**Optional panels:** `isBatchCoaEnabled` (Batch & COA), `isComplianceGeoBlockEnabled` (Geo Restrictions)

#### 1. Strategic Purpose

Inventory bridges **catalog stock levels** and **wholesale procurement**. It surfaces SKUs at or below reorder threshold, lets operators draft supplier POs, and (when enabled) manages batch genealogy and checkout geo-blocking. Zero-Touch auto-PO (see **Exceptions**) runs separately on payment clearance; this page is for **manual procurement planning** and compliance configuration.

#### 2. Operational Workflow (How-To)

1. Navigate to **Core → Inventory**.
2. Review **low-stock table** — variants where `stock <= reorderThreshold` (default threshold 20).
3. Select checkboxes for SKUs needing replenishment → **Draft PO**.
4. Review **Purchase Orders** table below:
   - **Approve** — marks PO `approved`, stamps `approvedAt`
   - **Export CSV** — downloads line items for supplier email/ERP
5. **Batch & COA** (`#batch-coa`, when enabled): Register inbound lots, upload COA references, trace order→batch assignment.
6. **Geo Restrictions** (`#geo-compliance`, when enabled): Configure US states blocked at checkout.

**Reorder quantity heuristic (draft PO):** UI estimates `max(reorderThreshold × 2 − stock, 10)` units per selected SKU.

#### 3. System Telemetry (Under the Hood)

| Action | API / storage |
|--------|---------------|
| Low-stock list | Client `onSnapshot` on `products`, filtered client-side |
| PO list | Client `onSnapshot` on `purchaseOrders` ordered by `generatedAt` desc |
| Draft PO | `POST /api/admin/purchase-orders` `{ variantIds, supplierId? }` → `purchaseOrders` doc, status `pending_supplier_review` |
| Approve / export | `PATCH /api/admin/purchase-orders` `{ poId, action: "approve" \| "export" }` |
| Audit | `purchase_order_draft`, `purchase_order_approve`, `purchase_order_export` logged |

**Auto-PO (Zero-Touch):** When `isZeroTouchOpsEnabled` + operations settings allow, `runPostPaymentAutomation()` may create POs automatically on low stock—failures land in **Exceptions**.

#### 4. Exception Handling & Troubleshooting

| Symptom | Likely cause | Operator action |
|---------|--------------|-----------------|
| No low-stock rows but Dashboard shows alerts | Threshold mismatch | Edit `reorderThreshold` in **Products** |
| Draft PO fails — no valid variants | Selected SKUs deleted | Refresh; re-select from current catalog |
| PO table empty after draft | Listener lag | Wait for Firestore sync; hard refresh |
| Batch panel missing | `isBatchCoaEnabled` OFF | Enable in **Modules** |
| Geo panel missing | `isComplianceGeoBlockEnabled` OFF | Enable in **Modules** |
| Auto-PO duplicates manual PO | Both paths triggered | Disable auto-PO in operations settings or resolve in **Exceptions** |

---

### Institution Verifications

**Route:** `/admin/verifications` (sidebar: **Commercial → Verifications**, when visible)  
**Module flags required:** `isB2BProcurementEnabled` + `isInstitutionVerificationEnabled`  
**Optional enrichment:** `isMiddeskVerificationEnabled` + `MIDDESK_API_KEY`

#### 1. Strategic Purpose

Institution Verifications is the **KYB gateway** for B2B procurement. Researchers submit institution name, EIN, lab type, and supporting documents; operators approve or reject, assigning an institution tier that unlocks tiered pricing, Net-30 invoicing, and quote workflows. Middesk automation (when enabled) pre-scores business registration and TIN match before human review.

#### 2. Operational Workflow (How-To)

1. Enable **`isB2BProcurementEnabled`** and **`isInstitutionVerificationEnabled`** in **Modules**.
2. Navigate to **Commercial → Verifications**.
3. Review each pending request: institution, EIN, lab type, document path, Middesk panel (if present).
4. Optionally check **Mark sales tax exempt** before approval (valid resale certificate on file).
5. **Approve · Bronze Tier** — assigns Bronze tier, updates user profile, sends approval email.
6. **Reject** — sends rejection email with default clarification reason.

Approved institutions appear as verified in **Sales Command Center** and receive tier pricing at checkout when `isTieredPricingEnabled` is on.

#### 3. System Telemetry (Under the Hood)

| Component | Detail |
|-----------|--------|
| **Collection** | `institutionVerifications/{userId}` |
| **List** | `GET /api/admin/verifications?status=pending` |
| **Review** | `PATCH /api/admin/verifications/{userId}` — `{ action: "approve", institutionTier?, taxExempt? }` or `{ action: "reject", rejectionReason? }` |
| **Approve side effects** | Updates `users/{userId}` — `institutionVerified`, `institutionTier`, optional `taxExempt`; verification doc → `approved` |
| **Middesk** | `lib/kyb/runMiddeskForVerification.server.ts` — runs on submit when flag + API key configured; stores `middesk` report on verification doc |
| **Email** | `sendVerificationDecisionEmail()` on approve/reject |
| **Audit** | `verification_approved` / `verification_rejected` in `auditLogs` |

**B2B gate pattern:** All Commercial procurement APIs call `requireB2BProcurement(flags, subFlag)` — master flag must be ON.

#### 4. Exception Handling & Troubleshooting

| Symptom | Likely cause | Operator action |
|---------|--------------|-----------------|
| Page redirects to Dashboard | Module flags OFF | Enable B2B procurement + institution verification |
| Middesk shows "Skipped" | `MIDDESK_API_KEY` missing or flag OFF | Configure env; enable `isMiddeskVerificationEnabled` |
| Middesk error panel | API failure or bad EIN | Manual review; verify document upload in Storage |
| Approve fails 404 | Verification withdrawn | Refresh queue |
| User still blocked at checkout | Tier pricing or Net Terms not enabled | Enable sub-flags; confirm user doc updated |

---

### Procurement Quotes

**Route:** `/admin/quotes` (sidebar: **Commercial → Quotes**)  
**Module flags required:** `isB2BProcurementEnabled` + `isQuoteWorkflowEnabled`

#### 1. Strategic Purpose

Quotes lets sales and ops build **institutional price proposals** with tier-aware line pricing, printable PDFs, and quote-linked checkout URLs. It separates ad-hoc negotiation from the live catalog cart—critical for multi-SKU lab orders where email approval precedes payment.

#### 2. Operational Workflow (How-To)

1. Enable B2B procurement + quote workflow flags.
2. Navigate to **Commercial → Quotes** → **New Quote**.
3. Enter customer name, email, optional institution; select line-item quantities from active catalog.
4. **Create Draft Quote** — appears in register as `draft`.
5. Lifecycle actions per row:
   - **PDF** — opens `/api/admin/quotes/{id}/pdf` in new tab
   - **Mark Sent** — `draft` → `sent`
   - **Accept** — `draft` or `sent` → `accepted`
   - **Copy Checkout Link** — `/checkout/quote?quoteId={id}` (sent/accepted only)
   - **Cancel** — terminal cancel state

Share PDF + checkout link with institution buyer; payment flows through standard checkout bound to quote totals.

#### 3. System Telemetry (Under the Hood)

| Component | Detail |
|-----------|--------|
| **Collection** | `quotes/{id}` |
| **Numbering** | Transaction on `counters/quotes-{year}` → `Q-{year}-{seq}` |
| **Pricing engine** | `createQuote()` → `validateAndPriceCart()` — applies tier overrides from `priceLists` when customer linked |
| **Shipping estimate** | `estimateShipping()` rolled into quote total |
| **APIs** | `GET/POST /api/admin/quotes`; `PATCH /api/admin/quotes/{id}` with `{ action: send \| accept \| cancel \| expire }` |
| **Audit** | `quote_created` logged on POST |

**Status enum:** `draft`, `sent`, `accepted`, `expired`, `cancelled`

#### 4. Exception Handling & Troubleshooting

| Symptom | Likely cause | Operator action |
|---------|--------------|-----------------|
| Page 404 | Quote workflow disabled | Enable flags in **Modules** |
| Create fails validation | Inactive SKU or zero qty | Select active products with stock |
| Checkout link invalid | Quote expired or cancelled | Re-issue quote; check `validUntil` |
| PDF blank/error | Missing quote doc | Verify quote ID; check server logs |
| Wrong price on quote | Tier not applied | Link `customerUserId` or confirm institution tier on user |

---

### Sales Command Center

**Route:** `/admin/sales` (sidebar: **Commercial → Sales**)  
**Module flag required:** `isSalesCommandCenterEnabled`  
**Sub-features:** `isMarginReportingEnabled`, `isLeadRoutingEnabled`, `isClientImpersonationEnabled`

#### 1. Strategic Purpose

Sales Command Center is the **account executive workspace**: institution pipeline visibility, gross margin intelligence, AE round-robin configuration, and secure client co-browse. It aggregates verified accounts, open quotes, recent leads, and order velocity so reps can prioritize outreach without querying Firestore manually.

#### 2. Operational Workflow (How-To)

1. Enable **`isSalesCommandCenterEnabled`**.
2. Navigate to **Commercial → Sales**.
3. Review stat cards: verified institution count, open quotes, leads (30d), recent orders.
4. **Gross Margin panel** (when `isMarginReportingEnabled`): Review blended margin and top SKUs by revenue/COGS from fulfilled orders.
5. **AE Roster** (when `isLeadRoutingEnabled`): Add AE name, email, Firebase UID → **Save Roster** for round-robin lead assignment on signup.
6. **Institution Accounts table:** Scan verification status, tier, lead score, assigned AE.
7. **Co-browse** (when `isClientImpersonationEnabled`): Click on a customer row → starts impersonation session, redirects to `/catalog` as that user.

Stop co-browse via impersonation stop flow when session complete.

#### 3. System Telemetry (Under the Hood)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/admin/sales` | `getSalesWorkspaceSnapshot()` — accounts, quote count, lead count, order count |
| `GET /api/admin/margins` | Margin report from fulfilled orders × product `baseCost` |
| `GET/PATCH /api/admin/sales/settings` | AE roster in `settings/sales` |
| `POST /api/admin/impersonation/start` | Sets impersonation cookie; requires Sales CC + client impersonation flags |
| `POST /api/admin/impersonation/stop` | Clears impersonation context |

**Lead routing:** Clearbit enrichment + AE assignment fires on signup when `isLeadRoutingEnabled` (configured in rollout guide).

#### 4. Exception Handling & Troubleshooting

| Symptom | Likely cause | Operator action |
|---------|--------------|-----------------|
| Page 404 | Sales CC disabled | Enable `isSalesCommandCenterEnabled` |
| Co-browse 400 | Target is admin/staff account | Only customer-role users eligible |
| Margin panel empty | No fulfilled orders or flag OFF | Enable margin reporting; fulfill test orders |
| AE roster not saving | Lead routing flag OFF | Enable `isLeadRoutingEnabled` |
| Impersonation stuck | Cookie not cleared | Call stop endpoint; sign out/in |

---

### Growth Command Center

**Route:** `/admin/growth` (sidebar: **Commercial → Growth**)  
**Module flags:** At least one of `isAbandonedCartEnabled`, `isPredictiveReplenishmentEnabled`, `isLoyaltyRedemptionEnabled`

#### 1. Strategic Purpose

Growth Command Center orchestrates **retention automation**: abandoned cart recovery emails, predictive replenishment nudges (80–100 day reorder window), and loyalty redemption policy visibility. Operators monitor candidate queues and manually trigger cron jobs during rollout/testing before Vercel scheduled crons take over.

#### 2. Operational Workflow (How-To)

1. Enable one or more growth flags + **`isTransactionalEmailEnabled`** for actual sends (Resend).
2. Navigate to **Commercial → Growth**.
3. Review metrics: active cart snapshots, abandoned carts ready, replenishment candidates.
4. **Run abandoned cart job** — processes idle carts, sends recovery emails via `/api/cron/abandoned-carts`.
5. **Run replenishment job** — emails repeat buyers in reorder window via `/api/cron/replenishment`.
6. Read **Loyalty redemption** panel for checkout points policy (100 points = $1 discount).

Amber banner appears when email jobs are enabled but transactional email module is OFF.

#### 3. System Telemetry (Under the Hood)

| Component | Detail |
|-----------|--------|
| **Page load** | `GET /api/admin/growth` — aggregates flags + candidate lists |
| **Manual job run** | `POST /api/admin/growth/run` `{ job: "abandoned-carts" \| "replenishment" }` — proxies to cron routes with `CRON_SECRET` |
| **Cart snapshots** | `cartSnapshots` collection — tracks active/abandoned carts |
| **Replenishment** | `findReplenishmentCandidates()` — scans order history for 80–100 day window |
| **Cron (production)** | Scheduled in `vercel.json` — same endpoints as manual run |

#### 4. Exception Handling & Troubleshooting

| Symptom | Likely cause | Operator action |
|---------|--------------|-----------------|
| Page 404 | All growth flags OFF | Enable at least one growth module |
| Job returns 503 | `CRON_SECRET` missing | Set in Vercel env |
| Job runs but 0 sent | Transactional email OFF or Resend sandbox | Enable `isTransactionalEmailEnabled`; verify Resend domain |
| No abandoned carts | Carts still within idle threshold | Wait or lower threshold in config |
| No replenishment candidates | No orders in 80–100d window | Expected for new deployments |

---

### User Management

**Route:** `/admin/users` (sidebar: **Commercial → Users**)  
**Module flag required:** `isUserManagementEnabled`

#### 1. Strategic Purpose

User Management is the **access control plane** for partners, staff, and support roles. Operators invite users with branded email (Resend) or Firebase password-set fallback, assign RBAC roles, disable accounts, and resend invitations—without using the Firebase console directly.

#### 2. Operational Workflow (How-To)

1. Enable **`isUserManagementEnabled`**.
2. Navigate to **Commercial → Users**.
3. Review sandbox notice if Resend is in test mode (invites fall back to Firebase password email).
4. **Invite User** — open composer, set email, role, optional welcome copy → send.
5. Track **Latest invite** banner: sent / pending / failed status with password-set link copy.
6. Per-row actions:
   - **Invite** — customize & resend for existing user
   - **Manage** — change role, disable account (cannot demote/disable self)
7. **My invite** — resend invitation for your own admin account (password setup).

Roles map to `accessLevel` and granular route permissions when `isGranularRbacEnabled` is on.

#### 3. System Telemetry (Under the Hood)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/admin/users` | `listUsersForAdmin(200)` + Resend config metadata |
| `POST /api/admin/users` | Create user + send invite via `sendPersonaInvite()` |
| `PATCH /api/admin/users` | Update role/disabled state |
| `GET /api/admin/invitations?targetUid=` | Load draft for resend composer |
| `POST /api/admin/invitations/resend` | Resend with customized copy |

**Collections:** `users/{uid}`, invitation audit trail, Firebase Auth user records  
**Audit:** User create/update actions logged via `logAdminAction`

#### 4. Exception Handling & Troubleshooting

| Symptom | Likely cause | Operator action |
|---------|--------------|-----------------|
| Page 404 | User management disabled | Enable flag |
| Invite pending — no email | Resend sandbox / Firebase fallback | Copy password-set link manually |
| Cannot demote self | Safety guard | Use another admin account |
| Partner sees wrong role | Stale session | User re-login after role change |
| Branded email not delivered | Domain not verified at Resend | Follow rollout guide `#p4-resend` |

---

### V2 Rollout Playbook

**Route:** `/admin/rollout` (sidebar: **System → Rollout Guide**)  
**Module flag:** None — always available

#### 1. Strategic Purpose

The Rollout Playbook is the **operator-run deployment manual** embedded in the admin UI. It sequences go-live steps across phases (Firestore rules, B2B procurement, shipping, sales, growth, satellites, ledger/QBO) with direct links to module toggles, env var references, and in-app actions—reducing reliance on scattered docs during production cutover.

#### 2. Operational Workflow (How-To)

1. Navigate to **System → Rollout Guide**.
2. Start with **Global prerequisites** — deploy Firestore rules, verify Vercel env vars.
3. Work phase-by-phase (Phase 0 deploy → Phase 6 commercialization):
   - Complete each step checkbox item before enabling related module flags in **Modules**.
4. Use **Quick links** jump bar for Modules, Growth jobs, Proforma, Satellites, Sales, catalog.
5. **Algolia reindex** (when search enabled): Run from Phase 5 section — `POST /api/admin/search/reindex`.
6. Cross-reference **Environment variable reference** table at bottom for secret names.

**Rule of thumb:** Enable flags on preview → certify in sandbox → enable production → monitor **Exceptions** and **Audit Logs**.

#### 3. System Telemetry (Under the Hood)

| Source | Detail |
|--------|--------|
| **Content** | Static arrays in `lib/admin/rolloutGuide.ts` — `ROLLOUT_GLOBAL_STEPS`, `ROLLOUT_PHASES_WITH_COMMERCIAL`, `ROLLOUT_ENV_REFERENCE` |
| **Algolia status** | `GET /api/admin/search/reindex` — returns `{ enabled, configured }` |
| **Reindex action** | `POST /api/admin/search/reindex` — indexes catalog records |
| **Phase metadata** | Each phase lists `moduleFlags[]` and `adminPaths[]` tied to sidebar routes |

No Firestore writes from this page—it is a structured runbook renderer.

#### 4. Exception Handling & Troubleshooting

| Symptom | Likely cause | Operator action |
|---------|--------------|-----------------|
| Reindex fails | Algolia keys missing or flag OFF | Set `ALGOLIA_*` env vars; enable search module |
| Step links 404 | Module not yet enabled | Expected — enable flag after prerequisites |
| Env var table outdated | Code drift | Compare with `.env.example` in repo |
| Phase order confusion | Parallel-safe phases | P1 Middesk ∥ P2 Shipping per BUILD_PLAN |

---

### Master System Map

**Route:** `/admin/system-map` (sidebar: **System → Master Map**)  
**Module flag:** None — always available

#### 1. Strategic Purpose

The Master System Map is an **interactive architecture visualization** of the MedFit platform—nodes (Firebase, Stripe, EasyPost, Vercel, QuickBooks, etc.) and edges showing data flow from deploy through retain. It helps operators and engineers understand how a customer signal traverses subsystems without reading source code, and complements this written manual for onboarding.

#### 2. Operational Workflow (How-To)

1. Navigate to **System → Master Map** (opens full-screen overlay).
2. **Guided mode (default):** Watch the signal trace animate through acts — Deploy → Discover → Verify → Procure → Transact → Fulfill → Close → Retain.
3. Click any node to **pause** and read the detail panel (infrastructure, status, connected nodes).
4. **Resume** to continue guided journey, or stay in explore mode clicking nodes freely.
5. Toggle **Act 0 deploy** in footer to include/exclude infrastructure provisioning hops.
6. **← Return to Dashboard** exits full-screen map.

#### 3. System Telemetry (Under the Hood)

| Component | Location |
|-----------|----------|
| **Node/edge config** | `lib/admin/systemMap/` — nodes, edges, zones, telemetry loops |
| **Signal trace queue** | `buildSignalTraceQueue()` in `signalTrace.ts` — ordered hops with headlines |
| **UI** | `SystemMapGraph`, `SystemMapDetailPanel`, `SystemMapPageContent` |
| **Journey timing** | `JOURNEY_DWELL_MS` per hop; auto-loops at end |

Read-only — no API calls or database writes. Node metadata documents implementation status (live vs scaffold) for engineering honesty.

#### 4. Exception Handling & Troubleshooting

| Symptom | Likely cause | Operator action |
|---------|--------------|-----------------|
| Blank graph | Client JS error | Hard refresh; check console |
| Journey too fast/slow | Fixed dwell constant | Engineering tweak — not operator configurable |
| Node shows "scaffold" | Feature not production-live | Cross-check **Modules** flags and Rollout phase |
| Full-screen trap | By design | Use Return to Dashboard link |

---

### Compliance Audit Logs

**Route:** `/admin/audit` (sidebar: **System → Audit Logs**)  
**Module flag:** None — always available

#### 1. Strategic Purpose

Audit Logs provide a **read-only compliance trail** of age-gate verifications and privileged admin actions (order updates, verification decisions, PO approvals, module changes). This supports regulatory inquiry response and internal security review without granting Firestore console access.

#### 2. Operational Workflow (How-To)

1. Navigate to **System → Audit Logs**.
2. Filter: **All events**, **Age gate**, or **Admin actions**.
3. Review timestamp, event type, user ID, metadata JSON.
4. Click **Export CSV** to download filtered rows for legal/compliance archives.

Maximum **200** most recent entries loaded via real-time listener.

#### 3. System Telemetry (Under the Hood)

| Component | Detail |
|-----------|--------|
| **Collection** | `auditLogs` — ordered by `timestamp` desc |
| **Page load** | Client `onSnapshot` with `limit(200)` |
| **Writers** | `logAdminAction()` in `lib/firebase/adminAuth.server.ts` — called from admin API routes |
| **Event types** | `admin_action` (with `action` string), `age_verification`, PO/verification/order/module actions |
| **Export** | Client-side CSV generation — no server export endpoint |

**Representative logged actions:** `order_status_update`, `verification_approved`, `verification_rejected`, `purchase_order_draft`, `modules_update`, `quote_created`

#### 4. Exception Handling & Troubleshooting

| Symptom | Likely cause | Operator action |
|---------|--------------|-----------------|
| Empty log | New environment or rules deny read | Verify admin Firestore read rules for `auditLogs` |
| Missing expected action | Route didn't call `logAdminAction` | File engineering ticket; use server logs meanwhile |
| User shows as anonymous | Action without session uid | Expected for some system events |
| Export truncated | 200-row client limit | Query Firestore directly for deep history (Super Admin) |

---

*End of Operator's Manual — all Back-Office sidebar modules documented.*

