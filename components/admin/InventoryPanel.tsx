'use client';

import React, { useEffect, useState } from 'react';
import { getLowStockProducts } from '../../lib/business/inventory';
import { generatePurchaseOrder } from '../../lib/business/poManager';
import type { Product } from '../../lib/types';
import { Button } from '../ui/Button';

export function InventoryPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  const loadLowStock = async () => {
    setLoading(true);
    const data = await getLowStockProducts(10);
    setProducts(data as Product[]);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const data = await getLowStockProducts(10);
      if (!cancelled) {
        setProducts(data as Product[]);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleGeneratePO = async (product: Product) => {
    setGenerating(product.id);
    try {
      await generatePurchaseOrder({
        supplierId: product.supplierId || 'default-supplier',
        items: [product],
      });
      await loadLowStock();
    } finally {
      setGenerating(null);
    }
  };

  if (loading) {
    return <p className="text-muted text-sm font-light">Loading inventory alerts...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-sm tracking-caps uppercase text-primary font-medium">Low Stock Alerts</h2>
        <button type="button" onClick={loadLowStock} className="terminal-link text-[10px]">
          Refresh
        </button>
      </div>

      {products.length === 0 && (
        <p className="text-muted text-sm font-light">All products are above the reorder threshold.</p>
      )}

      {products.map((product) => (
        <div
          key={product.id}
          className="border-b border-white/[0.06] py-4 flex justify-between items-center"
        >
          <div>
            <h3 className="text-sm text-primary font-light">{product.name}</h3>
            <p className="text-[10px] tracking-caps uppercase text-gold-light mt-1">
              {product.stock} units remaining
            </p>
          </div>
          <Button onClick={() => handleGeneratePO(product)} disabled={generating === product.id}>
            {generating === product.id ? 'Generating...' : 'Generate PO'}
          </Button>
        </div>
      ))}
    </div>
  );
}
