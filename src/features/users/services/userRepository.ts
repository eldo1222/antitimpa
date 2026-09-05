import { getSupabaseClient, isSupabaseConfigured, parseSupabaseError } from '../../../lib/supabase';
import { DATABASE_TABLES, logDatabaseError } from '../../../services/database/databaseContract';
import { User } from '../types/user.types';
import { mapUserToDb, mapDbToUser } from './userMapper';

export interface UserPaginationOptions {
  page: number;
  limit: number;
  search?: string;
  filter?: 'all' | 'active' | 'inactive' | 'locked' | 'expired' | 'admin' | 'reader' | '15k' | '5k';
  sortBy?: 'created_at' | 'username' | 'last_active';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedUsersResult {
  data: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  error?: string;
}

export interface UserDetailStats {
  chaptersRead: number;
  comicsRead: number;
  bookmarksCount: number;
  recentActivity: Array<{
    id: string;
    action: string;
    comicTitle?: string;
    chapterNumber?: number;
    createdAt: string;
  }>;
}

export class UserRepository {
  public static async getAll(): Promise<{ data: User[]; error?: string }> {
    if (!isSupabaseConfigured()) return { data: [] };
    const client = getSupabaseClient();
    if (!client) return { data: [] };

    try {
      const { data, error } = await client
        .from(DATABASE_TABLES.USERS)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logDatabaseError({ table: DATABASE_TABLES.USERS, operation: 'SELECT', error });
        const parsed = parseSupabaseError(error);
        return { data: [], error: parsed.userFriendlyMessage };
      }

      // Sanitize passwords and tokens for security
      const sanitized = (data || []).map(row => {
        const u = mapDbToUser(row);
        delete u.password;
        delete u.passwordHash;
        return u;
      });

      return { data: sanitized };
    } catch (err: any) {
      logDatabaseError({ table: DATABASE_TABLES.USERS, operation: 'SELECT', error: err });
      return { data: [], error: err?.message || 'Gagal memuat pengguna' };
    }
  }

  /**
   * Server-side paginated user retrieval with search, filter, and sort
   */
  public static async getPaginated(options: UserPaginationOptions): Promise<PaginatedUsersResult> {
    const { page = 1, limit = 20, search = '', filter = 'all', sortBy = 'created_at', sortOrder = 'desc' } = options;

    if (!isSupabaseConfigured()) {
      return { data: [], total: 0, page, limit, totalPages: 0, error: 'Supabase offline' };
    }
    const client = getSupabaseClient();
    if (!client) {
      return { data: [], total: 0, page, limit, totalPages: 0, error: 'Klien Supabase tidak tersedia' };
    }

    try {
      let query = client.from(DATABASE_TABLES.USERS).select('*', { count: 'exact' });

      // Server-side search by username or email
      if (search.trim()) {
        const clean = search.trim();
        query = query.or(`username.ilike.%${clean}%,email.ilike.%${clean}%`);
      }

      // Filter handling
      if (filter === 'active') {
        query = query.eq('is_active', true);
      } else if (filter === 'inactive') {
        query = query.eq('is_active', false);
      } else if (filter === 'admin') {
        query = query.eq('role', 'admin');
      } else if (filter === 'reader') {
        query = query.neq('role', 'admin');
      }

      // Sorting
      const sortColumn = sortBy === 'username' ? 'username' : (sortBy === 'last_active' ? 'updated_at' : 'created_at');
      query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

      // Pagination range
      const from = Math.max(0, (page - 1) * limit);
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) {
        logDatabaseError({ table: DATABASE_TABLES.USERS, operation: 'SELECT', error, details: options });
        const parsed = parseSupabaseError(error);
        return { data: [], total: 0, page, limit, totalPages: 0, error: parsed.userFriendlyMessage };
      }

      const total = count ?? (data?.length || 0);
      const totalPages = Math.ceil(total / limit) || 1;

      // Strictly sanitize password / token hashes before returning
      const sanitizedUsers: User[] = (data || []).map(row => {
        const u = mapDbToUser(row);
        delete u.password;
        delete u.passwordHash;
        return u;
      });

      return {
        data: sanitizedUsers,
        total,
        page,
        limit,
        totalPages
      };
    } catch (err: any) {
      logDatabaseError({ table: DATABASE_TABLES.USERS, operation: 'SELECT', error: err, details: options });
      return { data: [], total: 0, page, limit, totalPages: 0, error: err?.message || 'Gagal memuat pengguna' };
    }
  }

  /**
   * Fetch comprehensive safe user stats (reading activity, bookmarks, etc.)
   */
  public static async getUserStats(userId: string, username?: string): Promise<UserDetailStats> {
    const defaultStats: UserDetailStats = {
      chaptersRead: 0,
      comicsRead: 0,
      bookmarksCount: 0,
      recentActivity: []
    };

    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) return defaultStats;

    try {
      // Query events for this user
      let eventQuery = client
        .from(DATABASE_TABLES.ANALYTICS_EVENTS)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (userId) {
        eventQuery = eventQuery.or(`user_id.eq.${userId},username.eq.${username || userId}`);
      }

      const { data: events } = await eventQuery;

      const recentActivity = (events || []).map(e => ({
        id: e.id,
        action: e.event_type === 'chapter_read' ? 'Membaca Chapter' : 'Melihat Komik',
        comicTitle: e.comic_title || 'Komik',
        chapterNumber: e.chapter_number,
        createdAt: e.created_at
      }));

      // Count total chapter reads
      const { count: chReads } = await client
        .from(DATABASE_TABLES.ANALYTICS_EVENTS)
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'chapter_read')
        .or(`user_id.eq.${userId},username.eq.${username || userId}`);

      // Count unique comics read
      const { count: cmViews } = await client
        .from(DATABASE_TABLES.ANALYTICS_EVENTS)
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'comic_view')
        .or(`user_id.eq.${userId},username.eq.${username || userId}`);

      return {
        chaptersRead: chReads || 0,
        comicsRead: cmViews || 0,
        bookmarksCount: 0,
        recentActivity
      };
    } catch (_) {
      return defaultStats;
    }
  }

  public static async save(user: User): Promise<{ success: boolean; error?: string; isConfigured: boolean }> {
    if (!isSupabaseConfigured()) return { success: false, isConfigured: false };
    const client = getSupabaseClient();
    if (!client) return { success: false, isConfigured: false };

    try {
      const row = mapUserToDb(user);
      let { error } = await client.from(DATABASE_TABLES.USERS).upsert(row, { onConflict: 'id' });
      
      // If error indicates column does not exist or schema issue, retry with standard base columns
      if (error && (error.message?.includes('column') || (error as any).code === '42703' || error.message?.includes('does not exist'))) {
        const baseRow: Record<string, any> = {
          id: row.id,
          username: row.username,
          email: row.email,
          role: row.role || 'reader',
          package_type: row.package_type || 'vip',
          avatar: row.avatar || '',
          is_active: row.is_active ?? true,
          created_at: row.created_at,
          updated_at: row.updated_at
        };
        const retryRes = await client.from(DATABASE_TABLES.USERS).upsert(baseRow, { onConflict: 'id' });
        error = retryRes.error;
      }

      if (error) {
        logDatabaseError({ table: DATABASE_TABLES.USERS, operation: 'UPSERT', error, details: { userId: user.id, username: user.username } });
        const parsed = parseSupabaseError(error);
        return { success: false, isConfigured: true, error: parsed.userFriendlyMessage };
      }
      return { success: true, isConfigured: true };
    } catch (err: any) {
      logDatabaseError({ table: DATABASE_TABLES.USERS, operation: 'UPSERT', error: err, details: { userId: user.id, username: user.username } });
      return { success: false, isConfigured: true, error: err?.message || 'Network error' };
    }
  }

  public static async delete(id: string): Promise<{ success: boolean; error?: string; isConfigured: boolean }> {
    if (!isSupabaseConfigured()) return { success: false, isConfigured: false };
    const client = getSupabaseClient();
    if (!client) return { success: false, isConfigured: false };

    try {
      const { error } = await client.from(DATABASE_TABLES.USERS).delete().eq('id', id);
      if (error) {
        logDatabaseError({ table: DATABASE_TABLES.USERS, operation: 'DELETE', error, details: { id } });
        const parsed = parseSupabaseError(error);
        return { success: false, isConfigured: true, error: parsed.userFriendlyMessage };
      }
      return { success: true, isConfigured: true };
    } catch (err: any) {
      logDatabaseError({ table: DATABASE_TABLES.USERS, operation: 'DELETE', error: err, details: { id } });
      return { success: false, isConfigured: true, error: err?.message || 'Network error' };
    }
  }
}
