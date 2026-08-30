import { getSupabaseClient, isSupabaseConfigured, parseSupabaseError } from '../../../lib/supabase';
import { Comment } from '../types/comment.types';
import { mapCommentToDb, mapDbToComment } from './commentMapper';

export class CommentRepository {
  public static async getByComicId(comicId: string): Promise<{ data: Comment[]; error?: string }> {
    if (!isSupabaseConfigured()) return { data: [] };
    const client = getSupabaseClient();
    if (!client) return { data: [] };

    try {
      const { data, error } = await client
        .from('comments')
        .select('*')
        .eq('comic_id', comicId)
        .order('created_at', { ascending: false });

      if (error) {
        const parsed = parseSupabaseError(error);
        return { data: [], error: parsed.userFriendlyMessage };
      }

      return { data: (data || []).map(mapDbToComment) };
    } catch (err: any) {
      return { data: [], error: err?.message || 'Gagal memuat komentar' };
    }
  }

  public static async getAll(): Promise<{ data: Comment[]; error?: string }> {
    if (!isSupabaseConfigured()) return { data: [] };
    const client = getSupabaseClient();
    if (!client) return { data: [] };

    try {
      const { data, error } = await client
        .from('comments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        const parsed = parseSupabaseError(error);
        return { data: [], error: parsed.userFriendlyMessage };
      }

      return { data: (data || []).map(mapDbToComment) };
    } catch (err: any) {
      return { data: [], error: err?.message || 'Gagal memuat semua komentar' };
    }
  }

  public static async save(comment: Comment): Promise<{ success: boolean; error?: string; isConfigured: boolean }> {
    if (!isSupabaseConfigured()) return { success: false, isConfigured: false };
    const client = getSupabaseClient();
    if (!client) return { success: false, isConfigured: false };

    try {
      const row = mapCommentToDb(comment);
      const { error } = await client.from('comments').upsert(row, { onConflict: 'id' });
      if (error) {
        const parsed = parseSupabaseError(error);
        return { success: false, isConfigured: true, error: parsed.userFriendlyMessage };
      }
      return { success: true, isConfigured: true };
    } catch (err: any) {
      return { success: false, isConfigured: true, error: err?.message || 'Network error' };
    }
  }

  public static async delete(id: string): Promise<{ success: boolean; error?: string; isConfigured: boolean }> {
    if (!isSupabaseConfigured()) return { success: false, isConfigured: false };
    const client = getSupabaseClient();
    if (!client) return { success: false, isConfigured: false };

    try {
      const { error } = await client.from('comments').delete().eq('id', id);
      if (error) {
        const parsed = parseSupabaseError(error);
        return { success: false, isConfigured: true, error: parsed.userFriendlyMessage };
      }
      return { success: true, isConfigured: true };
    } catch (err: any) {
      return { success: false, isConfigured: true, error: err?.message || 'Network error' };
    }
  }
}
