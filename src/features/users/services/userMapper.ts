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
  if (u.passwordHash !== undefined) row.password_hash = u.passwordHash;
  if (u.role !== undefined) row.role = u.role;
  if (u.planType !== undefined || u.tier !== undefined) {
    row.package_type = u.planType === 'plan_15k_all' || u.tier === 'Premium' ? 'vip' : 'free';
  }
  if (u.avatar !== undefined || u.photoURL !== undefined) {
    row.avatar = u.avatar || u.photoURL;
  }
  if (u.status !== undefined) {
    row.is_active = u.status === 'active';
  }
  if (u.createdAt !== undefined) row.created_at = u.createdAt;
  row.updated_at = new Date().toISOString();
  return row;
}

export function mapDbToUser(u: Record<string, any>): User {
  return {
    id: u.id,
    username: u.username || 'user',
    email: u.email || '',
    passwordHash: u.password_hash || '',
    role: u.role || 'reader',
    status: (u.is_active === false ? 'inactive' : 'active'),
    avatar: u.avatar || '',
    photoURL: u.avatar || '',
    tier: u.role === 'admin' ? 'Premium' : (u.package_type === 'vip' ? 'Premium' : 'Free Tier'),
    planType: (u.package_type === 'vip' ? 'plan_15k_all' : 'plan_5k_single'),
    accessType: (u.package_type === 'vip' ? 'all' : 'specific'),
    durationType: 'unlimited',
    failedAttempts: 0,
    createdAt: u.created_at || new Date().toISOString(),
  };
}
