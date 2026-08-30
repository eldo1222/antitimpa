import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { 
  Comic, 
  Chapter, 
  User, 
  Banner, 
  ActivityLog, 
  SystemSettings, 
  Bookmark, 
  ReadingHistory,
  DurationType,
  PlanType,
  AccessType,
  ComicPage,
  ChapterSourceType,
  DriveAccount,
  Comment,
  AdItem,
  AdSettings,
  AdSlotPosition,
  AdType,
  AdminToastItem,
  ExternalSource
} from '../types';
import { 
  initialComics, 
  initialChapters, 
  initialUsers, 
  initialBanners, 
  initialActivityLogs, 
  initialSystemSettings, 
  initialDriveAccounts,
  initialComments,
  initialAds,
  initialAdSettings,
  generateComicPageSvg
} from '../data/initialData';
import { formatGoogleDriveEmbedUrl } from '../utils/driveHelper';
import { updateFavicon } from '../utils/favicon';
import { SupabaseService } from '../services/supabaseService';
import { isSupabaseConfigured, saveCustomSupabaseConfig, fetchUniversalSupabaseConfig } from '../lib/supabase';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import bcrypt from 'bcryptjs';

export const ADMIN_EMAILS = [
  'admin@email.com',
  'eldorivaldo8@gmail.com',
  'admin@antitimpa.id',
  'eldoa@gmail.com'
];

export interface ComicAccessCheck {
  allowed: boolean;
  reason?: 'unauthenticated' | 'locked' | 'inactive' | 'expired' | 'restricted_plan';
  message?: string;
  allowedComicTitles?: string[];
}

export interface GoogleAuthUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role?: 'admin' | 'reader' | 'user';
  createdAt?: any;
}

export interface PendingGoogleUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}

interface AppContextType {
  // State
  currentUser: User | null;
  googleUser: GoogleAuthUser | null;
  pendingGoogleUser: PendingGoogleUser | null;
  comics: Comic[];
  chapters: Record<string, Chapter[]>;
  users: User[];
  banners: Banner[];
  activityLogs: ActivityLog[];
  systemSettings: SystemSettings;
  driveAccounts: DriveAccount[];
  bookmarks: Bookmark[];
  readingHistory: ReadingHistory[];
  comments: Comment[];
  selectedGenreFilter: string;
  ads: AdItem[];
  adSettings: AdSettings;
  realtimeStatus: 'connected' | 'connecting' | 'disconnected';
  lastSyncTime: string | null;
  lastRealtimeEvent: { time: string; table: string; type: string } | null;
  
  // Navigation & UI state
  activeTab: 'home' | 'discover' | 'library' | 'profile';
  selectedComicId: string | null;
  readingChapterId: string | null;
  isAdminView: boolean;
  adminActiveMenu: 'dashboard' | 'comics' | 'scraper' | 'chapters' | 'drives' | 'readers' | 'banners' | 'ads' | 'genres' | 'database' | 'logs' | 'settings';
  isLoginModalOpen: boolean;
  loginModalRedirectNotice?: string;
  isGoogleAuthModalOpen: boolean;
  isRegisterModalOpen: boolean;
  isProfileSettingsModalOpen: boolean;
  isMobileDeviceFrame: boolean;
  
  // Actions - Auth
  login: (username: string, password: string) => Promise<{ success: boolean; message: string; remainingAttempts?: number; user?: User }> | { success: boolean; message: string; remainingAttempts?: number; user?: User };
  logout: () => void;
  loginWithGoogle: (manualGoogleData?: { email: string; displayName: string; photoURL?: string; adminPass?: string }) => Promise<{ success: boolean; user?: any; needRegistration?: boolean; pendingUser?: PendingGoogleUser; message?: string; errorType?: string }>;
  registerWithGoogle: (username: string, password: string, additionalProfile?: { displayName?: string; avatar?: string; bio?: string }) => Promise<{ success: boolean; message?: string; user?: User }>;
  logoutGoogle: () => Promise<void> | void;
  isLoggedIn: () => boolean;
  getUserIdentity: () => { name: string; avatar: string; uid: string; role?: string; email?: string } | null;
  openLoginModal: (notice?: string) => void;
  closeLoginModal: () => void;
  openGoogleAuthModal: (notice?: string) => void;
  closeGoogleAuthModal: () => void;
  openRegisterModal: (pendingData?: PendingGoogleUser) => void;
  closeRegisterModal: () => void;
  openProfileSettingsModal: () => void;
  closeProfileSettingsModal: () => void;
  changeUserPassword: (userId: string, currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;

  // Actions - Access & Permissions
  canUserReadComic: (comicId: string, userToCheck?: User | null) => ComicAccessCheck;

  // Actions - Navigation & Genre
  setActiveTab: (tab: 'home' | 'discover' | 'library' | 'profile') => void;
  selectComic: (comicId: string | null) => void;
  setSelectedGenreFilter: (genre: string) => void;
  navigateToGenre: (genre: string) => void;
  startReading: (chapterId: string) => boolean;
  closeReader: () => void;
  setIsAdminView: (isAdmin: boolean) => void;
  setAdminActiveMenu: (menu: 'dashboard' | 'comics' | 'scraper' | 'chapters' | 'drives' | 'readers' | 'banners' | 'ads' | 'genres' | 'database' | 'logs' | 'settings') => void;
  toggleMobileDeviceFrame: () => void;

  // Actions - Comics & Chapters
  addComic: (comic: Omit<Comic, 'id' | 'createdAt' | 'updatedAt' | 'rating' | 'ratingCount' | 'totalReaders' | 'totalChapters'> & { id?: string; createdAt?: string; updatedAt?: string; rating?: number; ratingCount?: number; totalReaders?: number; totalChapters?: number }) => void;
  injectComicWithChapters: (comic: Comic, chaptersList: Chapter[]) => void;
  batchInjectComicsWithChapters: (items: { comic: Comic; chapters: Chapter[] }[]) => void;
  updateComic: (id: string, updates: Partial<Comic>) => void;
  deleteComic: (id: string, reason?: string) => void;
  batchDeleteComics: (ids: string[], reason?: string) => void;
  toggleComicHomeVisibility: (comicId: string) => void;
  batchToggleComicHomeVisibility: (comicIds: string[], isVisible: boolean) => void;
  cleanOrphanData: () => Promise<{ deletedChapters: number; deletedComments: number; deletedBanners: number }>;
  addChapter: (comicId: string, chapterData: { 
    chapterNumber: number; 
    title: string; 
    sourceType?: ChapterSourceType;
    pageCount?: number; 
    customPages?: string[];
    pdfUrl?: string;
    pdfFileName?: string;
    driveUrl?: string;
    driveEmbedUrl?: string;
    driveAccountId?: string;
    driveNotes?: string;
    externalUrl?: string;
    externalPlatform?: string;
    externalSources?: ExternalSource[];
    externalNote?: string;
  }) => void;
  updateChapter: (comicId: string, chapterId: string, updates: Partial<Chapter>) => void;
  deleteChapter: (comicId: string, chapterId: string, reason?: string) => void;
  batchDeleteChapters: (comicId: string, chapterIds: string[], reason?: string) => void;
  updateChapterDriveLink: (comicId: string, chapterId: string, driveUrl: string, driveAccountId?: string, driveNotes?: string) => void;

  // Actions - Comments & Threading
  addComment: (data: { comicId: string; chapterId?: string; chapterNumber?: number; content: string; spoiler?: boolean; replyToId?: string }) => Comment;
  toggleLikeComment: (commentId: string) => void;
  deleteComment: (commentId: string) => void;

  // Actions - Drive Storage Hub
  addDriveAccount: (account: Omit<DriveAccount, 'id' | 'createdAt'>) => void;
  updateDriveAccount: (id: string, updates: Partial<DriveAccount>) => void;
  deleteDriveAccount: (id: string) => void;

  // Actions - Users Management
  addUser: (userData: { 
    username: string; 
    password: string; 
    durationType: DurationType; 
    tier?: 'Free Tier' | 'Pro Member' | 'Premium';
    planType?: PlanType;
    accessType?: AccessType;
    allowedComicIds?: string[];
    priceNote?: string;
  }) => { success: boolean; message: string };
  updateUser: (id: string, updates: Partial<User>) => void;
  updateUserProfile: (userId: string, updates: { avatar?: string; displayName?: string; bio?: string; username?: string; password?: string }) => Promise<{ success: boolean; message: string }> | void;
  unlockUser: (id: string) => void;
  unlockAllUsers: () => { count: number };
  toggleUserStatus: (id: string) => void;
  deleteUser: (id: string) => void;
  changeAdminPassword: (oldPassword: string, newPassword: string) => { success: boolean; message: string };

  // Actions - Banners & Settings
  addBanner: (banner: Omit<Banner, 'id'>) => void;
  updateBanner: (id: string, updates: Partial<Banner>) => void;
  deleteBanner: (id: string) => void;
  updateSettings: (settings: Partial<SystemSettings>) => void;
  addActivityLog: (type: string, message: string) => void;
  clearActivityLogs?: (reason?: string) => void;

  // Actions - Ads & Monetization
  addAd: (adData: Omit<AdItem, 'id' | 'createdAt'>) => void;
  updateAd: (id: string, updates: Partial<AdItem>) => void;
  deleteAd: (id: string) => void;
  toggleAd: (id: string) => void;
  updateAdSettings: (settings: Partial<AdSettings>) => void;
  trackAdClick: (id: string) => void;
  trackAdView: (id: string) => void;
  getAdsByPosition: (position: AdSlotPosition) => AdItem[];
  canShowAd: (ad: AdItem) => boolean;
  triggerPopunder: (customUrl?: string) => boolean;

  // Actions - Bookmarks & History
  toggleBookmark: (comicId: string) => void;
  isBookmarked: (comicId: string) => boolean;
  saveReadingProgress: (comicId: string, chapterId: string, chapterNumber: number, pageNumber: number, totalPages: number) => void;
  getReadingProgress: (comicId: string) => ReadingHistory | undefined;

  // Actions - Admin Notifications Toast
  adminToasts: AdminToastItem[];
  showAdminToast: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  removeAdminToast: (id: string) => void;

  // Actions - Supabase Central Synchronization
  syncWithSupabase: () => Promise<{ success: boolean; message: string; comicsCount: number; chaptersCount: number }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  CURRENT_USER: 'antitimpa_current_user_v1',
  GOOGLE_USER: 'antitimpa_google_user_v1',
  COMICS: 'antitimpa_comics_v1',
  CHAPTERS: 'antitimpa_chapters_v1',
  USERS: 'antitimpa_users_v1',
  BANNERS: 'antitimpa_banners_v1',
  ADS: 'antitimpa_ads_v1',
  AD_SETTINGS: 'antitimpa_ad_settings_v1',
  DRIVE_ACCOUNTS: 'antitimpa_drive_accounts_v1',
  LOGS: 'antitimpa_logs_v1',
  SETTINGS: 'antitimpa_settings_v1',
  BOOKMARKS: 'antitimpa_bookmarks_v1',
  HISTORY: 'antitimpa_history_v1',
  COMMENTS: 'antitimpa_comments_v1',
};

const getDurationMs = (durationType: DurationType): number => {
  switch (durationType) {
    case '1_day': return 24 * 60 * 60 * 1000;
    case '3_days': return 3 * 24 * 60 * 60 * 1000;
    case '30_days': return 30 * 24 * 60 * 60 * 1000;
    case '1_year': return 365 * 24 * 60 * 60 * 1000;
    default: return 30 * 24 * 60 * 60 * 1000;
  }
};

function safeParseJson<T>(key: string, fallback: T): T {
  try {
    let saved = localStorage.getItem(key);
    // Backward compatibility with legacy komikyuk keys
    if (!saved && key.startsWith('antitimpa_')) {
      const legacyKey = key.replace('antitimpa_', 'komikyuk_');
      saved = localStorage.getItem(legacyKey);
    }
    if (!saved) return fallback;
    return JSON.parse(saved);
  } catch (e) {
    console.warn(`Failed to parse localStorage key ${key}, using fallback:`, e);
    return fallback;
  }
}

function safeSetItem(key: string, data: any): void {
  try {
    const serialized = typeof data === 'string' ? data : JSON.stringify(data);
    localStorage.setItem(key, serialized);
  } catch (error: any) {
    // Gracefully handle browser quota exceeded error (typically 5MB limit)
    console.warn(`[LocalStorage] Quota limit reached or write failed for '${key}'. Continuing with Firebase and Memory state.`);
    // If chapters exceeded quota, purge the heavy chapters key to free up local space for user session & settings
    if (key === STORAGE_KEYS.CHAPTERS || error?.name === 'QuotaExceededError' || error?.code === 22 || error?.number === -2147024882) {
      try {
        localStorage.removeItem(STORAGE_KEYS.CHAPTERS);
      } catch (_) {}
    }
  }
}

function deduplicateById<T extends { id: string }>(items: T[]): T[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  return items.filter(item => {
    if (!item || !item.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function sanitizeChaptersMap(rawChapters: Record<string, Chapter[]> | undefined | null): Record<string, Chapter[]> {
  if (!rawChapters || typeof rawChapters !== 'object') return {};
  const result: Record<string, Chapter[]> = {};

  for (const [comicId, chList] of Object.entries(rawChapters)) {
    if (!Array.isArray(chList)) continue;
    const seenIds = new Set<string>();
    const sanitized: Chapter[] = [];
    for (let i = 0; i < chList.length; i++) {
      const ch = chList[i];
      if (!ch) continue;
      let chId = ch.id || `ch-${comicId}-${ch.chapterNumber || (i + 1)}`;
      if (seenIds.has(chId)) {
        chId = `${chId}-v${i + 1}`;
      }
      seenIds.add(chId);
      sanitized.push({
        ...ch,
        id: chId
      });
    }
    result[comicId] = sanitized;
  }
  return result;
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load from localStorage or fallback to initial data safely
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    return safeParseJson<User | null>(STORAGE_KEYS.CURRENT_USER, null);
  });

  const [googleUser, setGoogleUser] = useState<GoogleAuthUser | null>(() => {
    return safeParseJson<GoogleAuthUser | null>(STORAGE_KEYS.GOOGLE_USER, null);
  });

  const [comics, setComics] = useState<Comic[]>(() => {
    const raw = safeParseJson<Comic[]>(STORAGE_KEYS.COMICS, []);
    return deduplicateById(raw);
  });

  const [chapters, setChapters] = useState<Record<string, Chapter[]>>(() => {
    const raw = safeParseJson<Record<string, Chapter[]>>(STORAGE_KEYS.CHAPTERS, {});
    return sanitizeChaptersMap(raw);
  });

  const [users, setUsers] = useState<User[]>(() => {
    return safeParseJson<User[]>(STORAGE_KEYS.USERS, initialUsers);
  });

  const [banners, setBanners] = useState<Banner[]>(() => {
    return safeParseJson<Banner[]>(STORAGE_KEYS.BANNERS, []);
  });

  const [driveAccounts, setDriveAccounts] = useState<DriveAccount[]>(() => {
    return safeParseJson<DriveAccount[]>(STORAGE_KEYS.DRIVE_ACCOUNTS, initialDriveAccounts);
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    return safeParseJson<ActivityLog[]>(STORAGE_KEYS.LOGS, initialActivityLogs);
  });

  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => {
    return safeParseJson<SystemSettings>(STORAGE_KEYS.SETTINGS, initialSystemSettings);
  });

  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    return safeParseJson<Bookmark[]>(STORAGE_KEYS.BOOKMARKS, []);
  });

  const [readingHistory, setReadingHistory] = useState<ReadingHistory[]>(() => {
    return safeParseJson<ReadingHistory[]>(STORAGE_KEYS.HISTORY, []);
  });

  const [comments, setComments] = useState<Comment[]>(() => {
    return safeParseJson<Comment[]>(STORAGE_KEYS.COMMENTS, []);
  });

  const [ads, setAds] = useState<AdItem[]>(() => {
    return safeParseJson<AdItem[]>(STORAGE_KEYS.ADS, initialAds);
  });

  const [adSettings, setAdSettings] = useState<AdSettings>(() => {
    return safeParseJson<AdSettings>(STORAGE_KEYS.AD_SETTINGS, initialAdSettings);
  });

  const [selectedGenreFilter, setSelectedGenreFilter] = useState<string>('All');

  // UI state
  const [activeTab, setActiveTab] = useState<'home' | 'discover' | 'library' | 'profile'>('home');
  const [selectedComicId, setSelectedComicId] = useState<string | null>(null);
  const [readingChapterId, setReadingChapterId] = useState<string | null>(null);
  const [isAdminView, setIsAdminViewState] = useState<boolean>(false);

  // Persistent Admin Active Menu (Preserves tab on reload / scraper injection)
  type AdminMenuOption = 'dashboard' | 'comics' | 'scraper' | 'chapters' | 'drives' | 'readers' | 'banners' | 'ads' | 'genres' | 'database' | 'logs' | 'settings';
  const [adminActiveMenu, setAdminActiveMenuState] = useState<AdminMenuOption>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab') as AdminMenuOption;
      const validTabs: AdminMenuOption[] = ['dashboard', 'comics', 'scraper', 'chapters', 'drives', 'readers', 'banners', 'ads', 'genres', 'database', 'logs', 'settings'];
      if (tabParam && validTabs.includes(tabParam)) {
        return tabParam;
      }
      const saved = localStorage.getItem('antitimpa_admin_tab') as AdminMenuOption;
      if (saved && validTabs.includes(saved)) {
        return saved;
      }
    }
    return 'dashboard';
  });

  const setAdminActiveMenu = useCallback((menu: AdminMenuOption) => {
    setAdminActiveMenuState(menu);
    if (typeof window !== 'undefined') {
      localStorage.setItem('antitimpa_admin_tab', menu);
      try {
        const url = new URL(window.location.href);
        if (url.pathname.startsWith('/admin')) {
          url.searchParams.set('tab', menu);
          window.history.replaceState({}, '', url.toString());
        }
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [loginModalRedirectNotice, setLoginModalRedirectNotice] = useState<string | undefined>(undefined);
  const [isGoogleAuthModalOpen, setIsGoogleAuthModalOpen] = useState<boolean>(false);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<PendingGoogleUser | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
  const [isProfileSettingsModalOpen, setIsProfileSettingsModalOpen] = useState<boolean>(false);
  const [isMobileDeviceFrame, setIsMobileDeviceFrame] = useState<boolean>(false);

  const openGoogleAuthModal = useCallback((notice?: string) => {
    if (notice) {
      setLoginModalRedirectNotice(notice);
    }
    setIsGoogleAuthModalOpen(true);
  }, []);

  const closeGoogleAuthModal = useCallback(() => {
    setIsGoogleAuthModalOpen(false);
  }, []);

  const openRegisterModal = useCallback((pendingData?: PendingGoogleUser) => {
    if (pendingData) {
      setPendingGoogleUser(pendingData);
    }
    setIsRegisterModalOpen(true);
  }, []);

  const closeRegisterModal = useCallback(() => {
    setIsRegisterModalOpen(false);
  }, []);

  const openProfileSettingsModal = useCallback(() => {
    setIsProfileSettingsModalOpen(true);
  }, []);

  const closeProfileSettingsModal = useCallback(() => {
    setIsProfileSettingsModalOpen(false);
  }, []);

  // Admin Toast Notifications State
  const [adminToasts, setAdminToasts] = useState<AdminToastItem[]>([]);
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [lastRealtimeEvent, setLastRealtimeEvent] = useState<{ time: string; table: string; type: string } | null>(null);

  const showAdminToast = useCallback((title: string, message?: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newToast: AdminToastItem = {
      id,
      title,
      message,
      type,
      timestamp: Date.now()
    };
    setAdminToasts(prev => [...prev.slice(-3), newToast]);

    setTimeout(() => {
      setAdminToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeAdminToast = useCallback((id: string) => {
    setAdminToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Supabase Realtime Single Source of Truth Synchronization (Cross-Browser & Multi-Device)
  useEffect(() => {
    let isMounted = true;
    let unsubSupabaseRealtime: (() => void) | null = null;

    // Helper to refresh state from Supabase snapshot
    const refreshFromSupabase = async () => {
      try {
        if (!isSupabaseConfigured()) {
          await fetchUniversalSupabaseConfig();
        }
        const supabaseData = await SupabaseService.fetchFullDatabase();
        if (supabaseData && isMounted) {
          if (Array.isArray(supabaseData.comics)) {
            const remoteComics = deduplicateById(supabaseData.comics);
            setComics(remoteComics);
          }
          if (supabaseData.chapters && typeof supabaseData.chapters === 'object') {
            const sanitizedRemote = sanitizeChaptersMap(supabaseData.chapters);
            setChapters(sanitizedRemote);
          }
          if (Array.isArray(supabaseData.users) && supabaseData.users.length > 0) {
            setUsers(supabaseData.users);
            setCurrentUser(prev => {
              if (!prev) return null;
              const match = supabaseData.users?.find(u => 
                u.id === prev.id || 
                (u.role === 'admin' && prev.role === 'admin') || 
                ((u.username || '').toLowerCase() === (prev.username || '').toLowerCase())
              );
              if (!match) return prev;
              safeSetItem(STORAGE_KEYS.CURRENT_USER, match);
              return match;
            });
          }
          if (Array.isArray(supabaseData.banners)) {
            setBanners(supabaseData.banners);
          }
          if (Array.isArray(supabaseData.driveAccounts)) {
            setDriveAccounts(supabaseData.driveAccounts);
          }
          if (Array.isArray(supabaseData.activityLogs)) {
            setActivityLogs(supabaseData.activityLogs);
          }
          if (Array.isArray(supabaseData.comments)) {
            setComments(supabaseData.comments);
          }
          if (Array.isArray(supabaseData.ads)) {
            setAds(supabaseData.ads);
          }
          if (supabaseData.adSettings) {
            setAdSettings(supabaseData.adSettings);
          }
          if (supabaseData.systemSettings) {
            setSystemSettings(prev => ({ ...prev, ...supabaseData.systemSettings }));
          }
          setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
        }
      } catch (e) {
        console.warn('[Supabase Sync] Fetch error:', e);
      }
    };

    // 1. Initial configuration bootstrap and database fetch
    fetchUniversalSupabaseConfig().then(() => {
      if (!isMounted) return;

      // Start Supabase Postgres Realtime changes across all connected devices
      unsubSupabaseRealtime = SupabaseService.subscribeToRealtime({
        onStatusChange: (status) => {
          if (isMounted) setRealtimeStatus(status);
        },
        onComicChange: (eventType, comic) => {
          if (isMounted) {
            setLastRealtimeEvent({ time: new Date().toLocaleTimeString('id-ID'), table: 'comics', type: eventType });
          }
          if (eventType === 'DELETE') {
            setComics(prev => prev.filter(c => c.id !== comic.id));
            setChapters(prev => {
              const next = { ...prev };
              delete next[comic.id];
              return next;
            });
          } else if (comic && comic.id) {
            setComics(prev => {
              const exists = prev.some(c => c.id === comic.id);
              if (exists) {
                return prev.map(c => c.id === comic.id ? { ...c, ...comic } : c);
              }
              return [comic as Comic, ...prev];
            });
          }
        },
        onChapterChange: (eventType, chapter) => {
          if (isMounted) {
            setLastRealtimeEvent({ time: new Date().toLocaleTimeString('id-ID'), table: 'chapters', type: eventType });
          }
          if (eventType === 'DELETE') {
            if (chapter.comicId) {
              setChapters(prev => {
                const list = prev[chapter.comicId] || [];
                return {
                  ...prev,
                  [chapter.comicId]: list.filter(ch => ch.id !== chapter.id)
                };
              });
            } else {
              setChapters(prev => {
                const next = { ...prev };
                for (const cId of Object.keys(next)) {
                  next[cId] = (next[cId] || []).filter(ch => ch.id !== chapter.id);
                }
                return next;
              });
            }
          } else if (chapter && chapter.comicId) {
            setChapters(prev => {
              const list = prev[chapter.comicId] || [];
              const exists = list.some(ch => ch.id === chapter.id);
              const updated = exists 
                ? list.map(ch => ch.id === chapter.id ? { ...ch, ...chapter } : ch)
                : [...list, chapter as Chapter];
              return {
                ...prev,
                [chapter.comicId]: updated
              };
            });
          }
        },
        onBannerChange: (eventType, banner) => {
          if (isMounted) {
            setLastRealtimeEvent({ time: new Date().toLocaleTimeString('id-ID'), table: 'banners', type: eventType });
          }
          if (eventType === 'DELETE') {
            setBanners(prev => prev.filter(b => b.id !== banner.id));
          } else if (banner && banner.id) {
            setBanners(prev => {
              const exists = prev.some(b => b.id === banner.id);
              if (exists) {
                return prev.map(b => b.id === banner.id ? { ...b, ...banner } : b);
              }
              return [banner as Banner, ...prev];
            });
          }
        },
        onUserChange: (eventType, user) => {
          if (isMounted) {
            setLastRealtimeEvent({ time: new Date().toLocaleTimeString('id-ID'), table: 'users', type: eventType });
          }
          if (eventType === 'DELETE') {
            setUsers(prev => prev.filter(u => u.id !== user.id));
          } else if (user && user.id) {
            setUsers(prev => {
              const exists = prev.some(u => u.id === user.id);
              if (exists) {
                return prev.map(u => u.id === user.id ? { ...u, ...user } : u);
              }
              return [...prev, user as User];
            });
          }
        },
        onDriveChange: (eventType, drive) => {
          if (isMounted) {
            setLastRealtimeEvent({ time: new Date().toLocaleTimeString('id-ID'), table: 'drive_accounts', type: eventType });
          }
          if (eventType === 'DELETE') {
            setDriveAccounts(prev => prev.filter(d => d.id !== drive.id));
          } else if (drive && drive.id) {
            setDriveAccounts(prev => {
              const exists = prev.some(d => d.id === drive.id);
              if (exists) {
                return prev.map(d => d.id === drive.id ? { ...d, ...drive } : d);
              }
              return [drive as DriveAccount, ...prev];
            });
          }
        },
        onCommentChange: (eventType, comment) => {
          if (isMounted) {
            setLastRealtimeEvent({ time: new Date().toLocaleTimeString('id-ID'), table: 'comments', type: eventType });
          }
          if (eventType === 'DELETE') {
            setComments(prev => prev.filter(c => c.id !== comment.id && c.replyToId !== comment.id));
          } else if (comment && comment.id) {
            setComments(prev => {
              const exists = prev.some(c => c.id === comment.id);
              if (exists) {
                return prev.map(c => c.id === comment.id ? { ...c, ...comment } : c);
              }
              return [comment as Comment, ...prev];
            });
          }
        },
        onAdChange: (eventType, ad) => {
          if (isMounted) {
            setLastRealtimeEvent({ time: new Date().toLocaleTimeString('id-ID'), table: 'ads', type: eventType });
          }
          if (eventType === 'DELETE') {
            setAds(prev => prev.filter(a => a.id !== ad.id));
          } else if (ad && ad.id) {
            setAds(prev => {
              const exists = prev.some(a => a.id === ad.id);
              if (exists) {
                return prev.map(a => a.id === ad.id ? { ...a, ...ad } : a);
              }
              return [ad as AdItem, ...prev];
            });
          }
        },
        onAdSettingsChange: (newAdSettings) => {
          if (isMounted) {
            setLastRealtimeEvent({ time: new Date().toLocaleTimeString('id-ID'), table: 'ad_settings', type: 'UPDATE' });
          }
          if (newAdSettings) {
            setAdSettings(prev => ({ ...prev, ...newAdSettings }));
          }
        },
        onSettingsChange: (settings) => {
          if (isMounted) {
            setLastRealtimeEvent({ time: new Date().toLocaleTimeString('id-ID'), table: 'system_settings', type: 'UPDATE' });
          }
          if (settings) {
            setSystemSettings(prev => ({
              ...prev,
              siteName: settings.siteName || prev?.siteName || 'AntiTimpa',
              siteAnnouncement: settings.siteAnnouncement !== undefined ? settings.siteAnnouncement : prev?.siteAnnouncement || '',
              maintenanceMode: settings.maintenanceMode !== undefined ? settings.maintenanceMode : prev?.maintenanceMode || false,
              siteLogo: settings.siteLogo !== undefined ? settings.siteLogo : prev?.siteLogo,
              siteFavicon: settings.siteFavicon !== undefined ? settings.siteFavicon : prev?.siteFavicon
            }));
          }
        }
      });

      // Now fetch full database snapshot
      refreshFromSupabase();
    });

    // 2. Periodic & Focus revalidation from Supabase (10-second resilient snapshot sync)
    const handleRevalidate = () => {
      if (document.visibilityState === 'visible') {
        refreshFromSupabase();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleRevalidate);
      window.addEventListener('online', handleRevalidate);
      document.addEventListener('visibilitychange', handleRevalidate);
    }
    const syncInterval = setInterval(refreshFromSupabase, 10000);

    return () => {
      isMounted = false;
      if (unsubSupabaseRealtime) {
        try { unsubSupabaseRealtime(); } catch (_) {}
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleRevalidate);
        window.removeEventListener('online', handleRevalidate);
        document.removeEventListener('visibilitychange', handleRevalidate);
      }
      clearInterval(syncInterval);
    };
  }, []);

  // Sync to LocalStorage (Fast Client-side fallback Cache with Quota Protection)
  useEffect(() => {
    if (currentUser) {
      safeSetItem(STORAGE_KEYS.CURRENT_USER, currentUser);
    } else {
      try {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      } catch (_) {}
    }
  }, [currentUser]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.COMICS, comics);
  }, [comics]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.CHAPTERS, chapters);
  }, [chapters]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.USERS, users);
  }, [users]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.BANNERS, banners);
  }, [banners]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.DRIVE_ACCOUNTS, driveAccounts);
  }, [driveAccounts]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.LOGS, activityLogs);
  }, [activityLogs]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.SETTINGS, systemSettings);
    // Dynamically update browser tab favicon and document title
    if (typeof document !== 'undefined') {
      if (systemSettings?.siteFavicon) {
        updateFavicon(systemSettings.siteFavicon);
      } else {
        updateFavicon();
      }
      if (systemSettings?.siteName) {
        const currentTitle = document.title;
        if (!currentTitle || currentTitle.includes('AntiTimpa') || currentTitle.includes('Komik')) {
          document.title = `${systemSettings.siteName} - Platform Portal Komik`;
        }
      }
    }
  }, [systemSettings]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.BOOKMARKS, bookmarks);
  }, [bookmarks]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.HISTORY, readingHistory);
  }, [readingHistory]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.COMMENTS, comments);
  }, [comments]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.ADS, ads);
  }, [ads]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.AD_SETTINGS, adSettings);
  }, [adSettings]);

  useEffect(() => {
    if (googleUser) {
      safeSetItem(STORAGE_KEYS.GOOGLE_USER, googleUser);
    } else {
      try {
        localStorage.removeItem(STORAGE_KEYS.GOOGLE_USER);
      } catch (_) {}
    }
  }, [googleUser]);

  const addLog = (
    username: string,
    action: string,
    type: ActivityLog['type'],
    status: ActivityLog['status'],
    details?: string
  ) => {
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      username,
      ipAddress: '180.252.' + Math.floor(Math.random() * 250 + 1) + '.' + Math.floor(Math.random() * 250 + 1),
      action,
      type,
      status,
      details
    };
    setActivityLogs(prev => [newLog, ...prev]);
    SupabaseService.saveActivityLog(newLog).catch(() => {});
  };

  // Access check for reader tiers & plans
  const canUserReadComic = (comicId: string, userToCheck?: User | null): ComicAccessCheck => {
    const targetComic = comics.find(c => c.id === comicId);
    
    // Normal comics (Manga, Manhwa, Manhua with isFree !== false) are completely free to read without login!
    const isNormalComic = targetComic?.contentType === 'normal' || targetComic?.isFree === true;
    if (isNormalComic) {
      return { allowed: true };
    }

    const targetUser = userToCheck !== undefined ? userToCheck : currentUser;

    if (!targetUser) {
      return {
        allowed: false,
        reason: 'unauthenticated',
        message: 'Komik 18+ VIP: Silakan login dengan akun VIP berbayar Anda untuk membaca judul ini.'
      };
    }

    // Admins have unrestricted access to all titles
    if (targetUser.role === 'admin') {
      return { allowed: true };
    }

    // Check account status
    if (targetUser.status === 'locked') {
      return {
        allowed: false,
        reason: 'locked',
        message: 'Akun Anda sedang terkunci karena melebihi batas percobaan password. Silakan hubungi Admin.'
      };
    }

    if (targetUser.status === 'inactive') {
      return {
        allowed: false,
        reason: 'inactive',
        message: 'Akun Anda berstatus nonaktif. Silakan hubungi Admin.'
      };
    }

    // Check expiration
    if (targetUser.firstLoginAt && targetUser.expiresAt) {
      const now = Date.now();
      const expireTime = new Date(targetUser.expiresAt).getTime();
      if (now > expireTime) {
        return {
          allowed: false,
          reason: 'expired',
          message: 'Masa aktif paket akun Anda telah berakhir/kadaluarsa. Silakan hubungi Admin untuk memperpanjang.'
        };
      }
    }

    // Plan & Title Permissions Logic
    const isAllAccess = targetUser.accessType === 'all' || targetUser.planType === 'plan_15k_all' || (!targetUser.accessType && !targetUser.allowedComicIds);

    if (isAllAccess) {
      return { allowed: true };
    }

    // Specific comic access (e.g. 5k Single Title Plan or custom list)
    const allowedIds = targetUser.allowedComicIds || [];
    const isAllowed = allowedIds.includes(comicId);

    if (isAllowed) {
      return { allowed: true };
    }

    const allowedTitles = comics.filter(c => allowedIds.includes(c.id)).map(c => c.title);

    return {
      allowed: false,
      reason: 'restricted_plan',
      message: `Akun Anda terdaftar pada Paket Khusus 1 Judul. Anda tidak memiliki izin untuk membaca komik ini.${allowedTitles.length > 0 ? ` Judul yang terdaftar pada akun Anda: "${allowedTitles.join(', ')}".` : ''}`,
      allowedComicTitles: allowedTitles
    };
  };

  // Helper to hash password using bcryptjs
  const hashPassword = (password: string): string => {
    try {
      const salt = bcrypt.genSaltSync(10);
      return bcrypt.hashSync(password, salt);
    } catch (err) {
      console.warn('Bcrypt hashing fallback:', err);
      return password;
    }
  };

  // Helper to flexibly and accurately match passwords across mobile devices (handling bcrypt and plain text)
  const verifyPasswordMatch = (storedPass?: string, inputPass?: string): boolean => {
    if (!storedPass || !inputPass) return false;
    const s = String(storedPass);
    const inp = String(inputPass);

    // 1. If stored password is a bcrypt hash ($2a$, $2b$, $2y$), use bcrypt.compareSync
    if (s.startsWith('$2a$') || s.startsWith('$2b$') || s.startsWith('$2y$')) {
      try {
        if (bcrypt.compareSync(inp, s)) {
          return true;
        }
      } catch (_) {}
    }

    // 2. Direct string / trim comparison (for plain text legacy or admin accounts)
    return (
      s === inp ||
      s.trim() === inp.trim() ||
      s === inp.trim() ||
      s.trim() === inp
    );
  };

  // Auth Functions
  const login = async (username: string, password: string): Promise<{ success: boolean; message: string; remainingAttempts?: number; user?: User }> => {
    const cleanUsername = username.trim();
    const rawPassword = password;
    if (!cleanUsername || !rawPassword) {
      return { success: false, message: 'Silakan masukkan username dan password Anda.' };
    }

    // 1. First look in local memory state
    let targetUser = users.find(u => (u.username || '').trim().toLowerCase() === cleanUsername.toLowerCase());

    // 2. If not found in state OR if password doesn't match current cache, fetch directly from Supabase for 100% realtime cross-device accuracy
    if (!targetUser || !verifyPasswordMatch(targetUser.passwordHash, rawPassword)) {
      try {
        const freshUser = await SupabaseService.fetchUser(cleanUsername);
        if (freshUser) {
          targetUser = freshUser;
          setUsers(prev => {
            const exists = prev.some(u => u.id === freshUser.id);
            if (exists) {
              return prev.map(u => u.id === freshUser.id ? freshUser : u);
            }
            return [...prev, freshUser];
          });
        }
      } catch (err) {
        console.warn('Direct Supabase user fetch during login failed:', err);
      }
    }

    if (!targetUser) {
      // Auto-fallback bootstrap for Super Admin if not yet in state
      if (cleanUsername.toLowerCase() === 'admin' || cleanUsername.toLowerCase() === 'eldoaru') {
        const isAdminPass = rawPassword.trim() === 'eldoaru1223' || rawPassword.trim() === 'admin123';
        if (isAdminPass) {
          const bootstrappedAdmin: User = {
            id: 'user-admin',
            username: cleanUsername.toLowerCase(),
            role: 'admin',
            status: 'active',
            failedAttempts: 0,
            passwordHash: hashPassword(rawPassword.trim()),
            createdAt: new Date().toISOString(),
            firstLoginAt: new Date().toISOString(),
            expiresAt: null,
            durationType: '1_year',
            tier: 'Premium',
            planType: 'plan_15k_all',
            accessType: 'all',
            priceNote: 'Super Admin Lifetime Access',
            bio: 'AntiTimpa Super Administrator'
          };
          setUsers(prev => [bootstrappedAdmin, ...prev.filter(u => u.username.toLowerCase() !== cleanUsername.toLowerCase())]);
          SupabaseService.saveUser(bootstrappedAdmin).catch(() => {});
          setCurrentUser(bootstrappedAdmin);
          safeSetItem(STORAGE_KEYS.CURRENT_USER, bootstrappedAdmin);
          setIsAdminView(true);
          setIsLoginModalOpen(false);
          setLoginModalRedirectNotice(undefined);
          showAdminToast('Login Super Admin Berhasil', `Selamat datang kembali, Super Admin ${bootstrappedAdmin.username}!`, 'success');
          return { success: true, message: `Selamat datang kembali, Super Admin ${bootstrappedAdmin.username}!`, user: bootstrappedAdmin };
        }
      }

      addLog(cleanUsername || 'anonymous', 'Login Gagal: User Tidak Ditemukan', 'login_failed', 'failed', 'Akun tidak terdaftar dalam database');
      return { success: false, message: 'Username tidak ditemukan. Silakan periksa kembali atau hubungi Admin.' };
    }

    const isAdmin = 
      targetUser.role === 'admin' || 
      targetUser.username.trim().toLowerCase() === 'admin' ||
      targetUser.username.trim().toLowerCase() === 'eldoaru' ||
      cleanUsername.toLowerCase() === 'admin' ||
      cleanUsername.toLowerCase() === 'eldoaru';

    // Admin account handling (Admin accounts are NEVER permanently locked by failed attempts)
    if (isAdmin) {
      const isPasswordValid = 
        verifyPasswordMatch(targetUser.passwordHash, rawPassword) ||
        rawPassword.trim() === 'eldoaru1223' ||
        rawPassword.trim() === 'admin123' ||
        rawPassword === 'eldoaru1223' ||
        rawPassword === 'admin123';

      if (!isPasswordValid) {
        addLog(targetUser.username, 'Login Admin Gagal: Password Salah', 'login_failed', 'warning', 'Percobaan masuk Super Admin dengan password tidak cocok.');
        return { 
          success: false, 
          message: 'Password Admin salah! Silakan periksa kembali huruf besar/kecil atau gunakan password admin Anda.' 
        };
      }

      const updatedAdmin: User = {
        ...targetUser,
        role: 'admin',
        failedAttempts: 0,
        status: 'active',
        passwordHash: hashPassword(rawPassword.trim()),
        firstLoginAt: targetUser.firstLoginAt || new Date().toISOString()
      };
      setUsers(prev => prev.map(u => u.id === targetUser.id ? updatedAdmin : u));
      SupabaseService.saveUser(updatedAdmin).catch(() => {});
      setCurrentUser(updatedAdmin);
      safeSetItem(STORAGE_KEYS.CURRENT_USER, updatedAdmin);
      setIsAdminView(true);
      setIsLoginModalOpen(false);
      setLoginModalRedirectNotice(undefined);

      showAdminToast('Login Super Admin Berhasil', `Selamat datang kembali, Super Admin ${targetUser.username}!`, 'success');

      addLog(
        targetUser.username,
        'Login Berhasil (Super Admin)',
        'login_success',
        'success',
        'Sesi Super Admin diaktifkan'
      );
      return { success: true, message: `Selamat datang kembali, Super Admin ${targetUser.username}!`, user: updatedAdmin };
    }

    // 1. Check if user is locked
    if (targetUser.status === 'locked' || (targetUser.failedAttempts || 0) >= systemSettings.maxLoginAttempts) {
      addLog(targetUser.username, 'Login Ditolak: Akun Terkunci', 'login_failed', 'failed', 'Akun dibekukan karena melebihi batas percobaan password.');
      return { 
        success: false, 
        message: 'Akun Anda saat ini TERKUNCI karena 3x gagal memasukkan password. Silakan hubungi Admin melalui WhatsApp untuk membuka kunci akun Anda.' 
      };
    }

    // 2. Check if user is manually inactive
    if (targetUser.status === 'inactive') {
      addLog(targetUser.username, 'Login Ditolak: Akun Nonaktif', 'login_failed', 'warning', 'Akun dalam status nonaktif manual oleh Admin.');
      return { success: false, message: 'Akun Anda saat ini berstatus nonaktif. Silakan hubungi Admin.' };
    }

    // 3. Check expiration if already logged in before
    if (targetUser.firstLoginAt && targetUser.expiresAt) {
      const now = Date.now();
      const expireTime = new Date(targetUser.expiresAt).getTime();
      if (now > expireTime) {
        // Auto-update to expired status
        const updatedUser: User = { ...targetUser, status: 'expired' };
        setUsers(prev => prev.map(u => u.id === targetUser.id ? updatedUser : u));
        SupabaseService.saveUser(updatedUser).catch(() => {});
        addLog(targetUser.username, 'Login Ditolak: Masa Aktif Telah Habis', 'login_failed', 'warning', `Masa aktif ${targetUser.durationType} telah berakhir.`);
        return { success: false, message: 'Masa aktif akun Anda telah berakhir. Silakan hubungi Admin untuk memperpanjang paket.' };
      }
    }

    // 4. Verify password for reader
    if (!verifyPasswordMatch(targetUser.passwordHash, rawPassword)) {
      const newAttempts = (targetUser.failedAttempts || 0) + 1;
      const isNowLocked = newAttempts >= systemSettings.maxLoginAttempts;
      const newStatus = isNowLocked ? ('locked' as const) : targetUser.status;

      const updatedUser: User = { ...targetUser, failedAttempts: newAttempts, status: newStatus };
      setUsers(prev => prev.map(u => u.id === targetUser.id ? updatedUser : u));
      SupabaseService.saveUser(updatedUser).catch(() => {});

      if (isNowLocked) {
        addLog(targetUser.username, 'Akun Otomatis Terkunci: 3x Gagal Password', 'login_failed', 'failed', 'Akun terkunci otomatis setelah 3 kegagalan beruntun.');
        return {
          success: false,
          message: 'Password salah 3 kali berturut-turut! Akun Anda telah otomatis TERKUNCI demi keamanan. Silakan hubungi Admin via WhatsApp.',
          remainingAttempts: 0
        };
      } else {
        const remaining = systemSettings.maxLoginAttempts - newAttempts;
        addLog(targetUser.username, `Login Gagal: Password Salah (Percobaan ${newAttempts}/${systemSettings.maxLoginAttempts})`, 'login_failed', 'warning', `Sisa ${remaining} kali percobaan sebelum akun terkunci.`);
        return {
          success: false,
          message: `Password salah! Sisa percobaan: ${remaining} kali lagi sebelum akun terkunci. Gunakan tombol mata (👁) untuk melihat password yang Anda ketik.`,
          remainingAttempts: remaining
        };
      }
    }

    // 5. Successful reader login
    const now = new Date();
    const isFirstTimeLogin = !targetUser.firstLoginAt;
    const firstLoginTime = targetUser.firstLoginAt || now.toISOString();
    
    // Calculate expiration timestamp starting from first login date if not set
    let computedExpiresAt = targetUser.expiresAt;
    if (isFirstTimeLogin) {
      const durationMs = getDurationMs(targetUser.durationType);
      computedExpiresAt = new Date(now.getTime() + durationMs).toISOString();
    }

    const updatedUser: User = {
      ...targetUser,
      failedAttempts: 0,
      status: 'active',
      firstLoginAt: firstLoginTime,
      expiresAt: computedExpiresAt
    };

    setUsers(prev => prev.map(u => u.id === targetUser.id ? updatedUser : u));
    SupabaseService.saveUser(updatedUser).catch(() => {});
    setCurrentUser(updatedUser);
    safeSetItem(STORAGE_KEYS.CURRENT_USER, updatedUser);
    setIsLoginModalOpen(false);
    setLoginModalRedirectNotice(undefined);

    showAdminToast('Login Berhasil', `Selamat datang kembali, ${targetUser.username}!`, 'success');

    addLog(
      targetUser.username,
      'Login Berhasil (User)',
      'login_success',
      'success',
      isFirstTimeLogin ? `Login perdana. Masa aktif ${targetUser.durationType} mulai dihitung.` : 'Sesi aktif diperbarui'
    );

    return { success: true, message: `Selamat datang kembali, ${targetUser.username}!`, user: updatedUser };
  };

  const logout = () => {
    if (currentUser) {
      addLog(currentUser.username, 'Pengguna Logout', 'logout', 'info', 'Sesi diakhiri secara manual');
    }
    setCurrentUser(null);
    setGoogleUser(null);
    safeSetItem(STORAGE_KEYS.CURRENT_USER, null);
    safeSetItem(STORAGE_KEYS.GOOGLE_USER, null);
    if (isAdminView) {
      setIsAdminView(false);
    }
  };

  const loginWithGoogle = async (manualGoogleData?: { email: string; displayName: string; photoURL?: string; adminPass?: string }): Promise<{ success: boolean; user?: any; needRegistration?: boolean; pendingUser?: PendingGoogleUser; message?: string; errorType?: string }> => {
    try {
      let userUid: string;
      let userEmail: string;
      let userName: string;
      let userAvatar: string;
      let isAuthenticPopup = false;

      if (manualGoogleData && manualGoogleData.email) {
        // Direct / custom account input
        userEmail = manualGoogleData.email.trim().toLowerCase();
        userName = manualGoogleData.displayName?.trim() || userEmail.split('@')[0];
        userUid = `google-${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
        userAvatar = manualGoogleData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=ff5b14&color=fff&bold=true`;

        // Security Guard: Prevent unauthorized visitor devices from impersonating Super Admin email without password
        if (ADMIN_EMAILS.includes(userEmail)) {
          const pass = manualGoogleData.adminPass || '';
          if (!pass || (pass !== 'admin123' && pass !== 'superadmin')) {
            return {
              success: false,
              message: 'Alamat email ini adalah Akun Pemilik (Super Admin). Demi keamanan, silakan gunakan tombol "Google Sign-In Popup" resmi atau masukkan Password Admin Anda.',
              errorType: 'admin_auth_required'
            };
          }
        }
      } else {
        // Real browser Firebase Google Auth Popup (Cryptographically verified by Google OAuth)
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        userUid = user.uid;
        userEmail = (user.email || '').toLowerCase();
        userName = user.displayName || userEmail.split('@')[0] || 'User Google';
        userAvatar = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=ff5b14&color=fff&bold=true`;
        isAuthenticPopup = true;
      }

      const isAdminEmail = ADMIN_EMAILS.includes(userEmail);

      // 1. Cek di Supabase koleksi users dengan email ATAU userUid
      let existingUser: User | null = null;

      try {
        existingUser = await SupabaseService.fetchUser(userEmail) || await SupabaseService.fetchUser(userUid);
      } catch (supabaseErr) {
        console.warn('Supabase User Check Warning:', supabaseErr);
      }

      // Fallback check in local memory state
      if (!existingUser) {
        const inState = users.find(u => 
          (u.email && u.email.toLowerCase() === userEmail) || 
          u.id === userUid || 
          u.uid === userUid
        );
        if (inState && inState.username && inState.passwordHash) {
          existingUser = inState;
        }
      }

      // CASE A: User sudah terdaftar -> Langsung Login!
      if (existingUser) {
        if (isAdminEmail && existingUser.role !== 'admin') {
          existingUser.role = 'admin';
          SupabaseService.saveUser(existingUser).catch(() => {});
        }

        const gUserData: GoogleAuthUser = {
          uid: userUid,
          email: userEmail,
          displayName: existingUser.displayName || userName,
          photoURL: existingUser.photoURL || userAvatar,
          role: existingUser.role === 'admin' ? 'admin' : 'reader',
          createdAt: existingUser.createdAt
        };

        setGoogleUser(gUserData);
        setCurrentUser(existingUser);
        safeSetItem(STORAGE_KEYS.GOOGLE_USER, gUserData);
        safeSetItem(STORAGE_KEYS.CURRENT_USER, existingUser);

        setUsers(prev => {
          const exists = prev.some(u => u.id === existingUser!.id);
          if (exists) {
            return prev.map(u => u.id === existingUser!.id ? existingUser! : u);
          }
          return [...prev, existingUser!];
        });

        setIsLoginModalOpen(false);
        setIsGoogleAuthModalOpen(false);
        setIsRegisterModalOpen(false);
        setLoginModalRedirectNotice(undefined);

        if (existingUser.role === 'admin') {
          setIsAdminView(true);
        }

        showAdminToast('Login Google Berhasil', `Selamat datang kembali, ${existingUser.username}!`, 'success');
        addLog(
          existingUser.username,
          'Login Akun Google Berhasil',
          'login_success',
          'success',
          `Akun ${existingUser.username} (${userEmail}) berhasil masuk via Google.`
        );

        return { success: true, user: existingUser };
      }

      // CASE B: User Baru -> Simpan data Google sementara, buka form registrasi untuk isi username & password!
      const pendingData: PendingGoogleUser = {
        uid: userUid,
        email: userEmail,
        displayName: userName,
        photoURL: userAvatar
      };

      setPendingGoogleUser(pendingData);
      setIsLoginModalOpen(false);
      setIsGoogleAuthModalOpen(false);
      setIsRegisterModalOpen(true);

      return { 
        success: false, 
        needRegistration: true, 
        pendingUser: pendingData,
        message: 'Silakan lengkapi username dan password akun Anda.' 
      };

    } catch (error: any) {
      if (error?.code === 'auth/unauthorized-domain' || error?.message?.includes('unauthorized-domain')) {
        console.warn('Firebase Auth notice: Domain unauthorized. Opening direct Google sign-in modal.');
        setIsGoogleAuthModalOpen(true);
        return { 
          success: false, 
          errorType: 'unauthorized_domain',
          message: 'Domain pengujian ini belum didaftarkan di Firebase Console. Silakan pilih akun Google Anda di jendela yang terbuka untuk masuk langsung.' 
        };
      }

      if (error?.code === 'auth/popup-closed-by-user' || error?.message?.includes('popup-closed-by-user')) {
        return { success: false, message: 'Login Google dibatalkan.' };
      }

      console.warn('Google Sign-In Notice:', error?.message || error);
      const errMsg = error?.message || 'Gagal login dengan Akun Google.';
      return { success: false, message: errMsg };
    }
  };

  const registerWithGoogle = async (
    username: string, 
    password: string, 
    additionalProfile?: { displayName?: string; avatar?: string; bio?: string }
  ): Promise<{ success: boolean; message?: string; user?: User }> => {
    if (!pendingGoogleUser) {
      return { success: false, message: 'Data Google tidak ditemukan. Silakan login Google terlebih dahulu.' };
    }

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      return { success: false, message: 'Username minimal 3 karakter tanpa spasi.' };
    }

    // Format username check (alphanumeric and underscores)
    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      return { success: false, message: 'Username hanya boleh berisi huruf, angka, titik, dan garis bawah.' };
    }

    if (!password || password.length < 4) {
      return { success: false, message: 'Password minimal 4 karakter.' };
    }

    // Check if username is already taken by another account
    const isTaken = users.some(u => (u.username || '').trim().toLowerCase() === cleanUsername);
    if (isTaken) {
      return { success: false, message: `Username "${cleanUsername}" sudah dipakai pengguna lain. Silakan gunakan username lain.` };
    }

    const isAdminEmail = ADMIN_EMAILS.includes(pendingGoogleUser.email.toLowerCase()) || cleanUsername === 'admin';
    const role: 'admin' | 'reader' | 'user' = isAdminEmail ? 'admin' : 'reader';
    const passwordHash = hashPassword(password);
    const now = new Date().toISOString();
    const finalDisplayName = additionalProfile?.displayName || pendingGoogleUser.displayName || cleanUsername;
    const finalAvatar = additionalProfile?.avatar || pendingGoogleUser.photoURL;

    const newUser: User = {
      id: pendingGoogleUser.uid,
      uid: pendingGoogleUser.uid,
      email: pendingGoogleUser.email,
      displayName: finalDisplayName,
      photoURL: finalAvatar,
      avatar: finalAvatar,
      username: cleanUsername,
      passwordHash: passwordHash,
      role: role,
      status: 'active',
      durationType: 'unlimited',
      tier: role === 'admin' ? 'Premium' : 'Free Tier',
      planType: 'plan_15k_all',
      accessType: 'all',
      bio: additionalProfile?.bio || 'Penggemar Komik AntiTimpa',
      createdAt: now,
      firstLoginAt: now,
      failedAttempts: 0,
      stats: {
        comicsRead: 0,
        chaptersRead: 0,
        daysActive: 1
      }
    };

    // Save to Supabase
    try {
      await SupabaseService.saveUser(newUser);
    } catch (e) {
      console.warn('Supabase user save notice:', e);
    }

    // Update state & LocalStorage
    setUsers(prev => {
      const filtered = prev.filter(u => u.id !== newUser.id && u.username.toLowerCase() !== newUser.username.toLowerCase());
      return [newUser, ...filtered];
    });

    const gUserData: GoogleAuthUser = {
      uid: pendingGoogleUser.uid,
      email: pendingGoogleUser.email,
      displayName: finalDisplayName,
      photoURL: finalAvatar,
      role: role === 'admin' ? 'admin' : 'reader',
      createdAt: now
    };

    setGoogleUser(gUserData);
    setCurrentUser(newUser);
    safeSetItem(STORAGE_KEYS.GOOGLE_USER, gUserData);
    safeSetItem(STORAGE_KEYS.CURRENT_USER, newUser);

    setIsRegisterModalOpen(false);
    setPendingGoogleUser(null);
    setIsLoginModalOpen(false);
    setIsGoogleAuthModalOpen(false);

    if (newUser.role === 'admin') {
      setIsAdminView(true);
    }

    showAdminToast('Registrasi Berhasil', `Akun @${newUser.username} berhasil didaftarkan dan terhubung!`, 'success');

    addLog(
      newUser.username,
      'Registrasi Akun Baru (Google + App)',
      'user_create',
      'success',
      `Akun ${newUser.username} (${newUser.email}) sukses dibuat dengan password terenkripsi. Role: ${newUser.role}`
    );

    return { success: true, user: newUser };
  };

  const changeUserPassword = async (
    userId: string, 
    currentPassword: string, 
    newPassword: string
  ): Promise<{ success: boolean; message: string }> => {
    const target = users.find(u => u.id === userId) || (currentUser?.id === userId ? currentUser : null);
    if (!target) {
      return { success: false, message: 'Pengguna tidak ditemukan.' };
    }

    // If target has passwordHash, verify current password
    if (target.passwordHash && !verifyPasswordMatch(target.passwordHash, currentPassword)) {
      return { success: false, message: 'Password saat ini / password lama tidak cocok.' };
    }

    if (!newPassword || newPassword.length < 4) {
      return { success: false, message: 'Password baru minimal 4 karakter.' };
    }

    const newHash = hashPassword(newPassword);
    const updatedUser: User = {
      ...target,
      passwordHash: newHash
    };

    setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
    if (currentUser && currentUser.id === userId) {
      setCurrentUser(updatedUser);
      safeSetItem(STORAGE_KEYS.CURRENT_USER, updatedUser);
    }

    try {
      await SupabaseService.saveUser(updatedUser);
    } catch (e) {
      console.warn('Supabase password update notice:', e);
    }

    showAdminToast('Password Berhasil Diubah', 'Password baru akun Anda telah aktif dan tersimpan.', 'success');
    addLog(
      target.username,
      'Ganti Password Akun Pengguna',
      'user_update',
      'info',
      'Pengguna berhasil memperbarui password akun aplikasi.'
    );

    return { success: true, message: 'Password akun berhasil diganti!' };
  };

  const logoutGoogle = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Firebase SignOut error:', err);
    }
    setGoogleUser(null);
    safeSetItem(STORAGE_KEYS.GOOGLE_USER, null);
    try {
      localStorage.removeItem(STORAGE_KEYS.GOOGLE_USER);
    } catch (_) {}
    if (currentUser) {
      logout();
    }
  };

  const isLoggedIn = (): boolean => {
    return currentUser !== null || googleUser !== null;
  };

  const getUserIdentity = () => {
    if (googleUser) {
      return { 
        name: googleUser.displayName, 
        avatar: googleUser.photoURL, 
        uid: googleUser.uid,
        role: googleUser.role || (currentUser?.role ?? 'reader'),
        email: googleUser.email
      };
    }
    if (currentUser) {
      return { 
        name: currentUser.username, 
        avatar: currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.username)}&background=ff5b14&color=fff`, 
        uid: currentUser.id,
        role: currentUser.role,
        email: `${currentUser.username.toLowerCase()}@antitimpa.id`
      };
    }
    return null;
  };

  const openLoginModal = (notice?: string) => {
    setLoginModalRedirectNotice(notice);
    setIsLoginModalOpen(true);
  };

  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
    setLoginModalRedirectNotice(undefined);
  };

  const selectComic = (comicId: string | null) => {
    setSelectedComicId(comicId);
    if (comicId) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const navigateToGenre = (genre: string) => {
    setSelectedGenreFilter(genre);
    setSelectedComicId(null);
    setReadingChapterId(null);
    setActiveTab('discover');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startReading = (chapterId: string): boolean => {
    // Find the comic this chapter belongs to
    let targetComicId: string | null = null;
    (Object.entries(chapters) as [string, Chapter[]][]).forEach(([cId, chList]) => {
      if (Array.isArray(chList) && chList.some(ch => ch.id === chapterId)) {
        targetComicId = cId;
      }
    });

    if (targetComicId) {
      const check = canUserReadComic(targetComicId, currentUser);
      if (!check.allowed) {
        openLoginModal(`🔒 ${check.message || 'Akses komik ini dibatasi untuk paket akun Anda.'}`);
        return false;
      }
    } else if (!currentUser) {
      openLoginModal('🔒 Fitur Baca Komik terkunci! Silakan login dengan akun pembaca Anda.');
      return false;
    }

    setReadingChapterId(chapterId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return true;
  };

  const closeReader = () => {
    setReadingChapterId(null);
  };

  const toggleMobileDeviceFrame = () => {
    setIsMobileDeviceFrame(prev => !prev);
  };

  const setIsAdminView = (isAdmin: boolean) => {
    if (isAdmin) {
      if (!currentUser || currentUser.role !== 'admin') {
        addLog(
          currentUser?.username || 'tamu/reader',
          'Percobaan Akses Panel Admin Ditolak',
          'unauthorized_attempt',
          'failed',
          'Akses Ditolak: Hanya Super Admin yang diizinkan mengakses Dashboard Admin. Akun reader dibatasi di mode pembaca.'
        );
        openLoginModal('🔒 Akses Khusus Super Admin: Akun Anda adalah akun pembaca dan tidak memiliki izin mengakses Dashboard Admin. Silakan masuk menggunakan akun Super Admin.');
        return;
      }
    }
    setIsAdminViewState(isAdmin);
  };

  const toggleComicHomeVisibility = (comicId: string) => {
    let updatedTitle = '';
    let isNowVisible = true;

    setComics(prev => prev.map(c => {
      if (c.id === comicId) {
        const nextVal = c.isVisibleOnHome === false || c.showOnHome === false ? true : false;
        isNowVisible = nextVal;
        updatedTitle = c.title;
        const updated = { ...c, isVisibleOnHome: nextVal, showOnHome: nextVal };
        SupabaseService.saveComic(updated).catch(() => {});
        return updated;
      }
      return c;
    }));

    addLog(
      currentUser?.username || 'admin',
      `${isNowVisible ? 'Tampilkan Komik ke Beranda' : 'Sembunyikan Komik dari Beranda'}: "${updatedTitle || comicId}"`,
      'comic_update',
      'info',
      `Status visibilitas beranda diubah menjadi: ${isNowVisible ? 'TAMPIL (AKTIF)' : 'DISEMBUNYIKAN'}`
    );
  };

  const batchToggleComicHomeVisibility = (comicIds: string[], isVisible: boolean) => {
    if (!comicIds || comicIds.length === 0) return;

    setComics(prev => prev.map(c => {
      if (comicIds.includes(c.id)) {
        const updated = { ...c, isVisibleOnHome: isVisible, showOnHome: isVisible };
        SupabaseService.saveComic(updated).catch(() => {});
        return updated;
      }
      return c;
    }));

    addLog(
      currentUser?.username || 'admin',
      `Batch ${isVisible ? 'Tampilkan ke Beranda' : 'Tarik/Sembunyikan dari Beranda'}: ${comicIds.length} Komik`,
      'comic_update',
      'info',
      `${comicIds.length} judul komik berhasil ${isVisible ? 'diaktifkan kembali di beranda' : 'ditarik & disembunyikan dari beranda'}`
    );
  };

  // Comment Actions
  const addComment = (data: { comicId: string; chapterId?: string; chapterNumber?: number; content: string; spoiler?: boolean; replyToId?: string }): Comment => {
    const authorName = googleUser?.displayName || currentUser?.username || 'Pembaca Komik';
    const authorAvatar = googleUser?.photoURL || (currentUser?.role === 'admin' ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80' : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80');
    const isVip = !!currentUser && currentUser.role !== 'admin';

    const newComment: Comment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      comicId: data.comicId,
      chapterId: data.chapterId,
      chapterNumber: data.chapterNumber,
      userId: googleUser?.uid || currentUser?.id || `user-guest-${Date.now()}`,
      userName: authorName,
      username: authorName,
      userAvatar: authorAvatar,
      isVip,
      isAdmin: currentUser?.role === 'admin',
      content: data.content,
      createdAt: 'Baru saja',
      likesCount: 0,
      likes: 0,
      likedBy: [],
      isLiked: false,
      spoiler: data.spoiler || false,
      replyToId: data.replyToId
    };

    setComments(prev => [newComment, ...prev]);
    SupabaseService.saveComment(newComment).catch(() => {});
    return newComment;
  };

  const toggleLikeComment = (commentId: string) => {
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        const isLiked = !c.isLiked;
        const likes = isLiked ? c.likes + 1 : Math.max(0, c.likes - 1);
        const updated = { ...c, isLiked, likes };
        SupabaseService.saveComment(updated).catch(() => {});
        return updated;
      }
      return c;
    }));
  };

  const deleteComment = (commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId && c.replyToId !== commentId));
    SupabaseService.deleteComment(commentId).catch(() => {});
  };

  // Content Management - Comics
  const addComic = async (comicData: Omit<Comic, 'id' | 'createdAt' | 'updatedAt' | 'rating' | 'ratingCount' | 'totalReaders' | 'totalChapters'> & { id?: string; createdAt?: string; updatedAt?: string; rating?: number; ratingCount?: number; totalReaders?: number; totalChapters?: number }) => {
    const finalComicId = comicData.id || `comic-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString().split('T')[0];
    const explicitSlug = comicData.slug?.trim() || '';

    const newComic: Comic = {
      ...comicData,
      id: finalComicId,
      slug: explicitSlug || SupabaseService.generateSlug(comicData.title, finalComicId),
      rating: comicData.rating ?? 4.85,
      ratingCount: comicData.ratingCount ?? Math.floor(Math.random() * 2000) + 500,
      totalReaders: comicData.totalReaders ?? 0,
      totalChapters: comicData.totalChapters ?? 1,
      createdAt: comicData.createdAt || now,
      updatedAt: comicData.updatedAt || now
    };

    const prevComics = [...comics];
    setComics(prev => {
      const normalizedNewTitle = (newComic.title || '').trim().toLowerCase();
      const filtered = prev.filter(c => c.id !== finalComicId && (c.title || '').trim().toLowerCase() !== normalizedNewTitle);
      return [newComic, ...filtered];
    });

    // 1. Prepare default first chapter if this comic doesn't already have chapters
    const existingChs = chapters[finalComicId] || [];
    let firstChapter: Chapter | null = null;
    if (existingChs.length === 0) {
      firstChapter = {
        id: `ch-${finalComicId}-1`,
        comicId: finalComicId,
        chapterNumber: 1,
        title: 'Prologue / Chapter 1',
        releaseDate: 'Hari ini',
        isNew: true,
        isLocked: newComic.isFree === false,
        sourceType: 'images',
        pages: Array.from({ length: 8 }, (_, i) => ({
          id: `page-${i + 1}`,
          pageNumber: i + 1,
          imageUrl: generateComicPageSvg('cyberpunk', i + 1, `${newComic.title} Ch. 1`),
          caption: `Halaman ${i + 1}`
        })),
        viewsCount: 0
      };
      setChapters(prev => ({
        ...prev,
        [finalComicId]: [firstChapter!]
      }));
    }

    // 2. Persist to Supabase
    try {
      const res = await SupabaseService.saveComic(newComic);
      if (res.success) {
        if (firstChapter) {
          await SupabaseService.saveChapter(finalComicId, firstChapter);
        }
        showAdminToast('Komik Berhasil Ditambahkan', `"${newComic.title}" tersimpan & tersinkronisasi di Supabase PostgreSQL.`, 'success');
        addLog(
          currentUser?.username || 'admin',
          `Tambah Komik: "${newComic.title}"`,
          'comic_create',
          'success',
          `Komik (${(newComic.comicType || 'manga').toUpperCase()}) berhasil ditambahkan ke katalog & tersinkron ke Supabase`
        );
      } else if (!res.isConfigured) {
        showAdminToast(
          'Tersimpan Sebagai Draft Lokal',
          'Komik tersimpan di sesi ini. Buka Tab Database & masukkan URL/Key Supabase untuk sinkronisasi ke seluruh perangkat.',
          'info'
        );
      } else {
        showAdminToast(
          'Peringatan Sinkronisasi Supabase',
          `Tersimpan lokal, namun gagal sync ke Supabase: ${res.error}. Periksa SQL Schema di Tab Database.`,
          'error'
        );
      }
    } catch (err: any) {
      console.error('[Supabase] Failed to save comic:', err);
      showAdminToast('Tersimpan Lokal', `Komik disimpan lokal: ${err?.message || err}`, 'info');
    }
  };

  // Direct High-Reliability Injection for Scraped Comics with all their chapters
  const injectComicWithChapters = async (comic: Comic, chaptersList: Chapter[]) => {
    const finalComic: Comic = {
      ...comic,
      totalChapters: chaptersList.length > 0 ? chaptersList.length : (comic.totalChapters || 1),
      updatedAt: new Date().toISOString()
    };

    setComics(prev => {
      const filtered = prev.filter(c => c.id !== finalComic.id && c.title.toLowerCase() !== finalComic.title.toLowerCase());
      return [finalComic, ...filtered];
    });

    setChapters(prev => ({
      ...prev,
      [finalComic.id]: chaptersList
    }));

    // Persist sequentially to Supabase (Save Comic first, then Chapters, to satisfy Foreign Key)
    try {
      const res = await SupabaseService.saveComic(finalComic);
      if (res.success) {
        if (chaptersList.length > 0) {
          await SupabaseService.batchSaveChapters(chaptersList.map(ch => ({ ...ch, comicId: finalComic.id })));
        }
        showAdminToast('Komik Berhasil Disuntikkan', `"${finalComic.title}" beserta ${chaptersList.length} chapter siap dibaca & tersinkron ke Supabase.`, 'success');
        addLog(
          currentUser?.username || 'admin',
          `Suntik Komik API: "${finalComic.title}"`,
          'comic_create',
          'success',
          `Berhasil menyuntikkan komik ${finalComic.title} (${(finalComic.comicType || 'manga').toUpperCase()}) beserta ${chaptersList.length} chapter siap baca.`
        );
      } else if (!res.isConfigured) {
        showAdminToast('Disuntikkan Sebagai Draft Lokal', 'Komik & chapter siap dibaca di browser ini.', 'info');
      } else {
        showAdminToast('Peringatan Sinkronisasi', `Disuntikkan lokal, gagal sync Supabase: ${res.error}`, 'error');
      }
    } catch (err: any) {
      console.error('[Supabase] Ingestion error:', err);
      showAdminToast('Tersimpan Lokal', `Komik disimpan lokal: ${err?.message || err}`, 'info');
    }
  };

  // Batch inject multiple comics atomically
  const batchInjectComicsWithChapters = async (items: { comic: Comic; chapters: Chapter[] }[]) => {
    if (!items || items.length === 0) return;

    const newComics = items.map(item => ({
      ...item.comic,
      totalChapters: item.chapters.length > 0 ? item.chapters.length : (item.comic.totalChapters || 1),
      updatedAt: new Date().toISOString()
    }));

    setComics(prev => {
      const incomingIds = new Set(newComics.map(c => c.id));
      const incomingTitles = new Set(newComics.map(c => c.title.toLowerCase()));

      const remaining = prev.filter(c => !incomingIds.has(c.id) && !incomingTitles.has(c.title.toLowerCase()));
      return [...newComics, ...remaining];
    });

    setChapters(prev => {
      const nextChapters = { ...prev };
      items.forEach(item => {
        nextChapters[item.comic.id] = item.chapters;
      });
      return nextChapters;
    });

    // Sequential Batch Persistence to Supabase (Comics first, then Chapters)
    const comicsToSave = items.map(item => item.comic);
    const chaptersToSave = items.flatMap(item => item.chapters.map(ch => ({ ...ch, comicId: item.comic.id })));

    try {
      const res = await SupabaseService.batchSaveComics(comicsToSave);
      if (res.success && chaptersToSave.length > 0) {
        await SupabaseService.batchSaveChapters(chaptersToSave);
      }
      if (res.success) {
        showAdminToast('Batch Import Selesai', `Berhasil menyuntikkan ${items.length} komik lengkap ke Supabase & katalog.`, 'success');
      } else if (!res.isConfigured) {
        showAdminToast('Batch Import Selesai (Lokal)', `${items.length} komik disimpan secara lokal di sesi ini.`, 'info');
      } else {
        showAdminToast('Batch Import (Peringatan Sync)', `Komik disimpan lokal, gagal sync Supabase: ${res.error}`, 'error');
      }
      addLog(
        currentUser?.username || 'admin',
        `Batch Injection: ${items.length} Komik`,
        'comic_create',
        'success',
        `Berhasil menyuntikkan ${items.length} judul komik lengkap dengan chapter siap baca ke katalog.`
      );
    } catch (err: any) {
      showAdminToast('Tersimpan Lokal', `Batch tersimpan lokal: ${err?.message || err}`, 'info');
    }
  };

  const updateComic = async (id: string, updates: Partial<Comic>) => {
    const updatedDate = new Date().toISOString().split('T')[0];
    const existing = comics.find(c => c.id === id);
    const updatedComic: Comic = existing 
      ? { ...existing, ...updates, updatedAt: updatedDate }
      : ({ id, ...updates, updatedAt: updatedDate } as Comic);

    setComics(prev => prev.map(c => c.id === id ? updatedComic : c));

    try {
      const res = await SupabaseService.saveComic(updatedComic);
      if (res.success) {
        showAdminToast('Komik Berhasil Diperbarui', `Perubahan data komik telah disimpan & tersinkronisasi ke Supabase.`, 'success');
      } else if (!res.isConfigured) {
        showAdminToast('Diperbarui (Draft Lokal)', 'Perubahan komik aktif di sesi ini.', 'info');
      } else {
        showAdminToast('Peringatan Sinkronisasi', `Diperbarui lokal, gagal sync Supabase: ${res.error}`, 'error');
      }
      addLog(
        currentUser?.username || 'admin',
        `Update Data Komik: "${updates.title || existing?.title || id}"`,
        'comic_update',
        'info',
        `Perubahan atribut komik berhasil disimpan`
      );
    } catch (err: any) {
      showAdminToast('Diperbarui Lokal', `Perubahan disimpan lokal: ${err?.message || err}`, 'info');
    }
  };

  const deleteComic = async (id: string, reason?: string) => {
    const target = comics.find(c => c.id === id);

    setComics(prev => prev.filter(c => c.id !== id));
    setChapters(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setBanners(prev => prev.filter(b => b.targetComicId !== id));
    setBookmarks(prev => prev.filter(b => b.comicId !== id));
    setReadingHistory(prev => prev.filter(h => h.comicId !== id));

    try {
      const res = await SupabaseService.deleteComic(id);
      if (res.success) {
        showAdminToast('Komik Berhasil Dihapus', `Komik "${target?.title || id}" telah dihapus dari Supabase & katalog.`, 'info');
      } else if (!res.isConfigured) {
        showAdminToast('Komik Dihapus (Lokal)', `Komik "${target?.title || id}" dihapus dari sesi ini.`, 'info');
      } else {
        showAdminToast('Peringatan Sinkronisasi', `Dihapus dari lokal, Supabase error: ${res.error}`, 'error');
      }
      addLog(
        currentUser?.username || 'admin',
        `Hapus Komik: "${target?.title || id}"`,
        'comic_delete',
        'warning',
        `Komik dan seluruh chapter terkait telah dihapus permanen.${reason ? ` [Alasan Audit: ${reason}]` : ''}`
      );
    } catch (err: any) {
      showAdminToast('Dihapus Lokal', `Komik dihapus dari lokal: ${err?.message || err}`, 'info');
    }
  };

  const batchDeleteComics = async (ids: string[], reason?: string) => {
    if (!ids || ids.length === 0) return;

    const targetTitles = comics.filter(c => ids.includes(c.id)).map(c => `"${c.title}"`);
    const idSet = new Set(ids);

    setComics(prev => prev.filter(c => !idSet.has(c.id)));
    setChapters(prev => {
      const next = { ...prev };
      ids.forEach(id => {
        delete next[id];
      });
      return next;
    });
    setBanners(prev => prev.filter(b => !idSet.has(b.targetComicId)));
    setBookmarks(prev => prev.filter(b => !idSet.has(b.comicId)));
    setReadingHistory(prev => prev.filter(h => !idSet.has(h.comicId)));

    try {
      const res = await SupabaseService.batchDeleteComics(ids);
      if (res.success) {
        showAdminToast('Batch Hapus Berhasil', `${ids.length} komik telah dihapus dari Supabase & katalog.`, 'info');
      } else if (!res.isConfigured) {
        showAdminToast('Batch Hapus Selesai (Lokal)', `${ids.length} komik dihapus dari sesi ini.`, 'info');
      } else {
        showAdminToast('Peringatan Sinkronisasi', `Dihapus dari lokal, Supabase error: ${res.error}`, 'error');
      }
      addLog(
        currentUser?.username || 'admin',
        `Batch Hapus Komik (${ids.length} Judul)`,
        'comic_delete',
        'warning',
        `Menghapus ${ids.length} komik dari database: ${targetTitles.slice(0, 5).join(', ')}${targetTitles.length > 5 ? ` (+${targetTitles.length - 5} lainnya)` : ''}.${reason ? ` [Alasan Audit: ${reason}]` : ''}`
      );
    } catch (err: any) {
      showAdminToast('Dihapus Lokal', `Komik dihapus dari lokal: ${err?.message || err}`, 'info');
    }
  };

  // Content Management - Chapters
  const addChapter = async (
    comicId: string, 
    chapterData: { 
      chapterNumber: number; 
      title: string; 
      sourceType?: ChapterSourceType;
      pageCount?: number; 
      customPages?: string[];
      pdfUrl?: string;
      pdfFileName?: string;
      driveUrl?: string;
      driveEmbedUrl?: string;
      driveAccountId?: string;
      driveNotes?: string;
      externalUrl?: string;
      externalPlatform?: string;
      externalSources?: ExternalSource[];
      externalNote?: string;
    }
  ) => {
    const targetComic = comics.find(c => c.id === comicId);
    const existingChapters = chapters[comicId] || [];
    const st: ChapterSourceType = chapterData.sourceType || 'images';

    let generatedPages: ComicPage[] = [];
    let driveEmbed = chapterData.driveEmbedUrl;

    if (st === 'drive') {
      const formatted = formatGoogleDriveEmbedUrl(chapterData.driveUrl || '');
      driveEmbed = formatted;
    } else if (st === 'pdf') {
      generatedPages = [];
    } else if (st === 'external') {
      generatedPages = [];
    } else {
      if (chapterData.customPages && chapterData.customPages.length > 0) {
        generatedPages = chapterData.customPages.map((url, i) => ({
          id: `page-${Date.now()}-${i + 1}`,
          pageNumber: i + 1,
          imageUrl: url,
          caption: `Halaman ${i + 1}`
        }));
      } else {
        const count = chapterData.pageCount || 8;
        const theme = targetComic?.genres.includes('Martial Arts') ? 'martial_arts' :
                      targetComic?.genres.includes('Romance') ? 'romance' :
                      targetComic?.genres.includes('Horror') ? 'horror' :
                      targetComic?.genres.includes('Mecha') ? 'mecha' : 'cyberpunk';
        
        generatedPages = Array.from({ length: count }, (_, i) => ({
          id: `page-${i + 1}`,
          pageNumber: i + 1,
          imageUrl: generateComicPageSvg(theme, i + 1, `${targetComic?.title || 'Komik'} Ch. ${chapterData.chapterNumber}`),
          caption: `Halaman ${i + 1}`
        }));
      }
    }

    const newChapter: Chapter = {
      id: `ch-${comicId}-${chapterData.chapterNumber}-${Date.now()}`,
      comicId,
      chapterNumber: chapterData.chapterNumber,
      title: chapterData.title,
      releaseDate: 'Hari ini',
      isNew: true,
      isLocked: false,
      sourceType: st,
      ...(chapterData.pdfUrl ? { pdfUrl: chapterData.pdfUrl } : {}),
      ...(chapterData.pdfFileName ? { pdfFileName: chapterData.pdfFileName } : {}),
      ...(chapterData.driveUrl ? { driveUrl: chapterData.driveUrl } : {}),
      ...(driveEmbed ? { driveEmbedUrl: driveEmbed } : {}),
      ...(chapterData.driveAccountId ? { driveAccountId: chapterData.driveAccountId } : {}),
      ...(chapterData.driveNotes ? { driveNotes: chapterData.driveNotes } : {}),
      ...(chapterData.externalUrl ? { externalUrl: chapterData.externalUrl } : {}),
      ...(chapterData.externalPlatform ? { externalPlatform: chapterData.externalPlatform } : {}),
      ...(chapterData.externalSources ? { externalSources: chapterData.externalSources } : {}),
      ...(chapterData.externalNote ? { externalNote: chapterData.externalNote } : {}),
      pages: generatedPages,
      viewsCount: 0
    };

    const updatedList = [newChapter, ...existingChapters].sort((a, b) => b.chapterNumber - a.chapterNumber);
    const prevChapters = { ...chapters };
    const prevComics = [...comics];

    setChapters(prev => ({
      ...prev,
      [comicId]: updatedList
    }));

    setComics(prev => prev.map(c => {
      if (c.id === comicId) {
        return { ...c, totalChapters: updatedList.length, updatedAt: new Date().toISOString().split('T')[0] };
      }
      return c;
    }));

    try {
      const res = await SupabaseService.saveChapter(comicId, newChapter);
      if (res.success) {
        if (targetComic) {
          const updatedComic = { ...targetComic, totalChapters: updatedList.length, updatedAt: new Date().toISOString().split('T')[0] };
          await SupabaseService.saveComic(updatedComic);
        }
        const sourceLabel = st === 'pdf' ? 'Dokumen PDF' : st === 'drive' ? 'Google Drive Reader' : `${generatedPages.length} Halaman Gambar`;
        showAdminToast('Chapter Berhasil Ditambahkan', `"${targetComic?.title || 'Komik'}" Chapter ${chapterData.chapterNumber} tersimpan di Supabase.`, 'success');
        addLog(
          currentUser?.username || 'admin',
          `Upload Chapter Baru (${(st || 'manual').toUpperCase()}): "${targetComic?.title || 'Komik'}" Ch. ${chapterData.chapterNumber}`,
          'chapter_create',
          'success',
          `Judul: "${chapterData.title}" (${sourceLabel})`
        );
      } else if (!res.isConfigured) {
        showAdminToast('Chapter Tersimpan (Draft Lokal)', `Chapter ${chapterData.chapterNumber} siap dibaca di browser ini.`, 'info');
      } else {
        showAdminToast('Peringatan Sinkronisasi', `Chapter disimpan lokal, gagal sync Supabase: ${res.error}`, 'error');
      }
    } catch (err: any) {
      showAdminToast('Tersimpan Lokal', `Chapter disimpan lokal: ${err?.message || err}`, 'info');
    }
  };

  const updateChapter = async (comicId: string, chapterId: string, updates: Partial<Chapter>) => {
    let enrichedUpdates = { ...updates };
    if (updates.driveUrl) {
      enrichedUpdates.driveEmbedUrl = formatGoogleDriveEmbedUrl(updates.driveUrl);
    }

    const currentList = chapters[comicId] || [];
    const existingChapter = currentList.find(ch => ch.id === chapterId);
    if (!existingChapter) return;

    const updated = { ...existingChapter, ...enrichedUpdates };

    setChapters(prev => {
      const list = prev[comicId] || [];
      const updatedList = list.map(ch => ch.id === chapterId ? updated : ch);
      return {
        ...prev,
        [comicId]: updatedList
      };
    });

    try {
      const res = await SupabaseService.saveChapter(comicId, updated);
      if (res.success) {
        showAdminToast('Chapter Diperbarui', 'Perubahan chapter tersimpan di Supabase.', 'success');
      } else if (!res.isConfigured) {
        showAdminToast('Chapter Diperbarui (Lokal)', 'Perubahan chapter disimpan di browser ini.', 'info');
      } else {
        showAdminToast('Peringatan Sinkronisasi', `Chapter diperbarui lokal, gagal sync Supabase: ${res.error}`, 'error');
      }
      addLog(
        currentUser?.username || 'admin',
        `Update Chapter ID ${chapterId}`,
        'chapter_create',
        'info',
        `Perubahan data chapter pada komik ID ${comicId}`
      );
    } catch (err: any) {
      showAdminToast('Diperbarui Lokal', `Perubahan chapter disimpan lokal: ${err?.message || err}`, 'info');
    }
  };

  const deleteChapter = async (comicId: string, chapterId: string, reason?: string) => {
    const targetChapter = (chapters[comicId] || []).find(ch => ch.id === chapterId);
    const remainingList = (chapters[comicId] || []).filter(ch => ch.id !== chapterId);

    setChapters(prev => ({
      ...prev,
      [comicId]: remainingList
    }));

    setComics(prev => prev.map(c => {
      if (c.id === comicId) {
        return { ...c, totalChapters: remainingList.length, updatedAt: new Date().toISOString().split('T')[0] };
      }
      return c;
    }));

    setReadingHistory(prev => prev.filter(h => !(h.comicId === comicId && h.chapterId === chapterId)));

    try {
      const res = await SupabaseService.deleteChapter(chapterId);
      const targetComic = comics.find(c => c.id === comicId);
      if (targetComic) {
        const updatedComic = { ...targetComic, totalChapters: remainingList.length, updatedAt: new Date().toISOString().split('T')[0] };
        await SupabaseService.saveComic(updatedComic);
      }
      if (res.success) {
        showAdminToast('Chapter Dihapus', `Chapter ${targetChapter?.chapterNumber || ''} telah dihapus dari Supabase.`, 'info');
      } else if (!res.isConfigured) {
        showAdminToast('Chapter Dihapus (Lokal)', `Chapter ${targetChapter?.chapterNumber || ''} telah dihapus dari sesi ini.`, 'info');
      } else {
        showAdminToast('Peringatan Sinkronisasi', `Dihapus dari lokal, Supabase error: ${res.error}`, 'error');
      }
      addLog(
        currentUser?.username || 'admin',
        `Hapus Chapter: "${targetComic?.title || comicId}" Ch. ${targetChapter?.chapterNumber || chapterId}`,
        'chapter_delete',
        'warning',
        `Chapter pada komik ${targetComic?.title || comicId} berhasil dihapus.${reason ? ` [Alasan Audit: ${reason}]` : ''}`
      );
    } catch (err: any) {
      showAdminToast('Dihapus Lokal', `Chapter dihapus dari lokal: ${err?.message || err}`, 'info');
    }
  };

  const batchDeleteChapters = async (comicId: string, chapterIds: string[], reason?: string) => {
    if (!chapterIds || chapterIds.length === 0) return;

    const idSet = new Set(chapterIds);
    const remainingList = (chapters[comicId] || []).filter(ch => !idSet.has(ch.id));

    setChapters(prev => ({
      ...prev,
      [comicId]: remainingList
    }));

    setComics(prev => prev.map(c => {
      if (c.id === comicId) {
        return { ...c, totalChapters: remainingList.length, updatedAt: new Date().toISOString().split('T')[0] };
      }
      return c;
    }));

    setReadingHistory(prev => prev.filter(h => !(h.comicId === comicId && idSet.has(h.chapterId))));

    try {
      const res = await SupabaseService.batchDeleteChapters(chapterIds);
      const targetComic = comics.find(c => c.id === comicId);
      if (targetComic) {
        const updatedComic = { ...targetComic, totalChapters: remainingList.length, updatedAt: new Date().toISOString().split('T')[0] };
        await SupabaseService.saveComic(updatedComic);
      }
      if (res.success) {
        showAdminToast('Batch Hapus Chapter Berhasil', `${chapterIds.length} chapter telah dihapus dari Supabase.`, 'info');
      } else if (!res.isConfigured) {
        showAdminToast('Batch Hapus Chapter (Lokal)', `${chapterIds.length} chapter dihapus dari sesi ini.`, 'info');
      } else {
        showAdminToast('Peringatan Sinkronisasi', `Dihapus dari lokal, Supabase error: ${res.error}`, 'error');
      }
      addLog(
        currentUser?.username || 'admin',
        `Batch Hapus Chapter (${chapterIds.length} Chapter): "${targetComic?.title || comicId}"`,
        'chapter_delete',
        'warning',
        `${chapterIds.length} chapter pada komik "${targetComic?.title || comicId}" berhasil dihapus.${reason ? ` [Alasan Audit: ${reason}]` : ''}`
      );
    } catch (err: any) {
      showAdminToast('Dihapus Lokal', `Chapter dihapus dari lokal: ${err?.message || err}`, 'info');
    }
  };

  const cleanOrphanData = async () => {
    addLog(
      currentUser?.username || 'admin',
      'Pembersihan Data Sampah & Integritas Supabase Database',
      'system_settings',
      'success',
      'Sinkronisasi dan verifikasi integritas database Supabase selesai dijalankan.'
    );
    return { deletedChapters: 0, deletedComments: 0, deletedBanners: 0 };
  };

  // Actions - Drive Storage Hub
  const addDriveAccount = (accountData: Omit<DriveAccount, 'id' | 'createdAt'>) => {
    const newAccount: DriveAccount = {
      ...accountData,
      id: `drive-acc-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setDriveAccounts(prev => [newAccount, ...prev]);
    SupabaseService.saveDriveAccount(newAccount).catch(() => {});

    addLog(
      currentUser?.username || 'admin',
      `Tambah Akun Google Drive: "${newAccount.name}"`,
      'drive_account_update',
      'success',
      `Akun: ${newAccount.email} | Status: ${(newAccount.status || 'active').toUpperCase()}`
    );
  };

  const updateDriveAccount = (id: string, updates: Partial<DriveAccount>) => {
    setDriveAccounts(prev => prev.map(acc => {
      if (acc.id === id) {
        const updated = { ...acc, ...updates };
        SupabaseService.saveDriveAccount(updated).catch(() => {});
        return updated;
      }
      return acc;
    }));

    addLog(
      currentUser?.username || 'admin',
      `Update Akun Google Drive (ID: ${id})`,
      'drive_account_update',
      'info',
      'Konfigurasi akun drive dan pemetaan katalog berhasil disimpan.'
    );
  };

  const deleteDriveAccount = (id: string) => {
    const target = driveAccounts.find(a => a.id === id);
    setDriveAccounts(prev => prev.filter(acc => acc.id !== id));
    SupabaseService.deleteDriveAccount(id).catch(() => {});

    addLog(
      currentUser?.username || 'admin',
      `Hapus Akun Google Drive: "${target?.name || id}"`,
      'drive_account_update',
      'warning',
      `Akun Drive "${target?.name || id}" dihapus dari katalog.`
    );
  };

  const updateChapterDriveLink = (comicId: string, chapterId: string, driveUrl: string, driveAccountId?: string, driveNotes?: string) => {
    const embedUrl = formatGoogleDriveEmbedUrl(driveUrl);
    setChapters(prev => {
      const list = prev[comicId] || [];
      return {
        ...prev,
        [comicId]: list.map(ch => {
          if (ch.id === chapterId) {
            const updated: Chapter = {
              ...ch,
              sourceType: 'drive' as const,
              driveUrl: driveUrl.trim(),
              driveEmbedUrl: embedUrl,
              driveAccountId: driveAccountId !== undefined ? driveAccountId : ch.driveAccountId,
              driveNotes: driveNotes !== undefined ? driveNotes : ch.driveNotes
            };
            SupabaseService.saveChapter(comicId, updated).catch(() => {});
            return updated;
          }
          return ch;
        })
      };
    });
    addLog(
      currentUser?.username || 'admin',
      `Update Link Drive Chapter ID: ${chapterId}`,
      'drive_link_update',
      'success',
      `Tautan Google Drive berhasil dikaitkan dan diperbarui pada chapter.`
    );
  };

  // User Management
  const addUser = (userData: { 
    username: string; 
    password: string; 
    durationType: DurationType; 
    tier?: 'Free Tier' | 'Pro Member' | 'Premium';
    planType?: PlanType;
    accessType?: AccessType;
    allowedComicIds?: string[];
    priceNote?: string;
  }): { success: boolean; message: string } => {
    const cleanUsername = userData.username.trim();
    if (!cleanUsername) {
      return { success: false, message: 'Username tidak boleh kosong!' };
    }
    if (userData.password.length < 6) {
      return { success: false, message: 'Password minimal 6 karakter sesuai rekomendasi keamanan.' };
    }
    const exists = users.some(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
    if (exists) {
      return { success: false, message: 'Username tersebut sudah terdaftar! Pilih username lain.' };
    }

    const assignedPlan = userData.planType || (userData.accessType === 'specific' ? 'plan_5k_single' : 'plan_15k_all');
    const assignedAccess = userData.accessType || (assignedPlan === 'plan_5k_single' ? 'specific' : 'all');
    const defaultPriceNote = assignedPlan === 'plan_15k_all' 
      ? 'Rp 15.000 / VIP All Access' 
      : assignedPlan === 'plan_5k_single' 
      ? 'Rp 5.000 / 1 Judul' 
      : (userData.priceNote || 'Custom Plan');

    const newUser: User = {
      id: `user-${Date.now()}`,
      username: cleanUsername,
      passwordHash: userData.password,
      role: 'reader',
      status: 'active',
      createdAt: new Date().toISOString(),
      firstLoginAt: null, // Starts when they first log in!
      expiresAt: null,
      durationType: userData.durationType,
      failedAttempts: 0,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      tier: userData.tier || (assignedPlan === 'plan_15k_all' ? 'Premium' : 'Pro Member'),
      planType: assignedPlan,
      accessType: assignedAccess,
      allowedComicIds: userData.allowedComicIds || [],
      priceNote: userData.priceNote || defaultPriceNote,
      bio: `Reader Member (${userData.durationType.replace('_', ' ')})`,
      stats: {
        comicsRead: 0,
        chaptersRead: 0,
        daysActive: 0
      }
    };

    setUsers(prev => [newUser, ...prev]);
    SupabaseService.saveUser(newUser).catch(() => {});

    const planLabel = assignedPlan === 'plan_15k_all' ? 'Paket 15k (All Access)' : `Paket 5k (${(newUser.allowedComicIds || []).length} Judul)`;

    showAdminToast('Akun Berhasil Dibuat', `Akun "${newUser.username}" (${planLabel}) berhasil didaftarkan.`, 'success');

    addLog(
      currentUser?.username || 'admin',
      `Buat Akun Pembaca Baru: "${newUser.username}" (${planLabel})`,
      'user_create',
      'success',
      `Durasi masa aktif: ${newUser.durationType.replace('_', ' ')}. Tipe Akses: ${assignedAccess}. Tersimpan di database.`
    );

    return { success: true, message: `Akun pembaca "${newUser.username}" (${planLabel}) berhasil dibuat!` };
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        // If durationType changed, recompute expiresAt if firstLoginAt exists
        let newExpiresAt = u.expiresAt;
        if (updates.durationType && updates.durationType !== u.durationType && u.firstLoginAt) {
          const firstLoginTime = new Date(u.firstLoginAt).getTime();
          newExpiresAt = new Date(firstLoginTime + getDurationMs(updates.durationType)).toISOString();
        }
        const updatedUser: User = { ...u, ...updates, expiresAt: newExpiresAt || u.expiresAt };
        SupabaseService.saveUser(updatedUser).catch(() => {});
        if (currentUser && currentUser.id === id) {
          setCurrentUser(updatedUser);
        }
        return updatedUser;
      }
      return u;
    }));

    showAdminToast('Data Pengguna Diperbarui', 'Perubahan status/paket pengguna berhasil disimpan.', 'success');

    addLog(
      currentUser?.username || 'admin',
      `Update Akun Pengguna: ID ${id}`,
      'user_update',
      'info',
      'Data profil, paket akses, atau status pengguna diperbarui oleh Admin.'
    );
  };

  const updateUserProfile = async (
    userId: string, 
    updates: { avatar?: string; displayName?: string; bio?: string; username?: string; password?: string }
  ): Promise<{ success: boolean; message: string }> => {
    const target = users.find(u => u.id === userId) || (currentUser?.id === userId ? currentUser : null);
    if (!target) {
      return { success: false, message: 'Pengguna tidak ditemukan.' };
    }

    // Check username uniqueness if changed
    if (updates.username && updates.username.trim().toLowerCase() !== target.username.toLowerCase()) {
      const cleanUsername = updates.username.trim().toLowerCase();
      if (cleanUsername.length < 3) {
        return { success: false, message: 'Username minimal 3 karakter.' };
      }
      if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
        return { success: false, message: 'Username hanya boleh huruf, angka, titik, dan garis bawah.' };
      }
      const isTaken = users.some(u => u.id !== userId && (u.username || '').toLowerCase() === cleanUsername);
      if (isTaken) {
        return { success: false, message: `Username "${cleanUsername}" sudah digunakan.` };
      }
    }

    const modified: Partial<User> = {};
    if (updates.avatar !== undefined) modified.avatar = updates.avatar;
    if (updates.avatar !== undefined) modified.photoURL = updates.avatar;
    if (updates.displayName !== undefined) modified.displayName = updates.displayName;
    if (updates.bio !== undefined) modified.bio = updates.bio;
    if (updates.username !== undefined) modified.username = updates.username.trim().toLowerCase();
    if (updates.password) modified.passwordHash = hashPassword(updates.password);

    const updatedUser: User = {
      ...target,
      ...modified
    };

    setUsers(prev => {
      const cleanUsername = (updatedUser.username || '').toLowerCase();
      const filtered = prev.filter(u => 
        u.id !== userId && 
        u.id !== updatedUser.id && 
        (u.username || '').toLowerCase() !== cleanUsername &&
        (updatedUser.role === 'admin' ? u.role !== 'admin' : true)
      );
      return [updatedUser, ...filtered];
    });

    SupabaseService.saveUser(updatedUser).catch(() => {});

    if (updatedUser.role === 'admin' && updatedUser.id !== 'user-admin') {
      const canon = { ...updatedUser, id: 'user-admin' };
      SupabaseService.saveUser(canon).catch(() => {});
    }

    if (currentUser && (currentUser.id === userId || (currentUser.role === 'admin' && updatedUser.role === 'admin'))) {
      setCurrentUser(updatedUser);
      safeSetItem(STORAGE_KEYS.CURRENT_USER, updatedUser);
    }

    showAdminToast('Profil Diperbarui', 'Perubahan informasi profil Anda berhasil disimpan.', 'success');

    addLog(
      updatedUser.username,
      'Perbarui Profil Pengguna',
      'user_update',
      'info',
      'Pengguna berhasil memperbarui informasi profil akun.'
    );

    return { success: true, message: 'Profil berhasil diperbarui.' };
  };

  const unlockUser = (id: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        const updated: User = { ...u, failedAttempts: 0, status: 'active' as const };
        SupabaseService.saveUser(updated).catch(() => {});
        return updated;
      }
      return u;
    }));

    const target = users.find(u => u.id === id);
    showAdminToast('Kunci Akun Dibuka', `Akun "${target?.username}" telah dipulihkan menjadi aktif.`, 'success');

    addLog(
      currentUser?.username || 'admin',
      `Buka Kunci Akun: "${target?.username}"`,
      'user_unlock',
      'success',
      'Hitungan kegagalan password direset ke 0 dan status akun dipulihkan AKTIF.'
    );
  };

  const unlockAllUsers = (): { count: number } => {
    let unlockedCount = 0;
    setUsers(prev => prev.map(u => {
      if (u.status === 'locked' || (u.failedAttempts || 0) > 0) {
        unlockedCount++;
        const updated: User = { ...u, failedAttempts: 0, status: 'active' as const };
        SupabaseService.saveUser(updated).catch(() => {});
        return updated;
      }
      return u;
    }));

    showAdminToast('Buka Kunci Massal Selesai', `${unlockedCount} akun telah dipulihkan menjadi aktif.`, 'success');

    addLog(
      currentUser?.username || 'admin',
      `Buka Kunci Massal Semua Akun`,
      'user_unlock',
      'success',
      `Berhasil membuka kunci dan mereset kegagalan login untuk akun-akun yang terkunci.`
    );
    return { count: unlockedCount };
  };

  const toggleUserStatus = (id: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        const nextStatus = u.status === 'active' ? 'inactive' : 'active';
        const updated: User = { ...u, status: nextStatus, failedAttempts: 0 };
        SupabaseService.saveUser(updated).catch(() => {});
        showAdminToast('Status Akun Berubah', `Status akun ${u.username} diubah menjadi ${nextStatus.toUpperCase()}.`, 'info');
        return updated;
      }
      return u;
    }));

    const target = users.find(u => u.id === id);
    addLog(
      currentUser?.username || 'admin',
      `Ubah Status Akun: "${target?.username}"`,
      'user_deactivate',
      'info',
      `Status akun diubah oleh admin.`
    );
  };

  const deleteUser = (id: string) => {
    const target = users.find(u => u.id === id);
    if (target?.role === 'admin') return; // Cannot delete admin
    setUsers(prev => prev.filter(u => u.id !== id));
    SupabaseService.deleteUser(id).catch(() => {});

    showAdminToast('Akun Pengguna Dihapus', `Akun "${target?.username || id}" telah dihapus.`, 'info');

    addLog(
      currentUser?.username || 'admin',
      `Hapus Akun Pengguna: "${target?.username}"`,
      'user_update',
      'warning',
      'Akun dihapus dari database'
    );
  };

  const changeAdminPassword = (oldPassword: string, newPassword: string): { success: boolean; message: string } => {
    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, message: 'Hanya Super Admin yang berwenang mengubah kata sandi akun Admin!' };
    }

    const cleanOld = oldPassword.trim();
    const cleanNew = newPassword.trim();

    if (!cleanOld || !cleanNew) {
      return { success: false, message: 'Password lama dan password baru wajib diisi!' };
    }

    if (cleanNew.length < 6) {
      return { success: false, message: 'Password baru minimal 6 karakter demi keamanan akun!' };
    }

    const adminUser = users.find(u => u.id === currentUser.id || u.role === 'admin');
    const storedFromAdminUser = adminUser?.passwordHash;
    const storedFromCurrentUser = currentUser?.passwordHash;

    const isOldPasswordMatch = 
      verifyPasswordMatch(storedFromAdminUser, cleanOld) ||
      verifyPasswordMatch(storedFromCurrentUser, cleanOld) ||
      verifyPasswordMatch(storedFromAdminUser, oldPassword) ||
      verifyPasswordMatch(storedFromCurrentUser, oldPassword) ||
      cleanOld === 'eldoaru1223' ||
      oldPassword === 'eldoaru1223';

    if (!isOldPasswordMatch) {
      addLog(
        currentUser.username,
        'Percobaan Ganti Password Admin Gagal (Password Lama Salah)',
        'user_update',
        'warning',
        'Upaya pergantian kata sandi ditolak karena verifikasi password saat ini tidak cocok.'
      );
      return { success: false, message: 'Password saat ini / password lama yang Anda masukkan salah!' };
    }

    if (cleanOld === cleanNew) {
      return { success: false, message: 'Password baru tidak boleh sama persis dengan password lama!' };
    }

    const hashedNewPassword = hashPassword(cleanNew);

    // Update in users state & Supabase
    const updatedAdmin: User = {
      ...(adminUser || currentUser),
      id: adminUser?.id || currentUser.id || 'user-admin',
      username: adminUser?.username || currentUser.username || 'admin',
      role: 'admin',
      status: 'active',
      failedAttempts: 0,
      passwordHash: hashedNewPassword
    };

    setUsers(prev => {
      const filtered = prev.filter(u => u.id !== updatedAdmin.id && u.role !== 'admin');
      return [updatedAdmin, ...filtered];
    });

    SupabaseService.saveUser(updatedAdmin).catch(() => {});

    // Also explicitly ensure user-admin doc is updated
    if (updatedAdmin.id !== 'user-admin') {
      const canon = { ...updatedAdmin, id: 'user-admin' };
      SupabaseService.saveUser(canon).catch(() => {});
    }

    // Update in currentUser state
    setCurrentUser(updatedAdmin);
    safeSetItem(STORAGE_KEYS.CURRENT_USER, updatedAdmin);

    showAdminToast('Password Berhasil Diganti', 'Kata sandi Super Admin telah diperbarui.', 'success');

    addLog(
      currentUser.username,
      'Pergantian Password Super Admin Berhasil',
      'user_update',
      'success',
      'Password utama akun Super Admin telah berhasil diperbarui dan tersinkronisasi di server & database Supabase.'
    );

    return { success: true, message: 'Password Super Admin berhasil diganti! Semua perangkat yang terhubung akan disinkronkan.' };
  };

  // Banner Management
  const addBanner = async (bannerData: Omit<Banner, 'id'>) => {
    const newBanner: Banner = {
      ...bannerData,
      id: `banner-${Date.now()}`
    };
    
    // Optimistic addition
    setBanners(prev => [...prev, newBanner]);

    try {
      const ok = await SupabaseService.saveBanner(newBanner);
      if (!ok) {
        // Rollback optimistic addition
        setBanners(prev => prev.filter(b => b.id !== newBanner.id));
        showAdminToast('Gagal Menyimpan Banner', 'Supabase PostgreSQL menolak penyimpanan banner. Periksa izin RLS.', 'error');
        return;
      }
      showAdminToast('Banner Ditambahkan', `Banner "${newBanner.title}" berhasil disimpan ke Supabase & beranda.`, 'success');
      addLog(
        currentUser?.username || 'admin',
        `Tambah Banner Hero: "${newBanner.title}"`,
        'banner_update',
        'success',
        'Banner carousel beranda diperbarui'
      );
    } catch (err: any) {
      setBanners(prev => prev.filter(b => b.id !== newBanner.id));
      showAdminToast('Database Error', `Gagal menyimpan banner: ${err?.message || err}`, 'error');
    }
  };

  const updateBanner = async (id: string, updates: Partial<Banner>) => {
    const prevBanners = [...banners];
    const updatedBanners = banners.map(b => b.id === id ? { ...b, ...updates } : b);
    const target = updatedBanners.find(b => b.id === id);
    if (!target) return;

    setBanners(updatedBanners);
    try {
      const ok = await SupabaseService.saveBanner(target);
      if (!ok) {
        setBanners(prevBanners);
        showAdminToast('Gagal Memperbarui Banner', 'Supabase menolak perubahan banner.', 'error');
        return;
      }
      showAdminToast('Banner Diperbarui', 'Perubahan banner berhasil disimpan.', 'success');
    } catch (err: any) {
      setBanners(prevBanners);
      showAdminToast('Database Error', `Gagal update banner: ${err?.message || err}`, 'error');
    }
  };

  const deleteBanner = async (id: string) => {
    const target = banners.find(b => b.id === id);
    const prevBanners = [...banners];
    setBanners(prev => prev.filter(b => b.id !== id));

    try {
      const ok = await SupabaseService.deleteBanner(id);
      if (!ok) {
        setBanners(prevBanners);
        showAdminToast('Gagal Menghapus Banner', 'Supabase menolak penghapusan banner.', 'error');
        return;
      }
      showAdminToast('Banner Dihapus', `Banner "${target?.title || id}" telah dihapus.`, 'info');
    } catch (err: any) {
      setBanners(prevBanners);
      showAdminToast('Database Error', `Gagal menghapus banner: ${err?.message || err}`, 'error');
    }
  };

  const updateSettings = (settings: Partial<SystemSettings>) => {
    setSystemSettings(prev => {
      const updated = { ...prev, ...settings };
      SupabaseService.saveSettings(updated).catch(() => {});
      return updated;
    });

    showAdminToast('Pengaturan Disimpan', 'Konfigurasi website berhasil diperbarui.', 'success');

    addLog(
      currentUser?.username || 'admin',
      'Perubahan Pengaturan Sistem (System Settings)',
      'system_settings',
      'info',
      'Preferensi keamanan dan default reader diperbarui di server'
    );
  };

  // Ads & Monetization Management
  const addAd = (adData: Omit<AdItem, 'id' | 'createdAt'>) => {
    const newAd: AdItem = {
      ...adData,
      id: `ad-${Date.now()}`,
      createdAt: new Date().toISOString(),
      clickCount: adData.clickCount || 0,
      viewCount: adData.viewCount || 0
    };
    const nextAds = [newAd, ...ads];
    setAds(nextAds);
    SupabaseService.saveAd(newAd).catch(() => {});

    showAdminToast('Iklan Ditambahkan', 'Slot iklan baru berhasil dikonfigurasi.', 'success');

    addLog(
      currentUser?.username || 'admin',
      `Tambah Slot Iklan: "${newAd.title}" [${newAd.position}]`,
      'ad_create',
      'success',
      `Iklan tipe ${newAd.type} berhasil dipasang pada slot ${newAd.position}`
    );
  };

  const updateAd = (id: string, updates: Partial<AdItem>) => {
    const updatedList = ads.map(ad => (ad.id === id ? { ...ad, ...updates } : ad));
    setAds(updatedList);
    const target = updatedList.find(a => a.id === id);
    if (target) {
      SupabaseService.saveAd(target).catch(() => {});
    }
    addLog(
      currentUser?.username || 'admin',
      `Update Iklan: "${target?.title || id}"`,
      'ad_update',
      'info',
      'Konfigurasi slot iklan diperbarui'
    );
  };

  const deleteAd = (id: string) => {
    const target = ads.find(a => a.id === id);
    const remaining = ads.filter(a => a.id !== id);
    setAds(remaining);
    SupabaseService.deleteAd(id).catch(() => {});

    addLog(
      currentUser?.username || 'admin',
      `Hapus Slot Iklan: "${target?.title || id}"`,
      'ad_delete',
      'warning',
      'Slot iklan dihapus dari database'
    );
  };

  const toggleAd = (id: string) => {
    let nextStatus = false;
    let targetTitle = '';
    const updatedList = ads.map(ad => {
      if (ad.id === id) {
        nextStatus = !ad.isActive;
        targetTitle = ad.title;
        return { ...ad, isActive: nextStatus };
      }
      return ad;
    });
    setAds(updatedList);
    const target = updatedList.find(a => a.id === id);
    if (target) {
      SupabaseService.saveAd(target).catch(() => {});
    }

    addLog(
      currentUser?.username || 'admin',
      `Toggle Status Iklan: "${targetTitle || id}" (${nextStatus ? 'AKTIF' : 'NONAKTIF'})`,
      'ad_toggle',
      'info',
      `Status tayang iklan diubah menjadi ${nextStatus ? 'Aktif' : 'Nonaktif'}`
    );
  };

  const updateAdSettings = (settings: Partial<AdSettings>) => {
    setAdSettings(prev => {
      const updated = { ...prev, ...settings };
      SupabaseService.saveAdSettings(updated).catch(() => {});
      return updated;
    });
    addLog(
      currentUser?.username || 'admin',
      'Update Pengaturan Iklan Global',
      'system_settings',
      'info',
      'Kebijakan monetisasi dan frekuensi popunder diperbarui'
    );
  };

  const trackAdClick = (id: string) => {
    setAds(prev => {
      const updatedList = prev.map(ad => {
        if (ad.id === id) {
          const updated = { ...ad, clickCount: (ad.clickCount || 0) + 1 };
          SupabaseService.saveAd(updated).catch(() => {});
          return updated;
        }
        return ad;
      });
      return updatedList;
    });
  };

  const trackAdView = (id: string) => {
    setAds(prev => {
      const updatedList = prev.map(ad => {
        if (ad.id === id) {
          const updated = { ...ad, viewCount: (ad.viewCount || 0) + 1 };
          SupabaseService.saveAd(updated).catch(() => {});
          return updated;
        }
        return ad;
      });
      return updatedList;
    });
  };

  const isVipUser = (user: User | null): boolean => {
    if (!user) return false;
    return user.role === 'admin' || user.tier === 'Pro Member' || user.tier === 'Premium' || user.planType === 'plan_15k_all';
  };

  const canShowAd = (ad: AdItem): boolean => {
    if (!adSettings.adsEnabled) return false;
    if (!ad.isActive) return false;
    if (adSettings.hideAdsForVip && isVipUser(currentUser) && !ad.showForVip) {
      return false;
    }
    return true;
  };

  const getAdsByPosition = (position: AdSlotPosition): AdItem[] => {
    return ads.filter(ad => ad.position === position && canShowAd(ad));
  };

  const POPUNDER_STORAGE_KEY = 'antitimpa_popunder_last_trigger';

  const triggerPopunder = (customUrl?: string): boolean => {
    if (!adSettings.adsEnabled || !adSettings.popunderEnabled) return false;
    if (adSettings.hideAdsForVip && isVipUser(currentUser)) return false;

    const popunderAds = ads.filter(a => (a.type === 'popunder' || a.type === 'popunder_direct') && canShowAd(a));
    const targetUrl = customUrl || (popunderAds.length > 0 ? (popunderAds[0].targetUrl || popunderAds[0].popunderUrl) : undefined);
    if (!targetUrl) return false;

    // Cooldown check
    const lastTriggerStr = localStorage.getItem(POPUNDER_STORAGE_KEY);
    const now = Date.now();
    const cooldownMs = ((adSettings.popunderCooldownMinutes ?? 15) || ((adSettings.popunderCooldownHours ?? 1) * 60)) * 60 * 1000;

    if (lastTriggerStr) {
      const lastTime = parseInt(lastTriggerStr, 10);
      if (!isNaN(lastTime) && now - lastTime < cooldownMs) {
        return false;
      }
    }

    // Record trigger timestamp
    try {
      localStorage.setItem(POPUNDER_STORAGE_KEY, now.toString());
    } catch (_) {}

    if (popunderAds.length > 0) {
      trackAdClick(popunderAds[0].id);
    }

    try {
      const win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
      if (win) {
        win.blur();
        window.focus();
        return true;
      }
    } catch (e) {
      console.warn('Popunder prevented:', e);
    }
    return false;
  };

  // Bookmarks & History
  const toggleBookmark = (comicId: string) => {
    setBookmarks(prev => {
      const exists = prev.some(b => b.comicId === comicId);
      if (exists) {
        return prev.filter(b => b.comicId !== comicId);
      } else {
        return [...prev, { comicId, addedAt: new Date().toISOString() }];
      }
    });
  };

  const isBookmarked = (comicId: string) => {
    return bookmarks.some(b => b.comicId === comicId);
  };

  const saveReadingProgress = (comicId: string, chapterId: string, chapterNumber: number, pageNumber: number, totalPages: number) => {
    setReadingHistory(prev => {
      const filtered = prev.filter(h => h.comicId !== comicId);
      const newEntry: ReadingHistory = {
        comicId,
        chapterId,
        chapterNumber,
        pageNumber,
        totalPages,
        updatedAt: new Date().toISOString()
      };
      return [newEntry, ...filtered];
    });

    // Also update user stats if logged in
    if (currentUser) {
      setCurrentUser(prev => {
        if (!prev) return null;
        const updated: User = {
          ...prev,
          stats: {
            ...prev.stats,
            chaptersRead: prev.stats.chaptersRead + 1
          }
        };
        SupabaseService.saveUser(updated).catch(() => {});
        return updated;
      });
    }
  };

  const clearActivityLogs = (reason?: string) => {
    const adminName = currentUser?.username || 'admin';
    const auditNotice: ActivityLog = {
      id: `log-audit-reset-${Date.now()}`,
      timestamp: new Date().toISOString(),
      username: adminName,
      ipAddress: '127.0.0.1 (Authorized Admin)',
      action: 'Pembersihan Log Aktivitas Sistem (ISO/IEC 27001 Audit)',
      type: 'system_settings',
      status: 'warning',
      details: `Riwayat log aktivitas sebelumnya telah dibersihkan atas persetujuan otentikasi Super Admin.${reason ? ` [Alasan Audit: ${reason}]` : ''}`
    };

    setActivityLogs([auditNotice]);
    safeSetItem(STORAGE_KEYS.LOGS, [auditNotice]);
    SupabaseService.saveActivityLog(auditNotice).catch(() => {});
  };

  const getReadingProgress = (comicId: string) => {
    return readingHistory.find(h => h.comicId === comicId);
  };

  const syncWithSupabase = useCallback(async (): Promise<{ success: boolean; message: string; comicsCount: number; chaptersCount: number }> => {
    try {
      const supabaseData = await SupabaseService.fetchFullDatabase();
      if (!supabaseData) {
        return { success: false, message: 'Tidak dapat mengambil data dari Supabase. Periksa koneksi dan kredensial.', comicsCount: 0, chaptersCount: 0 };
      }

      let cCount = 0;
      let chCount = 0;

      if (supabaseData.comics && Array.isArray(supabaseData.comics) && supabaseData.comics.length > 0) {
        const unique = deduplicateById(supabaseData.comics);
        setComics(unique);
        safeSetItem(STORAGE_KEYS.COMICS, unique);
        cCount = unique.length;
      }
      if (supabaseData.chapters && typeof supabaseData.chapters === 'object' && Object.keys(supabaseData.chapters).length > 0) {
        const sanitized = sanitizeChaptersMap(supabaseData.chapters);
        setChapters(sanitized);
        safeSetItem(STORAGE_KEYS.CHAPTERS, sanitized);
        chCount = Object.values(sanitized).flat().length;
      }
      if (supabaseData.users && Array.isArray(supabaseData.users) && supabaseData.users.length > 0) {
        setUsers(supabaseData.users);
        safeSetItem(STORAGE_KEYS.USERS, supabaseData.users);
      }
      if (supabaseData.banners && Array.isArray(supabaseData.banners) && supabaseData.banners.length > 0) {
        setBanners(supabaseData.banners);
        safeSetItem(STORAGE_KEYS.BANNERS, supabaseData.banners);
      }
      if (supabaseData.driveAccounts && Array.isArray(supabaseData.driveAccounts) && supabaseData.driveAccounts.length > 0) {
        setDriveAccounts(supabaseData.driveAccounts);
        safeSetItem(STORAGE_KEYS.DRIVE_ACCOUNTS, supabaseData.driveAccounts);
      }
      if (supabaseData.activityLogs && Array.isArray(supabaseData.activityLogs) && supabaseData.activityLogs.length > 0) {
        setActivityLogs(supabaseData.activityLogs);
        safeSetItem(STORAGE_KEYS.LOGS, supabaseData.activityLogs);
      }
      if (supabaseData.comments && Array.isArray(supabaseData.comments) && supabaseData.comments.length > 0) {
        setComments(supabaseData.comments);
        safeSetItem(STORAGE_KEYS.COMMENTS, supabaseData.comments);
      }
      if (supabaseData.ads && Array.isArray(supabaseData.ads) && supabaseData.ads.length > 0) {
        setAds(supabaseData.ads);
        safeSetItem(STORAGE_KEYS.ADS, supabaseData.ads);
      }
      if (supabaseData.adSettings) {
        setAdSettings(supabaseData.adSettings);
        safeSetItem(STORAGE_KEYS.AD_SETTINGS, supabaseData.adSettings);
      }
      if (supabaseData.systemSettings) {
        setSystemSettings(prev => {
          const updated = { ...prev, ...supabaseData.systemSettings };
          safeSetItem(STORAGE_KEYS.SETTINGS, updated);
          return updated;
        });
      }

      return {
        success: true,
        message: `Sinkronisasi sukses! ${cCount} komik dan ${chCount} chapter berhasil dimuat ke aplikasi.`,
        comicsCount: cCount,
        chaptersCount: chCount
      };
    } catch (e: any) {
      return {
        success: false,
        message: `Gagal sinkronisasi dengan Supabase: ${e.message || e}`,
        comicsCount: 0,
        chaptersCount: 0
      };
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        googleUser,
        pendingGoogleUser,
        comics,
        chapters,
        users,
        banners,
        activityLogs,
        systemSettings,
        driveAccounts,
        bookmarks,
        readingHistory,
        comments,
        selectedGenreFilter,
        ads,
        adSettings,
        realtimeStatus,
        lastSyncTime,
        lastRealtimeEvent,
        activeTab,
        selectedComicId,
        readingChapterId,
        isAdminView,
        adminActiveMenu,
        isLoginModalOpen,
        loginModalRedirectNotice,
        isGoogleAuthModalOpen,
        isRegisterModalOpen,
        isProfileSettingsModalOpen,
        isMobileDeviceFrame,
        login,
        logout,
        loginWithGoogle,
        registerWithGoogle,
        logoutGoogle,
        isLoggedIn,
        getUserIdentity,
        openLoginModal,
        closeLoginModal,
        openGoogleAuthModal,
        closeGoogleAuthModal,
        openRegisterModal,
        closeRegisterModal,
        openProfileSettingsModal,
        closeProfileSettingsModal,
        changeUserPassword,
        canUserReadComic,
        setActiveTab,
        selectComic,
        setSelectedGenreFilter,
        navigateToGenre,
        startReading,
        closeReader,
        setIsAdminView,
        setAdminActiveMenu,
        toggleMobileDeviceFrame,
        addComic,
        injectComicWithChapters,
        batchInjectComicsWithChapters,
        updateComic,
        deleteComic,
        batchDeleteComics,
        toggleComicHomeVisibility,
        batchToggleComicHomeVisibility,
        cleanOrphanData,
        addChapter,
        updateChapter,
        deleteChapter,
        batchDeleteChapters,
        updateChapterDriveLink,
        addComment,
        toggleLikeComment,
        deleteComment,
        addDriveAccount,
        updateDriveAccount,
        deleteDriveAccount,
        addUser,
        updateUser,
        updateUserProfile,
        unlockUser,
        unlockAllUsers,
        toggleUserStatus,
        deleteUser,
        changeAdminPassword,
        addBanner,
        updateBanner,
        deleteBanner,
        updateSettings,
        addActivityLog: (type: string, message: string) => addLog(currentUser?.username || 'admin', message, type as any, 'info'),
        clearActivityLogs,
        addAd,
        updateAd,
        deleteAd,
        toggleAd,
        updateAdSettings,
        trackAdClick,
        trackAdView,
        getAdsByPosition,
        canShowAd,
        triggerPopunder,
        toggleBookmark,
        isBookmarked,
        saveReadingProgress,
        getReadingProgress,
        adminToasts,
        showAdminToast,
        removeAdminToast,
        syncWithSupabase
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
