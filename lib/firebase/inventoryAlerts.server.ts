import 'server-only';

import { productDocSchema } from '../schemas/product';
import { getAdminFirestore, isAdminSdkConfigured } from '../firebase/admin';
import { getActiveTenantId } from '../tenant/getTenant.server';
import { isProductVisibleToTenant } from '../tenant/productVisibility';

export interface LowStockVariant {
  id: string;
  name: string;
  tag: string;
  stock: number;
  threshold: number;
}

const DEFAULT_THRESHOLD = 20;

export async function listLowStockVariants(threshold = DEFAULT_THRESHOLD): Promise<LowStockVariant[]> {
  if (!isAdminSdkConfigured()) return [];

  const tenantId = await getActiveTenantId();
  const db = getAdminFirestore();
  const snapshot = await db.collection('products').limit(500).get();

  return snapshot.docs
    .map((doc) => {
      const parsed = productDocSchema.safeParse(doc.data());
      if (!parsed.success) return null;
      if (!isProductVisibleToTenant(parsed.data.tenantVisibility, tenantId)) return null;

      const stock = parsed.data.stock;
      if (stock > threshold) return null;
      return {
        id: doc.id,
        name: parsed.data.name,
        tag: parsed.data.tag,
        stock,
        threshold,
      };
    })
    .filter((row): row is LowStockVariant => row != null)
    .sort((a, b) => a.stock - b.stock);
}
