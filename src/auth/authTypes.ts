import { Session, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { User } from '../features/users/types/user.types';

export interface GoogleAuthUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role?: 'admin' | 'reader' | 'user';
  createdAt?: string;
}

export interface PendingGoogleUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}

export interface AuthResult {
  success: boolean;
  message?: string;
  user?: User;
  needRegistration?: boolean;
  pendingUser?: PendingGoogleUser;
  errorType?: string;
}

export interface AuthDiagnosticInfo {
  provider: 'SUPABASE';
  supabaseAuthStatus: 'CONNECTED' | 'ERROR' | 'UNCONFIGURED';
  sessionStatus: 'ACTIVE' | 'NONE';
  userId: string | null;
  maskedUserId: string | null;
  email: string | null;
  authProvider: string;
  profileStatus: 'FOUND' | 'NOT FOUND' | 'N/A';
  firebaseAuthStatus: 'NOT USED';
  firebaseReferencesInAuthFlow: number;
  lastChecked: string;
  errorDetails?: string | null;
}

export type AuthStateChangeCallback = (
  event: string,
  session: Session | null,
  userProfile: User | null
) => void;
