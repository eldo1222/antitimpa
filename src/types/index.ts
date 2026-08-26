export type UserStatus = 'active' | 'locked' | 'expired' | 'inactive';
export type DurationType = '1_day' | '3_days' | '30_days' | '1_year' | 'unlimited' | 'lifetime' | 'custom';
export type PlanType = 'plan_15k_all' | 'plan_5k_single' | 'custom' | 'none';
export type AccessType = 'all' | 'specific';

export interface UserStats {
  comicsRead: number;
  chaptersRead: number;
  daysActive: number;
}

export interface User {
  id: string;
  uid?: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  username: string;
  password?: string;
  passwordHash?: string; // Stored hashed/encrypted password
  role: 'admin' | 'reader' | 'user';
  status: UserStatus;
  createdAt: string;
  firstLoginAt?: string | null;
  expiresAt?: string | null;
  durationType?: DurationType;
  failedAttempts?: number;
  avatar?: string;
  tier?: 'Free Tier' | 'Pro Member' | 'Premium';
  isVip?: boolean;
  bio?: string;
  stats?: UserStats;
  planType?: PlanType; // 'plan_15k_all' (Akses Semua Komik) | 'plan_5k_single' (1 Judul Tertentu) | 'custom'
  accessType?: AccessType; // 'all' = bisa baca semua judul | 'specific' = hanya judul yang ada di allowedComicIds
  allowedComicIds?: string[]; // Daftar ID komik yang boleh dibaca jika accessType === 'specific'
  priceNote?: string; // misal: "Rp 15.000 / 1 Hari", "Rp 5.000 / 1 Hari"
  notes?: string;
}

export type UserAccount = User;

export interface GoogleUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

export interface LoginHistoryItem {
  id: string;
  userId: string;
  username: string;
  timestamp: string;
  ipAddress: string;
  status: 'success' | 'failed';
  reason?: string;
}

export interface AdminToastItem {
  id: string;
  title: string;
  message?: string;
  type: 'success' | 'info' | 'warning' | 'error';
  timestamp: number;
}

export type ComicStatus = 'ongoing' | 'completed' | 'Ongoing' | 'Completed' | 'Hiatus';
export type ChapterSourceType = 'images' | 'pdf' | 'drive' | 'external';
export type ComicContentType = 'normal' | '18plus';
export type ComicCategoryType = 'manga' | 'manhwa' | 'manhua' | 'doujin' | 'comic' | 'webtoon';
export type ComicType = ComicCategoryType;
export type ContentRating = ComicContentType;
export type ComicProjectType = 'admin_personal' | 'scraped_ready' | 'preview_gateway';

export interface ExternalSource {
  id?: string;
  name?: string; // e.g. 'NHentai', 'Doujindesu', 'MangaDex', 'MangaPlus', 'Crunchyroll', 'Muse Asia', 'Bato.to', 'MyAnimeList', 'Official Website'
  platform?: string; // alias for name
  url: string;
  type?: 'read' | 'watch' | 'raw' | 'official' | 'mirror' | 'database';
  language?: string; // 'ID' | 'EN' | 'RAW' | 'JP' etc.
  quality?: string; // 'HD', 'Official', 'Color', 'Uncensored'
  isFree?: boolean;
  notes?: string;
  badge?: string;
}

export interface Comment {
  id: string;
  comicId: string;
  chapterId?: string;
  chapterNumber?: number;
  userId: string;
  userName?: string;
  username?: string; // alias
  userAvatar: string;
  userRole?: 'admin' | 'reader' | 'google_user' | 'guest';
  authProvider?: 'google' | 'admin_account' | 'guest';
  userEmail?: string;
  content: string;
  createdAt: string;
  likesCount?: number;
  likes?: number; // alias
  likedBy?: string[];
  spoiler?: boolean;
  isSpoiler?: boolean; // alias
  replyToId?: string;
  isAdmin?: boolean;
  isVip?: boolean;
  isLiked?: boolean;
  isGoogleUser?: boolean;
}

export type CommentItem = Comment;

export interface ComicPage {
  id: string;
  pageNumber: number;
  imageUrl: string;
  caption?: string;
}

export interface DriveAccount {
  id: string;
  name: string;
  email: string;
  folderUrl?: string;
  status: 'active' | 'warning' | 'full' | 'backup';
  notes?: string;
  storageUsedGb?: number;
  storageTotalGb?: number;
  colorTag?: string;
  createdAt: string;
}

export interface Chapter {
  id: string;
  comicId: string;
  chapterNumber: number;
  title: string;
  releaseDate: string;
  isNew?: boolean;
  isLocked?: boolean;
  sourceType?: ChapterSourceType; // 'images' | 'pdf' | 'drive' | 'external'
  pdfUrl?: string;
  pdfFileName?: string;
  driveUrl?: string;
  driveEmbedUrl?: string;
  driveFileId?: string;
  driveAccountId?: string;
  driveNotes?: string;
  pages?: ComicPage[] | string[];
  customPages?: string[];
  pageCount?: number;
  viewsCount?: number;
  mangadexChapterId?: string;
  mangadexMangaId?: string;
  externalUrl?: string;
  externalPlatform?: string;
  externalSources?: ExternalSource[];
  externalNote?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Comic {
  id: string;
  title: string;
  slug: string;
  coverImage: string;
  bannerImage?: string;
  synopsis: string;
  genres: string[];
  status: ComicStatus;
  storyWriter: string;
  artist: string;
  author?: string; // alias for storyWriter/artist
  rating: number;
  ratingCount: number;
  totalChapters: number;
  totalReaders?: number;
  totalViews?: number;
  createdAt: string;
  updatedAt: string;
  isTrending?: boolean;
  isFeatured?: boolean;
  primaryDriveAccountId?: string;
  tiktokPromoNote?: string;
  contentType?: ComicContentType; // 'normal' = Manga/Manhwa gratis | '18plus' = VIP Berbayar
  contentRating?: ContentRating; // alias for contentType
  comicType?: ComicCategoryType; // 'manga' | 'manhwa' | 'manhua' | 'webtoon'
  type?: ComicCategoryType; // alias for comicType
  isFree?: boolean; // True jika bisa dibaca langsung tanpa login (default true untuk normal)
  isVisibleOnHome?: boolean; // True jika ditampilkan di beranda (bisa diatur admin)
  showOnHome?: boolean; // alias for isVisibleOnHome
  isPublished?: boolean; // True jika aktif dipublikasikan
  sourceUrl?: string;
  sourceApi?: string;
  mangaDexId?: string;
  externalUrl?: string;
  externalLinks?: ExternalSource[];
  whereToRead?: ExternalSource[];
  hasExternalGateway?: boolean;
  projectType?: ComicProjectType; // 'admin_personal' = Project Pribadi Admin | 'scraped_ready' = Scraping Berhasil | 'preview_gateway' = Preview Gateway Saja
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  targetComicId?: string;
  linkComicId?: string;
  badgeText?: string;
  badge?: string;
  order?: number;
  priority?: number;
  isActive: boolean;
}

export type AdSlotPosition = 
  | 'home_hero_bottom'       // Bagian atas beranda (di bawah banner hero)
  | 'home_between_sections'  // Di sela-sela kategori/bagian beranda
  | 'home_footer'            // Bagian bawah beranda (di bawah katalog komik)
  | 'welcome_popup'          // Iklan Pop-up saat pertama kali buka web
  | 'mitra_interstitial'     // Layar transisi iklan saat menuju link mitra
  | 'chapter_top_a'          // Atas kolom chapter (Provider 1)
  | 'chapter_top_b'          // Atas kolom chapter (Provider 2)
  | 'detail_top'             // Bagian atas halaman detail komik
  | 'detail_bottom'          // Di bawah daftar chapter pada halaman detail
  | 'reader_top_bar'         // Bagian paling atas saat membaca komik (sebelum page 1)
  | 'reader_bottom_nav'      // Di akhir chapter pembaca sebelum tombol next
  | 'popunder'               // Popunder / Direct link on click
  | 'home_top'               // Alias backward compat
  | 'home_bottom'            // Alias backward compat
  | 'comic_detail_bottom'    // Alias backward compat
  | 'reader_end'             // Alias backward compat
  | 'floating_bottom'        // Sticky banner melayang
  | 'popunder_global';       // Alias backward compat

export type AdType = 
  | 'banner'                 // Banner gambar kustom + Link tujuan
  | 'native_text'            // Kartu native dengan teks promosi & tombol
  | 'html_code'              // Kode embed script / HTML iklan
  | 'popunder'               // Direct popunder link
  | 'banner_image'           // Alias
  | 'html_script'            // Alias
  | 'popunder_direct';       // Alias

export interface AdItem {
  id: string;
  title: string;
  type: AdType;
  position: AdSlotPosition;
  isActive: boolean;
  
  // Banner / Native fields
  imageUrl?: string;
  targetUrl?: string;
  altText?: string;
  badgeLabel?: string;
  sponsorName?: string;
  headline?: string;
  description?: string;
  ctaText?: string;
  
  // Script / HTML embed fields
  htmlCode?: string;
  scriptCode?: string;
  
  // Popunder fields
  popunderUrl?: string;
  frequencyHours?: number;
  
  // Proteksi & Pengaturan
  showForVip?: boolean; // false = Otomatis disembunyikan untuk member VIP/berbayar
  maxClicksPerDay?: number;
  clickCount?: number;
  viewCount?: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AdSettings {
  adsEnabled: boolean; // Saklar master iklan aktif/nonaktif
  hideAdsForVip: boolean; // Sembunyikan iklan otomatis untuk member VIP/berbayar
  popunderEnabled: boolean; // Saklar master popunder
  popunderCooldownMinutes?: number; // Jeda popunder dalam menit (default 15 menit)
  popunderCooldownHours?: number; // Jeda popunder dalam jam (opsional)
  welcomePopupEnabled?: boolean; // Saklar popup selamat datang saat pertama kali masuk web
  mitraInterstitialEnabled?: boolean; // Saklar banner iklan pada layar transisi link mitra
  dualChapterAdsEnabled?: boolean; // Saklar dual provider banner di atas kolom chapter
  floatingBottomEnabled?: boolean; // Saklar master floating banner
  showAdLabel?: boolean; // Tampilkan label "Sponsor" untuk transparansi
}

export type ActivityType = 
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'unauthorized_attempt'
  | 'comic_create'
  | 'comic_update'
  | 'comic_delete'
  | 'chapter_create'
  | 'chapter_delete'
  | 'user_create'
  | 'user_update'
  | 'user_unlock'
  | 'user_deactivate'
  | 'banner_update'
  | 'ad_create'
  | 'ad_update'
  | 'ad_delete'
  | 'ad_toggle'
  | 'drive_account_update'
  | 'drive_link_update'
  | 'system_settings';

export interface ActivityLog {
  id: string;
  timestamp: string;
  username: string;
  ipAddress: string;
  action: string;
  type: ActivityType;
  status: 'success' | 'failed' | 'warning' | 'info';
  details?: string;
}

export interface SystemSettings {
  siteName: string;
  siteLogo?: string;
  siteFavicon?: string;
  siteAnnouncement?: string;
  tiktokUrl?: string;
  tiktokHandle?: string;
  maxLoginAttempts: number;
  maxFailedAttempts?: number;
  lockoutDurationMinutes?: number;
  maintenanceMode?: boolean;
  allowGuestPreview?: boolean;
  guestPreviewPages?: number;
  watermarkText?: string;
  adminPhone?: string;
  sessionTimeout?: string;
  defaultComicSorting?: 'newest' | 'popular' | 'alpha';
  defaultReaderMode?: 'vertical' | 'single';
  ageGating18Plus?: boolean;
  price5kTitle?: string;
  price15kTitle?: string;
  adminNotifications?: {
    newReaderRegistration: boolean;
    contentReviewReminders: boolean;
    systemErrorAlerts: boolean;
  };
}

export interface Bookmark {
  comicId: string;
  addedAt: string;
}

export interface ReadingHistory {
  comicId: string;
  chapterId: string;
  chapterNumber: number;
  pageNumber: number;
  totalPages: number;
  updatedAt: string;
}
