import { Comic, ComicProjectType } from '../types';

/**
 * Checks whether a comic is categorized as 18+ / Mature / Dewasa
 */
export const isComic18Plus = (comic?: Partial<Comic> | null): boolean => {
  if (!comic) return false;

  // Direct property check
  const rawContentType = (comic.contentType || comic.contentRating || '') as string;
  if (
    rawContentType === '18plus' ||
    rawContentType === '18+' ||
    (comic as any).is18Plus === true
  ) {
    return true;
  }

  // Check genres / tags
  const genres = Array.isArray(comic.genres) ? comic.genres : [];
  return genres.some((genre) => {
    const clean = String(genre || '').toLowerCase().trim();
    return (
      clean === '18+' ||
      clean === '18plus' ||
      clean === 'dewasa' ||
      clean === 'hentai' ||
      clean === 'ecchi' ||
      clean === 'mature' ||
      clean === 'r-18' ||
      clean === 'nsfw' ||
      clean.includes('18+')
    );
  });
};

/**
 * Determine whether a comic's cover or preview should be blurred
 * Rule:
 * - If comic is 18+ AND user is NOT logged in (Guest) -> BLURRED
 * - If comic is 18+ AND user IS logged in -> NOT BLURRED
 * - If comic is NOT 18+ -> NEVER BLURRED (Guest and logged in users can see clearly)
 */
export const shouldBlurComic = (comic?: Partial<Comic> | null, isUserAuthenticated: boolean = false): boolean => {
  if (!isComic18Plus(comic)) {
    return false; // Normal comics are never blurred
  }
  return !isUserAuthenticated; // 18+ comics are blurred only for guests
};

/**
 * Identifies the management classification of a comic:
 * 1. 'admin_personal' -> Project Pribadi Admin (Upload/Drive/PDF Internal)
 * 2. 'scraped_ready' -> Scraping Berhasil (MangaDex / Scraper API)
 * 3. 'preview_gateway' -> Preview Gateway Saja (Tautan Luar / External Redirect)
 */
export const getComicProjectType = (comic?: Partial<Comic> | null, chaptersList?: any[]): ComicProjectType => {
  if (!comic) return 'admin_personal';
  if (comic.projectType) return comic.projectType;

  // 1. Preview gateway check
  if (
    comic.hasExternalGateway || 
    (comic.externalUrl && comic.externalUrl.length > 0) ||
    (comic.whereToRead && comic.whereToRead.length > 0) ||
    (chaptersList && chaptersList.length > 0 && chaptersList.every(ch => ch.sourceType === 'external'))
  ) {
    return 'preview_gateway';
  }

  // 2. Scraped ready check
  if (
    comic.mangaDexId ||
    comic.sourceApi === 'mangadex' ||
    comic.sourceApi?.toLowerCase().includes('komikindo') ||
    comic.sourceApi?.toLowerCase().includes('komiktap') ||
    (chaptersList && chaptersList.some(ch => ch.mangadexChapterId || (ch.driveUrl && ch.driveUrl.includes('chapter'))))
  ) {
    return 'scraped_ready';
  }

  // 3. Admin personal project default
  return 'admin_personal';
};

export const getComicProjectTypeLabel = (type: ComicProjectType): { label: string; shortLabel: string; badgeClass: string; icon: string } => {
  switch (type) {
    case 'admin_personal':
      return {
        label: 'Project Pribadi Admin',
        shortLabel: 'Project Admin',
        badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        icon: '👑'
      };
    case 'scraped_ready':
      return {
        label: 'Scraping Berhasil',
        shortLabel: 'Scraping Siap',
        badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        icon: '⚡'
      };
    case 'preview_gateway':
      return {
        label: 'Preview Gateway Saja',
        shortLabel: 'Gateway Mitra',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        icon: '🌐'
      };
    default:
      return {
        label: 'Project Pribadi Admin',
        shortLabel: 'Project Admin',
        badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        icon: '👑'
      };
  }
};

