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

function safeIsoDate(val?: string | number | Date): string {
  if (!val) return new Date().toISOString();
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch (_) {}
  return new Date().toISOString();
}

export function mapComicToDb(c: Partial<Comic>): Record<string, any> {
  const row: Record<string, any> = {};
  if (c.id !== undefined) row.id = c.id;
  if (c.title !== undefined) row.title = c.title;
  if (c.slug !== undefined) row.slug = c.slug || c.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  if (c.coverImage !== undefined) row.cover_image = c.coverImage;
  if (c.bannerImage !== undefined) row.banner_image = c.bannerImage;
  if (c.synopsis !== undefined) row.synopsis = c.synopsis;
  if (c.genres !== undefined) row.genres = Array.isArray(c.genres) ? c.genres : [];
  if (c.status !== undefined) row.status = c.status || 'ongoing';
  if (c.comicType !== undefined) row.comic_type = c.comicType || 'manga';
  if (c.contentType !== undefined) row.content_type = c.contentType || 'normal';
  if (c.storyWriter !== undefined) row.story_writer = c.storyWriter || '';
  if (c.artist !== undefined) row.artist = c.artist || '';
  if (c.rating !== undefined) row.rating = Number(c.rating) || 0;
  if (c.ratingCount !== undefined) row.rating_count = Number(c.ratingCount) || 0;
  if (c.totalChapters !== undefined) row.total_chapters = Number(c.totalChapters) || 0;
  if (c.totalReaders !== undefined) row.total_readers = Number(c.totalReaders) || 0;
  if (c.isFree !== undefined) row.is_free = c.isFree;
  if (c.isFeatured !== undefined) row.is_featured = Boolean(c.isFeatured);
  if (c.isPublished !== undefined) row.is_published = c.isPublished !== false;
  if (c.isVisibleOnHome !== undefined) row.is_visible_on_home = c.isVisibleOnHome !== false;
  row.created_at = safeIsoDate(c.createdAt);
  row.updated_at = safeIsoDate(c.updatedAt);
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
  if (ch.chapterNumber !== undefined) row.chapter_number = Number(ch.chapterNumber) || 1;
  if (ch.title !== undefined) row.title = ch.title || `Chapter ${ch.chapterNumber || 1}`;
  if (ch.releaseDate !== undefined) row.release_date = ch.releaseDate;
  if (ch.isLocked !== undefined) row.is_locked = Boolean(ch.isLocked);
  if (ch.sourceType !== undefined) row.source_type = ch.sourceType || 'images';
  if (ch.pages !== undefined) row.pages = Array.isArray(ch.pages) ? ch.pages : [];
  if (ch.driveFileId !== undefined) row.drive_file_id = ch.driveFileId;
  if (ch.driveEmbedUrl !== undefined) row.drive_embed_url = ch.driveEmbedUrl;
  if (ch.driveAccountId !== undefined) row.drive_account_id = ch.driveAccountId;
  if (ch.viewsCount !== undefined) row.views_count = Number(ch.viewsCount) || 0;
  row.created_at = safeIsoDate(ch.createdAt);
  row.updated_at = safeIsoDate(ch.updatedAt);
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

export function mapDriveAccountToDb(d: Partial<DriveAccount>): Record<string, any> {
  const row: Record<string, any> = {};
  if (d.id !== undefined) row.id = d.id;
  if (d.name !== undefined) row.name = d.name;
  if (d.email !== undefined) row.email = d.email;
  if (d.folderUrl !== undefined) row.folder_url = d.folderUrl;
  if (d.status !== undefined) row.status = d.status;
  if (d.notes !== undefined) row.notes = d.notes;
  if (d.storageUsedGb !== undefined) row.storage_used_gb = d.storageUsedGb;
  if (d.storageTotalGb !== undefined) row.storage_total_gb = d.storageTotalGb;
  if (d.colorTag !== undefined) row.color_tag = d.colorTag;
  row.created_at = d.createdAt || new Date().toISOString();
  return row;
}

export function mapDbToDriveAccount(d: Record<string, any>): DriveAccount {
  return {
    id: d.id,
    name: d.name || '',
    email: d.email || '',
    folderUrl: d.folder_url || undefined,
    status: d.status || 'active',
    notes: d.notes || undefined,
    storageUsedGb: d.storage_used_gb ? Number(d.storage_used_gb) : undefined,
    storageTotalGb: d.storage_total_gb ? Number(d.storage_total_gb) : undefined,
    colorTag: d.color_tag || undefined,
    createdAt: d.created_at || new Date().toISOString()
  };
}

export function mapActivityLogToDb(l: Partial<ActivityLog>): Record<string, any> {
  const row: Record<string, any> = {};
  if (l.id !== undefined) row.id = l.id;
  if (l.username !== undefined) row.username = l.username;
  if (l.action !== undefined) row.action = l.action;
  if (l.type !== undefined) row.type = l.type;
  if (l.status !== undefined) row.status = l.status;
  if (l.details !== undefined) row.details = l.details;
  if (l.ipAddress !== undefined) row.ip_address = l.ipAddress;
  row.created_at = l.timestamp || new Date().toISOString();
  return row;
}

export function mapDbToActivityLog(l: Record<string, any>): ActivityLog {
  return {
    id: l.id || `log-${Date.now()}`,
    username: l.username || 'System',
    action: l.action || '',
    type: l.type || 'system_settings',
    status: l.status || 'info',
    details: l.details || '',
    ipAddress: l.ip_address || '127.0.0.1',
    timestamp: l.created_at || new Date().toISOString()
  };
}

export function mapCommentToDb(c: Partial<Comment>): Record<string, any> {
  const row: Record<string, any> = {};
  if (c.id !== undefined) row.id = c.id;
  if (c.comicId !== undefined) row.comic_id = c.comicId;
  if (c.chapterId !== undefined) row.chapter_id = c.chapterId;
  if (c.chapterNumber !== undefined) row.chapter_number = c.chapterNumber;
  if (c.userId !== undefined) row.user_id = c.userId;
  if (c.userName !== undefined || c.username !== undefined) row.username = c.userName || c.username;
  if (c.userAvatar !== undefined) row.user_avatar = c.userAvatar;
  if (c.userRole !== undefined) row.user_role = c.userRole;
  if (c.userEmail !== undefined) row.user_email = c.userEmail;
  if (c.content !== undefined) row.content = c.content;
  if (c.likesCount !== undefined || c.likes !== undefined) row.likes_count = c.likesCount ?? c.likes ?? 0;
  if (c.spoiler !== undefined || c.isSpoiler !== undefined) row.spoiler = c.spoiler ?? c.isSpoiler ?? false;
  if (c.replyToId !== undefined) row.reply_to_id = c.replyToId;
  if (c.isAdmin !== undefined) row.is_admin = c.isAdmin;
  if (c.isVip !== undefined) row.is_vip = c.isVip;
  row.created_at = c.createdAt || new Date().toISOString();
  return row;
}

export function mapDbToComment(c: Record<string, any>): Comment {
  return {
    id: c.id,
    comicId: c.comic_id || '',
    chapterId: c.chapter_id || undefined,
    chapterNumber: c.chapter_number ? Number(c.chapter_number) : undefined,
    userId: c.user_id || '',
    userName: c.username || 'Pembaca',
    username: c.username || 'Pembaca',
    userAvatar: c.user_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    userRole: c.user_role || undefined,
    userEmail: c.user_email || undefined,
    content: c.content || '',
    likesCount: Number(c.likes_count) || 0,
    likes: Number(c.likes_count) || 0,
    spoiler: Boolean(c.spoiler),
    isSpoiler: Boolean(c.spoiler),
    replyToId: c.reply_to_id || undefined,
    isAdmin: Boolean(c.is_admin),
    isVip: Boolean(c.is_vip),
    createdAt: c.created_at || new Date().toISOString()
  };
}

export function mapAdToDb(a: Partial<AdItem>): Record<string, any> {
  const row: Record<string, any> = {};
  if (a.id !== undefined) row.id = a.id;
  if (a.title !== undefined) row.title = a.title;
  if (a.type !== undefined) row.type = a.type;
  if (a.position !== undefined) row.position = a.position;
  if (a.isActive !== undefined) row.is_active = a.isActive;
  if (a.imageUrl !== undefined) row.image_url = a.imageUrl;
  if (a.targetUrl !== undefined) row.target_url = a.targetUrl;
  if (a.altText !== undefined) row.alt_text = a.altText;
  if (a.badgeLabel !== undefined) row.badge_label = a.badgeLabel;
  if (a.sponsorName !== undefined) row.sponsor_name = a.sponsorName;
  if (a.headline !== undefined) row.headline = a.headline;
  if (a.description !== undefined) row.description = a.description;
  if (a.ctaText !== undefined) row.cta_text = a.ctaText;
  if (a.htmlCode !== undefined) row.html_code = a.htmlCode;
  if (a.scriptCode !== undefined) row.script_code = a.scriptCode;
  if (a.popunderUrl !== undefined) row.popunder_url = a.popunderUrl;
  if (a.frequencyHours !== undefined) row.frequency_hours = a.frequencyHours;
  if (a.showForVip !== undefined) row.show_for_vip = a.showForVip;
  if (a.maxClicksPerDay !== undefined) row.max_clicks_per_day = a.maxClicksPerDay;
  if (a.clickCount !== undefined) row.click_count = a.clickCount;
  if (a.viewCount !== undefined) row.view_count = a.viewCount;
  if (a.notes !== undefined) row.notes = a.notes;
  row.created_at = a.createdAt || new Date().toISOString();
  return row;
}

export function mapDbToAd(a: Record<string, any>): AdItem {
  return {
    id: a.id,
    title: a.title || 'Sponsor Ad',
    type: a.type || (a.html_code ? 'html_code' : a.popunder_url ? 'popunder' : 'banner'),
    position: a.position || 'home_hero_bottom',
    isActive: a.is_active !== false,
    imageUrl: a.image_url || undefined,
    targetUrl: a.target_url || undefined,
    altText: a.alt_text || undefined,
    badgeLabel: a.badge_label || undefined,
    sponsorName: a.sponsor_name || undefined,
    headline: a.headline || undefined,
    description: a.description || undefined,
    ctaText: a.cta_text || undefined,
    htmlCode: a.html_code || undefined,
    scriptCode: a.script_code || undefined,
    popunderUrl: a.popunder_url || undefined,
    frequencyHours: a.frequency_hours ? Number(a.frequency_hours) : undefined,
    showForVip: a.show_for_vip !== undefined ? Boolean(a.show_for_vip) : false,
    maxClicksPerDay: a.max_clicks_per_day ? Number(a.max_clicks_per_day) : undefined,
    clickCount: Number(a.click_count) || 0,
    viewCount: Number(a.view_count) || 0,
    notes: a.notes || undefined,
    createdAt: a.created_at || new Date().toISOString()
  };
}

export function mapAdSettingsToDb(s: Partial<AdSettings>): Record<string, any> {
  const row: Record<string, any> = {
    id: 'global_ad_config',
    updated_at: new Date().toISOString()
  };
  if (s.adsEnabled !== undefined) row.ads_enabled = s.adsEnabled;
  if (s.hideAdsForVip !== undefined) row.hide_ads_for_vip = s.hideAdsForVip;
  if (s.popunderEnabled !== undefined) row.popunder_enabled = s.popunderEnabled;
  if (s.popunderCooldownMinutes !== undefined) row.popunder_cooldown_minutes = s.popunderCooldownMinutes;
  if (s.popunderCooldownHours !== undefined) row.popunder_cooldown_hours = s.popunderCooldownHours;
  if (s.welcomePopupEnabled !== undefined) row.welcome_popup_enabled = s.welcomePopupEnabled;
  if (s.mitraInterstitialEnabled !== undefined) row.mitra_interstitial_enabled = s.mitraInterstitialEnabled;
  if (s.dualChapterAdsEnabled !== undefined) row.dual_chapter_ads_enabled = s.dualChapterAdsEnabled;
  if (s.floatingBottomEnabled !== undefined) row.floating_bottom_enabled = s.floatingBottomEnabled;
  if (s.showAdLabel !== undefined) row.show_ad_label = s.showAdLabel;
  return row;
}

export function mapDbToAdSettings(s: Record<string, any>): AdSettings {
  return {
    adsEnabled: s.ads_enabled !== false,
    hideAdsForVip: s.hide_ads_for_vip !== false,
    popunderEnabled: s.popunder_enabled !== false,
    popunderCooldownMinutes: s.popunder_cooldown_minutes ? Number(s.popunder_cooldown_minutes) : 15,
    popunderCooldownHours: s.popunder_cooldown_hours ? Number(s.popunder_cooldown_hours) : 1,
    welcomePopupEnabled: Boolean(s.welcome_popup_enabled),
    mitraInterstitialEnabled: s.mitra_interstitial_enabled !== false,
    dualChapterAdsEnabled: s.dual_chapter_ads_enabled !== false,
    floatingBottomEnabled: s.floating_bottom_enabled !== false,
    showAdLabel: s.show_ad_label !== false
  };
}

export class SupabaseService {
  /**
   * Helper to fetch all rows with Supabase Range Pagination (>1000 rows without truncation)
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
        client.from('users').select('*', { count: 'exact', head: true }),
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
   * Fetch All Data from Supabase Database (Multi-Device Single Source of Truth)
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
      // 1. Fetch ALL Comics (Paginated)
      const comicsRows = await this.fetchAllRows('comics', '*', 'updated_at', false);
      const comics: Comic[] = comicsRows.map(mapDbToComic);

      // 2. Fetch ALL Chapters (Paginated)
      const chaptersRows = await this.fetchAllRows('chapters', '*', 'chapter_number', true);
      const chaptersMap: Record<string, Chapter[]> = {};
      chaptersRows.forEach(row => {
        const ch = mapDbToChapter(row);
        if (!chaptersMap[ch.comicId]) {
          chaptersMap[ch.comicId] = [];
        }
        chaptersMap[ch.comicId].push(ch);
      });

      // 3. Fetch Users
      const usersRows = await this.fetchAllRows('users', '*', 'created_at', false);
      const users: User[] = usersRows.map(mapDbToUser);

      // 4. Fetch Banners
      const bannersRows = await this.fetchAllRows('banners', '*', 'order_index', true);
      const banners: Banner[] = bannersRows.map(mapDbToBanner);

      // 5. Fetch Drive Accounts
      let driveAccounts: DriveAccount[] = [];
      try {
        const drivesData = await this.fetchAllRows('drive_accounts', '*', 'created_at', false);
        if (drivesData) driveAccounts = drivesData.map(mapDbToDriveAccount);
      } catch (e) {}

      // 6. Fetch Activity Logs
      let activityLogs: ActivityLog[] = [];
      try {
        const logsData = await this.fetchAllRows('activity_logs', '*', 'created_at', false);
        if (logsData) activityLogs = logsData.slice(0, 200).map(mapDbToActivityLog);
      } catch (e) {}

      // 7. Fetch Comments
      let comments: Comment[] = [];
      try {
        const commentsData = await this.fetchAllRows('comments', '*', 'created_at', false);
        if (commentsData) comments = commentsData.map(mapDbToComment);
      } catch (e) {}

      // 8. Fetch Ads
      let ads: AdItem[] = [];
      try {
        const adsData = await this.fetchAllRows('ads', '*', 'created_at', false);
        if (adsData) ads = adsData.map(mapDbToAd);
      } catch (e) {}

      // 9. Fetch Ad Settings
      let adSettings: AdSettings | null = null;
      try {
        const { data: adSetData } = await client.from('ad_settings').select('*').limit(1).maybeSingle();
        if (adSetData) {
          adSettings = mapDbToAdSettings(adSetData);
        }
      } catch (e) {}

      // 10. Fetch Settings
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
        driveAccounts,
        activityLogs,
        comments,
        ads,
        adSettings,
        systemSettings
      };
    } catch (error) {
      console.warn('[SupabaseService] fetchFullDatabase error:', error);
      return null;
    }
  }

  /**
   * Fetch Single User by Username or Email directly from Supabase
   */
  public static async fetchUser(identifier: string): Promise<User | null> {
    const client = getSupabaseClient();
    if (!client || !identifier) return null;
    try {
      const clean = identifier.trim();
      const isEmail = clean.includes('@');
      const { data, error } = isEmail
        ? await client.from('users').select('*').ilike('email', clean).maybeSingle()
        : await client.from('users').select('*').ilike('username', clean).maybeSingle();

      if (error || !data) return null;
      return mapDbToUser(data);
    } catch (err) {
      console.warn('[SupabaseService] fetchUser error:', err);
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
   * Batch Save Comics with chunking and individual fallback
   */
  public static async batchSaveComics(comics: Comic[]): Promise<{ success: boolean; count: number; error?: string }> {
    const client = getSupabaseClient();
    if (!client || comics.length === 0) return { success: true, count: 0 };
    
    let savedCount = 0;
    const chunkSize = 50;
    const rows = comics.map(c => mapComicToDb(c));

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await client.from('comics').upsert(chunk, { onConflict: 'id' });
      
      if (error) {
        console.warn(`[SupabaseService] Batch upsert error on comics chunk ${i}, trying individual rows:`, error);
        // Fallback to row by row for this chunk
        for (const row of chunk) {
          const { error: rowErr } = await client.from('comics').upsert(row, { onConflict: 'id' });
          if (!rowErr) {
            savedCount++;
          }
        }
      } else {
        savedCount += chunk.length;
      }
    }

    return { 
      success: savedCount > 0 || comics.length === 0, 
      count: savedCount 
    };
  }

  /**
   * Delete Single Comic
   */
  public static async deleteComic(comicId: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;
    try {
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
   * Batch Save Chapters with chunking and individual fallback
   */
  public static async batchSaveChapters(chapters: Chapter[]): Promise<{ success: boolean; count: number; error?: string }> {
    const client = getSupabaseClient();
    if (!client || chapters.length === 0) return { success: true, count: 0 };
    
    let savedCount = 0;
    const chunkSize = 50;
    const rows = chapters.map(ch => mapChapterToDb(ch));

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await client.from('chapters').upsert(chunk, { onConflict: 'id' });
      
      if (error) {
        console.warn(`[SupabaseService] Batch upsert error on chapters chunk ${i}, trying individual rows:`, error);
        // Fallback to row by row for this chunk
        for (const row of chunk) {
          const { error: rowErr } = await client.from('chapters').upsert(row, { onConflict: 'id' });
          if (!rowErr) {
            savedCount++;
          }
        }
      } else {
        savedCount += chunk.length;
      }
    }

    return { 
      success: savedCount > 0 || chapters.length === 0, 
      count: savedCount 
    };
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
   * Save Drive Account
   */
  public static async saveDriveAccount(account: DriveAccount): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      const row = mapDriveAccountToDb(account);
      const { error } = await client.from('drive_accounts').upsert(row, { onConflict: 'id' });
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('[SupabaseService] saveDriveAccount error:', err);
      return false;
    }
  }

  /**
   * Delete Drive Account
   */
  public static async deleteDriveAccount(id: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      const { error } = await client.from('drive_accounts').delete().eq('id', id);
      return !error;
    } catch (err) {
      return false;
    }
  }

  /**
   * Save Activity Log
   */
  public static async saveActivityLog(log: ActivityLog): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      const row = mapActivityLogToDb(log);
      const { error } = await client.from('activity_logs').upsert(row, { onConflict: 'id' });
      if (error) throw error;
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Save Comment
   */
  public static async saveComment(comment: Comment): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      const row = mapCommentToDb(comment);
      const { error } = await client.from('comments').upsert(row, { onConflict: 'id' });
      if (error) throw error;
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Delete Comment
   */
  public static async deleteComment(id: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      const { error } = await client.from('comments').delete().eq('id', id);
      return !error;
    } catch (err) {
      return false;
    }
  }

  /**
   * Save Ad Item
   */
  public static async saveAd(ad: AdItem): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      const row = mapAdToDb(ad);
      const { error } = await client.from('ads').upsert(row, { onConflict: 'id' });
      if (error) throw error;
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Delete Ad Item
   */
  public static async deleteAd(id: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      const { error } = await client.from('ads').delete().eq('id', id);
      return !error;
    } catch (err) {
      return false;
    }
  }

  /**
   * Save Ad Settings
   */
  public static async saveAdSettings(settings: AdSettings): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      const row = mapAdSettingsToDb(settings);
      const { error } = await client.from('ad_settings').upsert(row, { onConflict: 'id' });
      if (error) throw error;
      return true;
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
    onDriveChange?: (eventType: 'INSERT' | 'UPDATE' | 'DELETE', drive: DriveAccount | { id: string }) => void;
    onLogChange?: (log: ActivityLog) => void;
    onCommentChange?: (eventType: 'INSERT' | 'UPDATE' | 'DELETE', comment: Comment | { id: string }) => void;
    onAdChange?: (eventType: 'INSERT' | 'UPDATE' | 'DELETE', ad: AdItem | { id: string }) => void;
    onAdSettingsChange?: (adSettings: Partial<AdSettings>) => void;
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
        // 6. Drive accounts changes
        .on('postgres_changes', { event: '*', schema: 'public', table: 'drive_accounts' }, (payload: any) => {
          if (callbacks.onDriveChange) {
            if (payload.eventType === 'DELETE') {
              callbacks.onDriveChange('DELETE', { id: payload.old?.id || '' });
            } else if (payload.new) {
              callbacks.onDriveChange(payload.eventType, mapDbToDriveAccount(payload.new));
            }
          }
        })
        // 7. Comments changes
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, (payload: any) => {
          if (callbacks.onCommentChange) {
            if (payload.eventType === 'DELETE') {
              callbacks.onCommentChange('DELETE', { id: payload.old?.id || '' });
            } else if (payload.new) {
              callbacks.onCommentChange(payload.eventType, mapDbToComment(payload.new));
            }
          }
        })
        // 8. Ads changes
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
   * Alias for subscribeToSupabase
   */
  public static subscribeToRealtime(callbacks: {
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
  }): () => void {
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

