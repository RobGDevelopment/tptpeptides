import { SYSTEM_EDGES, systemEdgeKey } from './edges';
import type { SystemEdge, SystemNodeId } from './types';

export interface ActiveLink {
  edge: SystemEdge;
  neighborId: SystemNodeId;
}

/** Direct graph neighbors for a node (both inbound and outbound edges). */
export function getActiveLinksForNode(nodeId: SystemNodeId): ActiveLink[] {
  const links: ActiveLink[] = [];
  const seen = new Set<string>();

  for (const edge of SYSTEM_EDGES) {
    if (edge.source === nodeId) {
      const key = systemEdgeKey(edge);
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({ edge, neighborId: edge.target });
    } else if (edge.target === nodeId) {
      const key = systemEdgeKey(edge);
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({ edge, neighborId: edge.source });
    }
  }

  return links;
}

export function getConnectedNodeIds(nodeId: SystemNodeId): SystemNodeId[] {
  return getActiveLinksForNode(nodeId).map((l) => l.neighborId);
}
