// ==============================================================================
// KOMIKTAP SCRAPER & API PROXY (Komiktap.info)
// Scrapes comic catalog, metadata, chapters list, and chapter image pages
// Base Domain: https://komiktap.info/
// Comic URL: https://komiktap.info/manga/:slug/
// Chapter URL: https://komiktap.info/:slug-chapter-:number/
// ==============================================================================

const KOMIKTAP_BASE_URL = 'https://komiktap.info';

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'id,en-US;q=0.9,en;q=0.8',
  'Referer': `${KOMIKTAP_BASE_URL}/`
};

export interface KomiktapSearchResult {
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

export interface KomiktapChapterItem {
  chapterNumber: number;
  title: string;
  url: string;
  slug: string;
  releaseDate: string;
}

export interface KomiktapComicDetail {
  title: string;
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
  chapters: KomiktapChapterItem[];
  sourceApi: string;
}

/**
 * Searches Komiktap catalog or browse by order/category
 */
export async function scrapeKomiktapSearch(
  query = '',
  category = 'all',
  page = 1,
  order = 'popular'
): Promise<KomiktapSearchResult[]> {
  const cleanQuery = String(query || '').trim();
  let targetUrl = '';

  if (cleanQuery) {
    targetUrl = `${KOMIKTAP_BASE_URL}/?s=${encodeURIComponent(cleanQuery)}`;
  } else {
    let orderParam = 'popular';
    if (category === 'latest' || order === 'update' || order === 'latest') {
      orderParam = 'update';
    } else if (order === 'popular' || category === 'popular' || category === 'all') {
      orderParam = 'popular';
    }

    let typeParam = '';
    if (category === 'manhwa') typeParam = '&type=manhwa';
    else if (category === 'manga') typeParam = '&type=manga';
    else if (category === 'manhua') typeParam = '&type=manhua';

    targetUrl = `${KOMIKTAP_BASE_URL}/manga/?order=${orderParam}${typeParam}&page=${page}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  const res = await fetch(targetUrl, {
    headers: DEFAULT_HEADERS,
    signal: controller.signal
  });
  clearTimeout(timeout);

  if (!res.ok) {
    throw new Error(`Komiktap returned HTTP ${res.status}`);
  }

  const html = await res.text();
  const results: KomiktapSearchResult[] = [];

  // Match each manga card: <div class="bsx">
  const cardRegex = /<div class=[\"']bsx[\"']>([\s\S]*?)<\/div>\s*<\/div>/gi;
  let match;

  while ((match = cardRegex.exec(html)) !== null) {
    const cardHtml = match[1];

    const linkMatch = cardHtml.match(/<a href=[\"']([^\"']+)[\"'](?:\s+title=[\"']([^\"']+)[\"'])?/i);
    const rawUrl = linkMatch?.[1] || '';
    const rawTitle = linkMatch?.[2] || cardHtml.match(/<div class=[\"']tt[\"']>([\s\S]*?)<\/div>/i)?.[1]?.replace(/<[^>]+>/g, '').trim() || '';

    if (!rawUrl || !rawTitle) continue;

    // Extract slug from URL e.g. https://komiktap.info/manga/irodori-kazoku/ -> irodori-kazoku
    const slug = rawUrl.replace(/\/$/, '').split('/').pop() || '';

    // Extract cover image
    const imgMatch = cardHtml.match(/<img[^>]+src=[\"']([^\"']+)[\"']/i);
    const coverImage = imgMatch?.[1] || '';

    // Extract type (Manga / Manhwa / Manhua)
    const typeMatch = cardHtml.match(/<span class=[\"']type\s+([^\"']+)[\"']/i);
    const rawType = (typeMatch?.[1] || '').toLowerCase();
    let comicType: 'manga' | 'manhwa' | 'manhua' | 'doujin' = 'manga';
    if (rawType.includes('manhwa')) comicType = 'manhwa';
    else if (rawType.includes('manhua')) comicType = 'manhua';
    else if (rawType.includes('doujin')) comicType = 'doujin';

    // Extract latest chapter
    const epMatch = cardHtml.match(/<div class=[\"']epxs[\"']>([^<]+)<\/div>/i);
    const latestChapter = epMatch?.[1]?.trim() || '';

    // Extract rating score
    const scoreMatch = cardHtml.match(/<div class=[\"']numscore[\"']>([^<]+)<\/div>/i);
    const rating = scoreMatch ? Math.min(5, Math.max(0, (parseFloat(scoreMatch[1]) || 8.5) / 2)) : 4.8;

    results.push({
      title: rawTitle.replace(/&#8217;/g, "'").replace(/&amp;/g, '&'),
      slug,
      url: rawUrl,
      coverImage,
      comicType,
      contentType: '18plus',
      rating,
      latestChapter,
      sourceApi: 'Komiktap API (Komiktap.info)'
    });
  }

  return results;
}

/**
 * Scrapes full comic metadata and chapter list from Komiktap detail page
 * Target URL: https://komiktap.info/manga/:slug/
 */
export async function scrapeKomiktapDetail(slugOrUrl: string): Promise<KomiktapComicDetail> {
  let targetUrl = slugOrUrl;
  let slug = slugOrUrl;

  if (slugOrUrl.startsWith('http://') || slugOrUrl.startsWith('https://')) {
    targetUrl = slugOrUrl;
    slug = slugOrUrl.replace(/\/$/, '').split('/').pop() || '';
  } else {
    slug = slugOrUrl.replace(/^\/|\/$/g, '');
    targetUrl = `${KOMIKTAP_BASE_URL}/manga/${slug}/`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 14000);

  const res = await fetch(targetUrl, {
    headers: DEFAULT_HEADERS,
    signal: controller.signal
  });
  clearTimeout(timeout);

  if (!res.ok) {
    throw new Error(`Komiktap comic detail returned HTTP ${res.status}`);
  }

  const html = await res.text();

  // Title
  const title = (
    html.match(/<h1[^>]*class=[\"']entry-title[\"'][^>]*>(.*?)<\/h1>/i)?.[1] ||
    html.match(/<h1[^>]*>(.*?)<\/h1>/i)?.[1] ||
    slug
  ).replace(/<[^>]+>/g, '').replace(/&#8217;/g, "'").replace(/&amp;/g, '&').trim();

  // Cover image
  const coverImage = (
    html.match(/<img[^>]+itemprop=[\"']image[\"'][^>]+src=[\"']([^\"']+)[\"']/i)?.[1] ||
    html.match(/<div class=[\"']thumb[\"'][^>]*>[\s\S]*?<img[^>]+src=[\"']([^\"']+)[\"']/i)?.[1] ||
    ''
  );

  // Banner image (fallback to cover image if not distinct)
  const bannerMatch = html.match(/<div class=[\"']bigbanner[\"'][^>]*style=[\"'][^\"']*url\(([^)]+)\)/i);
  const bannerImage = bannerMatch ? bannerMatch[1].replace(/['\"]/g, '') : coverImage;

  // Synopsis
  const synMatch = (
    html.match(/<div class=[\"']entry-content entry-content-single[\"'][^>]*itemprop=[\"']description[\"']>([\s\S]*?)<\/div>/i) ||
    html.match(/<div class=[\"']entry-content entry-content-single[\"'][^>]*>([\s\S]*?)<\/div>/i) ||
    html.match(/<div class=[\"']synp[\"'][^>]*>([\s\S]*?)<\/div>/i)
  );
  const synopsis = synMatch ? synMatch[1].replace(/<[^>]+>/g, '').replace(/&#8217;/g, "'").replace(/&amp;/g, '&').trim() : '';

  // Status
  const statusRaw = (
    html.match(/<b>Status:<\/b>\s*([^<]+)/i)?.[1] ||
    html.match(/Status<\/i>\s*<span>([^<]+)<\/span>/i)?.[1] ||
    html.match(/Status<\/td><td>([^<]+)<\/td>/i)?.[1] ||
    'Ongoing'
  ).toLowerCase();
  const status: 'ongoing' | 'completed' = statusRaw.includes('completed') ? 'completed' : 'ongoing';

  // Comic Type
  const typeRaw = (
    html.match(/<b>Type:<\/b>\s*([^<]+)/i)?.[1] ||
    html.match(/Type<\/i>\s*<span>([^<]+)<\/span>/i)?.[1] ||
    html.match(/Type<\/td><td>([^<]+)<\/td>/i)?.[1] ||
    ''
  ).toLowerCase();
  let comicType: 'manga' | 'manhwa' | 'manhua' | 'doujin' = 'manhwa';
  if (typeRaw.includes('manga')) comicType = 'manga';
  else if (typeRaw.includes('manhua')) comicType = 'manhua';
  else if (typeRaw.includes('doujin')) comicType = 'doujin';

  // Author / Artist
  const authorMatch = (
    html.match(/<b>Author:<\/b>\s*([^<]+)/i)?.[1] ||
    html.match(/Author<\/i>\s*<span>([^<]+)<\/span>/i)?.[1] ||
    html.match(/Author<\/td><td>([^<]+)<\/td>/i)?.[1] ||
    ''
  ).trim();

  const artistMatch = (
    html.match(/<b>Artist:<\/b>\s*([^<]+)/i)?.[1] ||
    html.match(/Artist<\/i>\s*<span>([^<]+)<\/span>/i)?.[1] ||
    html.match(/Artist<\/td><td>([^<]+)<\/td>/i)?.[1] ||
    authorMatch
  ).trim();

  // Genres
  const genres: string[] = [];
  const genreRegex = /<a[^>]+href=[\"']https:\/\/komiktap\.info\/genres\/([^\"']+)\/\"[^>]*>([^<]+)<\/a>/gi;
  let gMatch;
  while ((gMatch = genreRegex.exec(html)) !== null) {
    const gName = gMatch[2].trim();
    if (gName && !genres.includes(gName)) {
      genres.push(gName);
    }
  }

function normalizeChapterUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl, 'https://komiktap.info');
    parsed.search = '';
    parsed.hash = '';
    let pathname = parsed.pathname.toLowerCase();
    if (!pathname.endsWith('/')) pathname += '/';
    return `${parsed.protocol}//${parsed.hostname}${pathname}`;
  } catch (_) {
    return rawUrl.trim().toLowerCase();
  }
}

  // Chapters list
  // Structure: <li data-num="1"><div class="chbox"><div class="eph-num"><a href="https://komiktap.info/irodori-kazoku-chapter-1/"><span class="chapternum">Chapter 1</span><span class="chapterdate">Agustus 31, 2026</span>
  const rawChapters: KomiktapChapterItem[] = [];
  const chRegex = /<li[^>]*data-num=[\"']([^\"']+)[\"'][\s\S]*?<a href=[\"']([^\"']+)[\"'][\s\S]*?<span class=[\"']chapternum[\"']>([^<]+)<\/span>(?:[\s\S]*?<span class=[\"']chapterdate[\"']>([^<]+)<\/span>)?/gi;
  let cMatch;

  while ((cMatch = chRegex.exec(html)) !== null) {
    const rawNum = cMatch[1];
    const chUrl = cMatch[2];
    const chTitle = cMatch[3]?.trim() || `Chapter ${rawNum}`;
    const chDate = cMatch[4]?.trim() || '';

    const canonicalUrl = normalizeChapterUrl(chUrl);
    const chSlug = canonicalUrl.replace(/\/$/, '').split('/').pop() || '';
    
    // Support decimals like 2.5, 191.2, etc.
    let parsedNum = parseFloat(rawNum);
    if (isNaN(parsedNum)) {
      const matchNum = chTitle.match(/\b\d+(?:\.\d+)?\b/);
      parsedNum = matchNum ? parseFloat(matchNum[0]) : rawChapters.length + 1;
    }

    rawChapters.push({
      chapterNumber: parsedNum,
      title: chTitle,
      url: canonicalUrl,
      slug: chSlug,
      releaseDate: chDate
    });
  }

  // Deduplicate by canonical source URL first
  const urlMap = new Map<string, KomiktapChapterItem>();
  let duplicateUrlsRemoved = 0;
  for (const ch of rawChapters) {
    if (urlMap.has(ch.url)) {
      duplicateUrlsRemoved++;
      continue;
    }
    urlMap.set(ch.url, ch);
  }
  const uniqueUrlChapters = Array.from(urlMap.values());

  // Disambiguate duplicate numbers if different URLs share the same chapter number
  const seenChapterNums = new Map<number, number>();
  const chapters: KomiktapChapterItem[] = [];
  for (const ch of uniqueUrlChapters) {
    let finalNum = ch.chapterNumber;
    let finalTitle = ch.title;
    if (seenChapterNums.has(finalNum)) {
      const count = seenChapterNums.get(finalNum)! + 1;
      seenChapterNums.set(finalNum, count);
      finalNum = Number((finalNum + count * 0.1).toFixed(2));
      if (!finalTitle.includes('(')) {
        finalTitle = `${finalTitle} (Part ${count + 1})`;
      }
    } else {
      seenChapterNums.set(finalNum, 0);
    }
    chapters.push({
      ...ch,
      chapterNumber: finalNum,
      title: finalTitle
    });
  }

  console.log(`[KOMIKTAP CHAPTER DISCOVERY AUDIT]`, {
    rawFound: rawChapters.length,
    uniqueUrls: uniqueUrlChapters.length,
    duplicateUrlsRemoved,
    finalChapters: chapters.length
  });

  // Ensure chapters are sorted in ascending order (Ch 1 first, Ch N last)
  chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);

  return {
    title,
    slug,
    url: targetUrl,
    coverImage,
    bannerImage,
    synopsis,
    genres: genres.length > 0 ? genres : ['Manhwa 18+', 'Doujin', 'Romance'],
    status,
    comicType,
    contentType: '18plus',
    storyWriter: authorMatch || 'Komiktap Creator',
    artist: artistMatch || authorMatch || 'Komiktap Artist',
    rating: 4.9,
    totalChapters: chapters.length,
    chapters,
    sourceApi: 'Komiktap API (Komiktap.info)'
  };
}

/**
 * Scrapes image pages from a Komiktap chapter page
 * Target URL: https://komiktap.info/:slug-chapter-:number/
 * Uses ts_reader.run JSON payload embedded in the page
 */
export async function scrapeKomiktapChapterPages(chapterUrlOrSlug: string, maxRetries = 3): Promise<{
  pages: Array<{ id: string; pageNumber: number; imageUrl: string; fallbackUrl: string; directUrl: string }>;
  nextUrl: string;
  prevUrl: string;
  total: number;
}> {
  let targetUrl = chapterUrlOrSlug;

  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    const clean = chapterUrlOrSlug.replace(/^\/|\/$/g, '');
    targetUrl = `${KOMIKTAP_BASE_URL}/${clean}/`;
  }

  let html = '';
  let attempt = 0;
  let lastError: any = null;

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(targetUrl, {
        headers: DEFAULT_HEADERS,
        signal: controller.signal
      });
      clearTimeout(timeout);

      // Fast-fail permanent client errors
      if (res.status === 404 || res.status === 403) {
        throw new Error(`Komiktap chapter reader returned permanent HTTP ${res.status}`);
      }

      if (!res.ok) {
        // Transient error (5xx, 429) -> trigger retry
        if (attempt < maxRetries) {
          const backoff = attempt * 600;
          await new Promise(r => setTimeout(r, backoff));
          continue;
        }
        throw new Error(`Komiktap chapter reader returned HTTP ${res.status}`);
      }

      html = await res.text();
      break;
    } catch (err: any) {
      clearTimeout(timeout);
      lastError = err;
      if (err.message?.includes('permanent HTTP')) {
        throw err;
      }
      if (attempt >= maxRetries) {
        throw new Error(`Komiktap chapter fetch failed after ${attempt} attempts: ${err.message}`);
      }
      const backoff = attempt * 600;
      await new Promise(r => setTimeout(r, backoff));
    }
  }

  if (!html) {
    throw lastError || new Error('Empty response from Komiktap chapter reader');
  }

  let rawImages: string[] = [];
  let nextUrl = '';
  let prevUrl = '';

  // 1. Extract from ts_reader.run(...)
  const match = html.match(/ts_reader\.run\s*\(\s*(\{[\s\S]*?\})\s*\)\s*;?/i);
  if (match) {
    try {
      const data = JSON.parse(match[1]);
      nextUrl = data.nextUrl || '';
      prevUrl = data.prevUrl || '';

      if (data.sources && Array.isArray(data.sources)) {
        for (const src of data.sources) {
          if (Array.isArray(src.images) && src.images.length > 0) {
            rawImages = src.images;
            break;
          }
        }
      }
    } catch (e) {
      // Fallback JSON-like array extraction from the script block
      const imagesMatch = match[1].match(/["']images["']\s*:\s*(\[[^\]]+\])/i) || match[1].match(/\bimages\s*:\s*(\[[^\]]+\])/i);
      if (imagesMatch) {
        try {
          const parsedArr = JSON.parse(imagesMatch[1].replace(/'/g, '"'));
          if (Array.isArray(parsedArr)) {
            rawImages = parsedArr;
          }
        } catch (_) {
          const urlMatches = imagesMatch[1].matchAll(/["'](https?:[^"']+)["']/g);
          for (const u of urlMatches) {
            rawImages.push(u[1]);
          }
        }
      }
    }
  }

  // 2. Fallback: Extract from scoped DOM containers (#readerarea, .reader-area, .entry-content)
  if (rawImages.length === 0) {
    const areaMatch = html.match(/<(?:div|article|section)[^>]*(?:id=[\"']readerarea[\"']|class=[\"'][^\"']*(?:readerarea|reader-area|entry-content|reading-content)[^\"']*)[^>]*>([\s\S]*?)<\/(?:div|article|section)>/i) ||
      html.match(/<div[^>]*id=[\"']readerarea[\"'][^>]*>([\s\S]*?)<\/div>/i);
    
    const searchHtml = areaMatch ? areaMatch[1] : html;
    const imgTagRegex = /<img\b([^>]+)>/gi;
    let tagMatch;

    while ((tagMatch = imgTagRegex.exec(searchHtml)) !== null) {
      const attrs = tagMatch[1];

      // Extract attributes in prioritized order: data-src -> data-lazy-src -> data-original -> data-cfsrc -> srcset -> src
      const dataSrc = attrs.match(/\bdata-src=[\"']([^\"']+)[\"']/i)?.[1];
      const dataLazySrc = attrs.match(/\bdata-lazy-src=[\"']([^\"']+)[\"']/i)?.[1];
      const dataOriginal = attrs.match(/\bdata-original=[\"']([^\"']+)[\"']/i)?.[1];
      const dataCfSrc = attrs.match(/\bdata-cfsrc=[\"']([^\"']+)[\"']/i)?.[1];
      const srcset = attrs.match(/\b(?:data-)?srcset=[\"']([^\"']+)[\"']/i)?.[1];
      const standardSrc = attrs.match(/\bsrc=[\"']([^\"']+)[\"']/i)?.[1];

      let candidateUrl = dataSrc || dataLazySrc || dataOriginal || dataCfSrc || standardSrc || '';

      if (!candidateUrl && srcset) {
        const parts = srcset.split(',').map(s => s.trim().split(/\s+/)[0]);
        if (parts.length > 0 && parts[0]) {
          candidateUrl = parts[parts.length - 1] || parts[0];
        }
      }

      candidateUrl = candidateUrl.trim();
      if (!candidateUrl) continue;

      // Filter out base64 placeholders and non-reader assets
      const lower = candidateUrl.toLowerCase();
      if (lower.startsWith('data:image/')) continue;
      if (lower.includes('komiktap-light') || lower.includes('gravatar') || lower.includes('logo') || 
          lower.includes('avatar') || lower.includes('emoji') || lower.includes('banner') || 
          lower.includes('spinner') || lower.includes('ads') || lower.endsWith('.gif')) {
        continue;
      }

      rawImages.push(candidateUrl);
    }
  }

  // 3. Deduplicate URLs while strictly preserving original reading sequence
  const seenImageUrls = new Set<string>();
  const dedupedImages: string[] = [];
  for (const raw of rawImages) {
    let clean = raw.trim();
    if (clean.startsWith('//')) {
      clean = `https:${clean}`;
    } else if (clean.startsWith('/') && !clean.startsWith('//')) {
      clean = `${KOMIKTAP_BASE_URL}${clean}`;
    }

    if (!clean || seenImageUrls.has(clean)) continue;
    seenImageUrls.add(clean);
    dedupedImages.push(clean);
  }

  // 4. Map images with proxy URLs and direct fallback
  const pages = dedupedImages.map((directUrl, idx) => {
    const proxiedUrl = `/api/proxy-image?url=${encodeURIComponent(directUrl)}`;
    return {
      id: `kt-page-${idx + 1}`,
      pageNumber: idx + 1,
      imageUrl: proxiedUrl,
      fallbackUrl: directUrl,
      directUrl: directUrl
    };
  });

  return {
    pages,
    nextUrl,
    prevUrl,
    total: pages.length
  };
}

/**
 * Serverless HTTP Handler for /api/komiktap-proxy
 */
export default async function handler(req: any, res: any) {
  const query = req.query || req.queryStringParameters || {};
  const action = String(query.action || 'search').toLowerCase();

  const sendResponse = (statusCode: number, data: any) => {
    if (res && typeof res.status === 'function') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
      return res.status(statusCode).json(data);
    }
    return {
      statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, s-maxage=600'
      },
      body: JSON.stringify(data)
    };
  };

  if (req.method === 'OPTIONS') {
    return sendResponse(200, { ok: true });
  }

  try {
    if (action === 'search' || action === 'list') {
      const q = String(query.q || query.search || query.title || '').trim();
      const category = String(query.category || 'all').toLowerCase();
      const page = Math.max(1, parseInt(query.page || '1') || 1);
      const order = String(query.order || 'popular').toLowerCase();

      const items = await scrapeKomiktapSearch(q, category, page, order);
      return sendResponse(200, { data: items, total: items.length, page });
    }

    if (action === 'detail') {
      const slug = String(query.slug || query.url || '').trim();
      if (!slug) {
        return sendResponse(400, { error: 'Slug or url parameter is required for detail action' });
      }
      const detail = await scrapeKomiktapDetail(slug);
      return sendResponse(200, { data: detail });
    }

    if (action === 'chapter' || action === 'pages') {
      const targetUrl = String(query.url || query.slug || '').trim();
      if (!targetUrl) {
        return sendResponse(400, { error: 'Url or slug parameter is required for chapter action' });
      }
      const result = await scrapeKomiktapChapterPages(targetUrl);
      return sendResponse(200, result);
    }

    return sendResponse(400, { error: `Unsupported action: ${action}` });
  } catch (error: any) {
    console.error('Komiktap proxy error:', error);
    return sendResponse(500, { error: 'Failed to scrape Komiktap', message: error.message });
  }
}
