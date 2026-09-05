/**
 * Safe, Privacy-Friendly Session & Device Identification for Analytics
 * Strictly NO invasive browser fingerprinting (canvas, WebGL, audio, etc.)
 */

const SESSION_STORAGE_KEY = 'antitimpa_analytics_session_id';

export function getOrCreateSessionId(): string {
  try {
    let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionId) {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        sessionId = `sess_${crypto.randomUUID()}`;
      } else {
        sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      }
      localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    }
    return sessionId;
  } catch (_) {
    return `sess_temp_${Date.now()}`;
  }
}

export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) {
    return 'tablet';
  }
  if (/mobile|iphone|ipod|android.*mobile|blackberry|iemobile|opera mini/i.test(ua) || window.innerWidth < 768) {
    return 'mobile';
  }
  return 'desktop';
}

// In-memory deduplication cache: prevents duplicate event firing within 45 seconds for same target
const eventDedupeCache = new Map<string, number>();
const DEDUPE_WINDOW_MS = 45000;

export function shouldTrackEvent(eventType: string, targetId: string): boolean {
  const key = `${eventType}:${targetId}`;
  const now = Date.now();
  const lastTracked = eventDedupeCache.get(key) || 0;
  
  if (now - lastTracked < DEDUPE_WINDOW_MS) {
    return false; // Suppress duplicate
  }
  
  eventDedupeCache.set(key, now);
  
  // Clean up cache periodically
  if (eventDedupeCache.size > 500) {
    for (const [k, timestamp] of eventDedupeCache.entries()) {
      if (now - timestamp > DEDUPE_WINDOW_MS) {
        eventDedupeCache.delete(k);
      }
    }
  }
  
  return true;
}
