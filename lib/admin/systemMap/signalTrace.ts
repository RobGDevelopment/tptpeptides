import type { SystemEdge, SystemNodeId } from './types';
import { systemEdgeKey } from './edges';

export type SignalTraceAct = 'deploy' | 'discover' | 'verify' | 'procure' | 'transact' | 'fulfill' | 'close' | 'retain';

export interface SignalTraceHop {
  edge: SystemEdge;
  act: SignalTraceAct;
  headline: string;
  detail: string;
}

const hop = (source: SystemNodeId, target: SystemNodeId): SystemEdge => ({ source, target });

/** Act 0 — optional deployment cold open. */
export const SIGNAL_TRACE_DEPLOY_HOPS: SignalTraceHop[] = [
  {
    edge: hop('github', 'vercel'),
    act: 'deploy',
    headline: 'Push to main',
    detail: 'Developer merge triggers the Vercel production build pipeline.',
  },
  {
    edge: hop('vercel', 'firestore'),
    act: 'deploy',
    headline: 'Runtime connects to datastore',
    detail: 'Edge host provisions serverless functions with Firebase Admin credentials.',
  },
  {
    edge: hop('firestore', 'storefront-cms'),
    act: 'deploy',
    headline: 'Live CMS hydrate',
    detail: 'Firestore cms/* documents render on the public research terminal.',
  },
];

/** Primary customer journey — one beam, sequential branch-on-impact. */
export const SIGNAL_TRACE_CUSTOMER_HOPS: SignalTraceHop[] = [
  {
    edge: hop('age-gate', 'storefront-cms'),
    act: 'discover',
    headline: 'Age attestation unlocks storefront',
    detail: 'Researcher confirms 21+ and RUO intent; event logged to auditLogs.',
  },
  {
    edge: hop('storefront-cms', 'catalog'),
    act: 'discover',
    headline: 'CMS drives catalog discovery',
    detail: 'Hero merchandising and category rules surface SKU grid from Firestore products.',
  },
  {
    edge: hop('catalog', 'cart'),
    act: 'discover',
    headline: 'SKU selected → cart capture',
    detail: 'Line items persist client-side until checkout handoff.',
  },
  {
    edge: hop('cart', 'auth'),
    act: 'verify',
    headline: 'Identity established',
    detail: 'Firebase Auth + session cookie sync for account history and B2B eligibility.',
  },
  {
    edge: hop('auth', 'kyb'),
    act: 'verify',
    headline: 'Institution verification branch',
    detail: 'Verified labs submit W-9 and EIN; admin assigns Bronze / Silver / Gold tier.',
  },
  {
    edge: hop('kyb', 'pricing'),
    act: 'procure',
    headline: 'Tier pricing applied',
    detail: 'priceLists override catalog retail for institution tier when modules enabled.',
  },
  {
    edge: hop('pricing', 'checkout'),
    act: 'procure',
    headline: 'Checkout engine engaged',
    detail: 'Stock validation, RUO attestation with IP timestamp, pending order created.',
  },
  {
    edge: hop('checkout', 'geo-block'),
    act: 'transact',
    headline: 'Compliance geo check',
    detail: 'Restricted regions blocked before payment collection when module enabled.',
  },
  {
    edge: hop('geo-block', 'stripe'),
    act: 'transact',
    headline: 'Stripe session opened',
    detail: 'Hosted checkout collects payment; webhook awaits checkout.session.completed.',
  },
  {
    edge: hop('stripe', 'fulfillment'),
    act: 'fulfill',
    headline: 'Cleared funds → fulfillment hub',
    detail: 'Webhook fulfills order, decrements inventory, queues pick/pack workflow.',
  },
  {
    edge: hop('fulfillment', 'inventory'),
    act: 'fulfill',
    headline: 'Inventory synchronized',
    detail: 'Stock levels updated; low-SKU signals may draft purchase orders.',
  },
  {
    edge: hop('fulfillment', 'easypost'),
    act: 'fulfill',
    headline: 'Carrier label generated',
    detail: 'EasyPost rates, labels, and tracking metadata attach to the order.',
  },
  {
    edge: hop('easypost', 'resend'),
    act: 'close',
    headline: 'Shipping notification dispatched',
    detail: 'Resend sends tracking email; delivery telemetry logged.',
  },
  {
    edge: hop('stripe', 'quickbooks'),
    act: 'close',
    headline: 'Finance export branch',
    detail: 'Cleared order financial fields export to QuickBooks-ready CSV.',
  },
  {
    edge: hop('quickbooks', 'audit-logs'),
    act: 'close',
    headline: 'Audit trail sealed',
    detail: 'Accounting export and order mutations append immutable auditLogs entries.',
  },
  {
    edge: hop('resend', 'loyalty'),
    act: 'retain',
    headline: 'Loyalty points awarded',
    detail: 'Authenticated buyers earn loyalty ledger credits on paid checkout.',
  },
  {
    edge: hop('loyalty', 'predictive-replenishment'),
    act: 'retain',
    headline: 'Replenishment signal queued',
    detail: '90-day velocity analysis prepares restock outreach when module enabled.',
  },
];

export const SIGNAL_TRACE_HOP_MS = 1800;

/** How long each guided journey stop holds before advancing. */
export const JOURNEY_DWELL_MS = 4200;

export function buildSignalTraceQueue(includeDeploy: boolean): SignalTraceHop[] {
  return includeDeploy
    ? [...SIGNAL_TRACE_DEPLOY_HOPS, ...SIGNAL_TRACE_CUSTOMER_HOPS]
    : [...SIGNAL_TRACE_CUSTOMER_HOPS];
}

export function getNarrativeEdgeKeys(includeDeploy: boolean): Set<string> {
  const keys = new Set<string>();
  for (const h of buildSignalTraceQueue(includeDeploy)) {
    keys.add(systemEdgeKey(h.edge));
  }
  return keys;
}

export const SIGNAL_TRACE_ACT_LABELS: Record<SignalTraceAct, string> = {
  deploy: 'Act 0 · Deploy',
  discover: 'Act 1 · Discover',
  verify: 'Act 2 · Verify',
  procure: 'Act 3 · Procure',
  transact: 'Act 4 · Transact',
  fulfill: 'Act 5 · Fulfill',
  close: 'Act 6 · Close',
  retain: 'Act 7 · Retain',
};
