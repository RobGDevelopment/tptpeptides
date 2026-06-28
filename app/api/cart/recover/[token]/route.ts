import { NextResponse } from 'next/server';
import {
  getCartSnapshotByToken,
  markCartSnapshotRecovered,
} from '../../../../../lib/firebase/cartSnapshots.server';
import { getModuleFlags } from '../../../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../../../lib/modules/flags';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isAbandonedCartEnabled')) {
    return NextResponse.json({ error: 'Cart recovery is not enabled' }, { status: 404 });
  }

  const { token } = await context.params;
  const snapshot = await getCartSnapshotByToken(token);
  if (!snapshot) {
    return NextResponse.json({ error: 'Recovery link expired or invalid' }, { status: 404 });
  }

  await markCartSnapshotRecovered(snapshot.id);

  return NextResponse.json({
    items: snapshot.items,
    email: snapshot.email,
  });
}
