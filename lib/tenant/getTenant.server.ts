import 'server-only';

import { headers } from 'next/headers';
import { DEFAULT_TENANT_ID, TENANT_ID_HEADER } from './constants';
import { resolveTenantFromHost } from './resolveTenant.edge';

/** Active tenant for the current request — prefers edge-injected header. */
export async function getActiveTenantId(): Promise<string> {
  const headerList = await headers();
  const fromMiddleware = headerList.get(TENANT_ID_HEADER)?.trim();
  if (fromMiddleware) return fromMiddleware;

  const host = headerList.get('host');
  return resolveTenantFromHost(host).tenantId || DEFAULT_TENANT_ID;
}
