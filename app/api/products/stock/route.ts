import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getProductStockByIds } from '../../../../lib/firebase/products.server';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  ids: z.array(z.string()).min(1).max(50),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'ids must be a non-empty array of strings' }, { status: 400 });
  }

  const stock = await getProductStockByIds(parsed.data.ids);
  return NextResponse.json({ stock });
}
