'use client';

import { useState } from 'react';
import {
  DEFAULT_SYSTEM_NODE_ID,
  SYSTEM_NODE_MAP,
  type SystemNodeId,
} from '../../../lib/admin/systemMapConfig';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { SystemMapDetailPanel } from './SystemMapDetailPanel';
import { SystemMapGraph } from './SystemMapGraph';

export function SystemMapPageContent() {
  const [selectedId, setSelectedId] = useState<SystemNodeId>(DEFAULT_SYSTEM_NODE_ID);
  const selectedNode = SYSTEM_NODE_MAP[selectedId];

  return (
    <div className="-m-8 flex flex-col min-h-[calc(100vh)] bg-[#050505]">
      <div className="px-8 pt-8 pb-4 shrink-0">
        <p className="text-[10px] tracking-caps uppercase text-gold/80 mb-2">Ownership Telemetry</p>
        <h1 className="admin-heading text-2xl md:text-3xl">System Architecture</h1>
        <p className="admin-subheading max-w-3xl">
          Full enterprise constellation — infrastructure pipeline, customer UX, core engine,
          integrations, compliance, and all five module phases. Scroll to pan on smaller viewports.
        </p>
        <HeaderDividerBeam delay={1} className="mt-6" />
      </div>

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row border-t border-white/[0.04]">
        <div className="lg:w-[70%] min-w-0 flex flex-col border-b lg:border-b-0 lg:border-r border-white/[0.04] relative min-h-[560px] lg:min-h-[720px]">
          <SystemMapGraph selectedId={selectedId} onSelect={setSelectedId} />
          <p className="absolute bottom-4 left-8 text-[10px] tracking-caps uppercase text-muted/60 pointer-events-none z-20">
            Click a node · Scroll to pan →
          </p>
        </div>

        <div className="lg:w-[30%] min-w-0 lg:min-w-[280px] lg:max-w-md shrink-0 max-h-[50vh] lg:max-h-none">
          <SystemMapDetailPanel node={selectedNode} />
        </div>
      </div>
    </div>
  );
}
