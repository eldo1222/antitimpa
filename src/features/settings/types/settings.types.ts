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
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  price5kTitle?: string;
  price15kTitle?: string;
  adminNotifications?: {
    newReaderRegistration: boolean;
    contentReviewReminders: boolean;
    systemErrorAlerts: boolean;
  };
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

export interface AdminToastItem {
  id: string;
  title: string;
  message?: string;
  type: 'success' | 'info' | 'warning' | 'error';
  timestamp: number;
}
