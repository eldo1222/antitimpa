-- ==============================================================================
-- KOMIKYUK / ANTITIMPA - SUPABASE (POSTGRESQL) SCHEMA
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
    total_chapters INT DEFAULT 0,
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

-- Index pencarian & filter komik
CREATE INDEX IF NOT EXISTS idx_comics_slug ON public.comics(slug);
CREATE INDEX IF NOT EXISTS idx_comics_status ON public.comics(status);
CREATE INDEX IF NOT EXISTS idx_comics_content_type ON public.comics(content_type);
CREATE INDEX IF NOT EXISTS idx_comics_updated_at ON public.comics(updated_at DESC);

-- 2. TABEL CHAPTERS (Daftar Chapter / Bab)
CREATE TABLE IF NOT EXISTS public.chapters (
    id TEXT PRIMARY KEY,
    comic_id TEXT NOT NULL REFERENCES public.comics(id) ON DELETE CASCADE,
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

-- Index pencarian & sorting chapter
CREATE INDEX IF NOT EXISTS idx_chapters_comic_id ON public.chapters(comic_id);
CREATE INDEX IF NOT EXISTS idx_chapters_number ON public.chapters(chapter_number ASC);
CREATE INDEX IF NOT EXISTS idx_chapters_comic_number ON public.chapters(comic_id, chapter_number DESC);

-- 3. TABEL USERS (Akun Admin & Pembaca)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
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

-- 4. TABEL BANNERS (Carousel / Slider Banner)
CREATE TABLE IF NOT EXISTS public.banners (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    target_url TEXT,
    target_type TEXT DEFAULT 'comic',
    comic_id TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    order_index INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABEL DRIVE ACCOUNTS (Multi Google Drive Storage)
CREATE TABLE IF NOT EXISTS public.drive_accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    account_type TEXT DEFAULT 'service_account',
    client_email TEXT,
    private_key TEXT,
    folder_id TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABEL ACTIVITY LOGS (Audit Trail / Security Log)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    username TEXT,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    details TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs(created_at DESC);

-- 7. TABEL SYSTEM SETTINGS (Konfigurasi Global & SEO)
CREATE TABLE IF NOT EXISTS public.system_settings (
    id TEXT PRIMARY KEY,
    site_name TEXT DEFAULT 'KomikYuk',
    site_tagline TEXT DEFAULT 'Baca Komik Online Bahasa Indonesia',
    site_description TEXT,
    site_logo TEXT,
    site_favicon TEXT,
    announcement TEXT,
    enable_comments BOOLEAN DEFAULT TRUE,
    enable_18plus BOOLEAN DEFAULT TRUE,
    maintenance_mode BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABEL COMMENTS (Komentar Pembaca)
CREATE TABLE IF NOT EXISTS public.comments (
    id TEXT PRIMARY KEY,
    comic_id TEXT NOT NULL REFERENCES public.comics(id) ON DELETE CASCADE,
    chapter_id TEXT,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    avatar TEXT,
    content TEXT NOT NULL,
    likes_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_comic ON public.comments(comic_id);

-- 9. TABEL ADS & AD SETTINGS (Manajemen Iklan)
CREATE TABLE IF NOT EXISTS public.ads (
    id TEXT PRIMARY KEY,
    placement TEXT NOT NULL,
    title TEXT,
    image_url TEXT,
    target_url TEXT,
    ad_code TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ad_settings (
    id TEXT PRIMARY KEY,
    enable_global_ads BOOLEAN DEFAULT TRUE,
    ad_blocker_notice BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Mengizinkan pembacaan publik tanpa batas (Unlimited Read) & penulisan via anon/authenticated
-- ==============================================================================

ALTER TABLE public.comics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_settings ENABLE ROW LEVEL SECURITY;

-- Buat Policy Allow All untuk Anonymous/Public Client (Frontend App)
DROP POLICY IF EXISTS "Public Read All Comics" ON public.comics;
CREATE POLICY "Public Read All Comics" ON public.comics FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Write Comics" ON public.comics;
CREATE POLICY "Public Write Comics" ON public.comics FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Read All Chapters" ON public.chapters;
CREATE POLICY "Public Read All Chapters" ON public.chapters FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Write Chapters" ON public.chapters;
CREATE POLICY "Public Write Chapters" ON public.chapters FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Users" ON public.users;
CREATE POLICY "Public Access Users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Banners" ON public.banners;
CREATE POLICY "Public Access Banners" ON public.banners FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Drives" ON public.drive_accounts;
CREATE POLICY "Public Access Drives" ON public.drive_accounts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Logs" ON public.activity_logs;
CREATE POLICY "Public Access Logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Settings" ON public.system_settings;
CREATE POLICY "Public Access Settings" ON public.system_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Comments" ON public.comments;
CREATE POLICY "Public Access Comments" ON public.comments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Ads" ON public.ads;
CREATE POLICY "Public Access Ads" ON public.ads FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access AdSettings" ON public.ad_settings;
CREATE POLICY "Public Access AdSettings" ON public.ad_settings FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime for live cross-device sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.comics, public.chapters, public.banners, public.users, public.system_settings;
