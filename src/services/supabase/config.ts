/**
 * Supabase configuration, environment loaders, and credential formats
 */

// In-memory runtime cache for credentials
let runtimeSupabaseUrl = '';
let runtimeSupabaseKey = '';

// Helper to clean & format Supabase URL
export function formatSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let cleaned = rawUrl.trim();
  // Strip quotes if pasted with quotes
  cleaned = cleaned.replace(/^["']|["']$/g, '').trim();
  // Ensure protocol
  if (cleaned && !cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `https://${cleaned}`;
  }
  // Strip trailing slashes or path suffixes like /rest/v1
  cleaned = cleaned.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
  return cleaned;
}

// Helper to clean & format Anon Key
export function formatSupabaseKey(rawKey: string): string {
  if (!rawKey) return '';
  let cleaned = rawKey.trim();
  // Strip surrounding quotes
  cleaned = cleaned.replace(/^["']|["']$/g, '').trim();
  // Remove whitespace/newlines
  cleaned = cleaned.replace(/\s+/g, '');
  return cleaned;
}

// Async initialization promise to fetch universal configuration from server
let configFetchPromise: Promise<{ url: string; anonKey: string }> | null = null;

export async function fetchUniversalSupabaseConfig(): Promise<{ url: string; anonKey: string }> {
  // 1. Check if Vite client-side environment variables are directly available
  const envUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) || '';
  const envKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) || '';
  if (envUrl && envKey) {
    runtimeSupabaseUrl = formatSupabaseUrl(envUrl);
    runtimeSupabaseKey = formatSupabaseKey(envKey);
    return { url: runtimeSupabaseUrl, anonKey: runtimeSupabaseKey };
  }

  if (runtimeSupabaseUrl && runtimeSupabaseKey) {
    return { url: runtimeSupabaseUrl, anonKey: runtimeSupabaseKey };
  }

  if (configFetchPromise) return configFetchPromise;

  configFetchPromise = (async () => {
    try {
      const res = await fetch('/api/supabase-config', { 
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url && data.anonKey) {
          runtimeSupabaseUrl = formatSupabaseUrl(data.url);
          runtimeSupabaseKey = formatSupabaseKey(data.anonKey);
          return { url: runtimeSupabaseUrl, anonKey: runtimeSupabaseKey };
        }
      }
    } catch (e) {
      console.warn('[Supabase Config] Unable to fetch /api/supabase-config:', e);
    }
    
    // Reset promise cache after 3 seconds to allow retry if config not yet available
    setTimeout(() => {
      if (!runtimeSupabaseUrl || !runtimeSupabaseKey) {
        configFetchPromise = null;
      }
    }, 3000);

    return getSupabaseCredentials();
  })();

  return configFetchPromise;
}

// Automatically trigger background fetch of universal Supabase config
if (typeof window !== 'undefined') {
  fetchUniversalSupabaseConfig().catch(() => {});
}

// Retrieve Supabase URL & Anon Key from Environment or Runtime cache
export function getSupabaseCredentials(): { url: string; anonKey: string } {
  let url = runtimeSupabaseUrl;
  let anonKey = runtimeSupabaseKey;

  if (!url || !anonKey) {
    try {
      const envUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) || '';
      const envKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) || '';
      if (envUrl) url = envUrl;
      if (envKey) anonKey = envKey;
    } catch (_) {}
  }

  return { 
    url: formatSupabaseUrl(url), 
    anonKey: formatSupabaseKey(anonKey) 
  };
}

export function saveCustomSupabaseConfig(rawUrl: string, rawKey: string) {
  const url = formatSupabaseUrl(rawUrl);
  const anonKey = formatSupabaseKey(rawKey);

  runtimeSupabaseUrl = url;
  runtimeSupabaseKey = anonKey;
}

export function clearCustomSupabaseConfig() {
  runtimeSupabaseUrl = '';
  runtimeSupabaseKey = '';
}
