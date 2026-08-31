import { getSupabaseClient, isSupabaseConfigured, getSupabaseCredentials, isMissingTableError } from '../lib/supabase';
import { DATABASE_TABLES, logDatabaseError } from './database/databaseContract';
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
import { checkSupabaseSchemaHealth, runSupabaseSingleItemDiagnostic, SchemaHealthReport, DiagnosticTestResult } from './supabase/diagnosticRunner';

import { realtimeManager, RealtimeDiagnosticState, RealtimeLifecycleStatus, RealtimeCallbacks } from './supabase/realtime';

// Re-export diagnostic utilities
export {
  checkSupabaseSchemaHealth,
  runSupabaseSingleItemDiagnostic,
  type SchemaHealthReport,
  type DiagnosticTestResult,
  type RealtimeDiagnosticState,
  type RealtimeLifecycleStatus,
  type RealtimeCallbacks
};

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
          logDatabaseError({ table, operation: 'SELECT', error, details: { page, pageSize } });
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
        logDatabaseError({ table, operation: 'SELECT', error: err, details: { page } });
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
    driveAccountsCount?: number;
    activityLogsCount?: number;
    commentsCount?: number;
    adsCount?: number;
    missingTables?: string[];
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
        { count: bannersCount, error: bErr },
        { count: driveCount, error: dErr },
        { count: logsCount, error: lErr },
        { count: commentsCount, error: cmErr },
        { count: adsCount, error: adErr },
        { error: adSetErr },
        { error: sysSetErr }
      ] = await Promise.all([
        client.from(DATABASE_TABLES.COMICS).select('*', { count: 'exact', head: true }),
        client.from(DATABASE_TABLES.CHAPTERS).select('*', { count: 'exact', head: true }),
        client.from(DATABASE_TABLES.USERS).select('*', { count: 'exact', head: true }),
        client.from(DATABASE_TABLES.BANNERS).select('*', { count: 'exact', head: true }),
        client.from(DATABASE_TABLES.DRIVE_ACCOUNTS).select('*', { count: 'exact', head: true }),
        client.from(DATABASE_TABLES.ACTIVITY_LOGS).select('*', { count: 'exact', head: true }),
        client.from(DATABASE_TABLES.COMMENTS).select('*', { count: 'exact', head: true }),
        client.from(DATABASE_TABLES.ADS).select('*', { count: 'exact', head: true }),
        client.from(DATABASE_TABLES.AD_SETTINGS).select('*', { count: 'exact', head: true }),
        client.from(DATABASE_TABLES.SYSTEM_SETTINGS).select('*', { count: 'exact', head: true })
      ]);

      const missing: string[] = [];
      if (cErr && isMissingTableError(cErr)) missing.push(DATABASE_TABLES.COMICS);
      if (chErr && isMissingTableError(chErr)) missing.push(DATABASE_TABLES.CHAPTERS);
      if (uErr && isMissingTableError(uErr)) missing.push(DATABASE_TABLES.USERS);
      if (bErr && isMissingTableError(bErr)) missing.push(DATABASE_TABLES.BANNERS);
      if (dErr && isMissingTableError(dErr)) missing.push(DATABASE_TABLES.DRIVE_ACCOUNTS);
      if (lErr && isMissingTableError(lErr)) missing.push(DATABASE_TABLES.ACTIVITY_LOGS);
      if (cmErr && isMissingTableError(cmErr)) missing.push(DATABASE_TABLES.COMMENTS);
      if (adErr && isMissingTableError(adErr)) missing.push(DATABASE_TABLES.ADS);
      if (adSetErr && isMissingTableError(adSetErr)) missing.push(DATABASE_TABLES.AD_SETTINGS);
      if (sysSetErr && isMissingTableError(sysSetErr)) missing.push(DATABASE_TABLES.SYSTEM_SETTINGS);

      if (missing.includes(DATABASE_TABLES.COMICS)) {
        return {
          isOnline: false,
          comicsCount: 0,
          chaptersCount: 0,
          usersCount: 0,
          bannersCount: 0,
          missingTables: missing,
          error: 'Tabel comics belum dibuat di Supabase. Jalankan SQL Schema terlebih dahulu.'
        };
      }

      return {
        isOnline: true,
        comicsCount: comicsCount || 0,
        chaptersCount: chaptersCount || 0,
        usersCount: usersCount || 0,
        bannersCount: bannersCount || 0,
        driveAccountsCount: driveCount || 0,
        activityLogsCount: logsCount || 0,
        commentsCount: commentsCount || 0,
        adsCount: adsCount || 0,
        missingTables: missing
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
          siteName: 'AntiTimpa',
          maxLoginAttempts: 5,
          maintenanceMode: false,
          supabaseUrl: getSupabaseCredentials().url,
          supabaseAnonKey: getSupabaseCredentials().anonKey
        }
      };
    } catch (error) {
      console.error('[SupabaseService] fetchFullDatabase error:', error);
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
        ? await client.from(DATABASE_TABLES.USERS).select('*').ilike('email', clean).maybeSingle()
        : await client.from(DATABASE_TABLES.USERS).select('*').ilike('username', clean).maybeSingle();

      if (error) {
        logDatabaseError({ table: DATABASE_TABLES.USERS, operation: 'SELECT', error, details: { identifier } });
        return null;
      }
      if (!data) return null;
      return mapDbToUser(data);
    } catch (err) {
      logDatabaseError({ table: DATABASE_TABLES.USERS, operation: 'SELECT', error: err, details: { identifier } });
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
   * Realtime Multi-Device Live Broadcast Channel (with lifecycle state & backoff)
   */
  public static subscribeToSupabase(callbacks: RealtimeCallbacks): () => void {
    return realtimeManager.subscribe(callbacks);
  }

  public static subscribeToRealtime(callbacks: RealtimeCallbacks): () => void {
    return realtimeManager.subscribe(callbacks);
  }

  public static getRealtimeDiagnosticState(): RealtimeDiagnosticState {
    return realtimeManager.getDiagnosticState();
  }

  public static reconnectRealtime(): void {
    realtimeManager.reconnect();
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
