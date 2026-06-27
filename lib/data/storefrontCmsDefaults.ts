import type { CategoryMerchandising } from '../schemas/storefrontCms';
import { getCatalogCategories } from '../catalog';

export {
  DEFAULT_HOMEPAGE,
  DEFAULT_PROTOCOLS,
  DEFAULT_RESEARCH_ARTICLES,
  DEFAULT_SITE_SETTINGS,
  CMS_FOOTER_LEGAL,
} from './storefrontCmsStaticDefaults';

export function buildDefaultCategoryMerchandising(): CategoryMerchandising {
  return {
    categories: getCatalogCategories().map((catalogCategory, index) => ({
      catalogCategory,
      displayName: catalogCategory,
      sortOrder: index,
      visible: true,
    })),
  };
}
