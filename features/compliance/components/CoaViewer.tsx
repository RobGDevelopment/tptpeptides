'use client';

import { useEffect, useState } from 'react';
import { SITE_COA_EMAIL } from '../../../lib/brand';

interface CoaDocument {
  name: string;
  tag: string;
  lotNumber: string | null;
  coaUrl: string | null;
}

interface CoaViewerProps {
  orderId: string;
  productNames: string[];
  enabled?: boolean;
}

export function CoaViewer({ orderId, productNames, enabled = false }: CoaViewerProps) {
  const [documents, setDocuments] = useState<CoaDocument[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setLoaded(true);
      return;
    }

    void (async () => {
      try {
        const response = await fetch(`/api/account/orders/${orderId}/coa`);
        if (!response.ok) {
          setLoaded(true);
          return;
        }
        const data = (await response.json()) as { documents: CoaDocument[] };
        setDocuments(data.documents);
      } finally {
        setLoaded(true);
      }
    })();
  }, [enabled, orderId]);

  const hasDownloads = enabled && documents.some((doc) => doc.coaUrl);

  return (
    <div className="border-t border-white/[0.06] pt-4 mt-4">
      <p className="text-[10px] tracking-caps uppercase text-muted mb-2">Certificate of Analysis</p>
      <p className="text-sm text-secondary font-light mb-3">
        Batch documentation for {productNames.join(', ')} (order {orderId.slice(-8).toUpperCase()}).
      </p>

      {enabled && loaded && hasDownloads && (
        <ul className="space-y-2 mb-3">
          {documents
            .filter((doc) => doc.coaUrl)
            .map((doc) => (
              <li key={`${doc.name}-${doc.lotNumber ?? 'lot'}`}>
                <a
                  href={doc.coaUrl!}
                  target="_blank"
                  rel="noreferrer"
                  className="terminal-link text-[10px]"
                >
                  Download COA — {doc.name}
                  {doc.lotNumber ? ` (Lot ${doc.lotNumber})` : ''}
                </a>
              </li>
            ))}
        </ul>
      )}

      {enabled && loaded && documents.length > 0 && !hasDownloads && (
        <p className="text-xs text-muted font-light mb-3">
          Lot numbers assigned — COA files will appear once batches are linked.
        </p>
      )}

      <div className="flex flex-wrap gap-4">
        {!hasDownloads && (
          <a href={`mailto:${SITE_COA_EMAIL}`} className="terminal-link text-[10px]">
            Request COA
          </a>
        )}
        <a href="/lab-results" className="terminal-link text-[10px]">
          Lab Results Library
        </a>
      </div>
    </div>
  );
}
