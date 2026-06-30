'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import {
  getPatientMessages,
  sendMessageToProvider,
} from '../actions/careActions';
import type { ClinicMessage } from '../../../lib/schemas/clinicCare';
import { Button } from '../../../components/ui/Button';

type SecureMessageCenterProps = {
  initialMessages: ClinicMessage[];
};

export function SecureMessageCenter({ initialMessages }: SecureMessageCenterProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const content = draft.trim();
    if (!content) return;

    setError(null);
    startTransition(async () => {
      const result = await sendMessageToProvider(content);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setDraft('');
      const refreshed = await getPatientMessages();
      setMessages(refreshed);
    });
  };

  return (
    <section className="rounded-sm border border-black/[0.08] bg-[#fcfcfc]/80 backdrop-blur-sm overflow-hidden shadow-sm">
      <div className="border-b border-black/[0.06] px-5 py-3">
        <h2 className="text-[10px] tracking-caps uppercase text-muted">Secure Messages</h2>
        <p className="mt-1 text-xs text-secondary font-light">
          HIPAA-encrypted channel with your clinical care team. Do not use for emergencies.
        </p>
      </div>

      <div
        ref={scrollRef}
        className="h-80 overflow-y-auto px-5 py-4 space-y-3 bg-surface/20"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-muted font-light text-center py-10">
            No messages yet. Send a note to your care team below.
          </p>
        ) : (
          messages.map((message) => {
            const isPatient = message.senderRole === 'patient';
            return (
              <div
                key={message.id}
                className={`flex ${isPatient ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-sm border px-4 py-3 ${
                    isPatient
                      ? 'border-gold-light/30 bg-gold-light/5 text-primary'
                      : 'border-black/[0.08] bg-white text-primary'
                  }`}
                >
                  <p className="text-[10px] tracking-caps uppercase text-muted mb-1">
                    {isPatient ? 'You' : 'Care Team'}
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

      <div className="border-t border-black/[0.06] p-5 space-y-3">
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write a secure message to your provider…"
          rows={3}
          maxLength={4000}
          disabled={pending}
          className="w-full rounded-sm border border-black/[0.08] bg-white px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-gold-light/40"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] text-muted">{draft.length}/4000</p>
          <Button type="button" disabled={pending || !draft.trim()} onClick={handleSend}>
            {pending ? 'Sending…' : 'Send message'}
          </Button>
        </div>
      </div>
    </section>
  );
}
