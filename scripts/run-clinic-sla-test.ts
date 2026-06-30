/**
 * Verify stale intake SLA query + optional cron call against local dev server.
 *
 * Usage:
 *   npm run test:clinic-sla
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { resolve } from 'node:path';
import { resolveMedFitDevBaseUrl } from './lib/resolveMedFitDevBaseUrl';

config({ path: resolve(process.cwd(), '.env.local') });

async function listStaleIntakes(): Promise<number> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error('Missing Supabase env vars');
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('medical_intakes')
    .select('id, submitted_at')
    .eq('status', 'submitted')
    .is('sla_alerted_at', null)
    .not('submitted_at', 'is', null)
    .lt('submitted_at', cutoff);

  if (error) throw error;
  return data?.length ?? 0;
}

async function tryCron(): Promise<void> {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return;

  const baseUrl = await resolveMedFitDevBaseUrl();
  if (!baseUrl) {
    console.log('MedFit dev server not found — SLA query verified via Supabase only.');
    console.log('Start: npm run dev (often http://localhost:3001 if 3000 is taken)');
    return;
  }

  const cronUrl = `${baseUrl}/api/cron/wellness-intake-sla`;

  try {
    const response = await fetch(cronUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${secret}` },
    });
    const body = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      stale?: number;
      emailed?: boolean;
      error?: string;
    };

    if (response.ok) {
      console.log('✓ SLA cron response:', JSON.stringify(body, null, 2));
      if ((body.stale ?? 0) > 0 && !body.emailed) {
        console.log(
          '  Email not sent (Resend or WELLNESS_SLA_ALERT_EMAIL may be unset). Query + cron auth still verified.'
        );
      }
      return;
    }

    console.log(`Cron HTTP ${response.status} at ${cronUrl} — restart MedFit dev server if the route was recently added.`);
  } catch {
    console.log('Dev server not reachable — SLA query verified via Supabase only.');
    console.log('Start: npm run dev');
  }
}

async function main() {
  const staleCount = await listStaleIntakes();
  console.log(`✓ Stale submitted intakes (>24h, unalerted): ${staleCount}`);

  if (staleCount === 0) {
    console.log('Run: npm run seed:clinic-demo -- --sla');
    return;
  }

  await tryCron();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
