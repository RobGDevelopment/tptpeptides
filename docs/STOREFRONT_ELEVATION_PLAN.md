# MedFit Storefront Elevation Plan

> **Status:** G2–G10 implemented (June 2026)  
> **Last updated:** June 2026

---

## Phase Summary

| Phase | Status | Highlights |
|-------|--------|------------|
| **G1** | ✅ Complete | Full catalog wiring, PDP, nav, shared shell |
| **G2** | ✅ Complete | Order history API, loyalty tier, shipping address, guest lookup, COA viewer stub |
| **G3** | ✅ Complete | Related products, category pages, sort, JSON-LD Product schema |
| **G4** | ✅ Complete | Cart qty/remove/links, PO number, shipping estimate, Stripe promo codes |
| **G5** | ✅ Partial | Seed script + indexes; **you deploy rules + run seed** |
| **G6** | ✅ Partial | Age-gate server audit API, COA viewer component; App Check needs prod key |
| **G7** | ✅ Complete | GitHub Actions CI, Playwright E2E scaffold |
| **G8** | ✅ Complete | User management, audit filters + CSV export, PO approve/export API |
| **G9** | ✅ Complete | Research notes, newsletter signup, product FAQ accordion |
| **G10** | 📋 Docs | Runbook exists; **Vercel/Stripe live deploy is manual** |

---

## G2 — Client Portal

- `GET /api/account/orders` — order history + loyalty profile
- `PATCH /api/account/profile` — institution shipping address
- Enhanced `/account` — tier display, address form, order details, COA links
- Guest order lookup by email + order ID

---

## G3 — Product Discovery

- `/catalog/category/[slug]` — 15 category landing pages
- Catalog sort: name, price, in-stock-first
- Related compounds on PDP
- JSON-LD `Product` schema on `/catalog/[slug]`

---

## G4 — Cart & Checkout

- Cart drawer: +/- quantity, remove, product links, shipping estimate
- Checkout: PO number, Stripe `allow_promotion_codes`
- Server-side shipping line item on Stripe session

---

## G5 — Live Inventory (Manual Steps)

```powershell
# 1. Seed Firestore (requires Admin SDK in .env.local)
npm run seed:products

# 2. Deploy rules + indexes
firebase deploy --only firestore:rules,firestore:indexes
```

---

## G6 — Compliance

- `POST /api/compliance/age-verification` — server-side audit logging (no client Firestore write)
- `CoaViewer` component on paid orders
- **Remaining:** Firebase Storage for PDF COAs, App Check enforcement in Console

---

## G7 — CI & E2E

```powershell
npm run test:e2e    # Playwright: age gate → catalog → PDP
```

- `.github/workflows/ci.yml` — lint + build on PR

---

## G8 — Admin

- `/admin/users` — role assign, enable/disable
- Audit log filters (age gate / admin) + CSV export
- `PATCH /api/admin/purchase-orders` — approve + CSV export

---

## G9 — Content

- `/research` + `/research/[slug]` — 3 research articles
- Newsletter signup on homepage
- Product FAQ accordion on PDP

---

## G10 — Production Deploy (Your Checklist)

1. Push to GitHub → connect Vercel
2. Set all env vars in Vercel (mirror `.env.local`)
3. Stripe live keys + webhook URL
4. `firebase deploy --only firestore:rules,firestore:indexes`
5. Assign admin: `users/{uid}.role = "admin"`
6. Optional: `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY` + enforce App Check
7. Optional: Sentry DSN in `app/global-error.tsx`

See `docs/DEPLOYMENT_RUNBOOK.md` for full cutover steps.

---

## Quick Verification

- [ ] `/account` — sign in, see loyalty + save address
- [ ] Cart — adjust qty, remove, checkout with PO number
- [ ] `/catalog/category/recovery` — category page loads
- [ ] PDP — related products + FAQ visible
- [ ] `/admin/users` — admin can list users
- [ ] `npm run test:e2e` — passes locally
