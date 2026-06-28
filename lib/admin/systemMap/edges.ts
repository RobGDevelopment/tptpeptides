import type { SystemEdge } from './types';

/** Structural architecture edges — always rendered at opacity-20. */
export const SYSTEM_EDGES: SystemEdge[] = [
  // Deployment spine
  { source: 'github', target: 'vercel', loops: ['deployment'] },
  { source: 'vercel', target: 'firestore', loops: ['deployment'] },
  { source: 'firestore', target: 'storefront-cms', loops: ['deployment'] },
  { source: 'vercel', target: 'auth', loops: ['deployment'] },
  { source: 'firebase-auth', target: 'auth' },
  { source: 'firestore', target: 'catalog' },
  { source: 'firestore', target: 'orders' },
  { source: 'firebase-storage', target: 'kyb' },
  { source: 'firebase-storage', target: 'batch-coa' },

  // Customer UX
  { source: 'storefront-cms', target: 'catalog', loops: ['customer', 'deployment'] },
  { source: 'catalog', target: 'cart', loops: ['customer'] },
  { source: 'cart', target: 'age-gate', loops: ['customer', 'compliance'] },
  { source: 'age-gate', target: 'storefront-cms' },
  { source: 'age-gate', target: 'auth', loops: ['customer', 'compliance'] },
  { source: 'auth', target: 'account-portal' },
  { source: 'catalog', target: 'algolia-search' },
  { source: 'catalog', target: 'ai-copilot' },
  { source: 'catalog', target: 'interactive-3d' },
  { source: 'cart', target: 'abandoned-cart', loops: ['growth'] },

  // Core engine
  { source: 'auth', target: 'kyb', loops: ['customer'] },
  { source: 'kyb', target: 'pricing', loops: ['customer'] },
  { source: 'pricing', target: 'quotes' },
  { source: 'quotes', target: 'checkout' },
  { source: 'pricing', target: 'checkout', loops: ['customer'] },
  { source: 'cart', target: 'checkout', loops: ['customer'] },
  { source: 'checkout', target: 'geo-block', loops: ['compliance'] },
  { source: 'geo-block', target: 'stripe' },
  { source: 'checkout', target: 'stripe', loops: ['customer'] },
  { source: 'stripe', target: 'fulfillment', loops: ['customer'] },
  { source: 'stripe', target: 'orders', loops: ['customer', 'finance'] },
  { source: 'fulfillment', target: 'easypost', loops: ['customer'] },
  { source: 'fulfillment', target: 'inventory' },
  { source: 'orders', target: 'inventory' },
  { source: 'orders', target: 'loyalty', loops: ['growth'] },
  { source: 'inventory', target: 'batch-coa' },

  // Integrations
  { source: 'checkout', target: 'stripe-tax' },
  { source: 'stripe', target: 'stripe-tax' },
  { source: 'stripe', target: 'quickbooks', loops: ['finance'] },
  { source: 'orders', target: 'net-terms' },
  { source: 'fulfillment', target: 'resend', loops: ['customer'] },
  { source: 'easypost', target: 'resend', loops: ['customer'] },
  { source: 'kyb', target: 'resend' },
  { source: 'abandoned-cart', target: 'resend', loops: ['growth'] },
  { source: 'predictive-replenishment', target: 'resend', loops: ['growth'] },

  // Module control hub (structural only)
  { source: 'modules', target: 'kyb', structural: true },
  { source: 'modules', target: 'pricing', structural: true },
  { source: 'modules', target: 'quotes', structural: true },
  { source: 'modules', target: 'easypost', structural: true },
  { source: 'modules', target: 'algolia-search', structural: true },

  // Compliance & sales
  { source: 'geo-block', target: 'audit-logs', loops: ['compliance'] },
  { source: 'age-gate', target: 'audit-logs', loops: ['compliance'] },
  { source: 'lead-routing', target: 'auth' },
  { source: 'lead-routing', target: 'sales-command' },
  { source: 'sales-command', target: 'quotes' },
  { source: 'sales-command', target: 'client-impersonation' },
  { source: 'client-impersonation', target: 'cart' },
  { source: 'rbac', target: 'modules' },
  { source: 'margin-report', target: 'orders' },
  { source: 'loyalty', target: 'predictive-replenishment', loops: ['growth'] },
  { source: 'resend', target: 'loyalty' },
  { source: 'predictive-replenishment', target: 'cart', loops: ['growth'] },
  { source: 'resend', target: 'storefront-cms', loops: ['customer', 'growth'] },
];

export function systemEdgeKey(edge: Pick<SystemEdge, 'source' | 'target'>): string {
  return `${edge.source}-${edge.target}`;
}

export function edgesMatch(
  a: Pick<SystemEdge, 'source' | 'target'>,
  b: Pick<SystemEdge, 'source' | 'target'>
): boolean {
  return a.source === b.source && a.target === b.target;
}
