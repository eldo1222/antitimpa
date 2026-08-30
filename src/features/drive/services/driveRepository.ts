import { getSupabaseClient, isSupabaseConfigured, parseSupabaseError } from '../../../lib/supabase';
import { DATABASE_TABLES, logDatabaseError } from '../../../services/database/databaseContract';
import { DriveAccount } from '../types/drive.types';
import { mapDriveAccountToDb, mapDbToDriveAccount } from './driveMapper';

export class DriveRepository {
  public static async getAll(): Promise<{ data: DriveAccount[]; error?: string }> {
    if (!isSupabaseConfigured()) return { data: [] };
    const client = getSupabaseClient();
    if (!client) return { data: [] };

    try {
      const { data, error } = await client
        .from(DATABASE_TABLES.DRIVE_ACCOUNTS)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logDatabaseError({ table: DATABASE_TABLES.DRIVE_ACCOUNTS, operation: 'SELECT', error });
        const parsed = parseSupabaseError(error);
        return { data: [], error: parsed.userFriendlyMessage };
      }

      return { data: (data || []).map(mapDbToDriveAccount) };
    } catch (err: any) {
      logDatabaseError({ table: DATABASE_TABLES.DRIVE_ACCOUNTS, operation: 'SELECT', error: err });
      return { data: [], error: err?.message || 'Gagal memuat akun drive' };
    }
  }

  public static async save(account: DriveAccount): Promise<{ success: boolean; error?: string; isConfigured: boolean }> {
    if (!isSupabaseConfigured()) return { success: false, isConfigured: false };
    const client = getSupabaseClient();
    if (!client) return { success: false, isConfigured: false };

    try {
      const row = mapDriveAccountToDb(account);
      const { error } = await client.from(DATABASE_TABLES.DRIVE_ACCOUNTS).upsert(row, { onConflict: 'id' });
      if (error) {
        logDatabaseError({ table: DATABASE_TABLES.DRIVE_ACCOUNTS, operation: 'UPSERT', error, details: { accountId: account.id } });
        const parsed = parseSupabaseError(error);
        return { success: false, isConfigured: true, error: parsed.userFriendlyMessage };
      }
      return { success: true, isConfigured: true };
    } catch (err: any) {
      logDatabaseError({ table: DATABASE_TABLES.DRIVE_ACCOUNTS, operation: 'UPSERT', error: err, details: { accountId: account.id } });
      return { success: false, isConfigured: true, error: err?.message || 'Network error' };
    }
  }

  public static async delete(id: string): Promise<{ success: boolean; error?: string; isConfigured: boolean }> {
    if (!isSupabaseConfigured()) return { success: false, isConfigured: false };
    const client = getSupabaseClient();
    if (!client) return { success: false, isConfigured: false };

    try {
      const { error } = await client.from(DATABASE_TABLES.DRIVE_ACCOUNTS).delete().eq('id', id);
      if (error) {
        logDatabaseError({ table: DATABASE_TABLES.DRIVE_ACCOUNTS, operation: 'DELETE', error, details: { id } });
        const parsed = parseSupabaseError(error);
        return { success: false, isConfigured: true, error: parsed.userFriendlyMessage };
      }
      return { success: true, isConfigured: true };
    } catch (err: any) {
      logDatabaseError({ table: DATABASE_TABLES.DRIVE_ACCOUNTS, operation: 'DELETE', error: err, details: { id } });
      return { success: false, isConfigured: true, error: err?.message || 'Network error' };
    }
  }
}
