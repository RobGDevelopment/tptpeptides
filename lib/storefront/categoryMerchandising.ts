import type { CategoryMerchandising } from '../schemas/storefrontCms';

export function resolveCategoryDisplayName(
  catalogCategory: string,
  merchandising: CategoryMerchandising
): string {
  const match = merchandising.categories.find((item) => item.catalogCategory === catalogCategory);
  if (match && match.visible) return match.displayName;
  return catalogCategory;
}

export function sortCatalogCategories(
  categories: string[],
  merchandising: CategoryMerchandising
): string[] {
  const orderMap = new Map(
    merchandising.categories.map((item) => [item.catalogCategory, item.sortOrder])
  );
  const visible = new Set(
    merchandising.categories.filter((item) => item.visible).map((item) => item.catalogCategory)
  );

  return [...categories]
    .filter((category) => visible.size === 0 || visible.has(category))
    .sort((a, b) => {
      const orderA = orderMap.get(a) ?? 999;
      const orderB = orderMap.get(b) ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return a.localeCompare(b);
    });
}
