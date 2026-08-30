import { Comic } from '../types/comic.types';
import { generateSlug } from '../../../utils/slug';

function safeIsoDate(val?: string | number | Date): string {
  if (!val) return new Date().toISOString();
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch (_) {}
  return new Date().toISOString();
}

export function mapComicToDb(c: Partial<Comic>): Record<string, any> {
  const row: Record<string, any> = {};
  if (c.id !== undefined) row.id = c.id;
  if (c.title !== undefined) row.title = c.title || 'Untitled';
  
  const explicitSlug = typeof c.slug === 'string' ? c.slug.trim() : '';
  row.slug = explicitSlug || generateSlug(c.title || c.id || '');

  if (c.coverImage !== undefined) row.cover_image = c.coverImage;
  if (c.bannerImage !== undefined) row.banner_image = c.bannerImage;
  if (c.synopsis !== undefined) row.synopsis = c.synopsis;
  if (c.genres !== undefined) row.genres = Array.isArray(c.genres) ? c.genres : [];
  if (c.status !== undefined) row.status = c.status || 'ongoing';
  if (c.comicType !== undefined) row.comic_type = c.comicType || 'manga';
  if (c.contentType !== undefined) row.content_type = c.contentType || 'normal';
  if (c.storyWriter !== undefined) row.story_writer = c.storyWriter || '';
  if (c.artist !== undefined) row.artist = c.artist || '';
  if (c.rating !== undefined) row.rating = Number(c.rating) || 0;
  if (c.ratingCount !== undefined) row.rating_count = Number(c.ratingCount) || 0;
  if (c.totalChapters !== undefined) row.total_chapters = Number(c.totalChapters) || 0;
  if (c.totalReaders !== undefined) row.total_readers = Number(c.totalReaders) || 0;
  if (c.isFree !== undefined) row.is_free = c.isFree;
  if (c.isFeatured !== undefined) row.is_featured = Boolean(c.isFeatured);
  if (c.isPublished !== undefined) row.is_published = c.isPublished !== false;
  if (c.isVisibleOnHome !== undefined) row.is_visible_on_home = c.isVisibleOnHome !== false;
  row.created_at = safeIsoDate(c.createdAt);
  row.updated_at = safeIsoDate(c.updatedAt);
  if (c.sourceApi !== undefined) row.source_api = c.sourceApi;
  return row;
}

export function mapDbToComic(row: Record<string, any>): Comic {
  return {
    id: row.id,
    title: row.title || '',
    slug: row.slug || '',
    coverImage: row.cover_image || '',
    bannerImage: row.banner_image || '',
    synopsis: row.synopsis || '',
    genres: Array.isArray(row.genres) ? row.genres : [],
    status: row.status || 'ongoing',
    comicType: row.comic_type || 'manga',
    contentType: row.content_type || 'normal',
    storyWriter: row.story_writer || '',
    artist: row.artist || '',
    rating: Number(row.rating) || 0,
    ratingCount: Number(row.rating_count) || 0,
    totalChapters: Number(row.total_chapters) || 0,
    totalReaders: Number(row.total_readers) || 0,
    isFree: row.is_free !== false,
    isFeatured: Boolean(row.is_featured),
    isPublished: row.is_published !== false,
    isVisibleOnHome: row.is_visible_on_home !== false,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
    sourceApi: row.source_api || 'manual',
  };
}
