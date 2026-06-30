import { Icons } from '../../../components/icons';

const TRUST_ITEMS = [
  'HIPAA Compliant',
  'Board-Certified Physicians',
  'Licensed Telehealth',
  'Evidence-Based Protocols',
  'Secure Patient Portal',
] as const;

export function ClinicTrustMarquee() {
  const items = [...TRUST_ITEMS, ...TRUST_ITEMS];

  return (
    <section aria-label="Clinical credentials" className="clinic-trust-marquee border-y border-black/[0.06] bg-void/60">
      <div className="clinic-trust-marquee-track">
        {items.map((item, index) => (
          <span key={`${item}-${index}`} className="clinic-trust-marquee-item">
            <span className="text-[var(--theme-accent)] opacity-90">
              <Icons.Check />
            </span>
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
