import { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { getSupabaseClient } from '../services/supabase/client';
import { GoogleAuthUser, PendingGoogleUser } from './authTypes';
import { isAdminEmail } from './authGuards';
import { User } from '../features/users/types/user.types';

/**
 * Initiate Google OAuth sign-in flow via Supabase Auth
 */
export async function signInWithGoogleOAuth(options?: {
  redirectTo?: string;
  queryParams?: Record<string, string>;
}): Promise<{ data: { provider: string; url: string | null } | null; error: any }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      data: null,
      error: new Error('Supabase client belum terkonfigurasi. Periksa kredensial VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.')
    };
  }

  // Calculate clean redirectTo destination
  const defaultRedirect = typeof window !== 'undefined' ? window.location.origin : '';
  const redirectTo = options?.redirectTo || defaultRedirect;

  try {
    const response = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
          ...options?.queryParams
        }
      }
    });

    return response;
  } catch (err) {
    console.error('[GoogleAuth] OAuth initiation failed:', err);
    return { data: null, error: err };
  }
}

/**
 * Maps Supabase Auth user metadata into GoogleAuthUser
 */
export function mapSupabaseAuthUserToGoogleUser(authUser: SupabaseAuthUser): GoogleAuthUser {
  const email = (authUser.email || '').toLowerCase();
  const metadata = authUser.user_metadata || {};
  const displayName = metadata.full_name || metadata.name || metadata.user_name || email.split('@')[0] || 'User Google';
  const photoURL = metadata.avatar_url || metadata.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=ff5b14&color=fff&bold=true`;
  const role = isAdminEmail(email) ? 'admin' : 'reader';

  return {
    uid: authUser.id,
    email,
    displayName,
    photoURL,
    role,
    createdAt: authUser.created_at
  };
}

/**
 * Convert Supabase Auth user into an application User profile
 */
export function createDefaultUserProfileFromAuth(authUser: SupabaseAuthUser, customUsername?: string): User {
  const email = (authUser.email || '').toLowerCase();
  const metadata = authUser.user_metadata || {};
  const rawUsername = customUsername || metadata.user_name || (metadata.full_name ? metadata.full_name.replace(/\s+/g, '_').toLowerCase() : email.split('@')[0]);
  const cleanUsername = rawUsername.replace(/[^a-zA-Z0-9_.-]/g, '') || `user_${Date.now().toString(36)}`;
  const displayName = metadata.full_name || metadata.name || cleanUsername;
  const photoURL = metadata.avatar_url || metadata.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=ff5b14&color=fff&bold=true`;
  const isSuperAdmin = isAdminEmail(email) || cleanUsername.toLowerCase() === 'admin';
  const role = isSuperAdmin ? 'admin' : 'reader';
  const now = new Date().toISOString();

  return {
    id: authUser.id,
    uid: authUser.id,
    email,
    username: cleanUsername,
    displayName,
    photoURL,
    avatar: photoURL,
    role,
    status: 'active',
    durationType: 'unlimited',
    tier: 'Premium',
    planType: 'plan_15k_all',
    accessType: 'all',
    isVip: true,
    priceNote: 'Paket 15K Unlimited (Full Akses Semua Komik)',
    allowedComicIds: [],
    loginMethod: 'google',
    provider: 'google',
    bio: 'Penggemar Komik AntiTimpa',
    createdAt: now,
    firstLoginAt: now,
    failedAttempts: 0,
    stats: {
      comicsRead: 0,
      chaptersRead: 0,
      daysActive: 1
    }
  };
}
