import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { ConnectionTestResult, ResolvedIntegration } from '../types';

const DEFAULT_GRAPHQL_URL = 'https://api-us.fullscript.com/graphql';

export type FullscriptWebhookVerificationInput = {
  rawBody: string;
  headers: Headers | Record<string, string | null | undefined>;
  signingSecret: string;
};

export type FullscriptWebhookEvent = {
  eventType: string;
  orderId: string;
  patientExternalId: string | null;
  patientEmail: string | null;
  status: string;
  resultsUrl: string | null;
  title: string;
  rawPayload: Record<string, unknown>;
};

function headerValue(
  headers: FullscriptWebhookVerificationInput['headers'],
  name: string
): string | null {
  if (headers instanceof Headers) {
    return headers.get(name);
  }
  return headers[name] ?? headers[name.toLowerCase()] ?? null;
}

function resolveGraphqlUrl(resolved: ResolvedIntegration | null): string {
  const fromConfig = resolved?.publicConfig.baseUrl?.trim().replace(/\/$/, '');
  if (fromConfig) {
    return fromConfig.endsWith('/graphql') ? fromConfig : `${fromConfig}/graphql`;
  }

  const fromEnv = process.env.FULLSCRIPT_API_BASE?.trim().replace(/\/$/, '');
  if (fromEnv) {
    return fromEnv.endsWith('/graphql') ? fromEnv : `${fromEnv}/graphql`;
  }

  return DEFAULT_GRAPHQL_URL;
}

function resolveApiKey(resolved: ResolvedIntegration | null): string | null {
  return (
    resolved?.secrets.apiKey?.trim() ??
    process.env.FULLSCRIPT_API_KEY?.trim() ??
    null
  );
}

export function resolveFullscriptWebhookSigningSecret(
  resolved: ResolvedIntegration | null
): string | null {
  return (
    resolved?.secrets.webhookSigningSecret?.trim() ??
    resolved?.secrets.webhookSecret?.trim() ??
    process.env.FULLSCRIPT_WEBHOOK_SIGNING_SECRET?.trim() ??
    null
  );
}

export function verifyFullscriptWebhookSignature(
  input: FullscriptWebhookVerificationInput
): boolean {
  const signature =
    headerValue(input.headers, 'x-fullscript-signature') ??
    headerValue(input.headers, 'x-hub-signature-256') ??
    headerValue(input.headers, 'signature');

  if (!signature?.trim() || !input.signingSecret.trim()) {
    return false;
  }

  const digest = createHmac('sha256', input.signingSecret.trim())
    .update(input.rawBody)
    .digest('hex');

  const provided = signature.trim().replace(/^sha256=/i, '');

  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(provided));
  } catch {
    return digest === provided;
  }
}

export async function testFullscriptGraphqlConnection(
  resolved: ResolvedIntegration
): Promise<ConnectionTestResult> {
  const apiKey = resolveApiKey(resolved);
  if (!apiKey) {
    return { ok: false, error: 'Fullscript API key is required.' };
  }

  const graphqlUrl = resolveGraphqlUrl(resolved);

  try {
    const response = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: '{ __typename }' }),
      cache: 'no-store',
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `Fullscript GraphQL health check failed (${response.status}).`,
      };
    }

    const payload = (await response.json()) as { data?: { __typename?: string }; errors?: unknown[] };
    if (payload.errors?.length) {
      return { ok: false, error: 'Fullscript GraphQL returned errors for the health query.' };
    }

    return {
      ok: true,
      detail: `Fullscript GraphQL reachable (${payload.data?.__typename ?? 'ok'}).`,
    };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Network error';
    return { ok: false, error: `Fullscript connection failed: ${message}` };
  }
}

function readString(source: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

export function parseFullscriptWebhookPayload(rawBody: string): FullscriptWebhookEvent | null {
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return null;
  }

  const eventType = readString(payload, 'event', 'event_type', 'type') ?? '';
  if (!eventType.toLowerCase().includes('lab')) {
    return null;
  }

  const data = (payload.data ?? payload.payload ?? payload) as Record<string, unknown>;
  const orderId = readString(data, 'id', 'order_id', 'lab_order_id');
  if (!orderId) return null;

  const patient = (data.patient ?? data.patient_profile ?? {}) as Record<string, unknown>;

  return {
    eventType,
    orderId,
    patientExternalId: readString(patient, 'id', 'external_id', 'patient_id'),
    patientEmail: readString(patient, 'email'),
    status: readString(data, 'status', 'state') ?? 'updated',
    resultsUrl: readString(data, 'results_url', 'result_url', 'document_url'),
    title: readString(data, 'name', 'title') ?? `Lab order ${orderId}`,
    rawPayload: payload,
  };
}
