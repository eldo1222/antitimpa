import { getSupabaseClient, isSupabaseConfigured, parseSupabaseError } from '../../../lib/supabase';
import { DATABASE_TABLES, logDatabaseError } from '../../../services/database/databaseContract';
import { SystemSettings, ActivityLog } from '../types/settings.types';
import { mapSettingsToDb, mapDbToSettings, mapActivityLogToDb, mapDbToActivityLog } from './settingsMapper';

export class SettingsRepository {
  public static async getSettings(): Promise<{ data: SystemSettings | null; error?: string }> {
    if (!isSupabaseConfigured()) return { data: null };
    const client = getSupabaseClient();
    if (!client) return { data: null };

    try {
      const { data, error } = await client
        .from(DATABASE_TABLES.SYSTEM_SETTINGS)
        .select('*')
        .eq('id', 'global_config')
        .maybeSingle();

      if (error) {
        logDatabaseError({ table: DATABASE_TABLES.SYSTEM_SETTINGS, operation: 'SELECT', error });
        const parsed = parseSupabaseError(error);
        return { data: null, error: parsed.userFriendlyMessage };
      }

      return { data: data ? mapDbToSettings(data) : null };
    } catch (err: any) {
      logDatabaseError({ table: DATABASE_TABLES.SYSTEM_SETTINGS, operation: 'SELECT', error: err });
      return { data: null, error: err?.message || 'Gagal memuat pengaturan' };
    }
  }

  public static async saveSettings(settings: Partial<SystemSettings>): Promise<{ success: boolean; error?: string; isConfigured: boolean }> {
    if (!isSupabaseConfigured()) return { success: false, isConfigured: false };
    const client = getSupabaseClient();
    if (!client) return { success: false, isConfigured: false };

    try {
      const row = mapSettingsToDb(settings);
      const { error } = await client.from(DATABASE_TABLES.SYSTEM_SETTINGS).upsert(row, { onConflict: 'id' });
      if (error) {
        logDatabaseError({ table: DATABASE_TABLES.SYSTEM_SETTINGS, operation: 'UPSERT', error });
        const parsed = parseSupabaseError(error);
        return { success: false, isConfigured: true, error: parsed.userFriendlyMessage };
      }
      return { success: true, isConfigured: true };
    } catch (err: any) {
      logDatabaseError({ table: DATABASE_TABLES.SYSTEM_SETTINGS, operation: 'UPSERT', error: err });
      return { success: false, isConfigured: true, error: err?.message || 'Network error' };
    }
  }

  public static async getLogs(limit: number = 50): Promise<{ data: ActivityLog[]; error?: string }> {
    if (!isSupabaseConfigured()) return { data: [] };
    const client = getSupabaseClient();
    if (!client) return { data: [] };

    try {
      const { data, error } = await client
        .from(DATABASE_TABLES.ACTIVITY_LOGS)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logDatabaseError({ table: DATABASE_TABLES.ACTIVITY_LOGS, operation: 'SELECT', error });
        const parsed = parseSupabaseError(error);
        return { data: [], error: parsed.userFriendlyMessage };
      }

      return { data: (data || []).map(mapDbToActivityLog) };
    } catch (err: any) {
      logDatabaseError({ table: DATABASE_TABLES.ACTIVITY_LOGS, operation: 'SELECT', error: err });
      return { data: [], error: err?.message || 'Gagal memuat log aktivitas' };
    }
  }

  public static async addLog(log: ActivityLog): Promise<{ success: boolean; error?: string; isConfigured: boolean }> {
    if (!isSupabaseConfigured()) return { success: false, isConfigured: false };
    const client = getSupabaseClient();
    if (!client) return { success: false, isConfigured: false };

    try {
      const row = mapActivityLogToDb(log);
      const { error } = await client.from(DATABASE_TABLES.ACTIVITY_LOGS).insert(row);
      if (error) {
        logDatabaseError({ table: DATABASE_TABLES.ACTIVITY_LOGS, operation: 'INSERT', error });
        const parsed = parseSupabaseError(error);
        return { success: false, isConfigured: true, error: parsed.userFriendlyMessage };
      }
      return { success: true, isConfigured: true };
    } catch (err: any) {
      logDatabaseError({ table: DATABASE_TABLES.ACTIVITY_LOGS, operation: 'INSERT', error: err });
      return { success: false, isConfigured: true, error: err?.message || 'Network error' };
    }
  }
}
