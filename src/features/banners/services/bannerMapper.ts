import { Banner } from '../types/banner.types';

export function mapBannerToDb(b: Partial<Banner>): Record<string, any> {
  const row: Record<string, any> = {};
  if (b.id !== undefined) row.id = b.id;
  if (b.title !== undefined) row.title = b.title;
  if (b.imageUrl !== undefined) row.image_url = b.imageUrl;
  if (b.targetComicId !== undefined) row.comic_id = b.targetComicId;
  if (b.isActive !== undefined) row.is_active = b.isActive;
  if (b.order !== undefined) row.order_index = b.order;
  row.created_at = new Date().toISOString();
  return row;
}

export function mapDbToBanner(b: Record<string, any>): Banner {
  return {
    id: b.id,
    title: b.title || '',
    subtitle: b.subtitle || 'Komik Populer Terupdate',
    imageUrl: b.image_url || '',
    targetComicId: b.comic_id || undefined,
    isActive: b.is_active !== false,
    order: b.order_index || 0,
  };
}
