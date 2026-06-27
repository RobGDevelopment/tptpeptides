'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Icons } from '../../../components/icons';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { Spinner } from '../../../components/ui/Spinner';
import { TerminalPanel } from '../../../components/ui/TerminalPanel';
import { useCartStore } from '../../storefront/stores/useCartStore';

interface OrderConfirmation {
  orderId: string;
  total: number;
  email: string | null;
  loyaltyPointsAwarded: number;
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const clearCart = useCartStore((state) => state.clearCart);

  const [confirmation, setConfirmation] = useState<OrderConfirmation | null>(null);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(`/api/checkout/session?session_id=${encodeURIComponent(sessionId)}`);
        const data = (await response.json()) as OrderConfirmation & { error?: string };

        if (!response.ok || cancelled) {
          setFetchError(data.error ?? 'Unable to load order confirmation');
          return;
        }

        setConfirmation(data);
      } catch {
        if (!cancelled) setFetchError('Unable to load order confirmation');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="text-center space-y-6">
        <p className="text-red-400/90 text-sm">Missing payment session.</p>
        <Link href="/" className="terminal-link text-[10px]">
          Return to storefront
        </Link>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="text-center space-y-6">
        <p className="text-red-400/90 text-sm">{fetchError}</p>
        <Link href="/" className="terminal-link text-[10px]">
          Return to storefront
        </Link>
      </div>
    );
  }

  if (!confirmation) {
    return <Spinner label="Confirming your requisition..." className="py-16" />;
  }

  return (
    <div className="max-w-lg mx-auto text-center space-y-8">
      <div className="text-gold flex justify-center">
        <Icons.Check />
      </div>
      <div>
        <h1 className="text-3xl font-light text-primary tracking-title uppercase">Requisition Authorized</h1>
        <HeaderDividerBeam delay={1} />
        <p className="text-secondary font-light mt-3 text-sm">
          Payment received. A receipt has been sent to {confirmation.email ?? 'your email on file'}.
        </p>
      </div>

      <TerminalPanel className="p-8 text-left space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-[10px] tracking-caps uppercase text-muted">Order ID</span>
          <span className="font-mono tracking-widest uppercase text-secondary">{confirmation.orderId}</span>
        </div>
        <HeaderDividerBeam contained animated={false} />
        <div className="flex justify-between text-sm">
          <span className="text-[10px] tracking-caps uppercase text-muted">Total paid</span>
          <span className="metallic-gold font-medium">${confirmation.total.toFixed(2)}</span>
        </div>
        {confirmation.loyaltyPointsAwarded > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-[10px] tracking-caps uppercase text-muted">Loyalty points earned</span>
            <span className="text-gold-light">+{confirmation.loyaltyPointsAwarded}</span>
          </div>
        )}
      </TerminalPanel>

      <div className="flex flex-col sm:flex-row gap-6 justify-center">
        <Link href="/account" className="terminal-link text-[10px]">
          View Account
        </Link>
        <Link href="/" className="terminal-link text-[10px]">
          Continue Research
        </Link>
      </div>
    </div>
  );
}

export function CheckoutSuccessPage() {
  return (
    <main className="min-h-screen bg-void px-4 py-28">
      <Suspense fallback={<Spinner label="Loading..." className="py-16" />}>
        <CheckoutSuccessContent />
      </Suspense>
    </main>
  );
}
