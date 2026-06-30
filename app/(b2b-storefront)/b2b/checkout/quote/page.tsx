import { Suspense } from 'react';
import { QuoteCheckoutPage } from '../../../../../features/checkout/components/QuoteCheckoutPage';
import { Spinner } from '../../../../../components/ui/Spinner';
import { getModuleFlags } from '../../../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../../../lib/modules/flags';

export default async function Page() {
  const flags = await getModuleFlags();

  return (
    <Suspense fallback={<Spinner label="Loading quote checkout..." className="min-h-screen py-20" />}>
      <QuoteCheckoutPage typedAttestationEnabled={isModuleEnabled(flags, 'isTypedAttestationEnabled')} />
    </Suspense>
  );
}
