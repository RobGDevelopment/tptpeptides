'use client';

import { AgeGate } from './AgeGate';
import { CartDrawer } from './CartDrawer';
import { PremiumNavbar } from './PremiumNavbar';
import { StorefrontAuthModal } from './StorefrontAuthModal';
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
    void logAgeVerification(user?.uid);
  };

  const showAgeGate = !hydrated || !isVerified;

  return (
    <>
      {showAgeGate && <AgeGate onVerify={handleVerify} isReady={hydrated} />}
      <PremiumNavbar />
      {children}
      <CartDrawer />
      <StorefrontAuthModal />
    </>
  );
}
