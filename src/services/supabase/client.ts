import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseCredentials, formatSupabaseUrl, formatSupabaseKey } from './config';

let supabaseInstance: SupabaseClient | null = null;
let lastUsedUrl = '';
let lastUsedKey = '';

export function createSupabaseClientDirect(url: string, anonKey: string): SupabaseClient | null {
  const formattedUrl = formatSupabaseUrl(url);
  const formattedKey = formatSupabaseKey(anonKey);

  if (!formattedUrl || !formattedKey || !formattedUrl.startsWith('http')) {
    return null;
  }

  try {
    return createClient(formattedUrl, formattedKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      db: {
        schema: 'public',
      },
    });
  } catch (error) {
    console.warn('[Supabase] Failed to initialize Supabase client:', error);
    return null;
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseCredentials();

  if (!url || !anonKey) {
    return null;
  }

  // Reuse existing instance if config unchanged
  if (supabaseInstance && url === lastUsedUrl && anonKey === lastUsedKey) {
    return supabaseInstance;
  }

  const client = createSupabaseClientDirect(url, anonKey);
  if (client) {
    supabaseInstance = client;
    lastUsedUrl = url;
    lastUsedKey = anonKey;
  }
  return supabaseInstance;
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(url && anonKey && url.startsWith('http'));
}

export function resetSupabaseClientInstance(): void {
  supabaseInstance = null;
  lastUsedUrl = '';
  lastUsedKey = '';
}

export async function testSupabaseConnection(rawUrl?: string, rawKey?: string): Promise<{
  success: boolean;
  message: string;
  latency?: number;
}> {
  const url = rawUrl !== undefined ? formatSupabaseUrl(rawUrl) : getSupabaseCredentials().url;
  const anonKey = rawKey !== undefined ? formatSupabaseKey(rawKey) : getSupabaseCredentials().anonKey;

  if (!url || !anonKey) {
    return {
      success: false,
      message: 'Supabase URL dan Anon Key belum diisi. Silakan masukkan Project URL & Anon Key di formulir database.',
    };
  }

  if (!url.startsWith('https://') && !url.startsWith('http://')) {
    return {
      success: false,
      message: 'Format URL tidak valid. Pastikan diawali dengan https:// (contoh: https://xyzcompany.supabase.co)',
    };
  }

  const start = performance.now();
  try {
    const client = createSupabaseClientDirect(url, anonKey);
    if (!client) {
      return {
        success: false,
        message: 'Gagal membuat Supabase client dengan URL dan Anon Key tersebut.',
      };
    }

    // Ping test on comics table
    const { error } = await client.from('comics').select('id').limit(1);
    const latency = Math.round(performance.now() - start);

    if (error) {
      if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return {
          success: false,
          latency,
          message: `Terhubung ke Supabase (${latency}ms), namun tabel 'comics' belum ada. Silakan salin & jalankan kode SQL Schema di SQL Editor Supabase Dashboard.`,
        };
      }
      if (error.message?.includes('Invalid API key') || error.code === 'PGRST301' || error.message?.includes('JWT')) {
        return {
          success: false,
          latency,
          message: `Anon Key tidak valid atau telah kedaluwarsa. Periksa kembali anon public key di Supabase Dashboard.`,
        };
      }
      return {
        success: false,
        latency,
        message: `Koneksi ditolak oleh Supabase: ${error.message} (Code: ${error.code || 'UNKNOWN'})`,
      };
    }

    return {
      success: true,
      latency,
      message: `Koneksi Supabase Sukses! Database PostgreSQL siap digunakan tanpa batas kuota harian.`,
    };
  } catch (err: any) {
    const latency = Math.round(performance.now() - start);
    return {
      success: false,
      latency,
      message: `Gagal menghubungkan ke Supabase: ${err.message || err}`,
    };
  }
}
