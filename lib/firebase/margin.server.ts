import 'server-only';

import type { MarginReport } from '../schemas/sales';
import { productDocSchema } from '../schemas/product';
import { getAdminFirestore, isAdminSdkConfigured } from './admin';

const FULFILLED_STATUSES = new Set(['paid', 'processing', 'fulfilled']);

export async function buildMarginReport(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<MarginReport> {
  if (!isAdminSdkConfigured()) {
    return {
      orderCount: 0,
      revenue: 0,
      cogs: 0,
      grossMargin: 0,
      marginPercent: 0,
      skuRows: [],
    };
  }

  const db = getAdminFirestore();
  const ordersSnap = await db.collection('orders').limit(500).get();

  const startMs = params?.startDate ? new Date(params.startDate).getTime() : 0;
  const endMs = params?.endDate
    ? new Date(`${params.endDate}T23:59:59.999Z`).getTime()
    : Number.POSITIVE_INFINITY;

  const skuMap = new Map<
    string,
    { productId: string; name: string; tag: string; unitsSold: number; revenue: number; cogs: number }
  >();

  let orderCount = 0;
  let totalRevenue = 0;
  let totalCogs = 0;

  const productCache = new Map<string, ReturnType<typeof productDocSchema.parse>>();

  for (const orderDoc of ordersSnap.docs) {
    const order = orderDoc.data();
    const status = String(order.status ?? '');
    if (!FULFILLED_STATUSES.has(status)) continue;

    const createdAt = order.createdAt?.toDate?.()?.getTime?.() ?? 0;
    if (createdAt < startMs || createdAt > endMs) continue;

    orderCount += 1;
    const items = (order.items as Record<string, unknown>[]) ?? [];

    for (const item of items) {
      const productId = String(item.id ?? '');
      const quantity = Number(item.quantity ?? 0);
      const lineRevenue = Number(item.price ?? 0) * quantity;
      if (!productId || quantity <= 0) continue;

      let product = productCache.get(productId);
      if (!product) {
        const snap = await db.collection('products').doc(productId).get();
        if (!snap.exists) continue;
        const parsed = productDocSchema.safeParse(snap.data());
        if (!parsed.success) continue;
        product = parsed.data;
        productCache.set(productId, product);
      }

      const unitCost = product.baseCost ?? 0;
      const lineCogs = unitCost * quantity;

      totalRevenue += lineRevenue;
      totalCogs += lineCogs;

      const existing = skuMap.get(productId) ?? {
        productId,
        name: String(item.name ?? product.name),
        tag: String(item.tag ?? product.tag),
        unitsSold: 0,
        revenue: 0,
        cogs: 0,
      };

      existing.unitsSold += quantity;
      existing.revenue += lineRevenue;
      existing.cogs += lineCogs;
      skuMap.set(productId, existing);
    }
  }

  const grossMargin = totalRevenue - totalCogs;
  const marginPercent = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;

  const skuRows = [...skuMap.values()]
    .map((row) => {
      const rowMargin = row.revenue - row.cogs;
      return {
        ...row,
        revenue: Math.round(row.revenue * 100) / 100,
        cogs: Math.round(row.cogs * 100) / 100,
        grossMargin: Math.round(rowMargin * 100) / 100,
        marginPercent: row.revenue > 0 ? Math.round((rowMargin / row.revenue) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.grossMargin - a.grossMargin);

  return {
    orderCount,
    revenue: Math.round(totalRevenue * 100) / 100,
    cogs: Math.round(totalCogs * 100) / 100,
    grossMargin: Math.round(grossMargin * 100) / 100,
    marginPercent: Math.round(marginPercent * 10) / 10,
    skuRows,
  };
}
