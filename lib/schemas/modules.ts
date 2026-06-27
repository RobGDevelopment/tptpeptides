import { z } from 'zod';

/** Boolean toggles for V2 epics — all default false until Super Admin enables. */
export const moduleFlagsSchema = z.object({
  // Phase 1 — Financial & Procurement
  isB2BProcurementEnabled: z.boolean(),
  isInstitutionVerificationEnabled: z.boolean(),
  isTieredPricingEnabled: z.boolean(),
  isQuoteWorkflowEnabled: z.boolean(),
  isNetTermsEnabled: z.boolean(),
  isStripeTaxEnabled: z.boolean(),
  isAccountingExportEnabled: z.boolean(),

  // Phase 2 — Operations & Compliance
  isBatchCoaEnabled: z.boolean(),
  isRealShippingEnabled: z.boolean(),
  isComplianceGeoBlockEnabled: z.boolean(),

  // Phase 3 — Sales Command Center
  isSalesCommandCenterEnabled: z.boolean(),
  isClientImpersonationEnabled: z.boolean(),
  isLeadRoutingEnabled: z.boolean(),
  isMarginReportingEnabled: z.boolean(),
  isGranularRbacEnabled: z.boolean(),
  isUserManagementEnabled: z.boolean(),

  // Phase 4 — Growth & Retention
  isTransactionalEmailEnabled: z.boolean(),
  isPredictiveReplenishmentEnabled: z.boolean(),
  isAbandonedCartEnabled: z.boolean(),
  isLoyaltyRedemptionEnabled: z.boolean(),

  // Phase 5 — Infrastructure & UX
  isAlgoliaSearchEnabled: z.boolean(),
  isAiCoPilotEnabled: z.boolean(),
  isInteractive3dEnabled: z.boolean(),

  updatedAt: z.string().optional(),
  updatedBy: z.string().optional(),
});

export type ModuleFlags = z.infer<typeof moduleFlagsSchema>;

export type ModuleFlagKey = keyof Omit<ModuleFlags, 'updatedAt' | 'updatedBy'>;

export const MODULE_FLAG_GROUPS: {
  phase: string;
  label: string;
  flags: { key: ModuleFlagKey; label: string; description: string }[];
}[] = [
  {
    phase: '1',
    label: 'Financial & Procurement',
    flags: [
      {
        key: 'isB2BProcurementEnabled',
        label: 'B2B Procurement Suite',
        description: 'Master switch for institution workflows (verification, pricing, quotes).',
      },
      {
        key: 'isInstitutionVerificationEnabled',
        label: 'Institution Verification',
        description: 'KYB flow at /account/verify and admin review queue.',
      },
      {
        key: 'isTieredPricingEnabled',
        label: 'Tiered Pricing',
        description: 'priceLists with Bronze / Silver / Gold variant overrides.',
      },
      {
        key: 'isQuoteWorkflowEnabled',
        label: 'Quote Workflow',
        description: 'AE-generated quotes and PDF export.',
      },
      {
        key: 'isNetTermsEnabled',
        label: 'Net Terms Invoicing',
        description: 'Net-30 Stripe Invoices for verified institutions.',
      },
      {
        key: 'isStripeTaxEnabled',
        label: 'Stripe Tax',
        description: 'Automatic sales tax on checkout sessions.',
      },
      {
        key: 'isAccountingExportEnabled',
        label: 'Accounting Export',
        description: 'QuickBooks-ready order CSV and financial breakdown fields.',
      },
    ],
  },
  {
    phase: '2',
    label: 'Operations & Compliance',
    flags: [
      {
        key: 'isBatchCoaEnabled',
        label: 'Batch & COA Genealogy',
        description: 'Lot tracking, Storage PDFs, per-order COA download.',
      },
      {
        key: 'isRealShippingEnabled',
        label: 'Carrier Shipping',
        description: 'EasyPost / ShipStation rates, labels, and tracking.',
      },
      {
        key: 'isComplianceGeoBlockEnabled',
        label: 'Geo Restrictions',
        description: 'Block checkout from restricted states / regions.',
      },
    ],
  },
  {
    phase: '3',
    label: 'Sales Command Center',
    flags: [
      {
        key: 'isSalesCommandCenterEnabled',
        label: 'Sales Command Center',
        description: '/admin/sales workspace for account executives.',
      },
      {
        key: 'isClientImpersonationEnabled',
        label: 'Client Impersonation',
        description: 'Secure co-browsing to build protocol carts for clients.',
      },
      {
        key: 'isLeadRoutingEnabled',
        label: 'Lead Routing',
        description: 'Clearbit enrichment and AE assignment on signup.',
      },
      {
        key: 'isMarginReportingEnabled',
        label: 'Margin Reporting',
        description: 'Gross margin dashboard using baseCost.',
      },
      {
        key: 'isGranularRbacEnabled',
        label: 'Granular RBAC',
        description: 'ops / support / finance / sales roles.',
      },
      {
        key: 'isUserManagementEnabled',
        label: 'User Management',
        description: 'Admin dashboard for partners, staff, roles, and access control.',
      },
    ],
  },
  {
    phase: '4',
    label: 'Growth & Retention',
    flags: [
      {
        key: 'isTransactionalEmailEnabled',
        label: 'Transactional Email',
        description: 'Resend order confirmations, shipping, and verification emails.',
      },
      {
        key: 'isPredictiveReplenishmentEnabled',
        label: 'Predictive Replenishment',
        description: '90-day velocity restock emails with 1-click carts.',
      },
      {
        key: 'isAbandonedCartEnabled',
        label: 'Abandoned Cart Recovery',
        description: '1-hour idle cart recovery links.',
      },
      {
        key: 'isLoyaltyRedemptionEnabled',
        label: 'Loyalty Redemption',
        description: 'Spend earned points at checkout.',
      },
    ],
  },
  {
    phase: '5',
    label: 'Infrastructure & UX',
    flags: [
      {
        key: 'isAlgoliaSearchEnabled',
        label: 'Algolia Search',
        description: 'Typo-tolerant catalog discovery.',
      },
      {
        key: 'isAiCoPilotEnabled',
        label: 'Research Co-Pilot',
        description: 'RAG assistant trained on catalog.json (no medical advice).',
      },
      {
        key: 'isInteractive3dEnabled',
        label: 'Interactive 3D',
        description: 'WebGL molecules and dynamic vial visuals.',
      },
    ],
  },
];

export const moduleFlagsPatchSchema = moduleFlagsSchema
  .omit({ updatedAt: true, updatedBy: true })
  .partial();

export type ModuleFlagsPatch = z.infer<typeof moduleFlagsPatchSchema>;
