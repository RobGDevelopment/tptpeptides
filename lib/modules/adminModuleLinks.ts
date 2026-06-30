import type { ModuleFlags } from '../schemas/modules';
import { isB2BFeatureEnabled } from './b2b';
import { isModuleEnabled } from './flags';

export interface AdminModuleLink {
  label: string;
  href: string;
  description: string;
  phase: string;
}

/** Deep links for enabled modules — shown on admin dashboard. */
export function getAdminModuleLinks(flags: ModuleFlags): AdminModuleLink[] {
  const links: AdminModuleLink[] = [];

  if (isB2BFeatureEnabled(flags, 'isInstitutionVerificationEnabled')) {
    links.push({
      phase: '1',
      label: 'Institution Verification',
      href: '/admin/verifications',
      description: 'Review KYB submissions and assign institution tiers.',
    });
  }

  if (isB2BFeatureEnabled(flags, 'isTieredPricingEnabled')) {
    links.push({
      phase: '1',
      label: 'Tiered Pricing',
      href: '/admin/products#tier-pricing',
      description: 'Configure Bronze, Silver, and Gold price list overrides.',
    });
  }

  if (isB2BFeatureEnabled(flags, 'isQuoteWorkflowEnabled')) {
    links.push({
      phase: '1',
      label: 'Quote Workflow',
      href: '/admin/quotes',
      description: 'Build institutional quotes and export printable PDFs.',
    });
  }

  if (isB2BFeatureEnabled(flags, 'isNetTermsEnabled')) {
    links.push({
      phase: '1',
      label: 'Net Terms Invoicing',
      href: '/admin/rollout#phase-1',
      description: 'Verified institutions can request Net-30 Stripe invoices at checkout.',
    });
  }
  if (isModuleEnabled(flags, 'isAccountingExportEnabled')) {
    links.push({
      phase: '1',
      label: 'Accounting Export',
      href: '/admin/orders',
      description: 'Export QuickBooks-ready CSV from completed orders.',
    });
  }

  if (isModuleEnabled(flags, 'isUserManagementEnabled')) {
    links.push({
      phase: '3',
      label: 'User Management',
      href: '/admin/users',
      description: 'Invite staff, partners, and manage access.',
    });
  }

  if (isModuleEnabled(flags, 'isTransactionalEmailEnabled')) {
    links.push({
      phase: '4',
      label: 'Transactional Email',
      href: '/admin/rollout#p4-resend',
      description: 'Order, shipping, and verification emails via Resend (requires API key).',
    });
  }

  if (isModuleEnabled(flags, 'isBatchCoaEnabled')) {
    links.push({
      phase: '2',
      label: 'Batch & COA Genealogy',
      href: '/admin/inventory#batch-coa',
      description: 'Register inbound lots and assign batch traceability to orders.',
    });
  }

  if (isModuleEnabled(flags, 'isRealShippingEnabled')) {
    links.push({
      phase: '2',
      label: 'Carrier Shipping',
      href: '/admin/orders',
      description: 'Create EasyPost labels and attach tracking to paid orders.',
    });
  }

  if (isModuleEnabled(flags, 'isComplianceGeoBlockEnabled')) {
    links.push({
      phase: '2',
      label: 'Geo Restrictions',
      href: '/admin/inventory#geo-compliance',
      description: 'Configure US states blocked at checkout.',
    });
  }

  if (isModuleEnabled(flags, 'isSalesCommandCenterEnabled')) {
    links.push({
      phase: '3',
      label: 'Sales Command Center',
      href: '/admin/sales',
      description: 'Institution pipeline, AE roster, co-browse, and margin intelligence.',
    });
  }

  if (
    isModuleEnabled(flags, 'isAbandonedCartEnabled') ||
    isModuleEnabled(flags, 'isPredictiveReplenishmentEnabled') ||
    isModuleEnabled(flags, 'isLoyaltyRedemptionEnabled')
  ) {
    links.push({
      phase: '4',
      label: 'Growth Command Center',
      href: '/admin/growth',
      description: 'Abandoned cart recovery, replenishment nudges, and loyalty redemption.',
    });
  }

  if (
    isModuleEnabled(flags, 'isAlgoliaSearchEnabled') ||
    isModuleEnabled(flags, 'isAiCoPilotEnabled') ||
    isModuleEnabled(flags, 'isInteractive3dEnabled')
  ) {
    links.push({
      phase: '5',
      label: 'Science Luxury UX',
      href: '/catalog',
      description: 'Algolia search, Research Co-Pilot, and interactive 3D product visuals on the storefront.',
    });
  }

  links.push({
    phase: '0',
    label: 'V2 Rollout Playbook',
    href: '/admin/rollout',
    description: 'Step-by-step go-live instructions, env vars, cron setup, and in-app actions.',
  });

  if (isModuleEnabled(flags, 'isSatelliteProvisioningEnabled')) {
    links.push({
      phase: '6',
      label: 'Satellite Provisioning',
      href: '/admin/satellites',
      description: 'Attach B2C burner domains via Vercel and bootstrap tenant_config.',
    });
  }

  if (isModuleEnabled(flags, 'isTelehealthEnabled')) {
    links.push({
      phase: '7',
      label: 'Wellness Command Center',
      href: '/admin/wellness/patients',
      description: 'Telehealth patients, intakes, prescriptions, and clinic settings (Supabase).',
    });
  }

  if (isModuleEnabled(flags, 'isZeroTouchOpsEnabled')) {
    links.push({
      phase: '2',
      label: 'Operations Exceptions',
      href: '/admin/exceptions',
      description: 'Review failed auto-PO, auto-label, and tracking webhook events.',
    });
  }

  links.push({
    phase: 'F/G',
    label: 'Native Ledger',
    href: '/admin/ledger',
    description: 'Immutable journal entries and QuickBooks sync status.',
  });

  return links;
}

export function showVerificationsNav(flags: ModuleFlags): boolean {
  return isB2BFeatureEnabled(flags, 'isInstitutionVerificationEnabled');
}

export function showUsersNav(flags: ModuleFlags): boolean {
  return isModuleEnabled(flags, 'isUserManagementEnabled');
}

export function showTierPricingPanel(flags: ModuleFlags): boolean {
  return isB2BFeatureEnabled(flags, 'isTieredPricingEnabled');
}

export function showAccountingExportPanel(flags: ModuleFlags): boolean {
  return isModuleEnabled(flags, 'isAccountingExportEnabled');
}

export function showQuotesNav(flags: ModuleFlags): boolean {
  return isB2BFeatureEnabled(flags, 'isQuoteWorkflowEnabled');
}

export function showSalesNav(flags: ModuleFlags): boolean {
  return isModuleEnabled(flags, 'isSalesCommandCenterEnabled');
}

export function showGrowthNav(flags: ModuleFlags): boolean {
  return (
    isModuleEnabled(flags, 'isAbandonedCartEnabled') ||
    isModuleEnabled(flags, 'isPredictiveReplenishmentEnabled') ||
    isModuleEnabled(flags, 'isLoyaltyRedemptionEnabled')
  );
}

export function showWellnessNav(flags: ModuleFlags): boolean {
  return isModuleEnabled(flags, 'isTelehealthEnabled');
}
