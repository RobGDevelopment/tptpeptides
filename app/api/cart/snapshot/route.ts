import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUserFromRequest } from '../../../../lib/firebase/auth.server';
import { upsertCartSnapshot } from '../../../../lib/firebase/cartSnapshots.server';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { cartSnapshotRequestSchema } from '../../../../lib/schemas/growth';
import { isModuleEnabled } from '../../../../lib/modules/flags';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isAbandonedCartEnabled')) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = cartSnapshotRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid cart snapshot' }, { status: 400 });
  }

  const sessionUser = await getSessionUserFromRequest(request);
  const email = sessionUser?.email ?? parsed.data.email;
  if (!email) {
    return NextResponse.json({ error: 'Email required for cart snapshot' }, { status: 400 });
  }

  await upsertCartSnapshot({
    userId: sessionUser?.uid ?? null,
    email,
    items: parsed.data.items,
  });

  return NextResponse.json({ ok: true });
}
