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

/**
 * Supabase Data Mapper:
 * Translates between TypeScript camelCase models and PostgreSQL snake_case columns.
 */

export function mapComicToDb(c: Partial<Comic>): Record<string, any> {
  const row: Record<string, any> = {};
  if (c.id !== undefined) row.id = c.id;
  if (c.title !== undefined) row.title = c.title;
  if (c.slug !== undefined) row.slug = c.slug || c.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
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

export function mapDbToComic(row: Record<string, any>): Comic {
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

export function mapChapterToDb(ch: Partial<Chapter> & { parentComicId?: string }): Record<string, any> {
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

export function mapDbToChapter(row: Record<string, any>): Chapter {
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

export function mapUserToDb(u: Partial<User>): Record<string, any> {
  const row: Record<string, any> = {};
  if (u.id !== undefined) row.id = u.id;
  if (u.username !== undefined) row.username = u.username;
  if (u.email !== undefined) {
    row.email = u.email || `${(u.username || 'user').toLowerCase()}@antitimpa.id`;
  } else if (u.username) {
    row.email = `${u.username.toLowerCase()}@antitimpa.id`;
  }
  if (u.passwordHash !== undefined) row.password_hash = u.passwordHash;
  if (u.role !== undefined) row.role = u.role;
  if (u.planType !== undefined || u.tier !== undefined) {
    row.package_type = u.planType === 'plan_15k_all' || u.tier === 'Premium' ? 'vip' : 'free';
  }
  if (u.avatar !== undefined || u.photoURL !== undefined) {
    row.avatar = u.avatar || u.photoURL;
  }
  if (u.status !== undefined) {
    row.is_active = u.status === 'active';
  }
  if (u.createdAt !== undefined) row.created_at = u.createdAt;
  row.updated_at = new Date().toISOString();
  return row;
}

export function mapDbToUser(u: Record<string, any>): User {
  return {
    id: u.id,
    username: u.username || 'user',
    email: u.email || '',
    passwordHash: u.password_hash || '',
    role: u.role || 'reader',
    status: (u.is_active === false ? 'inactive' : 'active'),
    avatar: u.avatar || '',
    photoURL: u.avatar || '',
    tier: u.role === 'admin' ? 'Premium' : (u.package_type === 'vip' ? 'Premium' : 'Free Tier'),
    planType: (u.package_type === 'vip' ? 'plan_15k_all' : 'plan_5k_single'),
    accessType: (u.package_type === 'vip' ? 'all' : 'specific'),
    durationType: 'unlimited',
    failedAttempts: 0,
    createdAt: u.created_at || new Date().toISOString()
  };
}

export function mapBannerToDb(b: Partial<Banner>): Record<string, any> {
  const row: Record<string, any> = {};
  if (b.id !== undefined) row.id = b.id;
  if (b.title !== undefined) row.title = b.title;
  if (b.imageUrl !== undefined) row.image_url = b.imageUrl;
  if (b.targetComicId !== undefined) row.comic_id = b.targetComicId;
  if (b.isActive !== undefined) row.is_active = b.isActive;
  if (b.order !== undefined) row.order_index = b.order;
  row.created_at = new Date().toISOString();
  return row;
}

export function mapDbToBanner(b: Record<string, any>): Banner {
  return {
    id: b.id,
    title: b.title || '',
    subtitle: b.subtitle || 'Komik Populer Terupdate',
    imageUrl: b.image_url || '',
    targetComicId: b.comic_id || undefined,
    isActive: b.is_active !== false,
    order: b.order_index || 0
  };
}

export function mapSettingsToDb(s: Partial<SystemSettings>): Record<string, any> {
  const row: Record<string, any> = {
    id: 'global_config',
    updated_at: new Date().toISOString()
  };
  if (s.siteName !== undefined) row.site_name = s.siteName;
  if (s.siteAnnouncement !== undefined) row.announcement = s.siteAnnouncement;
  if (s.maintenanceMode !== undefined) row.maintenance_mode = s.maintenanceMode;
  if (s.siteLogo !== undefined) row.site_logo = s.siteLogo;
  if (s.siteFavicon !== undefined) row.site_favicon = s.siteFavicon;
  return row;
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

      const users: User[] = (usersData || []).map(mapDbToUser);

      // 4. Fetch Banners
      const { data: bannersData } = await client
        .from('banners')
        .select('*')
        .order('order_index', { ascending: true });

      const banners: Banner[] = (bannersData || []).map(mapDbToBanner);

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
          maintenanceMode: Boolean(settingsData.maintenance_mode),
          siteLogo: settingsData.site_logo || undefined,
          siteFavicon: settingsData.site_favicon || undefined,
          supabaseUrl: getSupabaseCredentials().url,
          supabaseAnonKey: getSupabaseCredentials().anonKey
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
   * Delete Single Comic
   */
  public static async deleteComic(comicId: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      // Chapters will cascade delete if foreign key cascade exists, but we also delete explicitly
      await client.from('chapters').delete().eq('comic_id', comicId);
      const { error } = await client.from('comics').delete().eq('id', comicId);
      return !error;
    } catch (err) {
      return false;
    }
  }

  /**
   * Batch Delete Comics
   */
  public static async batchDeleteComics(comicIds: string[]): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client || comicIds.length === 0) return false;
    try {
      await client.from('chapters').delete().in('comic_id', comicIds);
      const { error } = await client.from('comics').delete().in('id', comicIds);
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
   * Delete Single Chapter
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
   * Batch Delete Chapters
   */
  public static async batchDeleteChapters(chapterIds: string[]): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client || chapterIds.length === 0) return false;
    try {
      const { error } = await client.from('chapters').delete().in('id', chapterIds);
      return !error;
    } catch (err) {
      return false;
    }
  }

  /**
   * Save / Upsert Single Banner
   */
  public static async saveBanner(banner: Banner): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      const row = mapBannerToDb(banner);
      const { error } = await client.from('banners').upsert(row, { onConflict: 'id' });
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('[SupabaseService] saveBanner error:', err);
      return false;
    }
  }

  /**
   * Delete Banner
   */
  public static async deleteBanner(bannerId: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      const { error } = await client.from('banners').delete().eq('id', bannerId);
      return !error;
    } catch (err) {
      return false;
    }
  }

  /**
   * Save / Upsert User
   */
  public static async saveUser(user: User): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      const row = mapUserToDb(user);
      const { error } = await client.from('users').upsert(row, { onConflict: 'id' });
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('[SupabaseService] saveUser error:', err);
      return false;
    }
  }

  /**
   * Delete User
   */
  public static async deleteUser(userId: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      const { error } = await client.from('users').delete().eq('id', userId);
      return !error;
    } catch (err) {
      return false;
    }
  }

  /**
   * Save System Settings
   */
  public static async saveSettings(settings: SystemSettings): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      const row = mapSettingsToDb(settings);
      const { error } = await client.from('system_settings').upsert(row, { onConflict: 'id' });
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('[SupabaseService] saveSettings error:', err);
      return false;
    }
  }

  /**
   * Realtime Multi-Device Live Broadcast Channel
   * Subscribes to PostgreSQL database changes on all tables.
   */
  public static subscribeToSupabase(callbacks: {
    onComicChange?: (eventType: 'INSERT' | 'UPDATE' | 'DELETE', comic: Comic | { id: string }) => void;
    onChapterChange?: (eventType: 'INSERT' | 'UPDATE' | 'DELETE', chapter: Chapter | { id: string; comicId?: string }) => void;
    onBannerChange?: (eventType: 'INSERT' | 'UPDATE' | 'DELETE', banner: Banner | { id: string }) => void;
    onUserChange?: (eventType: 'INSERT' | 'UPDATE' | 'DELETE', user: User | { id: string }) => void;
    onSettingsChange?: (settings: Partial<SystemSettings>) => void;
  }): () => void {
    const client = getSupabaseClient();
    if (!client) return () => {};

    try {
      const channelId = `antitimpa-realtime-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const channel = client.channel(channelId);

      channel
        // 1. Comics table changes
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comics' }, (payload: any) => {
          if (callbacks.onComicChange) {
            if (payload.eventType === 'DELETE') {
              callbacks.onComicChange('DELETE', { id: payload.old?.id || '' });
            } else if (payload.new) {
              callbacks.onComicChange(payload.eventType, mapDbToComic(payload.new));
            }
          }
        })
        // 2. Chapters table changes
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chapters' }, (payload: any) => {
          if (callbacks.onChapterChange) {
            if (payload.eventType === 'DELETE') {
              callbacks.onChapterChange('DELETE', { id: payload.old?.id || '', comicId: payload.old?.comic_id });
            } else if (payload.new) {
              callbacks.onChapterChange(payload.eventType, mapDbToChapter(payload.new));
            }
          }
        })
        // 3. Banners table changes
        .on('postgres_changes', { event: '*', schema: 'public', table: 'banners' }, (payload: any) => {
          if (callbacks.onBannerChange) {
            if (payload.eventType === 'DELETE') {
              callbacks.onBannerChange('DELETE', { id: payload.old?.id || '' });
            } else if (payload.new) {
              callbacks.onBannerChange(payload.eventType, mapDbToBanner(payload.new));
            }
          }
        })
        // 4. Users table changes
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload: any) => {
          if (callbacks.onUserChange) {
            if (payload.eventType === 'DELETE') {
              callbacks.onUserChange('DELETE', { id: payload.old?.id || '' });
            } else if (payload.new) {
              callbacks.onUserChange(payload.eventType, mapDbToUser(payload.new));
            }
          }
        })
        // 5. System settings table changes
        .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, (payload: any) => {
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
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[Supabase Realtime] Connected and listening for cross-device updates.');
          }
        });

      return () => {
        try {
          client.removeChannel(channel);
        } catch (e) {
          // ignore
        }
      };
    } catch (e) {
      console.warn('[Supabase Realtime] Subscription initialization warning:', e);
      return () => {};
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
      onProgress?.(`Mengunggah ${allChapters.length} chapter ke Supabase...`, 55);
      await this.batchSaveChapters(allChapters);

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

