import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from './client';
import { DATABASE_TABLES } from '../database/databaseContract';
import { mapDbToComic } from '../../features/comics/services/comicMapper';
import { mapDbToChapter } from '../../features/chapters/services/chapterMapper';
import { mapDbToBanner } from '../../features/banners/services/bannerMapper';
import { mapDbToUser } from '../../features/users/services/userMapper';
import { mapDbToDriveAccount } from '../../features/drive/services/driveMapper';
import { mapDbToComment } from '../../features/comments/services/commentMapper';
import { mapDbToAd, mapDbToAdSettings } from '../../features/ads/services/adMapper';
import { Comic, Chapter, Banner, User, DriveAccount, ActivityLog, Comment, AdItem, AdSettings, SystemSettings } from '../../types';

export type RealtimeLifecycleStatus = 
  | 'SUBSCRIBED' 
  | 'CONNECTING' 
  | 'CHANNEL_ERROR' 
  | 'TIMED_OUT' 
  | 'CLOSED' 
  | 'UNCONFIGURED' 
  | 'DISCONNECTED';

export interface RealtimeDiagnosticState {
  status: 'connected' | 'connecting' | 'disconnected';
  lifecycleStatus: RealtimeLifecycleStatus;
  channelName: string;
  subscribedTables: string[];
  lastConnectionAttempt: string | null;
  lastSuccessfulSubscription: string | null;
  lastEvent: { time: string; table: string; type: string; details?: string } | null;
  lastError: string | null;
  retryCount: number;
}

export interface RealtimeCallbacks {
  onComicChange?: (eventType: 'INSERT' | 'UPDATE' | 'DELETE', comic: Comic | { id: string }) => void;
  onChapterChange?: (eventType: 'INSERT' | 'UPDATE' | 'DELETE', chapter: Chapter | { id: string; comicId?: string }) => void;
  onBannerChange?: (eventType: 'INSERT' | 'UPDATE' | 'DELETE', banner: Banner | { id: string }) => void;
  onUserChange?: (eventType: 'INSERT' | 'UPDATE' | 'DELETE', user: User | { id: string }) => void;
  onDriveChange?: (eventType: 'INSERT' | 'UPDATE' | 'DELETE', drive: DriveAccount | { id: string }) => void;
  onLogChange?: (log: ActivityLog) => void;
  onCommentChange?: (eventType: 'INSERT' | 'UPDATE' | 'DELETE', comment: Comment | { id: string }) => void;
  onAdChange?: (eventType: 'INSERT' | 'UPDATE' | 'DELETE', ad: AdItem | { id: string }) => void;
  onAdSettingsChange?: (adSettings: Partial<AdSettings>) => void;
  onSettingsChange?: (settings: Partial<SystemSettings>) => void;
  onStatusChange?: (status: 'connected' | 'connecting' | 'disconnected', diagnostic: RealtimeDiagnosticState) => void;
  onDiagnosticUpdate?: (diagnostic: RealtimeDiagnosticState) => void;
}

const SUBSCRIBED_TABLES_LIST = [
  DATABASE_TABLES.COMICS,
  DATABASE_TABLES.CHAPTERS,
  DATABASE_TABLES.USERS,
  DATABASE_TABLES.BANNERS,
  DATABASE_TABLES.SYSTEM_SETTINGS,
  DATABASE_TABLES.AD_SETTINGS,
  DATABASE_TABLES.DRIVE_ACCOUNTS,
  DATABASE_TABLES.COMMENTS,
  DATABASE_TABLES.ADS
];

class SupabaseRealtimeManager {
  private activeChannel: RealtimeChannel | null = null;
  private activeClient: SupabaseClient | null = null;
  private currentCallbacks: RealtimeCallbacks | null = null;
  private reconnectTimer: any = null;
  private isDestroyed: boolean = false;
  private maxRetries: number = 20;

  private diagnosticState: RealtimeDiagnosticState = {
    status: 'disconnected',
    lifecycleStatus: 'DISCONNECTED',
    channelName: 'komikyuk-realtime-hub',
    subscribedTables: [...SUBSCRIBED_TABLES_LIST],
    lastConnectionAttempt: null,
    lastSuccessfulSubscription: null,
    lastEvent: null,
    lastError: null,
    retryCount: 0
  };

  public getDiagnosticState(): RealtimeDiagnosticState {
    return { ...this.diagnosticState };
  }

  private notifyDiagnostic() {
    if (this.currentCallbacks?.onDiagnosticUpdate) {
      this.currentCallbacks.onDiagnosticUpdate(this.getDiagnosticState());
    }
    if (this.currentCallbacks?.onStatusChange) {
      this.currentCallbacks.onStatusChange(this.diagnosticState.status, this.getDiagnosticState());
    }
  }

  private setStatus(
    status: 'connected' | 'connecting' | 'disconnected',
    lifecycle: RealtimeLifecycleStatus,
    errorMsg: string | null = null
  ) {
    this.diagnosticState.status = status;
    this.diagnosticState.lifecycleStatus = lifecycle;
    if (errorMsg !== null) {
      this.diagnosticState.lastError = errorMsg;
    }
    if (status === 'connected') {
      this.diagnosticState.lastSuccessfulSubscription = new Date().toLocaleTimeString('id-ID');
      this.diagnosticState.lastError = null;
      this.diagnosticState.retryCount = 0;
    }
    this.notifyDiagnostic();
  }

  /**
   * Start or restart Realtime subscription
   */
  public subscribe(callbacks: RealtimeCallbacks): () => void {
    this.isDestroyed = false;
    this.currentCallbacks = callbacks;
    this.diagnosticState.retryCount = 0;

    this.connect();

    return () => {
      this.isDestroyed = true;
      this.cleanup();
      this.setStatus('disconnected', 'CLOSED', 'Subscription unsubscribed by caller');
    };
  }

  /**
   * Manual reconnect trigger
   */
  public reconnect(): void {
    if (this.isDestroyed) {
      this.isDestroyed = false;
    }
    this.diagnosticState.retryCount = 0;
    this.cleanup();
    this.connect();
  }

  private connect(): void {
    if (this.isDestroyed) return;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const client = getSupabaseClient();
    if (!client) {
      console.warn('[RealtimeManager] Client Supabase belum aktif atau URL/Key belum dikonfigurasi.');
      this.setStatus('disconnected', 'UNCONFIGURED', 'Supabase credentials (URL/Anon Key) belum dikonfigurasi.');
      return;
    }

    this.activeClient = client;
    const channelId = `komikyuk-realtime-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    this.diagnosticState.channelName = channelId;
    this.diagnosticState.lastConnectionAttempt = new Date().toLocaleTimeString('id-ID');
    this.setStatus('connecting', 'CONNECTING');

    console.log(`[RealtimeManager] 🔌 Connecting to Supabase Realtime channel "${channelId}"...`);

    try {
      // 1. Clean up any existing channel before creating new one (prevent duplicate subscriptions)
      if (this.activeChannel) {
        try {
          this.activeClient.removeChannel(this.activeChannel);
        } catch (_) {}
        this.activeChannel = null;
      }

      // 2. Create channel with all postgres_changes listeners
      const channel = client.channel(channelId);

      // COMICS
      channel.on('postgres_changes', { event: '*', schema: 'public', table: DATABASE_TABLES.COMICS }, (payload: any) => {
        const time = new Date().toLocaleTimeString('id-ID');
        this.diagnosticState.lastEvent = { time, table: 'comics', type: payload.eventType, details: payload.new?.id || payload.old?.id };
        this.notifyDiagnostic();
        if (this.currentCallbacks?.onComicChange) {
          if (payload.eventType === 'DELETE') {
            this.currentCallbacks.onComicChange('DELETE', { id: payload.old?.id || '' });
          } else if (payload.new) {
            this.currentCallbacks.onComicChange(payload.eventType, mapDbToComic(payload.new));
          }
        }
      });

      // CHAPTERS
      channel.on('postgres_changes', { event: '*', schema: 'public', table: DATABASE_TABLES.CHAPTERS }, (payload: any) => {
        const time = new Date().toLocaleTimeString('id-ID');
        this.diagnosticState.lastEvent = { time, table: 'chapters', type: payload.eventType, details: payload.new?.id || payload.old?.id };
        this.notifyDiagnostic();
        if (this.currentCallbacks?.onChapterChange) {
          if (payload.eventType === 'DELETE') {
            this.currentCallbacks.onChapterChange('DELETE', { id: payload.old?.id || '', comicId: payload.old?.comic_id });
          } else if (payload.new) {
            this.currentCallbacks.onChapterChange(payload.eventType, mapDbToChapter(payload.new));
          }
        }
      });

      // BANNERS
      channel.on('postgres_changes', { event: '*', schema: 'public', table: DATABASE_TABLES.BANNERS }, (payload: any) => {
        const time = new Date().toLocaleTimeString('id-ID');
        this.diagnosticState.lastEvent = { time, table: 'banners', type: payload.eventType, details: payload.new?.id || payload.old?.id };
        this.notifyDiagnostic();
        if (this.currentCallbacks?.onBannerChange) {
          if (payload.eventType === 'DELETE') {
            this.currentCallbacks.onBannerChange('DELETE', { id: payload.old?.id || '' });
          } else if (payload.new) {
            this.currentCallbacks.onBannerChange(payload.eventType, mapDbToBanner(payload.new));
          }
        }
      });

      // USERS
      channel.on('postgres_changes', { event: '*', schema: 'public', table: DATABASE_TABLES.USERS }, (payload: any) => {
        const time = new Date().toLocaleTimeString('id-ID');
        this.diagnosticState.lastEvent = { time, table: 'users', type: payload.eventType, details: payload.new?.id || payload.old?.id };
        this.notifyDiagnostic();
        if (this.currentCallbacks?.onUserChange) {
          if (payload.eventType === 'DELETE') {
            this.currentCallbacks.onUserChange('DELETE', { id: payload.old?.id || '' });
          } else if (payload.new) {
            this.currentCallbacks.onUserChange(payload.eventType, mapDbToUser(payload.new));
          }
        }
      });

      // SYSTEM SETTINGS
      channel.on('postgres_changes', { event: '*', schema: 'public', table: DATABASE_TABLES.SYSTEM_SETTINGS }, (payload: any) => {
        const time = new Date().toLocaleTimeString('id-ID');
        this.diagnosticState.lastEvent = { time, table: 'system_settings', type: payload.eventType };
        this.notifyDiagnostic();
        if (this.currentCallbacks?.onSettingsChange && payload.new) {
          this.currentCallbacks.onSettingsChange({
            siteName: payload.new.site_name,
            siteAnnouncement: payload.new.announcement,
            maintenanceMode: Boolean(payload.new.maintenance_mode),
            siteLogo: payload.new.site_logo,
            siteFavicon: payload.new.site_favicon
          });
        }
      });

      // AD SETTINGS
      channel.on('postgres_changes', { event: '*', schema: 'public', table: DATABASE_TABLES.AD_SETTINGS }, (payload: any) => {
        const time = new Date().toLocaleTimeString('id-ID');
        this.diagnosticState.lastEvent = { time, table: 'ad_settings', type: payload.eventType };
        this.notifyDiagnostic();
        if (this.currentCallbacks?.onAdSettingsChange && payload.new) {
          this.currentCallbacks.onAdSettingsChange(mapDbToAdSettings(payload.new));
        }
      });

      // DRIVE ACCOUNTS
      channel.on('postgres_changes', { event: '*', schema: 'public', table: DATABASE_TABLES.DRIVE_ACCOUNTS }, (payload: any) => {
        const time = new Date().toLocaleTimeString('id-ID');
        this.diagnosticState.lastEvent = { time, table: 'drive_accounts', type: payload.eventType, details: payload.new?.id || payload.old?.id };
        this.notifyDiagnostic();
        if (this.currentCallbacks?.onDriveChange) {
          if (payload.eventType === 'DELETE') {
            this.currentCallbacks.onDriveChange('DELETE', { id: payload.old?.id || '' });
          } else if (payload.new) {
            this.currentCallbacks.onDriveChange(payload.eventType, mapDbToDriveAccount(payload.new));
          }
        }
      });

      // COMMENTS
      channel.on('postgres_changes', { event: '*', schema: 'public', table: DATABASE_TABLES.COMMENTS }, (payload: any) => {
        const time = new Date().toLocaleTimeString('id-ID');
        this.diagnosticState.lastEvent = { time, table: 'comments', type: payload.eventType, details: payload.new?.id || payload.old?.id };
        this.notifyDiagnostic();
        if (this.currentCallbacks?.onCommentChange) {
          if (payload.eventType === 'DELETE') {
            this.currentCallbacks.onCommentChange('DELETE', { id: payload.old?.id || '' });
          } else if (payload.new) {
            this.currentCallbacks.onCommentChange(payload.eventType, mapDbToComment(payload.new));
          }
        }
      });

      // ADS
      channel.on('postgres_changes', { event: '*', schema: 'public', table: DATABASE_TABLES.ADS }, (payload: any) => {
        const time = new Date().toLocaleTimeString('id-ID');
        this.diagnosticState.lastEvent = { time, table: 'ads', type: payload.eventType, details: payload.new?.id || payload.old?.id };
        this.notifyDiagnostic();
        if (this.currentCallbacks?.onAdChange) {
          if (payload.eventType === 'DELETE') {
            this.currentCallbacks.onAdChange('DELETE', { id: payload.old?.id || '' });
          } else if (payload.new) {
            this.currentCallbacks.onAdChange(payload.eventType, mapDbToAd(payload.new));
          }
        }
      });

      this.activeChannel = channel;

      // 3. Subscribe with lifecycle observation
      channel.subscribe((status, err) => {
        console.log(`[RealtimeManager] 📡 Lifecycle event received: "${status}"`, err ? { error: err } : '');

        if (status === 'SUBSCRIBED') {
          // CRITICAL: UI only displays CONNECTED when status is strictly SUBSCRIBED
          this.setStatus('connected', 'SUBSCRIBED');
          console.log(`[RealtimeManager] ✅ Successfully SUBSCRIBED to Supabase Realtime channel "${channelId}"!`);
        } else if (status === 'CHANNEL_ERROR') {
          const errDetail = err?.message || (err ? String(err) : 'Supabase Realtime socket error (periksa koneksi jaringan atau publikasi tabel)');
          console.error(`[RealtimeManager] ❌ CHANNEL_ERROR:`, errDetail);
          this.setStatus('disconnected', 'CHANNEL_ERROR', errDetail);
          this.scheduleReconnect();
        } else if (status === 'TIMED_OUT') {
          const errDetail = 'Koneksi subscription timeout (Supabase Realtime server tidak merespons handshake)';
          console.warn(`[RealtimeManager] ⏱️ TIMED_OUT:`, errDetail);
          this.setStatus('disconnected', 'TIMED_OUT', errDetail);
          this.scheduleReconnect();
        } else if (status === 'CLOSED') {
          const errDetail = this.diagnosticState.lastError || 'Channel realtime ditutup (CLOSED)';
          console.warn(`[RealtimeManager] 🔒 CLOSED:`, errDetail);
          this.setStatus('disconnected', 'CLOSED', errDetail);
          this.scheduleReconnect();
        }
      });

    } catch (err: any) {
      const msg = err?.message || String(err);
      console.error('[RealtimeManager] Subscription initialization error:', err);
      this.setStatus('disconnected', 'CHANNEL_ERROR', msg);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.isDestroyed) return;

    if (this.diagnosticState.retryCount >= this.maxRetries) {
      console.warn(`[RealtimeManager] Batas maksimal retry (${this.maxRetries}) tercapai. Menunggu revalidasi manual atau event online.`);
      return;
    }

    this.diagnosticState.retryCount++;
    // Exponential backoff with jitter: 2s, ~4s, ~7s, ~12s up to 30s max
    const backoffMs = Math.min(
      Math.floor(1500 * Math.pow(1.6, this.diagnosticState.retryCount - 1) + Math.random() * 800),
      30000
    );

    console.log(`[RealtimeManager] 🔄 Reconnecting in ${(backoffMs / 1000).toFixed(1)}s (Attempt #${this.diagnosticState.retryCount})...`);

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isDestroyed) {
        this.connect();
      }
    }, backoffMs);
  }

  private cleanup(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.activeChannel && this.activeClient) {
      try {
        this.activeClient.removeChannel(this.activeChannel);
      } catch (_) {}
      this.activeChannel = null;
    }
  }
}

export const realtimeManager = new SupabaseRealtimeManager();
