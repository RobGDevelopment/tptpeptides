import { SITE_COA_EMAIL } from '../../../lib/brand';

interface CoaViewerProps {
  orderId: string;
  productNames: string[];
}

export function CoaViewer({ orderId, productNames }: CoaViewerProps) {
  return (
    <div className="border-t border-white/[0.06] pt-4 mt-4">
      <p className="text-[10px] tracking-caps uppercase text-muted mb-2">Certificate of Analysis</p>
      <p className="text-sm text-secondary font-light mb-3">
        Batch documentation for {productNames.join(', ')} (order {orderId.slice(-8).toUpperCase()}).
      </p>
      <div className="flex flex-wrap gap-4">
        <a href={`mailto:${SITE_COA_EMAIL}`} className="terminal-link text-[10px]">
          Request COA
        </a>
        <a href="/lab-results" className="terminal-link text-[10px]">
          Lab Results Library
        </a>
      </div>
    </div>
  );
}
