# Sprint 2 — Institutional Gateway & Accounting Hardening

> **TPTPeptides V2 · Phase 1**  
> **Status:** Implemented · build verified

---

## Module flags (enable at `/admin/modules`)

| Flag | Feature |
|------|---------|
| `isInstitutionVerificationEnabled` | KYB form + admin review queue |
| `isAccountingExportEnabled` | Financial order fields + QuickBooks CSV export |

Both default **off** until toggled live.

---

## 1. Institution verification

### Routes

| Surface | Path |
|---------|------|
| User form | `/account/verify` |
| Admin queue | `/admin/verifications` |

### APIs

| Method | Route | Auth |
|--------|-------|------|
| GET | `/api/account/verification` | Signed-in user |
| POST | `/api/account/verification` | Signed-in user (multipart) |
| GET | `/api/admin/verifications?status=pending` | Admin |
| PATCH | `/api/admin/verifications/[userId]` | Admin (`approve` \| `reject`) |

### Data

- **Firestore:** `institutionVerifications/{userId}`
- **Storage:** `verification_docs/{uid}/{timestamp}_{filename}`
- **On approve:** `users/{uid}` → `institutionVerified: true`, `institutionTier: 'Bronze'`
- **Audit:** `verification_submitted`, `verification_approved`, `verification_rejected`

### Flag-off behavior

- `/account/verify` → redirect `/account`
- Verification APIs → **404**
- Client Portal hides verify CTA

---

## 2. Order financial schema + export

### Fields on every order

| Field | When set |
|-------|----------|
| `subtotal`, `shipping`, `tax`, `discountTotal`, `total` | Checkout create + locked on webhook |
| `paymentMethod` | Checkout create (`stripe_checkout`) |
| `stripePaymentIntentId` | Stripe webhook |
| `ruoAttestationTimestamp`, `ipAddress` | Checkout create |
| `financialLockedAt` | Stripe webhook fulfillment |

### Export

```
GET /api/admin/export-orders?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

- Gated: `isAccountingExportEnabled`
- Returns QuickBooks-ready CSV (paid / processing / fulfilled only)
- UI: **Orders** admin page → QuickBooks Export panel

---

## 3. Cache invalidation

On product save (`PUT /api/admin/products`) and catalog seed (`POST /api/admin/seed`):

```ts
revalidateTag('product-overrides', 'max')
revalidateTag('catalog-summaries', 'max')
```

---

## Deploy checklist

```powershell
# 1. Firestore rules + indexes
firebase deploy --only firestore:rules,firestore:indexes

# 2. Vercel — confirm env
# NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
# FIREBASE_* admin credentials

# 3. Enable modules (production)
# /admin/modules → Institution Verification + Accounting Export ON
```

---

## Quick test flow

1. Sign in → **Client Portal** → **Verify Institution for B2B Access**
2. Submit W-9 / institutional letter (PDF)
3. **Admin → Verifications** → Approve (Bronze tier)
4. Complete Stripe test checkout
5. **Admin → Orders** → export CSV for order date range

---

## Key files

| Area | Path |
|------|------|
| Verification schema | `lib/schemas/verification.ts` |
| Order financial schema | `lib/schemas/order.ts` |
| Storage upload | `lib/firebase/storage.server.ts` |
| Verification server | `lib/firebase/verification.server.ts` |
| Orders + export query | `lib/firebase/orders.server.ts` |
| CSV builder | `lib/accounting/quickbooksExport.ts` |
| User form | `features/account/components/InstitutionVerifyForm.tsx` |
| Admin queue | `features/admin/components/VerificationsPageContent.tsx` |
| Export UI | `features/admin/components/AccountingExportPanel.tsx` |
