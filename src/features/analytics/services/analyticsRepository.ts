import { getSupabaseClient, isSupabaseConfigured, parseSupabaseError } from '../../../lib/supabase';
import { DATABASE_TABLES, logDatabaseError } from '../../../services/database/databaseContract';
import { 
  AnalyticsEvent, 
  AnalyticsSummary, 
  AnalyticsTimeframe, 
  DailyTrendPoint, 
  PopularComicStat, 
  PopularChapterStat 
} from '../types/analytics.types';
import { getOrCreateSessionId, getDeviceType, shouldTrackEvent } from './analyticsSession';
import { Comic, Chapter, User } from '../../../types';

const LOCAL_EVENTS_STORAGE_KEY = 'antitimpa_local_analytics_events_v1';

export class AnalyticsRepository {
  /**
   * Safe local fallback storage for analytics events
   */
  private static getLocalEvents(): AnalyticsEvent[] {
    try {
      const raw = localStorage.getItem(LOCAL_EVENTS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  private static saveLocalEvent(event: AnalyticsEvent): void {
    try {
      const events = this.getLocalEvents();
      const updated = [event, ...events].slice(0, 1000); // retain latest 1000 locally
      localStorage.setItem(LOCAL_EVENTS_STORAGE_KEY, JSON.stringify(updated));
    } catch (_) {}
  }

  /**
   * Track an analytics event (Chapter Read, Comic View, or Site Visit)
   */
  public static async trackEvent(params: {
    eventType: 'chapter_read' | 'comic_view' | 'site_visit';
    comicId?: string;
    comicTitle?: string;
    chapterId?: string;
    chapterNumber?: number;
    userId?: string;
    username?: string;
  }): Promise<{ success: boolean; event?: AnalyticsEvent }> {
    const targetKey = params.chapterId || params.comicId || params.eventType;
    if (!shouldTrackEvent(params.eventType, targetKey)) {
      return { success: true }; // Suppress rapid re-tracking of same entity
    }

    const sessionId = getOrCreateSessionId();
    const deviceType = getDeviceType();
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const nowIso = new Date().toISOString();

    const event: AnalyticsEvent = {
      id: eventId,
      eventType: params.eventType,
      comicId: params.comicId,
      comicTitle: params.comicTitle,
      chapterId: params.chapterId,
      chapterNumber: params.chapterNumber,
      userId: params.userId,
      username: params.username,
      sessionId,
      deviceType,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      ipAddress: '127.0.0.1',
      createdAt: nowIso,
    };

    // 1. Save locally for instant client reactivity
    this.saveLocalEvent(event);

    // 2. Post to central server for resilient cross-client sync
    try {
      fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      }).catch(() => {});
    } catch (_) {}

    // 3. Persist to Supabase Database (Single Source of Truth)
    if (isSupabaseConfigured()) {
      const client = getSupabaseClient();
      if (client) {
        try {
          const dbRow = {
            id: event.id,
            event_type: event.eventType,
            comic_id: event.comicId || null,
            comic_title: event.comicTitle || null,
            chapter_id: event.chapterId || null,
            chapter_number: event.chapterNumber !== undefined ? event.chapterNumber : null,
            user_id: event.userId || null,
            username: event.username || null,
            session_id: event.sessionId,
            device_type: event.deviceType,
            user_agent: event.userAgent ? event.userAgent.slice(0, 500) : null,
            ip_address: event.ipAddress || '127.0.0.1',
            created_at: event.createdAt,
          };

          const { error } = await client.from(DATABASE_TABLES.ANALYTICS_EVENTS).insert(dbRow);
          if (error) {
            logDatabaseError({
              table: DATABASE_TABLES.ANALYTICS_EVENTS,
              operation: 'INSERT',
              error,
            });
          }

          // If reading a chapter, increment views_count and total_readers
          if (params.eventType === 'chapter_read') {
            if (params.chapterId) {
              try {
                const { data: chData } = await client
                  .from(DATABASE_TABLES.CHAPTERS)
                  .select('views_count')
                  .eq('id', params.chapterId)
                  .maybeSingle();
                const currentViews = (chData && chData.views_count) || 0;
                await client
                  .from(DATABASE_TABLES.CHAPTERS)
                  .update({ views_count: currentViews + 1 })
                  .eq('id', params.chapterId);
              } catch {
                // Ignore fallback error
              }
            }

            if (params.comicId) {
              try {
                const { data: comicData } = await client
                  .from(DATABASE_TABLES.COMICS)
                  .select('total_readers')
                  .eq('id', params.comicId)
                  .maybeSingle();
                const currentReaders = (comicData && comicData.total_readers) || 0;
                await client
                  .from(DATABASE_TABLES.COMICS)
                  .update({ total_readers: currentReaders + 1 })
                  .eq('id', params.comicId);
              } catch {
                // Ignore fallback error
              }
            }
          }
        } catch (err) {
          logDatabaseError({
            table: DATABASE_TABLES.ANALYTICS_EVENTS,
            operation: 'INSERT',
            error: err,
          });
        }
      }
    }

    return { success: true, event };
  }

  /**
   * Fetch all raw analytics events from Supabase or server fallback
   */
  public static async fetchEventsFromDb(sinceDate?: string): Promise<AnalyticsEvent[]> {
    let remoteEvents: AnalyticsEvent[] = [];

    if (isSupabaseConfigured()) {
      const client = getSupabaseClient();
      if (client) {
        try {
          let query = client
            .from(DATABASE_TABLES.ANALYTICS_EVENTS)
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5000);

          if (sinceDate) {
            query = query.gte('created_at', sinceDate);
          }

          const { data, error } = await query;
          if (!error && Array.isArray(data)) {
            remoteEvents = data.map((row: any) => ({
              id: row.id,
              eventType: row.event_type,
              comicId: row.comic_id,
              comicTitle: row.comic_title,
              chapterId: row.chapter_id,
              chapterNumber: row.chapter_number ? Number(row.chapter_number) : undefined,
              userId: row.user_id,
              username: row.username,
              sessionId: row.session_id,
              deviceType: row.device_type,
              userAgent: row.user_agent,
              ipAddress: row.ip_address,
              createdAt: row.created_at,
            }));
          }
        } catch (_) {}
      }
    }

    // If remote events empty or failed, fetch from central server or local storage
    if (remoteEvents.length === 0) {
      try {
        const res = await fetch('/api/analytics/events');
        if (res.ok) {
          const sEvents = await res.json();
          if (Array.isArray(sEvents)) {
            remoteEvents = sEvents;
          }
        }
      } catch (_) {}
    }

    // Merge with local events
    const localEvents = this.getLocalEvents();
    const eventMap = new Map<string, AnalyticsEvent>();
    remoteEvents.forEach(e => eventMap.set(e.id, e));
    localEvents.forEach(e => {
      if (!eventMap.has(e.id)) {
        eventMap.set(e.id, e);
      }
    });

    return Array.from(eventMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Filter events by selected timeframe
   */
  public static filterEventsByTimeframe(
    events: AnalyticsEvent[], 
    timeframe: AnalyticsTimeframe
  ): { filteredEvents: AnalyticsEvent[]; startDate: Date; now: Date } {
    const now = new Date();
    let startDate = new Date(now);

    switch (timeframe) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
      default:
        startDate = new Date(0); // Beginning of epoch
        break;
    }

    const startTime = startDate.getTime();
    const filteredEvents = events.filter(e => new Date(e.createdAt).getTime() >= startTime);
    return { filteredEvents, startDate, now };
  }

  /**
   * Compute comprehensive analytics summary for Admin Dashboard
   */
  public static async computeSummary(
    timeframe: AnalyticsTimeframe,
    context: {
      comics: Comic[];
      chapters: Record<string, Chapter[]>;
      users: User[];
    }
  ): Promise<AnalyticsSummary> {
    const allEvents = await this.fetchEventsFromDb();
    const { filteredEvents, startDate, now } = this.filterEventsByTimeframe(allEvents, timeframe);

    // 1. Core Counts
    const readEvents = filteredEvents.filter(e => e.eventType === 'chapter_read');
    const viewEvents = filteredEvents.filter(e => e.eventType === 'comic_view');

    const totalReads = readEvents.length;

    // Unique Readers: distinct session IDs or user IDs among chapter_read events
    const uniqueReaderSet = new Set<string>();
    readEvents.forEach(e => {
      uniqueReaderSet.add(e.userId || e.sessionId);
    });
    const uniqueReaders = uniqueReaderSet.size;

    const totalComicViews = viewEvents.length;

    // Active readers count (all unique sessions in timeframe)
    const activeSessionsSet = new Set<string>();
    filteredEvents.forEach(e => {
      activeSessionsSet.add(e.userId || e.sessionId);
    });
    const activeReadersCount = activeSessionsSet.size;

    // 2. New User Registrations in Timeframe
    const startTime = startDate.getTime();
    const newRegistrations = context.users.filter(u => {
      if (u.role === 'admin') return false;
      const created = u.createdAt ? new Date(u.createdAt).getTime() : 0;
      return created >= startTime;
    }).length;

    const totalRegisteredUsers = context.users.filter(u => u.role !== 'admin').length;

    // 3. Trends over Time (Daily or Monthly bucketing)
    const trendMap = new Map<string, { reads: number; uniqueReaders: Set<string>; views: number }>();
    
    // Generate buckets between startDate and now
    const numDays = timeframe === 'today' ? 1 : timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 14;
    const bucketDate = new Date(now);

    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().split('T')[0];
      trendMap.set(key, { reads: 0, uniqueReaders: new Set(), views: 0 });
    }

    filteredEvents.forEach(e => {
      const key = e.createdAt.split('T')[0];
      if (!trendMap.has(key)) {
        trendMap.set(key, { reads: 0, uniqueReaders: new Set(), views: 0 });
      }
      const item = trendMap.get(key)!;
      if (e.eventType === 'chapter_read') {
        item.reads++;
        item.uniqueReaders.add(e.userId || e.sessionId);
      } else if (e.eventType === 'comic_view') {
        item.views++;
      }
    });

    const readTrends: DailyTrendPoint[] = Array.from(trendMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-30) // max 30 points
      .map(([dateStr, val]) => {
        const d = new Date(dateStr);
        const label = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        return {
          date: dateStr,
          label,
          reads: val.reads,
          uniqueReaders: val.uniqueReaders.size,
          views: val.views,
        };
      });

    // 4. Popular Comics Ranking
    const comicStatsMap = new Map<string, { reads: number; uniqueReaders: Set<string> }>();
    readEvents.forEach(e => {
      if (e.comicId) {
        if (!comicStatsMap.has(e.comicId)) {
          comicStatsMap.set(e.comicId, { reads: 0, uniqueReaders: new Set() });
        }
        const s = comicStatsMap.get(e.comicId)!;
        s.reads++;
        s.uniqueReaders.add(e.userId || e.sessionId);
      }
    });

    const topComics: PopularComicStat[] = context.comics
      .map(c => {
        const stats = comicStatsMap.get(c.id);
        const realReads = stats ? stats.reads : 0;
        const realUniques = stats ? stats.uniqueReaders.size : 0;
        // Fallback display if no event logged yet: use totalReaders field
        const effectiveReads = realReads > 0 ? realReads : (c.totalReaders || 0);
        const effectiveUniques = realUniques > 0 ? realUniques : Math.max(0, Math.round((c.totalReaders || 0) * 0.7));

        return {
          comicId: c.id,
          title: c.title,
          slug: c.slug || c.id,
          coverImage: c.coverImage,
          comicType: c.comicType || c.type || 'manga',
          reads: effectiveReads,
          uniqueReaders: effectiveUniques,
          totalChapters: (context.chapters[c.id] || []).length || c.totalChapters || 0,
        };
      })
      .sort((a, b) => b.reads - a.reads)
      .slice(0, 10);

    // 5. Popular Chapters Ranking
    const chapterViewsMap = new Map<string, number>();
    readEvents.forEach(e => {
      if (e.chapterId) {
        chapterViewsMap.set(e.chapterId, (chapterViewsMap.get(e.chapterId) || 0) + 1);
      }
    });

    const allChaptersList: Chapter[] = [];
    Object.values(context.chapters).forEach(list => {
      if (Array.isArray(list)) allChaptersList.push(...list);
    });

    const topChapters: PopularChapterStat[] = allChaptersList
      .map(ch => {
        const eventViews = chapterViewsMap.get(ch.id) || 0;
        const effectiveViews = eventViews > 0 ? eventViews : (ch.viewsCount || 0);
        const parentComic = context.comics.find(c => c.id === ch.comicId);
        return {
          chapterId: ch.id,
          comicId: ch.comicId,
          comicTitle: parentComic?.title || 'Komik',
          chapterNumber: Number(ch.chapterNumber) || 1,
          title: ch.title || `Chapter ${ch.chapterNumber}`,
          viewsCount: effectiveViews,
        };
      })
      .sort((a, b) => b.viewsCount - a.viewsCount)
      .slice(0, 10);

    // 6. Device Breakdown
    let mobileCount = 0;
    let desktopCount = 0;
    let tabletCount = 0;

    filteredEvents.forEach(e => {
      if (e.deviceType === 'mobile') mobileCount++;
      else if (e.deviceType === 'tablet') tabletCount++;
      else desktopCount++;
    });

    // 7. Member vs Guest Breakdown
    let memberEventsCount = 0;
    let guestEventsCount = 0;
    filteredEvents.forEach(e => {
      if (e.userId) memberEventsCount++;
      else guestEventsCount++;
    });

    // 8. Comic Type & Genre Breakdown
    const typeDistribution: Record<string, number> = {};
    context.comics.forEach(c => {
      const t = (c.comicType || c.type || 'manga').toLowerCase();
      typeDistribution[t] = (typeDistribution[t] || 0) + 1;
    });

    const genreDistribution: Record<string, number> = {};
    context.comics.forEach(c => {
      (c.genres || []).forEach(g => {
        genreDistribution[g] = (genreDistribution[g] || 0) + 1;
      });
    });

    const totalChaptersCount = allChaptersList.length;

    return {
      timeframe,
      totalReads,
      uniqueReaders,
      totalComicViews,
      newRegistrations,
      totalRegisteredUsers,
      activeReadersCount,
      totalComics: context.comics.length,
      totalChapters: totalChaptersCount,
      readTrends,
      topComics,
      topChapters,
      deviceBreakdown: {
        mobile: mobileCount,
        desktop: desktopCount,
        tablet: tabletCount,
      },
      userTypeBreakdown: {
        members: memberEventsCount,
        guests: guestEventsCount,
      },
      typeDistribution,
      genreDistribution,
    };
  }
}
