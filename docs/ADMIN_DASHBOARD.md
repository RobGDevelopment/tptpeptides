# Admin Dashboard Guide — Phase E

## Access

1. Sign in via the Client Portal (`/` or `/account`)
2. Ensure your Firebase user has admin role: `users/{uid}.role = "admin"` (see `docs/ADMIN_ROLE_SETUP.md`)
3. Navigate to `/admin`

Non-admin users are redirected to the storefront.

---

## Sidebar Navigation

| Route | Purpose |
|-------|---------|
| `/admin` | Dashboard — KPI cards + catalog snapshot |
| `/admin/products` | PIM — product table, edit/add modal, **Run Seed** |
| `/admin/storefront` | Storefront CMS — hero, featured grid, categories, research, protocols |
| `/admin/orders` | Order workflow — filter by status, update fulfillment |
| `/admin/inventory` | Low-stock variants + draft purchase orders |
| `/admin/audit` | Compliance audit log (read-only) |

---

## Seeding the Product Catalog

The master handbook lives at `lib/data/catalog.json`. Each catalog entry is flattened into Firestore `products` documents (one doc per variant/SKU).

### From the Products page (recommended)

1. Go to **Admin → Products**
2. Click **Run Seed**
3. Confirm the success banner (e.g. "Seeded 58 product variants from catalog.json")

The seed API (`POST /api/admin/seed`) is admin-authenticated and batch-writes all variants with:
- Server-side Zod validation
- Default stock `0`, reorder threshold `20`
- `active: true` only when `retailPrice` is set in the handbook
- Estimated retail (`baseCost × 2.5`) for variants missing retail price (marked inactive)

### Requirements

- Firebase Admin SDK env vars configured (see `docs/FIRESTORE_SETUP.md`)
- Signed-in admin session cookie (`medfit-auth`)

Each seed run merges into existing product docs by variant ID.

---

## Product Management

- **Edit** — opens modal with parent fields + variant rows (dose, price, base cost, stock, badge, schedule)
- **Add Product** — create a new catalog entry with one or more variants
- Saves via `PUT /api/admin/products` (admin-only, server-validated, RUO copy guard)

See also `docs/STOREFRONT_CMS.md` for homepage/content merchandising and catalog export.

---

## Orders

Filter by status: Pending Payment → Paid → Processing → Fulfilled (or Cancelled).

Status changes call `PATCH /api/admin/orders/{orderId}` and are logged to `auditLogs`.

---

## Inventory & Purchase Orders

Variants at or below their reorder threshold appear flagged.

1. Select low-stock SKUs
2. Click **Draft PO**
3. PO is created in `purchaseOrders` with estimated base cost

---

## Audit Logs

Displays age gate verifications (Phase B) and admin actions (seed, order updates, PO drafts).

Read-only — required for compliance review.
