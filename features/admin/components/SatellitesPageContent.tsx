'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../../../lib/admin/adminFetch.client';
import { AdminPageHeader } from '../../../components/ui/AdminPageHeader';
import { Button } from '../../../components/ui/Button';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { Input } from '../../../components/ui/Input';
import { Spinner } from '../../../components/ui/Spinner';

type PaymentRail = 'seamlesschex' | 'payram';

interface SatelliteRow {
  slug: string;
  name: string;
  domains: string[];
  lane: string;
  active: boolean;
  payment?: {
    primaryProvider?: string;
    rail?: string;
    useStripeUntilCutover?: boolean;
  };
  theme?: {
    primaryColor?: string;
    accentColor?: string;
    logoUrl?: string;
    fontFamily?: string;
  };
  content?: {
    heroHeadline?: string;
    supportEmail?: string;
    termsUrl?: string;
  };
  updatedAt?: string;
}

interface ProvisionResult {
  tenant?: SatelliteRow;
  dnsInstructions?: Array<{ type: string; host: string; value: string }>;
  error?: string;
}

const PAYMENT_RAILS: { id: PaymentRail; label: string; description: string }[] = [
  { id: 'seamlesschex', label: 'SeamlessChex ACH', description: 'B2C eCheck / ACH rail' },
  { id: 'payram', label: 'PayRam Crypto', description: 'USDC / USDT / BTC self-hosted' },
];

export function SatellitesPageContent() {
  const [domain, setDomain] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [name, setName] = useState('');
  const [primaryProvider, setPrimaryProvider] = useState<PaymentRail>('seamlesschex');
  const [primaryColor, setPrimaryColor] = useState('#c9a962');
  const [accentColor, setAccentColor] = useState('#e8d5a3');
  const [logoUrl, setLogoUrl] = useState('');
  const [fontFamily, setFontFamily] = useState('');
  const [heroHeadline, setHeroHeadline] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [termsUrl, setTermsUrl] = useState('');
  const [satellites, setSatellites] = useState<SatelliteRow[]>([]);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [dnsInstructions, setDnsInstructions] = useState<
    ProvisionResult['dnsInstructions']
  >([]);

  const load = useCallback(async () => {
    setError('');
    const response = await adminFetch('/api/admin/satellites');
    if (response.status === 404) {
      setLoading(false);
      setError('Enable isSatelliteProvisioningEnabled in Module Control Center.');
      return;
    }
    if (!response.ok) {
      setError('Unable to load satellite fleet.');
      setLoading(false);
      return;
    }
    const data = (await response.json()) as {
      satellites?: SatelliteRow[];
      configured?: boolean;
    };
    setSatellites(data.satellites ?? []);
    setConfigured(Boolean(data.configured));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const deploy = async () => {
    setDeploying(true);
    setError('');
    setMessage('');
    setDnsInstructions([]);
    try {
      const themePayload =
        primaryColor || accentColor || logoUrl.trim() || fontFamily.trim()
          ? {
              ...(primaryColor ? { primaryColor } : {}),
              ...(accentColor ? { accentColor } : {}),
              ...(logoUrl.trim() ? { logoUrl: logoUrl.trim() } : {}),
              ...(fontFamily.trim() ? { fontFamily: fontFamily.trim() } : {}),
            }
          : undefined;

      const contentPayload =
        heroHeadline.trim() || supportEmail.trim() || termsUrl.trim()
          ? {
              ...(heroHeadline.trim() ? { heroHeadline: heroHeadline.trim() } : {}),
              ...(supportEmail.trim() ? { supportEmail: supportEmail.trim() } : {}),
              ...(termsUrl.trim() ? { termsUrl: termsUrl.trim() } : {}),
            }
          : undefined;

      const response = await adminFetch('/api/admin/satellites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: domain.trim(),
          tenantSlug: tenantSlug.trim() || undefined,
          name: name.trim() || undefined,
          primaryProvider,
          theme: themePayload,
          content: contentPayload,
        }),
      });
      const data = (await response.json()) as ProvisionResult;
      if (!response.ok) {
        setError(data.error ?? 'Deploy failed');
        return;
      }
      setMessage(`Satellite deployed — tenant ${data.tenant?.slug ?? 'created'}`);
      setDnsInstructions(data.dnsInstructions ?? []);
      setDomain('');
      setTenantSlug('');
      setName('');
      setLogoUrl('');
      setFontFamily('');
      setHeroHeadline('');
      setSupportEmail('');
      setTermsUrl('');
      await load();
    } catch {
      setError('Deploy failed');
    } finally {
      setDeploying(false);
    }
  };

  if (loading) {
    return <Spinner label="Loading satellite fleet..." className="py-20" />;
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Satellite Provisioning"
        subtitle="Deploy B2C burner domains via Vercel and bootstrap tenant_config with ring-fenced payment rails."
        beamDelay={2}
      />

      {!configured && (
        <p className="admin-banner text-amber-400/90">
          VERCEL_TOKEN and VERCEL_PROJECT_ID are not configured — domain attach will fail until set.
        </p>
      )}
      {error && <p className="admin-banner text-red-400/90">{error}</p>}
      {message && <p className="admin-banner text-gold-light">{message}</p>}

      <section className="admin-table-section">
        <div className="p-6 border-b border-white/[0.04] space-y-3">
          <h2 className="text-sm tracking-caps uppercase text-heading font-medium">Deploy Satellite</h2>
          <HeaderDividerBeam delay={2} />
          <p className="text-sm text-secondary font-light">
            Attaches domain to Vercel, creates B2C tenant_config, and wires the selected alternative payment rail.
          </p>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Domain name"
              placeholder="retail-example.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
            <Input
              label="Display name (optional)"
              placeholder="Retail Satellite"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="Tenant slug (optional)"
              placeholder="b2c-retail-example"
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <p className="text-[10px] tracking-caps uppercase text-muted">Alternative payment rail</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/[0.04]">
              {PAYMENT_RAILS.map((rail) => {
                const selected = primaryProvider === rail.id;
                return (
                  <button
                    key={rail.id}
                    type="button"
                    onClick={() => setPrimaryProvider(rail.id)}
                    className={`text-left p-4 bg-void transition-colors duration-200 ${
                      selected
                        ? 'ring-1 ring-gold/30 bg-white/[0.03]'
                        : 'hover:bg-white/[0.02] hover:text-secondary text-muted'
                    }`}
                  >
                    <p className={`text-sm font-light ${selected ? 'text-gold-light' : 'text-primary'}`}>
                      {rail.label}
                    </p>
                    <p className="text-xs text-secondary font-light mt-1">{rail.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4 border-t border-white/[0.06] pt-6">
            <div>
              <h3 className="text-sm tracking-caps uppercase text-heading font-medium">Design & Branding</h3>
              <p className="text-xs text-secondary font-light mt-2">
                Satellite theme tokens inject CSS variables on the storefront — B2B Falconwood defaults apply when left blank.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="block space-y-2">
                <span className="text-[10px] tracking-caps uppercase text-muted">Primary hex</span>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-12 cursor-pointer rounded border border-white/[0.08] bg-transparent"
                    aria-label="Primary brand color"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#c9a962"
                    className="terminal-input flex-1 font-mono text-xs"
                  />
                </div>
              </label>
              <label className="block space-y-2">
                <span className="text-[10px] tracking-caps uppercase text-muted">Accent hex</span>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-10 w-12 cursor-pointer rounded border border-white/[0.08] bg-transparent"
                    aria-label="Accent brand color"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    placeholder="#e8d5a3"
                    className="terminal-input flex-1 font-mono text-xs"
                  />
                </div>
              </label>
              <Input
                label="Logo image URL"
                placeholder="https://cdn.example.com/satellite-logo.svg"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
              />
              <Input
                label="Font family (optional)"
                placeholder="Inter, system-ui, sans-serif"
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
              />
            </div>
            <div
              className="rounded border border-white/[0.06] p-4 flex items-center gap-4"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}22, transparent)`,
                borderColor: `${primaryColor}44`,
              }}
            >
              <div
                className="h-10 w-10 rounded-full border border-white/10"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}
                aria-hidden
              />
              <div>
                <p className="text-[10px] tracking-caps uppercase text-muted">Theme preview</p>
                <p className="text-sm font-light mt-1" style={{ color: accentColor }}>
                  Satellite accent sample
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t border-white/[0.06] pt-6">
            <div>
              <h3 className="text-sm tracking-caps uppercase text-heading font-medium">
                Content & Compliance (Lexical Isolation)
              </h3>
              <p className="text-xs text-secondary font-light mt-2">
                Override storefront copy and legal links so B2C satellites remain lexically isolated from the B2B hub.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Storefront hero headline"
                placeholder="Premium research peptides for qualified buyers"
                value={heroHeadline}
                onChange={(e) => setHeroHeadline(e.target.value)}
              />
              <Input
                label="Dedicated support email"
                type="email"
                placeholder="support@retail-example.com"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
              />
              <div className="md:col-span-2">
                <Input
                  label="Terms of Service URL"
                  placeholder="/terms or https://retail-example.com/legal/terms"
                  value={termsUrl}
                  onChange={(e) => setTermsUrl(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Button type="button" disabled={deploying || !domain.trim()} onClick={() => void deploy()}>
            {deploying ? 'Deploying…' : 'Deploy Satellite'}
          </Button>

          {dnsInstructions && dnsInstructions.length > 0 && (
            <div className="border-t border-white/[0.06] pt-6 space-y-2">
              <p className="text-[10px] tracking-caps uppercase text-muted">DNS instructions</p>
              {dnsInstructions.map((record) => (
                <p key={`${record.type}-${record.host}`} className="font-mono text-xs text-secondary">
                  {record.type} {record.host} → {record.value}
                </p>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="admin-table-section">
        <div className="p-6 border-b border-white/[0.04] space-y-3">
          <h2 className="text-sm tracking-caps uppercase text-heading font-medium">Active Satellites</h2>
          <HeaderDividerBeam delay={3} />
        </div>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Domain</th>
                <th>Payment rail</th>
                <th>Theme</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {satellites.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-10">
                    No B2C satellites provisioned yet.
                  </td>
                </tr>
              ) : (
                satellites.map((satellite) => (
                  <tr key={satellite.slug}>
                    <td>
                      <div className="text-primary">{satellite.name}</div>
                      <div className="text-xs text-muted font-mono">{satellite.slug}</div>
                    </td>
                    <td className="text-secondary">{satellite.domains.join(', ') || '—'}</td>
                    <td className="text-secondary capitalize">
                      {satellite.payment?.primaryProvider ?? '—'}
                      <span className="block text-xs text-muted">{satellite.payment?.rail ?? ''}</span>
                    </td>
                    <td>
                      {satellite.theme?.primaryColor ? (
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-3 w-3 rounded-full border border-white/10"
                            style={{ backgroundColor: satellite.theme.primaryColor }}
                            aria-hidden
                          />
                          <span className="font-mono text-[10px] text-muted">
                            {satellite.theme.primaryColor}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted">Falconwood default</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`text-[10px] tracking-caps uppercase ${
                          satellite.active ? 'text-gold-light' : 'text-muted'
                        }`}
                      >
                        {satellite.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-muted text-xs">
                      {satellite.updatedAt
                        ? new Date(satellite.updatedAt).toLocaleString()
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
