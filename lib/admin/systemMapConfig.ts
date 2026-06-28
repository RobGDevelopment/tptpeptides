/** Barrel export — enterprise system map configuration (Sprint 5.2). */
export type {
  AutomationStatus,
  NodeImplementationStatus,
  SystemEdge,
  SystemMapZone,
  SystemNode,
  SystemNodeId,
  SystemNodeInfrastructure,
  SystemNodeKind,
  SystemTelemetryLoop,
  TelemetryLoopId,
} from './systemMap/types';

export {
  SYSTEM_MAP_ZONES,
  SYSTEM_NODES,
  SYSTEM_NODE_MAP,
  DEFAULT_SYSTEM_NODE_ID,
  SYSTEM_NODE_RADIUS,
  SYSTEM_NODE_RADIUS_SM,
  nodeRadiusFor,
  ZONE_LABELS,
} from './systemMap/nodes';

export { SYSTEM_EDGES, systemEdgeKey, edgesMatch } from './systemMap/edges';

export {
  BEAM_TRAVEL_MS,
  BEAM_TRAVEL_S,
  SYSTEM_TELEMETRY_LOOPS,
  SYSTEM_TELEMETRY_SEQUENCE,
  PRIMARY_TELEMETRY_LOOP_ID,
  TELEMETRY_PLAYBACK_SCHEDULE,
  buildPlaybackQueue,
  getLoopById,
} from './systemMap/telemetry';

export {
  SIGNAL_TRACE_DEPLOY_HOPS,
  SIGNAL_TRACE_CUSTOMER_HOPS,
  SIGNAL_TRACE_HOP_MS,
  JOURNEY_DWELL_MS,
  SIGNAL_TRACE_ACT_LABELS,
  buildSignalTraceQueue,
  getNarrativeEdgeKeys,
  type SignalTraceHop,
  type SignalTraceAct,
} from './systemMap/signalTrace';

export { SIGNAL_TRACE_POSITIONS, getTracePosition } from './systemMap/signalTraceLayout';

export {
  getActiveLinksForNode,
  getConnectedNodeIds,
  type ActiveLink,
} from './systemMap/connections';

export {
  IMPACT_CASCADE_TARGETS,
  CASCADE_BEAM_MS,
  getLiveCascadeTargets,
  buildCascadeEdges,
} from './systemMap/signalTraceCascade';
