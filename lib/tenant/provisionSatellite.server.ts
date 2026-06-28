import 'server-only';

import { getAdminFirestore } from '../firebase/admin';
import { tenantConfigSchema, type TenantConfig } from '../schemas/tenant';
import { satelliteProvisionRequestSchema } from '../schemas/opsException';
import { addProjectDomain, getProjectDomain, isVercelDomainsConfigured } from '../vercel/domains.server';

function slugifyDomain(domain: string): string {
  return domain.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
}

export async function provisionSatelliteTenant(input: {
  domain: string;
  tenantSlug?: string;
  name?: string;
  primaryProvider?: 'seamlesschex' | 'payram';
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
}) {
  const parsed = satelliteProvisionRequestSchema.parse(input);
  const domain = parsed.domain.trim().toLowerCase();
  const slug = parsed.tenantSlug?.trim() || `b2c-${slugifyDomain(domain)}`;
  const primaryProvider = parsed.primaryProvider ?? 'seamlesschex';
  const rail = primaryProvider === 'payram' ? 'b2c_crypto' : 'b2c_ach';

  if (!isVercelDomainsConfigured()) {
    throw new Error('Vercel domain provisioning is not configured');
  }

  const vercelDomain = await addProjectDomain(domain);
  const now = new Date().toISOString();

  const tenant = tenantConfigSchema.parse({
    slug,
    name: parsed.name?.trim() || `Satellite ${domain}`,
    lane: 'b2c',
    domains: [domain],
    payment: {
      primaryProvider,
      useStripeUntilCutover: true,
      rail,
    },
    ...(parsed.theme ? { theme: parsed.theme } : {}),
    ...(parsed.content ? { content: parsed.content } : {}),
    active: true,
    createdAt: now,
    updatedAt: now,
  });

  await getAdminFirestore().collection('tenant_config').doc(slug).set(tenant, { merge: true });

  return {
    tenant,
    vercelDomain,
    dnsInstructions:
      vercelDomain.verification?.map((record) => ({
        type: record.type,
        host: record.domain,
        value: record.value,
      })) ?? [],
  };
}

export async function getSatelliteDomainStatus(domain: string) {
  if (!isVercelDomainsConfigured()) {
    throw new Error('Vercel domain provisioning is not configured');
  }

  return getProjectDomain(domain);
}

/** Lists B2C satellite tenants from tenant_config. */
export async function listSatelliteTenants(): Promise<TenantConfig[]> {
  const snap = await getAdminFirestore().collection('tenant_config').get();
  const tenants: TenantConfig[] = [];

  for (const doc of snap.docs) {
    const parsed = tenantConfigSchema.safeParse(doc.data());
    if (parsed.success && parsed.data.lane === 'b2c') {
      tenants.push(parsed.data);
    }
  }

  return tenants.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
}
