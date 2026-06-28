import type { ModuleFlagKey } from '../../schemas/modules';

export type SystemNodeId =
  | 'github'
  | 'vercel'
  | 'firebase-auth'
  | 'firestore'
  | 'firebase-storage'
  | 'storefront-cms'
  | 'catalog'
  | 'cart'
  | 'account-portal'
  | 'age-gate'
  | 'algolia-search'
  | 'ai-copilot'
  | 'interactive-3d'
  | 'abandoned-cart'
  | 'auth'
  | 'kyb'
  | 'pricing'
  | 'quotes'
  | 'checkout'
  | 'fulfillment'
  | 'orders'
  | 'inventory'
  | 'loyalty'
  | 'modules'
  | 'predictive-replenishment'
  | 'stripe'
  | 'stripe-tax'
  | 'net-terms'
  | 'resend'
  | 'easypost'
  | 'quickbooks'
  | 'batch-coa'
  | 'geo-block'
  | 'audit-logs'
  | 'sales-command'
  | 'client-impersonation'
  | 'lead-routing'
  | 'rbac'
  | 'margin-report';

export type SystemMapZone =
  | 'infrastructure'
  | 'customer-ux'
  | 'core-engine'
  | 'integrations'
  | 'compliance-ops';

export type SystemNodeKind = 'platform' | 'integration' | 'module' | 'pipeline';

export type NodeImplementationStatus = 'live' | 'partial' | 'planned';

export type AutomationStatus = 'Fully Automated' | 'Requires Admin Approval' | 'Hybrid';

export type TelemetryLoopId = 'deployment' | 'customer' | 'finance' | 'compliance' | 'growth';

export interface SystemNodeInfrastructure {
  provider: string;
  service?: string;
  docsUrl?: string;
  envVars?: string[];
  externalUrl?: string;
}

export interface SystemNode {
  id: SystemNodeId;
  zone: SystemMapZone;
  kind: SystemNodeKind;
  phase?: '0' | '1' | '2' | '3' | '4' | '5';
  label: string;
  graphLabel: string;
  graphLabelShort?: string;
  x: number;
  y: number;
  size?: 'sm' | 'md' | 'lg';
  purpose: string;
  inputs: string[];
  outputs: string[];
  automationStatus: AutomationStatus;
  implementationStatus: NodeImplementationStatus;
  moduleKey?: ModuleFlagKey;
  requiresModuleKey?: ModuleFlagKey;
  adminHref?: string;
  adminLinkLabel?: string;
  storefrontHref?: string;
  infrastructure?: SystemNodeInfrastructure;
}

export interface SystemEdge {
  source: SystemNodeId;
  target: SystemNodeId;
  loops?: TelemetryLoopId[];
  structural?: boolean;
}

export interface SystemTelemetryLoop {
  id: TelemetryLoopId;
  label: string;
  accentColor: string;
  hopIntervalMs: number;
  edges: SystemEdge[];
}

export interface SystemMapZoneConfig {
  id: SystemMapZone;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
