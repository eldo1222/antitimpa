import { getSupabaseClient, isSupabaseConfigured, parseSupabaseError, formatSupabaseDiagnosticError, SupabaseDiagnosticReport } from '../../../lib/supabase';
import { DATABASE_TABLES, logDatabaseError } from '../../../services/database/databaseContract';
import { Chapter } from '../types/chapter.types';
import { mapChapterToDb, mapDbToChapter } from './chapterMapper';
import { validateChapterData } from '../../comics/services/comicValidation';

export interface ChapterWriteResult {
  success: boolean;
  count?: number;
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

      const allIds = chapters.map(ch => ch.id);
      const allColumns = rows.length > 0 ? Object.keys(rows[0]) : [];

      console.log(`[SUPABASE CHAPTER UPSERT]`, {
        table: DATABASE_TABLES.CHAPTERS,
        operation: 'UPSERT',
        count: rows.length,
        ids: allIds.slice(0, 10),
        columns: allColumns
      });

      const CHUNK_SIZE = 50;
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        const chunkIds = chapters.slice(i, i + CHUNK_SIZE).map(c => c.id);
        const { error } = await client.from(DATABASE_TABLES.CHAPTERS).upsert(chunk, { onConflict: 'id' });
        if (error) {
          logDatabaseError({ table: DATABASE_TABLES.CHAPTERS, operation: 'UPSERT', error, details: { chunkIndex: i, total: rows.length, chunkIds } });
          const diagReport = formatSupabaseDiagnosticError({
            table: DATABASE_TABLES.CHAPTERS,
            operation: 'UPSERT',
            error,
            count: chunk.length,
            ids: chunkIds,
            columns: allColumns,
            safePayload: chunk.slice(0, 2)
          });
          console.error(diagReport.formattedOutput, error);
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
      }
      return { success: true, count: chapters.length, isConfigured: true, table: DATABASE_TABLES.CHAPTERS, operation: 'UPSERT', chapterIds: allIds };
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
}

