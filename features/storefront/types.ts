export interface StorefrontProduct {
  id: string;
  slug: string;
  name: string;
  tag: string;
  price: number;
  stock: number;
  desc: string;
  purity: string;
  category?: string;
}

export interface CatalogSummary {
  slug: string;
  name: string;
  category: string;
  description: string;
  researchAreas: string[];
  fromPrice: number | null;
  inStock: boolean;
  totalStock: number;
  variantCount: number;
  purchasableVariantCount: number;
  storefrontBadge?: 'none' | 'new_batch';
}

export interface CatalogDetail {
  entry: {
    slug: string;
    name: string;
    category: string;
    description: string;
    researchAreas: string[];
  };
  variants: StorefrontProduct[];
}

export interface CartItem extends StorefrontProduct {
  quantity: number;
}
