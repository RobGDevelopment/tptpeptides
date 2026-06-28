'use client';

import { adminFetch } from '../../../lib/admin/adminFetch.client';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../../../lib/firebase/firestore';
import {
  getGroupBaseCostRange,
  getGroupRetailRange,
  getGroupTotalStock,
  groupProductsFromDocs,
} from '../lib/groupProducts';
import type { AdminProductGroup } from '../types';
import { ProductFormModal } from './ProductFormModal';
import { TierPricingPanel } from './TierPricingPanel';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { AdminPageHeader } from '../../../components/ui/AdminPageHeader';

export function ProductsPageContent({ showTierPricing }: { showTierPricing: boolean }) {
  const [groups, setGroups] = useState<AdminProductGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AdminProductGroup | null>(null);

  useEffect(() => {
    const productsQuery = query(collection(db, 'products'));
    const unsubscribe = onSnapshot(productsQuery, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setGroups(groupProductsFromDocs(docs));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    setSeedMessage('');
    try {
      const response = await adminFetch('/api/admin/seed', { method: 'POST' });
      const data = (await response.json()) as { message?: string; error?: string };
      setSeedMessage(response.ok ? (data.message ?? 'Seed complete') : (data.error ?? 'Seed failed'));
    } catch {
      setSeedMessage('Seed request failed');
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return <Spinner label="Loading products..." className="py-20" />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Product Information Management"
        subtitle="Manage catalog entries, variants, and pricing from the handbook"
        beamDelay={2}
        actions={
          <>
            <Button variant="ghost" onClick={handleSeed} disabled={seeding}>
              {seeding ? 'Seeding...' : 'Run Seed'}
            </Button>
            <Button
              onClick={() => {
                setEditingGroup(null);
                setModalOpen(true);
              }}
            >
              Add Product
            </Button>
          </>
        }
      />

      {seedMessage && <p className="admin-banner">{seedMessage}</p>}

      <div className="admin-table-section">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Variants</th>
                <th>Base Cost</th>
                <th>Retail Price</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted">
                    No products in Firestore. Run Seed to inject catalog.json.
                  </td>
                </tr>
              )}
              {groups.map((group) => (
                <tr key={group.catalogId}>
                  <td className="text-primary">{group.name}</td>
                  <td className="text-muted">{group.category}</td>
                  <td>{group.variants.length}</td>
                  <td>{getGroupBaseCostRange(group)}</td>
                  <td className="metallic-gold">{getGroupRetailRange(group)}</td>
                  <td>{getGroupTotalStock(group)}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingGroup(group);
                        setModalOpen(true);
                      }}
                      className="terminal-link text-[10px]"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ProductFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialGroup={editingGroup}
      />

      {showTierPricing ? <TierPricingPanel /> : null}
    </div>
  );
}
