import { Chapter } from '../types/chapter.types';

function safeIsoDate(val?: string | number | Date): string {
  if (!val) return new Date().toISOString();
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch (_) {}
  return new Date().toISOString();
}

export function mapChapterToDb(ch: Partial<Chapter> & { parentComicId?: string }): Record<string, any> {
  const row: Record<string, any> = {};
  if (ch.id !== undefined) row.id = ch.id;
  if (ch.comicId !== undefined || ch.parentComicId !== undefined) {
    row.comic_id = ch.comicId || ch.parentComicId;
  }
  if (ch.chapterNumber !== undefined) row.chapter_number = Number(ch.chapterNumber) || 1;
  if (ch.title !== undefined) row.title = ch.title || `Chapter ${ch.chapterNumber || 1}`;
  if (ch.releaseDate !== undefined) row.release_date = ch.releaseDate;
  if (ch.isLocked !== undefined) row.is_locked = Boolean(ch.isLocked);
  if (ch.sourceType !== undefined) row.source_type = ch.sourceType || 'images';
  if (ch.pages !== undefined) row.pages = Array.isArray(ch.pages) ? ch.pages : [];
  if (ch.driveFileId !== undefined) row.drive_file_id = ch.driveFileId;
  if (ch.driveEmbedUrl !== undefined) row.drive_embed_url = ch.driveEmbedUrl;
  if (ch.driveAccountId !== undefined) row.drive_account_id = ch.driveAccountId;
  if (ch.viewsCount !== undefined) row.views_count = Number(ch.viewsCount) || 0;
  row.created_at = safeIsoDate(ch.createdAt);
  row.updated_at = safeIsoDate(ch.updatedAt);
  return row;
}

export function mapDbToChapter(row: Record<string, any>): Chapter {
  return {
    id: row.id,
    comicId: row.comic_id || '',
    chapterNumber: Number(row.chapter_number) || 1,
    title: row.title || '',
    releaseDate: row.release_date || new Date().toISOString(),
    isLocked: Boolean(row.is_locked),
    sourceType: row.source_type || 'images',
    pages: Array.isArray(row.pages) ? row.pages : [],
    driveFileId: row.drive_file_id || undefined,
    driveEmbedUrl: row.drive_embed_url || undefined,
    driveAccountId: row.drive_account_id || undefined,
    viewsCount: Number(row.views_count) || 0,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}
