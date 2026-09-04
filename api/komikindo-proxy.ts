// ==============================================================================
// KOMIKINDO SCRAPER & API PROXY (komikindo.ch)
// Scrapes comic catalog, metadata, chapters list, and chapter image pages
// Base Domain: https://komikindo.ch/
// Comic URL: https://komikindo.ch/komik/:slug/
// Chapter URL: https://komikindo.ch/:slug-chapter-:number/
// ==============================================================================

const KOMIKINDO_BASE_URL = 'https://komikindo.ch';

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'id,en-US;q=0.9,en;q=0.8',
  'Referer': `${KOMIKINDO_BASE_URL}/`
};

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

function cleanHtmlText(text: string): string {
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

function cleanComicTitle(title: string): string {
  const cleaned = cleanHtmlText(title);
  return cleaned.replace(/^komik\s+/i, '').trim();
}

function normalizeChapterUrl(rawUrl: string): string {
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

/**
 * Searches Komikindo catalog or browse by order/category
 */
export async function scrapeKomikindoSearch(
  query = '',
  category = 'all',
  page = 1,
  order = 'popular'
): Promise<KomikindoSearchResult[]> {
  const cleanQuery = String(query || '').trim();
  let targetUrl = '';

  if (cleanQuery) {
    if (page <= 1) {
      targetUrl = `${KOMIKINDO_BASE_URL}/?s=${encodeURIComponent(cleanQuery)}`;
    } else {
      targetUrl = `${KOMIKINDO_BASE_URL}/page/${page}/?s=${encodeURIComponent(cleanQuery)}`;
    }
  } else {
    let orderParam = 'popular';
    if (order === 'latest' || category === 'latest') {
      orderParam = 'latest';
    } else if (order === 'update' || category === 'update') {
      orderParam = 'update';
    } else if (order === 'title') {
      orderParam = 'title';
    } else if (order === 'titlereverse') {
      orderParam = 'titlereverse';
    }

    let typeParam = '';
    if (category === 'manhwa') typeParam = '&type=Manhwa';
    else if (category === 'manga') typeParam = '&type=Manga';
    else if (category === 'manhua') typeParam = '&type=Manhua';

    if (page <= 1) {
      targetUrl = `${KOMIKINDO_BASE_URL}/daftar-manga/?order=${orderParam}${typeParam}`;
    } else {
      targetUrl = `${KOMIKINDO_BASE_URL}/daftar-manga/page/${page}/?order=${orderParam}${typeParam}`;
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  const res = await fetch(targetUrl, {
    headers: DEFAULT_HEADERS,
    signal: controller.signal
  });
  clearTimeout(timeout);

  if (!res.ok) {
    throw new Error(`Komikindo returned HTTP ${res.status}`);
  }

  const html = await res.text();
  const results: KomikindoSearchResult[] = [];

  // Match each manga card: <div class="animepost">
  const cardRegex = /<div class=[\"']animepost[\"']>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;
  let match;

  while ((match = cardRegex.exec(html)) !== null) {
    const cardHtml = match[1];

    // Link & Title
    const linkMatch = cardHtml.match(/<a\b[^>]*href=[\"'](https?:\/\/[^\"']*komikindo\.ch\/komik\/[^\"']+)[\"'][^>]*>/i) ||
      cardHtml.match(/<a\b[^>]*href=[\"']([^\"']+)[\"'][^>]*itemprop=[\"']url[\"'][^>]*>/i);
    const rawUrl = linkMatch?.[1] || '';
    if (!rawUrl) continue;

    const titleAttrMatch = cardHtml.match(/title=[\"']([^\"']+)[\"']/i);
    const titleTextMatch = cardHtml.match(/<div class=[\"']tt[\"']>[\s\S]*?<h3>([\s\S]*?)<\/h3>/i);
    const rawTitle = titleTextMatch?.[1] || titleAttrMatch?.[1] || '';
    const cleanTitle = cleanComicTitle(rawTitle);

    if (!cleanTitle) continue;

    // Extract slug from URL e.g. https://komikindo.ch/komik/solo-leveling/ -> solo-leveling
    const slug = rawUrl.replace(/\/$/, '').split('/').pop() || '';

    // Extract cover image
    const imgMatch = cardHtml.match(/<img[^>]+(?:src|data-src)=[\"']([^\"']+)[\"']/i);
    let coverImage = imgMatch?.[1] || '';
    if (coverImage.startsWith('//')) coverImage = `https:${coverImage}`;

    // Extract type (Manga / Manhwa / Manhua)
    const typeMatch = cardHtml.match(/<span class=[\"']typeflag\s+([^\"']+)[\"']/i);
    const rawType = (typeMatch?.[1] || '').toLowerCase();
    let comicType: 'manga' | 'manhwa' | 'manhua' | 'doujin' = 'manga';
    if (rawType.includes('manhwa')) comicType = 'manhwa';
    else if (rawType.includes('manhua')) comicType = 'manhua';
    else if (rawType.includes('doujin')) comicType = 'doujin';

    // Extract latest chapter
    const chMatch = cardHtml.match(/<div class=[\"']lsch[\"\']>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i);
    const latestChapter = chMatch ? cleanHtmlText(chMatch[1]) : '';

    // Extract rating score
    const scoreMatch = cardHtml.match(/<div class=[\"']rating[\"\']>[\s\S]*?<i>([^<]+)<\/i>/i);
    const rating = scoreMatch ? Math.min(5, Math.max(0, (parseFloat(scoreMatch[1]) || 8.0) / 2)) : 4.8;

    const isAdult = /18\+|dewasa|adult|ecchi|hentai/i.test(cleanTitle) || category === '18plus';

    results.push({
      title: cleanTitle,
      slug,
      url: rawUrl,
      coverImage,
      comicType,
      contentType: isAdult ? '18plus' : 'normal',
      rating,
      latestChapter,
      sourceApi: 'Komikindo API (komikindo.ch)'
    });
  }

  return results;
}

/**
 * Scrapes full comic metadata and chapter list from Komikindo detail page
 * Target URL: https://komikindo.ch/komik/:slug/
 */
export async function scrapeKomikindoDetail(slugOrUrl: string): Promise<KomikindoComicDetail> {
  let targetUrl = slugOrUrl;
  let slug = slugOrUrl;

  if (slugOrUrl.startsWith('http://') || slugOrUrl.startsWith('https://')) {
    targetUrl = slugOrUrl;
    slug = slugOrUrl.replace(/\/$/, '').split('/').pop() || '';
  } else {
    slug = slugOrUrl.replace(/^\/|\/$/g, '');
    targetUrl = `${KOMIKINDO_BASE_URL}/komik/${slug}/`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 14000);

  const res = await fetch(targetUrl, {
    headers: DEFAULT_HEADERS,
    signal: controller.signal
  });
  clearTimeout(timeout);

  if (!res.ok) {
    throw new Error(`Komikindo comic detail returned HTTP ${res.status}`);
  }

  const html = await res.text();

  // Title
  const titleRaw = (
    html.match(/<h1[^>]*class=[\"']entry-title[\"'][^>]*>([\s\S]*?)<\/h1>/i)?.[1] ||
    html.match(/<h1[^>]*>(.*?)<\/h1>/i)?.[1] ||
    slug
  );
  const title = cleanComicTitle(titleRaw);

  // Cover image
  const coverImage = (
    html.match(/<div class=[\"']thumb[\"'][^>]*>[\s\S]*?<img[^>]+(?:src|data-src)=[\"']([^\"']+)[\"']/i)?.[1] ||
    html.match(/<img[^>]+itemprop=[\"']image[\"'][^>]+src=[\"']([^\"']+)[\"']/i)?.[1] ||
    ''
  );

  // Banner image (fallback to cover image if not distinct)
  const bannerMatch = html.match(/<div class=[\"']bigbanner[\"'][^>]*style=[\"'][^\"']*url\(([^)]+)\)/i);
  const bannerImage = bannerMatch ? bannerMatch[1].replace(/['\"]/g, '') : coverImage;

  // Metadata block: <div class="spe">
  const speBlock = html.match(/<div class=[\"']spe[\"\']>([\s\S]*?)<\/div>/i)?.[1] || '';

  // Alternative Title
  const altTitleMatch = speBlock.match(/<b>Judul Alternatif:<\/b>\s*([^<]+)/i);
  const altTitle = altTitleMatch ? cleanHtmlText(altTitleMatch[1]) : '';

  // Status
  const statusMatch = speBlock.match(/<b>Status:<\/b>\s*([^<]+)/i);
  const statusRaw = (statusMatch?.[1] || 'Berjalan').toLowerCase();
  const status: 'ongoing' | 'completed' = (statusRaw.includes('tamat') || statusRaw.includes('complete')) ? 'completed' : 'ongoing';

  // Story Writer / Author
  const authorMatch = speBlock.match(/<b>Pengarang:<\/b>\s*([^<]+)/i);
  const storyWriter = authorMatch ? cleanHtmlText(authorMatch[1]) : 'Komikindo Author';

  // Artist / Ilustrator
  const artistMatch = speBlock.match(/<b>Ilustrator:<\/b>\s*([^<]+)/i);
  const artist = artistMatch ? cleanHtmlText(artistMatch[1]) : (storyWriter || 'Komikindo Artist');

  // Comic Type
  const typeMatch = speBlock.match(/<b>Jenis Komik:<\/b>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i) ||
    html.match(/<span class=[\"']typeflag\s+([^\"']+)[\"']/i);
  const typeRaw = (typeMatch?.[1] || '').toLowerCase();
  let comicType: 'manga' | 'manhwa' | 'manhua' | 'doujin' = 'manhwa';
  if (typeRaw.includes('manga')) comicType = 'manga';
  else if (typeRaw.includes('manhua')) comicType = 'manhua';
  else if (typeRaw.includes('doujin')) comicType = 'doujin';

  // Synopsis
  const synMatch = (
    html.match(/<div class=[\"']entry-content entry-content-single[\"'][^>]*>([\s\S]*?)<\/div>/i) ||
    html.match(/<div class=[\"']sinopsis[\"\'][^>]*>([\s\S]*?)<\/div>/i) ||
    html.match(/<div class=[\"']shortcsc[\"\']>([\s\S]*?)<\/div>/i)
  );
  const synopsis = synMatch ? cleanHtmlText(synMatch[1]) : `Komik ${title} terjemahan Bahasa Indonesia di Komikindo.`;

  // Genres
  const genres: string[] = [];
  const genreRegex = /<a[^>]+href=[\"'](?:https?:\/\/[^\"']*komikindo\.ch)?\/genres\/([^\"'/]+)\/?[\"'][^>]*>([^<]+)<\/a>/gi;
  let gMatch;
  while ((gMatch = genreRegex.exec(html)) !== null) {
    const gName = cleanHtmlText(gMatch[2]);
    if (gName && !genres.includes(gName)) {
      genres.push(gName);
    }
  }

  const isAdult = genres.some(g => /18\+|dewasa|adult|ecchi|hentai/i.test(g)) || /18\+|dewasa/i.test(title);

  // Chapters list
  // Structure in #chapter_list:
  // <li><span class="lchx"><a href="https://komikindo.ch/solo-leveling-chapter-179-end/" itemprop="url" rel="bookmark" title="...">Chapter <chapter>179 End</chapter></a></span><span class="dt"><a ...>5 tahun yang lalu</a></span></li>
  const rawChapters: KomikindoChapterItem[] = [];
  const chListBlock = html.match(/id=[\"']chapter_list[\"\']>([\s\S]*?)<\/ul>/i)?.[1] || html;
  const chItemRegex = /<li[^>]*>[\s\S]*?<span class=[\"']lchx[\"']>[\s\S]*?<a\b[^>]*href=[\"']([^\"']+)[\"'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/span>(?:[\s\S]*?<span class=[\"']dt[\"']>([\s\S]*?)<\/span>)?/gi;
  let cMatch;

  while ((cMatch = chItemRegex.exec(chListBlock)) !== null) {
    const chUrl = cMatch[1];
    const rawChTitle = cleanHtmlText(cMatch[2]);
    const chDate = cleanHtmlText(cMatch[3] || '');

    if (!chUrl) continue;

    const canonicalUrl = normalizeChapterUrl(chUrl);
    const chSlug = canonicalUrl.replace(/\/$/, '').split('/').pop() || '';

    // Extract chapter number
    let parsedNum = 0;
    const numInsideChapterTag = cMatch[2].match(/<chapter>([^<]+)<\/chapter>/i);
    if (numInsideChapterTag) {
      const matchNum = numInsideChapterTag[1].match(/\b\d+(?:\.\d+)?\b/);
      parsedNum = matchNum ? parseFloat(matchNum[0]) : 0;
    }
    if (parsedNum === 0) {
      const matchNum = rawChTitle.match(/chapter\s+(\d+(?:\.\d+)?)/i) || rawChTitle.match(/\b\d+(?:\.\d+)?\b/);
      parsedNum = matchNum ? parseFloat(matchNum[1] || matchNum[0]) : 0;
    }
    if (parsedNum === 0) {
      const matchSlug = chSlug.match(/chapter-(\d+(?:-\d+)?)/i);
      parsedNum = matchSlug ? parseFloat(matchSlug[1].replace('-', '.')) : rawChapters.length + 1;
    }

    rawChapters.push({
      chapterNumber: parsedNum,
      title: rawChTitle || `Chapter ${parsedNum}`,
      url: canonicalUrl,
      slug: chSlug,
      releaseDate: chDate
    });
  }

  // Deduplicate by canonical URL
  const urlMap = new Map<string, KomikindoChapterItem>();
  for (const ch of rawChapters) {
    if (!urlMap.has(ch.url)) {
      urlMap.set(ch.url, ch);
    }
  }
  const uniqueUrlChapters = Array.from(urlMap.values());

  // Disambiguate duplicate numbers if different URLs share same number
  const seenNums = new Map<number, number>();
  const chapters: KomikindoChapterItem[] = [];
  for (const ch of uniqueUrlChapters) {
    let finalNum = ch.chapterNumber;
    let finalTitle = ch.title;
    if (seenNums.has(finalNum)) {
      const count = seenNums.get(finalNum)! + 1;
      seenNums.set(finalNum, count);
      finalNum = Number((finalNum + count * 0.1).toFixed(2));
      if (!finalTitle.includes('(')) {
        finalTitle = `${finalTitle} (Part ${count + 1})`;
      }
    } else {
      seenNums.set(finalNum, 0);
    }
    chapters.push({
      ...ch,
      chapterNumber: finalNum,
      title: finalTitle
    });
  }

  // Sort ascending: Chapter 1 first, Chapter N last
  chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);

  return {
    title,
    altTitle,
    slug,
    url: targetUrl,
    coverImage,
    bannerImage,
    synopsis,
    genres: genres.length > 0 ? genres : ['Action', 'Fantasy', 'Manhwa'],
    status,
    comicType,
    contentType: isAdult ? '18plus' : 'normal',
    storyWriter,
    artist,
    rating: 4.8,
    totalChapters: chapters.length,
    chapters,
    sourceApi: 'Komikindo API (komikindo.ch)'
  };
}

/**
 * Scrapes image pages from a Komikindo chapter reader page
 * Target URL: https://komikindo.ch/:slug-chapter-:number/
 * Container: <div id="chimg-auh">
 */
export async function scrapeKomikindoChapterPages(chapterUrlOrSlug: string, maxRetries = 3): Promise<{
  pages: Array<{ id: string; pageNumber: number; imageUrl: string; fallbackUrl: string; directUrl: string }>;
  nextUrl: string;
  prevUrl: string;
  total: number;
}> {
  let targetUrl = chapterUrlOrSlug;

  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    const clean = chapterUrlOrSlug.replace(/^\/|\/$/g, '');
    targetUrl = `${KOMIKINDO_BASE_URL}/${clean}/`;
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

      if (res.status === 404 || res.status === 403) {
        throw new Error(`Komikindo chapter reader returned permanent HTTP ${res.status}`);
      }

      if (!res.ok) {
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, attempt * 600));
          continue;
        }
        throw new Error(`Komikindo chapter reader returned HTTP ${res.status}`);
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
        throw new Error(`Komikindo chapter fetch failed after ${attempt} attempts: ${err.message}`);
      }
      await new Promise(r => setTimeout(r, attempt * 600));
    }
  }

  if (!html) {
    throw lastError || new Error('Empty response from Komikindo chapter reader');
  }

  // Next and Prev chapter URLs
  let nextUrl = '';
  let prevUrl = '';
  const nextMatch = html.match(/<a\b[^>]*href=[\"']([^\"']+)[\"'][^>]*rel=[\"']next[\"\']/i) ||
    html.match(/<a\b[^>]*rel=[\"']next[\"\'][^>]*href=[\"']([^\"']+)[\"']/i);
  if (nextMatch) nextUrl = nextMatch[1];

  const prevMatch = html.match(/<a\b[^>]*href=[\"']([^\"']+)[\"'][^>]*rel=[\"']prev[\"\']/i) ||
    html.match(/<a\b[^>]*rel=[\"']prev[\"\'][^>]*href=[\"']([^\"']+)[\"']/i);
  if (prevMatch) prevUrl = prevMatch[1];

  // Images container: primary is #chimg-auh
  let rawImages: string[] = [];
  const chimgBlockMatch = html.match(/<div[^>]*id=[\"']chimg-auh[\"\'][^>]*>([\s\S]*?)<\/div>/i) ||
    html.match(/id=[\"']chimg-auh[\"\'][\s\S]*?(?=<div class=[\"']chapter-desc|\Z)/i);

  const searchHtml = chimgBlockMatch ? chimgBlockMatch[0] : html;
  const imgRegex = /<img\b([^>]+)>/gi;
  let tagMatch;

  while ((tagMatch = imgRegex.exec(searchHtml)) !== null) {
    const attrs = tagMatch[1];

    const srcMatch = attrs.match(/\bsrc=[\"']([^\"']+)[\"']/i) ||
      attrs.match(/\bdata-src=[\"']([^\"']+)[\"']/i) ||
      attrs.match(/\bdata-lazy-src=[\"']([^\"']+)[\"']/i);

    let candidateUrl = srcMatch?.[1] || '';
    candidateUrl = candidateUrl.trim();
    if (!candidateUrl) continue;

    // Filter out ads, placeholders, banners, and non-chapter items
    const lower = candidateUrl.toLowerCase();
    if (lower.startsWith('data:image/')) continue;
    if (lower.endsWith('.gif')) continue;
    if (
      lower.includes('blogger.googleusercontent.com') ||
      lower.includes('wp.com/fav') ||
      lower.includes('fav.png') ||
      lower.includes('logo') ||
      lower.includes('banner') ||
      lower.includes('avatar') ||
      lower.includes('gravatar') ||
      lower.includes('slot') ||
      lower.includes('judi') ||
      lower.includes('penta') ||
      lower.includes('kaiko') ||
      lower.includes('ads') ||
      lower.includes('spinner')
    ) {
      continue;
    }

    rawImages.push(candidateUrl);
  }

  // Deduplicate URLs while strictly preserving original reading sequence
  const seenImageUrls = new Set<string>();
  const dedupedImages: string[] = [];
  for (const raw of rawImages) {
    let clean = raw.trim();
    if (clean.startsWith('//')) {
      clean = `https:${clean}`;
    } else if (clean.startsWith('/') && !clean.startsWith('//')) {
      clean = `${KOMIKINDO_BASE_URL}${clean}`;
    }

    if (!clean || seenImageUrls.has(clean)) continue;
    seenImageUrls.add(clean);
    dedupedImages.push(clean);
  }

  // Map images with proxy URLs and direct fallback
  const pages = dedupedImages.map((directUrl, idx) => {
    const proxiedUrl = `/api/proxy-image?url=${encodeURIComponent(directUrl)}`;
    return {
      id: `ki-page-${idx + 1}`,
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
 * Serverless HTTP Handler for /api/komikindo-proxy
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

      const items = await scrapeKomikindoSearch(q, category, page, order);
      return sendResponse(200, { data: items, total: items.length, page });
    }

    if (action === 'detail') {
      const slug = String(query.slug || query.url || '').trim();
      if (!slug) {
        return sendResponse(400, { error: 'Slug or url parameter is required for detail action' });
      }
      const detail = await scrapeKomikindoDetail(slug);
      return sendResponse(200, { data: detail });
    }

    if (action === 'chapter' || action === 'pages') {
      const targetUrl = String(query.url || query.slug || '').trim();
      if (!targetUrl) {
        return sendResponse(400, { error: 'Url or slug parameter is required for chapter action' });
      }
      const result = await scrapeKomikindoChapterPages(targetUrl);
      return sendResponse(200, result);
    }

    return sendResponse(400, { error: `Unsupported action: ${action}` });
  } catch (error: any) {
    console.error('Komikindo proxy error:', error);
    return sendResponse(500, { error: 'Failed to scrape Komikindo', message: error.message });
  }
}
