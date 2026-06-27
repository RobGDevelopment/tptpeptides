# Storefront CMS — Phase I

Admin-managed content for the consumer-facing storefront. All reads on the public site go through the Firebase Admin SDK in server components (`lib/firebase/storefrontCms.server.ts`). Firestore `cms/*` documents are admin-only in client rules; storefront pages never read CMS directly from the browser.

## Access

1. Sign in as admin (see `docs/ADMIN_DASHBOARD.md`)
2. Open **Admin → Storefront** (`/admin/storefront`)

## Firestore paths

| Path | Content |
|------|---------|
| `cms/settings` | Hero copy, CTAs, footer tagline |
| `cms/homepage` | Featured grid title, subtitle, slug list, limit |
| `cms/categories` | Category display names, sort order, visibility |
| `cms/researchArticles/{slug}` | Research note articles |
| `cms/protocols/{id}` | Protocol template panels |

## Admin tabs

- **Homepage** — hero + featured compounds (checkbox picker from live catalog)
- **Categories** — merchandising for catalog filter chips
- **Research** — create/edit research articles (RUO copy guard on save)
- **Protocols** — create/edit protocol templates (RUO copy guard on save)
- **Tools** — seed defaults from code, export catalog JSON

## First-time setup

1. Ensure Firebase Admin SDK is configured
2. Go to **Storefront → Tools → Seed CMS from defaults**
3. Optionally edit hero, featured slugs, and category labels
4. Changes revalidate `/`, `/catalog`, `/research`, and `/protocols` within ~60s (ISR)

## API routes (admin session required)

| Method | Route | Purpose |
|--------|-------|---------|
| GET/PUT/PATCH | `/api/admin/storefront/settings` | Settings, homepage, categories |
| GET/PUT/DELETE | `/api/admin/storefront/research` | Research articles |
| GET/PUT/DELETE | `/api/admin/storefront/protocols` | Protocol templates |
| POST | `/api/admin/storefront/seed` | Merge code defaults into Firestore |
| GET | `/api/admin/storefront/export-catalog` | Download catalog JSON |

## Compliance

Product and CMS copy is validated server-side via `lib/compliance/copyGuard.ts`:

- Product descriptions must include the RUO suffix
- High-risk therapeutic/dosing keywords are blocked in CMS hero, featured subtitle, research body, and protocol focus fields

## Product merchandising

Per variant (Admin → Products → Edit):

- **Storefront badge** — `New Batch` shown on product cards when any visible variant has `storefrontBadge: new_batch`
- **Visible from / until** — optional ISO schedule; compounds with no visible variants are hidden from catalog summaries

## Code defaults

When Firestore CMS docs are missing, the storefront falls back to `lib/data/storefrontCmsDefaults.ts` (derived from current hardcoded content and `catalog.json` categories).
