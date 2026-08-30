export type UserStatus = 'active' | 'locked' | 'expired' | 'inactive';
export type DurationType = '1_day' | '3_days' | '30_days' | '1_year' | 'unlimited' | 'lifetime' | 'custom';
export type PlanType = 'plan_15k_all' | 'plan_5k_single' | 'custom' | 'none';
export type AccessType = 'all' | 'specific';

export interface UserStats {
  comicsRead: number;
  chaptersRead: number;
  daysActive: number;
}

export interface User {
  id: string;
  uid?: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  username: string;
  password?: string;
  passwordHash?: string;
  role: 'admin' | 'reader' | 'user';
  status: UserStatus;
  createdAt: string;
  firstLoginAt?: string | null;
  expiresAt?: string | null;
  durationType?: DurationType;
  failedAttempts?: number;
  avatar?: string;
  tier?: 'Free Tier' | 'Pro Member' | 'Premium';
  isVip?: boolean;
  bio?: string;
  stats?: UserStats;
  planType?: PlanType;
  accessType?: AccessType;
  allowedComicIds?: string[];
  priceNote?: string;
  notes?: string;
}

export type UserAccount = User;

export interface GoogleUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

export interface LoginHistoryItem {
  id: string;
  userId: string;
  username: string;
  timestamp: string;
  ipAddress: string;
  status: 'success' | 'failed';
  reason?: string;
}
