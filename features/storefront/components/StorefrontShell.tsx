'use client';

import { Suspense } from 'react';
import { AgeGate } from './AgeGate';
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
}

export function StorefrontShell({ children }: StorefrontShellProps) {
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
