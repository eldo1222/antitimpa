import { getSupabaseClient, isSupabaseConfigured, parseSupabaseError } from '../../../lib/supabase';
import { DATABASE_TABLES, logDatabaseError } from '../../../services/database/databaseContract';
import { Comment } from '../types/comment.types';
import { mapCommentToDb, mapDbToComment } from './commentMapper';

export class CommentRepository {
  public static async getByComicId(comicId: string): Promise<{ data: Comment[]; error?: string }> {
    if (!isSupabaseConfigured()) return { data: [] };
    const client = getSupabaseClient();
    if (!client) return { data: [] };

    try {
      const { data, error } = await client
        .from(DATABASE_TABLES.COMMENTS)
        .select('*')
        .eq('comic_id', comicId)
        .order('created_at', { ascending: false });

      if (error) {
        logDatabaseError({ table: DATABASE_TABLES.COMMENTS, operation: 'SELECT', error, details: { comicId } });
        const parsed = parseSupabaseError(error);
        return { data: [], error: parsed.userFriendlyMessage };
      }

      return { data: (data || []).map(mapDbToComment) };
    } catch (err: any) {
      logDatabaseError({ table: DATABASE_TABLES.COMMENTS, operation: 'SELECT', error: err, details: { comicId } });
      return { data: [], error: err?.message || 'Gagal memuat komentar' };
    }
  }

  public static async getAll(): Promise<{ data: Comment[]; error?: string }> {
    if (!isSupabaseConfigured()) return { data: [] };
    const client = getSupabaseClient();
    if (!client) return { data: [] };

    try {
      const { data, error } = await client
        .from(DATABASE_TABLES.COMMENTS)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logDatabaseError({ table: DATABASE_TABLES.COMMENTS, operation: 'SELECT', error });
        const parsed = parseSupabaseError(error);
        return { data: [], error: parsed.userFriendlyMessage };
      }

      return { data: (data || []).map(mapDbToComment) };
    } catch (err: any) {
      logDatabaseError({ table: DATABASE_TABLES.COMMENTS, operation: 'SELECT', error: err });
      return { data: [], error: err?.message || 'Gagal memuat semua komentar' };
    }
  }

  public static async save(comment: Comment): Promise<{ success: boolean; error?: string; isConfigured: boolean }> {
    if (!isSupabaseConfigured()) return { success: false, isConfigured: false };
    const client = getSupabaseClient();
    if (!client) return { success: false, isConfigured: false };

    try {
      const row = mapCommentToDb(comment);
      const { error } = await client.from(DATABASE_TABLES.COMMENTS).upsert(row, { onConflict: 'id' });
      if (error) {
        logDatabaseError({ table: DATABASE_TABLES.COMMENTS, operation: 'UPSERT', error, details: { commentId: comment.id } });
        const parsed = parseSupabaseError(error);
        return { success: false, isConfigured: true, error: parsed.userFriendlyMessage };
      }
      return { success: true, isConfigured: true };
    } catch (err: any) {
      logDatabaseError({ table: DATABASE_TABLES.COMMENTS, operation: 'UPSERT', error: err, details: { commentId: comment.id } });
      return { success: false, isConfigured: true, error: err?.message || 'Network error' };
    }
  }

  public static async delete(id: string): Promise<{ success: boolean; error?: string; isConfigured: boolean }> {
    if (!isSupabaseConfigured()) return { success: false, isConfigured: false };
    const client = getSupabaseClient();
    if (!client) return { success: false, isConfigured: false };

    try {
      const { error } = await client.from(DATABASE_TABLES.COMMENTS).delete().eq('id', id);
      if (error) {
        logDatabaseError({ table: DATABASE_TABLES.COMMENTS, operation: 'DELETE', error, details: { id } });
        const parsed = parseSupabaseError(error);
        return { success: false, isConfigured: true, error: parsed.userFriendlyMessage };
      }
      return { success: true, isConfigured: true };
    } catch (err: any) {
      logDatabaseError({ table: DATABASE_TABLES.COMMENTS, operation: 'DELETE', error: err, details: { id } });
      return { success: false, isConfigured: true, error: err?.message || 'Network error' };
    }
  }
}
