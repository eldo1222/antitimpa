-- ==============================================================================
-- ANTITIMPA - MIGRATION: ADD MISSING COMIC & CHAPTER COLUMNS
-- Migration File: supabase/migrations/20260831_add_missing_comic_columns.sql
-- Description:
--   Surgically and safely ensures EVERY column required by Comic & Chapter application
--   contracts exists in PostgreSQL without dropping tables, truncating, or altering existing data.
--   Includes PostgREST schema cache reload notification.
-- ==============================================================================

-- 1. Ensure all columns exist on public.comics table
DO $$
BEGIN
    -- Identifiers and metadata
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

    -- Metrics and numerical counters (CRITICAL: rating_count, total_chapters, etc.)
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS rating NUMERIC(4, 2) DEFAULT 0.00;
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS rating_count INT DEFAULT 0;
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS total_chapters INT DEFAULT 0;
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS total_readers INT DEFAULT 0;

    -- Boolean flags & visibility
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS is_slider BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS is_visible_on_home BOOLEAN DEFAULT TRUE;

    -- Timestamps and sources
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS source_api TEXT DEFAULT 'manual';
END $$;

-- 2. Ensure all columns exist on public.chapters table
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

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_comics_slug ON public.comics(slug);
CREATE INDEX IF NOT EXISTS idx_comics_status ON public.comics(status);
CREATE INDEX IF NOT EXISTS idx_comics_content_type ON public.comics(content_type);
CREATE INDEX IF NOT EXISTS idx_comics_updated_at ON public.comics(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chapters_comic_id ON public.chapters(comic_id);
CREATE INDEX IF NOT EXISTS idx_chapters_number ON public.chapters(chapter_number ASC);
CREATE INDEX IF NOT EXISTS idx_chapters_comic_number ON public.chapters(comic_id, chapter_number DESC);

-- 4. Notify PostgREST to immediately rebuild its schema cache
NOTIFY pgrst, 'reload schema';
