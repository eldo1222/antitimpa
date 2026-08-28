import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
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

/**
 * Supabase Data Mapper:
 * Translates between TypeScript camelCase models and PostgreSQL snake_case columns.
 */

function mapComicToDb(c: Partial<Comic>): Record<string, any> {
  const row: Record<string, any> = {};
  if (c.id !== undefined) row.id = c.id;
  if (c.title !== undefined) row.title = c.title;
  if (c.slug !== undefined) row.slug = c.slug;
  if (c.coverImage !== undefined) row.cover_image = c.coverImage;
  if (c.bannerImage !== undefined) row.banner_image = c.bannerImage;
  if (c.synopsis !== undefined) row.synopsis = c.synopsis;
  if (c.genres !== undefined) row.genres = c.genres;
  if (c.status !== undefined) row.status = c.status;
  if (c.comicType !== undefined) row.comic_type = c.comicType;
  if (c.contentType !== undefined) row.content_type = c.contentType;
  if (c.storyWriter !== undefined) row.story_writer = c.storyWriter;
  if (c.artist !== undefined) row.artist = c.artist;
  if (c.rating !== undefined) row.rating = c.rating;
  if (c.ratingCount !== undefined) row.rating_count = c.ratingCount;
  if (c.totalChapters !== undefined) row.total_chapters = c.totalChapters;
  if (c.totalReaders !== undefined) row.total_readers = c.totalReaders;
  if (c.isFree !== undefined) row.is_free = c.isFree;
  if (c.isFeatured !== undefined) row.is_featured = c.isFeatured;
  if (c.isPublished !== undefined) row.is_published = c.isPublished;
  if (c.isVisibleOnHome !== undefined) row.is_visible_on_home = c.isVisibleOnHome;
  if (c.createdAt !== undefined) row.created_at = c.createdAt;
  if (c.updatedAt !== undefined) row.updated_at = c.updatedAt;
  if (c.sourceApi !== undefined) row.source_api = c.sourceApi;
  return row;
}

function mapDbToComic(row: Record<string, any>): Comic {
  return {
    id: row.id,
    title: row.title || '',
    slug: row.slug || '',
    coverImage: row.cover_image || '',
    bannerImage: row.banner_image || '',
    synopsis: row.synopsis || '',
    genres: Array.isArray(row.genres) ? row.genres : [],
    status: row.status || 'ongoing',
    comicType: row.comic_type || 'manga',
    contentType: row.content_type || 'normal',
    storyWriter: row.story_writer || '',
    artist: row.artist || '',
    rating: Number(row.rating) || 0,
    ratingCount: Number(row.rating_count) || 0,
    totalChapters: Number(row.total_chapters) || 0,
    totalReaders: Number(row.total_readers) || 0,
    isFree: row.is_free !== false,
    isFeatured: Boolean(row.is_featured),
    isPublished: row.is_published !== false,
    isVisibleOnHome: row.is_visible_on_home !== false,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
    sourceApi: row.source_api || 'manual'
  };
}

function mapChapterToDb(ch: Partial<Chapter> & { parentComicId?: string }): Record<string, any> {
  const row: Record<string, any> = {};
  if (ch.id !== undefined) row.id = ch.id;
  if (ch.comicId !== undefined || ch.parentComicId !== undefined) {
    row.comic_id = ch.comicId || ch.parentComicId;
  }
  if (ch.chapterNumber !== undefined) row.chapter_number = ch.chapterNumber;
  if (ch.title !== undefined) row.title = ch.title;
  if (ch.releaseDate !== undefined) row.release_date = ch.releaseDate;
  if (ch.isLocked !== undefined) row.is_locked = ch.isLocked;
  if (ch.sourceType !== undefined) row.source_type = ch.sourceType;
  if (ch.pages !== undefined) row.pages = ch.pages;
  if (ch.driveFileId !== undefined) row.drive_file_id = ch.driveFileId;
  if (ch.driveEmbedUrl !== undefined) row.drive_embed_url = ch.driveEmbedUrl;
  if (ch.driveAccountId !== undefined) row.drive_account_id = ch.driveAccountId;
  if (ch.viewsCount !== undefined) row.views_count = ch.viewsCount;
  if (ch.createdAt !== undefined) row.created_at = ch.createdAt;
  if (ch.updatedAt !== undefined) row.updated_at = ch.updatedAt;
  return row;
}

function mapDbToChapter(row: Record<string, any>): Chapter {
  return {
    id: row.id,
    comicId: row.comic_id || '',
    chapterNumber: Number(row.chapter_number) || 1,
    title: row.title || '',
    releaseDate: row.release_date || new Date().toISOString(),
    isLocked: Boolean(row.is_locked),
    sourceType: row.source_type || 'images',
    pages: Array.isArray(row.pages) ? row.pages : [],
    driveFileId: row.drive_file_id || undefined,
    driveEmbedUrl: row.drive_embed_url || undefined,
    driveAccountId: row.drive_account_id || undefined,
    viewsCount: Number(row.views_count) || 0,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  };
}

export class SupabaseService {
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
    systemSettings: SystemSettings | null;
  } | null> {
    const client = getSupabaseClient();
    if (!client) return null;

    try {
      // 1. Fetch Comics
      const { data: comicsData, error: comicsErr } = await client
        .from('comics')
        .select('*')
        .order('updated_at', { ascending: false });

      if (comicsErr) throw comicsErr;

      const comics: Comic[] = (comicsData || []).map(mapDbToComic);

      // 2. Fetch Chapters
      const { data: chaptersData, error: chErr } = await client
        .from('chapters')
        .select('*')
        .order('chapter_number', { ascending: true });

      if (chErr) throw chErr;

      const chaptersMap: Record<string, Chapter[]> = {};
      (chaptersData || []).forEach(row => {
        const ch = mapDbToChapter(row);
        if (!chaptersMap[ch.comicId]) {
          chaptersMap[ch.comicId] = [];
        }
        chaptersMap[ch.comicId].push(ch);
      });

      // 3. Fetch Users
      const { data: usersData } = await client
        .from('users')
        .select('*');

      const users: User[] = (usersData || []).map(u => ({
        id: u.id,
        username: u.username || 'user',
        email: u.email || '',
        passwordHash: u.password_hash || '',
        role: u.role || 'reader',
        status: (u.is_active === false ? 'inactive' : 'active'),
        avatar: u.avatar || '',
        tier: u.role === 'admin' ? 'Premium' : 'Free Tier',
        planType: (u.package_type === 'vip' ? 'plan_15k_all' : 'plan_5k_single'),
        createdAt: u.created_at || new Date().toISOString()
      }));

      // 4. Fetch Banners
      const { data: bannersData } = await client
        .from('banners')
        .select('*')
        .order('order_index', { ascending: true });

      const banners: Banner[] = (bannersData || []).map(b => ({
        id: b.id,
        title: b.title || '',
        subtitle: b.subtitle || 'Komik Populer Terupdate',
        imageUrl: b.image_url || '',
        targetComicId: b.comic_id || undefined,
        isActive: b.is_active !== false,
        order: b.order_index || 0
      }));

      // 5. Fetch Settings
      const { data: settingsData } = await client
        .from('system_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      let systemSettings: SystemSettings | null = null;
      if (settingsData) {
        systemSettings = {
          siteName: settingsData.site_name || 'AntiTimpa',
          siteAnnouncement: settingsData.announcement || '',
          maxLoginAttempts: 5,
          maintenanceMode: Boolean(settingsData.maintenance_mode)
        };
      }

      return {
        comics,
        chapters: chaptersMap,
        users,
        banners,
        driveAccounts: [],
        activityLogs: [],
        systemSettings
      };
    } catch (error) {
      console.warn('[SupabaseService] fetchFullDatabase error:', error);
      return null;
    }
  }

  /**
   * Save / Upsert Single Comic
   */
  public static async saveComic(comic: Comic): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      const row = mapComicToDb(comic);
      const { error } = await client.from('comics').upsert(row, { onConflict: 'id' });
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('[SupabaseService] saveComic error:', err);
      return false;
    }
  }

  /**
   * Batch Save Comics (Chunks of 100 for high efficiency)
   */
  public static async batchSaveComics(comics: Comic[]): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client || comics.length === 0) return false;
    try {
      const rows = comics.map(c => mapComicToDb(c));
      for (let i = 0; i < rows.length; i += 100) {
        const chunk = rows.slice(i, i + 100);
        await client.from('comics').upsert(chunk, { onConflict: 'id' });
      }
      return true;
    } catch (err) {
      console.warn('[SupabaseService] batchSaveComics error:', err);
      return false;
    }
  }

  /**
   * Delete Comic
   */
  public static async deleteComic(comicId: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      const { error } = await client.from('comics').delete().eq('id', comicId);
      return !error;
    } catch (err) {
      return false;
    }
  }

  /**
   * Save Single Chapter
   */
  public static async saveChapter(comicId: string, chapter: Chapter): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      const row = mapChapterToDb({ ...chapter, comicId });
      const { error } = await client.from('chapters').upsert(row, { onConflict: 'id' });
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('[SupabaseService] saveChapter error:', err);
      return false;
    }
  }

  /**
   * Batch Save Chapters (Chunks of 100)
   */
  public static async batchSaveChapters(chapters: Chapter[]): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client || chapters.length === 0) return false;
    try {
      const rows = chapters.map(ch => mapChapterToDb(ch));
      for (let i = 0; i < rows.length; i += 100) {
        const chunk = rows.slice(i, i + 100);
        await client.from('chapters').upsert(chunk, { onConflict: 'id' });
      }
      return true;
    } catch (err) {
      console.warn('[SupabaseService] batchSaveChapters error:', err);
      return false;
    }
  }

  /**
   * Delete Chapter
   */
  public static async deleteChapter(chapterId: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      const { error } = await client.from('chapters').delete().eq('id', chapterId);
      return !error;
    } catch (err) {
      return false;
    }
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
      await this.batchSaveComics(data.comics);

      // 2. Upload Chapters
      const allChapters = Object.values(data.chapters).flat();
      onProgress?.(`Mengunggah ${allChapters.length} chapter ke Supabase...`, 60);
      await this.batchSaveChapters(allChapters);

      // 3. Upload Banners & Settings
      onProgress?.('Menyimpan banner dan pengaturan sistem...', 85);
      if (data.banners.length > 0) {
        const bannerRows = data.banners.map((b, idx) => ({
          id: b.id,
          title: b.title,
          image_url: b.imageUrl,
          comic_id: b.targetComicId,
          is_active: b.isActive,
          order_index: b.order ?? idx
        }));
        await client.from('banners').upsert(bannerRows, { onConflict: 'id' });
      }

      if (data.systemSettings) {
        await client.from('system_settings').upsert({
          id: 'global_config',
          site_name: data.systemSettings.siteName,
          announcement: data.systemSettings.siteAnnouncement,
          maintenance_mode: data.systemSettings.maintenanceMode
        }, { onConflict: 'id' });
      }

      onProgress?.('Migrasi selesai! Seluruh komik & chapter kini berada di SQL Supabase.', 100);
      return {
        success: true,
        message: `Berhasil migrasi ${data.comics.length} komik dan ${allChapters.length} chapter ke Supabase PostgreSQL!`,
        countComics: data.comics.length,
        countChapters: allChapters.length
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
