import { User } from '../types/user.types';

export function mapUserToDb(u: Partial<User>): Record<string, any> {
  const row: Record<string, any> = {};
  if (u.id !== undefined) row.id = u.id;
  if (u.username !== undefined) row.username = u.username;
  if (u.email !== undefined) {
    row.email = u.email || `${(u.username || 'user').toLowerCase()}@antitimpa.id`;
  } else if (u.username) {
    row.email = `${u.username.toLowerCase()}@antitimpa.id`;
  }
  if (u.displayName !== undefined) row.display_name = u.displayName;
  if (u.phone !== undefined || u.phoneNumber !== undefined) {
    row.phone = u.phone || u.phoneNumber || '';
    row.phone_number = u.phone || u.phoneNumber || '';
  }
  if (u.bio !== undefined) row.bio = u.bio;
  if (u.passwordHash !== undefined) row.password_hash = u.passwordHash;
  if (u.role !== undefined) row.role = u.role;
  if (u.planType !== undefined || u.tier !== undefined) {
    row.package_type = u.planType === 'plan_15k_all' || u.tier === 'Premium' ? 'vip' : 'free';
  }
  if (u.avatar !== undefined || u.photoURL !== undefined) {
    row.avatar = u.avatar || u.photoURL;
  }
  if (u.status !== undefined) {
    row.status = u.status;
    row.is_active = u.status === 'active';
  }
  if (u.durationType !== undefined) row.duration_type = u.durationType;
  if (u.allowedComicIds !== undefined) row.allowed_comic_ids = u.allowedComicIds;
  if (u.priceNote !== undefined) row.price_note = u.priceNote;
  if (u.expiresAt !== undefined) row.expires_at = u.expiresAt;
  if (u.firstLoginAt !== undefined) row.first_login_at = u.firstLoginAt;
  if (u.failedAttempts !== undefined) row.failed_attempts = u.failedAttempts;
  if (u.createdAt !== undefined) row.created_at = u.createdAt;
  row.updated_at = new Date().toISOString();
  return row;
}

export function mapDbToUser(u: Record<string, any>): User {
  const phoneVal = u.phone || u.phone_number || '';
  return {
    id: u.id,
    username: u.username || 'user',
    displayName: u.display_name || u.displayName || u.username || '',
    email: u.email || '',
    phone: phoneVal,
    phoneNumber: phoneVal,
    bio: u.bio || '',
    passwordHash: u.password_hash || '',
    role: u.role || 'reader',
    status: (u.status || (u.is_active === false ? 'inactive' : 'active')),
    avatar: u.avatar || '',
    photoURL: u.avatar || '',
    tier: u.role === 'admin' ? 'Premium' : (u.package_type === 'vip' ? 'Premium' : 'Free Tier'),
    planType: (u.plan_type || (u.package_type === 'vip' ? 'plan_15k_all' : 'plan_5k_single')),
    accessType: (u.access_type || (u.package_type === 'vip' ? 'all' : (u.allowed_comic_ids && u.allowed_comic_ids.length > 0 ? 'specific' : 'all'))),
    durationType: u.duration_type || 'unlimited',
    allowedComicIds: Array.isArray(u.allowed_comic_ids) ? u.allowed_comic_ids : (u.allowed_comic_ids ? JSON.parse(u.allowed_comic_ids) : []),
    priceNote: u.price_note || '',
    expiresAt: u.expires_at || null,
    firstLoginAt: u.first_login_at || null,
    failedAttempts: typeof u.failed_attempts === 'number' ? u.failed_attempts : (u.failedAttempts || 0),
    createdAt: u.created_at || new Date().toISOString(),
  };
}
