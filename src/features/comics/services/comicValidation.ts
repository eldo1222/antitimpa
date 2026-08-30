import { Comic } from '../types/comic.types';
import { Chapter } from '../../chapters/types/chapter.types';

export const KNOWN_COMIC_DB_COLUMNS = [
  'id',
  'title',
  'slug',
  'cover_image',
  'banner_image',
  'synopsis',
  'genres',
  'status',
  'comic_type',
  'content_type',
  'story_writer',
  'artist',
  'rating',
  'rating_count',
  'total_chapters',
  'total_readers',
  'is_free',
  'is_vip',
  'is_featured',
  'is_slider',
  'is_published',
  'is_visible_on_home',
  'created_at',
  'updated_at',
  'source_api'
] as const;

export const KNOWN_CHAPTER_DB_COLUMNS = [
  'id',
  'comic_id',
  'chapter_number',
  'title',
  'slug',
  'release_date',
  'price',
  'is_free',
  'is_locked',
  'is_vip',
  'source_type',
  'pages',
  'drive_file_id',
  'drive_embed_url',
  'drive_account_id',
  'views_count',
  'created_at',
  'updated_at'
] as const;

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedRow?: Record<string, any>;
  columnsFound: string[];
  unknownColumns: string[];
}

/**
 * Validates a Comic payload against the PostgreSQL schema rules before attempting Supabase write.
 */
export function validateComicData(comic: Partial<Comic>, dbRow: Record<string, any>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Mandatory Identifier & Title checks
  if (!comic.id || typeof comic.id !== 'string' || comic.id.trim() === '') {
    errors.push('id is empty or not a valid string');
  }
  if (!comic.title || typeof comic.title !== 'string' || comic.title.trim() === '') {
    errors.push('title is empty or not a valid string');
  }
  if (!dbRow.slug || typeof dbRow.slug !== 'string' || dbRow.slug.trim() === '') {
    errors.push('slug is empty or not a valid string');
  }

  // 2. Numeric checks
  if (dbRow.rating !== undefined && (typeof dbRow.rating !== 'number' || isNaN(dbRow.rating))) {
    errors.push(`rating is not a valid number (received: ${dbRow.rating})`);
  }
  if (dbRow.total_chapters !== undefined && (typeof dbRow.total_chapters !== 'number' || isNaN(dbRow.total_chapters))) {
    errors.push(`total_chapters is not a valid number (received: ${dbRow.total_chapters})`);
  }

  // 3. Array & Boolean checks
  if (dbRow.genres !== undefined && !Array.isArray(dbRow.genres)) {
    errors.push('genres must be a valid array');
  }
  if (dbRow.is_free !== undefined && typeof dbRow.is_free !== 'boolean') {
    errors.push(`is_free must be a boolean (received: ${typeof dbRow.is_free})`);
  }
  if (dbRow.is_published !== undefined && typeof dbRow.is_published !== 'boolean') {
    errors.push(`is_published must be a boolean (received: ${typeof dbRow.is_published})`);
  }
  if (dbRow.is_visible_on_home !== undefined && typeof dbRow.is_visible_on_home !== 'boolean') {
    errors.push(`is_visible_on_home must be a boolean (received: ${typeof dbRow.is_visible_on_home})`);
  }

  // 4. Timestamp validity check
  if (dbRow.created_at) {
    const d = new Date(dbRow.created_at);
    if (isNaN(d.getTime())) {
      errors.push(`created_at is not a valid ISO timestamp (received: ${dbRow.created_at})`);
    }
  }
  if (dbRow.updated_at) {
    const d = new Date(dbRow.updated_at);
    if (isNaN(d.getTime())) {
      errors.push(`updated_at is not a valid ISO timestamp (received: ${dbRow.updated_at})`);
    }
  }

  // 5. Check row columns against known schema
  const rowColumns = Object.keys(dbRow);
  const unknownCols = rowColumns.filter(c => !KNOWN_COMIC_DB_COLUMNS.includes(c as any));
  if (unknownCols.length > 0) {
    warnings.push(`Payload contains columns not in schema: ${unknownCols.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    columnsFound: rowColumns,
    unknownColumns: unknownCols,
    sanitizedRow: dbRow
  };
}

/**
 * Validates a Chapter payload against the PostgreSQL schema rules.
 */
export function validateChapterData(chapter: Partial<Chapter>, dbRow: Record<string, any>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!chapter.id || typeof chapter.id !== 'string' || chapter.id.trim() === '') {
    errors.push('chapter id is empty or not a string');
  }
  if (!dbRow.comic_id || typeof dbRow.comic_id !== 'string' || dbRow.comic_id.trim() === '') {
    errors.push('comic_id is empty or not a string');
  }
  if (dbRow.chapter_number === undefined || typeof dbRow.chapter_number !== 'number' || isNaN(dbRow.chapter_number)) {
    errors.push(`chapter_number is not a valid number (received: ${dbRow.chapter_number})`);
  }
  if (dbRow.pages !== undefined && !Array.isArray(dbRow.pages)) {
    errors.push('pages must be an array');
  }

  const rowColumns = Object.keys(dbRow);
  const unknownCols = rowColumns.filter(c => !KNOWN_CHAPTER_DB_COLUMNS.includes(c as any));
  if (unknownCols.length > 0) {
    warnings.push(`Chapter payload contains unknown columns: ${unknownCols.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    columnsFound: rowColumns,
    unknownColumns: unknownCols,
    sanitizedRow: dbRow
  };
}
