// Mirrors the backend's slugify() (dearlavion-store-engine/src/common/schema.util.ts) exactly —
// used anywhere a display name needs to become a stable, URL-safe id (Product._id, SavedKit._id).
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
