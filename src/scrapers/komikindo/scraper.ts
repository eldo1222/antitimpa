// ==============================================================================
// KOMIKINDO CORE SCRAPING ENGINE
// Single Source of Truth for KomikIndo scraping logic
// Independent of transport layer (Express, Vercel, or standalone worker)
// ==============================================================================

import {
  KOMIKINDO_BASE_URL,
  DEFAULT_HEADERS,
  cleanHtmlText,
  cleanComicTitle,
  normalizeChapterUrl
} from './parser';

import {
  KomikindoSearchResult,
  KomikindoChapterItem,
  KomikindoComicDetail,
  KomikindoDiagnostics,
  KomikindoScrapeResult,
  KomikindoDiagnosticResponse,
  KomikindoChapterPagesResult,
  KomikindoImportRequest,
  KomikindoImportResponse
} from './types';

function logSafeKomikindoRequest(diag: KomikindoDiagnostics, queryNote: string) {
  console.log(`[KOMIKINDO_AUDIT] ========================================`);
  console.log(`[KOMIKINDO_AUDIT] note: ${queryNote}`);
  console.log(`[KOMIKINDO_AUDIT] requestTime: ${diag.requestTime}`);
  console.log(`[KOMIKINDO_AUDIT] targetUrl: ${diag.targetUrl}`);
  console.log(`[KOMIKINDO_AUDIT] httpMethod: ${diag.httpMethod}`);
  console.log(`[KOMIKINDO_AUDIT] httpStatus: ${diag.httpStatus}`);
  console.log(`[KOMIKINDO_AUDIT] contentType: ${diag.contentType}`);
  console.log(`[KOMIKINDO_AUDIT] bodyLength: ${diag.htmlLength} bytes`);
  console.log(`[KOMIKINDO_AUDIT] finalUrl: ${diag.finalUrl}`);
  console.log(`[KOMIKINDO_AUDIT] redirectCount: ${diag.redirectCount}`);
  console.log(`[KOMIKINDO_AUDIT] parserStrategy: ${diag.parserStrategy}`);
  console.log(`[KOMIKINDO_AUDIT] challengeDetected: ${diag.challengeDetected}`);
  console.log(`[KOMIKINDO_AUDIT] durationMs: ${diag.durationMs}ms`);
  console.log(`[KOMIKINDO_AUDIT] runtime: ${diag.runtime}`);
  console.log(`[KOMIKINDO_AUDIT] verdict: ${diag.verdict}`);
  console.log(`[KOMIKINDO_AUDIT] ========================================`);
}

/**
 * Searches Komikindo catalog or browses by order/category with detailed diagnostic tracking
 */
export async function scrapeKomikindoSearchWithDiagnostics(
  query = '',
  category = 'all',
  page = 1,
  order = 'popular'
): Promise<KomikindoScrapeResult> {
  const rawQ = String(query || '').trim();
  const isAllKeyword = rawQ.toLowerCase() === 'all' || rawQ.toLowerCase() === 'semua';
  const cleanQuery = isAllKeyword ? '' : rawQ;
  const isVercel = typeof process.env.VERCEL !== 'undefined';
  const runtimeType = isVercel ? 'vercel_serverless' : 'express_dev';

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
  const timeout = setTimeout(() => controller.abort(), 14000);
  const startTime = Date.now();
  const requestTimeIso = new Date().toISOString();

  try {
    const res = await fetch(targetUrl, {
      headers: DEFAULT_HEADERS,
      signal: controller.signal
    });
    clearTimeout(timeout);
    const durationMs = Date.now() - startTime;

    const contentType = res.headers.get('content-type') || '';
    const redirected = res.redirected;
    const finalUrl = res.url || targetUrl;

    // CASE A: HTTP Status Not OK (e.g. 403, 429, 500, 503)
    if (!res.ok) {
      const diag: KomikindoDiagnostics = {
        targetUrl,
        httpMethod: 'GET',
        httpStatus: res.status,
        contentType,
        htmlLength: 0,
        parserMatches: 0,
        redirected,
        redirectCount: redirected ? 1 : 0,
        finalUrl,
        userAgent: DEFAULT_HEADERS['User-Agent'],
        referer: DEFAULT_HEADERS['Referer'],
        parserStrategy: 'animepost_card_regex',
        challengeDetected: res.status === 403,
        requestTime: requestTimeIso,
        durationMs,
        verdict: 'FETCH_FAILED',
        runtime: runtimeType
      };

      logSafeKomikindoRequest(diag, `CASE_A_FETCH_FAILED (HTTP ${res.status})`);

      return {
        status: 'KOMIKINDO_FETCH_FAILED',
        data: [],
        total: 0,
        page,
        query: cleanQuery,
        category,
        error: `Komikindo returned HTTP ${res.status} (${res.statusText})`,
        message: `KomikIndo gagal diakses (${res.status} ${res.statusText}). ${
          res.status === 403 ? 'Proteksi Cloudflare upstream membatasi akses datacenter.' : ''
        }`,
        diagnostics: diag
      };
    }

    const html = await res.text();

    // Check if Cloudflare returned an actual challenge HTML page (e.g. Turnstile/Challenge blocking the page)
    const titleMatch = html.match(/<title>(.*?)<\/title>/i)?.[1] || '';
    const hasComicsContent = html.includes('animepost') || html.includes('bsx') || /komikindo/i.test(titleMatch);
    const isCloudflareChallenge = !hasComicsContent && (
      /just a moment/i.test(titleMatch) ||
      /attention required/i.test(titleMatch) ||
      html.includes('cf-browser-verification') ||
      html.includes('id="challenge-running"')
    );

    if (isCloudflareChallenge) {
      const diag: KomikindoDiagnostics = {
        targetUrl,
        httpMethod: 'GET',
        httpStatus: res.status,
        contentType,
        htmlLength: html.length,
        parserMatches: 0,
        redirected,
        redirectCount: redirected ? 1 : 0,
        finalUrl,
        userAgent: DEFAULT_HEADERS['User-Agent'],
        referer: DEFAULT_HEADERS['Referer'],
        parserStrategy: 'animepost_card_regex',
        challengeDetected: true,
        requestTime: requestTimeIso,
        durationMs,
        verdict: 'FETCH_FAILED',
        runtime: runtimeType
      };

      logSafeKomikindoRequest(diag, 'CASE_A_CLOUDFLARE_CHALLENGE_DETECTED');

      return {
        status: 'KOMIKINDO_FETCH_FAILED',
        data: [],
        total: 0,
        page,
        query: cleanQuery,
        category,
        error: 'Cloudflare challenge page detected',
        message: 'KomikIndo memunculkan verifikasi Cloudflare Bot Challenge.',
        diagnostics: diag
      };
    }

    // CASE B: Parse animepost card regex
    const results: KomikindoSearchResult[] = [];
    const cardRegex = /<div class=[\"']animepost[\"']>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;
    let cardMatch;
    let parserMatches = 0;

    while ((cardMatch = cardRegex.exec(html)) !== null) {
      parserMatches++;
      const block = cardMatch[1];

      const linkMatch = block.match(/<a\b[^>]*href=[\"']([^\"']+)[\"'][^>]*title=[\"']([^\"']*)[\"']/i) ||
        block.match(/<a\b[^>]*href=[\"']([^\"']+)[\"']/i);
      if (!linkMatch) continue;

      const rawUrl = linkMatch[1];
      const parsedUrl = new URL(rawUrl, KOMIKINDO_BASE_URL);
      const url = `${parsedUrl.protocol}//${parsedUrl.hostname}${parsedUrl.pathname}`;
      const slug = parsedUrl.pathname.replace(/^\/komik\/|\/$/g, '').trim();

      const rawTitle = linkMatch[2] ||
        block.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i)?.[1] ||
        slug;
      const title = cleanComicTitle(rawTitle);

      const imgMatch = block.match(/<img[^>]+(?:src|data-src)=[\"']([^\"']+)[\"']/i);
      const coverImage = imgMatch ? imgMatch[1] : '';

      const typeMatch = block.match(/<span class=[\"']typeflag\s+([^\"']+)[\"']/i) ||
        block.match(/<span class=[\"']typeflag[\"'][^>]*>([^<]+)<\/span>/i);
      const typeStr = (typeMatch ? (typeMatch[1] || '') : '').toLowerCase();
      let comicType: 'manga' | 'manhwa' | 'manhua' | 'doujin' = 'manhwa';
      if (typeStr.includes('manga')) comicType = 'manga';
      else if (typeStr.includes('manhua')) comicType = 'manhua';
      else if (typeStr.includes('doujin')) comicType = 'doujin';

      const ratingMatch = block.match(/<i class=[\"']rating[\"']>([\s\S]*?)<\/i>/i) ||
        block.match(/<div class=[\"']rating[\"']>([\s\S]*?)<\/div>/i);
      const rating = ratingMatch ? parseFloat(cleanHtmlText(ratingMatch[1])) || 4.8 : 4.8;

      const chMatch = block.match(/<span class=[\"']lsch[\"']>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i);
      const latestChapter = chMatch ? cleanHtmlText(chMatch[1]) : '';

      const isAdult = /18\+|dewasa|adult|ecchi|hentai/i.test(title) || /18\+|dewasa/i.test(block);

      results.push({
        title,
        slug,
        url,
        coverImage,
        comicType,
        contentType: isAdult ? '18plus' : 'normal',
        rating,
        latestChapter,
        sourceApi: 'Komikindo API (komikindo.ch)'
      });
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    const dedupedResults = results.filter(item => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });

    const isCardRegexEmpty = dedupedResults.length === 0;

    // Secondary strategy: list-style search results
    if (isCardRegexEmpty) {
      const listRegex = /<div class=[\"']bsx[\"']>([\s\S]*?)<\/div>\s*<\/div>/gi;
      let listMatch;
      while ((listMatch = listRegex.exec(html)) !== null) {
        parserMatches++;
        const block = listMatch[1];
        const linkMatch = block.match(/<a\b[^>]*href=[\"']([^\"']+)[\"'][^>]*title=[\"']([^\"']*)[\"']/i) ||
          block.match(/<a\b[^>]*href=[\"']([^\"']+)[\"']/i);
        if (!linkMatch) continue;

        const rawUrl = linkMatch[1];
        const parsedUrl = new URL(rawUrl, KOMIKINDO_BASE_URL);
        const url = `${parsedUrl.protocol}//${parsedUrl.hostname}${parsedUrl.pathname}`;
        const slug = parsedUrl.pathname.replace(/^\/komik\/|\/$/g, '').trim();
        const rawTitle = linkMatch[2] || block.match(/<div class=[\"']tt[\"']>([\s\S]*?)<\/div>/i)?.[1] || slug;
        const title = cleanComicTitle(rawTitle);
        const imgMatch = block.match(/<img[^>]+(?:src|data-src)=[\"']([^\"']+)[\"']/i);
        const coverImage = imgMatch ? imgMatch[1] : '';

        if (!seen.has(url)) {
          seen.add(url);
          dedupedResults.push({
            title,
            slug,
            url,
            coverImage,
            comicType: 'manhwa',
            contentType: /18\+|dewasa/i.test(title) ? '18plus' : 'normal',
            rating: 4.8,
            latestChapter: '',
            sourceApi: 'Komikindo API (komikindo.ch)'
          });
        }
      }
    }

    // Determine verdict
    let verdict: 'OK' | 'FETCH_FAILED' | 'PARSER_FAILED' | 'SEARCH_EMPTY' = 'OK';
    let status: any = 'KOMIKINDO_OK';
    let statusMessage = '';

    if (dedupedResults.length > 0) {
      verdict = 'OK';
      status = 'KOMIKINDO_OK';
      statusMessage = `Berhasil menemukan ${dedupedResults.length} komik dari KomikIndo.`;
    } else {
      // Check if page actually indicated no results found
      const hasNoResultsIndicator = (
        /tidak ada/i.test(html) ||
        /not found/i.test(html) ||
        /no results/i.test(html) ||
        /nothing found/i.test(html) ||
        /tidak ditemukan/i.test(html) ||
        html.includes('class="notfound"')
      );

      if (hasNoResultsIndicator) {
        verdict = 'SEARCH_EMPTY';
        status = 'KOMIKINDO_SEARCH_EMPTY';
        statusMessage = cleanQuery
          ? `Tidak ada komik yang cocok untuk judul "${cleanQuery}".`
          : `Tidak ada komik pada kategori "${category}".`;
      } else {
        verdict = 'PARSER_FAILED';
        status = 'KOMIKINDO_PARSER_FAILED';
        statusMessage = 'HTML diterima (HTTP 200) tetapi parser gagal mengekstrak kartu komik. Struktur upstream mungkin telah berubah.';
      }
    }

    const diag: KomikindoDiagnostics = {
      targetUrl,
      httpMethod: 'GET',
      httpStatus: res.status,
      contentType,
      htmlLength: html.length,
      parserMatches,
      redirected,
      redirectCount: redirected ? 1 : 0,
      finalUrl,
      userAgent: DEFAULT_HEADERS['User-Agent'],
      referer: DEFAULT_HEADERS['Referer'],
      parserStrategy: isCardRegexEmpty ? 'list_bsx_fallback' : 'animepost_card_regex',
      challengeDetected: false,
      requestTime: requestTimeIso,
      durationMs,
      verdict,
      runtime: runtimeType
    };

    logSafeKomikindoRequest(diag, `COMPLETED (Found ${dedupedResults.length} items, Status: ${status})`);

    return {
      status,
      data: dedupedResults,
      total: dedupedResults.length,
      page,
      query: cleanQuery,
      category,
      message: statusMessage,
      diagnostics: diag
    };
  } catch (err: any) {
    clearTimeout(timeout);
    const durationMs = Date.now() - startTime;

    const diag: KomikindoDiagnostics = {
      targetUrl,
      httpMethod: 'GET',
      httpStatus: null,
      contentType: null,
      htmlLength: 0,
      parserMatches: 0,
      redirected: false,
      redirectCount: 0,
      finalUrl: targetUrl,
      userAgent: DEFAULT_HEADERS['User-Agent'],
      referer: DEFAULT_HEADERS['Referer'],
      parserStrategy: 'animepost_card_regex',
      challengeDetected: false,
      requestTime: requestTimeIso,
      durationMs,
      verdict: 'FETCH_FAILED',
      runtime: runtimeType
    };

    logSafeKomikindoRequest(diag, `EXCEPTION: ${err.message}`);

    return {
      status: 'KOMIKINDO_FETCH_FAILED',
      data: [],
      total: 0,
      page,
      query: cleanQuery,
      category,
      error: err.message,
      message: `Koneksi ke KomikIndo terputus: ${err.message}`,
      diagnostics: diag
    };
  }
}

export async function scrapeKomikindoSearch(
  query = '',
  category = 'all',
  page = 1,
  order = 'popular'
): Promise<KomikindoSearchResult[]> {
  const result = await scrapeKomikindoSearchWithDiagnostics(query, category, page, order);
  return result.data;
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

  // Banner image
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
 */
export async function scrapeKomikindoChapterPages(
  chapterUrlOrSlug: string,
  maxRetries = 3
): Promise<KomikindoChapterPagesResult> {
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

  let nextUrl = '';
  let prevUrl = '';
  const nextMatch = html.match(/<a\b[^>]*href=[\"']([^\"']+)[\"'][^>]*rel=[\"']next[\"\']/i) ||
    html.match(/<a\b[^>]*rel=[\"']next[\"\'][^>]*href=[\"']([^\"']+)[\"']/i);
  if (nextMatch) nextUrl = nextMatch[1];

  const prevMatch = html.match(/<a\b[^>]*href=[\"']([^\"']+)[\"'][^>]*rel=[\"']prev[\"\']/i) ||
    html.match(/<a\b[^>]*rel=[\"']prev[\"\'][^>]*href=[\"']([^\"']+)[\"']/i);
  if (prevMatch) prevUrl = prevMatch[1];

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
 * Executes a live upstream diagnostic audit against Komikindo
 */
export async function runKomikindoDiagnostic(customQuery: string = 'titan forge'): Promise<KomikindoDiagnosticResponse> {
  const isVercel = typeof process.env.VERCEL !== 'undefined';
  const runtimeType = isVercel ? 'vercel_serverless' : 'express_dev';
  const startTime = Date.now();
  const q = encodeURIComponent(customQuery.trim());

  let homepageProbe: Partial<KomikindoDiagnostics> = {
    targetUrl: `${KOMIKINDO_BASE_URL}/`,
    httpStatus: null,
    challengeDetected: false,
    durationMs: 0
  };

  const hpStart = Date.now();
  try {
    const hpRes = await fetch(`${KOMIKINDO_BASE_URL}/`, {
      headers: DEFAULT_HEADERS,
      signal: AbortSignal.timeout(10000)
    });
    const hpBody = await hpRes.text();
    homepageProbe = {
      targetUrl: `${KOMIKINDO_BASE_URL}/`,
      httpStatus: hpRes.status,
      contentType: hpRes.headers.get('content-type') || '',
      htmlLength: hpBody.length,
      redirected: hpRes.redirected,
      finalUrl: hpRes.url,
      challengeDetected: (
        hpRes.status === 403 ||
        hpRes.status === 503 ||
        ((/just a moment/i.test(hpBody) || /attention required/i.test(hpBody) || hpBody.includes('id="challenge-running"')) && !/komikindo/i.test(hpBody))
      ),
      durationMs: Date.now() - hpStart
    };
  } catch (e: any) {
    homepageProbe = {
      targetUrl: `${KOMIKINDO_BASE_URL}/`,
      httpStatus: null,
      challengeDetected: false,
      durationMs: Date.now() - hpStart
    };
  }

  const searchProbeRes = await scrapeKomikindoSearchWithDiagnostics(customQuery, 'all', 1, 'popular');

  let detailProbe = {
    url: '',
    httpStatus: null as number | null,
    titleFound: null as string | null,
    rawChaptersFound: 0,
    sampleChapters: [] as string[],
    parserWorking: false
  };

  const firstCandidate = searchProbeRes.data?.[0];
  if (firstCandidate) {
    detailProbe.url = firstCandidate.url;
    try {
      const detailRes = await scrapeKomikindoDetail(firstCandidate.slug || firstCandidate.url);
      detailProbe.httpStatus = 200;
      detailProbe.titleFound = detailRes.title;
      detailProbe.rawChaptersFound = detailRes.chapters.length;
      detailProbe.sampleChapters = detailRes.chapters.slice(0, 3).map(c => `${c.title} (${c.url})`);
      detailProbe.parserWorking = detailRes.chapters.length > 0;
    } catch (dErr: any) {
      detailProbe.httpStatus = dErr.message?.includes('HTTP 403') ? 403 : 500;
    }
  }

  let verdict: 'WORKING' | 'BLOCKED_BY_UPSTREAM' | 'PARSER_BROKEN' | 'NETWORK_ERROR' = 'WORKING';
  let summary = '';
  const recommendations: string[] = [];

  if (homepageProbe.httpStatus === 403 || homepageProbe.challengeDetected || searchProbeRes.diagnostics.challengeDetected) {
    verdict = 'BLOCKED_BY_UPSTREAM';
    summary = `Upstream komikindo.ch menolak akses dari IP hosting (${runtimeType}) dengan HTTP 403 Forbidden atau Cloudflare challenge.`;
    recommendations.push(
      'Jalankan scraping langsung dari environment AI Studio yang memiliki koneksi langsung tanpa blokir Cloudflare.',
      'Data hasil scraping otomatis tersimpan ke database Supabase pusat.'
    );
  } else if (searchProbeRes.diagnostics.verdict === 'PARSER_FAILED') {
    verdict = 'PARSER_BROKEN';
    summary = 'HTML Komikindo berhasil diterima (HTTP 200), namun parser gagal mengenali struktur kartu komik.';
    recommendations.push('Periksa selector HTML Komikindo di animepost atau bsx.');
  } else if (searchProbeRes.diagnostics.httpStatus === null) {
    verdict = 'NETWORK_ERROR';
    summary = 'Koneksi jaringan gagal menjangkau komikindo.ch.';
    recommendations.push('Periksa DNS atau konektivitas keluar container.');
  } else {
    verdict = 'WORKING';
    summary = `Scraper Komikindo bekerja normal pada runtime ${runtimeType}. ${searchProbeRes.data.length} komik ditemukan.`;
  }

  return {
    timestamp: new Date().toISOString(),
    verdict,
    status: searchProbeRes.status,
    summary,
    durationMs: Date.now() - startTime,
    runtime: runtimeType,
    probes: {
      homepage: homepageProbe,
      search: searchProbeRes.diagnostics,
      detail: detailProbe
    },
    recommendations
  };
}

/**
 * Complete Full-Package Import Pipeline
 * Returns canonical Comic and Chapters (with extracted image pages)
 */
export async function scrapeKomikindoImportFull(
  request: KomikindoImportRequest
): Promise<KomikindoImportResponse> {
  const startTime = Date.now();
  const errors: string[] = [];
  const target = request.slug || request.comicUrl || '';

  if (!target) {
    return {
      ok: false,
      source: 'komikindo',
      stage: 'failed',
      comicCount: 0,
      chapterCount: 0,
      imageCount: 0,
      errors: ['Parameter slug or comicUrl is required'],
      durationMs: Date.now() - startTime,
      execution: 'direct_server'
    };
  }

  try {
    // 1. Fetch metadata & chapter structure
    const detail = await scrapeKomikindoDetail(target);
    const comicId = `comic-ki-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString().split('T')[0];

    const comic = {
      id: comicId,
      title: detail.title,
      slug: detail.slug,
      coverImage: detail.coverImage,
      bannerImage: detail.bannerImage || detail.coverImage,
      synopsis: detail.synopsis,
      genres: detail.genres,
      status: detail.status,
      storyWriter: detail.storyWriter,
      artist: detail.artist,
      rating: detail.rating,
      ratingCount: 0,
      totalChapters: detail.chapters.length,
      totalReaders: 0,
      createdAt: now,
      updatedAt: now,
      isTrending: true,
      isFeatured: true,
      contentType: detail.contentType,
      comicType: detail.comicType,
      type: detail.comicType,
      isFree: detail.contentType === 'normal',
      isVisibleOnHome: true,
      showOnHome: true,
      isPublished: true,
      sourceApi: 'Komikindo API (komikindo.ch)',
      sourceUrl: detail.url
    };

    let chaptersToProcess = detail.chapters;
    if (request.maxChapters && request.maxChapters > 0) {
      chaptersToProcess = chaptersToProcess.slice(0, request.maxChapters);
    }

    const includeImages = request.includeImages !== false;
    let totalImagesExtracted = 0;

    const chapters = [];
    for (let i = 0; i < chaptersToProcess.length; i++) {
      const ch = chaptersToProcess[i];
      let pages: any[] = [];

      if (includeImages) {
        try {
          const pageRes = await scrapeKomikindoChapterPages(ch.url || ch.slug);
          if (pageRes && Array.isArray(pageRes.pages) && pageRes.pages.length > 0) {
            pages = pageRes.pages;
            totalImagesExtracted += pages.length;
          }
        } catch (pageErr: any) {
          errors.push(`Chapter ${ch.chapterNumber} image extraction failed: ${pageErr.message}`);
        }
      }

      chapters.push({
        id: `ch-${comicId}-${String(ch.chapterNumber).replace('.', '_')}`,
        comicId,
        chapterNumber: ch.chapterNumber,
        title: ch.title || `Chapter ${ch.chapterNumber}`,
        slug: ch.slug || `${detail.slug}-chapter-${ch.chapterNumber}`,
        releaseDate: ch.releaseDate || now,
        pagesCount: pages.length,
        sourceType: 'images' as const,
        pages,
        externalUrl: ch.url || '',
        driveUrl: ch.url || ''
      });
    }

    return {
      ok: true,
      source: 'komikindo',
      stage: 'complete',
      comicCount: 1,
      chapterCount: chapters.length,
      imageCount: totalImagesExtracted,
      comic,
      chapters,
      errors,
      durationMs: Date.now() - startTime,
      execution: 'direct_server'
    };
  } catch (err: any) {
    return {
      ok: false,
      source: 'komikindo',
      stage: 'failed',
      comicCount: 0,
      chapterCount: 0,
      imageCount: 0,
      errors: [err.message || 'Scrape Komikindo import failed'],
      durationMs: Date.now() - startTime,
      execution: 'direct_server'
    };
  }
}
