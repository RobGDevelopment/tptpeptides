import type { SystemNodeId } from './types';

/** Spine + wing coordinates for Signal Trace layout (0–100 viewBox). */
export const SIGNAL_TRACE_POSITIONS: Record<SystemNodeId, { x: number; y: number }> = {
  github: { x: 8, y: 10 },
  vercel: { x: 22, y: 10 },
  'firebase-auth': { x: 38, y: 10 },
  firestore: { x: 54, y: 10 },
  'firebase-storage': { x: 70, y: 10 },

  'age-gate': { x: 4, y: 48 },
  'storefront-cms': { x: 14, y: 48 },
  catalog: { x: 24, y: 48 },
  cart: { x: 34, y: 48 },
  auth: { x: 44, y: 48 },
  kyb: { x: 44, y: 28 },
  pricing: { x: 54, y: 48 },
  quotes: { x: 54, y: 24 },
  checkout: { x: 64, y: 48 },
  stripe: { x: 74, y: 48 },
  fulfillment: { x: 84, y: 48 },
  orders: { x: 74, y: 68 },
  inventory: { x: 84, y: 68 },
  easypost: { x: 92, y: 48 },
  resend: { x: 96, y: 38 },

  'account-portal': { x: 44, y: 68 },
  'algolia-search': { x: 24, y: 32 },
  'ai-copilot': { x: 24, y: 22 },
  'interactive-3d': { x: 24, y: 62 },
  'abandoned-cart': { x: 34, y: 68 },

  loyalty: { x: 88, y: 68 },
  'predictive-replenishment': { x: 96, y: 68 },
  modules: { x: 54, y: 82 },

  'stripe-tax': { x: 74, y: 28 },
  'net-terms': { x: 64, y: 28 },
  quickbooks: { x: 84, y: 28 },

  'batch-coa': { x: 14, y: 82 },
  'geo-block': { x: 64, y: 68 },
  'audit-logs': { x: 92, y: 28 },
  'sales-command': { x: 64, y: 82 },
  'client-impersonation': { x: 70, y: 88 },
  'lead-routing': { x: 38, y: 82 },
  rbac: { x: 48, y: 88 },
  'margin-report': { x: 78, y: 82 },
};

export function getTracePosition(id: SystemNodeId): { x: number; y: number } {
  return SIGNAL_TRACE_POSITIONS[id];
}
