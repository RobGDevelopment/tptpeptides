'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import {
  getProviderMessages,
  sendMessageToPatient,
} from '../../actions/patientCareActions';
import type { ClinicMessage } from '../../../../lib/schemas/clinicCare';
import { Button } from '../../../../components/ui/Button';

type PatientSecureMessagesPanelProps = {
  patientId: string;
  patientName: string;
};

export function PatientSecureMessagesPanel({
  patientId,
  patientName,
}: PatientSecureMessagesPanelProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ClinicMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    startTransition(async () => {
      try {
        const rows = await getProviderMessages(patientId);
        setMessages(rows);
        setLoadError(null);
      } catch (caught) {
        setLoadError(caught instanceof Error ? caught.message : 'Unable to load messages.');
      }
    });
  }, [open, patientId]);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  const handleSend = () => {
    const content = draft.trim();
    if (!content) return;

    setError(null);
    startTransition(async () => {
      const result = await sendMessageToPatient(patientId, content);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setDraft('');
      const refreshed = await getProviderMessages(patientId);
      setMessages(refreshed);
    });
  };

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Secure Messages
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close secure messages"
            onClick={() => setOpen(false)}
          />

          <aside className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-white/[0.06] bg-[#0a0a0b] shadow-2xl">
            <div className="border-b border-white/[0.06] px-5 py-4">
              <p className="text-[10px] tracking-caps uppercase text-muted">Secure Messages</p>
              <h2 className="text-lg font-light text-primary">{patientName}</h2>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
              aria-live="polite"
            >
              {loadError ? (
                <p className="text-sm text-red-300">{loadError}</p>
              ) : messages.length === 0 ? (
                <p className="text-sm text-muted font-light py-8 text-center">
                  No messages on file for this patient.
                </p>
              ) : (
                messages.map((message) => {
                  const isProvider = message.senderRole === 'provider';
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isProvider ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-sm border px-4 py-3 ${
                          isProvider
                            ? 'border-gold-light/30 bg-gold-light/5 text-primary'
                            : 'border-white/[0.08] bg-surface/30 text-primary'
                        }`}
                      >
                        <p className="text-[10px] tracking-caps uppercase text-muted mb-1">
                          {isProvider ? 'Care Team' : 'Patient'}
                        </p>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p className="mt-2 text-[10px] text-muted">
                          {new Date(message.createdAt).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-white/[0.06] p-5 space-y-3">
              {error ? (
                <p className="text-sm text-red-300" role="alert">
                  {error}
                </p>
              ) : null}
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Reply to patient…"
                rows={3}
                maxLength={4000}
                disabled={pending}
                className="w-full rounded-sm border border-white/10 bg-void/40 px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-gold-light/30"
              />
              <div className="flex justify-end">
                <Button type="button" disabled={pending || !draft.trim()} onClick={handleSend}>
                  {pending ? 'Sending…' : 'Send reply'}
                </Button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
