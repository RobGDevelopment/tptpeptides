import type { SystemEdge, SystemTelemetryLoop, TelemetryLoopId } from './types';

/** Duration of one comet hop — flares and next hop sync to this value. */
export const BEAM_TRAVEL_MS = 1500;
export const BEAM_TRAVEL_S = BEAM_TRAVEL_MS / 1000;

const hop = (source: SystemEdge['source'], target: SystemEdge['target']): SystemEdge => ({
  source,
  target,
});

export const SYSTEM_TELEMETRY_LOOPS: SystemTelemetryLoop[] = [
  {
    id: 'customer',
    label: 'Customer-to-Fulfillment',
    accentColor: '#FFD700',
    hopIntervalMs: BEAM_TRAVEL_MS,
    edges: [
      hop('storefront-cms', 'catalog'),
      hop('catalog', 'cart'),
      hop('cart', 'age-gate'),
      hop('age-gate', 'auth'),
      hop('auth', 'kyb'),
      hop('kyb', 'pricing'),
      hop('pricing', 'checkout'),
      hop('checkout', 'stripe'),
      hop('stripe', 'fulfillment'),
      hop('fulfillment', 'easypost'),
      hop('easypost', 'resend'),
      hop('resend', 'storefront-cms'),
    ],
  },
  {
    id: 'deployment',
    label: 'Deployment Pipeline',
    accentColor: '#5BC0EB',
    hopIntervalMs: 2000,
    edges: [
      hop('github', 'vercel'),
      hop('vercel', 'firestore'),
      hop('firestore', 'storefront-cms'),
      hop('storefront-cms', 'github'),
    ],
  },
  {
    id: 'finance',
    label: 'Finance Close',
    accentColor: '#E8A838',
    hopIntervalMs: BEAM_TRAVEL_MS,
    edges: [
      hop('stripe', 'quickbooks'),
      hop('quickbooks', 'audit-logs'),
      hop('audit-logs', 'stripe'),
    ],
  },
  {
    id: 'compliance',
    label: 'Compliance Attestation',
    accentColor: '#F5E6A3',
    hopIntervalMs: BEAM_TRAVEL_MS,
    edges: [
      hop('age-gate', 'checkout'),
      hop('checkout', 'geo-block'),
      hop('geo-block', 'audit-logs'),
      hop('audit-logs', 'age-gate'),
    ],
  },
  {
    id: 'growth',
    label: 'Growth & Retention',
    accentColor: '#FFD700',
    hopIntervalMs: 2000,
    edges: [
      hop('orders', 'loyalty'),
      hop('loyalty', 'predictive-replenishment'),
      hop('predictive-replenishment', 'resend'),
      hop('abandoned-cart', 'resend'),
      hop('resend', 'cart'),
      hop('cart', 'orders'),
    ],
  },
];

export const PRIMARY_TELEMETRY_LOOP_ID: TelemetryLoopId = 'customer';

export interface TelemetryScheduleSegment {
  loopId: TelemetryLoopId;
  /** Run at reduced opacity alongside primary */
  dimmed?: boolean;
}

/** Master playback sequence — one bright comet at a time unless dimmed concurrent. */
export const TELEMETRY_PLAYBACK_SCHEDULE: TelemetryScheduleSegment[] = [
  { loopId: 'customer' },
  { loopId: 'finance' },
  { loopId: 'customer' },
  { loopId: 'customer' },
  { loopId: 'customer' },
  { loopId: 'customer' },
  { loopId: 'deployment' },
  { loopId: 'compliance' },
  { loopId: 'customer' },
  { loopId: 'growth', dimmed: true },
];

export function getLoopById(id: TelemetryLoopId): SystemTelemetryLoop {
  const loop = SYSTEM_TELEMETRY_LOOPS.find((l) => l.id === id);
  if (!loop) throw new Error(`Unknown telemetry loop: ${id}`);
  return loop;
}

/** Flatten schedule into ordered hops for the runtime scheduler. */
export function buildPlaybackQueue(): { loopId: TelemetryLoopId; edge: SystemEdge; dimmed: boolean }[] {
  const queue: { loopId: TelemetryLoopId; edge: SystemEdge; dimmed: boolean }[] = [];
  for (const segment of TELEMETRY_PLAYBACK_SCHEDULE) {
    const loop = getLoopById(segment.loopId);
    for (const edge of loop.edges) {
      queue.push({ loopId: segment.loopId, edge, dimmed: segment.dimmed ?? false });
    }
  }
  return queue;
}

/** @deprecated Use buildPlaybackQueue — kept for transitional imports */
export const SYSTEM_TELEMETRY_SEQUENCE: SystemEdge[] =
  SYSTEM_TELEMETRY_LOOPS.find((l) => l.id === 'customer')!.edges;
