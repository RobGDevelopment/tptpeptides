import 'server-only';

import { getModuleFlags } from '../firebase/modules.server';
import { getSalesSettings } from '../firebase/sales.server';
import { getAdminFirestore, isAdminSdkConfigured } from '../firebase/admin';
import { isModuleEnabled } from '../modules/flags';
import { logAdminAction } from '../firebase/adminAuth.server';

function extractDomain(email: string): string {
  const parts = email.toLowerCase().split('@');
  return parts[1] ?? 'unknown';
}

function scoreLead(domain: string): number {
  if (domain.endsWith('.edu')) return 92;
  if (domain.endsWith('.gov')) return 88;
  if (['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'].includes(domain)) {
    return 25;
  }
  if (domain.includes('lab') || domain.includes('bio') || domain.includes('research')) return 78;
  return 60;
}

async function enrichCompanyName(domain: string): Promise<string | undefined> {
  const apiKey = process.env.CLEARBIT_API_KEY?.trim();
  if (!apiKey) return undefined;

  try {
    const response = await fetch(`https://company.clearbit.com/v2/companies/find?domain=${domain}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) return undefined;
    const data = (await response.json()) as { name?: string };
    return data.name;
  } catch {
    return undefined;
  }
}

export async function routeLeadForUser(uid: string, email: string | undefined): Promise<void> {
  if (!email || !isAdminSdkConfigured()) return;

  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isLeadRoutingEnabled')) return;

  const db = getAdminFirestore();
  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) return;

  const data = userSnap.data()!;
  if (data.assignedAeUid || data.leadRoutedAt) return;

  const role = String(data.role ?? 'user');
  if (role !== 'user' && role !== 'customer') return;

  const domain = extractDomain(email);
  const leadScore = scoreLead(domain);
  const companyName = await enrichCompanyName(domain);

  const settings = await getSalesSettings();
  const activeAe = settings.aeRoster.filter((member) => member.active);

  let assignedAeUid: string | null = null;
  let assignedAeEmail: string | null = null;

  if (activeAe.length > 0) {
    const counts = await Promise.all(
      activeAe.map(async (ae) => {
        const snap = await db
          .collection('users')
          .where('assignedAeUid', '==', ae.uid)
          .limit(200)
          .get();
        return { ae, count: snap.size };
      })
    );
    counts.sort((a, b) => a.count - b.count);
    assignedAeUid = counts[0]!.ae.uid;
    assignedAeEmail = counts[0]!.ae.email;
  }

  const routedAt = new Date().toISOString();
  await userRef.set(
    {
      companyDomain: domain,
      companyName: companyName ?? null,
      leadScore,
      assignedAeUid,
      assignedAeEmail,
      leadRoutedAt: routedAt,
    },
    { merge: true }
  );

  await db.collection('leads').doc(uid).set({
    uid,
    email,
    companyDomain: domain,
    companyName: companyName ?? null,
    leadScore,
    assignedAeUid,
    assignedAeEmail,
    routedAt,
  });

  if (assignedAeUid) {
    await logAdminAction({
      userId: assignedAeUid,
      action: 'lead_assigned',
      metadata: { leadUid: uid, email, leadScore, domain },
    });
  }
}
