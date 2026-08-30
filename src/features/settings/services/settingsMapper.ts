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
  return row;
}

export function mapDbToSettings(s: Record<string, any>): SystemSettings {
  return {
    siteName: s.site_name || 'KomikYuk',
    siteAnnouncement: s.announcement || '',
    maintenanceMode: Boolean(s.maintenance_mode),
    siteLogo: s.site_logo || undefined,
    siteFavicon: s.site_favicon || undefined,
    maxLoginAttempts: 5,
    allowGuestPreview: true,
    guestPreviewPages: 3,
    ageGating18Plus: true,
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
