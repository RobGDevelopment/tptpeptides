import { SITE_URL_PRODUCTION, SITE_URL_VERCEL } from '../brand';

export interface RolloutLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface RolloutStep {
  id: string;
  title: string;
  body: string;
  links?: RolloutLink[];
  code?: string;
  envVars?: string[];
  optional?: boolean;
}

export interface RolloutPhase {
  id: string;
  phase: string;
  title: string;
  summary: string;
  moduleFlags: string[];
  adminPaths: string[];
  steps: RolloutStep[];
}

const PRODUCTION_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || SITE_URL_VERCEL;

export const ROLLOUT_GLOBAL_STEPS: RolloutStep[] = [
  {
    id: 'firestore-rules',
    title: 'Deploy Firestore security rules',
    body: 'Deploy rules after RBAC or collection changes. Access is enforced via Firebase custom claims (role + admin flag) — no hardcoded emails. Rules include tenantId hooks for Sprint A multi-tenant isolation.',
    code: 'firebase login\nfirebase use YOUR_PROJECT_ID\nfirebase deploy --only firestore:rules,firestore:indexes',
    links: [
      { label: 'Firebase Console', href: 'https://console.firebase.google.com/', external: true },
      { label: 'Local firestore.rules', href: '/admin/rollout#firestore-rules' },
    ],
  },
  {
    id: 'vercel-env',
    title: 'Verify Vercel environment variables',
    body: 'Set secrets in Vercel → Project → Settings → Environment Variables. Redeploy production after changes so server routes pick up new keys.',
    links: [
      { label: 'Vercel Dashboard', href: 'https://vercel.com/dashboard', external: true },
      { label: 'Vercel env var docs', href: 'https://vercel.com/docs/projects/environment-variables', external: true },
    ],
    envVars: [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_CLIENT_EMAIL',
      'FIREBASE_PRIVATE_KEY',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'NEXT_PUBLIC_APP_URL',
    ],
  },
  {
    id: 'module-toggles',
    title: 'Enable modules in the control plane',
    body: 'All V2 epics default to OFF. Enable flags only after prerequisites (API keys, webhooks, seed data) are satisfied. Use the Module Control Center — changes propagate within ~60 seconds via cached reads.',
    links: [{ label: 'Module Control Center', href: '/admin/modules' }],
  },
  {
    id: 'smoke-test',
    title: 'Run post-deploy smoke checks',
    body: 'Verify storefront, admin login, a test checkout, and any newly enabled module surfaces before announcing to customers.',
    code: 'npm run test:smoke\n# or against production:\nPLAYWRIGHT_BASE_URL=https://medfit-pro.vercel.app npm run test:smoke',
    links: [{ label: 'Production storefront', href: PRODUCTION_URL, external: true }],
  },
];

export const ROLLOUT_PHASES: RolloutPhase[] = [
  {
    id: 'phase-0',
    phase: '0',
    title: 'Module Control Center',
    summary: 'Feature-flag infrastructure — enable before any phased epic goes live.',
    moduleFlags: [],
    adminPaths: ['/admin/modules', '/admin/rollout'],
    steps: [
      {
        id: 'p0-admin-role',
        title: 'Grant Super Admin access',
        body: 'Set users/{uid}.role = "admin" in Firestore for operators who can toggle modules and view financial data.',
        links: [{ label: 'Admin dashboard', href: '/admin' }],
      },
      {
        id: 'p0-seed',
        title: 'Seed catalog inventory',
        body: 'Run the product seed from Admin → Products so Firestore stock aligns with catalog.json variants.',
        links: [{ label: 'Products admin', href: '/admin/products' }],
      },
    ],
  },
  {
    id: 'phase-1',
    phase: '1',
    title: 'Financial & Procurement',
    summary: 'Institution verification, tier pricing, quotes, Net-30 invoicing, Stripe Tax, and accounting export.',
    moduleFlags: [
      'isB2BProcurementEnabled',
      'isInstitutionVerificationEnabled',
      'isTieredPricingEnabled',
      'isQuoteWorkflowEnabled',
      'isNetTermsEnabled',
      'isStripeTaxEnabled',
      'isAccountingExportEnabled',
    ],
    adminPaths: ['/admin/verifications', '/admin/quotes', '/admin/products', '/admin/orders'],
    steps: [
      {
        id: 'p1-stripe',
        title: 'Configure Stripe (test, then live)',
        body: 'Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET. Create a webhook endpoint for checkout.session.completed and invoice.paid pointing at your deployment URL.',
        envVars: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
        links: [
          { label: 'Stripe Dashboard', href: 'https://dashboard.stripe.com/webhooks', external: true },
          { label: 'Webhook endpoint', href: `${PRODUCTION_URL}/api/webhooks/stripe`, external: true },
        ],
      },
      {
        id: 'p1-verification',
        title: 'Enable institution verification',
        body: 'Turn on isInstitutionVerificationEnabled and isB2BProcurementEnabled. Review KYB submissions at Admin → Verifications. Verified users unlock tier pricing and Net-30.',
        links: [{ label: 'Verifications queue', href: '/admin/verifications' }],
      },
      {
        id: 'p1-middesk',
        title: 'Middesk automated KYB lookup',
        body: 'Set MIDDESK_API_KEY (sandbox: api-sandbox.middesk.com). Enable isMiddeskVerificationEnabled. Institution verify submissions trigger EIN / SOS lookup; results appear in the admin queue with an approve / review recommendation.',
        envVars: ['MIDDESK_API_KEY', 'MIDDESK_API_BASE'],
        optional: true,
        links: [
          { label: 'Middesk dashboard', href: 'https://app.middesk.com', external: true },
          { label: 'Verifications queue', href: '/admin/verifications' },
        ],
      },
      {
        id: 'p1-tier-pricing',
        title: 'Configure tier price lists',
        body: 'Enable isTieredPricingEnabled. Set Bronze / Silver / Gold overrides on Admin → Products → Tier Pricing panel.',
        links: [{ label: 'Tier pricing panel', href: '/admin/products#tier-pricing' }],
      },
      {
        id: 'p1-quotes',
        title: 'Quote workflow',
        body: 'Enable isQuoteWorkflowEnabled. Account executives build quotes at Admin → Quotes, export PDFs, mark quotes as Sent (triggers buyer email via Resend when transactional email is on), and copy checkout links (/checkout/quote?quoteId=…) for sent or accepted quotes.',
        links: [{ label: 'Quotes workspace', href: '/admin/quotes' }],
      },
      {
        id: 'p1-net-terms',
        title: 'Net-30 invoicing',
        body: 'Enable isNetTermsEnabled after institution verification is live. Verified buyers see a Net-30 toggle at checkout; Stripe sends due-in-30-days invoices.',
        links: [{ label: 'Test checkout', href: '/checkout' }],
      },
      {
        id: 'p1-stripe-tax',
        title: 'Stripe Tax',
        body: 'Enable isStripeTaxEnabled. Checkout sessions collect US shipping addresses and calculate tax automatically in Stripe. When approving institution verification, check “sales tax exempt” if a valid resale certificate is on file — verified buyers skip tax on card checkout and Net-30 invoices.',
        optional: true,
      },
      {
        id: 'p1-promo-codes',
        title: 'Institutional promo codes',
        body: 'Create promotion codes in the Stripe Dashboard (Coupons → Promotion codes). Buyers enter codes on the checkout page; valid codes are pre-applied on the Stripe session before payment.',
        optional: true,
        links: [{ label: 'Stripe coupons', href: 'https://dashboard.stripe.com/coupons', external: true }],
      },
      {
        id: 'p1-accounting',
        title: 'Accounting export',
        body: 'Enable isAccountingExportEnabled. Export QuickBooks-ready CSV from Admin → Orders for paid orders.',
        links: [{ label: 'Orders admin', href: '/admin/orders' }],
      },
    ],
  },
  {
    id: 'phase-2',
    phase: '2',
    title: 'Operations & Compliance',
    summary: 'Batch genealogy, COA downloads, carrier labels, and geo restrictions.',
    moduleFlags: ['isBatchCoaEnabled', 'isRealShippingEnabled', 'isComplianceGeoBlockEnabled', 'isTypedAttestationEnabled'],
    adminPaths: ['/admin/inventory', '/admin/orders'],
    steps: [
      {
        id: 'p2-typed-attestation',
        title: 'Enable typed research attestation (Sprint B)',
        body: 'Deploy Firestore rules, then turn on isTypedAttestationEnabled. Checkout requires a research intent dropdown and exact typed legal phrase; each submission writes an immutable attestation_logs document linked on the order as attestationLogId.',
        links: [{ label: 'Module flags', href: '/admin/modules' }],
      },
      {
        id: 'p2-batches',
        title: 'Batch & COA genealogy',
        body: 'Enable isBatchCoaEnabled. Register inbound lots on Admin → Inventory. Assign batches to paid orders; buyers download COAs from their account portal.',
        links: [{ label: 'Inventory → Batches', href: '/admin/inventory#batch-coa' }],
      },
      {
        id: 'p2-easypost',
        title: 'EasyPost carrier shipping',
        body: 'Set EASYPOST_API_KEY plus origin zip/state. Enable isRealShippingEnabled. Create labels from Admin → Orders on paid shipments.',
        envVars: ['EASYPOST_API_KEY', 'SHIPPING_ORIGIN_ZIP', 'SHIPPING_ORIGIN_STATE'],
        links: [
          { label: 'EasyPost dashboard', href: 'https://www.easypost.com/account/settings', external: true },
          { label: 'Orders admin', href: '/admin/orders' },
        ],
      },
      {
        id: 'p2-geo',
        title: 'Geo compliance blocking',
        body: 'Enable isComplianceGeoBlockEnabled. Configure blocked US states on Admin → Inventory → Geo Restrictions. Checkout validates ship-to destination.',
        links: [{ label: 'Geo compliance panel', href: '/admin/inventory#geo-compliance' }],
      },
      {
        id: 'p2-low-stock',
        title: 'Low-stock ops alerts',
        body: 'Set OPS_ALERT_EMAIL to your operations inbox. Vercel cron /api/cron/low-stock runs weekly (Mondays 08:00 UTC) and emails variants below reorder threshold. Requires CRON_SECRET on Vercel.',
        envVars: ['OPS_ALERT_EMAIL', 'CRON_SECRET'],
        optional: true,
      },
    ],
  },
  {
    id: 'phase-3',
    phase: '3',
    title: 'Sales Command Center',
    summary: 'AE workspace, lead routing, margin reporting, client impersonation, and user management.',
    moduleFlags: [
      'isSalesCommandCenterEnabled',
      'isLeadRoutingEnabled',
      'isMarginReportingEnabled',
      'isClientImpersonationEnabled',
      'isGranularRbacEnabled',
      'isUserManagementEnabled',
    ],
    adminPaths: ['/admin/sales', '/admin/users'],
    steps: [
      {
        id: 'p3-sales-cc',
        title: 'Open Sales Command Center',
        body: 'Enable isSalesCommandCenterEnabled. Pipeline view, institution accounts, and open quote counts live at Admin → Sales.',
        links: [{ label: 'Sales workspace', href: '/admin/sales' }],
      },
      {
        id: 'p3-lead-routing',
        title: 'Clearbit lead routing',
        body: 'Optional: set CLEARBIT_API_KEY for enrichment on session sync. Configure AE roster under Sales → Settings when isLeadRoutingEnabled is on.',
        envVars: ['CLEARBIT_API_KEY'],
        optional: true,
        links: [{ label: 'Clearbit', href: 'https://dashboard.clearbit.com/', external: true }],
      },
      {
        id: 'p3-impersonation',
        title: 'Client impersonation (co-browse)',
        body: 'Enable isClientImpersonationEnabled (requires Sales CC). Start impersonation from Sales to build protocol carts with tier pricing for verified institutions.',
        links: [{ label: 'Sales workspace', href: '/admin/sales' }],
      },
      {
        id: 'p3-users',
        title: 'User management & granular RBAC',
        body: 'Enable isUserManagementEnabled for team invites. Enable isGranularRbacEnabled to enforce route-level access: Super Admin (modules/audit/rollout), Sales (commercial), Ops (fulfillment/catalog), Finance (exports/margins), Support (users/verifications). Legacy partner/staff Firestore roles map to sales/ops automatically. Redeploy firestore.rules — access is claims-based (no hardcoded admin emails).',
        links: [{ label: 'Users admin', href: '/admin/users' }],
      },
    ],
  },
  {
    id: 'phase-4',
    phase: '4',
    title: 'Growth & Retention',
    summary: 'Transactional email, abandoned carts, predictive replenishment, and loyalty redemption.',
    moduleFlags: [
      'isTransactionalEmailEnabled',
      'isAbandonedCartEnabled',
      'isPredictiveReplenishmentEnabled',
      'isLoyaltyRedemptionEnabled',
    ],
    adminPaths: ['/admin/growth'],
    steps: [
      {
        id: 'p4-resend',
        title: 'Configure Resend transactional email',
        body: 'Set RESEND_API_KEY and RESEND_FROM_EMAIL. Enable isTransactionalEmailEnabled before cart recovery or replenishment jobs — they skip sending when email is off.',
        envVars: ['RESEND_API_KEY', 'RESEND_FROM_EMAIL'],
        links: [
          { label: 'Resend API keys', href: 'https://resend.com/api-keys', external: true },
          { label: 'Growth Command Center', href: '/admin/growth' },
        ],
      },
      {
        id: 'p4-cron',
        title: 'Schedule growth cron jobs',
        body: 'Set CRON_SECRET in Vercel. Cron schedules are committed in vercel.json (hourly abandoned carts, daily replenishment). Vercel invokes them with Authorization: Bearer CRON_SECRET. You can also use Run job on Admin → Growth.',
        envVars: ['CRON_SECRET'],
        code: `# vercel.json (committed):
{
  "crons": [
    { "path": "/api/cron/abandoned-carts", "schedule": "0 * * * *" },
    { "path": "/api/cron/replenishment", "schedule": "0 14 * * *" }
  ]
}`,
        links: [
          { label: 'Vercel Cron docs', href: 'https://vercel.com/docs/cron-jobs', external: true },
          { label: 'Growth admin', href: '/admin/growth' },
        ],
      },
      {
        id: 'p4-abandoned',
        title: 'Abandoned cart recovery',
        body: 'Enable isAbandonedCartEnabled. Storefront debounces cart snapshots; idle carts (1h+) receive recovery links to /cart/recover?token=…',
        links: [{ label: 'Test catalog → checkout flow', href: '/catalog' }],
      },
      {
        id: 'p4-loyalty',
        title: 'Loyalty redemption & citation rewards',
        body: 'Enable isLoyaltyRedemptionEnabled. Signed-in buyers redeem points at checkout (100 pts = $1). Account portal accepts research citation URLs for +25 point rewards.',
        links: [
          { label: 'Checkout', href: '/checkout' },
          { label: 'Account portal', href: '/account' },
        ],
      },
    ],
  },
  {
    id: 'phase-5',
    phase: '5',
    title: 'Infrastructure & Science Luxury UX',
    summary: 'Algolia catalog search, Research Co-Pilot (RAG), and interactive 3D product visuals.',
    moduleFlags: ['isAlgoliaSearchEnabled', 'isAiCoPilotEnabled', 'isInteractive3dEnabled'],
    adminPaths: ['/admin/rollout', '/catalog'],
    steps: [
      {
        id: 'p5-algolia-account',
        title: 'Create Algolia application & index',
        body: 'Sign up for Algolia, create an application, and note the Application ID and Admin API Key. Default index name is tpt_catalog (override with ALGOLIA_INDEX_NAME).',
        envVars: ['ALGOLIA_APP_ID', 'ALGOLIA_ADMIN_API_KEY', 'ALGOLIA_INDEX_NAME'],
        links: [
          { label: 'Algolia dashboard', href: 'https://www.algolia.com/account/applications', external: true },
          { label: 'Catalog (test search UI)', href: '/catalog' },
        ],
      },
      {
        id: 'p5-algolia-reindex',
        title: 'Reindex catalog into Algolia',
        body: 'After keys are set and isAlgoliaSearchEnabled is ON, run Reindex from this rollout page (or POST /api/admin/search/reindex as admin). Re-run after major catalog or stock changes.',
        links: [{ label: 'Algolia reindex action', href: '/admin/rollout#action-algolia-reindex' }],
      },
      {
        id: 'p5-openai',
        title: 'Configure OpenAI for Research Co-Pilot',
        body: 'Set OPENAI_API_KEY (optional OPENAI_MODEL, default gpt-4o-mini). Enable isAiCoPilotEnabled. Co-Pilot answers from catalog.json context only and refuses medical advice.',
        envVars: ['OPENAI_API_KEY', 'OPENAI_MODEL'],
        links: [
          { label: 'OpenAI API keys', href: 'https://platform.openai.com/api-keys', external: true },
          { label: 'Storefront (Co-Pilot button)', href: PRODUCTION_URL, external: true },
        ],
      },
      {
        id: 'p5-3d',
        title: 'Interactive 3D product visuals',
        body: 'Enable isInteractive3dEnabled. Product detail pages show a WebGL molecular helix and parallax vial scene — no extra API keys required.',
        links: [{ label: 'Sample product page', href: '/catalog/bpc-157' }],
      },
    ],
  },
];

export const BRAM_ISOLATION_STEPS: RolloutStep[] = [
  {
    id: 'bram-separate-tos',
    title: 'Publish lane-specific Terms of Service',
    body: 'B2B and B2C satellite domains must not share legal copy. Create separate ToS / Privacy pages per tenant in Firestore tenant_config.branding. Never cross-link between lanes in footer or checkout.',
    links: [{ label: 'Satellite provisioning', href: '/admin/satellites' }],
  },
  {
    id: 'bram-support-email',
    title: 'Ring-fence support contact points',
    body: 'Each tenant must expose its own support email (e.g. labs@ vs shop@). Do not reuse the B2B support inbox on B2C burners — underwriters treat shared support as BRAM violation.',
  },
  {
    id: 'bram-no-cross-links',
    title: 'Remove cross-lane navigation',
    body: 'Audit storefront nav, emails, and marketing pages. B2C satellites must not link to B2B catalog, institution verification, or quote flows. B2B hub must not advertise DTC SKUs.',
    links: [{ label: 'Storefront CMS', href: '/admin/storefront' }],
  },
  {
    id: 'bram-payment-isolation',
    title: 'Confirm payment rail isolation',
    body: 'B2B tenant: high-risk card gateway only (Authorize.net / NMI). B2C tenant: ACH / crypto only — no Stripe card checkout. Verify tenant_config.payment.useStripeUntilCutover is false on satellites before taking live traffic.',
    links: [
      { label: 'Module toggles', href: '/admin/modules' },
      { label: 'Rollout — payment cutover', href: '/admin/rollout#sprint-commercial' },
    ],
  },
  {
    id: 'bram-dns-ssl',
    title: 'Verify satellite DNS + SSL',
    body: 'After POST /api/admin/satellites, complete DNS records in your registrar. Poll Vercel until the domain shows verified + SSL active before marketing the burner domain.',
    links: [{ label: 'Satellites admin', href: '/admin/satellites' }],
  },
];

export const COMMERCIAL_ROLLOUT_PHASE: RolloutPhase = {
  id: 'sprint-commercial',
  phase: 'Post-V2',
  title: 'Commercialization Go-Live (Sprints B–F/G)',
  summary:
    'Enable compliance, alternate payment rails, satellites, zero-touch ops, lexical quarantine, and native ledger/QBO sync after sandbox certification.',
  moduleFlags: [
    'isTypedAttestationEnabled',
    'isAlternatePaymentRailsEnabled',
    'isSatelliteProvisioningEnabled',
    'isZeroTouchOpsEnabled',
    'isLexicalQuarantineEnabled',
  ],
  adminPaths: ['/admin/satellites', '/admin/exceptions', '/admin/proforma', '/admin/rollout'],
  steps: [
    {
      id: 'commercial-firestore-rules',
      title: 'Deploy journal_entries + attestation rules',
      body: 'Deploy Firestore rules after enabling native ledger or typed attestation. journal_entries is append-only for all clients; writes occur via Admin SDK only.',
      code: 'firebase deploy --only firestore:rules,firestore:indexes',
    },
    {
      id: 'commercial-qbo',
      title: 'Connect QuickBooks Online',
      body: 'Complete Intuit OAuth for your production QBO company. Set QBO_REALM_ID, QBO_CLIENT_ID, QBO_CLIENT_SECRET, and QBO_REFRESH_TOKEN in Vercel. Map chart-of-accounts IDs (QBO_ACCOUNT_*). Refreshed tokens persist to settings/accounting in Firestore.',
      envVars: [
        'QBO_REALM_ID',
        'QBO_CLIENT_ID',
        'QBO_CLIENT_SECRET',
        'QBO_REFRESH_TOKEN',
        'QBO_ACCOUNT_CASH_ID',
        'QBO_ACCOUNT_REVENUE_ID',
        'QBO_ACCOUNT_COGS_ID',
      ],
      links: [
        { label: 'Intuit Developer', href: 'https://developer.intuit.com/', external: true },
        { label: 'Proforma workspace', href: '/admin/proforma' },
      ],
    },
    {
      id: 'commercial-accounting-cron',
      title: 'Verify monthly accounting sync cron',
      body: 'vercel.json schedules POST/GET /api/cron/accounting-sync on the 1st of each month (06:00 UTC). Requires CRON_SECRET. Sync aggregates prior month journal_entries and pushes a single QBO journal batch.',
      envVars: ['CRON_SECRET'],
    },
    {
      id: 'commercial-lexical',
      title: 'Wire Resend inbound webhook for lexical quarantine',
      body: 'Point Resend inbound email webhook to /api/webhooks/resend-inbound. Enable isLexicalQuarantineEnabled. High-severity hits (3+ prohibited terms) auto-refund recent paid orders and place the account on compliance hold.',
      envVars: ['RESEND_INBOUND_WEBHOOK_SECRET'],
    },
    ...BRAM_ISOLATION_STEPS,
  ],
};

export const ROLLOUT_PHASES_WITH_COMMERCIAL: RolloutPhase[] = [
  ...ROLLOUT_PHASES,
  COMMERCIAL_ROLLOUT_PHASE,
];

export const ROLLOUT_ENV_REFERENCE: { name: string; scope: 'server' | 'public'; phases: string; notes: string }[] = [
  { name: 'FIREBASE_PROJECT_ID', scope: 'server', phases: 'All', notes: 'Firebase Admin SDK' },
  { name: 'FIREBASE_CLIENT_EMAIL', scope: 'server', phases: 'All', notes: 'Service account email' },
  { name: 'FIREBASE_PRIVATE_KEY', scope: 'server', phases: 'All', notes: 'Use literal \\n newlines in Vercel' },
  { name: 'NEXT_PUBLIC_FIREBASE_*', scope: 'public', phases: 'All', notes: 'Client Firebase config' },
  { name: 'NEXT_PUBLIC_APP_URL', scope: 'public', phases: 'All', notes: `Production URL (${SITE_URL_PRODUCTION})` },
  { name: 'STRIPE_SECRET_KEY', scope: 'server', phases: '1', notes: 'sk_test_ for preview, sk_live_ for prod' },
  { name: 'STRIPE_WEBHOOK_SECRET', scope: 'server', phases: '1', notes: 'Per-environment webhook signing secret' },
  { name: 'RESEND_API_KEY', scope: 'server', phases: '4', notes: 'Transactional + growth emails' },
  { name: 'RESEND_FROM_EMAIL', scope: 'server', phases: '4', notes: 'Verified sender domain in Resend' },
  { name: 'RESEND_AUDIENCE_ID', scope: 'server', phases: '4', notes: 'Optional Resend audience for newsletter signup' },
  { name: 'CRON_SECRET', scope: 'server', phases: '4', notes: 'Bearer token for /api/cron/* routes' },
  { name: 'EASYPOST_API_KEY', scope: 'server', phases: '2', notes: 'Carrier label purchase' },
  { name: 'SHIPPING_ORIGIN_ZIP', scope: 'server', phases: '2', notes: 'Warehouse origin for rate quotes' },
  { name: 'OPS_ALERT_EMAIL', scope: 'server', phases: '2', notes: 'Low-stock cron alert recipient' },
  { name: 'MIDDESK_API_KEY', scope: 'server', phases: '1', notes: 'KYB EIN / SOS lookup (Bridge P1)' },
  { name: 'MIDDESK_API_BASE', scope: 'server', phases: '1', notes: 'Optional — defaults to https://api.middesk.com/v1' },
  { name: 'CLEARBIT_API_KEY', scope: 'server', phases: '3', notes: 'Optional lead enrichment' },
  { name: 'ALGOLIA_APP_ID', scope: 'server', phases: '5', notes: 'Algolia application ID' },
  { name: 'ALGOLIA_ADMIN_API_KEY', scope: 'server', phases: '5', notes: 'Server-side search + indexing only' },
  { name: 'ALGOLIA_INDEX_NAME', scope: 'server', phases: '5', notes: 'Default: tpt_catalog' },
  { name: 'OPENAI_API_KEY', scope: 'server', phases: '5', notes: 'Research Co-Pilot LLM' },
  { name: 'OPENAI_MODEL', scope: 'server', phases: '5', notes: 'Optional; default gpt-4o-mini' },
  { name: 'QBO_REALM_ID', scope: 'server', phases: 'F/G', notes: 'QuickBooks company realm ID' },
  { name: 'QBO_CLIENT_ID', scope: 'server', phases: 'F/G', notes: 'Intuit OAuth app client ID' },
  { name: 'QBO_CLIENT_SECRET', scope: 'server', phases: 'F/G', notes: 'Intuit OAuth app secret' },
  { name: 'QBO_REFRESH_TOKEN', scope: 'server', phases: 'F/G', notes: 'Long-lived refresh token; rotated tokens saved to settings/accounting' },
  { name: 'QBO_ACCOUNT_CASH_ID', scope: 'server', phases: 'F/G', notes: 'Chart-of-accounts mapping for journal sync' },
  { name: 'RESEND_INBOUND_WEBHOOK_SECRET', scope: 'server', phases: 'B2', notes: 'Optional shared secret for inbound email webhook' },
  { name: 'VERCEL_TOKEN', scope: 'server', phases: 'D', notes: 'Satellite domain provisioning' },
  { name: 'VERCEL_PROJECT_ID', scope: 'server', phases: 'D', notes: 'Target Vercel project for domains API' },
];
