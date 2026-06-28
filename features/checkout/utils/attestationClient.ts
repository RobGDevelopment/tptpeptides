import type { ResearchIntent } from '../../../lib/schemas/attestation';

export async function submitCheckoutAttestation(input: {
  researchIntent: ResearchIntent;
  typedSignature: string;
}): Promise<string> {
  const response = await fetch('/api/checkout/attestation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const data = (await response.json()) as { attestationLogId?: string; error?: string };
  if (!response.ok || !data.attestationLogId) {
    throw new Error(data.error ?? 'Unable to record attestation');
  }

  return data.attestationLogId;
}
