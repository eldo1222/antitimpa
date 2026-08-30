import { getSupabaseClient, isSupabaseConfigured, parseSupabaseError } from '../../../lib/supabase';
import { DATABASE_TABLES, logDatabaseError } from '../../../services/database/databaseContract';
import { Chapter } from '../types/chapter.types';
import { mapChapterToDb, mapDbToChapter } from './chapterMapper';

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
        logDatabaseError({ table: DATABASE_TABLES.CHAPTERS, operation: 'SELECT', error });
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

  public static async save(comicId: string, chapter: Chapter): Promise<{ success: boolean; error?: string; isConfigured: boolean }> {
    if (!isSupabaseConfigured()) return { success: false, isConfigured: false };
    const client = getSupabaseClient();
    if (!client) return { success: false, isConfigured: false };

    try {
      const row = mapChapterToDb({ ...chapter, comicId });
      const { error } = await client.from(DATABASE_TABLES.CHAPTERS).upsert(row, { onConflict: 'id' });
      if (error) {
        logDatabaseError({ table: DATABASE_TABLES.CHAPTERS, operation: 'UPSERT', error, details: { chapterId: chapter.id, comicId } });
        const parsed = parseSupabaseError(error);
        return { success: false, isConfigured: true, error: parsed.userFriendlyMessage };
      }
      return { success: true, isConfigured: true };
    } catch (err: any) {
      logDatabaseError({ table: DATABASE_TABLES.CHAPTERS, operation: 'UPSERT', error: err, details: { chapterId: chapter.id, comicId } });
      return { success: false, isConfigured: true, error: err?.message || 'Network error' };
    }
  }

  public static async batchSave(chapters: Chapter[]): Promise<{ success: boolean; count: number; error?: string; isConfigured: boolean }> {
    if (chapters.length === 0) return { success: true, count: 0, isConfigured: true };
    if (!isSupabaseConfigured()) return { success: false, count: 0, isConfigured: false };
    const client = getSupabaseClient();
    if (!client) return { success: false, count: 0, isConfigured: false };

    try {
      const rows = chapters.map(ch => mapChapterToDb(ch));
      const CHUNK_SIZE = 50;
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        const { error } = await client.from(DATABASE_TABLES.CHAPTERS).upsert(chunk, { onConflict: 'id' });
        if (error) {
          logDatabaseError({ table: DATABASE_TABLES.CHAPTERS, operation: 'UPSERT', error, details: { chunkIndex: i, total: rows.length } });
          const parsed = parseSupabaseError(error);
          return { success: false, count: i, isConfigured: true, error: parsed.userFriendlyMessage };
        }
      }
      return { success: true, count: chapters.length, isConfigured: true };
    } catch (err: any) {
      logDatabaseError({ table: DATABASE_TABLES.CHAPTERS, operation: 'UPSERT', error: err, details: { total: chapters.length } });
      return { success: false, count: 0, isConfigured: true, error: err?.message || 'Network error' };
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
