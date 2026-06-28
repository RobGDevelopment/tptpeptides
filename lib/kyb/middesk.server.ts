import 'server-only';

import { z } from 'zod';

const MIDDESK_API_BASE =
  process.env.MIDDESK_API_BASE?.trim() || 'https://api.middesk.com/v1';

const middeskTaskSchema = z.object({
  category: z.string().optional(),
  status: z.string().optional(),
  message: z.string().optional(),
  label: z.string().optional(),
});

const middeskRegistrationSchema = z.object({
  status: z.string().optional(),
  state: z.string().optional(),
  entity_type: z.string().optional(),
  sub_status: z.string().optional(),
});

const middeskTinSchema = z.object({
  tin: z.string().optional(),
  tin_type: z.string().optional(),
  verified: z.boolean().optional(),
  mismatch: z.boolean().optional(),
  unknown: z.boolean().optional(),
  issued: z.boolean().optional(),
  error: z.string().nullable().optional(),
});

const middeskBusinessSchema = z.object({
  id: z.string(),
  status: z.string().optional(),
  name: z.string().optional(),
  review: z
    .object({
      tasks: z.array(middeskTaskSchema).optional(),
    })
    .optional(),
  registrations: z.array(middeskRegistrationSchema).optional(),
  tin: middeskTinSchema.optional(),
});

export type MiddeskRecommendation = 'approve' | 'review' | 'reject' | 'pending';

export interface MiddeskVerificationResult {
  businessId: string;
  status: string;
  fetchedAt: string;
  registrationStatus: string | null;
  registrationState: string | null;
  taxClassification: string | null;
  tinMatch: 'matched' | 'unmatched' | 'unknown' | 'pending';
  recommendation: MiddeskRecommendation;
  tasks: Array<{ category: string; status: string; message?: string }>;
}

export class MiddeskError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MiddeskError';
  }
}

export function isMiddeskConfigured(): boolean {
  return Boolean(process.env.MIDDESK_API_KEY?.trim());
}

function normalizeEin(value: string): string {
  return value.replace(/\D/g, '');
}

function authHeader(): string {
  const apiKey = process.env.MIDDESK_API_KEY?.trim();
  if (!apiKey) {
    throw new MiddeskError('MIDDESK_API_KEY is not configured.');
  }
  const encoded = Buffer.from(`${apiKey}:`).toString('base64');
  return `Basic ${encoded}`;
}

async function middeskFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${MIDDESK_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = { raw: text };
    }
  }

  if (!response.ok) {
    const message =
      typeof payload === 'object' &&
      payload != null &&
      'message' in payload &&
      typeof (payload as { message: unknown }).message === 'string'
        ? (payload as { message: string }).message
        : `Middesk request failed (${response.status})`;
    throw new MiddeskError(message);
  }

  return payload as T;
}

function parseTinMatch(tin: z.infer<typeof middeskTinSchema> | undefined): MiddeskVerificationResult['tinMatch'] {
  if (!tin) return 'pending';
  if (tin.verified === true && tin.mismatch !== true) return 'matched';
  if (tin.mismatch === true) return 'unmatched';
  if (tin.unknown === true) return 'unknown';
  return 'pending';
}

function parseRegistrationStatus(
  registrations: z.infer<typeof middeskRegistrationSchema>[] | undefined
): { status: string | null; state: string | null } {
  if (!registrations?.length) return { status: null, state: null };
  const active =
    registrations.find((row) => (row.status ?? '').toLowerCase() === 'active') ?? registrations[0];
  return {
    status: active?.status ?? null,
    state: active?.state ?? null,
  };
}

function deriveRecommendation(params: {
  businessStatus: string | undefined;
  tinMatch: MiddeskVerificationResult['tinMatch'];
  registrationStatus: string | null;
  tasks: Array<{ category: string; status: string; message?: string }>;
}): MiddeskRecommendation {
  const normalizedStatus = (params.businessStatus ?? '').toLowerCase();
  if (['pending', 'open', 'in_review', 'processing'].includes(normalizedStatus)) {
    return 'pending';
  }

  const failedTask = params.tasks.find((task) => {
    const status = task.status.toLowerCase();
    return status === 'failure' || status === 'failed' || status === 'reject';
  });
  if (failedTask) return 'reject';

  const reg = (params.registrationStatus ?? '').toLowerCase();
  const inactiveRegistration =
    reg.length > 0 && !['active', 'good standing', 'good_standing', 'in good standing'].includes(reg);

  if (params.tinMatch === 'unmatched' || inactiveRegistration) {
    return 'review';
  }

  if (params.tinMatch === 'matched' && (reg === 'active' || reg === '')) {
    return 'approve';
  }

  return 'review';
}

function mapBusinessResponse(raw: unknown): MiddeskVerificationResult {
  const parsed = middeskBusinessSchema.safeParse(raw);
  if (!parsed.success) {
    throw new MiddeskError('Unexpected Middesk business response shape.');
  }

  const business = parsed.data;
  const tasks =
    business.review?.tasks?.map((task) => ({
      category: task.category ?? task.label ?? 'review',
      status: task.status ?? 'unknown',
      message: task.message,
    })) ?? [];

  const { status: registrationStatus, state: registrationState } = parseRegistrationStatus(
    business.registrations
  );
  const tinMatch = parseTinMatch(business.tin);

  return {
    businessId: business.id,
    status: business.status ?? 'unknown',
    fetchedAt: new Date().toISOString(),
    registrationStatus,
    registrationState,
    taxClassification: business.tin?.tin_type ?? null,
    tinMatch,
    recommendation: deriveRecommendation({
      businessStatus: business.status,
      tinMatch,
      registrationStatus,
      tasks,
    }),
    tasks,
  };
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function retrieveBusiness(businessId: string): Promise<MiddeskVerificationResult> {
  const raw = await middeskFetch<unknown>(`/businesses/${businessId}`, { method: 'GET' });
  return mapBusinessResponse(raw);
}

async function pollBusinessResult(
  businessId: string,
  attempts = 8,
  delayMs = 1500
): Promise<MiddeskVerificationResult> {
  let last: MiddeskVerificationResult | null = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    last = await retrieveBusiness(businessId);
    if (last.recommendation !== 'pending') {
      return last;
    }
    if (attempt < attempts - 1) {
      await sleep(delayMs);
    }
  }

  return last ?? (await retrieveBusiness(businessId));
}

export async function verifyBusinessWithMiddesk(params: {
  institutionName: string;
  einTaxId: string;
  externalId: string;
  addressLine?: string | null;
}): Promise<MiddeskVerificationResult> {
  if (!isMiddeskConfigured()) {
    throw new MiddeskError('Middesk is not configured.');
  }

  const ein = normalizeEin(params.einTaxId);
  if (ein.length < 9) {
    throw new MiddeskError('EIN must contain at least 9 digits for Middesk verification.');
  }

  const address =
    params.addressLine?.trim() ||
    `${params.institutionName.trim()}, United States`;

  const created = await middeskFetch<{ id?: string }>('/businesses', {
    method: 'POST',
    body: JSON.stringify({
      name: params.institutionName.trim(),
      tin: { tin: ein },
      addresses: [{ full_address: address }],
      unique_external_id: params.externalId,
      orders: [{ product: 'tin' }, { product: 'business_verification' }],
    }),
  });

  if (!created.id) {
    throw new MiddeskError('Middesk did not return a business id.');
  }

  return pollBusinessResult(created.id);
}
