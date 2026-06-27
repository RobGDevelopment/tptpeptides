'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Icons } from '../../../components/icons';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { TerminalButton } from '../../../components/ui/TerminalButton';
import { TerminalPanel } from '../../../components/ui/TerminalPanel';
import type { CatalogDetail, CatalogSummary } from '../types';
import { useCartStore } from '../stores/useCartStore';
import { VialThumbnail } from './VialThumbnail';
import { ProductCard } from './ProductCard';
import { ProductFaq } from './ProductFaq';

interface CatalogProductDetailProps {
  detail: CatalogDetail;
  relatedProducts?: CatalogSummary[];
}

export function CatalogProductDetail({ detail, relatedProducts = [] }: CatalogProductDetailProps) {
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);

  const defaultVariantId = useMemo(() => {
    const inStock = detail.variants.find((variant) => variant.stock > 0);
    return inStock?.id ?? detail.variants[0]?.id ?? '';
  }, [detail.variants]);

  const [selectedId, setSelectedId] = useState(defaultVariantId);

  const selected = detail.variants.find((variant) => variant.id === selectedId) ?? detail.variants[0];
  const anyInStock = detail.variants.some((variant) => variant.stock > 0);

  if (!selected) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center text-muted text-sm font-light">
        No purchasable variants are currently listed for this compound.
      </div>
    );
  }

  return (
    <article className="max-w-6xl mx-auto px-4 pt-28 pb-20">
      <Link href="/catalog" className="terminal-link text-[10px]">
        Back to Catalog
      </Link>

      <div className="mt-10 grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
        <TerminalPanel className="flex items-center justify-center min-h-[420px] p-12">
          <VialThumbnail tag={selected.tag} />
        </TerminalPanel>

        <div>
          <p className="text-[10px] tracking-widest uppercase text-muted">{detail.entry.category}</p>
          <h1 className="text-3xl md:text-4xl font-light mt-3 text-heading tracking-title uppercase">
            {detail.entry.name}
          </h1>
          <p className="text-[10px] tracking-caps uppercase text-gold-light mt-4">
            For laboratory research purposes only · Not for human or veterinary use
          </p>
          <HeaderDividerBeam delay={1} className="my-6" />
          <p className="text-secondary font-light leading-relaxed text-sm">{detail.entry.description}</p>

          <div className="mt-8 flex flex-wrap gap-x-4 gap-y-2">
            {detail.entry.researchAreas.map((area) => (
              <span key={area} className="text-[10px] tracking-widest uppercase text-muted">
                {area}
              </span>
            ))}
          </div>

          <div className="mt-12">
            <h2 className="text-[10px] tracking-caps uppercase text-muted mb-4">Select Variant</h2>
            <div>
              {detail.variants.map((variant) => {
                const isSelected = variant.id === selected.id;
                const outOfStock = variant.stock <= 0;

                return (
                  <button
                    key={variant.id}
                    type="button"
                    disabled={outOfStock}
                    data-selected={isSelected}
                    onClick={() => setSelectedId(variant.id)}
                    className="terminal-variant-row"
                  >
                    <span className="text-sm font-light font-mono tracking-widest uppercase">{variant.tag}</span>
                    <span className="text-right">
                      <span className="variant-price block text-sm font-medium metallic-gold font-mono tracking-widest">
                        ${variant.price.toFixed(2)}
                      </span>
                      <span className="text-[10px] tracking-widest uppercase text-muted font-mono">
                        {outOfStock ? 'Unavailable' : `${variant.stock} units`}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            <TerminalButton
              disabled={selected.stock <= 0}
              onClick={() => {
                addItem(selected);
                openCart();
              }}
              className="text-sm"
            >
              Add to Cart — ${selected.price.toFixed(2)}
            </TerminalButton>
            <Link href="/catalog" className="terminal-link text-[10px]">
              Browse Catalog
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap gap-8">
            {[
              { icon: Icons.Check, label: 'HPLC Tested' },
              { icon: Icons.Shield, label: 'Research Grade' },
              { icon: Icons.Box, label: 'Cold Chain' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-muted">
                <span className="text-gold">
                  <Icon />
                </span>
                <span className="text-[10px] tracking-caps uppercase">{label}</span>
              </div>
            ))}
          </div>

          {!anyInStock && (
            <p className="mt-8 text-xs text-secondary font-light">
              All variants are currently unavailable. Contact support for allocation inquiries.
            </p>
          )}
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <section className="mt-20">
          <h2 className="text-xl font-light text-primary tracking-title uppercase mb-2">
            Often Researched With
          </h2>
          <HeaderDividerBeam delay={2} className="mb-10" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.04]">
            {relatedProducts.map((product) => (
              <div key={product.slug} className="bg-void p-1">
                <ProductCard product={product} compact />
              </div>
            ))}
          </div>
        </section>
      )}

      <ProductFaq productName={detail.entry.name} />

      <HeaderDividerBeam delay={3} className="mt-12" />
      <p className="text-[10px] text-muted mt-6 tracking-caps uppercase font-light">
        Research use only ·{' '}
        <Link href="/research-policy" className="text-gold-light hover:text-gold transition-colors">
          RUO Policy
        </Link>
      </p>
    </article>
  );
}
