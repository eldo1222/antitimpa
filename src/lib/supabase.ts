import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve Supabase URL & Anon Key from Environment or Local Storage Configuration
export function getSupabaseCredentials(): { url: string; anonKey: string } {
  let url = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) || '';
  let anonKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) || '';

  // Also check if admin configured custom Supabase credentials in LocalStorage
  if (!url || !anonKey) {
    try {
      const customConfig = localStorage.getItem('antitimpa_custom_supabase_config');
      if (customConfig) {
        const parsed = JSON.parse(customConfig);
        if (parsed.url && parsed.anonKey) {
          url = parsed.url;
          anonKey = parsed.anonKey;
        }
      }
    } catch (_) {}
  }

  return { url: url.trim(), anonKey: anonKey.trim() };
}

let supabaseInstance: SupabaseClient | null = null;
let lastUsedUrl = '';
let lastUsedKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseCredentials();

  if (!url || !anonKey) {
    return null;
  }

  // Reuse existing instance if config unchanged
  if (supabaseInstance && url === lastUsedUrl && anonKey === lastUsedKey) {
    return supabaseInstance;
  }

  try {
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      },
      db: {
        schema: 'public'
      }
    });
    lastUsedUrl = url;
    lastUsedKey = anonKey;
    return supabaseInstance;
  } catch (error) {
    console.warn('[Supabase] Failed to initialize Supabase client:', error);
    return null;
  }
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(url && anonKey && url.startsWith('http'));
}

export function saveCustomSupabaseConfig(url: string, anonKey: string) {
  try {
    localStorage.setItem('antitimpa_custom_supabase_config', JSON.stringify({ url: url.trim(), anonKey: anonKey.trim() }));
    supabaseInstance = null; // force re-creation
  } catch (_) {}
}

export function clearCustomSupabaseConfig() {
  try {
    localStorage.removeItem('antitimpa_custom_supabase_config');
    supabaseInstance = null;
  } catch (_) {}
}
