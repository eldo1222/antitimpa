/**
 * Centralized Synchronization Service for AntiTimpa
 * Connects frontend instances (Chrome, Firefox, Mobile, etc.) to the central server database.
 * Supports Server-Sent Events (SSE) and fast REST synchronization.
 */

import { Comic, Chapter, User, Banner, ActivityLog, SystemSettings, DriveAccount, Comment, AdItem, AdSettings } from '../types';

export interface CentralDatabaseState {
  comics: Comic[];
  chapters: Record<string, Chapter[]>;
  users: User[];
  banners: Banner[];
  driveAccounts: DriveAccount[];
  activityLogs: ActivityLog[];
  systemSettings: SystemSettings;
  comments: Comment[];
  ads: AdItem[];
  adSettings: AdSettings;
  version: number;
}

type SyncCallback = (data: Partial<CentralDatabaseState>) => void;

class CentralSyncService {
  private listeners: Set<SyncCallback> = new Set();
  private eventSource: EventSource | null = null;
  private pollInterval: any = null;
  private lastVersion: number = 0;

  // Start Realtime SSE and Polling Fallback
  public startSync(callback: SyncCallback): () => void {
    this.listeners.add(callback);

    // Initial immediate fetch from centralized server database
    this.fetchFullDatabase();

    // Setup SSE for zero-latency multi-browser synchronization
    this.setupSSE();

    // Fallback polling every 4 seconds in case SSE disconnects or proxy issues
    if (!this.pollInterval) {
      this.pollInterval = setInterval(() => {
        this.checkForUpdates();
      }, 4000);
    }

    return () => {
      this.listeners.delete(callback);
      if (this.listeners.size === 0) {
        this.stopSync();
      }
    };
  }

  private stopSync() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private setupSSE() {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;

    try {
      if (this.eventSource) {
        this.eventSource.close();
      }

      this.eventSource = new EventSource('/api/data/stream');

      this.eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload && payload.data) {
            this.lastVersion = payload.data.version || Date.now();
            this.notifyListeners(payload.data);
          }
        } catch (e) {
          // ignore parsing errors
        }
      };

      this.eventSource.onerror = () => {
        // SSE will automatically retry; fallback polling keeps data in sync
      };
    } catch (e) {
      console.warn('[CentralSync] SSE not available, using fallback polling:', e);
    }
  }

  private async checkForUpdates() {
    try {
      const res = await fetch(`/api/data/version?v=${this.lastVersion}`);
      if (!res.ok) return;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return;
      const data = await res.json();
      if (data && data.hasUpdate) {
        await this.fetchFullDatabase();
      }
    } catch (e) {
      // ignore
    }
  }

  public async fetchFullDatabase(): Promise<CentralDatabaseState | null> {
    try {
      const res = await fetch('/api/data');
      if (!res.ok) return null;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return null;
      const state: CentralDatabaseState = await res.json();
      if (state) {
        this.lastVersion = state.version || Date.now();
        this.notifyListeners(state);
        return state;
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  private notifyListeners(data: Partial<CentralDatabaseState>) {
    this.listeners.forEach(cb => {
      try {
        cb(data);
      } catch (err) {
        console.error('[CentralSync] Error in sync listener callback:', err);
      }
    });
  }

  // --- REST Mutation Methods ---

  public async saveComic(comic: Comic): Promise<boolean> {
    try {
      const res = await fetch('/api/data/comics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(comic)
      });
      return res.ok;
    } catch (e) {
      console.warn('[CentralSync] saveComic failed:', e);
      return false;
    }
  }

  public async deleteComic(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/data/comics/${id}`, {
        method: 'DELETE'
      });
      return res.ok;
    } catch (e) {
      console.warn('[CentralSync] deleteComic failed:', e);
      return false;
    }
  }

  public async batchDeleteComics(ids: string[]): Promise<boolean> {
    try {
      const res = await fetch('/api/data/comics/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      return res.ok;
    } catch (e) {
      console.warn('[CentralSync] batchDeleteComics failed:', e);
      return false;
    }
  }

  public async saveChapter(chapter: Chapter): Promise<boolean> {
    try {
      const res = await fetch('/api/data/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chapter)
      });
      return res.ok;
    } catch (e) {
      console.warn('[CentralSync] saveChapter failed:', e);
      return false;
    }
  }

  public async deleteChapter(comicId: string, chapterId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/data/chapters/${comicId}/${chapterId}`, {
        method: 'DELETE'
      });
      return res.ok;
    } catch (e) {
      console.warn('[CentralSync] deleteChapter failed:', e);
      return false;
    }
  }

  public async saveUser(user: User): Promise<boolean> {
    try {
      const res = await fetch('/api/data/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      return res.ok;
    } catch (e) {
      console.warn('[CentralSync] saveUser failed:', e);
      return false;
    }
  }

  public async deleteUser(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/data/users/${id}`, {
        method: 'DELETE'
      });
      return res.ok;
    } catch (e) {
      console.warn('[CentralSync] deleteUser failed:', e);
      return false;
    }
  }

  public async saveBanner(banner: Banner): Promise<boolean> {
    try {
      const res = await fetch('/api/data/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(banner)
      });
      return res.ok;
    } catch (e) {
      console.warn('[CentralSync] saveBanner failed:', e);
      return false;
    }
  }

  public async deleteBanner(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/data/banners/${id}`, {
        method: 'DELETE'
      });
      return res.ok;
    } catch (e) {
      console.warn('[CentralSync] deleteBanner failed:', e);
      return false;
    }
  }

  public async saveSettings(settings: SystemSettings): Promise<boolean> {
    try {
      const res = await fetch('/api/data/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      return res.ok;
    } catch (e) {
      console.warn('[CentralSync] saveSettings failed:', e);
      return false;
    }
  }

  public async saveDriveAccount(drive: DriveAccount): Promise<boolean> {
    try {
      const res = await fetch('/api/data/drives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(drive)
      });
      return res.ok;
    } catch (e) {
      console.warn('[CentralSync] saveDriveAccount failed:', e);
      return false;
    }
  }

  public async deleteDriveAccount(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/data/drives/${id}`, {
        method: 'DELETE'
      });
      return res.ok;
    } catch (e) {
      console.warn('[CentralSync] deleteDriveAccount failed:', e);
      return false;
    }
  }

  public async saveComment(comment: Comment): Promise<boolean> {
    try {
      const res = await fetch('/api/data/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(comment)
      });
      return res.ok;
    } catch (e) {
      console.warn('[CentralSync] saveComment failed:', e);
      return false;
    }
  }

  public async deleteComment(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/data/comments/${id}`, {
        method: 'DELETE'
      });
      return res.ok;
    } catch (e) {
      console.warn('[CentralSync] deleteComment failed:', e);
      return false;
    }
  }

  public async saveAds(ads: AdItem[], adSettings: AdSettings): Promise<boolean> {
    try {
      const res = await fetch('/api/data/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ads, adSettings })
      });
      return res.ok;
    } catch (e) {
      console.warn('[CentralSync] saveAds failed:', e);
      return false;
    }
  }

  public async logActivity(log: ActivityLog): Promise<boolean> {
    try {
      const res = await fetch('/api/data/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log)
      });
      return res.ok;
    } catch (e) {
      console.warn('[CentralSync] logActivity failed:', e);
      return false;
    }
  }
}

export const centralSync = new CentralSyncService();
