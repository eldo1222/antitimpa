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

  public static async getLogs(limit: number = 2000): Promise<{ data: ActivityLog[]; error?: string }> {
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

  public static async getLogsPaginated(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    type?: string;
  }): Promise<{ 
    data: ActivityLog[]; 
    totalCount: number; 
    page: number; 
    pageSize: number; 
    totalPages: number; 
    error?: string;
  }> {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.max(1, Math.min(100, params.pageSize || 20));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // 1. Primary: Query Supabase
    if (isSupabaseConfigured()) {
      const client = getSupabaseClient();
      if (client) {
        try {
          let query = client
            .from(DATABASE_TABLES.ACTIVITY_LOGS)
            .select('*', { count: 'exact' });

          if (params.status && params.status !== 'all') {
            query = query.eq('status', params.status);
          }

          if (params.type && params.type !== 'all') {
            query = query.eq('type', params.type);
          }

          if (params.search && params.search.trim()) {
            const term = `%${params.search.trim()}%`;
            query = query.or(`username.ilike.${term},action.ilike.${term},details.ilike.${term}`);
          }

          const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

          if (!error && data) {
            const totalCount = count !== null ? count : data.length;
            const totalPages = Math.ceil(totalCount / pageSize) || 1;
            return {
              data: data.map(mapDbToActivityLog),
              totalCount,
              page,
              pageSize,
              totalPages,
            };
          }

          if (error) {
            logDatabaseError({ table: DATABASE_TABLES.ACTIVITY_LOGS, operation: 'SELECT', error });
          }
        } catch (err) {
          logDatabaseError({ table: DATABASE_TABLES.ACTIVITY_LOGS, operation: 'SELECT', error: err });
        }
      }
    }

    // 2. Fallback: Query Central Server Backend
    try {
      const qParams = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        search: params.search || '',
        status: params.status || 'all',
        type: params.type || 'all',
      });
      const res = await fetch(`/api/data/logs/paginated?${qParams.toString()}`);
      if (res.ok) {
        const json = await res.json();
        return {
          data: json.data || [],
          totalCount: json.totalCount || 0,
          page: json.page || page,
          pageSize: json.pageSize || pageSize,
          totalPages: json.totalPages || 1,
        };
      }
    } catch (_) {}

    return {
      data: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 1,
      error: 'Tidak dapat memuat data aktivitas',
    };
  }

  public static async addLog(log: ActivityLog): Promise<{ success: boolean; error?: string; isConfigured: boolean }> {
    // 1. Sync to central server
    try {
      fetch('/api/data/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log),
      }).catch(() => {});
    } catch (_) {}

    if (!isSupabaseConfigured()) return { success: true, isConfigured: false };
    const client = getSupabaseClient();
    if (!client) return { success: true, isConfigured: false };

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
