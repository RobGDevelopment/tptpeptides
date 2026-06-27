# Firestore Setup — Phase C

## Collections

| Collection | Purpose | Access |
|------------|---------|--------|
| `products` | Catalog (name, tag, price, stock, desc, purity) | Public read (active only); admin write |
| `orders` | Customer orders | Owner read; admin full |
| `users` | Profile + role | Owner read/write; admin override |
| `auditLogs` | Compliance events (age gate, etc.) | Authenticated create; admin read |
| `purchaseOrders` | Supplier POs | Admin only |

### Product document shape

```json
{
  "name": "GHK-Cu",
  "tag": "50mg",
  "price": 49.0,
  "stock": 150,
  "desc": "...",
  "purity": ">99.2%",
  "supplierId": "default-supplier",
  "active": true,
  "reorderThreshold": 10,
  "createdAt": "<server timestamp>",
  "updatedAt": "<server timestamp>"
}
```

Zod schemas live in `lib/schemas/`.

---

## 1. Service account credentials

1. Firebase Console → Project Settings → Service accounts
2. Generate new private key (JSON)
3. Add to `.env.local`:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Use `\n` for line breaks in the private key when storing in `.env.local`.

---

## 2. Seed products

```bash
npm run seed:products
```

This writes the six mock catalog items into Firestore with stable document IDs (`ghk-cu`, `bpc-157`, etc.).

---

## 3. Deploy security rules

Install Firebase CLI if needed: `npm install -g firebase-tools`

```bash
firebase login
firebase use your-project-id
firebase deploy --only firestore:rules,firestore:indexes
```

Rules file: `firestore.rules`  
Indexes: `firestore.indexes.json`

---

## 4. How the app reads data

| Layer | File | Notes |
|-------|------|-------|
| Server catalog | `lib/firebase/products.server.ts` | Admin SDK; ISR revalidate 60s |
| Storefront page | `app/(storefront)/page.tsx` | Server Component fetches products |
| Stock refresh | `POST /api/products/stock` | Authoritative stock on client mount |
| Public API | `GET /api/products` | Cached product list |

If Admin SDK env vars are missing, the server falls back to mock inventory (dev-friendly).

---

## 5. Verify

1. Run `npm run seed:products`
2. Deploy rules: `firebase deploy --only firestore:rules`
3. Start dev server: `npm run dev`
4. Storefront should show Firestore products (same SKUs as mock)
5. Change `stock` in Firebase Console → refresh page → stock badge updates after stock API call
