import { getSupabaseClient, isSupabaseConfigured, parseSupabaseError } from '../../../lib/supabase';
import { SystemSettings, ActivityLog } from '../types/settings.types';
import { mapSettingsToDb, mapDbToSettings, mapActivityLogToDb, mapDbToActivityLog } from './settingsMapper';

export class SettingsRepository {
  public static async getSettings(): Promise<{ data: SystemSettings | null; error?: string }> {
    if (!isSupabaseConfigured()) return { data: null };
    const client = getSupabaseClient();
    if (!client) return { data: null };

    try {
      const { data, error } = await client
        .from('site_settings')
        .select('*')
        .eq('id', 'global_config')
        .single();

      if (error) {
        const parsed = parseSupabaseError(error);
        return { data: null, error: parsed.userFriendlyMessage };
      }

      return { data: data ? mapDbToSettings(data) : null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal memuat pengaturan' };
    }
  }

  public static async saveSettings(settings: Partial<SystemSettings>): Promise<{ success: boolean; error?: string; isConfigured: boolean }> {
    if (!isSupabaseConfigured()) return { success: false, isConfigured: false };
    const client = getSupabaseClient();
    if (!client) return { success: false, isConfigured: false };

    try {
      const row = mapSettingsToDb(settings);
      const { error } = await client.from('site_settings').upsert(row, { onConflict: 'id' });
      if (error) {
        const parsed = parseSupabaseError(error);
        return { success: false, isConfigured: true, error: parsed.userFriendlyMessage };
      }
      return { success: true, isConfigured: true };
    } catch (err: any) {
      return { success: false, isConfigured: true, error: err?.message || 'Network error' };
    }
  }

  public static async getLogs(limit: number = 50): Promise<{ data: ActivityLog[]; error?: string }> {
    if (!isSupabaseConfigured()) return { data: [] };
    const client = getSupabaseClient();
    if (!client) return { data: [] };

    try {
      const { data, error } = await client
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        const parsed = parseSupabaseError(error);
        return { data: [], error: parsed.userFriendlyMessage };
      }

      return { data: (data || []).map(mapDbToActivityLog) };
    } catch (err: any) {
      return { data: [], error: err?.message || 'Gagal memuat log aktivitas' };
    }
  }

  public static async addLog(log: ActivityLog): Promise<{ success: boolean; error?: string; isConfigured: boolean }> {
    if (!isSupabaseConfigured()) return { success: false, isConfigured: false };
    const client = getSupabaseClient();
    if (!client) return { success: false, isConfigured: false };

    try {
      const row = mapActivityLogToDb(log);
      const { error } = await client.from('activity_logs').insert(row);
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
