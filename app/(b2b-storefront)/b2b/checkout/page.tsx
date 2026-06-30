import { Suspense } from 'react';
import { CheckoutPage } from '../../../../features/checkout/components/CheckoutPage';
import { Spinner } from '../../../../components/ui/Spinner';
import { getSessionUserFromCookies } from '../../../../lib/firebase/auth.server';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { getUserPricingTier } from '../../../../lib/firebase/pricing.server';
import { isB2BFeatureEnabled } from '../../../../lib/modules/b2b';
import { isModuleEnabled } from '../../../../lib/modules/flags';

export default async function Page() {
  const flags = await getModuleFlags();
  const session = await getSessionUserFromCookies();
  let netTermsEligible = false;

  if (session?.uid && isB2BFeatureEnabled(flags, 'isNetTermsEnabled')) {
    const pricing = await getUserPricingTier(session.uid);
    netTermsEligible = pricing.institutionVerified;
  }

  return (
    <Suspense fallback={<Spinner label="Loading checkout..." className="min-h-screen py-20" />}>
      <CheckoutPage
        stripeTaxEnabled={isModuleEnabled(flags, 'isStripeTaxEnabled')}
        netTermsEnabled={isB2BFeatureEnabled(flags, 'isNetTermsEnabled')}
        netTermsEligible={netTermsEligible}
        geoBlockEnabled={isModuleEnabled(flags, 'isComplianceGeoBlockEnabled')}
        realShippingEnabled={isModuleEnabled(flags, 'isRealShippingEnabled')}
        loyaltyRedemptionEnabled={isModuleEnabled(flags, 'isLoyaltyRedemptionEnabled')}
        typedAttestationEnabled={isModuleEnabled(flags, 'isTypedAttestationEnabled')}
      />
    </Suspense>
  );
}
