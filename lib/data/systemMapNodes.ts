export type SystemMapNodeId =
  | 'storefront'
  | 'user-account'
  | 'kyb'
  | 'tier-pricing'
  | 'stripe'
  | 'fulfillment'
  | 'resend'
  | 'quickbooks';

export type AutomationStatus = 'Fully Automated' | 'Requires Admin Approval' | 'Hybrid';

export interface SystemMapNode {
  id: SystemMapNodeId;
  label: string;
  shortLabel: string;
  /** SVG canvas position (viewBox 0 0 1000 520) */
  x: number;
  y: number;
  purpose: string;
  inputs: string[];
  outputs: string[];
  automationStatus: AutomationStatus;
  adminHref: string;
  adminLinkLabel: string;
}

export interface SystemMapEdge {
  id: string;
  from: SystemMapNodeId;
  to: SystemMapNodeId;
}

export const SYSTEM_MAP_NODES: SystemMapNode[] = [
  {
    id: 'storefront',
    label: 'Storefront / Catalog',
    shortLabel: 'Storefront',
    x: 90,
    y: 340,
    purpose:
      'The public research terminal. CMS-driven homepage, catalog grid, product detail pages, and cart capture the first touchpoint for laboratory buyers browsing compounds.',
    inputs: ['User traffic & age gate', 'CMS hero & category content', 'Live product catalog from Firestore'],
    outputs: ['Cart line items', 'Session intent', 'RUO attestation at checkout'],
    automationStatus: 'Fully Automated',
    adminHref: '/admin/storefront',
    adminLinkLabel: 'Open Storefront CMS',
  },
  {
    id: 'user-account',
    label: 'User Account & Authentication',
    shortLabel: 'Auth',
    x: 90,
    y: 140,
    purpose:
      'Firebase Auth establishes identity for the client portal. Session cookies sync server-side for checkout, account history, and institution verification eligibility.',
    inputs: ['Email / password sign-in', 'Firebase ID token', 'Invite onboarding links'],
    outputs: ['UID & session cookie', 'User profile document', 'Role & access level'],
    automationStatus: 'Fully Automated',
    adminHref: '/admin/users',
    adminLinkLabel: 'Open User Management',
  },
  {
    id: 'kyb',
    label: 'KYB Institution Verification',
    shortLabel: 'KYB Verify',
    x: 300,
    y: 140,
    purpose:
      'Know-your-institution gate for B2B procurement. Researchers submit W-9, EIN, and lab documentation; admins approve and assign Bronze, Silver, or Gold tier.',
    inputs: ['Institution name & EIN', 'W-9 / lab letter upload', 'Admin review decision'],
    outputs: ['institutionVerified flag', 'institutionTier assignment', 'Verification decision email'],
    automationStatus: 'Requires Admin Approval',
    adminHref: '/admin/verifications',
    adminLinkLabel: 'Open Verifications',
  },
  {
    id: 'tier-pricing',
    label: 'Algorithmic Tiered Pricing',
    shortLabel: 'Tier Pricing',
    x: 300,
    y: 340,
    purpose:
      'Applies institution tier discounts at checkout. Bronze, Silver, and Gold price lists override catalog retail for verified B2B accounts when modules are enabled.',
    inputs: ['Cart SKU list', 'Catalog base prices', 'Institution tier from KYB'],
    outputs: ['Dynamic unit prices', 'Priced Stripe line items', 'Order subtotal snapshot'],
    automationStatus: 'Fully Automated',
    adminHref: '/admin/products',
    adminLinkLabel: 'Open Tier Pricing',
  },
  {
    id: 'stripe',
    label: 'Stripe Payment Gateway',
    shortLabel: 'Stripe',
    x: 520,
    y: 340,
    purpose:
      'Hosted checkout session collects payment. Webhooks confirm settlement, lock financial fields on the order, and trigger downstream fulfillment and communications.',
    inputs: ['Priced cart total', 'Customer email', 'Stripe Checkout session metadata'],
    outputs: ['Payment confirmation', 'stripeSessionId', 'Cleared funds signal'],
    automationStatus: 'Fully Automated',
    adminHref: '/admin/orders',
    adminLinkLabel: 'Open Orders',
  },
  {
    id: 'fulfillment',
    label: 'Order Fulfillment',
    shortLabel: 'Fulfillment',
    x: 740,
    y: 200,
    purpose:
      'Paid orders decrement inventory, advance status through processing, and attach tracking. Purchase orders replenish low-stock SKUs from the inventory module.',
    inputs: ['Paid order payload', 'Product stock levels', 'Admin status updates'],
    outputs: ['Inventory decrement', 'Order status timeline', 'Tracking & carrier data'],
    automationStatus: 'Hybrid',
    adminHref: '/admin/inventory',
    adminLinkLabel: 'Open Inventory',
  },
  {
    id: 'resend',
    label: 'Automated Comms / Resend',
    shortLabel: 'Resend',
    x: 740,
    y: 400,
    purpose:
      'Transactional email layer for order confirmations, verification decisions, shipping dispatch, and partner invites. Gated by module flag and verified sending domain.',
    inputs: ['Webhook & admin triggers', 'Order / user context', 'RESEND API key'],
    outputs: ['Customer emails', 'Invite delivery', 'Delivery telemetry logs'],
    automationStatus: 'Fully Automated',
    adminHref: '/admin/modules',
    adminLinkLabel: 'Open Modules',
  },
  {
    id: 'quickbooks',
    label: 'QuickBooks Accounting Export',
    shortLabel: 'QuickBooks',
    x: 910,
    y: 200,
    purpose:
      'Finance-ready CSV export of cleared orders for QuickBooks import. Date-range filtering aligns with accounting close workflows.',
    inputs: ['Paid / fulfilled orders', 'Financial lock timestamp', 'Admin export request'],
    outputs: ['CSV ledger file', 'Audit log entry'],
    automationStatus: 'Hybrid',
    adminHref: '/admin/orders',
    adminLinkLabel: 'Open Accounting Export',
  },
];

export const SYSTEM_MAP_EDGES: SystemMapEdge[] = [
  { id: 'storefront-tier', from: 'storefront', to: 'tier-pricing' },
  { id: 'account-kyb', from: 'user-account', to: 'kyb' },
  { id: 'kyb-tier', from: 'kyb', to: 'tier-pricing' },
  { id: 'tier-stripe', from: 'tier-pricing', to: 'stripe' },
  { id: 'stripe-fulfillment', from: 'stripe', to: 'fulfillment' },
  { id: 'stripe-resend', from: 'stripe', to: 'resend' },
  { id: 'fulfillment-resend', from: 'fulfillment', to: 'resend' },
  { id: 'fulfillment-quickbooks', from: 'fulfillment', to: 'quickbooks' },
];

export const SYSTEM_MAP_NODE_MAP = Object.fromEntries(
  SYSTEM_MAP_NODES.map((node) => [node.id, node])
) as Record<SystemMapNodeId, SystemMapNode>;

export const DEFAULT_SYSTEM_MAP_NODE: SystemMapNodeId = 'storefront';
