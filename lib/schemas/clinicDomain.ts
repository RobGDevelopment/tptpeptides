import { z } from 'zod';

export const clinicDomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Domain is required')
  .max(253)
  .regex(
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/,
    'Enter a valid domain (e.g. new-clinic.com)'
  );

export type AddCustomDomainResult =
  | {
      ok: true;
      domain: string;
      verified: boolean;
      firebaseUpdated: boolean;
      dnsInstructions: Array<{ type: string; host: string; value: string }>;
      notice?: string;
    }
  | { ok: false; error: string };
