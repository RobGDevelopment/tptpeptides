export type SystemNodeId =
  | 'storefront'
  | 'auth'
  | 'kyb'
  | 'pricing'
  | 'checkout'
  | 'stripe'
  | 'fulfillment'
  | 'quickbooks'
  | 'resend';

export type AutomationStatus = 'Fully Automated' | 'Requires Admin Approval' | 'Hybrid';

export interface SystemNode {
  id: SystemNodeId;
  /** Full title for the detail panel */
  label: string;
  /** Uppercase label rendered on the constellation graph */
  graphLabel: string;
  /** Percentage position within the constellation canvas (0–100) */
  x: number;
  y: number;
  purpose: string;
  inputs: string[];
  outputs: string[];
  automationStatus: AutomationStatus;
  adminHref: string;
  adminLinkLabel: string;
}

export interface SystemEdge {
  source: SystemNodeId;
  target: SystemNodeId;
}

export const SYSTEM_NODES: SystemNode[] = [
  {
    id: 'storefront',
    label: 'Storefront / Catalog',
    graphLabel: 'STOREFRONT',
    x: 10,
    y: 50,
    purpose:
      'The public research terminal. CMS-driven homepage, catalog grid, product detail pages, and cart capture the first touchpoint for laboratory buyers browsing compounds.',
    inputs: ['User traffic & age gate', 'CMS hero & category content', 'Live product catalog from Firestore'],
    outputs: ['Cart line items', 'Browse session intent', 'Catalog SKU selection'],
    automationStatus: 'Fully Automated',
    adminHref: '/admin/storefront',
    adminLinkLabel: 'Open Storefront CMS',
  },
  {
    id: 'auth',
    label: 'User Account & Authentication',
    graphLabel: 'USER AUTH',
    x: 25,
    y: 30,
    purpose:
      'Firebase Auth establishes identity for the client portal. Session cookies sync server-side for checkout, account history, and institution verification eligibility.',
    inputs: ['Email / password sign-in', 'Firebase ID token', 'Partner invite onboarding'],
    outputs: ['UID & session cookie', 'User profile document', 'Role & access level'],
    automationStatus: 'Fully Automated',
    adminHref: '/admin/users',
    adminLinkLabel: 'Open User Management',
  },
  {
    id: 'kyb',
    label: 'KYB Institution Verification',
    graphLabel: 'KYB VERIFY',
    x: 40,
    y: 20,
    purpose:
      'Know-your-institution gate for B2B procurement. Researchers submit W-9, EIN, and lab documentation; admins approve and assign Bronze, Silver, or Gold tier.',
    inputs: ['Institution name & EIN', 'W-9 / lab letter upload', 'Authenticated UID'],
    outputs: ['institutionVerified flag', 'institutionTier assignment', 'Verification decision email'],
    automationStatus: 'Requires Admin Approval',
    adminHref: '/admin/verifications',
    adminLinkLabel: 'Open Verifications',
  },
  {
    id: 'pricing',
    label: 'Algorithmic Tiered Pricing',
    graphLabel: 'TIERED PRICING',
    x: 30,
    y: 70,
    purpose:
      'Applies institution tier discounts to cart lines. Bronze, Silver, and Gold price lists override catalog retail for verified B2B accounts when modules are enabled.',
    inputs: ['Cart SKU list', 'Catalog base prices', 'Institution tier from KYB'],
    outputs: ['Dynamic unit prices', 'Discount snapshot', 'Priced line-item payload'],
    automationStatus: 'Fully Automated',
    adminHref: '/admin/products',
    adminLinkLabel: 'Open Tier Pricing',
  },
  {
    id: 'checkout',
    label: 'Checkout Engine',
    graphLabel: 'CHECKOUT ENGINE',
    x: 45,
    y: 50,
    purpose:
      'Validates stock, locks tier-adjusted pricing, records RUO attestation with IP timestamp, creates the pending Firestore order, and opens the Stripe Checkout session.',
    inputs: ['Priced cart lines', 'Session or guest email', 'Optional PO / requisition number'],
    outputs: ['Pending order document', 'stripeSessionId', 'Checkout redirect URL'],
    automationStatus: 'Fully Automated',
    adminHref: '/admin/orders',
    adminLinkLabel: 'Open Orders',
  },
  {
    id: 'stripe',
    label: 'Stripe Payment Gateway',
    graphLabel: 'STRIPE GATEWAY',
    x: 60,
    y: 50,
    purpose:
      'Hosted payment collection and webhook settlement. Confirms funds, locks financial fields on the order, and emits the cleared-funds signal for fulfillment.',
    inputs: ['Checkout session total', 'Customer email', 'checkout.session.completed webhook'],
    outputs: ['Payment confirmation', 'stripePaymentIntentId', 'Cleared funds signal'],
    automationStatus: 'Fully Automated',
    adminHref: '/admin/orders',
    adminLinkLabel: 'Open Orders',
  },
  {
    id: 'fulfillment',
    label: 'Order Fulfillment',
    graphLabel: 'ORDER FULFILLMENT',
    x: 75,
    y: 35,
    purpose:
      'Paid orders decrement inventory, advance through processing, and attach tracking. Low-stock SKUs trigger draft purchase orders from the inventory module.',
    inputs: ['Paid order payload', 'Product stock levels', 'Admin status updates'],
    outputs: ['Inventory decrement', 'Order status timeline', 'Tracking & carrier metadata'],
    automationStatus: 'Hybrid',
    adminHref: '/admin/inventory',
    adminLinkLabel: 'Open Inventory',
  },
  {
    id: 'quickbooks',
    label: 'QuickBooks Accounting Export',
    graphLabel: 'QUICKBOOKS EXPORT',
    x: 90,
    y: 20,
    purpose:
      'Finance-ready CSV export of cleared orders for QuickBooks import. Date-range filtering aligns with accounting close workflows.',
    inputs: ['Paid / fulfilled orders', 'Financial lock timestamp', 'Admin export request'],
    outputs: ['CSV ledger file', 'Audit log entry'],
    automationStatus: 'Hybrid',
    adminHref: '/admin/orders',
    adminLinkLabel: 'Open Accounting Export',
  },
  {
    id: 'resend',
    label: 'Automated Comms / Resend',
    graphLabel: 'AUTOMATED COMMS',
    x: 75,
    y: 70,
    purpose:
      'Transactional email layer for order confirmations, verification decisions, shipping dispatch, and partner invites. Gated by module flag and verified sending domain.',
    inputs: ['Webhook & admin triggers', 'Order / user context', 'RESEND API key'],
    outputs: ['Customer emails', 'Invite delivery', 'Delivery telemetry logs'],
    automationStatus: 'Fully Automated',
    adminHref: '/admin/modules',
    adminLinkLabel: 'Open Modules',
  },
];

export const SYSTEM_EDGES: SystemEdge[] = [
  { source: 'storefront', target: 'auth' },
  { source: 'storefront', target: 'pricing' },
  { source: 'auth', target: 'kyb' },
  { source: 'kyb', target: 'pricing' },
  { source: 'pricing', target: 'checkout' },
  { source: 'checkout', target: 'stripe' },
  { source: 'stripe', target: 'fulfillment' },
  { source: 'fulfillment', target: 'quickbooks' },
  { source: 'fulfillment', target: 'resend' },
];

export const SYSTEM_NODE_MAP = Object.fromEntries(
  SYSTEM_NODES.map((node) => [node.id, node])
) as Record<SystemNodeId, SystemNode>;

export const DEFAULT_SYSTEM_NODE_ID: SystemNodeId = 'storefront';

export function systemEdgeKey(edge: SystemEdge): string {
  return `${edge.source}-${edge.target}`;
}

/** Node radius as a fraction of the 0–100 coordinate space (for edge trimming). */
export const SYSTEM_NODE_RADIUS = 3.2;
