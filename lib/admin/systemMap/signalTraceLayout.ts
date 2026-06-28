import type { SystemNodeId } from './types';

/**
 * Compact viewport-fit layout (0–100). Margins ~10–86 on X keep labels inside the canvas.
 * Rows: infrastructure → integrations → customer spine → fulfillment → ops/compliance.
 */
export const SIGNAL_TRACE_POSITIONS: Record<SystemNodeId, { x: number; y: number }> = {
  // Row 1 — infrastructure & finance ops
  github: { x: 12, y: 8 },
  vercel: { x: 24, y: 8 },
  'firebase-auth': { x: 36, y: 8 },
  firestore: { x: 48, y: 8 },
  'firebase-storage': { x: 60, y: 8 },
  quickbooks: { x: 72, y: 8 },
  'audit-logs': { x: 84, y: 8 },

  // Row 2 — integrations & messaging
  'ai-copilot': { x: 12, y: 22 },
  'algolia-search': { x: 24, y: 22 },
  kyb: { x: 38, y: 22 },
  quotes: { x: 48, y: 22 },
  'net-terms': { x: 58, y: 22 },
  'stripe-tax': { x: 68, y: 22 },
  easypost: { x: 78, y: 22 },
  resend: { x: 84, y: 22 },

  // Row 3 — primary customer spine
  'age-gate': { x: 12, y: 40 },
  'storefront-cms': { x: 21, y: 40 },
  catalog: { x: 30, y: 40 },
  cart: { x: 39, y: 40 },
  auth: { x: 48, y: 40 },
  pricing: { x: 57, y: 40 },
  checkout: { x: 66, y: 40 },
  stripe: { x: 75, y: 40 },
  fulfillment: { x: 84, y: 40 },

  // Row 4 — fulfillment & account satellites
  'interactive-3d': { x: 12, y: 56 },
  'abandoned-cart': { x: 24, y: 56 },
  'account-portal': { x: 39, y: 56 },
  'geo-block': { x: 54, y: 56 },
  orders: { x: 66, y: 56 },
  inventory: { x: 75, y: 56 },
  loyalty: { x: 84, y: 56 },

  // Row 5 — modules & sales ops
  'batch-coa': { x: 12, y: 72 },
  'lead-routing': { x: 24, y: 72 },
  modules: { x: 39, y: 72 },
  'predictive-replenishment': { x: 54, y: 72 },
  rbac: { x: 66, y: 72 },
  'sales-command': { x: 75, y: 72 },
  'client-impersonation': { x: 84, y: 72 },

  // Row 6 — reporting
  'margin-report': { x: 48, y: 86 },
};

export function getTracePosition(id: SystemNodeId): { x: number; y: number } {
  return SIGNAL_TRACE_POSITIONS[id];
}
