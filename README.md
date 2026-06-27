# TPT Peptides

Research inventory terminal and B2B back-office for [TPT Peptides](https://medfit-pro.vercel.app) — catalog, Stripe checkout, institution verification, tier pricing, and admin operations.

**Production:** https://medfit-pro.vercel.app  
**Repository:** https://github.com/RobGDevelopment/tptpeptides

---

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| Auth & data | Firebase Auth, Firestore, Storage |
| Payments | Stripe Checkout |
| Email | Resend |
| Hosting | Vercel (Git-connected auto-deploy) |

---

## Local development

### Prerequisites

- Node.js 22+
- Firebase project with Auth + Firestore
- Stripe test keys (for checkout)
- `.env.local` copied from `.env.example`

### Setup

```bash
git clone https://github.com/RobGDevelopment/tptpeptides.git
cd tptpeptides
npm install
cp .env.example .env.local   # fill in values
npm run dev
```

Open http://localhost:3000

### Useful scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run health:check` | Hit production APIs (9 checks) |
| `npm run test:smoke` | Playwright smoke tests |
| `npm run enable:prod-modules` | Enable B2B module flags + seed tier pricing in Firestore |
| `npm run sync:firebase-env` | Push Firebase Admin creds to Vercel (requires CLI auth) |
| `npm run seed:products` | Seed catalog from `catalog.json` via script |

---

## Environment variables

Copy `.env.example` → `.env.local` and set:

| Group | Required for |
|-------|----------------|
| `NEXT_PUBLIC_FIREBASE_*` | Client auth, Firestore reads |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Server APIs, admin, checkout |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Checkout + order fulfillment |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Invites, order/verification/shipping email |
| `NEXT_PUBLIC_APP_URL`, `INVITE_SITE_URL` | Redirects and invite links |

Never commit `.env.local` or service account JSON files.

Detailed setup guides live in [`docs/`](docs/):

- [`FIRESTORE_SETUP.md`](docs/FIRESTORE_SETUP.md)
- [`STRIPE_SETUP.md`](docs/STRIPE_SETUP.md)
- [`ADMIN_ROLE_SETUP.md`](docs/ADMIN_ROLE_SETUP.md)
- [`DEPLOYMENT_RUNBOOK.md`](docs/DEPLOYMENT_RUNBOOK.md)

---

## Deploy flow (GitHub → Vercel)

This project auto-deploys on every push to **`main`**.

```
Local changes → git push origin main → GitHub → Vercel build → Production
```

1. **Connect repo** (already done): Vercel project `medfit-pro` ↔ `RobGDevelopment/tptpeptides`
2. **Set env vars** in Vercel → Project → Settings → Environment Variables (Production + Preview)
3. **Push to `main`** — Vercel builds and promotes to production automatically
4. **Verify:** `npm run health:check`

### First-time production checklist

- [ ] Firebase Admin env vars on Vercel Production (and Preview if testing preview URLs)
- [ ] Stripe webhook → `https://medfit-pro.vercel.app/api/webhooks/stripe`
- [ ] Resend domain verified → `RESEND_FROM_EMAIL=invites@tptpeptides.com`
- [ ] Firestore rules deployed: `firebase deploy --only firestore:rules`
- [ ] Admin user: set `users/{uid}.role = "admin"` in Firestore
- [ ] Seed catalog: sign in → `/admin/products` → **Run Seed**
- [ ] Enable modules: `npm run enable:prod-modules` (or toggle at `/admin/modules`)

### Manual deploy (optional)

If you need to deploy without a Git push:

```bash
npx vercel --prod --yes
```

Prefer Git pushes so production always matches the repository.

---

## Admin & modules

| Route | Purpose |
|-------|---------|
| `/admin` | Dashboard |
| `/admin/products` | Catalog PIM + institution tier pricing |
| `/admin/storefront` | CMS (hero, research, protocols) |
| `/admin/orders` | Order workflow + QuickBooks export |
| `/admin/inventory` | Low-stock alerts, PO draft/approve/export |
| `/admin/verifications` | Institution KYB review |
| `/admin/users` | Invites, roles, access |
| `/admin/modules` | Feature-flag control center |

V2 features ship behind toggles in `/admin/modules`. B2B sub-features (verification, tier pricing) also require **B2B Procurement Suite** to be enabled.

Architecture and roadmap: [`docs/MASTER_ARCHITECTURE_V2.md`](docs/MASTER_ARCHITECTURE_V2.md)

---

## Project structure

```
app/                  Next.js routes (storefront, admin, API)
features/             UI by domain (storefront, admin, auth, checkout)
lib/                  Firebase, Stripe, email, schemas, business logic
scripts/              Ops scripts (health check, env sync, module enable)
docs/                 Setup runbooks and architecture
e2e/                  Playwright tests
```

---

## Health & testing

```bash
# Production smoke (no login required)
npm run health:check

# Local or CI Playwright
npm run test:smoke
npm run test:e2e
```

Health endpoint: `GET /api/health` — reports `adminSdkReady` when Firebase Admin is configured.

---

## License & use

Research use only (RUO). Not for human consumption. See site policies at `/research-policy`.
