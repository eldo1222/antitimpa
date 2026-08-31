import { Session, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { getSupabaseClient } from '../services/supabase/client';

/**
 * Register listener for Supabase authentication state changes
 */
export function initAuthSessionListener(
  callback: (event: string, session: Session | null) => void
): () => void {
  const client = getSupabaseClient();
  if (!client) {
    return () => {};
  }

  const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
    try {
      callback(event, session);
    } catch (err) {
      console.warn('[AuthSession] Callback error:', err);
    }
  });

  return () => {
    subscription.unsubscribe();
  };
}

/**
 * Fetch the current active Supabase Auth session
 */
export async function getCurrentSession(): Promise<Session | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data: { session }, error } = await client.auth.getSession();
    if (error) {
      console.warn('[AuthSession] Failed to get session:', error);
      return null;
    }
    return session;
  } catch (err) {
    console.warn('[AuthSession] Session retrieval error:', err);
    return null;
  }
}

/**
 * Fetch currently authenticated user from Supabase Auth
 */
export async function getCurrentAuthUser(): Promise<SupabaseAuthUser | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data: { user }, error } = await client.auth.getUser();
    if (error) {
      return null;
    }
    return user;
  } catch (err) {
    return null;
  }
}

/**
 * Refresh current Supabase Auth session token
 */
export async function refreshSession(): Promise<Session | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data: { session }, error } = await client.auth.refreshSession();
    if (error) {
      console.warn('[AuthSession] Token refresh error:', error);
      return null;
    }
    return session;
  } catch (err) {
    console.warn('[AuthSession] Refresh session exception:', err);
    return null;
  }
}
