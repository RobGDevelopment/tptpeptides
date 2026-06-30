import 'server-only';

export interface VercelDomainResult {
  name: string;
  verified: boolean;
  verification?: Array<{ type: string; domain: string; value: string; reason?: string }>;
}

export function isVercelDomainsConfigured(): boolean {
  const token = process.env.VERCEL_API_TOKEN?.trim() || process.env.VERCEL_TOKEN?.trim();
  return Boolean(token && process.env.VERCEL_PROJECT_ID?.trim());
}

function vercelToken(): string {
  const token =
    process.env.VERCEL_API_TOKEN?.trim() || process.env.VERCEL_TOKEN?.trim();
  if (!token) {
    throw new Error('VERCEL_API_TOKEN or VERCEL_TOKEN is not configured');
  }
  return token;
}

function vercelProjectId(): string {
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  if (!projectId) throw new Error('VERCEL_PROJECT_ID is not configured');
  return projectId;
}

function vercelTeamQuery(): string {
  const teamId = process.env.VERCEL_TEAM_ID?.trim();
  return teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
}

export async function addProjectDomain(domain: string): Promise<VercelDomainResult> {
  const normalized = domain.trim().toLowerCase();
  const response = await fetch(
    `https://api.vercel.com/v10/projects/${vercelProjectId()}/domains${vercelTeamQuery()}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${vercelToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: normalized }),
      cache: 'no-store',
    }
  );

  const payload = (await response.json()) as VercelDomainResult & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Vercel domain API failed (${response.status})`);
  }

  return payload;
}

export async function getProjectDomain(domain: string): Promise<VercelDomainResult | null> {
  const normalized = domain.trim().toLowerCase();
  const response = await fetch(
    `https://api.vercel.com/v9/projects/${vercelProjectId()}/domains/${encodeURIComponent(normalized)}${vercelTeamQuery()}`,
    {
      headers: { Authorization: `Bearer ${vercelToken()}` },
      cache: 'no-store',
    }
  );

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Vercel domain lookup failed (${response.status})`);
  }

  return (await response.json()) as VercelDomainResult;
}

export async function removeProjectDomain(domain: string): Promise<void> {
  const normalized = domain.trim().toLowerCase();
  const response = await fetch(
    `https://api.vercel.com/v9/projects/${vercelProjectId()}/domains/${encodeURIComponent(normalized)}${vercelTeamQuery()}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${vercelToken()}` },
      cache: 'no-store',
    }
  );

  if (!response.ok && response.status !== 404) {
    throw new Error(`Vercel domain delete failed (${response.status})`);
  }
}
