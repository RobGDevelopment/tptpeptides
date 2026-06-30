'use client';

import { Suspense } from 'react';
import { AgeGate } from './AgeGate';
import { ClinicStorefrontShell } from './ClinicStorefrontShell';
import { AdminRedirectHandler } from './AdminRedirectHandler';
import { CartDrawer } from './CartDrawer';
import { CartSnapshotTracker } from './CartSnapshotTracker';
import { PremiumNavbar } from './PremiumNavbar';
import { StorefrontAuthModal } from './StorefrontAuthModal';
import { Spinner } from '../../../components/ui/Spinner';
import { useAgeGateStore } from '../stores/useAgeGateStore';
import { useAgeGateHydrated } from '../hooks/useAgeGateHydrated';
import { useAuth } from '../../auth/providers/AuthProvider';
import { logAgeVerification } from '../../../lib/firebase/compliance';

interface StorefrontShellProps {
  children: React.ReactNode;
  /** Telehealth lane — skips B2B age gate and uses clinic navigation. */
  skipAgeGate?: boolean;
}

function B2bStorefrontShell({ children }: { children: React.ReactNode }) {
  const hydrated = useAgeGateHydrated();
  const isVerified = useAgeGateStore((state) => state.isVerified);
  const verify = useAgeGateStore((state) => state.verify);
  const { user } = useAuth();

  const handleVerify = () => {
    verify();
    void logAgeVerification({ userId: user?.uid, ageConfirmed: true });
  };

  const pendingVerification = !isVerified;

  return (
    <>
      <Suspense fallback={null}>
        <AdminRedirectHandler />
      </Suspense>
      {pendingVerification && !hydrated ? (
        <div className="fixed inset-0 z-[9999] bg-void flex items-center justify-center">
          <Spinner label="Loading terminal access..." />
        </div>
      ) : null}
      {pendingVerification && hydrated ? (
        <AgeGate onVerify={handleVerify} isReady />
      ) : null}
      <PremiumNavbar />
      <CartSnapshotTracker />
      {children}
      <CartDrawer />
      <StorefrontAuthModal />
    </>
  );
}

export function StorefrontShell({ children, skipAgeGate = false }: StorefrontShellProps) {
  if (skipAgeGate) {
    return <ClinicStorefrontShell>{children}</ClinicStorefrontShell>;
  }

  return <B2bStorefrontShell>{children}</B2bStorefrontShell>;
}
