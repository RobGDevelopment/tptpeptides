import 'server-only';

import { createOpsException } from '../firebase/exceptions.server';
import { getAdminFirestore } from '../firebase/admin';
import { PROHIBITED_TERMS } from './termDictionary';
import { refundOrdersForLexicalQuarantine, resolveUserIdFromEmail } from './lexicalRefund.server';

export interface InboundMessageScanInput {
  fromEmail: string;
  subject: string;
  body: string;
  userId?: string | null;
}

export interface LexicalScanResult {
  flagged: boolean;
  matches: string[];
  severity: 'low' | 'medium' | 'high';
}

export function scanInboundMessage(input: InboundMessageScanInput): LexicalScanResult {
  const haystack = `${input.subject}\n${input.body}`.toLowerCase();
  const matches = PROHIBITED_TERMS.filter((term) => haystack.includes(term.toLowerCase()));

  const severity: LexicalScanResult['severity'] =
    matches.length >= 3 ? 'high' : matches.length >= 1 ? 'medium' : 'low';

  return {
    flagged: matches.length > 0,
    matches,
    severity,
  };
}

export async function handleLexicalQuarantineHit(
  input: InboundMessageScanInput,
  scan: LexicalScanResult
): Promise<{ userId: string | null; refundedOrderIds: string[] }> {
  if (!scan.flagged) {
    return { userId: input.userId ?? null, refundedOrderIds: [] };
  }

  const userId = input.userId ?? (await resolveUserIdFromEmail(input.fromEmail));

  await createOpsException({
    type: 'lexical_quarantine',
    message: `Inbound message flagged for prohibited terms: ${scan.matches.join(', ')}`,
    metadata: {
      fromEmail: input.fromEmail,
      severity: scan.severity,
      matches: scan.matches.join(','),
    },
  });

  if (userId) {
    await getAdminFirestore().collection('users').doc(userId).set(
      {
        complianceHold: true,
        complianceHoldReason: 'lexical_quarantine',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  }

  let refundedOrderIds: string[] = [];

  if (scan.severity === 'high') {
    const refundResult = await refundOrdersForLexicalQuarantine({
      userId,
      fromEmail: input.fromEmail,
      reason: `Lexical quarantine — prohibited terms: ${scan.matches.join(', ')}`,
    });
    refundedOrderIds = refundResult.refundedOrderIds;

    if (refundedOrderIds.length > 0) {
      await createOpsException({
        type: 'lexical_quarantine',
        message: `Auto-refunded ${refundedOrderIds.length} order(s) for ${input.fromEmail}`,
        metadata: {
          fromEmail: input.fromEmail,
          refundedOrderIds: refundedOrderIds.join(','),
        },
      });
    }
  }

  return { userId, refundedOrderIds };
}
