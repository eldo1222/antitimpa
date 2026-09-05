// ==============================================================================
// KOMIKINDO TYPES & DATA CONTRACTS
// Shared across client, server, and remote scraper worker
// ==============================================================================

export type KomikindoScrapeStatus = 
  | 'KOMIKINDO_OK' 
  | 'KOMIKINDO_FETCH_FAILED' 
  | 'KOMIKINDO_PARSER_FAILED' 
  | 'KOMIKINDO_SEARCH_EMPTY'
  | 'KOMIKINDO_UPSTREAM_BLOCKED'
  | 'KOMIKINDO_REMOTE_UNAVAILABLE'
  | 'KOMIKINDO_BLOCKED_BY_UPSTREAM_FROM_VERCEL';

export interface KomikindoSearchResult {
  title: string;
  slug: string;
  url: string;
  coverImage: string;
  comicType: 'manga' | 'manhwa' | 'manhua' | 'doujin';
  contentType: 'normal' | '18plus';
  rating: number;
  latestChapter: string;
  sourceApi: string;
}

export interface KomikindoChapterItem {
  chapterNumber: number;
  title: string;
  url: string;
  slug: string;
  releaseDate: string;
}

export interface KomikindoComicDetail {
  title: string;
  altTitle: string;
  slug: string;
  url: string;
  coverImage: string;
  bannerImage: string;
  synopsis: string;
  genres: string[];
  status: 'ongoing' | 'completed';
  comicType: 'manga' | 'manhwa' | 'manhua' | 'doujin';
  contentType: 'normal' | '18plus';
  storyWriter: string;
  artist: string;
  rating: number;
  totalChapters: number;
  chapters: KomikindoChapterItem[];
  sourceApi: string;
}

export interface KomikindoDiagnostics {
  targetUrl: string;
  httpMethod: string;
  httpStatus: number | null;
  contentType: string | null;
  htmlLength: number;
  parserMatches: number;
  redirected: boolean;
  redirectCount: number;
  finalUrl: string;
  userAgent: string;
  referer: string;
  parserStrategy: string;
  challengeDetected: boolean;
  requestTime: string;
  durationMs: number;
  verdict: 'OK' | 'FETCH_FAILED' | 'PARSER_FAILED' | 'SEARCH_EMPTY' | 'BLOCKED_BY_UPSTREAM';
  runtime: 'vercel_serverless' | 'express_dev' | 'remote_worker';
}

export interface KomikindoScrapeResult {
  status: KomikindoScrapeStatus;
  data: KomikindoSearchResult[];
  total: number;
  page: number;
  query: string;
  category: string;
  error?: string;
  message?: string;
  diagnostics: KomikindoDiagnostics;
  executionMode?: 'direct' | 'remote_worker';
}

export interface KomikindoDiagnosticResponse {
  timestamp: string;
  verdict: 'WORKING' | 'BLOCKED_BY_UPSTREAM' | 'PARSER_BROKEN' | 'NETWORK_ERROR';
  status: string;
  summary: string;
  durationMs: number;
  runtime: string;
  probes: {
    homepage: Partial<KomikindoDiagnostics>;
    search: Partial<KomikindoDiagnostics>;
    detail: {
      url: string;
      httpStatus: number | null;
      titleFound: string | null;
      rawChaptersFound: number;
      sampleChapters: string[];
      parserWorking: boolean;
    };
  };
  recommendations: string[];
}

export interface KomikindoChapterPagesResult {
  pages: Array<{
    id: string;
    pageNumber: number;
    imageUrl: string;
    fallbackUrl: string;
    directUrl: string;
  }>;
  nextUrl: string;
  prevUrl: string;
  total: number;
}

// -----------------------------------------------------------------------------
// Scraper Request & Import Contracts
// -----------------------------------------------------------------------------

export interface KomikindoSearchRequest {
  query?: string;
  category?: string;
  page?: number;
  order?: string;
}

export interface KomikindoDetailRequest {
  slug?: string;
  url?: string;
}

export interface KomikindoChapterRequest {
  url?: string;
  slug?: string;
  maxRetries?: number;
}

export interface KomikindoImportRequest {
  comicUrl?: string;
  slug?: string;
  includeChapters?: boolean;
  includeImages?: boolean;
  maxChapters?: number;
  concurrency?: number;
}

export interface KomikindoImportResponse {
  ok: boolean;
  source: 'komikindo';
  stage: 'complete' | 'partial' | 'failed';
  comicCount: number;
  chapterCount: number;
  imageCount: number;
  comic?: any;
  chapters?: any[];
  errors: string[];
  durationMs: number;
  execution: 'direct_server';
}
