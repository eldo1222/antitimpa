import { getSupabaseClient, isSupabaseConfigured, parseSupabaseError } from '../../../lib/supabase';
import { DriveAccount } from '../types/drive.types';
import { mapDriveAccountToDb, mapDbToDriveAccount } from './driveMapper';

export class DriveRepository {
  public static async getAll(): Promise<{ data: DriveAccount[]; error?: string }> {
    if (!isSupabaseConfigured()) return { data: [] };
    const client = getSupabaseClient();
    if (!client) return { data: [] };

    try {
      const { data, error } = await client
        .from('drive_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        const parsed = parseSupabaseError(error);
        return { data: [], error: parsed.userFriendlyMessage };
      }

      return { data: (data || []).map(mapDbToDriveAccount) };
    } catch (err: any) {
      return { data: [], error: err?.message || 'Gagal memuat akun drive' };
    }
  }

  public static async save(account: DriveAccount): Promise<{ success: boolean; error?: string; isConfigured: boolean }> {
    if (!isSupabaseConfigured()) return { success: false, isConfigured: false };
    const client = getSupabaseClient();
    if (!client) return { success: false, isConfigured: false };

    try {
      const row = mapDriveAccountToDb(account);
      const { error } = await client.from('drive_accounts').upsert(row, { onConflict: 'id' });
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
      const { error } = await client.from('drive_accounts').delete().eq('id', id);
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
