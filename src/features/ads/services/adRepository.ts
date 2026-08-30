import { getSupabaseClient, isSupabaseConfigured, parseSupabaseError } from '../../../lib/supabase';
import { DATABASE_TABLES, logDatabaseError } from '../../../services/database/databaseContract';
import { AdItem, AdSettings } from '../types/ad.types';
import { mapAdToDb, mapDbToAd, mapAdSettingsToDb, mapDbToAdSettings } from './adMapper';

export class AdRepository {
  public static async getAllAds(): Promise<{ data: AdItem[]; error?: string }> {
    if (!isSupabaseConfigured()) return { data: [] };
    const client = getSupabaseClient();
    if (!client) return { data: [] };

    try {
      const { data, error } = await client
        .from(DATABASE_TABLES.ADS)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logDatabaseError({ table: DATABASE_TABLES.ADS, operation: 'SELECT', error });
        const parsed = parseSupabaseError(error);
        return { data: [], error: parsed.userFriendlyMessage };
      }

      return { data: (data || []).map(mapDbToAd) };
    } catch (err: any) {
      logDatabaseError({ table: DATABASE_TABLES.ADS, operation: 'SELECT', error: err });
      return { data: [], error: err?.message || 'Gagal memuat iklan' };
    }
  }

  public static async saveAd(ad: AdItem): Promise<{ success: boolean; error?: string; isConfigured: boolean }> {
    if (!isSupabaseConfigured()) return { success: false, isConfigured: false };
    const client = getSupabaseClient();
    if (!client) return { success: false, isConfigured: false };

    try {
      const row = mapAdToDb(ad);
      const { error } = await client.from(DATABASE_TABLES.ADS).upsert(row, { onConflict: 'id' });
      if (error) {
        logDatabaseError({ table: DATABASE_TABLES.ADS, operation: 'UPSERT', error, details: { adId: ad.id } });
        const parsed = parseSupabaseError(error);
        return { success: false, isConfigured: true, error: parsed.userFriendlyMessage };
      }
      return { success: true, isConfigured: true };
    } catch (err: any) {
      logDatabaseError({ table: DATABASE_TABLES.ADS, operation: 'UPSERT', error: err, details: { adId: ad.id } });
      return { success: false, isConfigured: true, error: err?.message || 'Network error' };
    }
  }

  public static async batchSaveAds(ads: AdItem[]): Promise<{ success: boolean; count: number; error?: string; isConfigured: boolean }> {
    if (ads.length === 0) return { success: true, count: 0, isConfigured: true };
    if (!isSupabaseConfigured()) return { success: false, count: 0, isConfigured: false };
    const client = getSupabaseClient();
    if (!client) return { success: false, count: 0, isConfigured: false };

    try {
      const rows = ads.map(a => mapAdToDb(a));
      const { error } = await client.from(DATABASE_TABLES.ADS).upsert(rows, { onConflict: 'id' });
      if (error) {
        logDatabaseError({ table: DATABASE_TABLES.ADS, operation: 'UPSERT', error, details: { count: ads.length } });
        const parsed = parseSupabaseError(error);
        return { success: false, count: 0, isConfigured: true, error: parsed.userFriendlyMessage };
      }
      return { success: true, count: ads.length, isConfigured: true };
    } catch (err: any) {
      logDatabaseError({ table: DATABASE_TABLES.ADS, operation: 'UPSERT', error: err, details: { count: ads.length } });
      return { success: false, count: 0, isConfigured: true, error: err?.message || 'Network error' };
    }
  }

  public static async deleteAd(id: string): Promise<{ success: boolean; error?: string; isConfigured: boolean }> {
    if (!isSupabaseConfigured()) return { success: false, isConfigured: false };
    const client = getSupabaseClient();
    if (!client) return { success: false, isConfigured: false };

    try {
      const { error } = await client.from(DATABASE_TABLES.ADS).delete().eq('id', id);
      if (error) {
        logDatabaseError({ table: DATABASE_TABLES.ADS, operation: 'DELETE', error, details: { id } });
        const parsed = parseSupabaseError(error);
        return { success: false, isConfigured: true, error: parsed.userFriendlyMessage };
      }
      return { success: true, isConfigured: true };
    } catch (err: any) {
      logDatabaseError({ table: DATABASE_TABLES.ADS, operation: 'DELETE', error: err, details: { id } });
      return { success: false, isConfigured: true, error: err?.message || 'Network error' };
    }
  }

  public static async getSettings(): Promise<{ data: AdSettings | null; error?: string }> {
    if (!isSupabaseConfigured()) return { data: null };
    const client = getSupabaseClient();
    if (!client) return { data: null };

    try {
      const { data, error } = await client
        .from(DATABASE_TABLES.AD_SETTINGS)
        .select('*')
        .eq('id', 'global_ad_config')
        .maybeSingle();

      if (error) {
        logDatabaseError({ table: DATABASE_TABLES.AD_SETTINGS, operation: 'SELECT', error });
        const parsed = parseSupabaseError(error);
        return { data: null, error: parsed.userFriendlyMessage };
      }

      return { data: data ? mapDbToAdSettings(data) : null };
    } catch (err: any) {
      logDatabaseError({ table: DATABASE_TABLES.AD_SETTINGS, operation: 'SELECT', error: err });
      return { data: null, error: err?.message || 'Gagal memuat pengaturan iklan' };
    }
  }

  public static async saveSettings(settings: AdSettings): Promise<{ success: boolean; error?: string; isConfigured: boolean }> {
    if (!isSupabaseConfigured()) return { success: false, isConfigured: false };
    const client = getSupabaseClient();
    if (!client) return { success: false, isConfigured: false };

    try {
      const row = mapAdSettingsToDb(settings);
      const { error } = await client.from(DATABASE_TABLES.AD_SETTINGS).upsert(row, { onConflict: 'id' });
      if (error) {
        logDatabaseError({ table: DATABASE_TABLES.AD_SETTINGS, operation: 'UPSERT', error });
        const parsed = parseSupabaseError(error);
        return { success: false, isConfigured: true, error: parsed.userFriendlyMessage };
      }
      return { success: true, isConfigured: true };
    } catch (err: any) {
      logDatabaseError({ table: DATABASE_TABLES.AD_SETTINGS, operation: 'UPSERT', error: err });
      return { success: false, isConfigured: true, error: err?.message || 'Network error' };
    }
  }
}
