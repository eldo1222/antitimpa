// ==============================================================================
// KOMIKINDO HTML PARSER UTILITIES
// Pure parsing logic independent of React, Express, or runtime environment
// ==============================================================================

export const KOMIKINDO_BASE_URL = 'https://komikindo.ch';

export const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'id,en-US;q=0.9,en;q=0.8',
  'Referer': `${KOMIKINDO_BASE_URL}/`
};

export function cleanHtmlText(text: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#038;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanComicTitle(title: string): string {
  const cleaned = cleanHtmlText(title);
  return cleaned.replace(/^komik\s+/i, '').trim();
}

export function normalizeChapterUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl, KOMIKINDO_BASE_URL);
    parsed.search = '';
    parsed.hash = '';
    let pathname = parsed.pathname.toLowerCase();
    if (!pathname.endsWith('/')) pathname += '/';
    return `${parsed.protocol}//${parsed.hostname}${pathname}`;
  } catch (_) {
    return rawUrl.trim().toLowerCase();
  }
}
