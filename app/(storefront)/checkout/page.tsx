import { Suspense } from 'react';
import { CheckoutPage } from '../../../features/checkout/components/CheckoutPage';
import { Spinner } from '../../../components/ui/Spinner';

export default function Page() {
  return (
    <Suspense fallback={<Spinner label="Loading checkout..." className="min-h-screen py-20" />}>
      <CheckoutPage />
    </Suspense>
  );
}
