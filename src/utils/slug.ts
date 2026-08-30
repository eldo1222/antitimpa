/**
 * Slug generation and sanitation utilities
 */

export const generateSlug = (text?: string, fallbackId?: string): string => {
  if (!text && !fallbackId) return `comic-${Date.now()}`;
  const base = (text || '')
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (base && base.length > 0) return base;
  return `comic-${fallbackId ? String(fallbackId).replace(/[^a-zA-Z0-9_-]/g, '') : Date.now()}`;
};

export const sanitizeSlug = (slug: string): string => {
  return generateSlug(slug);
};
