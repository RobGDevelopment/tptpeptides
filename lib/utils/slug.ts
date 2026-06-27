export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function categorySlug(category: string): string {
  return slugify(category);
}

export function categoryFromSlug(slug: string, categories: string[]): string | undefined {
  return categories.find((category) => categorySlug(category) === slug);
}
