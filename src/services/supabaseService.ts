import { getSupabaseClient, isSupabaseConfigured, getSupabaseCredentials } from '../lib/supabase';
import { 
  Comic, 
  Chapter, 
  User, 
  Banner, 
  ActivityLog, 
  SystemSettings, 
  DriveAccount, 
  Comment, 
  AdItem, 
  AdSettings 
} from '../types';

import { mapComicToDb, mapDbToComic } from '../features/comics/services/comicMapper';
import { mapChapterToDb, mapDbToChapter } from '../features/chapters/services/chapterMapper';
import { mapBannerToDb, mapDbToBanner } from '../features/banners/services/bannerMapper';
import { mapUserToDb, mapDbToUser } from '../features/users/services/userMapper';
import { mapAdToDb, mapDbToAd, mapAdSettingsToDb, mapDbToAdSettings } from '../features/ads/services/adMapper';
import { mapCommentToDb, mapDbToComment } from '../features/comments/services/commentMapper';
import { mapSettingsToDb, mapDbToSettings, mapActivityLogToDb, mapDbToActivityLog } from '../features/settings/services/settingsMapper';
import { mapDriveAccountToDb, mapDbToDriveAccount } from '../features/drive/services/driveMapper';

import { ComicRepository } from '../features/comics/services/comicRepository';
import { ChapterRepository } from '../features/chapters/services/chapterRepository';
import { BannerRepository } from '../features/banners/services/bannerRepository';
import { UserRepository } from '../features/users/services/userRepository';
import { AdRepository } from '../features/ads/services/adRepository';
import { CommentRepository } from '../features/comments/services/commentRepository';
import { SettingsRepository } from '../features/settings/services/settingsRepository';
import { DriveRepository } from '../features/drive/services/driveRepository';
import { generateSlug } from '../utils/slug';

// Re-export mappers for backward compatibility
export {
  generateSlug,
  mapComicToDb,
  mapDbToComic,
  mapChapterToDb,
  mapDbToChapter,
  mapBannerToDb,
  mapDbToBanner,
  mapUserToDb,
  mapDbToUser,
  mapAdToDb,
  mapDbToAd,
  mapAdSettingsToDb,
  mapDbToAdSettings,
  mapCommentToDb,
  mapDbToComment,
  mapSettingsToDb,
  mapDbToSettings,
  mapActivityLogToDb,
  mapDbToActivityLog,
  mapDriveAccountToDb,
  mapDbToDriveAccount,
};

export class SupabaseService {
  public static generateSlug = generateSlug;

  /**
   * Helper to fetch all rows with Supabase Range Pagination
   */
  public static async fetchAllRows<T = any>(
    table: string, 
    select: string = '*', 
    orderColumn: string = 'created_at', 
    ascending: boolean = true
  ): Promise<T[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    
    const allRows: T[] = [];
    const pageSize = 1000;
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      
      try {
        let query = client.from(table).select(select);
        if (orderColumn) {
          query = query.order(orderColumn, { ascending });
        }
        const { data, error } = await query.range(from, to);

        if (error) {
          console.warn(`[SupabaseService] Error fetching table '${table}' page ${page}:`, error);
          break;
        }

        if (data && data.length > 0) {
          allRows.push(...(data as T[]));
          if (data.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      } catch (err) {
        console.warn(`[SupabaseService] Exception fetching table '${table}':`, err);
        break;
      }
    }

    return allRows;
  }

  /**
   * Get Live Counts directly from Supabase PostgreSQL
   */
  public static async getSupabaseLiveStats(): Promise<{
    isOnline: boolean;
    comicsCount: number;
    chaptersCount: number;
    usersCount: number;
    bannersCount: number;
    error?: string;
  }> {
    const client = getSupabaseClient();
    if (!client) {
      return { isOnline: false, comicsCount: 0, chaptersCount: 0, usersCount: 0, bannersCount: 0, error: 'Koneksi Supabase belum diatur' };
    }

    try {
      const [
        { count: comicsCount, error: cErr },
        { count: chaptersCount, error: chErr },
        { count: usersCount, error: uErr },
        { count: bannersCount, error: bErr }
      ] = await Promise.all([
        client.from('comics').select('*', { count: 'exact', head: true }),
        client.from('chapters').select('*', { count: 'exact', head: true }),
        client.from('readers').select('*', { count: 'exact', head: true }),
        client.from('banners').select('*', { count: 'exact', head: true })
      ]);

      if (cErr && cErr.code === '42P01') {
        return { isOnline: false, comicsCount: 0, chaptersCount: 0, usersCount: 0, bannersCount: 0, error: 'Tabel comics belum dibuat di Supabase. Jalankan SQL Schema terlebih dahulu.' };
      }

      return {
        isOnline: true,
        comicsCount: comicsCount || 0,
        chaptersCount: chaptersCount || 0,
        usersCount: usersCount || 0,
        bannersCount: bannersCount || 0
      };
    } catch (e: any) {
      return { isOnline: false, comicsCount: 0, chaptersCount: 0, usersCount: 0, bannersCount: 0, error: e.message || String(e) };
    }
  }

  /**
   * Fetch All Data from Supabase Database
   */
  public static async fetchFullDatabase(): Promise<{
    comics: Comic[];
    chapters: Record<string, Chapter[]>;
    users: User[];
    banners: Banner[];
    driveAccounts: DriveAccount[];
    activityLogs: ActivityLog[];
    comments: Comment[];
    ads: AdItem[];
    adSettings: AdSettings | null;
    systemSettings: SystemSettings | null;
  } | null> {
    const client = getSupabaseClient();
    if (!client) return null;

    try {
      // 1. Fetch Comics
      const { data: comics } = await ComicRepository.getAll();

      // 2. Fetch Chapters Grouped
      const { data: chaptersMap } = await ChapterRepository.getAllGrouped();

      // 3. Fetch Users
      const { data: users } = await UserRepository.getAll();

      // 4. Fetch Banners
      const { data: banners } = await BannerRepository.getAll();

      // 5. Fetch Drive Accounts
      const { data: driveAccounts } = await DriveRepository.getAll();

      // 6. Fetch Activity Logs
      const { data: activityLogs } = await SettingsRepository.getLogs(200);

      // 7. Fetch Comments
      const { data: comments } = await CommentRepository.getAll();

      // 8. Fetch Ads
      const { data: ads } = await AdRepository.getAllAds();

      // 9. Fetch Ad Settings
      const { data: adSettings } = await AdRepository.getSettings();

      // 10. Fetch Settings
      const { data: systemSettings } = await SettingsRepository.getSettings();

      return {
        comics: comics || [],
        chapters: chaptersMap || {},
        users: users || [],
        banners: banners || [],
        driveAccounts: driveAccounts || [],
        activityLogs: activityLogs || [],
        comments: comments || [],
        ads: ads || [],
        adSettings: adSettings || null,
        systemSettings: systemSettings || {
          siteName: 'KomikYuk',
          maxLoginAttempts: 5,
          maintenanceMode: false,
          supabaseUrl: getSupabaseCredentials().url,
          supabaseAnonKey: getSupabaseCredentials().anonKey
        }
      };
    } catch (error) {
      console.warn('[SupabaseService] fetchFullDatabase error:', error);
      return null;
    }
  }

  /**
   * Fetch Single User by Username or Email
   */
  public static async fetchUser(identifier: string): Promise<User | null> {
    const client = getSupabaseClient();
    if (!client || !identifier) return null;
    try {
      const clean = identifier.trim();
      const isEmail = clean.includes('@');
      const { data, error } = isEmail
        ? await client.from('readers').select('*').ilike('email', clean).maybeSingle()
        : await client.from('readers').select('*').ilike('username', clean).maybeSingle();

      if (error || !data) return null;
      return mapDbToUser(data);
    } catch (err) {
      console.warn('[SupabaseService] fetchUser error:', err);
      return null;
    }
  }

  // Comic CRUD
  public static async saveComic(comic: Comic) {
    return ComicRepository.save(comic);
  }

  public static async batchSaveComics(comics: Comic[]) {
    return ComicRepository.batchSave(comics);
  }

  public static async deleteComic(comicId: string) {
    return ComicRepository.delete(comicId);
  }

  public static async batchDeleteComics(comicIds: string[]) {
    return ComicRepository.batchDelete(comicIds);
  }

  // Chapter CRUD
  public static async saveChapter(comicId: string, chapter: Chapter) {
    return ChapterRepository.save(comicId, chapter);
  }

  public static async batchSaveChapters(chapters: Chapter[]) {
    return ChapterRepository.batchSave(chapters);
  }

  public static async deleteChapter(chapterId: string) {
    return ChapterRepository.delete(chapterId);
  }

  public static async batchDeleteChapters(chapterIds: string[]) {
    return ChapterRepository.batchDelete(chapterIds);
  }

  // Banner CRUD
  public static async saveBanner(banner: Banner): Promise<boolean> {
    const res = await BannerRepository.save(banner);
    return res.success;
  }

  public static async deleteBanner(bannerId: string): Promise<boolean> {
    const res = await BannerRepository.delete(bannerId);
    return res.success;
  }

  // User CRUD
  public static async saveUser(user: User): Promise<boolean> {
    const res = await UserRepository.save(user);
    return res.success;
  }

  public static async deleteUser(userId: string): Promise<boolean> {
    const res = await UserRepository.delete(userId);
    return res.success;
  }

  // Drive CRUD
  public static async saveDriveAccount(account: DriveAccount): Promise<boolean> {
    const res = await DriveRepository.save(account);
    return res.success;
  }

  public static async deleteDriveAccount(id: string): Promise<boolean> {
    const res = await DriveRepository.delete(id);
    return res.success;
  }

  // Activity Log CRUD
  public static async saveActivityLog(log: ActivityLog): Promise<boolean> {
    const res = await SettingsRepository.addLog(log);
    return res.success;
  }

  // Comment CRUD
  public static async saveComment(comment: Comment): Promise<boolean> {
    const res = await CommentRepository.save(comment);
    return res.success;
  }

  public static async deleteComment(id: string): Promise<boolean> {
    const res = await CommentRepository.delete(id);
    return res.success;
  }

  // Ad CRUD
  public static async saveAd(ad: AdItem): Promise<boolean> {
    const res = await AdRepository.saveAd(ad);
    return res.success;
  }

  public static async deleteAd(id: string): Promise<boolean> {
    const res = await AdRepository.deleteAd(id);
    return res.success;
  }

  public static async saveAdSettings(settings: AdSettings): Promise<boolean> {
    const res = await AdRepository.saveSettings(settings);
    return res.success;
  }

  // System Settings CRUD
  public static async saveSettings(settings: SystemSettings): Promise<boolean> {
    const res = await SettingsRepository.saveSettings(settings);
    return res.success;
  }

  /**
   * Realtime Multi-Device Live Broadcast Channel
   */
  public static subscribeToSupabase(callbacks: {
    onComicChange?: (eventType: 'INSERT' | 'UPDATE' | 'DELETE', comic: Comic | { id: string }) => void;
    onChapterChange?: (eventType: 'INSERT' | 'UPDATE' | 'DELETE', chapter: Chapter | { id: string; comicId?: string }) => void;
    onBannerChange?: (eventType: 'INSERT' | 'UPDATE' | 'DELETE', banner: Banner | { id: string }) => void;
    onUserChange?: (eventType: 'INSERT' | 'UPDATE' | 'DELETE', user: User | { id: string }) => void;
    onDriveChange?: (eventType: 'INSERT' | 'UPDATE' | 'DELETE', drive: DriveAccount | { id: string }) => void;
    onLogChange?: (log: ActivityLog) => void;
    onCommentChange?: (eventType: 'INSERT' | 'UPDATE' | 'DELETE', comment: Comment | { id: string }) => void;
    onAdChange?: (eventType: 'INSERT' | 'UPDATE' | 'DELETE', ad: AdItem | { id: string }) => void;
    onAdSettingsChange?: (adSettings: Partial<AdSettings>) => void;
    onSettingsChange?: (settings: Partial<SystemSettings>) => void;
    onStatusChange?: (status: 'connected' | 'connecting' | 'disconnected') => void;
  }): () => void {
    const client = getSupabaseClient();
    if (!client) {
      callbacks.onStatusChange?.('disconnected');
      return () => {};
    }

    try {
      callbacks.onStatusChange?.('connecting');
      const channelId = `komikyuk-realtime-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const channel = client.channel(channelId);

      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comics' }, (payload: any) => {
          if (callbacks.onComicChange) {
            if (payload.eventType === 'DELETE') {
              callbacks.onComicChange('DELETE', { id: payload.old?.id || '' });
            } else if (payload.new) {
              callbacks.onComicChange(payload.eventType, mapDbToComic(payload.new));
            }
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chapters' }, (payload: any) => {
          if (callbacks.onChapterChange) {
            if (payload.eventType === 'DELETE') {
              callbacks.onChapterChange('DELETE', { id: payload.old?.id || '', comicId: payload.old?.comic_id });
            } else if (payload.new) {
              callbacks.onChapterChange(payload.eventType, mapDbToChapter(payload.new));
            }
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'banners' }, (payload: any) => {
          if (callbacks.onBannerChange) {
            if (payload.eventType === 'DELETE') {
              callbacks.onBannerChange('DELETE', { id: payload.old?.id || '' });
            } else if (payload.new) {
              callbacks.onBannerChange(payload.eventType, mapDbToBanner(payload.new));
            }
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'readers' }, (payload: any) => {
          if (callbacks.onUserChange) {
            if (payload.eventType === 'DELETE') {
              callbacks.onUserChange('DELETE', { id: payload.old?.id || '' });
            } else if (payload.new) {
              callbacks.onUserChange(payload.eventType, mapDbToUser(payload.new));
            }
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (payload: any) => {
          if (callbacks.onSettingsChange && payload.new) {
            callbacks.onSettingsChange({
              siteName: payload.new.site_name,
              siteAnnouncement: payload.new.announcement,
              maintenanceMode: Boolean(payload.new.maintenance_mode),
              siteLogo: payload.new.site_logo,
              siteFavicon: payload.new.site_favicon
            });
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'drive_accounts' }, (payload: any) => {
          if (callbacks.onDriveChange) {
            if (payload.eventType === 'DELETE') {
              callbacks.onDriveChange('DELETE', { id: payload.old?.id || '' });
            } else if (payload.new) {
              callbacks.onDriveChange(payload.eventType, mapDbToDriveAccount(payload.new));
            }
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, (payload: any) => {
          if (callbacks.onCommentChange) {
            if (payload.eventType === 'DELETE') {
              callbacks.onCommentChange('DELETE', { id: payload.old?.id || '' });
            } else if (payload.new) {
              callbacks.onCommentChange(payload.eventType, mapDbToComment(payload.new));
            }
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ads' }, (payload: any) => {
          if (callbacks.onAdChange) {
            if (payload.eventType === 'DELETE') {
              callbacks.onAdChange('DELETE', { id: payload.old?.id || '' });
            } else if (payload.new) {
              callbacks.onAdChange(payload.eventType, mapDbToAd(payload.new));
            }
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            callbacks.onStatusChange?.('connected');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            callbacks.onStatusChange?.('disconnected');
          }
        });

      return () => {
        try {
          client.removeChannel(channel);
        } catch (_) {}
      };
    } catch (e) {
      callbacks.onStatusChange?.('disconnected');
      return () => {};
    }
  }

  public static subscribeToRealtime(callbacks: Parameters<typeof SupabaseService.subscribeToSupabase>[0]): () => void {
    return SupabaseService.subscribeToSupabase(callbacks);
  }

  /**
   * One-Click Migrate Entire Dataset to Supabase
   */
  public static async migrateAllToSupabase(
    data: {
      comics: Comic[];
      chapters: Record<string, Chapter[]>;
      users: User[];
      banners: Banner[];
      driveAccounts: DriveAccount[];
      activityLogs: ActivityLog[];
      systemSettings: SystemSettings;
    },
    onProgress?: (msg: string, percent: number) => void
  ): Promise<{ success: boolean; message: string; countComics: number; countChapters: number }> {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, message: 'Koneksi Supabase belum diatur.', countComics: 0, countChapters: 0 };
    }

    try {
      // 1. Upload Comics
      onProgress?.(`Mengunggah ${data.comics.length} judul komik ke Supabase...`, 20);
      const comicsResult = await this.batchSaveComics(data.comics);

      // 2. Upload Chapters
      const allChapters = Object.values(data.chapters).flat();
      onProgress?.(`Mengunggah ${allChapters.length} chapter ke Supabase...`, 55);
      const chaptersResult = await this.batchSaveChapters(allChapters);

      // 3. Upload Users
      if (data.users.length > 0) {
        onProgress?.(`Menyimpan ${data.users.length} akun pengguna...`, 75);
        for (const u of data.users) {
          await this.saveUser(u);
        }
      }

      // 4. Upload Banners
      if (data.banners.length > 0) {
        onProgress?.('Menyimpan banner beranda...', 88);
        for (const b of data.banners) {
          await this.saveBanner(b);
        }
      }

      // 5. Upload System Settings
      if (data.systemSettings) {
        onProgress?.('Menyimpan pengaturan sistem...', 95);
        await this.saveSettings(data.systemSettings);
      }

      onProgress?.('Migrasi selesai! Seluruh komik, chapter, user & banner kini berada di Supabase.', 100);
      return {
        success: true,
        message: `Berhasil migrasi ${comicsResult.count} dari ${data.comics.length} komik dan ${chaptersResult.count} dari ${allChapters.length} chapter ke Supabase PostgreSQL!`,
        countComics: comicsResult.count,
        countChapters: chaptersResult.count
      };
    } catch (err: any) {
      console.error('[Supabase] Migration error:', err);
      return {
        success: false,
        message: `Gagal saat proses migrasi: ${err.message || err}`,
        countComics: 0,
        countChapters: 0
      };
    }
  }
}
