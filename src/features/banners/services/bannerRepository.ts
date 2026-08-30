import { getSupabaseClient, isSupabaseConfigured, parseSupabaseError } from '../../../lib/supabase';
import { Banner } from '../types/banner.types';
import { mapBannerToDb, mapDbToBanner } from './bannerMapper';

export class BannerRepository {
  public static async getAll(): Promise<{ data: Banner[]; error?: string }> {
    if (!isSupabaseConfigured()) return { data: [] };
    const client = getSupabaseClient();
    if (!client) return { data: [] };

    try {
      const { data, error } = await client
        .from('banners')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) {
        const parsed = parseSupabaseError(error);
        return { data: [], error: parsed.userFriendlyMessage };
      }

      return { data: (data || []).map(mapDbToBanner) };
    } catch (err: any) {
      return { data: [], error: err?.message || 'Gagal memuat banner' };
    }
  }

  public static async save(banner: Banner): Promise<{ success: boolean; error?: string; isConfigured: boolean }> {
    if (!isSupabaseConfigured()) return { success: false, isConfigured: false };
    const client = getSupabaseClient();
    if (!client) return { success: false, isConfigured: false };

    try {
      const row = mapBannerToDb(banner);
      const { error } = await client.from('banners').upsert(row, { onConflict: 'id' });
      if (error) {
        const parsed = parseSupabaseError(error);
        return { success: false, isConfigured: true, error: parsed.userFriendlyMessage };
      }
      return { success: true, isConfigured: true };
    } catch (err: any) {
      return { success: false, isConfigured: true, error: err?.message || 'Network error' };
    }
  }

  public static async batchSave(banners: Banner[]): Promise<{ success: boolean; count: number; error?: string; isConfigured: boolean }> {
    if (banners.length === 0) return { success: true, count: 0, isConfigured: true };
    if (!isSupabaseConfigured()) return { success: false, count: 0, isConfigured: false };
    const client = getSupabaseClient();
    if (!client) return { success: false, count: 0, isConfigured: false };

    try {
      const rows = banners.map(b => mapBannerToDb(b));
      const { error } = await client.from('banners').upsert(rows, { onConflict: 'id' });
      if (error) {
        const parsed = parseSupabaseError(error);
        return { success: false, count: 0, isConfigured: true, error: parsed.userFriendlyMessage };
      }
      return { success: true, count: banners.length, isConfigured: true };
    } catch (err: any) {
      return { success: false, count: 0, isConfigured: true, error: err?.message || 'Network error' };
    }
  }

  public static async delete(id: string): Promise<{ success: boolean; error?: string; isConfigured: boolean }> {
    if (!isSupabaseConfigured()) return { success: false, isConfigured: false };
    const client = getSupabaseClient();
    if (!client) return { success: false, isConfigured: false };

    try {
      const { error } = await client.from('banners').delete().eq('id', id);
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
