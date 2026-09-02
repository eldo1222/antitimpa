import { User } from '../features/users/types/user.types';
import { GoogleAuthUser } from './authTypes';

export const ADMIN_EMAILS: string[] = [
  'jefaruan627@gmail.com',
  'admin@email.com',
  'eldorivaldo8@gmail.com',
  'admin@antitimpa.id',
  'eldoa@gmail.com'
];

/**
 * Check if given email belongs to a Super Admin
 */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

/**
 * Check if the user is authenticated as Admin
 */
export function isAdminUser(user?: User | null, googleUser?: GoogleAuthUser | null): boolean {
  if (user?.role === 'admin') return true;
  if (googleUser?.role === 'admin') return true;
  if (isAdminEmail(user?.email) || isAdminEmail(googleUser?.email)) return true;
  if (user?.username?.toLowerCase() === 'admin') return true;
  return false;
}

/**
 * Check if user is logged in
 */
export function isAuthenticatedUser(user?: User | null, googleUser?: GoogleAuthUser | null): boolean {
  return Boolean(user || googleUser);
}

/**
 * Check if user has VIP status
 */
export function isVipReader(user?: User | null): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.tier === 'Premium' || user.tier === 'Pro Member') return true;
  if (user.planType === 'plan_15k_all') return true;
  if (user.isVip === true) return true;
  return false;
}
