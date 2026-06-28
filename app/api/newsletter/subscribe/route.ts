import { NextResponse } from 'next/server';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore, isAdminSdkConfigured } from '../../../../lib/firebase/admin';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../../lib/modules/flags';
import { isResendConfigured } from '../../../../lib/email/resend.server';

export const dynamic = 'force-dynamic';

const subscribeSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isTransactionalEmailEnabled')) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  if (!isAdminSdkConfigured()) {
    return NextResponse.json({ error: 'Newsletter is not configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const db = getAdminFirestore();
  const existing = await db.collection('newsletterSubscribers').where('email', '==', email).limit(1).get();

  if (existing.empty) {
    await db.collection('newsletterSubscribers').add({
      email,
      source: 'storefront_footer',
      subscribedAt: FieldValue.serverTimestamp(),
    });
  }

  if (isResendConfigured() && process.env.RESEND_AUDIENCE_ID?.trim()) {
    try {
      await fetch(`https://api.resend.com/audiences/${process.env.RESEND_AUDIENCE_ID.trim()}/contacts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, unsubscribed: false }),
      });
    } catch (error) {
      console.warn('[newsletter] Resend audience sync failed', error);
    }
  }

  return NextResponse.json({ ok: true });
}
