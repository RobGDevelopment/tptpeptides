'use client';

import { useState } from 'react';
import {
  DEFAULT_SYSTEM_NODE_ID,
  SYSTEM_NODE_MAP,
  type SystemNodeId,
} from '../../../lib/admin/systemMapConfig';
import { SystemMapDetailPanel } from './SystemMapDetailPanel';
import { SystemMapGraph } from './SystemMapGraph';

export function SystemMapPageContent() {
  const [selectedId, setSelectedId] = useState<SystemNodeId>(DEFAULT_SYSTEM_NODE_ID);
  const selectedNode = SYSTEM_NODE_MAP[selectedId];

  return (
    <div className="-m-8 flex flex-col min-h-[calc(100vh)] bg-black">
      <div className="px-8 pt-8 pb-4 shrink-0 border-b border-white/10">
        <p className="text-[10px] font-bold tracking-widest uppercase text-stone-500 mb-2">
          Ownership Telemetry
        </p>
        <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-widest text-stone-100">
          System Architecture
        </h1>
        <p className="text-sm text-stone-500 font-light max-w-3xl mt-3">
          Falconwood OS constellation — infrastructure pipeline, customer UX, core engine,
          integrations, compliance, and all five module phases.
        </p>
      </div>

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        <div className="lg:w-[70%] min-w-0 flex flex-col relative min-h-[560px] lg:min-h-[720px] bg-black">
          <SystemMapGraph selectedId={selectedId} onSelect={setSelectedId} />
          <p className="absolute bottom-4 left-8 text-[10px] font-bold tracking-widest uppercase text-stone-600 pointer-events-none z-20">
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
