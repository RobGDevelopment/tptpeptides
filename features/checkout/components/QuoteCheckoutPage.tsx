'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../../components/ui/Button';
import { PageHeader } from '../../../components/ui/PageHeader';
import { TerminalPanel } from '../../../components/ui/TerminalPanel';
import { SITE_WORDMARK } from '../../../lib/brand';
import { useAuth } from '../../auth/providers/AuthProvider';
import {
  checkoutTypedAttestationFormSchema,
  type CheckoutTypedAttestationFormValues,
} from '../../../lib/schemas/checkout';
import { CheckoutAttestationFields } from './CheckoutAttestationFields';
import { submitCheckoutAttestation } from '../utils/attestationClient';

export function QuoteCheckoutPage({
  typedAttestationEnabled = false,
}: {
  typedAttestationEnabled?: boolean;
}) {
  const searchParams = useSearchParams();
  const quoteId = searchParams.get('quoteId') ?? '';
  const cancelled = searchParams.get('cancelled') === '1';
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const typedForm = useForm({
    resolver: zodResolver(checkoutTypedAttestationFormSchema) as never,
    defaultValues: {
      email: user?.email ?? '',
      researchIntent: '',
      typedSignature: '',
      paymentMethod: 'card',
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = typedForm;

  useEffect(() => {
    if (!quoteId) {
      setError('Missing quote reference.');
    }
  }, [quoteId]);

  const startCheckout = async (values?: CheckoutTypedAttestationFormValues) => {
    setError('');
    setLoading(true);
    try {
      let attestationLogId: string | undefined;
      if (typedAttestationEnabled) {
        if (!values) {
          setError('Complete the research attestation before continuing.');
          return;
        }
        attestationLogId = await submitCheckoutAttestation({
          researchIntent: values.researchIntent,
          typedSignature: values.typedSignature,
        });
      }

      const response = await fetch('/api/checkout/from-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId,
          email: user?.email,
          ...(typedAttestationEnabled
            ? { attestationLogId }
            : { researchUseAcknowledged: true }),
          paymentMethod: 'card',
        }),
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        setError(data.error ?? 'Unable to start quote checkout.');
        return;
      }
      window.location.assign(data.url);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error ? checkoutError.message : 'Unable to start quote checkout.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!quoteId) {
    return (
      <main className="min-h-screen bg-void pt-28 pb-20 px-4">
        <p className="text-sm text-red-400/90">{error || 'Invalid quote link.'}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-void pt-28 pb-20">
      <div className="max-w-xl mx-auto px-4">
        <PageHeader wordmark={SITE_WORDMARK} title="Institutional Quote Checkout" align="left" />
        {cancelled && (
          <p className="text-sm text-secondary font-light mb-6">Checkout was cancelled. You can retry below.</p>
        )}
        <TerminalPanel className="p-8 space-y-6">
          <p className="text-sm text-secondary font-light leading-relaxed">
            Complete payment for quote <span className="text-primary">{quoteId}</span>. You must be signed in with
            the email address on the quote.
          </p>
          {!user && (
            <p className="text-xs text-amber-400/90">
              <Link href="/?auth=1" className="underline">
                Sign in
              </Link>{' '}
              with your institution email before continuing.
            </p>
          )}
          {typedAttestationEnabled && user && (
            <CheckoutAttestationFields register={register as never} errors={errors as never} />
          )}
          {error && <p className="text-sm text-red-400/90">{error}</p>}
          <Button
            type="button"
            disabled={loading || !user}
            onClick={
              typedAttestationEnabled
                ? handleSubmit((values) => void startCheckout(values as CheckoutTypedAttestationFormValues))
                : () => void startCheckout()
            }
          >
            {loading ? 'Redirecting to secure payment…' : 'Proceed to secure payment'}
          </Button>
        </TerminalPanel>
      </div>
    </main>
  );
}
