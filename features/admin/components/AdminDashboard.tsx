'use client';

import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../auth/providers/AuthProvider';
import { db } from '../../../lib/firebase/firestore';
import {
  getGroupBaseCostRange,
  getGroupRetailRange,
  getGroupTotalStock,
  groupProductsFromDocs,
} from '../lib/groupProducts';
import { Spinner } from '../../../components/ui/Spinner';
import { AdminPageHeader } from '../../../components/ui/AdminPageHeader';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import type { AdminModuleLink } from '../../../lib/modules/adminModuleLinks';
import { EnabledModulesPanel } from './EnabledModulesPanel';
import type { AdminProductGroup } from '../types';

export function AdminDashboard({ enabledModules }: { enabledModules: AdminModuleLink[] }) {
  const { isAdmin, loading: authLoading } = useAuth();
  const [groups, setGroups] = useState<AdminProductGroup[]>([]);
  const [orderCount, setOrderCount] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !isAdmin) return;

    const productsQuery = query(collection(db, 'products'));
    const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));

    const unsubProducts = onSnapshot(
      productsQuery,
      (snapshot) => {
        const docs = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Record<string, unknown> & { id: string }
        );
        const grouped = groupProductsFromDocs(docs);
        setGroups(grouped);

        const lowStock = docs.filter(
          (doc) => Number(doc.stock ?? 0) <= Number(doc.reorderThreshold ?? 20)
        ).length;
        setLowStockCount(lowStock);
        setLoading(false);
      },
      () => setLoading(false)
    );

    const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
      const orders = snapshot.docs.map((doc) => doc.data());
      setOrderCount(orders.length);
      setPendingOrders(
        orders.filter((o) => o.status === 'pending_payment' || o.status === 'paid').length
      );
    });

    return () => {
      unsubProducts();
      unsubOrders();
    };
  }, [authLoading, isAdmin]);

  const variantCount = useMemo(
    () => groups.reduce((sum, group) => sum + group.variants.length, 0),
    [groups]
  );

  if (authLoading || loading) {
    return <Spinner label="Loading dashboard..." className="py-20" />;
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Lab Operations Dashboard"
        subtitle="Real-time overview of catalog, orders, and inventory health"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-px bg-white/[0.04]">
        {[
          { label: 'Catalog Products', value: groups.length, sub: `${variantCount} variants` },
          { label: 'Total Orders', value: orderCount, sub: `${pendingOrders} awaiting action` },
          { label: 'Low Stock SKUs', value: lowStockCount, sub: 'At or below threshold' },
          {
            label: 'Active Categories',
            value: new Set(groups.map((g) => g.category)).size,
            sub: 'Unique categories',
          },
        ].map((card) => (
          <div key={card.label} className="admin-stat bg-void">
            <p className="text-[10px] tracking-caps uppercase text-muted">{card.label}</p>
            <p className="text-3xl font-light mt-2 text-primary">{card.value}</p>
            <p className="text-sm text-secondary font-light mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      <EnabledModulesPanel modules={enabledModules} />

      <section className="admin-table-section">
        <div className="p-6 border-b border-white/[0.04] space-y-3">
          <h2 className="text-sm tracking-caps uppercase text-heading font-medium">Catalog Snapshot</h2>
          <HeaderDividerBeam delay={2} />
        </div>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Variants</th>
                <th>Base Cost</th>
                <th>Retail</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {groups.slice(0, 8).map((group) => (
                <tr key={group.catalogId}>
                  <td className="text-primary">{group.name}</td>
                  <td className="text-muted">{group.category}</td>
                  <td>{group.variants.length}</td>
                  <td>{getGroupBaseCostRange(group)}</td>
                  <td className="metallic-gold">{getGroupRetailRange(group)}</td>
                  <td>{getGroupTotalStock(group)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
