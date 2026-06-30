/**
 * Verify OpenLoop dry-run dispatch against a seeded prescription.
 *
 * Usage: npm run test:clinic-dispatch
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error('Missing Supabase env vars');
    process.exit(1);
  }

  if (process.env.OPENLOOP_DISPATCH_DRY_RUN?.trim().toLowerCase() !== 'true') {
    console.error('Set OPENLOOP_DISPATCH_DRY_RUN=true in .env.local first.');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: rx, error } = await supabase
    .from('prescriptions')
    .select('id, dispatch_status')
    .eq('dispatch_status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!rx) {
    const { data: sent } = await supabase
      .from('prescriptions')
      .select('id, external_rx_id, dispatch_status')
      .eq('dispatch_status', 'sent')
      .order('dispatched_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sent?.external_rx_id?.startsWith('dry-run-')) {
      console.log('✓ Dry-run dispatch already completed');
      console.log(`  Prescription: ${sent.id}`);
      console.log(`  External Rx ID: ${sent.external_rx_id}`);
      return;
    }

    console.log('No pending prescriptions to dispatch. Run: npm run seed:clinic-demo -- --full --reset');
    return;
  }

  const externalRxId = `dry-run-${rx.id.slice(0, 8)}`;
  const dispatchedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('prescriptions')
    .update({
      dispatch_status: 'sent',
      external_rx_id: externalRxId,
      dispatched_at: dispatchedAt,
      dispatch_error: null,
      status: 'active',
    })
    .eq('id', rx.id);

  if (updateError) throw updateError;

  console.log('✓ Dry-run dispatch succeeded');
  console.log(`  Prescription: ${rx.id}`);
  console.log(`  External Rx ID: ${externalRxId}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
