import { SystemSettings, ActivityLog } from '../types/settings.types';

export function mapSettingsToDb(s: Partial<SystemSettings>): Record<string, any> {
  const row: Record<string, any> = {
    id: 'global_config',
    updated_at: new Date().toISOString(),
  };
  if (s.siteName !== undefined) row.site_name = s.siteName;
  if (s.siteAnnouncement !== undefined) row.announcement = s.siteAnnouncement;
  if (s.maintenanceMode !== undefined) row.maintenance_mode = s.maintenanceMode;
  if (s.siteLogo !== undefined) row.site_logo = s.siteLogo;
  if (s.siteFavicon !== undefined) row.site_favicon = s.siteFavicon;
  if (s.adminPhone !== undefined) row.admin_phone = s.adminPhone;
  if (s.tiktokUrl !== undefined) row.tiktok_url = s.tiktokUrl;
  if (s.tiktokHandle !== undefined) row.tiktok_handle = s.tiktokHandle;
  if (s.watermarkText !== undefined) row.watermark_text = s.watermarkText;
  if (s.maxFailedAttempts !== undefined) row.max_failed_attempts = s.maxFailedAttempts;
  if (s.allowGuestPreview !== undefined) row.allow_guest_preview = s.allowGuestPreview;
  if (s.guestPreviewPages !== undefined) row.guest_preview_pages = s.guestPreviewPages;
  if (s.ageGating18Plus !== undefined) row.enable_18plus = s.ageGating18Plus;
  return row;
}

export function mapDbToSettings(s: Record<string, any>): SystemSettings {
  return {
    siteName: s.site_name || 'AntiTimpa',
    siteAnnouncement: s.announcement || '',
    maintenanceMode: Boolean(s.maintenance_mode),
    siteLogo: s.site_logo || undefined,
    siteFavicon: s.site_favicon || undefined,
    adminPhone: s.admin_phone || '089514441988',
    tiktokUrl: s.tiktok_url || 'https://www.tiktok.com/@anti.timpa',
    tiktokHandle: s.tiktok_handle || '@anti.timpa',
    watermarkText: s.watermark_text || 'AntiTimpa Digital Reader',
    maxLoginAttempts: 5,
    maxFailedAttempts: typeof s.max_failed_attempts === 'number' ? s.max_failed_attempts : 3,
    allowGuestPreview: s.allow_guest_preview !== undefined ? Boolean(s.allow_guest_preview) : true,
    guestPreviewPages: typeof s.guest_preview_pages === 'number' ? s.guest_preview_pages : 2,
    ageGating18Plus: s.enable_18plus !== undefined ? Boolean(s.enable_18plus) : true,
    defaultComicSorting: 'newest',
    defaultReaderMode: 'vertical',
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
    timestamp: l.created_at || new Date().toISOString(),
  };
}
