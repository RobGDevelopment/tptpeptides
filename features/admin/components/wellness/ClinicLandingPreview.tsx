'use client';

import { useDeferredValue, useMemo } from 'react';
import {
  ClinicFooterPreview,
  ClinicHeroSection,
  ClinicNavbarPreview,
} from '../../../clinic/components/ClinicHeroSection';
import { clinicLandingToCssProperties } from '../../../../lib/tenant/clinicTheme';
import type { ClinicLandingContent } from '../../../../lib/schemas/clinicLanding';

export type ClinicPreviewViewport = 'desktop' | 'mobile';

export function ClinicLandingPreview({
  draft,
  viewport = 'desktop',
  supportEmail,
  published,
}: {
  draft: ClinicLandingContent;
  viewport?: ClinicPreviewViewport;
  supportEmail?: string;
  published?: ClinicLandingContent;
}) {
  const deferredDraft = useDeferredValue(draft);
  const themeStyle = useMemo(
    () => clinicLandingToCssProperties(deferredDraft),
    [deferredDraft]
  );

  const isStale = deferredDraft !== draft;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between gap-3 mb-3 px-1">
        <div>
          <p className="text-[10px] tracking-caps uppercase text-muted">Live preview</p>
          <p className="text-xs text-secondary font-light mt-0.5">
            {isStale ? 'Updating…' : 'Draft — not published until you save'}
          </p>
        </div>
        {published ? (
          <span className="text-[9px] tracking-caps uppercase px-2 py-1 rounded-sm border border-white/[0.08] text-muted">
            vs published
          </span>
        ) : null}
      </div>

      <div
        className={`flex-1 min-h-0 rounded-sm border border-white/[0.1] overflow-hidden shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)] ${
          viewport === 'mobile' ? 'mx-auto w-[375px] max-w-full' : 'w-full'
        }`}
      >
        <div className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] border-b border-white/[0.06]">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
          <span className="ml-2 flex-1 text-center text-[10px] text-muted font-mono truncate">
            www.tptclinic.com
          </span>
        </div>

        <div
          className="clinic-lane clinic-preview-frame overflow-y-auto overflow-x-hidden max-h-[min(72vh,720px)] text-primary antialiased"
          style={themeStyle}
          data-tenant-lane="telehealth"
        >
          <ClinicNavbarPreview content={deferredDraft} compact={viewport === 'mobile'} />
          <main className="bg-void">
            <ClinicHeroSection content={deferredDraft} preview />
          </main>
          <ClinicFooterPreview
            content={deferredDraft}
            supportEmail={supportEmail}
            compact={viewport === 'mobile'}
          />
        </div>
      </div>
    </div>
  );
}
