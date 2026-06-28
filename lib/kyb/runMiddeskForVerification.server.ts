import 'server-only';

import type { ModuleFlags } from '../schemas/modules';
import type { MiddeskReport } from '../schemas/verification';
import { isModuleEnabled } from '../modules/flags';
import {
  isMiddeskConfigured,
  MiddeskError,
  verifyBusinessWithMiddesk,
} from './middesk.server';

export async function runMiddeskForVerification(params: {
  flags: ModuleFlags;
  userId: string;
  institutionName: string;
  einTaxId: string;
  addressLine?: string | null;
}): Promise<MiddeskReport | undefined> {
  if (!isModuleEnabled(params.flags, 'isMiddeskVerificationEnabled')) {
    return undefined;
  }

  if (!isMiddeskConfigured()) {
    return {
      businessId: '',
      status: 'skipped',
      fetchedAt: new Date().toISOString(),
      registrationStatus: null,
      registrationState: null,
      taxClassification: null,
      tinMatch: 'pending',
      recommendation: 'pending',
      tasks: [],
      skippedReason: 'MIDDESK_API_KEY not configured',
    };
  }

  try {
    const result = await verifyBusinessWithMiddesk({
      institutionName: params.institutionName,
      einTaxId: params.einTaxId,
      externalId: params.userId,
      addressLine: params.addressLine,
    });

    return {
      businessId: result.businessId,
      status: result.status,
      fetchedAt: result.fetchedAt,
      registrationStatus: result.registrationStatus,
      registrationState: result.registrationState,
      taxClassification: result.taxClassification,
      tinMatch: result.tinMatch,
      recommendation: result.recommendation,
      tasks: result.tasks,
    };
  } catch (error) {
    const message = error instanceof MiddeskError ? error.message : 'Middesk verification failed';
    console.error('[kyb/middesk] verification failed', error);
    return {
      businessId: '',
      status: 'error',
      fetchedAt: new Date().toISOString(),
      registrationStatus: null,
      registrationState: null,
      taxClassification: null,
      tinMatch: 'unknown',
      recommendation: 'review',
      tasks: [],
      error: message,
    };
  }
}
