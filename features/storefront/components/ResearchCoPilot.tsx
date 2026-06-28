'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '../../../components/ui/Button';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { Input } from '../../../components/ui/Input';
import { TerminalPanel } from '../../../components/ui/TerminalPanel';

interface CopilotMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function ResearchCoPilot() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      role: 'assistant',
      content:
        'I can help you navigate the research catalog — compound categories, research areas, and variant availability. I do not provide medical or dosing advice.',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const send = useCallback(async () => {
    const trimmed = question.trim();
    if (trimmed.length < 3 || loading) return;

    setError('');
    setLoading(true);
    const nextMessages: CopilotMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setQuestion('');

    try {
      const response = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          history: nextMessages.slice(-8),
        }),
      });
      const data = (await response.json()) as { reply?: string; error?: string };
      if (!response.ok || !data.reply) {
        setError(data.error ?? 'Co-Pilot unavailable');
        return;
      }
      setMessages((current) => [...current, { role: 'assistant', content: data.reply! }]);
    } catch {
      setError('Unable to reach the Co-Pilot.');
    } finally {
      setLoading(false);
    }
  }, [loading, messages, question]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 rounded-full border border-gold/30 bg-void/90 backdrop-blur px-4 py-3 text-[10px] tracking-caps uppercase text-gold-light shadow-lg hover:border-gold/60 transition-colors"
      >
        Research Co-Pilot
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/60">
          <TerminalPanel className="w-full max-w-lg max-h-[85vh] flex flex-col p-0 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div>
                <p className="text-[10px] tracking-caps uppercase text-muted">Phase 5 · Catalog assistant</p>
                <h2 className="text-sm text-primary font-light mt-1">Research Co-Pilot</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted hover:text-secondary text-xs tracking-caps uppercase"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`}>
                  {index > 0 ? <HeaderDividerBeam contained animated={false} className="mb-4" /> : null}
                  <p className="text-[10px] tracking-caps uppercase text-muted mb-1">
                    {message.role === 'user' ? 'You' : 'Co-Pilot'}
                  </p>
                  <p className="text-sm text-secondary font-light leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
              ))}
              {error && <p className="text-sm text-red-400/90">{error}</p>}
            </div>

            <div className="px-6 py-4 border-t border-white/[0.06] space-y-3">
              <Input
                label="Ask about catalog compounds"
                placeholder="Which peptides are used in metabolic pathway assays?"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void send();
                  }
                }}
              />
              <div className="flex items-center justify-between gap-3">
                <Link href="/catalog" className="text-[10px] tracking-caps uppercase text-muted hover:text-gold-light">
                  Browse catalog
                </Link>
                <Button type="button" disabled={loading} onClick={() => void send()} className="text-xs">
                  {loading ? 'Thinking…' : 'Ask Co-Pilot'}
                </Button>
              </div>
              <p className="text-[10px] text-muted font-light leading-relaxed">
                For laboratory research context only. Not medical advice.
              </p>
            </div>
          </TerminalPanel>
        </div>
      )}
    </>
  );
}
