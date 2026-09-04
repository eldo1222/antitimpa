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
      let { error } = await client.from(DATABASE_TABLES.USERS).upsert(row, { onConflict: 'id' });
      
      // If error indicates column does not exist or schema issue, retry with standard base columns
      if (error && (error.message?.includes('column') || (error as any).code === '42703' || error.message?.includes('does not exist'))) {
        const baseRow: Record<string, any> = {
          id: row.id,
          username: row.username,
          email: row.email,
          role: row.role || 'reader',
          package_type: row.package_type || 'vip',
          avatar: row.avatar || '',
          is_active: row.is_active ?? true,
          created_at: row.created_at,
          updated_at: row.updated_at
        };
        const retryRes = await client.from(DATABASE_TABLES.USERS).upsert(baseRow, { onConflict: 'id' });
        error = retryRes.error;
      }

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
