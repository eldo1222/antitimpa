export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  targetComicId?: string;
  linkComicId?: string;
  badgeText?: string;
  badge?: string;
  order?: number;
  priority?: number;
  isActive: boolean;
}
