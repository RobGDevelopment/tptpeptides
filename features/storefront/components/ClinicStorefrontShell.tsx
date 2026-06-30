'use client';

import { ClinicPremiumNavbar } from './ClinicPremiumNavbar';

/** Telehealth storefront shell — shared nav without B2B age gate or Firebase cart/auth. */
export function ClinicStorefrontShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ClinicPremiumNavbar />
      {children}
    </>
  );
}
