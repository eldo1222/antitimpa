import { ChapterSourceType, ExternalSource } from '../../comics/types/comic.types';

export interface ComicPage {
  id: string;
  pageNumber: number;
  imageUrl: string;
  caption?: string;
}

export interface Chapter {
  id: string;
  comicId: string;
  chapterNumber: number;
  title: string;
  slug?: string;
  releaseDate: string;
  isNew?: boolean;
  isLocked?: boolean;
  sourceType?: ChapterSourceType;
  pdfUrl?: string;
  pdfFileName?: string;
  driveUrl?: string;
  driveEmbedUrl?: string;
  driveFileId?: string;
  driveAccountId?: string;
  driveNotes?: string;
  pages?: ComicPage[] | string[];
  customPages?: string[];
  pageCount?: number;
  viewsCount?: number;
  mangadexChapterId?: string;
  mangadexMangaId?: string;
  externalUrl?: string;
  externalPlatform?: string;
  externalSources?: ExternalSource[];
  externalNote?: string;
  createdAt?: string;
  updatedAt?: string;
}
