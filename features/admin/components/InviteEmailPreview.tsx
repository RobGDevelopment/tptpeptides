'use client';

import { useEffect, useState } from 'react';
import type { InvitePersona } from '../../../lib/schemas/invitation';
import type { InstitutionTier } from '../../../lib/schemas/user';
import { Spinner } from '../../../components/ui/Spinner';

export interface InvitePreviewFields {
  email: string;
  persona: InvitePersona;
  role?: 'admin' | 'partner' | 'staff';
  institutionTier?: InstitutionTier;
  institutionName?: string;
  personalNote?: string;
}

interface InviteEmailPreviewProps {
  fields: InvitePreviewFields;
  enabled: boolean;
  /** Fills parent flex column (invite composer layout). */
  fill?: boolean;
}

export function InviteEmailPreview({ fields, enabled, fill = false }: InviteEmailPreviewProps) {
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        setError('');

        const body: Record<string, unknown> = {
          persona: fields.persona,
          email: fields.email.trim() || undefined,
          personalNote: fields.personalNote?.trim() || undefined,
        };

        if (fields.persona === 'staff_partner' && fields.role) body.role = fields.role;
        if (fields.persona === 'lab_buyer') {
          body.institutionTier = fields.institutionTier ?? 'Bronze';
          if (fields.institutionName?.trim()) body.institutionName = fields.institutionName.trim();
        }

        try {
          const response = await fetch('/api/admin/invitations/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
          });

          if (!response.ok) {
            const data = (await response.json()) as { error?: string };
            setError(data.error ?? 'Preview unavailable.');
            setSubject('');
            setHtml('');
            return;
          }

          const data = (await response.json()) as { subject: string; html: string };
          setSubject(data.subject);
          setHtml(data.html);
        } catch {
          if (controller.signal.aborted) return;
          setError('Unable to load preview.');
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      })();
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [enabled, fields]);

  return (
    <div className={fill ? 'flex flex-col min-h-0 h-full' : 'flex flex-col min-h-0'}>
      <div className="shrink-0 px-6 md:px-8 pt-6 pb-4 border-b border-white/5">
        <p className="text-[10px] tracking-caps uppercase text-muted">Recipient preview</p>
        <p className="text-xs text-muted font-light mt-1">
          Live preview — updates as you compose the invite.
        </p>
      </div>

      <div
        className={
          fill
            ? 'flex flex-col flex-1 min-h-0'
            : 'flex flex-col flex-1 min-h-[420px] max-h-[min(70vh,640px)] border border-white/10 bg-void/40'
        }
      >
        <div className="shrink-0 border-b border-white/5 px-6 md:px-8 py-4 bg-surface/40">
          <p className="text-[10px] tracking-caps uppercase text-muted mb-1">Subject line</p>
          {loading && !subject ? (
            <Spinner label="" className="py-2" />
          ) : (
            <p className="text-sm md:text-base text-primary font-light">{subject || '—'}</p>
          )}
        </div>

        <div className="relative flex-1 min-h-0 bg-[#0A0A0A]">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Spinner label="Rendering preview…" />
            </div>
          ) : null}

          {error ? <p className="p-6 text-sm text-red-400/90 font-light">{error}</p> : null}

          {!error && html ? (
            <iframe
              title="Invite email preview"
              srcDoc={html}
              sandbox=""
              className="absolute inset-0 w-full h-full border-0 bg-[#0A0A0A]"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
