import Link from 'next/link';
import type { ClinicPricingTier } from '../../../lib/schemas/clinicRevenue';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

type ClinicPricingSectionProps = {
  tiers: ClinicPricingTier[];
};

export function ClinicPricingSection({ tiers }: ClinicPricingSectionProps) {
  if (tiers.length === 0) {
    return null;
  }

  return (
    <section
      id="transparent-pricing"
      className="clinic-section clinic-section-muted"
      aria-labelledby="clinic-pricing-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="clinic-section-header">
          <p className="clinic-section-eyebrow">Transparent Pricing</p>
          <h2 id="clinic-pricing-heading" className="clinic-section-title">
            Membership tiers designed for discretion and clinical depth
          </h2>
          <p className="clinic-section-lead">
            Clear monthly pricing with physician-led oversight. Your initial fee covers the medical
            consultation and secure intake review — eligibility and clinical fit are confirmed before
            ongoing membership billing begins.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {tiers.map((tier) => (
            <article key={tier.id} className="clinic-premium-card flex flex-col">
              <h3 className="clinic-premium-card-title">{tier.name}</h3>
              {tier.description ? (
                <p className="clinic-premium-card-body flex-1">{tier.description}</p>
              ) : (
                <div className="flex-1" />
              )}
              <p className="mt-6 text-3xl font-light tracking-title text-heading">
                {currency.format(tier.monthlyPrice)}
                <span className="text-sm text-muted font-normal tracking-normal"> / month</span>
              </p>
              <Link href="/intake" className="clinic-cta-primary clinic-cta-luxe mt-6 text-center">
                Begin Private Intake
              </Link>
            </article>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted font-light max-w-2xl mx-auto">
          The listed monthly rate reflects ongoing membership after your initial consultation fee.
          Telehealth services comply with applicable state licensure and 2026 federal telehealth
          regulations. Labs, medications, and third-party services may be billed separately when
          clinically indicated.
        </p>
      </div>
    </section>
  );
}
