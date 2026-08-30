import { getSupabaseClient, isSupabaseConfigured, parseSupabaseError } from '../../../lib/supabase';
import { Comic } from '../types/comic.types';
import { mapComicToDb, mapDbToComic } from './comicMapper';

export class ComicRepository {
  public static async getAll(): Promise<{ data: Comic[]; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { data: [] };
    }
    const client = getSupabaseClient();
    if (!client) return { data: [] };

    try {
      const { data, error } = await client
        .from('comics')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        const parsed = parseSupabaseError(error);
        return { data: [], error: parsed.userFriendlyMessage };
      }

      return { data: (data || []).map(mapDbToComic) };
    } catch (err: any) {
      return { data: [], error: err?.message || 'Gagal memuat komik' };
    }
  }

  public static async getById(id: string): Promise<{ data: Comic | null; error?: string }> {
    if (!isSupabaseConfigured()) return { data: null };
    const client = getSupabaseClient();
    if (!client) return { data: null };

    try {
      const { data, error } = await client
        .from('comics')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        const parsed = parseSupabaseError(error);
        return { data: null, error: parsed.userFriendlyMessage };
      }

      return { data: data ? mapDbToComic(data) : null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal memuat komik' };
    }
  }

  public static async save(comic: Comic): Promise<{ success: boolean; error?: string; isConfigured: boolean }> {
    if (!isSupabaseConfigured()) {
      return { success: false, isConfigured: false, error: 'Supabase credentials not configured' };
    }
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, isConfigured: false, error: 'Supabase client is null' };
    }

    try {
      const row = mapComicToDb(comic);
      const { error } = await client.from('comics').upsert(row, { onConflict: 'id' });
      if (error) {
        const parsed = parseSupabaseError(error);
        return { success: false, isConfigured: true, error: parsed.userFriendlyMessage };
      }
      return { success: true, isConfigured: true };
    } catch (err: any) {
      return { success: false, isConfigured: true, error: err?.message || 'Network / fetch error' };
    }
  }

  public static async batchSave(comics: Comic[]): Promise<{ success: boolean; count: number; error?: string; isConfigured: boolean }> {
    if (comics.length === 0) return { success: true, count: 0, isConfigured: true };
    if (!isSupabaseConfigured()) {
      return { success: false, count: 0, isConfigured: false, error: 'Supabase not configured' };
    }
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, count: 0, isConfigured: false, error: 'Supabase client is null' };
    }

    try {
      const rows = comics.map(mapComicToDb);
      const CHUNK_SIZE = 50;
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        const { error } = await client.from('comics').upsert(chunk, { onConflict: 'id' });
        if (error) {
          const parsed = parseSupabaseError(error);
          return { success: false, count: i, isConfigured: true, error: parsed.userFriendlyMessage };
        }
      }
      return { success: true, count: comics.length, isConfigured: true };
    } catch (err: any) {
      return { success: false, count: 0, isConfigured: true, error: err?.message || 'Network error' };
    }
  }

  public static async delete(id: string): Promise<{ success: boolean; error?: string; isConfigured: boolean }> {
    if (!isSupabaseConfigured()) return { success: false, isConfigured: false };
    const client = getSupabaseClient();
    if (!client) return { success: false, isConfigured: false };

    try {
      await client.from('chapters').delete().eq('comic_id', id);
      const { error } = await client.from('comics').delete().eq('id', id);
      if (error) {
        const parsed = parseSupabaseError(error);
        return { success: false, isConfigured: true, error: parsed.userFriendlyMessage };
      }
      return { success: true, isConfigured: true };
    } catch (err: any) {
      return { success: false, isConfigured: true, error: err?.message || 'Network error' };
    }
  }

  public static async batchDelete(ids: string[]): Promise<{ success: boolean; count: number; error?: string; isConfigured: boolean }> {
    if (ids.length === 0) return { success: true, count: 0, isConfigured: true };
    if (!isSupabaseConfigured()) return { success: false, count: 0, isConfigured: false };
    const client = getSupabaseClient();
    if (!client) return { success: false, count: 0, isConfigured: false };

    try {
      await client.from('chapters').delete().in('comic_id', ids);
      const { error } = await client.from('comics').delete().in('id', ids);
      if (error) {
        const parsed = parseSupabaseError(error);
        return { success: false, count: 0, isConfigured: true, error: parsed.userFriendlyMessage };
      }
      return { success: true, count: ids.length, isConfigured: true };
    } catch (err: any) {
      return { success: false, count: 0, isConfigured: true, error: err?.message || 'Network error' };
    }
  }
}
