'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { MetallicBeam } from '../../../components/ui/MetallicBeam';
import { PageHeader } from '../../../components/ui/PageHeader';
import { TerminalPanel } from '../../../components/ui/TerminalPanel';
import { SITE_WORDMARK } from '../../../lib/brand';
import { useAuth } from '../../auth/providers/AuthProvider';
import { selectCartSubtotal, useCartStore } from '../../storefront/stores/useCartStore';
import { checkoutFormSchema, type CheckoutFormValues } from '../../../lib/schemas/checkout';
import { estimateShipping } from '../../../lib/shipping/estimate';

export function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore(selectCartSubtotal);

  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  const cancelled = searchParams.get('cancelled') === '1';
  const shipping = estimateShipping(items.length);
  const total = subtotal + shipping;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      email: user?.email ?? '',
      researchUseAcknowledged: false,
      poNumber: '',
      promoCode: '',
    },
  });

  useEffect(() => {
    if (items.length === 0) {
      router.replace('/');
    }
  }, [items.length, router]);

  useEffect(() => {
    if (redirectUrl) {
      window.location.assign(redirectUrl);
    }
  }, [redirectUrl]);

  const onSubmit = async (values: CheckoutFormValues) => {
    setSubmitError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({ id: item.id, quantity: item.quantity })),
          email: user ? undefined : values.email,
          researchUseAcknowledged: values.researchUseAcknowledged,
          poNumber: values.poNumber?.trim() || undefined,
          promoCode: values.promoCode?.trim() || undefined,
        }),
      });

      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        setSubmitError(data.error ?? 'Unable to start checkout');
        return;
      }

      setRedirectUrl(data.url);
    } catch {
      setSubmitError('Unable to start checkout. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <main className="min-h-screen bg-void pt-28 pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8 grid md:grid-cols-5 gap-12">
        <section className="md:col-span-3 space-y-8">
          <PageHeader
            wordmark={SITE_WORDMARK}
            title="Lab Requisition"
            subtitle="Checkout · Research Use Only"
            align="left"
          />

          {cancelled && (
            <p className="text-sm text-secondary font-light border-b border-white/[0.06] pb-4">
              Checkout was cancelled. Your cart is still available.
            </p>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {!user ? (
              <Input
                label="Email for order confirmation"
                type="email"
                autoComplete="email"
                {...register('email')}
              />
            ) : (
              <input type="hidden" {...register('email', { value: user.email ?? '' })} />
            )}
            {errors.email && <p className="text-red-400/90 text-sm">{errors.email.message}</p>}

            {user && (
              <div className="border-b border-white/[0.06] pb-4">
                <p className="text-[10px] tracking-caps uppercase text-muted mb-1">Signed in as</p>
                <p className="text-sm text-primary font-light">{user.email}</p>
              </div>
            )}

            <Input label="PO / Requisition number (optional)" placeholder="INST-2026-0042" {...register('poNumber')} />

            <Input
              label="Institutional promo code (optional)"
              placeholder="Applied on Stripe checkout"
              {...register('promoCode')}
            />
            <p className="text-xs text-muted -mt-4 font-light">
              Promo codes are validated securely on the Stripe payment page.
            </p>

            <label className="flex items-start gap-3 cursor-pointer border-b border-white/[0.06] pb-6">
              <input
                type="checkbox"
                className="mt-1 accent-gold"
                {...register('researchUseAcknowledged')}
              />
              <span className="text-sm text-secondary font-light leading-relaxed">
                I confirm I am 21+ and purchasing these compounds strictly for in vitro / research
                purposes, not for human or veterinary consumption.
              </span>
            </label>
            {errors.researchUseAcknowledged && (
              <p className="text-red-400/90 text-sm">{errors.researchUseAcknowledged.message}</p>
            )}

            {submitError && <p className="text-red-400/90 text-sm">{submitError}</p>}

            <Button type="submit" disabled={isSubmitting} className="text-sm">
              {isSubmitting ? 'Redirecting to secure payment' : 'Proceed to secure payment'}
            </Button>
          </form>
        </section>

        <aside className="md:col-span-2">
          <TerminalPanel className="p-8 sticky top-28">
            <h2 className="text-[10px] tracking-caps uppercase text-muted mb-6">Order Summary</h2>
            <div className="space-y-4 mb-6">
              {items.map((item, index) => (
                <div key={item.id}>
                  {index > 0 ? <MetallicBeam variant="horizontal" className="mb-4" animated={false} /> : null}
                  <div className="flex justify-between text-sm gap-4">
                    <Link
                      href={`/catalog/${item.slug}`}
                      className="text-secondary hover:text-gold-light transition-colors font-light"
                    >
                      {item.name} <span className="text-muted">×{item.quantity}</span>
                    </Link>
                    <span className="text-primary font-light">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
            <MetallicBeam variant="horizontal" className="mb-4" animated={false} />
            <div className="space-y-2 text-[10px] tracking-caps uppercase text-muted">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-secondary">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Est. shipping + cold chain</span>
                <span className="text-secondary">${shipping.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex justify-between pt-4 mt-4 border-t border-white/[0.06]">
              <span className="text-[10px] tracking-caps uppercase text-muted">Estimated total</span>
              <span className="metallic-gold font-medium">${total.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted mt-6 font-light">
              Prices verified server-side at checkout. Payment processed securely by Stripe.
            </p>
          </TerminalPanel>
        </aside>
      </div>
    </main>
  );
}
