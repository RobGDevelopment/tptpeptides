import type { ModuleFlags } from '../schemas/modules';

/** Safe defaults — every epic off until Super Admin enables via /admin/modules. */
export const DEFAULT_MODULE_FLAGS: ModuleFlags = {
  isB2BProcurementEnabled: false,
  isInstitutionVerificationEnabled: false,
  isTieredPricingEnabled: false,
  isQuoteWorkflowEnabled: false,
  isNetTermsEnabled: false,
  isStripeTaxEnabled: false,
  isAccountingExportEnabled: false,
  isMiddeskVerificationEnabled: false,

  isBatchCoaEnabled: false,
  isRealShippingEnabled: false,
  isComplianceGeoBlockEnabled: false,
  isTypedAttestationEnabled: false,
  isAlternatePaymentRailsEnabled: false,
  isSatelliteProvisioningEnabled: false,
  isZeroTouchOpsEnabled: false,
  isLexicalQuarantineEnabled: false,

  isSalesCommandCenterEnabled: false,
  isClientImpersonationEnabled: false,
  isLeadRoutingEnabled: false,
  isMarginReportingEnabled: false,
  isGranularRbacEnabled: false,
  isUserManagementEnabled: false,

  isTransactionalEmailEnabled: false,
  isPredictiveReplenishmentEnabled: false,
  isAbandonedCartEnabled: false,
  isLoyaltyRedemptionEnabled: false,

  isAlgoliaSearchEnabled: false,
  isAiCoPilotEnabled: false,
  isInteractive3dEnabled: false,

  isTelehealthEnabled: false,
};
