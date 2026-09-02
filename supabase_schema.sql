-- ==============================================================================
-- ANTITIMPA - SUPABASE (POSTGRESQL) SCHEMA
-- ==============================================================================
-- Petunjuk Eksekusi:
-- 1. Buka Supabase Dashboard (https://app.supabase.com) -> Masuk ke Project Anda.
-- 2. Buka menu "SQL Editor" di bilah kiri.
-- 3. Paste seluruh kode SQL di bawah ini dan klik tombol "Run" (ikon play hijau).
-- 4. Semua tabel, kolom, index, dan izin RLS akan otomatis terbuat / tersinkronisasi!
-- ==============================================================================

-- 1. TABEL COMICS (Daftar Judul Komik)
CREATE TABLE IF NOT EXISTS public.comics (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT 'Untitled',
    slug TEXT NOT NULL DEFAULT '',
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

-- Ensure all columns exist on comics table (Idempotent for pre-existing tables)
DO $$
BEGIN
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS title TEXT DEFAULT 'Untitled';
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS slug TEXT DEFAULT '';
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS cover_image TEXT;
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS banner_image TEXT;
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS synopsis TEXT;
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS genres JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ongoing';
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS comic_type TEXT DEFAULT 'manga';
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'normal';
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS story_writer TEXT DEFAULT '';
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS artist TEXT DEFAULT '';
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS rating NUMERIC(4, 2) DEFAULT 0.00;
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS rating_count INT DEFAULT 0;
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS total_chapters INT DEFAULT 0;
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS total_readers INT DEFAULT 0;
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS is_slider BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS is_visible_on_home BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS source_api TEXT DEFAULT 'manual';
END $$;

CREATE INDEX IF NOT EXISTS idx_comics_slug ON public.comics(slug);
CREATE INDEX IF NOT EXISTS idx_comics_status ON public.comics(status);
CREATE INDEX IF NOT EXISTS idx_comics_content_type ON public.comics(content_type);
CREATE INDEX IF NOT EXISTS idx_comics_updated_at ON public.comics(updated_at DESC);

-- 2. TABEL CHAPTERS (Daftar Chapter / Bab)
CREATE TABLE IF NOT EXISTS public.chapters (
    id TEXT PRIMARY KEY,
    comic_id TEXT NOT NULL,
    chapter_number NUMERIC(8, 2) NOT NULL DEFAULT 1,
    title TEXT NOT NULL DEFAULT '',
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

-- Ensure all columns exist on chapters table
DO $$
BEGIN
    ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS comic_id TEXT;
    ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS chapter_number NUMERIC(8, 2) DEFAULT 1;
    ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '';
    ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS slug TEXT;
    ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS release_date TEXT;
    ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS price INT DEFAULT 0;
    ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'pages';
    ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS pages JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS drive_file_id TEXT;
    ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS drive_embed_url TEXT;
    ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS drive_account_id TEXT;
    ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS views_count INT DEFAULT 0;
    ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
END $$;

CREATE INDEX IF NOT EXISTS idx_chapters_comic_id ON public.chapters(comic_id);
CREATE INDEX IF NOT EXISTS idx_chapters_number ON public.chapters(chapter_number ASC);
CREATE INDEX IF NOT EXISTS idx_chapters_comic_number ON public.chapters(comic_id, chapter_number DESC);

-- 3. TABEL USERS (Akun Admin & Pembaca)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT,
    email TEXT,
    phone TEXT,
    phone_number TEXT,
    bio TEXT,
    password_hash TEXT,
    role TEXT DEFAULT 'user',
    package_type TEXT DEFAULT 'free',
    package_expiry TIMESTAMPTZ,
    coins INT DEFAULT 0,
    avatar TEXT,
    duration_type TEXT DEFAULT 'unlimited',
    allowed_comic_ids JSONB DEFAULT '[]'::jsonb,
    price_note TEXT,
    expires_at TIMESTAMPTZ,
    first_login_at TIMESTAMPTZ,
    failed_attempts INT DEFAULT 0,
    status TEXT DEFAULT 'active',
    bookmarks JSONB DEFAULT '[]'::jsonb,
    history JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username TEXT;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS display_name TEXT;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone_number TEXT;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash TEXT;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS package_type TEXT DEFAULT 'free';
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS package_expiry TIMESTAMPTZ;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS coins INT DEFAULT 0;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar TEXT;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS duration_type TEXT DEFAULT 'unlimited';
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS allowed_comic_ids JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS price_note TEXT;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS first_login_at TIMESTAMPTZ;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS failed_attempts INT DEFAULT 0;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bookmarks JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
END $$;

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

CREATE INDEX IF NOT EXISTS idx_comments_comic_id ON public.comments(comic_id);

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

-- Seed default ad settings singleton if empty
INSERT INTO public.ad_settings (id, ads_enabled, hide_ads_for_vip, popunder_enabled, popunder_cooldown_minutes, updated_at)
VALUES ('global_ad_config', TRUE, TRUE, TRUE, 15, NOW())
ON CONFLICT (id) DO NOTHING;

-- 10. TABEL SYSTEM_SETTINGS (Pengaturan Identitas & Fitur)
CREATE TABLE IF NOT EXISTS public.system_settings (
    id TEXT PRIMARY KEY DEFAULT 'global_config',
    site_name TEXT DEFAULT 'AntiTimpa',
    site_tagline TEXT,
    site_description TEXT,
    site_logo TEXT,
    site_favicon TEXT,
    announcement TEXT,
    admin_phone TEXT DEFAULT '089514441988',
    tiktok_url TEXT DEFAULT 'https://www.tiktok.com/@anti.timpa',
    tiktok_handle TEXT DEFAULT '@anti.timpa',
    watermark_text TEXT DEFAULT 'AntiTimpa Digital Reader',
    max_failed_attempts INT DEFAULT 3,
    guest_preview_pages INT DEFAULT 2,
    allow_guest_preview BOOLEAN DEFAULT TRUE,
    enable_comments BOOLEAN DEFAULT TRUE,
    enable_18plus BOOLEAN DEFAULT TRUE,
    maintenance_mode BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS admin_phone TEXT DEFAULT '089514441988';
    ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS tiktok_url TEXT DEFAULT 'https://www.tiktok.com/@anti.timpa';
    ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS tiktok_handle TEXT DEFAULT '@anti.timpa';
    ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS watermark_text TEXT DEFAULT 'AntiTimpa Digital Reader';
    ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS max_failed_attempts INT DEFAULT 3;
    ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS guest_preview_pages INT DEFAULT 2;
    ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS allow_guest_preview BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS enable_comments BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS enable_18plus BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN DEFAULT FALSE;
END $$;

-- Seed default system settings singleton if empty
INSERT INTO public.system_settings (id, site_name, site_tagline, enable_comments, enable_18plus, updated_at)
VALUES ('global_config', 'AntiTimpa', 'Portal Komik & Manga Terlengkap', TRUE, TRUE, NOW())
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- KEBIJAKAN ROW LEVEL SECURITY (RLS) - PUBLIC READ & WRITE
-- ==============================================================================
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

-- 1. Comics Policies
DROP POLICY IF EXISTS "Public Full Access Comics" ON public.comics;
DROP POLICY IF EXISTS "Allow public read comics" ON public.comics;
DROP POLICY IF EXISTS "Allow anon insert comics" ON public.comics;
DROP POLICY IF EXISTS "Allow public all comics" ON public.comics;
CREATE POLICY "Public Full Access Comics" ON public.comics FOR ALL USING (true) WITH CHECK (true);

-- 2. Chapters Policies
DROP POLICY IF EXISTS "Public Full Access Chapters" ON public.chapters;
DROP POLICY IF EXISTS "Allow public read chapters" ON public.chapters;
DROP POLICY IF EXISTS "Allow anon insert chapters" ON public.chapters;
DROP POLICY IF EXISTS "Allow public all chapters" ON public.chapters;
CREATE POLICY "Public Full Access Chapters" ON public.chapters FOR ALL USING (true) WITH CHECK (true);

-- 3. Users Policies
DROP POLICY IF EXISTS "Public Full Access Users" ON public.users;
DROP POLICY IF EXISTS "Allow public read users" ON public.users;
DROP POLICY IF EXISTS "Allow anon insert users" ON public.users;
DROP POLICY IF EXISTS "Allow public all users" ON public.users;
CREATE POLICY "Public Full Access Users" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- 4. Banners Policies
DROP POLICY IF EXISTS "Public Full Access Banners" ON public.banners;
DROP POLICY IF EXISTS "Allow public read banners" ON public.banners;
DROP POLICY IF EXISTS "Allow anon insert banners" ON public.banners;
DROP POLICY IF EXISTS "Allow public all banners" ON public.banners;
CREATE POLICY "Public Full Access Banners" ON public.banners FOR ALL USING (true) WITH CHECK (true);

-- 5. Drive Accounts Policies
DROP POLICY IF EXISTS "Public Full Access Drive Accounts" ON public.drive_accounts;
DROP POLICY IF EXISTS "Allow public read drive_accounts" ON public.drive_accounts;
DROP POLICY IF EXISTS "Allow anon insert drive_accounts" ON public.drive_accounts;
DROP POLICY IF EXISTS "Allow public all drive_accounts" ON public.drive_accounts;
CREATE POLICY "Public Full Access Drive Accounts" ON public.drive_accounts FOR ALL USING (true) WITH CHECK (true);

-- 6. Activity Logs Policies
DROP POLICY IF EXISTS "Public Full Access Activity Logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Allow public read activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Allow anon insert activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Allow public all activity_logs" ON public.activity_logs;
CREATE POLICY "Public Full Access Activity Logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);

-- 7. Comments Policies
DROP POLICY IF EXISTS "Public Full Access Comments" ON public.comments;
DROP POLICY IF EXISTS "Allow public read comments" ON public.comments;
DROP POLICY IF EXISTS "Allow anon insert comments" ON public.comments;
DROP POLICY IF EXISTS "Allow public all comments" ON public.comments;
CREATE POLICY "Public Full Access Comments" ON public.comments FOR ALL USING (true) WITH CHECK (true);

-- 8. Ads Policies
DROP POLICY IF EXISTS "Public Full Access Ads" ON public.ads;
DROP POLICY IF EXISTS "Allow public read ads" ON public.ads;
DROP POLICY IF EXISTS "Allow anon insert ads" ON public.ads;
DROP POLICY IF EXISTS "Allow public all ads" ON public.ads;
CREATE POLICY "Public Full Access Ads" ON public.ads FOR ALL USING (true) WITH CHECK (true);

-- 9. Ad Settings Policies
DROP POLICY IF EXISTS "Public Full Access Ad Settings" ON public.ad_settings;
DROP POLICY IF EXISTS "Allow public read ad_settings" ON public.ad_settings;
DROP POLICY IF EXISTS "Allow anon insert ad_settings" ON public.ad_settings;
DROP POLICY IF EXISTS "Allow public all ad_settings" ON public.ad_settings;
CREATE POLICY "Public Full Access Ad Settings" ON public.ad_settings FOR ALL USING (true) WITH CHECK (true);

-- 10. System Settings Policies
DROP POLICY IF EXISTS "Public Full Access System Settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow public read system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow anon insert system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow public all system_settings" ON public.system_settings;
CREATE POLICY "Public Full Access System Settings" ON public.system_settings FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- REALTIME SINKRONISASI AKTIF (Cross-Device Sync HP / Laptop / Tablet)
-- ==============================================================================
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
END $$;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
