# MedFit — Production Deployment Runbook

> **Last updated:** June 2026  
> Use this checklist when deploying MedFit to Vercel and cutting over to Stripe live mode.

---

## Prerequisites

- [ ] Firebase project configured (Auth, Firestore, App Check)
- [ ] Stripe account (test mode verified locally first)
- [ ] Vercel account linked to Git repository
- [ ] Domain DNS access (optional, for custom domain)

---

## 1. Firebase Production Setup

### 1.1 Firestore

```bash
firebase login
firebase use YOUR_PROJECT_ID
firebase deploy --only firestore:rules,firestore:indexes
```

### 1.2 Service account (Admin SDK)

1. Firebase Console → Project Settings → Service accounts → **Generate new private key**
2. Store values as Vercel environment variables (see Section 3)

### 1.3 App Check (production)

1. Firebase Console → App Check → Register web app
2. Enable **reCAPTCHA Enterprise** provider
3. Copy site key → `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY`
4. Enforce App Check on Firestore and Auth when ready

### 1.4 Admin user

Set in Firestore: `users/{your-uid}.role = "admin"` (see `docs/ADMIN_ROLE_SETUP.md`)

### 1.5 Seed catalog

After first deploy with Admin SDK vars set:

1. Sign in as admin → `/admin/products`
2. Click **Run Seed**

---

## 2. Stripe Setup

### 2.1 Test mode (staging / preview)

| Variable | Source |
|----------|--------|
| `STRIPE_SECRET_KEY` | Dashboard → Developers → API keys → `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe CLI or Dashboard webhook endpoint |

**Preview webhook (Vercel):**

1. Stripe Dashboard → Webhooks → Add endpoint
2. URL: `https://YOUR-PREVIEW-URL.vercel.app/api/webhooks/stripe`
3. Event: `checkout.session.completed`

### 2.2 Live mode cutover

> Complete test checkout end-to-end before switching to live keys.

1. Stripe Dashboard → toggle **Live mode**
2. Copy live secret key → `STRIPE_SECRET_KEY=sk_live_...` in Vercel **Production** env
3. Create **live** webhook endpoint:
   - URL: `https://your-domain.com/api/webhooks/stripe`
   - Event: `checkout.session.completed`
4. Copy live webhook secret → `STRIPE_WEBHOOK_SECRET=whsec_...` (production only)
5. Enable customer receipt emails: Settings → Business → Customer emails
6. Redeploy production

**Rollback:** Revert env vars to test keys and redeploy.

---

## 3. Vercel Environment Variables

Set in **Project → Settings → Environment Variables**.

### Public (client)

| Variable | Example | Environments |
|----------|---------|--------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIza...` | Production, Preview |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `project.firebaseapp.com` | All |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `your-project` | All |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `project.appspot.com` | All |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `123456789` | All |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:123:web:abc` | All |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | `G-XXXX` | All (optional) |
| `NEXT_PUBLIC_APP_URL` | `https://medfit.com` | Production |
| `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY` | `6Lc...` | Production |

For Preview deployments, set `NEXT_PUBLIC_APP_URL` to the preview URL or omit (falls back to `VERCEL_URL`).

### Secret (server only)

| Variable | Environments |
|----------|--------------|
| `FIREBASE_PROJECT_ID` | Production, Preview |
| `FIREBASE_CLIENT_EMAIL` | Production, Preview |
| `FIREBASE_PRIVATE_KEY` | Production, Preview |
| `STRIPE_SECRET_KEY` | Production (live), Preview (test) |
| `STRIPE_WEBHOOK_SECRET` | Per-environment webhook |

**Private key formatting in Vercel:** Paste with literal `\n` for newlines, or use multiline secret if supported.

---

## 4. Deploy to Vercel

### 4.1 First deploy

```bash
# Install Vercel CLI (optional)
npm i -g vercel

# From project root
vercel

# Production
vercel --prod
```

Or connect GitHub repo in Vercel Dashboard for automatic deploys on push.

### 4.2 Build settings

| Setting | Value |
|---------|-------|
| Framework | Next.js |
| Build command | `npm run build` |
| Output | Default (Next.js) |
| Node.js | 20.x or 22.x |

### 4.3 Post-deploy verification

- [ ] `/` — storefront loads, age gate works
- [ ] `/terms`, `/privacy`, `/research-policy` — legal pages render
- [ ] `/sitemap.xml` — catalog + static routes listed
- [ ] `/robots.txt` — disallows `/admin` and `/api`
- [ ] `/admin` — redirects non-admin; loads for admin user
- [ ] Test checkout with Stripe test card (`4242 4242 4242 4242`)
- [ ] Webhook fulfills order in Firestore
- [ ] App Check tokens present in production (Firebase Console → App Check → Metrics)

---

## 5. Custom Domain

1. Vercel → Project → Settings → Domains → Add domain
2. Update DNS per Vercel instructions
3. Set `NEXT_PUBLIC_APP_URL=https://your-domain.com` in Production env
4. Update Stripe webhook URL to production domain
5. Redeploy

---

## 6. Observability (optional)

### Sentry

```bash
npx @sentry/wizard@latest -i nextjs
```

Uncomment Sentry lines in `app/global-error.tsx`.

### Datadog

Install `@datadog/browser-logs`, initialize in `app/providers.tsx`, uncomment Datadog lines in `global-error.tsx`.

---

## 7. Security Checklist

- [ ] Firestore rules deployed (`firestore.rules`)
- [ ] Admin routes gated by `proxy.ts` + `AdminGuard` + server API auth
- [ ] No secrets in client bundle (only `NEXT_PUBLIC_*` exposed)
- [ ] App Check enforced in Firebase Console (production)
- [ ] Stripe webhook signature verification enabled (built-in)
- [ ] HTTPS enforced (Vercel default)

---

## 8. Rollback Procedure

1. Vercel → Deployments → select last known-good deployment → **Promote to Production**
2. Revert environment variable changes if needed
3. Verify `/api/webhooks/stripe` receives events on rolled-back URL

---

## Quick Reference

| Doc | Purpose |
|-----|---------|
| `docs/FIRESTORE_SETUP.md` | Firebase + seed |
| `docs/STRIPE_SETUP.md` | Stripe test flow |
| `docs/ADMIN_DASHBOARD.md` | Admin + catalog seed |
| `docs/ADMIN_ROLE_SETUP.md` | Grant admin access |
