'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { StorefrontProduct } from '../types';
import { useCartStore } from '../stores/useCartStore';
import { TerminalPanel } from '../../../components/ui/TerminalPanel';
import { TerminalLabel } from '../../../components/ui/TerminalLabel';
import { VialThumbnail } from './VialThumbnail';

interface ProductGridProps {
  initialProducts: StorefrontProduct[];
}

export function ProductGrid({ initialProducts }: ProductGridProps) {
  const [stockOverrides, setStockOverrides] = useState<Record<string, number>>({});
  const addItem = useCartStore((state) => state.addItem);

  const products = useMemo(
    () =>
      initialProducts.map((product) => ({
        ...product,
        stock: stockOverrides[product.id] ?? product.stock,
      })),
    [initialProducts, stockOverrides]
  );

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch('/api/products/stock');
        if (!response.ok) return;
        const data = (await response.json()) as { stock: Record<string, number> };
        setStockOverrides(data.stock);
      } catch (error) {
        console.warn('[ProductGrid] Failed to refresh stock levels', error);
      }
    })();
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.04]">
        {products.map((product) => (
          <TerminalPanel key={product.id} hoverBeam className="p-8 flex flex-col h-full bg-void">
            <TerminalLabel variant={product.stock > 0 ? 'positive' : 'negative'}>
              {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
            </TerminalLabel>

            <div className="w-full h-44 flex items-center justify-center my-8">
              <VialThumbnail tag={product.tag} size="md" />
            </div>

            <h3 className="text-xl font-light text-primary tracking-title uppercase">{product.name}</h3>
            <p className="text-base metallic-gold mt-2 font-medium">${product.price.toFixed(2)}</p>
            <p className="text-sm text-secondary font-light flex-1 mt-3 line-clamp-3">{product.desc}</p>

            <button
              type="button"
              disabled={product.stock <= 0}
              onClick={() => addItem(product)}
              className="terminal-link text-[10px] mt-8 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Add to Cart
            </button>
          </TerminalPanel>
        ))}
      </div>
    </section>
  );
}
