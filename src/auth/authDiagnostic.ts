import { getSupabaseClient, isSupabaseConfigured } from '../services/supabase/client';
import { AuthDiagnosticInfo } from './authTypes';
import { UserRepository } from '../features/users/services/userRepository';

/**
 * Mask sensitive user ID for secure display in diagnostic panels
 */
export function maskUserId(id?: string | null): string | null {
  if (!id) return null;
  if (id.length <= 8) return '****';
  return `${id.substring(0, 4)}****${id.substring(id.length - 4)}`;
}

/**
 * Run diagnostic check on Supabase Auth status & session
 */
export async function getAuthDiagnostic(): Promise<AuthDiagnosticInfo> {
  const now = new Date().toLocaleTimeString('id-ID');

  if (!isSupabaseConfigured()) {
    return {
      provider: 'SUPABASE',
      supabaseAuthStatus: 'UNCONFIGURED',
      sessionStatus: 'NONE',
      userId: null,
      maskedUserId: null,
      email: null,
      authProvider: 'none',
      profileStatus: 'N/A',
      firebaseAuthStatus: 'NOT USED',
      firebaseReferencesInAuthFlow: 0,
      lastChecked: now,
      errorDetails: 'Supabase credentials belum dikonfigurasi di VITE_SUPABASE_URL.'
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      provider: 'SUPABASE',
      supabaseAuthStatus: 'ERROR',
      sessionStatus: 'NONE',
      userId: null,
      maskedUserId: null,
      email: null,
      authProvider: 'none',
      profileStatus: 'N/A',
      firebaseAuthStatus: 'NOT USED',
      firebaseReferencesInAuthFlow: 0,
      lastChecked: now,
      errorDetails: 'Gagal membuat Supabase client instance.'
    };
  }

  try {
    const { data: { session }, error } = await client.auth.getSession();

    if (error) {
      return {
        provider: 'SUPABASE',
        supabaseAuthStatus: 'ERROR',
        sessionStatus: 'NONE',
        userId: null,
        maskedUserId: null,
        email: null,
        authProvider: 'none',
        profileStatus: 'N/A',
        firebaseAuthStatus: 'NOT USED',
        firebaseReferencesInAuthFlow: 0,
        lastChecked: now,
        errorDetails: error.message
      };
    }

    if (!session || !session.user) {
      return {
        provider: 'SUPABASE',
        supabaseAuthStatus: 'CONNECTED',
        sessionStatus: 'NONE',
        userId: null,
        maskedUserId: null,
        email: null,
        authProvider: 'none',
        profileStatus: 'N/A',
        firebaseAuthStatus: 'NOT USED',
        firebaseReferencesInAuthFlow: 0,
        lastChecked: now
      };
    }

    const authUser = session.user;
    const provider = authUser.app_metadata?.provider || 'google';

    // Verify if profile exists in public.users
    let profileFound = false;
    try {
      const allUsers = await UserRepository.getAll();
      profileFound = allUsers.data.some(
        u => u.id === authUser.id || (u.email && u.email.toLowerCase() === authUser.email?.toLowerCase())
      );
    } catch (_) {}

    return {
      provider: 'SUPABASE',
      supabaseAuthStatus: 'CONNECTED',
      sessionStatus: 'ACTIVE',
      userId: authUser.id,
      maskedUserId: maskUserId(authUser.id),
      email: authUser.email || null,
      authProvider: provider,
      profileStatus: profileFound ? 'FOUND' : 'NOT FOUND',
      firebaseAuthStatus: 'NOT USED',
      firebaseReferencesInAuthFlow: 0,
      lastChecked: now
    };
  } catch (err: any) {
    return {
      provider: 'SUPABASE',
      supabaseAuthStatus: 'ERROR',
      sessionStatus: 'NONE',
      userId: null,
      maskedUserId: null,
      email: null,
      authProvider: 'none',
      profileStatus: 'N/A',
      firebaseAuthStatus: 'NOT USED',
      firebaseReferencesInAuthFlow: 0,
      lastChecked: now,
      errorDetails: err?.message || String(err)
    };
  }
}
