'use client';

import { useMemo, useState } from 'react';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import type { CatalogSummary } from '../types';
import type { CategoryMerchandising } from '../../../lib/schemas/storefrontCms';
import {
  resolveCategoryDisplayName,
  sortCatalogCategories,
} from '../../../lib/storefront/categoryMerchandising';
import { ProductCard } from './ProductCard';

interface CatalogGridProps {
  products: CatalogSummary[];
  showFilters?: boolean;
  limit?: number;
  title?: string;
  subtitle?: string;
  categoryMerchandising?: CategoryMerchandising;
}

export function CatalogGrid({
  products,
  showFilters = false,
  limit,
  title,
  subtitle,
  categoryMerchandising,
}: CatalogGridProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState<'name' | 'price-asc' | 'price-desc' | 'stock'>('name');

  const categoryOptions = useMemo(() => {
    const values = new Set(products.map((product) => product.category));
    const sorted = categoryMerchandising
      ? sortCatalogCategories([...values], categoryMerchandising)
      : [...values].sort((a, b) => a.localeCompare(b));

    return [
      { value: 'all', label: 'All' },
      ...sorted.map((value) => ({
        value,
        label: categoryMerchandising
          ? resolveCategoryDisplayName(value, categoryMerchandising)
          : value,
      })),
    ];
  }, [products, categoryMerchandising]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const matches = products.filter((product) => {
      const matchesCategory = category === 'all' || product.category === category;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.description.toLowerCase().includes(normalizedQuery) ||
        product.researchAreas.some((area) => area.toLowerCase().includes(normalizedQuery));

      return matchesCategory && matchesQuery;
    });

    return [...matches].sort((a, b) => {
      if (sort === 'stock') {
        if (a.inStock !== b.inStock) return a.inStock ? -1 : 1;
        return a.name.localeCompare(b.name);
      }
      if (sort === 'price-asc') {
        return (a.fromPrice ?? Number.MAX_SAFE_INTEGER) - (b.fromPrice ?? Number.MAX_SAFE_INTEGER);
      }
      if (sort === 'price-desc') {
        return (b.fromPrice ?? 0) - (a.fromPrice ?? 0);
      }
      return a.name.localeCompare(b.name);
    });
  }, [products, query, category, sort]);

  const visible = limit != null ? filtered.slice(0, limit) : filtered;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32 relative z-10">
      {(title || subtitle) && (
        <div className="mb-12">
          {title ? (
            <h2 className="text-2xl md:text-3xl font-light text-heading tracking-title uppercase mb-3">
              {title}
            </h2>
          ) : null}
          {subtitle ? <p className="text-secondary font-light max-w-2xl text-sm leading-relaxed">{subtitle}</p> : null}
          <HeaderDividerBeam delay={1} className="mt-8" />
        </div>
      )}

      {showFilters && (
        <div className="mb-12 space-y-8">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {categoryOptions.map((option, index) => (
              <span key={option.value} className="flex items-center gap-6">
                <button
                  type="button"
                  onClick={() => setCategory(option.value)}
                  className={`text-[10px] tracking-widest uppercase font-medium px-2 py-1 -mx-2 rounded-sm transition-colors duration-200 ${
                    category === option.value
                      ? 'text-gold-light'
                      : 'text-muted hover:text-secondary hover:bg-[#BF953F]/10'
                  }`}
                >
                  {option.label}
                </button>
                {index < categoryOptions.length - 1 ? (
                  <span className="h-3 w-px bg-white/[0.08]" aria-hidden />
                ) : null}
              </span>
            ))}
          </div>

          <div className="flex flex-col lg:flex-row gap-8 lg:items-end">
            <label className="flex-1 max-w-md">
              <span className="text-[10px] tracking-caps uppercase text-muted block mb-2">Search</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Compound or research area..."
                className="terminal-input"
              />
            </label>
            <label className="lg:w-48">
              <span className="text-[10px] tracking-caps uppercase text-muted block mb-2">Sort</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as typeof sort)}
                className="terminal-select"
              >
                <option value="name">Name</option>
                <option value="stock">In stock first</option>
                <option value="price-asc">Price ↑</option>
                <option value="price-desc">Price ↓</option>
              </select>
            </label>
          </div>
          <HeaderDividerBeam delay={2} />
        </div>
      )}

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32">
          <p className="text-muted text-xs tracking-caps uppercase">No compounds match filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.04]">
          {visible.map((product) => (
            <div key={product.slug} className="catalog-grid-item bg-void p-1">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}

      {limit != null && filtered.length > limit && (
        <p className="text-center text-[10px] tracking-caps uppercase text-muted mt-12">
          Showing {limit} of {filtered.length}
        </p>
      )}
    </section>
  );
}
