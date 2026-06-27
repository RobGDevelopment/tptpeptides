import Link from 'next/link';
import type { CatalogSummary } from '../types';
import { TerminalLabel } from '../../../components/ui/TerminalLabel';
import { TerminalPanel } from '../../../components/ui/TerminalPanel';
import { PeptideVial } from '../../../components/ui/PeptideVial';

interface ProductCardProps {
  product: CatalogSummary;
  compact?: boolean;
}

export function ProductCard({ product, compact = false }: ProductCardProps) {
  const featuredTag = product.purchasableVariantCount > 1 ? `${product.purchasableVariantCount} sizes` : undefined;

  return (
    <Link
      href={`/catalog/${product.slug}`}
      className="group block h-full focus:outline-none focus-visible:ring-1 focus-visible:ring-gold/30"
    >
      <TerminalPanel hoverBeam className="p-8 h-full flex flex-col">
        <div className="mb-6 flex flex-wrap gap-2">
          {product.storefrontBadge === 'new_batch' && (
            <TerminalLabel variant="default">New Batch</TerminalLabel>
          )}
          <TerminalLabel variant={product.inStock ? 'positive' : 'negative'}>
            {product.inStock ? 'In Stock' : 'Out of Stock'}
          </TerminalLabel>
        </div>

        <div className="w-full h-44 flex items-center justify-center mb-8">
          <PeptideVial label={featuredTag ?? product.name} />
        </div>

        <p className="text-[10px] tracking-widest uppercase text-muted mb-2">{product.category}</p>

        <div className="flex justify-between items-start gap-3 mb-3">
          <h3
            className={`font-light text-primary group-hover:text-gold-light transition-colors duration-200 ${
              compact ? 'text-lg' : 'text-xl'
            } tracking-title uppercase`}
          >
            {product.name}
          </h3>
          {product.fromPrice != null && (
            <p className="text-base metallic-gold whitespace-nowrap font-medium font-mono tracking-widest uppercase">
              ${product.fromPrice.toFixed(0)}
              {product.purchasableVariantCount > 1 ? '+' : ''}
            </p>
          )}
        </div>

        <p className={`text-sm text-secondary font-light leading-relaxed flex-1 ${compact ? 'line-clamp-2' : 'line-clamp-3'}`}>
          {product.description}
        </p>

        <p className="mt-8 text-[10px] tracking-caps uppercase text-muted group-hover:text-gold transition-colors duration-200">
          View Compound →
        </p>
      </TerminalPanel>
    </Link>
  );
}
