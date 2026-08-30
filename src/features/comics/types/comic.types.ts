export type ComicStatus = 'ongoing' | 'completed' | 'Ongoing' | 'Completed' | 'Hiatus';
export type ChapterSourceType = 'images' | 'pdf' | 'drive' | 'external';
export type ComicContentType = 'normal' | '18plus';
export type ComicCategoryType = 'manga' | 'manhwa' | 'manhua' | 'doujin' | 'comic' | 'webtoon';
export type ComicType = ComicCategoryType;
export type ContentRating = ComicContentType;
export type ComicProjectType = 'admin_personal' | 'scraped_ready' | 'preview_gateway';

export interface ExternalSource {
  id?: string;
  name?: string;
  platform?: string;
  url: string;
  type?: 'read' | 'watch' | 'raw' | 'official' | 'mirror' | 'database';
  language?: string;
  quality?: string;
  isFree?: boolean;
  notes?: string;
  badge?: string;
}

export interface Comic {
  id: string;
  title: string;
  slug: string;
  coverImage: string;
  bannerImage?: string;
  synopsis: string;
  genres: string[];
  status: ComicStatus;
  storyWriter: string;
  artist: string;
  author?: string;
  rating: number;
  ratingCount: number;
  totalChapters: number;
  totalReaders?: number;
  totalViews?: number;
  createdAt: string;
  updatedAt: string;
  isTrending?: boolean;
  isFeatured?: boolean;
  primaryDriveAccountId?: string;
  tiktokPromoNote?: string;
  contentType?: ComicContentType;
  contentRating?: ContentRating;
  comicType?: ComicCategoryType;
  type?: ComicCategoryType;
  isFree?: boolean;
  isVisibleOnHome?: boolean;
  showOnHome?: boolean;
  isPublished?: boolean;
  sourceUrl?: string;
  sourceApi?: string;
  mangaDexId?: string;
  externalUrl?: string;
  externalLinks?: ExternalSource[];
  whereToRead?: ExternalSource[];
  hasExternalGateway?: boolean;
  projectType?: ComicProjectType;
}
