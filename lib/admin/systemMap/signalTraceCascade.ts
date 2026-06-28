import { SYSTEM_NODE_MAP } from './nodes';
import type { SystemEdge, SystemNodeId } from './types';

/** When a spine hub is struck, branch comets fire to these satellites (live/partial only at runtime). */
export const IMPACT_CASCADE_TARGETS: Partial<Record<SystemNodeId, SystemNodeId[]>> = {
  github: ['vercel'],
  vercel: ['firestore', 'firebase-auth'],
  firestore: ['storefront-cms', 'catalog', 'orders'],
  'storefront-cms': ['catalog'],
  catalog: ['firestore'],
  cart: ['checkout'],
  auth: ['firebase-auth', 'account-portal', 'kyb'],
  kyb: ['firebase-storage', 'pricing'],
  pricing: ['modules', 'checkout'],
  checkout: ['orders', 'stripe'],
  'geo-block': ['audit-logs'],
  stripe: ['orders', 'quickbooks', 'fulfillment'],
  fulfillment: ['inventory', 'orders'],
  easypost: ['resend'],
  resend: ['loyalty'],
  quickbooks: ['audit-logs'],
  inventory: ['batch-coa'],
  orders: ['inventory', 'loyalty'],
  loyalty: ['account-portal'],
  modules: ['kyb', 'pricing'],
};

export const CASCADE_BEAM_MS = 1100;

export function getLiveCascadeTargets(hubId: SystemNodeId): SystemNodeId[] {
  const raw = IMPACT_CASCADE_TARGETS[hubId] ?? [];
  return raw.filter((id) => {
    const node = SYSTEM_NODE_MAP[id];
    const status = node?.implementationStatus;
    return status === 'live' || status === 'partial';
  });
}

export function buildCascadeEdges(hubId: SystemNodeId): SystemEdge[] {
  return getLiveCascadeTargets(hubId).map((target) => ({ source: hubId, target }));
}

export function isSpineNode(id: SystemNodeId, spineIds: ReadonlySet<SystemNodeId>): boolean {
  return spineIds.has(id);
}
