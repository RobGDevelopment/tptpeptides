import { z } from 'zod';

export const purchaseOrderDocSchema = z.object({
  supplierId: z.string().min(1),
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      price: z.number(),
      stock: z.number(),
    })
  ),
  status: z.enum(['pending_supplier_review', 'approved', 'fulfilled', 'cancelled']),
});

export type PurchaseOrderDoc = z.infer<typeof purchaseOrderDocSchema>;
