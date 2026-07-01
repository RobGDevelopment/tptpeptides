import 'server-only';

import { createAdminClient } from '../../supabase/admin';
import { withSupabaseRetry } from '../../supabase/retry.server';
import type { FullscriptWebhookEvent } from '../providers/fullscript.adapter';

const FULLSCRIPT_LAB_REFERENCE_PREFIX = 'fullscript:lab_order:';

export type FullscriptLabOrderSyncResult = {
  labResultId: string;
  patientId: string;
  idempotentReplay: boolean;
};

function buildFullscriptLabReference(orderId: string): string {
  return `${FULLSCRIPT_LAB_REFERENCE_PREFIX}${orderId}`;
}

async function resolvePatientId(input: FullscriptWebhookEvent): Promise<string | null> {
  const supabase = createAdminClient();

  if (input.patientExternalId) {
    const { data } = await withSupabaseRetry(async () =>
      supabase
        .from('patient_profiles')
        .select('id')
        .eq('id', input.patientExternalId)
        .maybeSingle()
    );

    if (data?.id) {
      return data.id as string;
    }
  }

  if (input.patientEmail) {
    const { data: authLookup } = await supabase.auth.admin.listUsers();
    const matched = authLookup.users.find(
      (user) => user.email?.toLowerCase() === input.patientEmail?.toLowerCase()
    );

    if (matched?.id) {
      const { data: profile } = await withSupabaseRetry(async () =>
        supabase.from('patient_profiles').select('id').eq('id', matched.id).maybeSingle()
      );
      if (profile?.id) {
        return profile.id as string;
      }
    }
  }

  return null;
}

async function findExistingLabResult(orderId: string): Promise<{ id: string; patient_id: string } | null> {
  const supabase = createAdminClient();
  const reference = buildFullscriptLabReference(orderId);
  const { data, error } = await withSupabaseRetry(async () =>
    supabase
      .from('clinic_lab_results')
      .select('id, patient_id')
      .eq('file_url', reference)
      .maybeSingle()
  );

  if (error) {
    throw new Error(error.message);
  }

  return (data as { id: string; patient_id: string } | null) ?? null;
}

export async function syncFullscriptLabOrderToClinicResults(
  event: FullscriptWebhookEvent
): Promise<FullscriptLabOrderSyncResult | null> {
  const existing = await findExistingLabResult(event.orderId);
  if (existing) {
    const supabase = createAdminClient();
    const nextFileUrl = event.resultsUrl ?? buildFullscriptLabReference(event.orderId);
    const nextStatus = event.status.toLowerCase().includes('complete') ? 'reviewed' : 'pending';

    await withSupabaseRetry(async () =>
      supabase
        .from('clinic_lab_results')
        .update({
          title: event.title,
          status: nextStatus,
          file_url: nextFileUrl,
          provider_notes: `Synced from Fullscript (${event.eventType}).`,
        })
        .eq('id', existing.id)
    );

    return {
      labResultId: existing.id,
      patientId: existing.patient_id,
      idempotentReplay: true,
    };
  }

  const patientId = await resolvePatientId(event);
  if (!patientId) {
    return null;
  }

  const supabase = createAdminClient();
  const fileUrl = event.resultsUrl ?? buildFullscriptLabReference(event.orderId);
  const status = event.status.toLowerCase().includes('complete') ? 'reviewed' : 'pending';

  const { data, error } = await withSupabaseRetry(async () =>
    supabase
      .from('clinic_lab_results')
      .insert({
        patient_id: patientId,
        title: event.title,
        status,
        file_url: fileUrl,
        provider_notes: `Imported from Fullscript lab order ${event.orderId}.`,
      })
      .select('id, patient_id')
      .single()
  );

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to create clinic lab result from Fullscript webhook.');
  }

  return {
    labResultId: (data as { id: string }).id,
    patientId: (data as { patient_id: string }).patient_id,
    idempotentReplay: false,
  };
}

export { buildFullscriptLabReference, FULLSCRIPT_LAB_REFERENCE_PREFIX };
