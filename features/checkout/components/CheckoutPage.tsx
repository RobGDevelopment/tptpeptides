'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { PageHeader } from '../../../components/ui/PageHeader';
import { TerminalPanel } from '../../../components/ui/TerminalPanel';
import { SITE_WORDMARK } from '../../../lib/brand';
import { useAuth } from '../../auth/providers/AuthProvider';
import { selectCartSubtotal, useCartStore } from '../../storefront/stores/useCartStore';
import { checkoutFormSchema, checkoutTypedAttestationFormSchema, type CheckoutFormValues, type CheckoutTypedAttestationFormValues } from '../../../lib/schemas/checkout';
import { estimateShipping } from '../../../lib/shipping/estimate';
import { CheckoutAttestationFields } from './CheckoutAttestationFields';
import { submitCheckoutAttestation } from '../utils/attestationClient';
import {
  dollarsFromPoints,
  LOYALTY_POINTS_PER_DOLLAR,
  maxRedeemablePoints,
} from '../../../lib/business/loyalty';

export function CheckoutPage({
  stripeTaxEnabled = false,
  netTermsEnabled = false,
  netTermsEligible = false,
  geoBlockEnabled = false,
  realShippingEnabled = false,
  loyaltyRedemptionEnabled = false,
  typedAttestationEnabled = false,
}: {
  stripeTaxEnabled?: boolean;
  netTermsEnabled?: boolean;
  netTermsEligible?: boolean;
  geoBlockEnabled?: boolean;
  realShippingEnabled?: boolean;
  loyaltyRedemptionEnabled?: boolean;
  typedAttestationEnabled?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore(selectCartSubtotal);

  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);

  const cancelled = searchParams.get('cancelled') === '1';
  const shipping = estimateShipping(items.length);
  const loyaltyDiscount = dollarsFromPoints(pointsToRedeem);
  const discountedSubtotal = Math.max(0, subtotal - loyaltyDiscount);
  const total = discountedSubtotal + shipping;
  const maxPoints = maxRedeemablePoints({ availablePoints: loyaltyPoints, subtotal });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(
      typedAttestationEnabled ? checkoutTypedAttestationFormSchema : checkoutFormSchema
    ) as never,
    defaultValues: typedAttestationEnabled
      ? {
          email: user?.email ?? '',
          researchIntent: '',
          typedSignature: '',
          poNumber: '',
          promoCode: '',
          paymentMethod: 'card',
          shippingState: '',
          shippingPostalCode: '',
        }
      : {
          email: user?.email ?? '',
          researchUseAcknowledged: false,
          poNumber: '',
          promoCode: '',
          paymentMethod: 'card',
          shippingState: '',
          shippingPostalCode: '',
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

  useEffect(() => {
    if (!user || !loyaltyRedemptionEnabled) {
      setLoyaltyPoints(0);
      setPointsToRedeem(0);
      return;
    }

    void (async () => {
      const response = await fetch('/api/account/loyalty');
      if (!response.ok) return;
      const data = (await response.json()) as { loyaltyPoints?: number; redemptionEnabled?: boolean };
      if (data.redemptionEnabled) {
        setLoyaltyPoints(data.loyaltyPoints ?? 0);
      }
    })();
  }, [loyaltyRedemptionEnabled, user]);

  useEffect(() => {
    if (pointsToRedeem > maxPoints) {
      setPointsToRedeem(maxPoints - (maxPoints % 10));
    }
  }, [maxPoints, pointsToRedeem]);

  const paymentMethod = watch('paymentMethod');
  const showNetTerms = netTermsEnabled && netTermsEligible && user;
  const showDestinationFields = geoBlockEnabled || realShippingEnabled;

  const onSubmit = async (values: CheckoutFormValues | CheckoutTypedAttestationFormValues) => {
    setSubmitError('');
    setIsSubmitting(true);

    const endpoint =
      values.paymentMethod === 'net_terms'
        ? '/api/checkout/create-invoice'
        : '/api/checkout/create-session';

    try {
      let attestationLogId: string | undefined;
      if (typedAttestationEnabled) {
        const typedValues = values as CheckoutTypedAttestationFormValues;
        attestationLogId = await submitCheckoutAttestation({
          researchIntent: typedValues.researchIntent,
          typedSignature: typedValues.typedSignature,
        });
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({ id: item.id, quantity: item.quantity })),
          email: user ? undefined : values.email,
          ...(typedAttestationEnabled
            ? { attestationLogId }
            : { researchUseAcknowledged: true as const }),
          poNumber: values.poNumber?.trim() || undefined,
          promoCode: values.promoCode?.trim() || undefined,
          paymentMethod: values.paymentMethod,
          shippingState: values.shippingState?.trim().toUpperCase() || undefined,
          shippingPostalCode: values.shippingPostalCode?.trim() || undefined,
          pointsToRedeem: pointsToRedeem > 0 ? pointsToRedeem : undefined,
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

          <form onSubmit={handleSubmit(onSubmit as never)} className="space-y-8">
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

            {showDestinationFields && (
              <div className="grid sm:grid-cols-2 gap-6">
                <Input
                  label="Ship-to state"
                  placeholder="TX"
                  maxLength={2}
                  {...register('shippingState')}
                />
                <Input
                  label="Ship-to postal code"
                  placeholder="78701"
                  {...register('shippingPostalCode')}
                />
              </div>
            )}
            {showDestinationFields && (
              <p className="text-xs text-muted -mt-4 font-light">
                {geoBlockEnabled
                  ? 'Compliance screening applies to your destination state.'
                  : 'Used to estimate carrier rates when live shipping is enabled.'}
                {user ? ' Saved portal address is used when fields are left blank.' : ''}
              </p>
            )}

            <Input
              label="Institutional promo code (optional)"
              placeholder="Applied on Stripe checkout"
              {...register('promoCode')}
            />
            <p className="text-xs text-muted -mt-4 font-light">
              Institutional codes are validated and pre-applied when you proceed to Stripe checkout.
            </p>

            {loyaltyRedemptionEnabled && user && loyaltyPoints >= 10 && (
              <div className="space-y-3 border-b border-white/[0.06] pb-6">
                <p className="text-[10px] tracking-caps uppercase text-muted">Loyalty points</p>
                <p className="text-sm text-secondary font-light">
                  {loyaltyPoints.toLocaleString()} points available · {LOYALTY_POINTS_PER_DOLLAR} pts = $1
                </p>
                <Input
                  label="Points to redeem (increments of 10)"
                  type="number"
                  min={0}
                  max={maxPoints}
                  step={10}
                  value={pointsToRedeem}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (Number.isNaN(next) || next < 0) {
                      setPointsToRedeem(0);
                      return;
                    }
                    setPointsToRedeem(Math.min(next, maxPoints));
                  }}
                />
                {pointsToRedeem > 0 && (
                  <p className="text-xs text-gold-light font-light">
                    −${loyaltyDiscount.toFixed(2)} catalog discount applied before payment
                  </p>
                )}
              </div>
            )}

            {showNetTerms && (
              <div className="space-y-3 border-b border-white/[0.06] pb-6">
                <p className="text-[10px] tracking-caps uppercase text-muted">Payment method</p>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="radio" value="card" className="mt-1 accent-gold" {...register('paymentMethod')} />
                  <span className="text-sm text-secondary font-light">
                    Pay now — secure card checkout via Stripe
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="radio" value="net_terms" className="mt-1 accent-gold" {...register('paymentMethod')} />
                  <span className="text-sm text-secondary font-light">
                    Net-30 invoice — Stripe sends a due-in-30-days invoice to your verified institution
                  </span>
                </label>
              </div>
            )}

            {stripeTaxEnabled && paymentMethod === 'card' && (
              <p className="text-xs text-muted font-light border-b border-white/[0.06] pb-4">
                Sales tax is calculated automatically at Stripe checkout based on your shipping address.
              </p>
            )}

            {typedAttestationEnabled ? (
              <CheckoutAttestationFields
                register={register as never}
                errors={errors as never}
              />
            ) : (
              <>
                <label className="flex items-start gap-3 cursor-pointer border-b border-white/[0.06] pb-6">
                  <input
                    type="checkbox"
                    className="mt-1 accent-gold"
                    {...register('researchUseAcknowledged' as never)}
                  />
                  <span className="text-sm text-secondary font-light leading-relaxed">
                    I confirm I am 21+ and purchasing these compounds strictly for in vitro / research
                    purposes, not for human or veterinary consumption.
                  </span>
                </label>
                {'researchUseAcknowledged' in errors && errors.researchUseAcknowledged && (
                  <p className="text-red-400/90 text-sm">
                    {(errors.researchUseAcknowledged as { message?: string }).message}
                  </p>
                )}
              </>
            )}

            {submitError && <p className="text-red-400/90 text-sm">{submitError}</p>}

            <Button type="submit" disabled={isSubmitting} className="text-sm">
              {isSubmitting
                ? paymentMethod === 'net_terms'
                  ? 'Creating Net-30 invoice'
                  : 'Redirecting to secure payment'
                : paymentMethod === 'net_terms'
                  ? 'Request Net-30 invoice'
                  : 'Proceed to secure payment'}
            </Button>
          </form>
        </section>

        <aside className="md:col-span-2">
          <TerminalPanel className="p-8 sticky top-28">
            <h2 className="text-[10px] tracking-caps uppercase text-muted mb-6">Order Summary</h2>
            <div className="space-y-4 mb-6">
              {items.map((item, index) => (
                <div key={item.id}>
                  {index > 0 ? <HeaderDividerBeam contained animated={false} className="mb-4" /> : null}
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
            <HeaderDividerBeam contained delay={1} animated={false} className="mb-4" />
            <div className="space-y-2 text-[10px] tracking-caps uppercase text-muted">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-secondary">${subtotal.toFixed(2)}</span>
              </div>
              {pointsToRedeem > 0 && (
                <div className="flex justify-between text-gold-light">
                  <span>Loyalty discount</span>
                  <span>−${loyaltyDiscount.toFixed(2)}</span>
                </div>
              )}
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
              Prices verified server-side at checkout.{' '}
              {paymentMethod === 'net_terms'
                ? 'Invoices are issued via Stripe with Net-30 terms.'
                : 'Payment processed securely by Stripe.'}
            </p>
          </TerminalPanel>
        </aside>
      </div>
    </main>
  );
}
