# Stripe Checkout Setup — Phase D

## Overview

MedFit uses **Stripe Checkout** (hosted payment page) with server-side price validation and Firestore order fulfillment via webhooks.

| Route | Purpose |
|-------|---------|
| `/checkout` | Research compliance form + order summary |
| `/checkout/success` | Post-payment confirmation |
| `POST /api/checkout/create-session` | Validates cart, creates pending order, redirects to Stripe |
| `GET /api/checkout/session` | Loads paid order details for success page |
| `POST /api/webhooks/stripe` | Fulfills order, decrements stock, awards loyalty points |

---

## 1. Stripe Dashboard setup

1. Create a [Stripe account](https://dashboard.stripe.com/register) (use **Test mode** first).
2. **Developers → API keys** — copy:
   - Secret key → `STRIPE_SECRET_KEY`
3. **Settings → Business settings → Customer emails** — enable **Successful payments** receipts (Stripe sends the receipt email automatically).

---

## 2. Environment variables

Add to `.env.local`:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production (Vercel), set `NEXT_PUBLIC_APP_URL=https://your-domain.com`.

Also required (from Phase C):

```env
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
```

---

## 3. Local webhook testing

Install Stripe CLI: https://stripe.com/docs/stripe-cli

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook signing secret (`whsec_...`) to `STRIPE_WEBHOOK_SECRET` in `.env.local`.

Restart `npm run dev` after updating env vars.

---

## 4. Production webhook

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**
2. URL: `https://your-domain.com/api/webhooks/stripe`
3. Events: `checkout.session.completed`
4. Copy signing secret → production `STRIPE_WEBHOOK_SECRET` in Vercel

---

## 5. Test checkout flow

1. Seed products: `npm run seed:products`
2. Start dev server: `npm run dev`
3. Start Stripe CLI webhook forwarder (step 3)
4. Add items to cart → **Authorize Lab Requisition**
5. Use test card: `4242 4242 4242 4242`, any future expiry, any CVC
6. Confirm success page shows order ID
7. Verify in Firestore:
   - `orders/{id}` → `status: paid`
   - `products/{id}` → stock decremented
   - `users/{uid}` → `loyaltyPoints` incremented (signed-in checkout only)

---

## 6. Guest vs authenticated checkout

| Mode | Email source | Loyalty points |
|------|--------------|----------------|
| Guest | Form on `/checkout` | No |
| Signed in | Firebase Auth email | Yes (10 pts / $1) |

Prices are always read from Firestore on the server — client cart prices are not trusted.

---

## 7. Security notes

- Never expose `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` to the client
- Webhook verifies Stripe signature before fulfilling orders
- Order fulfillment is idempotent (duplicate webhooks are safe)
- Stock decrement runs in a Firestore transaction
