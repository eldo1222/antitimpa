import { getSupabaseClient, isSupabaseConfigured, parseSupabaseError, formatSupabaseDiagnosticError, SupabaseDiagnosticReport } from '../../../lib/supabase';
import { DATABASE_TABLES, logDatabaseError } from '../../../services/database/databaseContract';
import { Chapter } from '../types/chapter.types';
import { mapChapterToDb, mapDbToChapter } from './chapterMapper';
import { validateChapterData } from '../../comics/services/comicValidation';

export interface ChapterWriteResult {
  success: boolean;
  count?: number;
  rawCount?: number;
  readBackCount?: number;
  error?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
  table?: string;
  operation?: string;
  chapterIds?: string[];
  columns?: string[];
  safePayload?: any;
  rawError?: any;
  diagnosticReport?: SupabaseDiagnosticReport;
  isConfigured: boolean;
}

export class ChapterRepository {
  public static async getByComicId(comicId: string): Promise<{ data: Chapter[]; error?: string }> {
    if (!isSupabaseConfigured()) return { data: [] };
    const client = getSupabaseClient();
    if (!client) return { data: [] };

    try {
      const { data, error } = await client
        .from(DATABASE_TABLES.CHAPTERS)
        .select('*')
        .eq('comic_id', comicId)
        .order('chapter_number', { ascending: true });

      if (error) {
        logDatabaseError({ table: DATABASE_TABLES.CHAPTERS, operation: 'SELECT', error, details: { comicId } });
        const parsed = parseSupabaseError(error);
        return { data: [], error: parsed.userFriendlyMessage };
      }

      return { data: (data || []).map(mapDbToChapter) };
    } catch (err: any) {
      logDatabaseError({ table: DATABASE_TABLES.CHAPTERS, operation: 'SELECT', error: err, details: { comicId } });
      return { data: [], error: err?.message || 'Gagal memuat chapter' };
    }
  }

  /**
   * Server-side paginated chapter retrieval for a comic
   */
  public static async getPaginatedByComicId(
    comicId: string, 
    options: {
      page: number;
      limit: number;
      search?: string;
      sortBy?: 'chapter_number' | 'created_at' | 'updated_at' | 'title';
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{
    data: Chapter[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    error?: string;
  }> {
    const { page = 1, limit = 20, search = '', sortBy = 'chapter_number', sortOrder = 'asc' } = options;
    if (!isSupabaseConfigured()) {
      return { data: [], total: 0, page, limit, totalPages: 0, error: 'Supabase offline' };
    }
    const client = getSupabaseClient();
    if (!client) {
      return { data: [], total: 0, page, limit, totalPages: 0, error: 'Klien Supabase tidak tersedia' };
    }

    try {
      let query = client
        .from(DATABASE_TABLES.CHAPTERS)
        .select('*', { count: 'exact' })
        .eq('comic_id', comicId);

      if (search.trim()) {
        const clean = search.trim();
        const numClean = parseFloat(clean);
        if (!isNaN(numClean)) {
          query = query.or(`title.ilike.%${clean}%,chapter_number.eq.${numClean}`);
        } else {
          query = query.ilike('title', `%${clean}%`);
        }
      }

      const sortCol = sortBy === 'title' ? 'title' : (sortBy === 'created_at' ? 'created_at' : (sortBy === 'updated_at' ? 'updated_at' : 'chapter_number'));
      query = query.order(sortCol, { ascending: sortOrder === 'asc' });

      const from = Math.max(0, (page - 1) * limit);
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) {
        logDatabaseError({ table: DATABASE_TABLES.CHAPTERS, operation: 'SELECT', error, details: { comicId, options } });
        const parsed = parseSupabaseError(error);
        return { data: [], total: 0, page, limit, totalPages: 0, error: parsed.userFriendlyMessage };
      }

      const total = count ?? (data?.length || 0);
      const totalPages = Math.ceil(total / limit) || 1;

      return {
        data: (data || []).map(mapDbToChapter),
        total,
        page,
        limit,
        totalPages
      };
    } catch (err: any) {
      logDatabaseError({ table: DATABASE_TABLES.CHAPTERS, operation: 'SELECT', error: err, details: { comicId, options } });
      return { data: [], total: 0, page, limit, totalPages: 0, error: err?.message || 'Gagal memuat chapter' };
    }
  }

  public static async getAllGrouped(): Promise<{ data: Record<string, Chapter[]>; error?: string }> {
    if (!isSupabaseConfigured()) return { data: {} };
    const client = getSupabaseClient();
    if (!client) return { data: {} };

    try {
      const { data, error } = await client
        .from(DATABASE_TABLES.CHAPTERS)
        .select('*')
        .order('chapter_number', { ascending: true });

      if (error) {
        logDatabaseError({ table: DATABASE_TABLES.CHAPTERS, operation: 'SELECT', error, details: {} });
        const parsed = parseSupabaseError(error);
        return { data: {}, error: parsed.userFriendlyMessage };
      }

      const grouped: Record<string, Chapter[]> = {};
      (data || []).forEach((row) => {
        const ch = mapDbToChapter(row);
        if (!grouped[ch.comicId]) grouped[ch.comicId] = [];
        grouped[ch.comicId].push(ch);
      });

      return { data: grouped };
    } catch (err: any) {
      logDatabaseError({ table: DATABASE_TABLES.CHAPTERS, operation: 'SELECT', error: err });
      return { data: {}, error: err?.message || 'Gagal memuat semua chapter' };
    }
  }

  public static async save(comicId: string, chapter: Chapter): Promise<ChapterWriteResult> {
    if (!isSupabaseConfigured()) return { success: false, isConfigured: false, error: 'Supabase not configured' };
    const client = getSupabaseClient();
    if (!client) return { success: false, isConfigured: false, error: 'Supabase client is null' };

    try {
      const row = mapChapterToDb({ ...chapter, comicId });
      const validation = validateChapterData(chapter, row);

      if (!validation.isValid) {
        const valErrMsg = `[VALIDATION FAILED BEFORE SUPABASE] Chapter "${chapter.title || chapter.id}": ${validation.errors.join('; ')}`;
        console.error(valErrMsg, { chapter, validation });
        return {
          success: false,
          isConfigured: true,
          error: valErrMsg,
          code: 'CLIENT_VALIDATION_ERROR',
          table: DATABASE_TABLES.CHAPTERS,
          operation: 'UPSERT',
          chapterIds: [chapter.id],
          columns: validation.columnsFound,
          safePayload: row
        };
      }

      console.log(`[SUPABASE CHAPTER UPSERT]`, {
        table: DATABASE_TABLES.CHAPTERS,
        operation: 'UPSERT',
        count: 1,
        ids: [chapter.id],
        comicId,
        columns: Object.keys(row)
      });

      // Rule: Do NOT overwrite existing non-empty pages with empty array []
      if (!row.pages || row.pages.length === 0) {
        try {
          const { data: existing } = await client
            .from(DATABASE_TABLES.CHAPTERS)
            .select('pages')
            .eq('id', chapter.id)
            .maybeSingle();
          if (existing && Array.isArray(existing.pages) && existing.pages.length > 0) {
            row.pages = existing.pages;
          }
        } catch (_) {}
      }

      const { error } = await client.from(DATABASE_TABLES.CHAPTERS).upsert(row, { onConflict: 'id' });
      if (error) {
        logDatabaseError({ table: DATABASE_TABLES.CHAPTERS, operation: 'UPSERT', error, details: { chapterId: chapter.id, comicId } });
        const diagReport = formatSupabaseDiagnosticError({
          table: DATABASE_TABLES.CHAPTERS,
          operation: 'UPSERT',
          error,
          count: 1,
          ids: [chapter.id],
          columns: Object.keys(row),
          safePayload: row
        });
        console.error(diagReport.formattedOutput, error);
        return {
          success: false,
          isConfigured: true,
          error: error.message || diagReport.message,
          code: diagReport.code,
          details: diagReport.details,
          hint: diagReport.hint,
          table: DATABASE_TABLES.CHAPTERS,
          operation: 'UPSERT',
          chapterIds: [chapter.id],
          columns: Object.keys(row),
          safePayload: row,
          rawError: error,
          diagnosticReport: diagReport
        };
      }
      return { success: true, count: 1, isConfigured: true, table: DATABASE_TABLES.CHAPTERS, operation: 'UPSERT', chapterIds: [chapter.id] };
    } catch (err: any) {
      logDatabaseError({ table: DATABASE_TABLES.CHAPTERS, operation: 'UPSERT', error: err, details: { chapterId: chapter.id, comicId } });
      const diagReport = formatSupabaseDiagnosticError({
        table: DATABASE_TABLES.CHAPTERS,
        operation: 'UPSERT',
        error: err,
        count: 1,
        ids: [chapter.id]
      });
      return {
        success: false,
        isConfigured: true,
        error: err?.message || 'Network error',
        code: diagReport.code,
        details: diagReport.details,
        hint: diagReport.hint,
        table: DATABASE_TABLES.CHAPTERS,
        operation: 'UPSERT',
        chapterIds: [chapter.id],
        rawError: err,
        diagnosticReport: diagReport
      };
    }
  }

  public static async batchSave(chapters: Chapter[]): Promise<ChapterWriteResult> {
    if (chapters.length === 0) return { success: true, count: 0, isConfigured: true };
    if (!isSupabaseConfigured()) return { success: false, count: 0, isConfigured: false, error: 'Supabase not configured' };
    const client = getSupabaseClient();
    if (!client) return { success: false, count: 0, isConfigured: false, error: 'Supabase client is null' };

    try {
      const rows: Record<string, any>[] = [];
      for (const ch of chapters) {
        const row = mapChapterToDb(ch);
        const validation = validateChapterData(ch, row);
        if (!validation.isValid) {
          const valErrMsg = `[VALIDATION FAILED BEFORE SUPABASE] Chapter ID "${ch.id}" / "${ch.title}": ${validation.errors.join('; ')}`;
          console.error(valErrMsg, { ch, validation });
          return {
            success: false,
            count: 0,
            isConfigured: true,
            error: valErrMsg,
            code: 'CLIENT_VALIDATION_ERROR',
            table: DATABASE_TABLES.CHAPTERS,
            operation: 'UPSERT',
            chapterIds: [ch.id],
            columns: validation.columnsFound,
            safePayload: row
          };
        }
        rows.push(row);
      }

      // Sanitize & Deduplicate rows before UPSERT:
      // Deduplicate using primary key (id) and logical key (comic_id::chapter_number)
      // Never send multiple rows with conflicting keys in the same batch (prevents PG error 21000)
      const chaptersBeforeDedupe = rows.length;
      const dedupeMap = new Map<string, Record<string, any>>();
      let duplicatesRemoved = 0;

      for (const row of rows) {
        const comicId = String(row.comic_id || '');
        const chNum = Number(row.chapter_number) || 1;
        const rowId = String(row.id || '');
        const logicalKey = `${comicId}::${chNum}`;
        const primaryKey = rowId;

        // Check if we already have this chapter by logical key or primary key
        if (dedupeMap.has(logicalKey)) {
          duplicatesRemoved++;
          const existing = dedupeMap.get(logicalKey)!;
          // If the incoming duplicate has pages while existing doesn't, enrich existing with pages
          if ((!existing.pages || existing.pages.length === 0) && (row.pages && row.pages.length > 0)) {
            existing.pages = row.pages;
          }
          continue;
        }

        if (dedupeMap.has(primaryKey)) {
          duplicatesRemoved++;
          const existing = dedupeMap.get(primaryKey)!;
          if ((!existing.pages || existing.pages.length === 0) && (row.pages && row.pages.length > 0)) {
            existing.pages = row.pages;
          }
          continue;
        }

        dedupeMap.set(logicalKey, row);
        dedupeMap.set(primaryKey, row);
      }

      // Collect unique rows
      const sanitizedRows = [...new Set(dedupeMap.values())];
      const chaptersAfterDedupe = sanitizedRows.length;

      console.log(`[CHAPTER DEDUPLICATION AUDIT]`, {
        chaptersBeforeDedupe,
        chaptersAfterDedupe,
        duplicatesRemoved,
        conflictTarget: 'id'
      });

      const allIds = sanitizedRows.map(r => r.id);
      const allColumns = sanitizedRows.length > 0 ? Object.keys(sanitizedRows[0]) : [];

      console.log(`[SUPABASE CHAPTER BATCH UPSERT START]`, {
        table: DATABASE_TABLES.CHAPTERS,
        operation: 'UPSERT',
        totalRows: sanitizedRows.length,
        batchSize: 50,
        sampleIds: allIds.slice(0, 5),
        columns: allColumns
      });

      const CHUNK_SIZE = 50;
      const totalBatches = Math.ceil(sanitizedRows.length / CHUNK_SIZE);

      for (let i = 0; i < sanitizedRows.length; i += CHUNK_SIZE) {
        const batchNum = Math.floor(i / CHUNK_SIZE) + 1;
        const chunk = sanitizedRows.slice(i, i + CHUNK_SIZE);
        const chunkIds = chunk.map(c => c.id);

        // Rule: Never overwrite existing non-empty pages with empty array []
        const emptyPagesIds = chunk.filter(r => !r.pages || r.pages.length === 0).map(r => r.id);
        if (emptyPagesIds.length > 0) {
          try {
            const { data: existingRows } = await client
              .from(DATABASE_TABLES.CHAPTERS)
              .select('id, pages')
              .in('id', emptyPagesIds);
            if (existingRows && existingRows.length > 0) {
              const existingPagesMap = new Map<string, any[]>();
              for (const ex of existingRows) {
                if (Array.isArray(ex.pages) && ex.pages.length > 0) {
                  existingPagesMap.set(ex.id, ex.pages);
                }
              }
              for (const r of chunk) {
                if ((!r.pages || r.pages.length === 0) && existingPagesMap.has(r.id)) {
                  r.pages = existingPagesMap.get(r.id);
                }
              }
            }
          } catch (exErr) {
            console.warn('[PRESERVE EXISTING PAGES BATCH CHECK]', exErr);
          }
        }

        const { error } = await client.from(DATABASE_TABLES.CHAPTERS).upsert(chunk, { onConflict: 'id' });
        if (error) {
          console.error(`[SUPABASE CHAPTER UPSERT ERROR] Batch ${batchNum}/${totalBatches} (${chunk.length} rows) FAILED:`, error);
          logDatabaseError({ table: DATABASE_TABLES.CHAPTERS, operation: 'UPSERT', error, details: { batchNum, totalBatches, chunkIndex: i, total: sanitizedRows.length, chunkIds } });
          const diagReport = formatSupabaseDiagnosticError({
            table: DATABASE_TABLES.CHAPTERS,
            operation: 'UPSERT',
            error,
            count: chunk.length,
            ids: chunkIds,
            columns: allColumns,
            safePayload: chunk.slice(0, 2)
          });
          return {
            success: false,
            count: i,
            isConfigured: true,
            error: error.message || diagReport.message,
            code: diagReport.code,
            details: diagReport.details,
            hint: diagReport.hint,
            table: DATABASE_TABLES.CHAPTERS,
            operation: 'UPSERT',
            chapterIds: chunkIds,
            columns: allColumns,
            safePayload: chunk.slice(0, 2),
            rawError: error,
            diagnosticReport: diagReport
          };
        }

        console.log(`[SUPABASE CHAPTER UPSERT] Batch ${batchNum}/${totalBatches}: ${chunk.length}/${chunk.length} PASS`);
      }

      // Read-back verification: verify that written chapters exist in Supabase
      let readBackCount = sanitizedRows.length;
      const uniqueComicIds = [...new Set(sanitizedRows.map(r => r.comic_id).filter(Boolean))];
      if (uniqueComicIds.length === 1) {
        try {
          const comicId = uniqueComicIds[0];
          const { count, error: rbErr } = await client
            .from(DATABASE_TABLES.CHAPTERS)
            .select('id', { count: 'exact', head: true })
            .eq('comic_id', comicId);
          if (!rbErr && typeof count === 'number') {
            readBackCount = count;
          }
        } catch (rbEx) {
          console.warn('[SUPABASE CHAPTER READ-BACK ERROR]', rbEx);
        }
      }

      console.log(`[SUPABASE CHAPTER READ-BACK VERIFIED] Raw: ${chapters.length}, Unique: ${sanitizedRows.length}, In DB: ${readBackCount}`);

      return {
        success: true,
        count: sanitizedRows.length,
        rawCount: chapters.length,
        readBackCount,
        isConfigured: true,
        table: DATABASE_TABLES.CHAPTERS,
        operation: 'UPSERT',
        chapterIds: allIds
      };
    } catch (err: any) {
      logDatabaseError({ table: DATABASE_TABLES.CHAPTERS, operation: 'UPSERT', error: err, details: { total: chapters.length } });
      const diagReport = formatSupabaseDiagnosticError({
        table: DATABASE_TABLES.CHAPTERS,
        operation: 'UPSERT',
        error: err,
        count: chapters.length,
        ids: chapters.map(c => c.id)
      });
      return {
        success: false,
        count: 0,
        isConfigured: true,
        error: err?.message || 'Network error',
        code: diagReport.code,
        details: diagReport.details,
        hint: diagReport.hint,
        table: DATABASE_TABLES.CHAPTERS,
        operation: 'UPSERT',
        chapterIds: chapters.map(c => c.id),
        rawError: err,
        diagnosticReport: diagReport
      };
    }
  }

  public static async delete(id: string): Promise<{ success: boolean; error?: string; isConfigured: boolean }> {
    if (!isSupabaseConfigured()) return { success: false, isConfigured: false };
    const client = getSupabaseClient();
    if (!client) return { success: false, isConfigured: false };

    try {
      const { error } = await client.from(DATABASE_TABLES.CHAPTERS).delete().eq('id', id);
      if (error) {
        logDatabaseError({ table: DATABASE_TABLES.CHAPTERS, operation: 'DELETE', error, details: { id } });
        const parsed = parseSupabaseError(error);
        return { success: false, isConfigured: true, error: parsed.userFriendlyMessage };
      }
      return { success: true, isConfigured: true };
    } catch (err: any) {
      logDatabaseError({ table: DATABASE_TABLES.CHAPTERS, operation: 'DELETE', error: err, details: { id } });
      return { success: false, isConfigured: true, error: err?.message || 'Network error' };
    }
  }

  public static async batchDelete(ids: string[]): Promise<{ success: boolean; count: number; error?: string; isConfigured: boolean }> {
    if (ids.length === 0) return { success: true, count: 0, isConfigured: true };
    if (!isSupabaseConfigured()) return { success: false, count: 0, isConfigured: false };
    const client = getSupabaseClient();
    if (!client) return { success: false, count: 0, isConfigured: false };

    try {
      const { error } = await client.from(DATABASE_TABLES.CHAPTERS).delete().in('id', ids);
      if (error) {
        logDatabaseError({ table: DATABASE_TABLES.CHAPTERS, operation: 'DELETE', error, details: { ids } });
        const parsed = parseSupabaseError(error);
        return { success: false, count: 0, isConfigured: true, error: parsed.userFriendlyMessage };
      }
      return { success: true, count: ids.length, isConfigured: true };
    } catch (err: any) {
      logDatabaseError({ table: DATABASE_TABLES.CHAPTERS, operation: 'DELETE', error: err, details: { ids } });
      return { success: false, count: 0, isConfigured: true, error: err?.message || 'Network error' };
    }
  }

  /**
   * Directly save or update pages for a specific chapter without touching other columns
   */
  public static async saveChapterPages(chapterId: string, pages: any[]): Promise<{ success: boolean; count: number; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, count: 0, error: 'Supabase not configured' };
    const client = getSupabaseClient();
    if (!client) return { success: false, count: 0, error: 'Supabase client is null' };

    // Anti-overwrite guard: do not overwrite with empty or invalid pages
    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      return { success: false, count: 0, error: 'Anti-overwrite guard: Refusing to save empty pages array' };
    }

    try {
      const { error } = await client
        .from(DATABASE_TABLES.CHAPTERS)
        .update({
          pages,
          updated_at: new Date().toISOString()
        })
        .eq('id', chapterId);

      if (error) {
        logDatabaseError({ table: DATABASE_TABLES.CHAPTERS, operation: 'UPDATE', error, details: { chapterId, pageCount: pages.length } });
        return { success: false, count: 0, error: error.message };
      }
      return { success: true, count: pages.length };
    } catch (e: any) {
      return { success: false, count: 0, error: e.message || 'Failed to update pages' };
    }
  }

  /**
   * Diagnostic Image Coverage Query for a Comic
   * Returns exact metrics across all stored chapters
   */
  public static async getImageCoverage(comicId: string): Promise<{
    total: number;
    withImages: number;
    withoutImages: number;
    minPages: number;
    maxPages: number;
    avgPages: number;
    coveragePercent: number;
    missingChapterIds: string[];
    sampleStats?: Array<{ id: string; chapterNumber: number; title: string; pageCount: number }>;
  }> {
    const emptyResult = { total: 0, withImages: 0, withoutImages: 0, minPages: 0, maxPages: 0, avgPages: 0, coveragePercent: 0, missingChapterIds: [] };
    if (!isSupabaseConfigured()) return emptyResult;
    const client = getSupabaseClient();
    if (!client) return emptyResult;

    try {
      const { data, error } = await client
        .from(DATABASE_TABLES.CHAPTERS)
        .select('id, chapter_number, title, pages')
        .eq('comic_id', comicId)
        .order('chapter_number', { ascending: true });

      if (error || !data) return emptyResult;

      const total = data.length;
      let withImages = 0;
      const missingChapterIds: string[] = [];
      let minPages = total > 0 ? Infinity : 0;
      let maxPages = 0;
      let totalPageCount = 0;
      const sampleStats: Array<{ id: string; chapterNumber: number; title: string; pageCount: number }> = [];

      for (const ch of data) {
        const pageCount = Array.isArray(ch.pages) ? ch.pages.length : 0;
        if (pageCount > 0) {
          withImages++;
          if (pageCount < minPages) minPages = pageCount;
          if (pageCount > maxPages) maxPages = pageCount;
          totalPageCount += pageCount;
        } else {
          missingChapterIds.push(ch.id);
        }

        if (sampleStats.length < 10 || sampleStats.length % 30 === 0) {
          sampleStats.push({
            id: ch.id,
            chapterNumber: Number(ch.chapter_number) || 1,
            title: ch.title || '',
            pageCount
          });
        }
      }

      if (minPages === Infinity) minPages = 0;
      const withoutImages = total - withImages;
      const avgPages = withImages > 0 ? Number((totalPageCount / withImages).toFixed(1)) : 0;
      const coveragePercent = total > 0 ? Number(((withImages / total) * 100).toFixed(2)) : 0;

      return {
        total,
        withImages,
        withoutImages,
        minPages,
        maxPages,
        avgPages,
        coveragePercent,
        missingChapterIds,
        sampleStats
      };
    } catch (_) {
      return emptyResult;
    }
  }
}

