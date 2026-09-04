import { Session, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { getSupabaseClient } from '../services/supabase/client';
import { UserRepository } from '../features/users/services/userRepository';
import { User } from '../features/users/types/user.types';
import { AuthResult, GoogleAuthUser, PendingGoogleUser } from './authTypes';
import { signInWithGoogleOAuth, mapSupabaseAuthUserToGoogleUser, createDefaultUserProfileFromAuth } from './googleAuth';
import { getCurrentSession, initAuthSessionListener } from './authSession';
import { isAdminEmail } from './authGuards';

export class AuthService {
  /**
   * Start Google OAuth sign-in flow via Supabase Auth
   */
  public static async signInWithGoogle(options?: { redirectTo?: string }): Promise<AuthResult> {
    const client = getSupabaseClient();
    if (!client) {
      return {
        success: false,
        message: 'Supabase client belum terhubung. Pastikan URL dan Anon Key sudah benar.'
      };
    }

    const { error } = await signInWithGoogleOAuth(options);
    if (error) {
      console.warn('[AuthService] Google OAuth error:', error);
      return {
        success: false,
        message: error.message || 'Gagal memulai login Google melalui Supabase Auth.'
      };
    }

    return {
      success: true,
      message: 'Mengarahkan ke Google Sign-In...'
    };
  }

  /**
   * Sign out from Supabase Auth
   */
  public static async signOut(): Promise<{ success: boolean; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: true };

    try {
      const { error } = await client.auth.signOut();
      if (error) {
        console.warn('[AuthService] Sign out notice:', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      console.warn('[AuthService] Sign out exception:', err);
      return { success: false, error: err?.message || 'Network error' };
    }
  }

  /**
   * Syncs Supabase Auth user identity with application public.users table.
   * If record in public.users doesn't exist, it creates a new public.users profile.
   * If existing record exists, it updates role if necessary and returns the record.
   */
  public static async linkOrCreatePublicUserProfile(authUser: SupabaseAuthUser): Promise<User> {
    const authEmail = (authUser.email || '').toLowerCase();
    const isSuperAdmin = isAdminEmail(authEmail);

    // 1. Check existing user in public.users by ID or Email
    try {
      const { data: allUsers } = await UserRepository.getAll();
      const existing = allUsers.find(
        u => u.id === authUser.id || (u.email && u.email.toLowerCase() === authEmail)
      );

      if (existing) {
        let needsUpdate = false;
        const updated: User = { ...existing };

        // Ensure ID is synchronized to Supabase Auth UUID if not already
        if (updated.id !== authUser.id) {
          updated.id = authUser.id;
          updated.uid = authUser.id;
          needsUpdate = true;
        }

        // Elevate to admin role if email belongs to super admin
        if (isSuperAdmin && updated.role !== 'admin') {
          updated.role = 'admin';
          updated.tier = 'Premium';
          needsUpdate = true;
        }

        // Always grant Google users Full 15K Unlimited Access
        if (updated.planType !== 'plan_15k_all' || updated.accessType !== 'all' || !updated.isVip) {
          updated.planType = 'plan_15k_all';
          updated.accessType = 'all';
          updated.durationType = 'unlimited';
          updated.tier = 'Premium';
          updated.isVip = true;
          updated.priceNote = 'Paket 15K Unlimited (Full Akses Semua Komik)';
          updated.allowedComicIds = [];
          needsUpdate = true;
        }

        // Update photoURL if missing
        const metaPhoto = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture;
        if (metaPhoto && (!updated.avatar || !updated.photoURL)) {
          updated.avatar = metaPhoto;
          updated.photoURL = metaPhoto;
          needsUpdate = true;
        }

        if (needsUpdate) {
          await UserRepository.save(updated);
          try {
            await fetch('/api/data/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updated)
            });
          } catch (_) {}
        }

        return updated;
      }
    } catch (err) {
      console.warn('[AuthService] Failed to query existing public.users:', err);
    }

    // 2. Profile not found -> Create brand new public.users record
    const newProfile = createDefaultUserProfileFromAuth(authUser);
    try {
      await UserRepository.save(newProfile);
      try {
        await fetch('/api/data/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newProfile)
        });
      } catch (_) {}
    } catch (err) {
      console.warn('[AuthService] Failed to auto-save new user profile:', err);
    }

    return newProfile;
  }

  /**
   * Complete custom Google registration if user provides manual username & password
   */
  public static async registerUserWithProfile(
    profileData: User
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const res = await UserRepository.save(profileData);
      if (!res.success) {
        return { success: false, error: res.error || 'Gagal menyimpan data pengguna ke Supabase.' };
      }
      return { success: true, user: profileData };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Gagal registrasi akun.' };
    }
  }
}
