import { Suspense } from 'react';
import { CartRecoverPage } from '../../../../../features/storefront/components/CartRecoverPage';
import { Spinner } from '../../../../../components/ui/Spinner';

export default function Page() {
  return (
    <Suspense fallback={<Spinner label="Loading recovery link..." className="min-h-screen py-20" />}>
      <CartRecoverPage />
    </Suspense>
  );
}
