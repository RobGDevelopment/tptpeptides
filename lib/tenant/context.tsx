'use client';

import { createContext, useContext } from 'react';
import type { TenantConfig } from '../schemas/tenant';

export interface TenantContextValue {
  tenantId: string;
  config: TenantConfig;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({
  tenantId,
  config,
  children,
}: {
  tenantId: string;
  config: TenantConfig;
  children: React.ReactNode;
}) {
  return (
    <TenantContext.Provider value={{ tenantId, config }}>{children}</TenantContext.Provider>
  );
}

export function useTenant(): TenantContextValue {
  const value = useContext(TenantContext);
  if (!value) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return value;
}

export function useTenantOptional(): TenantContextValue | null {
  return useContext(TenantContext);
}
