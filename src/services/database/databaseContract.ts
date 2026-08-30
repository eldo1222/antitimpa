/**
 * ============================================================================
 * OFFICIAL DATABASE CONTRACT - SUPABASE POSTGRESQL SINGLE SOURCE OF TRUTH
 * ============================================================================
 * Baseline Schema: /supabase_schema.sql
 * 
 * Strict Enforcement:
 * - Each domain MUST use its official table name from this contract.
 * - Disallowed legacy aliases (e.g. 'readers', 'site_settings', 'comic_data')
 *   MUST NOT be used anywhere in the codebase.
 */

export const DATABASE_TABLES = {
  COMICS: 'comics',
  CHAPTERS: 'chapters',
  USERS: 'users',
  BANNERS: 'banners',
  DRIVE_ACCOUNTS: 'drive_accounts',
  ACTIVITY_LOGS: 'activity_logs',
  COMMENTS: 'comments',
  ADS: 'ads',
  AD_SETTINGS: 'ad_settings',
  SYSTEM_SETTINGS: 'system_settings',
} as const;

export type DatabaseTableName = (typeof DATABASE_TABLES)[keyof typeof DATABASE_TABLES];

/**
 * Metadata & Official Column Mapping for Each Database Table
 */
export const DATABASE_CONTRACT = {
  [DATABASE_TABLES.COMICS]: {
    table: DATABASE_TABLES.COMICS,
    primaryKey: 'id',
    columns: [
      'id', 'title', 'slug', 'cover_image', 'banner_image', 'synopsis',
      'genres', 'status', 'comic_type', 'content_type', 'story_writer',
      'artist', 'rating', 'rating_count', 'total_chapters', 'total_readers',
      'is_free', 'is_vip', 'is_featured', 'is_slider', 'is_published',
      'is_visible_on_home', 'created_at', 'updated_at', 'source_api'
    ] as const,
  },
  [DATABASE_TABLES.CHAPTERS]: {
    table: DATABASE_TABLES.CHAPTERS,
    primaryKey: 'id',
    foreignKeys: { comic_id: 'comics.id' },
    columns: [
      'id', 'comic_id', 'chapter_number', 'title', 'slug', 'release_date',
      'price', 'is_free', 'is_locked', 'is_vip', 'source_type', 'pages',
      'drive_file_id', 'drive_embed_url', 'drive_account_id', 'views_count',
      'created_at', 'updated_at'
    ] as const,
  },
  [DATABASE_TABLES.USERS]: {
    table: DATABASE_TABLES.USERS,
    primaryKey: 'id',
    disallowedAliases: ['readers', 'accounts', 'user_data'],
    columns: [
      'id', 'username', 'email', 'password_hash', 'role', 'package_type',
      'package_expiry', 'coins', 'avatar', 'bookmarks', 'history',
      'is_active', 'created_at', 'updated_at'
    ] as const,
  },
  [DATABASE_TABLES.BANNERS]: {
    table: DATABASE_TABLES.BANNERS,
    primaryKey: 'id',
    disallowedAliases: ['banner_data', 'home_banners'],
    columns: [
      'id', 'title', 'subtitle', 'image_url', 'target_url', 'target_type',
      'comic_id', 'is_active', 'order_index', 'created_at'
    ] as const,
  },
  [DATABASE_TABLES.DRIVE_ACCOUNTS]: {
    table: DATABASE_TABLES.DRIVE_ACCOUNTS,
    primaryKey: 'id',
    disallowedAliases: ['drive_account', 'drives'],
    columns: [
      'id', 'name', 'email', 'folder_url', 'status', 'notes',
      'storage_used_gb', 'storage_total_gb', 'color_tag', 'created_at'
    ] as const,
  },
  [DATABASE_TABLES.ACTIVITY_LOGS]: {
    table: DATABASE_TABLES.ACTIVITY_LOGS,
    primaryKey: 'id',
    disallowedAliases: ['logs', 'audit_logs'],
    columns: [
      'id', 'username', 'action', 'type', 'status', 'details', 'ip_address', 'created_at'
    ] as const,
  },
  [DATABASE_TABLES.COMMENTS]: {
    table: DATABASE_TABLES.COMMENTS,
    primaryKey: 'id',
    columns: [
      'id', 'comic_id', 'chapter_id', 'chapter_number', 'user_id', 'username',
      'user_avatar', 'user_role', 'user_email', 'content', 'likes_count',
      'spoiler', 'reply_to_id', 'is_admin', 'is_vip', 'created_at'
    ] as const,
  },
  [DATABASE_TABLES.ADS]: {
    table: DATABASE_TABLES.ADS,
    primaryKey: 'id',
    columns: [
      'id', 'title', 'type', 'position', 'is_active', 'image_url', 'target_url',
      'alt_text', 'badge_label', 'sponsor_name', 'headline', 'description',
      'cta_text', 'html_code', 'script_code', 'popunder_url', 'frequency_hours',
      'show_for_vip', 'max_clicks_per_day', 'click_count', 'view_count', 'notes',
      'created_at'
    ] as const,
  },
  [DATABASE_TABLES.AD_SETTINGS]: {
    table: DATABASE_TABLES.AD_SETTINGS,
    primaryKey: 'id',
    singletonId: 'global_ad_config',
    columns: [
      'id', 'ads_enabled', 'hide_ads_for_vip', 'popunder_enabled',
      'popunder_cooldown_minutes', 'popunder_cooldown_hours',
      'welcome_popup_enabled', 'mitra_interstitial_enabled',
      'dual_chapter_ads_enabled', 'floating_bottom_enabled',
      'show_ad_label', 'updated_at'
    ] as const,
  },
  [DATABASE_TABLES.SYSTEM_SETTINGS]: {
    table: DATABASE_TABLES.SYSTEM_SETTINGS,
    primaryKey: 'id',
    singletonId: 'global_config',
    disallowedAliases: ['site_settings', 'settings', 'config'],
    columns: [
      'id', 'site_name', 'site_tagline', 'site_description', 'site_logo',
      'site_favicon', 'announcement', 'enable_comments', 'enable_18plus',
      'maintenance_mode', 'updated_at'
    ] as const,
  },
} as const;

import { isMissingTableError } from '../supabase/errors';

export { isMissingTableError };

/**
 * Diagnostic logger for Supabase Database operations
 */
export function logDatabaseError(context: {
  table: DatabaseTableName | string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'UPSERT' | 'DELETE' | 'SUBSCRIBE';
  error: any;
  details?: any;
}) {
  const code = context.error?.code || 'UNKNOWN_CODE';
  const msg = context.error?.message || String(context.error);

  // If table is simply not yet created in Supabase SQL schema, log as a descriptive notice
  if (isMissingTableError(context.error)) {
    console.warn(`[DATABASE NOTICE] [${context.operation} ${context.table}] Tabel belum dibuat di database Supabase (Code: ${code}). Buka Tab Database Admin untuk mengeksekusi SQL Schema.`);
    return;
  }

  console.error(`[DATABASE CONTRACT ERROR] [${context.operation} ${context.table}] Code: ${code} - ${msg}`, {
    table: context.table,
    operation: context.operation,
    rawError: context.error,
    details: context.details,
  });
}
