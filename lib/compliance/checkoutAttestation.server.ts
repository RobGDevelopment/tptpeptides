import 'server-only';

import {
  AttestationValidationError,
  assertAttestationLogEligibleForCheckout,
} from '../firebase/attestation.server';
import type { ModuleFlags } from '../schemas/modules';
import { isModuleEnabled } from '../modules/flags';

export interface CheckoutAttestationInput {
  researchUseAcknowledged?: true;
  attestationLogId?: string;
}

export interface ResolvedCheckoutAttestation {
  attestationLogId?: string;
}

/** Validates legacy checkbox or typed attestation depending on module flag. */
export async function resolveCheckoutAttestation(params: {
  flags: ModuleFlags;
  input: CheckoutAttestationInput;
  tenantId: string;
  uid: string | null;
}): Promise<ResolvedCheckoutAttestation> {
  const typedEnabled = isModuleEnabled(params.flags, 'isTypedAttestationEnabled');

  if (typedEnabled) {
    const attestationLogId = params.input.attestationLogId?.trim();
    if (!attestationLogId) {
      throw new AttestationValidationError(
        'Complete the typed research attestation before checkout.'
      );
    }

    await assertAttestationLogEligibleForCheckout(attestationLogId, {
      tenantId: params.tenantId,
      uid: params.uid,
    });

    return { attestationLogId };
  }

  if (params.input.researchUseAcknowledged !== true) {
    throw new AttestationValidationError('You must confirm research-use-only terms');
  }

  return {};
}
