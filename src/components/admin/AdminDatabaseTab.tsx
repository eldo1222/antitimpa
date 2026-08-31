import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Database, 
  ExternalLink, 
  Search, 
  RefreshCw, 
  Download, 
  Copy, 
  Check, 
  Layers, 
  BookOpen, 
  FileText, 
  Users, 
  HardDrive, 
  Image as ImageIcon, 
  Activity, 
  Settings, 
  ShieldCheck, 
  FileCode, 
  Eye, 
  X,
  Sparkles,
  Server,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Play,
  ArrowRight,
} from 'lucide-react';
import { 
  getSupabaseCredentials, 
  isSupabaseConfigured, 
  saveCustomSupabaseConfig, 
  clearCustomSupabaseConfig,
  getSupabaseClient,
  testSupabaseConnection,
  formatSupabaseUrl,
  formatSupabaseKey
} from '../../lib/supabase';
import { SupabaseService } from '../../services/supabaseService';
import { AdminDiagnosticModal } from './AdminDiagnosticModal';

type CollectionName = 'comics' | 'chapters' | 'users' | 'drive_accounts' | 'banners' | 'activity_logs' | 'system_settings';

export const AdminDatabaseTab: React.FC = () => {
  const { 
    comics, 
    chapters, 
    users, 
    driveAccounts, 
    banners, 
    activityLogs, 
    systemSettings,
    realtimeStatus,
    realtimeDiagnostic,
    reconnectRealtime,
    lastSyncTime,
    lastRealtimeEvent,
    showAdminToast,
    updateSettings,
    syncWithSupabase
  } = useApp();

  const [selectedCollection, setSelectedCollection] = useState<CollectionName>('comics');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedDocId, setCopiedDocId] = useState<string | null>(null);
  const [selectedDocJson, setSelectedDocJson] = useState<{ id: string; data: any } | null>(null);
  const [isDiagnosticModalOpen, setIsDiagnosticModalOpen] = useState(false);

  // Diagnostic State
  const [isCheckingDiagnostic, setIsCheckingDiagnostic] = useState(false);
  const [diagnosticConfig, setDiagnosticConfig] = useState<{
    endpointUrl: string;
    hasUrl: boolean;
    urlValue: string;
    hasAnonKey: boolean;
    anonKeyPreview: string;
    fetchedAt: string;
  } | null>(null);
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null);

  // Supabase State
  const [supabaseUrlInput, setSupabaseUrlInput] = useState('');
  const [supabaseKeyInput, setSupabaseKeyInput] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [isTestingPing, setIsTestingPing] = useState(false);
  const [pingStatus, setPingStatus] = useState<{ success: boolean; message: string; latency?: number } | null>(null);

  // Live Supabase Stats State
  const [isCheckingLiveStats, setIsCheckingLiveStats] = useState(false);
  const [liveDbStats, setLiveDbStats] = useState<{
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
  } | null>(null);
  const [isSyncingFromSupabase, setIsSyncingFromSupabase] = useState(false);
  
  // Migration State
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [migrationStatusText, setMigrationStatusText] = useState('');
  const [migrationResult, setMigrationResult] = useState<{ success: boolean; message: string; countComics: number; countChapters: number } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState<{ deletedChapters: number; deletedComments: number; deletedBanners: number } | null>(null);

  // Check live Supabase DB stats
  const checkLiveDbStats = async () => {
    setIsCheckingLiveStats(true);
    try {
      const stats = await SupabaseService.getSupabaseLiveStats();
      setLiveDbStats(stats);
    } catch (e: any) {
      setLiveDbStats({ isOnline: false, comicsCount: 0, chaptersCount: 0, usersCount: 0, bannersCount: 0, error: e.message || String(e) });
    } finally {
      setIsCheckingLiveStats(false);
    }
  };

  // Pull / Sync Data from Supabase to local app state
  const handleSyncFromSupabase = async () => {
    setIsSyncingFromSupabase(true);
    try {
      const res = await syncWithSupabase();
      if (res.success) {
        showAdminToast('Sinkronisasi Supabase Sukses', res.message, 'success');
        checkLiveDbStats();
      } else {
        showAdminToast('Sinkronisasi Gagal', res.message, 'error');
      }
    } catch (e: any) {
      showAdminToast('Sinkronisasi Gagal', e.message || String(e), 'error');
    } finally {
      setIsSyncingFromSupabase(false);
    }
  };

  // Run central /api/supabase-config diagnostic check
  const handleCheckDiagnostic = async () => {
    setIsCheckingDiagnostic(true);
    setDiagnosticError(null);
    try {
      const resp = await fetch('/api/supabase-config', { cache: 'no-store' });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: Gagal memuat /api/supabase-config`);
      }
      const data = await resp.json();
      const url = data.url || '';
      const anonKey = data.anonKey || '';
      const keyPreview = anonKey ? `${anonKey.slice(0, 10)}...${anonKey.slice(-6)}` : '(Kosong)';
      
      setDiagnosticConfig({
        endpointUrl: window.location.origin + '/api/supabase-config',
        hasUrl: Boolean(url),
        urlValue: url || '(Belum diset di Server ENV)',
        hasAnonKey: Boolean(anonKey),
        anonKeyPreview: keyPreview,
        fetchedAt: new Date().toLocaleTimeString('id-ID')
      });
      showAdminToast('Diagnostik Selesai', 'Respons /api/supabase-config berhasil diverifikasi.', 'success');
    } catch (err: any) {
      setDiagnosticError(err?.message || 'Gagal memanggil /api/supabase-config');
      showAdminToast('Diagnostik Gagal', err?.message || 'Error', 'error');
    } finally {
      setIsCheckingDiagnostic(false);
    }
  };

  // Run initial diagnostic on mount
  useEffect(() => {
    handleCheckDiagnostic();
  }, []);

  // Load Supabase credentials on mount and keep in sync with cloud settings
  useEffect(() => {
    const creds = getSupabaseCredentials();
    const activeUrl = creds.url || systemSettings?.supabaseUrl || '';
    const activeKey = creds.anonKey || systemSettings?.supabaseAnonKey || '';
    setSupabaseUrlInput(activeUrl);
    setSupabaseKeyInput(activeKey);
    const valid = Boolean(activeUrl && activeKey && activeUrl.startsWith('http'));
    setIsConfigured(valid);
    if (valid) {
      checkLiveDbStats();
    }
  }, [systemSettings?.supabaseUrl, systemSettings?.supabaseAnonKey]);

  const handleSaveSupabaseConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUrl = formatSupabaseUrl(supabaseUrlInput);
    const cleanKey = formatSupabaseKey(supabaseKeyInput);

    if (!cleanUrl || !cleanKey) {
      alert('Silakan masukkan Supabase Project URL dan Anon Key dengan benar.');
      return;
    }

    // 1. Simpan di local storage
    saveCustomSupabaseConfig(cleanUrl, cleanKey);
    setSupabaseUrlInput(cleanUrl);
    setSupabaseKeyInput(cleanKey);
    setIsConfigured(true);

    // 2. Simpan ke Firestore SystemSettings agar tersinkronisasi otomatis ke Vercel / semua perangkat
    updateSettings({
      supabaseUrl: cleanUrl,
      supabaseAnonKey: cleanKey
    });

    showAdminToast('Konfigurasi Disimpan', 'Kredensial Supabase berhasil disimpan dan disinkronkan ke cloud.', 'success');

    // 3. Test ping otomatis
    setIsTestingPing(true);
    const result = await testSupabaseConnection(cleanUrl, cleanKey);
    setIsTestingPing(false);
    setPingStatus(result);

    // 4. Fetch database jika sukses
    if (result.success) {
      SupabaseService.fetchFullDatabase().catch(() => {});
    }
  };

  const handleResetSupabaseConfig = () => {
    if (!window.confirm('Reset konfigurasi Supabase ke default environment?')) return;
    clearCustomSupabaseConfig();
    updateSettings({
      supabaseUrl: '',
      supabaseAnonKey: ''
    });
    setSupabaseUrlInput('');
    setSupabaseKeyInput('');
    setIsConfigured(false);
    setPingStatus(null);
    showAdminToast('Konfigurasi Direset', 'Kredensial Supabase telah dibersihkan.', 'info');
  };

  const handleTestPing = async () => {
    const cleanUrl = formatSupabaseUrl(supabaseUrlInput);
    const cleanKey = formatSupabaseKey(supabaseKeyInput);

    if (!cleanUrl || !cleanKey) {
      setPingStatus({
        success: false,
        message: 'Supabase URL atau Anon Key belum diisi. Silakan masukkan Project URL & Anon Key di formulir di bawah.'
      });
      return;
    }

    setIsTestingPing(true);
    setPingStatus(null);
    try {
      const result = await testSupabaseConnection(cleanUrl, cleanKey);
      setPingStatus(result);
      if (result.success) {
        saveCustomSupabaseConfig(cleanUrl, cleanKey);
        setIsConfigured(true);
      }
    } finally {
      setIsTestingPing(false);
    }
  };

  const handleStartMigration = async () => {
    if (!isConfigured) {
      alert('Silakan simpan konfigurasi Supabase (URL & Anon Key) terlebih dahulu sebelum memulai migrasi.');
      return;
    }

    const totalComics = comics.length;
    const allChapters = Object.values(chapters).flat();
    const totalChapters = allChapters.length;

    const confirmMsg = `Mulai migrasi ${totalComics} komik dan ${totalChapters} chapter ke SQL Database Supabase?\n\nSetelah migrasi, server database Anda akan menggunakan SQL PostgreSQL dengan kemampuan UNLIMITED READS (tidak akan terkena limit token harian).`;
    if (!window.confirm(confirmMsg)) return;

    setIsMigrating(true);
    setMigrationProgress(5);
    setMigrationStatusText('Mempersiapkan dataset komik & chapter...');
    setMigrationResult(null);

    try {
      const result = await SupabaseService.migrateAllToSupabase({
        comics,
        chapters,
        users,
        banners,
        driveAccounts,
        activityLogs,
        systemSettings
      }, (msg, percent) => {
        setMigrationStatusText(msg);
        setMigrationProgress(percent);
      });

      setMigrationResult(result);
      if (result.success) {
        showAdminToast('Migrasi Supabase Berhasil', `${result.countComics} komik & ${result.countChapters} chapter berhasil dimigrasikan ke SQL Supabase!`, 'success');
      } else {
        showAdminToast('Migrasi Gagal', result.message, 'error');
      }
    } catch (e: any) {
      setMigrationResult({
        success: false,
        message: `Terjadi kendala saat migrasi: ${e.message || e}`,
        countComics: 0,
        countChapters: 0
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleCopySqlSchema = () => {
    const fullSql = `-- ==============================================================================
-- ANTITIMPA - SUPABASE (POSTGRESQL) SCHEMA
-- ==============================================================================
-- Petunjuk:
-- 1. Buka Supabase Dashboard (https://app.supabase.com) -> Masuk ke Project Anda.
-- 2. Buka menu "SQL Editor" di bilah kiri.
-- 3. Paste seluruh kode SQL di bawah ini dan klik tombol "Run" (ikon play hijau).
-- 4. Semua tabel, kolom, index, dan izin RLS akan otomatis terbuat!
-- ==============================================================================

-- 1. TABEL COMICS (Daftar Judul Komik)
CREATE TABLE IF NOT EXISTS public.comics (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    cover_image TEXT,
    banner_image TEXT,
    synopsis TEXT,
    genres JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'ongoing',
    comic_type TEXT DEFAULT 'manga',
    content_type TEXT DEFAULT 'normal',
    story_writer TEXT DEFAULT '',
    artist TEXT DEFAULT '',
    rating NUMERIC(4, 2) DEFAULT 0.00,
    rating_count INT DEFAULT 0,
    total_chapters INT DEFAULT 0,
    total_readers INT DEFAULT 0,
    is_free BOOLEAN DEFAULT TRUE,
    is_vip BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_slider BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT TRUE,
    is_visible_on_home BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    source_api TEXT DEFAULT 'manual'
);

CREATE INDEX IF NOT EXISTS idx_comics_slug ON public.comics(slug);
CREATE INDEX IF NOT EXISTS idx_comics_status ON public.comics(status);
CREATE INDEX IF NOT EXISTS idx_comics_content_type ON public.comics(content_type);
CREATE INDEX IF NOT EXISTS idx_comics_updated_at ON public.comics(updated_at DESC);

-- 2. TABEL CHAPTERS (Daftar Chapter / Bab)
CREATE TABLE IF NOT EXISTS public.chapters (
    id TEXT PRIMARY KEY,
    comic_id TEXT NOT NULL,
    chapter_number NUMERIC(8, 2) NOT NULL,
    title TEXT NOT NULL,
    slug TEXT,
    release_date TEXT,
    price INT DEFAULT 0,
    is_free BOOLEAN DEFAULT TRUE,
    is_locked BOOLEAN DEFAULT FALSE,
    is_vip BOOLEAN DEFAULT FALSE,
    source_type TEXT DEFAULT 'pages',
    pages JSONB DEFAULT '[]'::jsonb,
    drive_file_id TEXT,
    drive_embed_url TEXT,
    drive_account_id TEXT,
    views_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chapters_comic_id ON public.chapters(comic_id);
CREATE INDEX IF NOT EXISTS idx_chapters_number ON public.chapters(chapter_number ASC);
CREATE INDEX IF NOT EXISTS idx_chapters_comic_number ON public.chapters(comic_id, chapter_number DESC);

-- 3. TABEL USERS (Akun Admin & Pembaca)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT,
    password_hash TEXT,
    role TEXT DEFAULT 'user',
    package_type TEXT DEFAULT 'free',
    package_expiry TIMESTAMPTZ,
    coins INT DEFAULT 0,
    avatar TEXT,
    bookmarks JSONB DEFAULT '[]'::jsonb,
    history JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

-- 4. TABEL BANNERS
CREATE TABLE IF NOT EXISTS public.banners (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT DEFAULT 'Komik Populer Terupdate',
    image_url TEXT NOT NULL,
    target_url TEXT,
    target_type TEXT DEFAULT 'comic',
    comic_id TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    order_index INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABEL DRIVE_ACCOUNTS
CREATE TABLE IF NOT EXISTS public.drive_accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    folder_url TEXT,
    status TEXT DEFAULT 'active',
    notes TEXT,
    storage_used_gb NUMERIC(6, 2) DEFAULT 0,
    storage_total_gb NUMERIC(6, 2) DEFAULT 15,
    color_tag TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABEL ACTIVITY_LOGS
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id TEXT PRIMARY KEY,
    username TEXT DEFAULT 'System',
    action TEXT NOT NULL,
    type TEXT DEFAULT 'system',
    status TEXT DEFAULT 'info',
    details TEXT,
    ip_address TEXT DEFAULT '127.0.0.1',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABEL COMMENTS
CREATE TABLE IF NOT EXISTS public.comments (
    id TEXT PRIMARY KEY,
    comic_id TEXT NOT NULL,
    chapter_id TEXT,
    chapter_number NUMERIC(8, 2),
    user_id TEXT,
    username TEXT DEFAULT 'Pembaca',
    user_avatar TEXT,
    user_role TEXT,
    user_email TEXT,
    content TEXT NOT NULL,
    likes_count INT DEFAULT 0,
    spoiler BOOLEAN DEFAULT FALSE,
    reply_to_id TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    is_vip BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABEL ADS (Iklan Banner, Mitra & Direct Link)
CREATE TABLE IF NOT EXISTS public.ads (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'banner',
    position TEXT DEFAULT 'home_hero_bottom',
    is_active BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    target_url TEXT,
    alt_text TEXT,
    badge_label TEXT,
    sponsor_name TEXT,
    headline TEXT,
    description TEXT,
    cta_text TEXT,
    html_code TEXT,
    script_code TEXT,
    popunder_url TEXT,
    frequency_hours INT DEFAULT 1,
    show_for_vip BOOLEAN DEFAULT FALSE,
    max_clicks_per_day INT,
    click_count INT DEFAULT 0,
    view_count INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABEL AD_SETTINGS (Pengaturan Iklan Global)
CREATE TABLE IF NOT EXISTS public.ad_settings (
    id TEXT PRIMARY KEY DEFAULT 'global_ad_config',
    ads_enabled BOOLEAN DEFAULT TRUE,
    hide_ads_for_vip BOOLEAN DEFAULT TRUE,
    popunder_enabled BOOLEAN DEFAULT TRUE,
    popunder_cooldown_minutes INT DEFAULT 15,
    popunder_cooldown_hours INT DEFAULT 1,
    welcome_popup_enabled BOOLEAN DEFAULT FALSE,
    mitra_interstitial_enabled BOOLEAN DEFAULT TRUE,
    dual_chapter_ads_enabled BOOLEAN DEFAULT TRUE,
    floating_bottom_enabled BOOLEAN DEFAULT TRUE,
    show_ad_label BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TABEL SYSTEM_SETTINGS (Pengaturan Identitas & Fitur)
CREATE TABLE IF NOT EXISTS public.system_settings (
    id TEXT PRIMARY KEY DEFAULT 'global_config',
    site_name TEXT DEFAULT 'AntiTimpa',
    site_tagline TEXT,
    site_description TEXT,
    site_logo TEXT,
    site_favicon TEXT,
    announcement TEXT,
    enable_comments BOOLEAN DEFAULT TRUE,
    enable_18plus BOOLEAN DEFAULT TRUE,
    maintenance_mode BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kebijakan Row Level Security (RLS) - Public Read & Write
ALTER TABLE public.comics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Public Full Access Comics" ON public.comics;
DROP POLICY IF EXISTS "Allow public read comics" ON public.comics;
DROP POLICY IF EXISTS "Allow anon insert comics" ON public.comics;
DROP POLICY IF EXISTS "Allow public all comics" ON public.comics;
CREATE POLICY "Public Full Access Comics" ON public.comics FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access Chapters" ON public.chapters;
DROP POLICY IF EXISTS "Allow public read chapters" ON public.chapters;
DROP POLICY IF EXISTS "Allow anon insert chapters" ON public.chapters;
DROP POLICY IF EXISTS "Allow public all chapters" ON public.chapters;
CREATE POLICY "Public Full Access Chapters" ON public.chapters FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access Users" ON public.users;
DROP POLICY IF EXISTS "Allow public read users" ON public.users;
DROP POLICY IF EXISTS "Allow anon insert users" ON public.users;
DROP POLICY IF EXISTS "Allow public all users" ON public.users;
CREATE POLICY "Public Full Access Users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access Banners" ON public.banners;
DROP POLICY IF EXISTS "Allow public read banners" ON public.banners;
DROP POLICY IF EXISTS "Allow anon insert banners" ON public.banners;
DROP POLICY IF EXISTS "Allow public all banners" ON public.banners;
CREATE POLICY "Public Full Access Banners" ON public.banners FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access Drive Accounts" ON public.drive_accounts;
DROP POLICY IF EXISTS "Allow public read drive_accounts" ON public.drive_accounts;
DROP POLICY IF EXISTS "Allow anon insert drive_accounts" ON public.drive_accounts;
DROP POLICY IF EXISTS "Allow public all drive_accounts" ON public.drive_accounts;
CREATE POLICY "Public Full Access Drive Accounts" ON public.drive_accounts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access Activity Logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Allow public read activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Allow anon insert activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Allow public all activity_logs" ON public.activity_logs;
CREATE POLICY "Public Full Access Activity Logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access Comments" ON public.comments;
DROP POLICY IF EXISTS "Allow public read comments" ON public.comments;
DROP POLICY IF EXISTS "Allow anon insert comments" ON public.comments;
DROP POLICY IF EXISTS "Allow public all comments" ON public.comments;
CREATE POLICY "Public Full Access Comments" ON public.comments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access Ads" ON public.ads;
DROP POLICY IF EXISTS "Allow public read ads" ON public.ads;
DROP POLICY IF EXISTS "Allow anon insert ads" ON public.ads;
DROP POLICY IF EXISTS "Allow public all ads" ON public.ads;
CREATE POLICY "Public Full Access Ads" ON public.ads FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access Ad Settings" ON public.ad_settings;
DROP POLICY IF EXISTS "Allow public read ad_settings" ON public.ad_settings;
DROP POLICY IF EXISTS "Allow anon insert ad_settings" ON public.ad_settings;
DROP POLICY IF EXISTS "Allow public all ad_settings" ON public.ad_settings;
CREATE POLICY "Public Full Access Ad Settings" ON public.ad_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access System Settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow public read system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow anon insert system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow public all system_settings" ON public.system_settings;
CREATE POLICY "Public Full Access System Settings" ON public.system_settings FOR ALL USING (true) WITH CHECK (true);

-- Realtime Publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.comics;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chapters;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.banners;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.system_settings;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ads;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.drive_accounts;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;`;

    navigator.clipboard?.writeText(fullSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
    showAdminToast('SQL Schema Tersalin', 'Silakan tempel (paste) ke SQL Editor di Supabase Console.', 'success');
  };

  // Flatten all chapters into an array for viewing
  const allChaptersList = Object.entries(chapters).flatMap(([comicId, chList]) => 
    Array.isArray(chList) ? chList.map((ch: any) => ({ ...ch, parentComicId: comicId })) : []
  );

  const getCollectionData = (col: CollectionName): { id: string; [key: string]: any }[] => {
    switch (col) {
      case 'comics':
        return comics;
      case 'chapters':
        return allChaptersList;
      case 'users':
        return users;
      case 'drive_accounts':
        return driveAccounts;
      case 'banners':
        return banners;
      case 'activity_logs':
        return activityLogs;
      case 'system_settings':
        return [{ id: 'config_global', ...systemSettings }];
      default:
        return [];
    }
  };

  const rawData = getCollectionData(selectedCollection);

  // Filter based on search query
  const filteredData = rawData.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const asString = JSON.stringify(item).toLowerCase();
    return asString.includes(q);
  });

  const collectionsMeta: { id: CollectionName; label: string; icon: React.ComponentType<{ className?: string }>; count: number; desc: string }[] = [
    { id: 'comics', label: 'public.comics', icon: BookOpen, count: comics.length, desc: 'Metadata komik, genre, rating, status' },
    { id: 'chapters', label: 'public.chapters', icon: FileText, count: allChaptersList.length, desc: 'Daftar bab, halaman gambar & link storage' },
    { id: 'users', label: 'public.users', icon: Users, count: users.length, desc: 'Akun admin & pembaca, paket 15k/5k' },
    { id: 'drive_accounts', label: 'public.drive_accounts', icon: HardDrive, count: driveAccounts.length, desc: 'Akun multi Google Drive penyimpanan komik' },
    { id: 'banners', label: 'public.banners', icon: ImageIcon, count: banners.length, desc: 'Banner promo carousel antarmuka depan' },
    { id: 'activity_logs', label: 'public.activity_logs', icon: Activity, count: activityLogs.length, desc: 'Audit log login, update & keamanan sistem' },
    { id: 'system_settings', label: 'public.system_settings', icon: Settings, count: 1, desc: 'Konfigurasi identitas platform & security' }
  ];

  const handleCopyJson = (docId: string, data: any) => {
    navigator.clipboard?.writeText(JSON.stringify(data, null, 2));
    setCopiedDocId(docId);
    setTimeout(() => setCopiedDocId(null), 2000);
  };

  const handleExportCollectionJson = () => {
    const jsonStr = JSON.stringify(rawData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supabase_${selectedCollection}_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl animate-in fade-in pb-12">
      {/* Top Header Card */}
      <div className="p-5 bg-gradient-to-r from-[#12121c] via-[#151524] to-[#12121c] rounded-2xl border border-[#27273c] shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">Supabase PostgreSQL Hub</h2>
                {isConfigured ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Supabase SQL Single Source of Truth
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    Menunggu Konfigurasi Supabase
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Pusat integrasi tunggal database PostgreSQL Supabase untuk menampung ribuan komik & chapter dengan performa tinggi dan Realtime Sync.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              onClick={() => setIsDiagnosticModalOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 hover:border-amber-500/70 text-amber-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-amber-500/10"
            >
              <Activity className="w-4 h-4 text-amber-400" />
              <span>Jalankan Diagnostik (1-Item Write Test)</span>
            </button>
          </div>
        </div>

        {/* Status Highlights Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 border-t border-[#1f1f30] text-xs">
          <div className="p-2.5 bg-[#171724] rounded-xl border border-[#242436]">
            <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Total Judul Komik</span>
            <span className="font-mono text-emerald-400 font-extrabold text-sm">{comics.length} Komik</span>
          </div>
          <div className="p-2.5 bg-[#171724] rounded-xl border border-[#242436]">
            <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Total Chapter</span>
            <span className="font-mono text-cyan-400 font-extrabold text-sm">{allChaptersList.length} Bab</span>
          </div>
          <div className="p-2.5 bg-[#171724] rounded-xl border border-[#242436]">
            <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Total Akun Pembaca</span>
            <span className="font-mono text-amber-300 font-extrabold text-sm">{users.length} Akun</span>
          </div>
          <div className="p-2.5 bg-[#171724] rounded-xl border border-[#242436]">
            <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Supabase Realtime</span>
            <span className={`font-mono font-extrabold text-xs truncate flex items-center gap-1.5 mt-0.5 ${
              realtimeStatus === 'connected' ? 'text-emerald-400' :
              realtimeStatus === 'connecting' ? 'text-amber-400' : 'text-slate-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                realtimeStatus === 'connected' ? 'bg-emerald-400 animate-pulse' :
                realtimeStatus === 'connecting' ? 'bg-amber-400 animate-ping' : 'bg-slate-500'
              }`} />
              {realtimeStatus === 'connected' ? 'Aktif (Live Sync)' :
               realtimeStatus === 'connecting' ? 'Menghubungkan...' : 'Offline'}
            </span>
          </div>
          <div className="p-2.5 bg-[#171724] rounded-xl border border-[#242436]">
            <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Terakhir Sinkron</span>
            <span className="font-mono text-slate-300 font-extrabold text-xs truncate block mt-0.5">
              {lastSyncTime || 'Baru saja'}
            </span>
          </div>
        </div>
      </div>

      {/* SUPABASE SQL HUB */}
      <div className="space-y-6 animate-in fade-in">
          {/* DATABASE SYNC & ARCHITECTURE DIAGNOSTIC */}
          <div className="p-5 bg-[#0f111a] border border-[#2b2b45] rounded-2xl shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1f2035] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <span>DATABASE SYNC DIAGNOSTIC &amp; INTEGRITY</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Single Source of Truth
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Memastikan seluruh device (Admin, User A, User B) terkoneksi ke satu database PostgreSQL Supabase yang identik.
                  </p>
                </div>
              </div>
              <button
                onClick={handleCheckDiagnostic}
                disabled={isCheckingDiagnostic}
                className="px-3.5 py-1.5 rounded-xl bg-[#1c1d2e] hover:bg-[#25273d] text-indigo-300 border border-indigo-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingDiagnostic ? 'animate-spin text-indigo-400' : 'text-indigo-400'}`} />
                <span>{isCheckingDiagnostic ? 'Memeriksa...' : 'Periksa Respons /api/supabase-config'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* Endpoint Config Card */}
              <div className="p-3.5 bg-[#151726] rounded-xl border border-[#262842] space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
                  <span className="flex items-center gap-1 text-indigo-300">
                    <Server className="w-3.5 h-3.5" /> 1. Server Central Endpoint
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">{diagnosticConfig?.fetchedAt || '-'}</span>
                </div>
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="text-slate-400 text-[10px]">URL: <span className="text-white truncate block">{diagnosticConfig?.urlValue || '(Memuat...)'}</span></div>
                  <div className="text-slate-400 text-[10px]">Anon Key: <span className="text-emerald-400 block">{diagnosticConfig?.anonKeyPreview || '(Memuat...)'}</span></div>
                </div>
                <div className="text-[10px] text-slate-400 pt-1 border-t border-[#202238]">
                  {diagnosticConfig?.hasUrl ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Server ENV Terpasang Identik
                    </span>
                  ) : (
                    <span className="text-amber-400 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Menggunakan Fallback Konfigurasi
                    </span>
                  )}
                </div>
              </div>

              {/* Realtime Subscription Status */}
              <div className="p-3.5 bg-[#151726] rounded-xl border border-[#262842] space-y-2.5 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
                    <span className="flex items-center gap-1 text-emerald-300">
                      <Zap className="w-3.5 h-3.5" /> 2. Supabase Realtime Channel
                    </span>
                    <button
                      onClick={() => reconnectRealtime()}
                      title="Hubungkan Ulang Realtime Channel"
                      className="px-2 py-0.5 rounded bg-[#1f2138] hover:bg-[#2c2f4f] text-emerald-300 border border-emerald-500/30 text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Reconnect
                    </button>
                  </div>
                  
                  {/* Status Indicator: Only CONNECTED if strictly SUBSCRIBED */}
                  <div className="flex items-center justify-between bg-[#0e101a] p-2 rounded-lg border border-[#1e2033]">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        realtimeDiagnostic?.lifecycleStatus === 'SUBSCRIBED' 
                          ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]' 
                          : realtimeDiagnostic?.lifecycleStatus === 'CONNECTING' 
                            ? 'bg-amber-400 animate-ping' 
                            : 'bg-rose-500'
                      }`} />
                      <div className="flex flex-col">
                        <span className="font-extrabold text-[11px] tracking-wide text-white uppercase">
                          {realtimeDiagnostic?.lifecycleStatus === 'SUBSCRIBED' ? 'CONNECTED' : realtimeDiagnostic?.lifecycleStatus || realtimeStatus}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {realtimeDiagnostic?.lifecycleStatus === 'SUBSCRIBED' ? 'Socket live & listening' : `Lifecycle: ${realtimeDiagnostic?.lifecycleStatus || 'DISCONNECTED'}`}
                        </span>
                      </div>
                    </div>
                    {realtimeDiagnostic?.retryCount > 0 && realtimeDiagnostic?.lifecycleStatus !== 'SUBSCRIBED' && (
                      <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 text-[9px] font-mono rounded">
                        Retry #{realtimeDiagnostic.retryCount}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 font-mono text-[10px] text-slate-300 bg-[#0e101a] p-2 rounded-lg border border-[#1e2033]">
                    <div>
                      <span className="text-slate-500">Channel:</span>{' '}
                      <span className="text-indigo-300 truncate inline-block max-w-[180px] align-bottom">
                        {realtimeDiagnostic?.channelName || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Tables:</span>{' '}
                      <span className="text-emerald-300">
                        {realtimeDiagnostic?.subscribedTables?.slice(0, 4).join(', ') || 'comics, chapters, users, banners'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-[#1e2033] text-[9px]">
                      <span className="text-slate-500">Attempt / Subscribed:</span>
                      <span className="text-slate-300 font-sans font-medium">
                        {realtimeDiagnostic?.lastSuccessfulSubscription ? `OK @ ${realtimeDiagnostic.lastSuccessfulSubscription}` : realtimeDiagnostic?.lastConnectionAttempt ? `Coba @ ${realtimeDiagnostic.lastConnectionAttempt}` : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 pt-1.5 border-t border-[#202238] space-y-1">
                  <div className="truncate">
                    Event Terakhir:{' '}
                    <span className="text-slate-200 font-mono font-bold">
                      {lastRealtimeEvent 
                        ? `${lastRealtimeEvent.table} (${lastRealtimeEvent.type}) @ ${lastRealtimeEvent.time}` 
                        : 'Menunggu stream event...'}
                    </span>
                  </div>
                  {realtimeDiagnostic?.lastError && (
                    <div className="text-rose-400 text-[9px] truncate" title={realtimeDiagnostic.lastError}>
                      Err: {realtimeDiagnostic.lastError}
                    </div>
                  )}
                </div>
              </div>

              {/* Architecture Cutoff Status */}
              <div className="p-3.5 bg-[#151726] rounded-xl border border-[#262842] space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
                  <span className="flex items-center gap-1 text-cyan-300">
                    <ShieldCheck className="w-3.5 h-3.5" /> 3. Dual-Write Cutoff Status
                  </span>
                </div>
                <div className="space-y-1 text-[11px]">
                  <div className="flex items-center gap-1 text-emerald-400 font-bold text-[10px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Local API db.json write DITIADAKAN
                  </div>
                  <div className="text-[10px] text-slate-300 leading-tight">
                    Seluruh operasi komik, bab, banner, dan user murni diarahkan ke <strong>Supabase PostgreSQL</strong> dengan error rollback jika gagal.
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 pt-1 border-t border-[#202238] flex items-center justify-between">
                  <span>Sinkron Snapshot:</span>
                  <span className="font-mono text-slate-200 font-bold">{lastSyncTime || 'Baru saja'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Migration Banner & Quick Info */}
          <div className="p-5 bg-gradient-to-r from-emerald-950/40 via-[#121b19] to-[#101918] border border-emerald-500/30 rounded-2xl shadow-lg relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-black text-[10px] uppercase tracking-wider">
                    Solusi Quota Read Token
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    Migrasi Bebas Limit ke Supabase PostgreSQL SQL
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Firestore gratis membatasi 50.000 read per hari (langsung habis jika melihat 2.000 komik & 20.000 chapter). Dengan <strong>Supabase SQL</strong>, seluruh data disimpan di PostgreSQL tanpa limit token read harian!
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-emerald-300">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Unlimited Reads
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 500 MB Free Tier Database
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Multi-Device Instant Sync
                  </span>
                </div>
              </div>

              {/* Action Buttons: Migrate & Pull/Sync */}
              <div className="shrink-0 flex flex-col sm:flex-row items-stretch gap-2.5">
                <button
                  onClick={handleSyncFromSupabase}
                  disabled={isSyncingFromSupabase || isMigrating || !isConfigured}
                  className="px-4 py-3 rounded-xl bg-[#1b2b27] hover:bg-[#233833] text-emerald-300 border border-emerald-500/40 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
                  title="Tarik seluruh data dari PostgreSQL Supabase ke aplikasi ini"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingFromSupabase ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
                  <span>{isSyncingFromSupabase ? 'Menyinkronkan...' : '⚡ Tarik / Sinkronkan dari Supabase'}</span>
                </button>

                <button
                  onClick={handleStartMigration}
                  disabled={isMigrating || isSyncingFromSupabase}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition-all hover:scale-102 disabled:opacity-50"
                >
                  <Play className={`w-4 h-4 fill-current ${isMigrating ? 'animate-spin' : ''}`} />
                  <span>{isMigrating ? 'Sedang Migrasi...' : '1-Click Migrasi Seluruh Data ke Supabase'}</span>
                </button>
              </div>
            </div>

            {/* Live Database Real-time Comparison Box */}
            <div className="mt-4 pt-3 border-t border-emerald-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-slate-400 font-medium">Status PostgreSQL Supabase:</span>
                {isCheckingLiveStats ? (
                  <span className="text-emerald-400 font-mono flex items-center gap-1.5 animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Memeriksa status tabel...
                  </span>
                ) : liveDbStats?.isOnline ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold font-mono text-[11px] border border-emerald-500/30">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      Live: {liveDbStats.comicsCount} Komik | {liveDbStats.chaptersCount} Chapter | {liveDbStats.usersCount} User | {liveDbStats.bannersCount} Banner
                    </span>
                    {liveDbStats.missingTables && liveDbStats.missingTables.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium text-[11px] border border-amber-500/30">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        {liveDbStats.missingTables.length} Tabel Belum Dibuat
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-amber-400 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {liveDbStats?.error || 'Belum terhubung ke Supabase'}
                  </span>
                )}
              </div>

              <button
                onClick={checkLiveDbStats}
                disabled={isCheckingLiveStats}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 underline"
              >
                <RefreshCw className={`w-3 h-3 ${isCheckingLiveStats ? 'animate-spin' : ''}`} />
                <span>Cek Ulang Jumlah Data di Supabase</span>
              </button>
            </div>

            {/* Missing Tables Notice Banner if any */}
            {liveDbStats?.missingTables && liveDbStats.missingTables.length > 0 && (
              <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">Tabel Database Belum Lengkap di Supabase:</span>
                    <span className="text-amber-300 font-mono text-[11px]">
                      {liveDbStats.missingTables.join(', ')}
                    </span>
                    <p className="text-[11px] text-slate-300 mt-1">
                      Salin SQL Schema di bawah dan jalankan di SQL Editor Supabase Dashboard untuk mengaktifkan seluruh fitur secara penuh.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCopySqlSchema}
                  className="shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedSql ? '✓ Tersalin!' : 'Salin SQL Schema'}</span>
                </button>
              </div>
            )}

            {/* Migration Progress Bar */}
            {isMigrating && (
              <div className="mt-5 p-4 bg-[#0a1412] border border-emerald-500/40 rounded-xl space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    {migrationStatusText}
                  </span>
                  <span>{migrationProgress}%</span>
                </div>
                <div className="w-full bg-[#172622] rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${migrationProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Migration Result Banner */}
            {migrationResult && (
              <div className={`mt-5 p-4 rounded-xl border text-xs flex items-start justify-between gap-3 animate-in fade-in ${
                migrationResult.success 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' 
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              }`}>
                <div className="flex items-start gap-2.5">
                  {migrationResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="font-bold text-sm text-white">
                      {migrationResult.success ? 'Migrasi Selesai dengan Sukses!' : 'Migrasi Gagal'}
                    </h4>
                    <p className="mt-0.5 leading-relaxed">{migrationResult.message}</p>
                    {migrationResult.success && (
                      <div className="mt-2 flex gap-4 font-mono font-bold text-xs text-emerald-400">
                        <span>📚 {migrationResult.countComics} Komik Tersimpan</span>
                        <span>📑 {migrationResult.countChapters} Chapter Tersimpan</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setMigrationResult(null)}
                  className="text-slate-400 hover:text-white font-bold p-1"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Credentials & Connection Test Box */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 p-5 bg-[#12121c] border border-[#242436] rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#1f1f30] pb-3">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-black text-sm text-white">Konfigurasi Kredensial Supabase</h3>
                </div>
                <button
                  onClick={handleResetSupabaseConfig}
                  className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors"
                >
                  Reset Default
                </button>
              </div>

              <form onSubmit={handleSaveSupabaseConfig} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="url"
                    value={supabaseUrlInput}
                    onChange={(e) => setSupabaseUrlInput(e.target.value)}
                    placeholder="https://xyzabcdefghijklmnop.supabase.co"
                    className="w-full bg-[#181826] border border-[#2b2b3f] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                    required
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Didapat dari Supabase Dashboard &gt; Project Settings &gt; API &gt; Project URL
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Supabase Anon / Public API Key
                  </label>
                  <input
                    type="password"
                    value={supabaseKeyInput}
                    onChange={(e) => setSupabaseKeyInput(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full bg-[#181826] border border-[#2b2b3f] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                    required
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Didapat dari Supabase Dashboard &gt; Project Settings &gt; API &gt; anon public key
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Simpan Kredensial</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestPing}
                    disabled={isTestingPing || !supabaseUrlInput}
                    className="px-4 py-2 bg-[#222234] hover:bg-[#2c2c44] text-slate-200 font-bold text-xs rounded-xl border border-[#33334d] transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingPing ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
                    <span>{isTestingPing ? 'Menguji...' : 'Test Ping Koneksi'}</span>
                  </button>
                </div>
              </form>

              {/* Ping Result Banner */}
              {pingStatus && (
                <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
                  pingStatus.success 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}>
                  {pingStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold block text-white">
                      {pingStatus.success ? 'Koneksi Berhasil' : 'Koneksi Bermasalah'}
                      {pingStatus.latency ? ` (${pingStatus.latency}ms)` : ''}
                    </span>
                    <span className="text-[11px] leading-relaxed block mt-0.5">
                      {pingStatus.message}
                    </span>
                  </div>
                </div>
              )}

              {/* Vercel & Production Tip */}
              <div className="p-3 bg-[#181826] border border-[#2b2b3f] rounded-xl text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-300 text-xs">
                  <span>🚀 Info Sinkronisasi Vercel & Hosting</span>
                </div>
                <p className="leading-relaxed">
                  Setelah Anda mengklik <strong>"Simpan Kredensial"</strong>, konfigurasi Supabase otomatis tersimpan ke Cloud Firestore sehingga web yang sudah di-deploy ke <strong>Vercel</strong> langsung terhubung ke database Supabase tanpa harus build ulang.
                </p>
                <p className="text-[10px] text-slate-500 pt-0.5">
                  Opsional: Anda juga dapat memasukkan <code className="text-emerald-400 font-mono">VITE_SUPABASE_URL</code> dan <code className="text-emerald-400 font-mono">VITE_SUPABASE_ANON_KEY</code> di menu <em>Vercel &gt; Settings &gt; Environment Variables</em>.
                </p>
              </div>
            </div>

            {/* SQL Schema Step Assistant Box */}
            <div className="lg:col-span-5 p-5 bg-[#12121c] border border-[#242436] rounded-2xl space-y-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#1f1f30] pb-3">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-cyan-400" />
                    <h3 className="font-black text-sm text-white">Langkah 1: Setup SQL Schema</h3>
                  </div>
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
                  >
                    <span>Buka Supabase</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                  Sebelum melakukan migrasi data, jalankan skrip SQL untuk membuat seluruh tabel (comics, chapters, users, banners) di Supabase SQL Editor:
                </p>

                <ol className="text-xs text-slate-400 space-y-2 mt-3 list-decimal list-inside">
                  <li>Buka <strong>Supabase Dashboard &gt; SQL Editor</strong>.</li>
                  <li>Klik tombol hijau <strong>"Salin SQL Schema"</strong> di bawah.</li>
                  <li>Tempelkan (paste) kode ke dalam editor lalu klik <strong>"Run"</strong>.</li>
                  <li>Setelah sukses, kembali ke sini &amp; klik <strong>"1-Click Migrasi"</strong>!</li>
                </ol>
              </div>

              <div className="pt-2 border-t border-[#1f1f30] flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleCopySqlSchema}
                  className="flex-1 px-3.5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>SQL Schema Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Salin SQL Schema (supabase_schema.sql)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Collection & Table Explorer (Supabase PostgreSQL / Cloud Data) */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Pilih Koleksi / Tabel Database (Supabase PostgreSQL)</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Pilih tabel untuk melihat data baris JSON aktif
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {collectionsMeta.map(col => {
                const Icon = col.icon;
                const isSelected = selectedCollection === col.id;
                return (
                  <button
                    key={col.id}
                    onClick={() => {
                      setSelectedCollection(col.id);
                      setSearchQuery('');
                    }}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      isSelected 
                        ? 'bg-[#12241f] border-emerald-500 shadow-md shadow-emerald-500/15 scale-102' 
                        : 'bg-[#12121a] hover:bg-[#181824] border-[#222232] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-emerald-600 text-white' : 'bg-[#1a1a26] text-slate-400'}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className={`text-xs font-black font-mono ${isSelected ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {col.count}
                      </span>
                    </div>
                    <div>
                      <span className={`text-xs font-bold block truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                        /{col.label}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate block mt-0.5">
                        {col.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Documents Table & Viewer */}
            <div className="p-5 bg-[#12121a] rounded-2xl border border-[#222232] space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-black text-sm text-white">
                    Daftar Dokumen /{selectedCollection} ({filteredData.length} Dokumen)
                  </h3>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={`Cari di /${selectedCollection}...`}
                      className="w-full bg-[#181824] border border-[#28283a] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <button
                    onClick={handleExportCollectionJson}
                    className="px-3 py-1.5 bg-[#202030] hover:bg-[#2b2b40] text-slate-200 text-xs font-semibold rounded-xl border border-[#2e2e42] flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Download JSON</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[500px] overflow-y-auto rounded-xl border border-[#1f1f2e]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#181824] text-slate-400 text-[11px] uppercase tracking-wider sticky top-0 z-10 border-b border-[#242438]">
                    <tr>
                      <th className="py-2.5 px-3">Document ID</th>
                      <th className="py-2.5 px-3">Ringkasan Data</th>
                      <th className="py-2.5 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1b1b28] text-slate-300">
                    {filteredData.length > 0 ? (
                      filteredData.map((doc, idx) => {
                        const docId = doc.id || `doc-${idx}`;
                        let previewTitle = doc.title || doc.username || doc.email || doc.name || doc.siteName || docId;
                        return (
                          <tr key={docId} className="hover:bg-[#171724] transition-colors">
                            <td className="py-2.5 px-3 font-bold text-emerald-400 truncate max-w-[200px]">
                              {docId}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 truncate max-w-[350px]">
                              <span className="text-white font-semibold mr-2">{previewTitle}</span>
                              <span className="text-slate-500 text-[11px]">
                                {JSON.stringify(doc).substring(0, 80)}...
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                onClick={() => setSelectedDocJson({ id: docId, data: doc })}
                                className="px-2.5 py-1 bg-[#222234] hover:bg-[#2f2f48] text-slate-200 rounded-lg text-[11px] font-sans font-bold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3 h-3 text-emerald-400" />
                                <span>Lihat JSON</span>
                              </button>
                              <button
                                onClick={() => handleCopyJson(docId, doc)}
                                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
                                title="Salin JSON"
                              >
                                {copiedDocId === docId ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-slate-500 font-sans">
                          Tidak ada dokumen yang cocok dengan filter pencarian di /{selectedCollection}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

      {/* JSON Viewer Modal */}
      {selectedDocJson && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-2xl bg-[#101018] border border-[#28283c] rounded-2xl p-5 text-slate-200 space-y-3 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-[#1f1f2e] shrink-0">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-[#ff5b14]" />
                <span className="font-mono font-bold text-xs text-white">
                  /{selectedCollection}/{selectedDocJson.id}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyJson(selectedDocJson.id, selectedDocJson.data)}
                  className="px-2.5 py-1 bg-[#1c1c2b] hover:bg-[#28283d] text-xs font-semibold rounded-lg text-slate-300 flex items-center gap-1 transition-colors"
                >
                  {copiedDocId === selectedDocJson.id ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Salin JSON</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setSelectedDocJson(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-[#0a0a0f] p-3 rounded-xl border border-[#1e1e2d]">
              <pre className="font-mono text-xs text-emerald-400 whitespace-pre-wrap">
                {JSON.stringify(selectedDocJson.data, null, 2)}
              </pre>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 shrink-0">
              <span>Database live schema inspector</span>
              <button
                onClick={() => setSelectedDocJson(null)}
                className="px-4 py-1.5 bg-[#202030] hover:bg-[#2a2a40] text-slate-200 font-semibold rounded-lg"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1-Item Write Diagnostic Modal */}
      <AdminDiagnosticModal
        isOpen={isDiagnosticModalOpen}
        onClose={() => setIsDiagnosticModalOpen(false)}
      />
    </div>
  );
};
