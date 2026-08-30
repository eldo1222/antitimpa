import { getSupabaseClient, isSupabaseConfigured, parseSupabaseError } from '../../../lib/supabase';
import { DATABASE_TABLES, logDatabaseError } from '../../../services/database/databaseContract';
import { User } from '../types/user.types';
import { mapUserToDb, mapDbToUser } from './userMapper';

export class UserRepository {
  public static async getAll(): Promise<{ data: User[]; error?: string }> {
    if (!isSupabaseConfigured()) return { data: [] };
    const client = getSupabaseClient();
    if (!client) return { data: [] };

    try {
      const { data, error } = await client
        .from(DATABASE_TABLES.USERS)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logDatabaseError({ table: DATABASE_TABLES.USERS, operation: 'SELECT', error });
        const parsed = parseSupabaseError(error);
        return { data: [], error: parsed.userFriendlyMessage };
      }

      return { data: (data || []).map(mapDbToUser) };
    } catch (err: any) {
      logDatabaseError({ table: DATABASE_TABLES.USERS, operation: 'SELECT', error: err });
      return { data: [], error: err?.message || 'Gagal memuat pengguna' };
    }
  }

  public static async save(user: User): Promise<{ success: boolean; error?: string; isConfigured: boolean }> {
    if (!isSupabaseConfigured()) return { success: false, isConfigured: false };
    const client = getSupabaseClient();
    if (!client) return { success: false, isConfigured: false };

    try {
      const row = mapUserToDb(user);
      const { error } = await client.from(DATABASE_TABLES.USERS).upsert(row, { onConflict: 'id' });
      if (error) {
        logDatabaseError({ table: DATABASE_TABLES.USERS, operation: 'UPSERT', error, details: { userId: user.id, username: user.username } });
        const parsed = parseSupabaseError(error);
        return { success: false, isConfigured: true, error: parsed.userFriendlyMessage };
      }
      return { success: true, isConfigured: true };
    } catch (err: any) {
      logDatabaseError({ table: DATABASE_TABLES.USERS, operation: 'UPSERT', error: err, details: { userId: user.id, username: user.username } });
      return { success: false, isConfigured: true, error: err?.message || 'Network error' };
    }
  }

  public static async delete(id: string): Promise<{ success: boolean; error?: string; isConfigured: boolean }> {
    if (!isSupabaseConfigured()) return { success: false, isConfigured: false };
    const client = getSupabaseClient();
    if (!client) return { success: false, isConfigured: false };

    try {
      const { error } = await client.from(DATABASE_TABLES.USERS).delete().eq('id', id);
      if (error) {
        logDatabaseError({ table: DATABASE_TABLES.USERS, operation: 'DELETE', error, details: { id } });
        const parsed = parseSupabaseError(error);
        return { success: false, isConfigured: true, error: parsed.userFriendlyMessage };
      }
      return { success: true, isConfigured: true };
    } catch (err: any) {
      logDatabaseError({ table: DATABASE_TABLES.USERS, operation: 'DELETE', error: err, details: { id } });
      return { success: false, isConfigured: true, error: err?.message || 'Network error' };
    }
  }
}
