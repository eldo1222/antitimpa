export type AnalyticsEventType = 'chapter_read' | 'comic_view' | 'site_visit';

export interface AnalyticsEvent {
  id: string;
  eventType: AnalyticsEventType;
  comicId?: string;
  comicTitle?: string;
  chapterId?: string;
  chapterNumber?: number;
  userId?: string;
  username?: string;
  sessionId: string;
  deviceType?: 'mobile' | 'desktop' | 'tablet';
  userAgent?: string;
  ipAddress?: string;
  createdAt: string;
}

export type AnalyticsTimeframe = 'today' | '7d' | '30d' | 'year' | 'all';

export interface DailyTrendPoint {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "05 Sep"
  reads: number;
  uniqueReaders: number;
  views: number;
}

export interface PopularComicStat {
  comicId: string;
  title: string;
  slug: string;
  coverImage: string;
  comicType: string;
  reads: number;
  uniqueReaders: number;
  totalChapters: number;
}

export interface PopularChapterStat {
  chapterId: string;
  comicId: string;
  comicTitle: string;
  chapterNumber: number;
  title: string;
  viewsCount: number;
}

export interface AnalyticsSummary {
  timeframe: AnalyticsTimeframe;
  totalReads: number; // Count of all chapter_read events
  uniqueReaders: number; // Distinct user_id / session_id that read chapters
  totalComicViews: number; // Count of comic_view events
  newRegistrations: number; // Users registered in timeframe
  totalRegisteredUsers: number;
  activeReadersCount: number; // Unique users/sessions active in timeframe
  totalComics: number;
  totalChapters: number;
  readTrends: DailyTrendPoint[];
  topComics: PopularComicStat[];
  topChapters: PopularChapterStat[];
  deviceBreakdown: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
  userTypeBreakdown: {
    members: number; // authenticated readers
    guests: number; // anonymous session readers
  };
  typeDistribution: Record<string, number>; // manga, manhwa, manhua, etc.
  genreDistribution: Record<string, number>;
}
