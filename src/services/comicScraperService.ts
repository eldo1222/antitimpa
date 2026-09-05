import { Comic, Chapter, ComicContentType, ComicCategoryType } from '../types';
import { getProfessionalComicSkeletonUrl } from '../components/common/ComicSkeletonBox';
import { ChapterRepository } from '../features/chapters/services/chapterRepository';

// Helper to determine if a comic is strictly 18+ based on genres, content rating, and metadata
export const ADULT_GENRE_KEYWORDS = [
  'hentai',
  'ecchi',
  'erotica',
  'erotic',
  'pornographic',
  'smut',
  '18+',
  'dewasa',
  'mature romance',
  'r-18',
  'adult',
  'milf',
  'netorare',
  'ntr',
  'uncensored',
  'sex',
  'yaoi',
  'yuri 18+',
  'eromanga'
];

export function isStrictlyAdultComic(params: {
  genres?: string[];
  contentRating?: string;
  title?: string;
  synopsis?: string;
  categoryFilter?: string;
  defaultContentType?: string;
}): boolean {
  // If explicitly requested as '18plus' category
  if (params.categoryFilter === '18plus') return true;

  const contentRating = (params.contentRating || '').toLowerCase();
  if (contentRating === 'erotica' || contentRating === 'pornographic') {
    return true;
  }

  const allGenresStr = (params.genres || []).map(g => String(g).toLowerCase()).join(' ');
  const titleStr = (params.title || '').toLowerCase();

  const isMatchedInGenres = ADULT_GENRE_KEYWORDS.some(kw => 
    allGenresStr.includes(kw)
  );

  if (isMatchedInGenres) return true;

  // Check specific explicit title keywords
  if (/\b(18\+|hentai|ecchi|r-18|milf|netorare|uncensored)\b/i.test(titleStr)) {
    return true;
  }

  // If user explicitly forced '18plus' in manual override and didn't select 'auto'
  if (params.defaultContentType === '18plus') {
    return true;
  }

  return false;
}

export function getFallbackCover(title: string = 'Komik AntiTimpa', type: string = 'manga'): string {
  return getProfessionalComicSkeletonUrl(title, type);
}

export interface ScrapedComicResult {
  title: string;
  slug: string;
  coverImage: string;
  bannerImage: string;
  synopsis: string;
  genres: string[];
  status: 'ongoing' | 'completed';
  storyWriter: string;
  artist: string;
  rating: number;
  totalChapters: number;
  contentType: ComicContentType;
  comicType: ComicCategoryType;
  isFree: boolean;
  isVisibleOnHome: boolean;
  isPublished: boolean;
  sourceApi: string;
  sourceUrl?: string;
  mangaDexId?: string;
  samplePages?: string[];
  chapters?: {
    chapterNumber: number;
    title: string;
    releaseDate: string;
    pagesCount: number;
    driveUrl?: string;
  }[];
}

// 1. Live Fetch from MangaDex Public API with Category and 18+ Filter Intelligence
export async function searchMangaDex(
  query: string = '', 
  limit: number = 50,
  categoryFilter: 'all' | 'manga' | 'manhwa' | 'manhua' | 'doujin' | '18plus' = 'all',
  offset: number = 0
): Promise<ScrapedComicResult[]> {
  const qLower = query.trim().toLowerCase();
  const isAdultIntent = categoryFilter === '18plus' || 
    /18\+|dewasa|adult|erotica|hentai|ecchi|porn|vip|sex|milf|harem/i.test(qLower);
  const isGenericKeyword = ['18+', 'dewasa', 'adult', 'manhwa', 'manhua', 'manga', 'doujin', 'doujinshi', 'all', '', 'semua', 'komik'].includes(qLower);
  const qTitle = (!isGenericKeyword && query.trim().length > 0) ? query.trim() : '';
  const safeLimit = Math.min(500, Math.max(1, limit || 50));
  const safeOffset = Math.max(0, offset || 0);

  // Attempt 1: Call our internal server proxy or Vercel Serverless Function
  try {
    const params = new URLSearchParams();
    if (qTitle) params.append('title', qTitle);
    params.append('limit', String(safeLimit));
    params.append('offset', String(safeOffset));
    params.append('category', categoryFilter);
    if (isAdultIntent) {
      params.append('rating', '18plus');
    }

    const proxyRes = await fetch(`/api/mangadex/search?${params.toString()}`);
    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        return mapMangaDexItems(data.data, isAdultIntent);
      }
    }
  } catch (proxyErr) {
    console.warn('Server proxy MangaDex fetch failed, trying direct API:', proxyErr);
  }

  // Attempt 2: Direct MangaDex API (supports high-capacity fetching)
  try {
    const fetchDirectChunk = async (chunkLimit: number, chunkOffset: number) => {
      const params = new URLSearchParams();
      params.set('limit', String(Math.min(100, chunkLimit)));
      params.set('offset', String(chunkOffset));
      params.append('includes[]', 'cover_art');
      params.append('includes[]', 'author');
      params.append('includes[]', 'artist');

      if (qTitle) {
        params.set('title', qTitle);
        params.set('order[relevance]', 'desc');
      } else {
        params.set('order[followedCount]', 'desc');
      }

      // Content Rating
      if (isAdultIntent) {
        params.append('contentRating[]', 'erotica');
        params.append('contentRating[]', 'pornographic');
      } else {
        params.append('contentRating[]', 'safe');
        params.append('contentRating[]', 'suggestive');
        params.append('contentRating[]', 'erotica');
        params.append('contentRating[]', 'pornographic');
      }

      if (!qTitle) {
        if (categoryFilter === 'manhwa') {
          params.append('originalLanguage[]', 'ko');
        } else if (categoryFilter === 'manhua') {
          params.append('originalLanguage[]', 'zh');
          params.append('originalLanguage[]', 'zh-hk');
        } else if (categoryFilter === 'manga' || categoryFilter === 'doujin') {
          params.append('originalLanguage[]', 'ja');
        }
      }

      const url = `https://api.mangadex.org/manga?${params.toString()}`;
      const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (response.ok) {
        return await response.json();
      }
      return null;
    };

    const firstJson = await fetchDirectChunk(Math.min(100, safeLimit), safeOffset);
    if (firstJson && firstJson.data && Array.isArray(firstJson.data) && firstJson.data.length > 0) {
      let allDirectData = [...firstJson.data];
      const totalDirect = typeof firstJson.total === 'number' ? firstJson.total : allDirectData.length;

      if (safeLimit > 100 && totalDirect > allDirectData.length) {
        const targetCount = Math.min(safeLimit, totalDirect);
        let curOffset = safeOffset + allDirectData.length;

        while (allDirectData.length < targetCount && curOffset < totalDirect) {
          const nextChunkLimit = Math.min(100, targetCount - allDirectData.length);
          try {
            const nextJson = await fetchDirectChunk(nextChunkLimit, curOffset);
            if (nextJson && Array.isArray(nextJson.data) && nextJson.data.length > 0) {
              allDirectData.push(...nextJson.data);
              curOffset += nextJson.data.length;
              if (nextJson.data.length < nextChunkLimit) break;
            } else {
              break;
            }
          } catch {
            break;
          }
        }
      }

      return mapMangaDexItems(allDirectData, isAdultIntent);
    }
  } catch (directErr) {
    console.warn('Direct MangaDex fetch failed:', directErr);
  }

  // Attempt 3: If user searched a title and MangaDex returned empty, try Komikindo & Jikan
  if (qTitle) {
    try {
      const kiResults = await searchKomikindo(qTitle, categoryFilter as any);
      if (kiResults && kiResults.length > 0) {
        return kiResults;
      }
    } catch {
      // Continue to next fallback smoothly
    }

    try {
      const jikanResults = await searchJikanManga(qTitle, Math.min(25, safeLimit));
      if (jikanResults && jikanResults.length > 0) {
        const presetMatches = filterPresetFallback(query, categoryFilter);
        const combined = [...jikanResults, ...presetMatches];
        const uniqueTitles = new Set<string>();
        return combined.filter(item => {
          if (uniqueTitles.has(item.title.toLowerCase())) return false;
          uniqueTitles.add(item.title.toLowerCase());
          return true;
        });
      }
    } catch (jikanErr) {
      console.warn('Jikan fallback failed:', jikanErr);
    }
  }

  // Final Fallback: Curated smart presets
  return filterPresetFallback(query, categoryFilter);
}

// Transform raw MangaDex data into ScrapedComicResult
function mapMangaDexItems(items: any[], isAdultIntent: boolean): ScrapedComicResult[] {
  return items.map((item: any) => {
    const attributes = item.attributes || {};
    const titleObj = attributes.title || {};
    const altTitles = attributes.altTitles || [];
    
    let title = titleObj.en || titleObj.ja || titleObj.ko || titleObj.zh || titleObj.id || Object.values(titleObj)[0];
    if (!title && altTitles.length > 0) {
      for (const alt of altTitles) {
        if (alt.en || alt.ja || alt.ko || alt.id || alt.zh) {
          title = alt.en || alt.ja || alt.ko || alt.id || alt.zh;
          break;
        }
      }
    }
    if (!title) title = 'Manga Title';
    
    const descObj = attributes.description || {};
    let synopsis = descObj.en || descObj.id || descObj.ja || descObj.ko || Object.values(descObj)[0] || '';
    if (!synopsis || synopsis.trim().length < 10) {
      synopsis = `${title} adalah serial komik populer dari database MangaDex API dengan update berkala.`;
    }

    let coverFileName = '';
    let authorName = 'Official Writer';
    let artistName = 'Official Artist';

    if (Array.isArray(item.relationships)) {
      for (const rel of item.relationships) {
        if (rel.type === 'cover_art' && rel.attributes?.fileName) {
          coverFileName = rel.attributes.fileName;
        }
        if (rel.type === 'author' && rel.attributes?.name) {
          authorName = rel.attributes.name;
        }
        if (rel.type === 'artist' && rel.attributes?.name) {
          artistName = rel.attributes.name;
        }
      }
    }

    const coverImage = coverFileName 
      ? `https://uploads.mangadex.org/covers/${item.id}/${coverFileName}.512.jpg`
      : getFallbackCover(title);

    const bannerImage = coverFileName
      ? `https://uploads.mangadex.org/covers/${item.id}/${coverFileName}`
      : coverImage;

    const genres = (attributes.tags || [])
      .map((t: any) => t.attributes?.name?.en)
      .filter(Boolean);

    const contentRating = (attributes.contentRating || 'safe').toLowerCase();
    const isAdult = isStrictlyAdultComic({
      genres,
      contentRating,
      title,
      synopsis,
      categoryFilter: isAdultIntent ? '18plus' : 'all'
    });
    const status = attributes.status === 'completed' ? 'completed' : 'ongoing';

    const rawOriginalLang = (attributes.originalLanguage || '').toLowerCase();
    let comicType: ComicCategoryType = 'manga';
    if (rawOriginalLang === 'ko') comicType = 'manhwa';
    else if (rawOriginalLang === 'zh' || rawOriginalLang === 'zh-hk') comicType = 'manhua';
    else if (isAdult) comicType = 'webtoon';

    let totalChapters = 0;
    if (attributes.lastChapter) {
      const parsed = parseFloat(attributes.lastChapter);
      if (!isNaN(parsed) && parsed > 0) {
        totalChapters = Math.floor(parsed);
      }
    }

    return {
      title: typeof title === 'string' ? title : String(title),
      slug: (typeof title === 'string' ? title : 'manga')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
      coverImage,
      bannerImage,
      synopsis: typeof synopsis === 'string' ? synopsis.slice(0, 450) : 'Sinopsis komik.',
      genres: genres.length > 0 ? genres.slice(0, 6) : [isAdult ? 'Romance 18+' : 'Action', 'Drama'],
      status,
      storyWriter: authorName,
      artist: artistName,
      rating: isAdult ? 4.9 : 4.85,
      totalChapters,
      contentType: isAdult ? '18plus' : 'normal',
      comicType,
      isFree: !isAdult,
      isVisibleOnHome: true,
      isPublished: true,
      sourceApi: 'MangaDex API',
      sourceUrl: `https://mangadex.org/title/${item.id}`,
      mangaDexId: item.id
    };
  });
}

// 2. Fallback Filter Generator to ensure Admin never sees blank results
function filterPresetFallback(query: string, categoryFilter: string): ScrapedComicResult[] {
  const qLower = query.trim().toLowerCase();
  return PRESET_IMPORT_FEEDS.filter(item => {
    if (categoryFilter === '18plus') return item.contentType === '18plus';
    if (categoryFilter !== 'all' && item.comicType !== categoryFilter) return false;
    if (qLower && !['18+', 'dewasa', 'manhwa', 'manhua', 'manga', 'all', ''].includes(qLower)) {
      return item.title.toLowerCase().includes(qLower) || 
             item.genres.some(g => g.toLowerCase().includes(qLower)) ||
             item.storyWriter.toLowerCase().includes(qLower);
    }
    return true;
  });
}

// 3. Live Fetch from Jikan (MyAnimeList Manga API) with Server Proxy and Multi-Tier Resilience
export async function searchJikanManga(query: string = '', limit: number = 16): Promise<ScrapedComicResult[]> {
  try {
    const qStr = query.trim();
    let json: any = null;

    // Attempt 1: Internal server proxy (handles Jikan + Kitsu fallback + Cache)
    try {
      const proxyRes = await fetch(`/api/jikan/search?q=${encodeURIComponent(qStr)}&limit=${limit}`);
      if (proxyRes.ok) {
        json = await proxyRes.json();
      }
    } catch (e) {
      // Direct fallback below
    }

    // Attempt 2: Direct Kitsu API (if server proxy unreachable)
    if (!json || !json.data || !Array.isArray(json.data) || json.data.length === 0) {
      try {
        const kitsuUrl = qStr 
          ? `https://kitsu.io/api/edge/manga?filter[text]=${encodeURIComponent(qStr)}&page[limit]=${limit}`
          : `https://kitsu.io/api/edge/manga?sort=-userCount&page[limit]=${limit}`;
        const kRes = await fetch(kitsuUrl);
        if (kRes.ok) {
          const kJson = await kRes.json();
          if (kJson && Array.isArray(kJson.data) && kJson.data.length > 0) {
            return kJson.data.map((item: any) => {
              const attr = item.attributes || {};
              const titles = attr.titles || {};
              const title = attr.canonicalTitle || titles.en || titles.en_jp || Object.values(titles)[0] || 'Manga Title';
              const poster = attr.posterImage || {};
              const imgUrl = poster.large || poster.original || poster.medium || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80';
              const subtype = (attr.subtype || attr.mangaType || 'manga').toLowerCase();
              let comicType: ComicCategoryType = 'manga';
              if (subtype === 'manhwa') comicType = 'manhwa';
              else if (subtype === 'manhua') comicType = 'manhua';
              else if (subtype === 'doujin') comicType = 'doujin';

              const isAdult = attr.ageRating === 'R18' || /18\+|hentai|ecchi|erotica/i.test(title);

              return {
                title,
                slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
                coverImage: imgUrl,
                bannerImage: imgUrl,
                synopsis: (attr.synopsis || attr.description || 'Sinopsis komik terverifikasi dari database MyAnimeList / Kitsu.').slice(0, 450),
                genres: [comicType === 'manhwa' ? 'Manhwa' : 'Action', 'Drama', 'Fantasy'],
                status: attr.status === 'finished' ? 'completed' : 'ongoing',
                storyWriter: 'Official Author',
                artist: 'Official Artist',
                rating: attr.averageRating ? Math.min(5, Math.max(1, (parseFloat(attr.averageRating) / 20))) : 4.8,
                totalChapters: attr.chapterCount || 45,
                contentType: isAdult ? '18plus' : 'normal',
                comicType,
                isFree: !isAdult,
                isVisibleOnHome: true,
                isPublished: true,
                sourceApi: 'MyAnimeList / Kitsu API',
                sourceUrl: `https://kitsu.io/manga/${item.id}`
              };
            });
          }
        }
      } catch (kErr) {
        console.warn('Direct Kitsu fallback failed:', kErr);
      }
    }

    if (!json || !json.data || !Array.isArray(json.data)) return [];

    return json.data.map((item: any) => {
      const genres = (item.genres || []).map((g: any) => typeof g === 'string' ? g : g.name);
      const isAdult = (item.explicit_genres && item.explicit_genres.length > 0) || 
                      genres.some((g: string) => /hentai|ecchi|erotica|adult/i.test(g));
      
      const typeLower = (item.type || '').toLowerCase();
      let comicType: ComicCategoryType = 'manga';
      if (typeLower === 'manhwa') comicType = 'manhwa';
      else if (typeLower === 'manhua') comicType = 'manhua';
      else if (typeLower === 'doujinshi' || typeLower === 'doujin') comicType = 'doujin';

      const title = item.title_english || item.title || 'Manga Title';

      return {
        title,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        coverImage: item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
        bannerImage: item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80',
        synopsis: (item.synopsis || 'Sinopsis komik terverifikasi dari database MyAnimeList.').slice(0, 450),
        genres: genres.length > 0 ? genres.slice(0, 5) : ['Action', 'Fantasy'],
        status: item.publishing ? 'ongoing' : 'completed',
        storyWriter: item.authors?.[0]?.name || 'Author Official',
        artist: item.authors?.[1]?.name || item.authors?.[0]?.name || 'Artist Official',
        rating: item.score ? Math.min(5, Math.max(1, (item.score / 2))) : 4.8,
        totalChapters: item.chapters || 45,
        contentType: isAdult ? '18plus' : 'normal',
        comicType,
        isFree: !isAdult,
        isVisibleOnHome: true,
        isPublished: true,
        sourceApi: 'Jikan MyAnimeList API',
        sourceUrl: item.url
      };
    });
  } catch (err) {
    console.warn('Jikan fetch failed:', err);
    return [];
  }
}

// 4. Live Scraper from Komikindo (komikindo.ch - Manga, Manhwa, Manhua Indo)
export async function searchKomikindo(
  query: string = '', 
  categoryFilter: 'all' | 'manga' | 'manhwa' | 'manhua' | '18plus' = 'all',
  order: 'popular' | 'latest' | 'update' = 'popular',
  page: number = 1
): Promise<ScrapedComicResult[]> {
  const rawQ = query.trim();
  const isAll = rawQ.toLowerCase() === 'all' || rawQ.toLowerCase() === 'semua';
  const cleanQ = isAll ? '' : rawQ;

  const params = new URLSearchParams();
  if (cleanQ) {
    params.append('q', cleanQ);
    params.append('searchQuery', cleanQ);
  }
  params.append('category', categoryFilter);
  params.append('page', String(page));
  params.append('order', order);

  let lastStatus: string = '';
  let lastMessage: string = '';
  let lastDiagnostics: any = null;
  let lastError: any = null;

  // Attempt 1: Standard endpoint /api/komikindo/search
  try {
    const res = await fetch(`/api/komikindo/search?${params.toString()}`);
    if (res.ok) {
      const json = await res.json();
      lastStatus = json.status || '';
      lastMessage = json.message || '';
      lastDiagnostics = json.diagnostics || null;

      if (json.status === 'KOMIKINDO_FETCH_FAILED') {
        throw new Error(`[KOMIKINDO_FETCH_FAILED] ${json.message || json.error || 'Gagal terhubung ke KomikIndo'}`);
      }
      if (json.status === 'KOMIKINDO_PARSER_FAILED') {
        throw new Error(`[KOMIKINDO_PARSER_FAILED] ${json.message || json.error || 'Parser KomikIndo gagal memproses HTML'}`);
      }

      if (json.data && Array.isArray(json.data) && json.data.length > 0) {
        const mapped = json.data.map((item: any) => {
          let comicType: ComicCategoryType = item.comicType || 'manga';
          const isAdult = categoryFilter === '18plus' || /18\+|dewasa|adult|ecchi|hentai/i.test(item.title);

          return {
            title: item.title,
            slug: item.slug || item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            coverImage: item.coverImage || getFallbackCover(item.title, comicType),
            bannerImage: item.coverImage || getFallbackCover(item.title, comicType),
            synopsis: `Komik ${item.title} terjemahan Bahasa Indonesia dari Komikindo. Status ${item.latestChapter || 'Chapter Terbaru'}.`,
            genres: [comicType === 'manhwa' ? 'Manhwa' : 'Action', 'Drama', isAdult ? 'Romance 18+' : 'Adventure'],
            status: 'ongoing',
            storyWriter: 'Komikindo Author',
            artist: 'Komikindo Artist',
            rating: item.rating || 4.8,
            totalChapters: 30,
            contentType: isAdult ? '18plus' : 'normal',
            comicType,
            isFree: !isAdult,
            isVisibleOnHome: true,
            isPublished: true,
            sourceApi: 'Komikindo API (komikindo.ch)',
            sourceUrl: item.url || `https://komikindo.ch/komik/${item.slug}/`
          };
        });
        (mapped as any).status = 'KOMIKINDO_OK';
        (mapped as any).diagnostics = json.diagnostics;
        return mapped;
      }

      if (json.status === 'KOMIKINDO_SEARCH_EMPTY') {
        const empty: ScrapedComicResult[] = [];
        (empty as any).status = 'KOMIKINDO_SEARCH_EMPTY';
        (empty as any).statusMessage = json.message || (cleanQ ? `Tidak ditemukan komik untuk "${cleanQ}".` : `Tidak ditemukan komik pada kategori "${categoryFilter}".`);
        (empty as any).diagnostics = json.diagnostics;
        return empty;
      }
    }
  } catch (e: any) {
    lastError = e;
    if (e.message?.startsWith('[KOMIKINDO_')) {
      throw e;
    }
    console.warn('Komikindo search error via /api/komikindo/search:', e);
  }

  // Attempt 2: Direct serverless route /api/komikindo-proxy?action=search
  try {
    params.set('action', 'search');
    const res = await fetch(`/api/komikindo-proxy?${params.toString()}`);
    if (res.ok) {
      const json = await res.json();
      lastStatus = json.status || '';
      lastMessage = json.message || '';
      lastDiagnostics = json.diagnostics || null;

      if (json.status === 'KOMIKINDO_FETCH_FAILED') {
        throw new Error(`[KOMIKINDO_FETCH_FAILED] ${json.message || json.error || 'Gagal terhubung ke KomikIndo'}`);
      }
      if (json.status === 'KOMIKINDO_PARSER_FAILED') {
        throw new Error(`[KOMIKINDO_PARSER_FAILED] ${json.message || json.error || 'Parser KomikIndo gagal memproses HTML'}`);
      }

      if (json.data && Array.isArray(json.data) && json.data.length > 0) {
        const mapped = json.data.map((item: any) => {
          let comicType: ComicCategoryType = item.comicType || 'manga';
          const isAdult = categoryFilter === '18plus' || /18\+|dewasa|adult|ecchi|hentai/i.test(item.title);

          return {
            title: item.title,
            slug: item.slug || item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            coverImage: item.coverImage || getFallbackCover(item.title, comicType),
            bannerImage: item.coverImage || getFallbackCover(item.title, comicType),
            synopsis: `Komik ${item.title} terjemahan Bahasa Indonesia dari Komikindo. Status ${item.latestChapter || 'Chapter Terbaru'}.`,
            genres: [comicType === 'manhwa' ? 'Manhwa' : 'Action', 'Drama', isAdult ? 'Romance 18+' : 'Adventure'],
            status: 'ongoing',
            storyWriter: 'Komikindo Author',
            artist: 'Komikindo Artist',
            rating: item.rating || 4.8,
            totalChapters: 30,
            contentType: isAdult ? '18plus' : 'normal',
            comicType,
            isFree: !isAdult,
            isVisibleOnHome: true,
            isPublished: true,
            sourceApi: 'Komikindo API (komikindo.ch)',
            sourceUrl: item.url || `https://komikindo.ch/komik/${item.slug}/`
          };
        });
        (mapped as any).status = 'KOMIKINDO_OK';
        (mapped as any).diagnostics = json.diagnostics;
        return mapped;
      }

      if (json.status === 'KOMIKINDO_SEARCH_EMPTY') {
        const empty: ScrapedComicResult[] = [];
        (empty as any).status = 'KOMIKINDO_SEARCH_EMPTY';
        (empty as any).statusMessage = json.message || (cleanQ ? `Tidak ditemukan komik untuk "${cleanQ}".` : `Tidak ditemukan komik pada kategori "${categoryFilter}".`);
        (empty as any).diagnostics = json.diagnostics;
        return empty;
      }
    }
  } catch (e: any) {
    lastError = e;
    if (e.message?.startsWith('[KOMIKINDO_')) {
      throw e;
    }
    console.warn('Komikindo search error via /api/komikindo-proxy:', e);
  }

  if (lastError && lastError.message?.startsWith('[KOMIKINDO_')) {
    throw lastError;
  }

  if (lastStatus === 'KOMIKINDO_SEARCH_EMPTY') {
    const empty: ScrapedComicResult[] = [];
    (empty as any).status = 'KOMIKINDO_SEARCH_EMPTY';
    (empty as any).statusMessage = lastMessage || (cleanQ ? `Tidak ditemukan komik untuk "${cleanQ}".` : `Tidak ditemukan komik pada kategori "${categoryFilter}".`);
    (empty as any).diagnostics = lastDiagnostics;
    return empty;
  }

  // If both endpoints failed completely
  throw new Error(`[KOMIKINDO_FETCH_FAILED] Server tidak dapat menjangkau proxy KomikIndo (${lastError?.message || 'Network unreachable'})`);
}

/**
 * Diagnostic probe caller for authorized admin / forensic audit
 */
export async function fetchKomikindoDiagnostic(query: string = 'titan forge'): Promise<any> {
  const sanitized = encodeURIComponent(query.slice(0, 40));
  try {
    const res = await fetch(`/api/komikindo/diagnostic?q=${sanitized}`);
    if (res.ok) return await res.json();
  } catch (err) {}

  // Fallback to serverless direct action
  const res = await fetch(`/api/komikindo-proxy?action=diagnostic&q=${sanitized}`);
  if (!res.ok) {
    throw new Error(`Diagnostic failed with status ${res.status}`);
  }
  return await res.json();
}

// 5. Fetch Full Detail + Chapters from Komikindo
export async function fetchKomikindoDetail(slugOrUrl: string): Promise<any> {
  const cleanSlug = slugOrUrl.startsWith('http')
    ? (slugOrUrl.replace(/\/$/, '').split('/').pop() || '')
    : slugOrUrl.replace(/^\/|\/$/g, '');

  try {
    const res = await fetch(`/api/komikindo/comic/${encodeURIComponent(cleanSlug)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.data) return json.data;
    }
  } catch (e) {}

  try {
    const res = await fetch(`/api/komikindo-proxy?action=detail&slug=${encodeURIComponent(cleanSlug)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.data) return json.data;
    }
  } catch (e) {}

  return null;
}

export async function getKomikindoDetail(slug: string): Promise<ScrapedComicResult | null> {
  const data = await fetchKomikindoDetail(slug);
  if (!data) return null;

  return {
    title: data.title,
    slug: data.slug,
    coverImage: data.coverImage || getFallbackCover(data.title, data.comicType),
    bannerImage: data.bannerImage || data.coverImage || getFallbackCover(data.title, data.comicType),
    synopsis: data.synopsis,
    genres: data.genres || ['Manga', 'Action'],
    status: data.status || 'ongoing',
    storyWriter: data.storyWriter || 'Komikindo Author',
    artist: data.artist || 'Komikindo Artist',
    rating: data.rating || 4.8,
    totalChapters: data.chapters?.length || 0,
    contentType: data.contentType || 'normal',
    comicType: data.comicType || 'manga',
    isFree: data.contentType !== '18plus',
    isVisibleOnHome: true,
    isPublished: true,
    sourceApi: 'Komikindo API (komikindo.ch)',
    sourceUrl: data.url || `https://komikindo.ch/komik/${data.slug}/`,
    chapters: (data.chapters || []).map((ch: any) => ({
      chapterNumber: ch.chapterNumber,
      title: ch.title,
      releaseDate: ch.releaseDate,
      pagesCount: 15,
      driveUrl: ch.url || ch.slug
    }))
  };
}

// 7. Live Scraper from Doujindesu API (18+ Doujinshi, Netorare, Hentai, Manhwa 18+)
export async function searchDoujindesu(
  query: string = '',
  categoryFilter: 'all' | '18plus' | 'doujin' | 'netorare' | 'milf' | 'harem' = 'all'
): Promise<ScrapedComicResult[]> {
  try {
    const qStr = query.trim();
    // Try internal server proxy first
    try {
      const params = new URLSearchParams();
      if (qStr) params.append('q', qStr);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      const res = await fetch(`/api/doujindesu/search?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          return json.data;
        }
      }
    } catch {
      // fallback
    }

    // Filter curated Doujindesu feeds
    return DOUJINDESU_SCRAPE_FEEDS.filter(item => {
      const itemText = `${item.title} ${(item.genres || []).join(' ')} ${item.storyWriter}`.toLowerCase();
      if (qStr && !itemText.includes(qStr.toLowerCase())) return false;
      if (categoryFilter === 'netorare' && !itemText.includes('netorare') && !itemText.includes('ntr')) return false;
      if (categoryFilter === 'milf' && !itemText.includes('milf')) return false;
      if (categoryFilter === 'harem' && !itemText.includes('harem')) return false;
      if (categoryFilter === 'doujin' && item.comicType !== 'doujin') return false;
      return true;
    });
  } catch (err) {
    console.warn('Doujindesu fetch failed:', err);
    return DOUJINDESU_SCRAPE_FEEDS;
  }
}

// 4. Rich Curated Catalog with ready-to-import Manga, Manhwa, Manhua & 18+ VIP Feeds
export const PRESET_IMPORT_FEEDS: ScrapedComicResult[] = [
  // ==========================================
  // 1. MANGA (Jepang / Normal Bebas Baca)
  // ==========================================
  {
    title: 'One Piece: Egghead Arc',
    slug: 'one-piece-egghead-arc',
    coverImage: 'https://images.unsplash.com/photo-1569705460033-cfaa4bf9f822?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Luffy dan kru Topi Jerami tiba di Pulau Masa Depan Egghead, laboratorium milik ilmuwan jenius Dr. Vegapunk. Misteri abad kekosongan dan rahasia Buah Iblis mulai terungkap ke seluruh dunia!',
    genres: ['Action', 'Adventure', 'Fantasy', 'Shounen', 'Superpower'],
    status: 'ongoing',
    storyWriter: 'Eiichiro Oda',
    artist: 'Eiichiro Oda',
    rating: 5.0,
    totalChapters: 1110,
    contentType: 'normal',
    comicType: 'manga',
    isFree: true,
    isVisibleOnHome: true,
    isPublished: true,
    sourceApi: 'Shueisha Jump Feed',
    sourceUrl: 'https://shonenjump.com'
  },
  {
    title: 'Jujutsu Kaisen: Shinjuku Showdown',
    slug: 'jujutsu-kaisen-shinjuku-showdown',
    coverImage: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1569705460033-cfaa4bf9f822?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Pertarungan puncak penentuan nasib dunia antara Gojo Satoru dan Raja Kutukan Ryomen Sukuna di reruntuhan Shinjuku. Siapakah penyihir terkuat sepanjang sejarah?',
    genres: ['Action', 'Supernatural', 'Dark Fantasy', 'Shounen'],
    status: 'ongoing',
    storyWriter: 'Gege Akutami',
    artist: 'Gege Akutami',
    rating: 4.9,
    totalChapters: 72,
    contentType: 'normal',
    comicType: 'manga',
    isFree: true,
    isVisibleOnHome: true,
    isPublished: true,
    sourceApi: 'Shueisha MangaPlus Feed',
    sourceUrl: 'https://mangaplus.shueisha.co.jp'
  },
  {
    title: 'Chainsaw Man: Public Safety Arc',
    slug: 'chainsaw-man-public-safety',
    coverImage: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Denji hidup dalam kemiskinan ekstrem bersama iblis gergaji mesin peliharaannya, Pochita. Setelah terbunuh, Pochita membuat kontrak yang membangkitkan Denji menjadi Iblis Gergaji pembasmi monster!',
    genres: ['Action', 'Gore', 'Dark Fantasy', 'Comedy', 'Supernatural'],
    status: 'ongoing',
    storyWriter: 'Tatsuki Fujimoto',
    artist: 'Tatsuki Fujimoto',
    rating: 4.9,
    totalChapters: 160,
    contentType: 'normal',
    comicType: 'manga',
    isFree: true,
    isVisibleOnHome: true,
    isPublished: true,
    sourceApi: 'MangaDex Direct',
    sourceUrl: 'https://mangadex.org'
  },
  {
    title: 'Blue Lock: Egoist Football',
    slug: 'blue-lock-egoist-football',
    coverImage: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Asosiasi Sepak Bola Jepang mengumpulkan 300 striker muda terbaik dalam fasilitas penjara tertutup bernama Blue Lock. Hanya satu striker paling egois dan haus gol yang akan memimpin timnas menuju juara piala dunia!',
    genres: ['Sports', 'Psychological', 'Shounen', 'Action', 'Drama'],
    status: 'ongoing',
    storyWriter: 'Muneyuki Kaneshiro',
    artist: 'Yusuke Nomura',
    rating: 4.9,
    totalChapters: 250,
    contentType: 'normal',
    comicType: 'manga',
    isFree: true,
    isVisibleOnHome: true,
    isPublished: true,
    sourceApi: 'Kodansha Manga Feed',
    sourceUrl: 'https://kodansha.us'
  },
  {
    title: 'Spy x Family: Operation Strix',
    slug: 'spy-x-family-operation-strix',
    coverImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Agen rahasia Twilight harus menyamar sebagai dokter psikiater dan mengadopsi anak perempuan telepati Anya serta menikahi pembunuh bayaran Yor untuk misi menjaga perdamaian dunia.',
    genres: ['Comedy', 'Action', 'Family', 'Slice of Life', 'Shounen'],
    status: 'ongoing',
    storyWriter: 'Tatsuya Endo',
    artist: 'Tatsuya Endo',
    rating: 4.9,
    totalChapters: 95,
    contentType: 'normal',
    comicType: 'manga',
    isFree: true,
    isVisibleOnHome: true,
    isPublished: true,
    sourceApi: 'Shonen Jump+',
    sourceUrl: 'https://shonenjumpplus.com'
  },

  // ==========================================
  // 2. MANHWA (Korea / Normal Bebas Baca)
  // ==========================================
  {
    title: 'Solo Leveling: Ragnarok (Season 2)',
    slug: 'solo-leveling-ragnarok',
    coverImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Bumi kembali terancam oleh monster gerbang dimensi baru. Sung Su-Ho, putra dari Hunter Terkuat Sung Jin-Woo, membangkitkan kekuatan bayangan misterius dalam darahnya dan memulai perjalanan solo hunter berikutnya.',
    genres: ['Action', 'Fantasy', 'Overpowered', 'Dungeon', 'Leveling'],
    status: 'ongoing',
    storyWriter: 'Chugong & Daul',
    artist: 'REDICE Studio',
    rating: 4.9,
    totalChapters: 30,
    contentType: 'normal',
    comicType: 'manhwa',
    isFree: true,
    isVisibleOnHome: true,
    isPublished: true,
    sourceApi: 'KakaoPage / Webtoon Scraper',
    sourceUrl: 'https://page.kakao.com'
  },
  {
    title: 'Eleceed: Awakening Lightning',
    slug: 'eleceed-awakening-lightning',
    coverImage: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Jiwoo adalah pemuda yang memiliki kekuatan kecepatan super namun menyembunyikannya. Hidupnya berubah 180 derajat setelah ia menyelamatkan kucing gemuk jalanan yang ternyata adalah Kayden, buronan ranker terkuat di dunia awakeners!',
    genres: ['Action', 'Comedy', 'Superpower', 'Shounen', 'Martial Arts'],
    status: 'ongoing',
    storyWriter: 'Son Je-Ho',
    artist: 'ZHENA',
    rating: 4.9,
    totalChapters: 65,
    contentType: 'normal',
    comicType: 'manhwa',
    isFree: true,
    isVisibleOnHome: true,
    isPublished: true,
    sourceApi: 'Naver Webtoon API',
    sourceUrl: 'https://comic.naver.com'
  },
  {
    title: 'Omniscient Reader\'s Viewpoint',
    slug: 'omniscient-readers-viewpoint',
    coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Dokja adalah satu-satunya pembaca setia yang menyelesaikan bab terakhir web novel apokaliptik. Tiba-tiba dunia nyata berubah persis seperti skenario novel tersebut!',
    genres: ['Action', 'Fantasy', 'System', 'Apocalypse', 'Survival'],
    status: 'ongoing',
    storyWriter: 'sing N song',
    artist: 'Sleepy-C',
    rating: 4.9,
    totalChapters: 85,
    contentType: 'normal',
    comicType: 'manhwa',
    isFree: true,
    isVisibleOnHome: true,
    isPublished: true,
    sourceApi: 'Naver Webtoon API',
    sourceUrl: 'https://comic.naver.com'
  },
  {
    title: 'The Beginning After The End (TBATE)',
    slug: 'the-beginning-after-the-end',
    coverImage: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Raja Grey bereinkarnasi ke dunia magis baru yang dipenuhi sihir dan monster sebagai Arthur Leywin. Memanfaatkan pengetahuan dari kehidupan lamanya, Arthur berkembang menjadi penyihir legendaris.',
    genres: ['Fantasy', 'Action', 'Reincarnation', 'Magic', 'Adventure'],
    status: 'ongoing',
    storyWriter: 'TurtleMe',
    artist: 'Fuyuki23',
    rating: 4.9,
    totalChapters: 180,
    contentType: 'normal',
    comicType: 'manhwa',
    isFree: true,
    isVisibleOnHome: true,
    isPublished: true,
    sourceApi: 'Tapas Direct Feed',
    sourceUrl: 'https://tapas.io'
  },
  {
    title: 'Nano Machine: The Heavenly Demon',
    slug: 'nano-machine-heavenly-demon',
    coverImage: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1569705460033-cfaa4bf9f822?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Cheon Yeo-Woon, pangeran sekte iblis yang terbuang dan sekarat, diselamatkan oleh keturunan masa depannya yang menyuntikkan mesin nanoteknologi canggih ke dalam tubuhnya!',
    genres: ['Martial Arts', 'Sci-Fi', 'Murim', 'Action', 'Overpowered'],
    status: 'ongoing',
    storyWriter: 'Hanjung Wolya',
    artist: 'Geum Gangbulgoe',
    rating: 4.9,
    totalChapters: 195,
    contentType: 'normal',
    comicType: 'manhwa',
    isFree: true,
    isVisibleOnHome: true,
    isPublished: true,
    sourceApi: 'Naver Webtoon API',
    sourceUrl: 'https://comic.naver.com'
  },

  // ==========================================
  // 3. MANHUA (China / Normal Bebas Baca)
  // ==========================================
  {
    title: 'Tales of Demons and Gods (Yao Shen Ji)',
    slug: 'tales-of-demons-and-gods',
    coverImage: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Nie Li, spiritualis iblis terkuat yang terbunuh dalam pertempuran melawan Sage Emperor, terbangun kembali di masa mudanya ketika ia berusia 13 tahun dengan seluruh ingatan kehidupan masa lalunya.',
    genres: ['Action', 'Cultivation', 'Martial Arts', 'Reincarnation', 'Fantasy'],
    status: 'ongoing',
    storyWriter: 'Mad Snail',
    artist: 'Jiang Ruotai',
    rating: 4.8,
    totalChapters: 120,
    contentType: 'normal',
    comicType: 'manhua',
    isFree: true,
    isVisibleOnHome: true,
    isPublished: true,
    sourceApi: 'Bilibili Comics Feed',
    sourceUrl: 'https://manga.bilibili.com'
  },
  {
    title: 'Martial Peak (Puncak Bela Diri)',
    slug: 'martial-peak-puncak-bela-diri',
    coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Perjalanan menuju puncak bela diri adalah jalan yang sepi dan berbahaya. Yang Kai, seorang penyapu lantai paviliun Lingxiao, menemukan Kitab Hitam tanpa kata yang mengubah takdirnya menjadi dewa kultivator semesta!',
    genres: ['Cultivation', 'Martial Arts', 'Action', 'Harem', 'Fantasy'],
    status: 'ongoing',
    storyWriter: 'Momo',
    artist: 'Pikapi',
    rating: 4.8,
    totalChapters: 3600,
    contentType: 'normal',
    comicType: 'manhua',
    isFree: true,
    isVisibleOnHome: true,
    isPublished: true,
    sourceApi: 'Kuaikan Manhua Feed',
    sourceUrl: 'https://kuaikanmanhua.com'
  },
  {
    title: 'Battle Through the Heavens (Doupo Cangqiong)',
    slug: 'battle-through-the-heavens',
    coverImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1569705460033-cfaa4bf9f822?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Di dunia Dou Qi di mana yang kuat memangsa yang lemah, Xiao Yan yang sempat kehilangan kekuatannya dibimbing oleh roh Yao Lao di dalam cincin pusaka untuk menaklukkan Api Surgawi!',
    genres: ['Cultivation', 'Action', 'Fantasy', 'Adventure', 'Alchemy'],
    status: 'ongoing',
    storyWriter: 'Tian Can Tu Dou',
    artist: 'Zhou Hongbin',
    rating: 4.8,
    totalChapters: 410,
    contentType: 'normal',
    comicType: 'manhua',
    isFree: true,
    isVisibleOnHome: true,
    isPublished: true,
    sourceApi: 'Tencent Comics API',
    sourceUrl: 'https://ac.qq.com'
  },

  // ==========================================
  // 4. 18+ DEWASA & DOUJINDESU VIP
  // ==========================================
  {
    title: 'Kanojo no Ane Incha Neet ni Netorareta Ore',
    slug: 'kanojo-no-ane-incha-neet-ni-netorareta-ore',
    coverImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Kisah romansa terlarang dan penuh gairah ketika aku yang terjebak dalam hubungan rumit justru tergoda dan terlibat skandal panas tak terduga dengan kakak perempuan pacarku yang seorang NEET pemalu di dalam rumah.',
    genres: ['Netorare', 'NTR', 'Milf', 'Romance 18+', 'Doujinshi', 'Drama Dewasa', 'Full Color'],
    status: 'completed',
    storyWriter: 'Doujindesu Studio',
    artist: 'Doujindesu Creator',
    rating: 4.98,
    totalChapters: 3,
    contentType: '18plus',
    comicType: 'doujin',
    isFree: false,
    isVisibleOnHome: true,
    isPublished: true,
    sourceApi: 'Doujindesu API',
    sourceUrl: 'https://doujin.desu.xxx/manga/kanojo-no-ane-incha-neet-ni-netorareta-ore'
  },
  {
    title: 'Secret Class: Private Education',
    slug: 'secret-class-private-education',
    coverImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Dae-ho yang polos diasuh oleh keluarga temannya setelah menjadi yatim piatu. Ketika beranjak dewasa, bibi dan kedua kakak perempuannya mulai memberinya pelajaran rahasia tentang kehidupan orang dewasa.',
    genres: ['Milf', 'Sister', 'Romance 18+', 'Vanilla', 'Big Tits', 'Drama Dewasa'],
    status: 'ongoing',
    storyWriter: 'Wang Kang-Cheol',
    artist: 'Minachan',
    rating: 4.95,
    totalChapters: 90,
    contentType: '18plus',
    comicType: 'webtoon',
    isFree: false,
    isVisibleOnHome: true,
    isPublished: true,
    sourceApi: 'TopToon Direct VIP Feed',
    sourceUrl: 'https://toptoon.com'
  },
  {
    title: 'Boarding Diary: Rooftop Love',
    slug: 'boarding-diary-rooftop-love',
    coverImage: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Jun-Woo tinggal di rumah kos milik teman ibunya saat kuliah. Hubungan akrab dengan ibu kos yang mempesona dan putrinya membuat hari-hari di rumah kos selalu dipenuhi godaan panas.',
    genres: ['Milf', 'Vanilla', 'Threesome', 'Romance 18+', 'Big Breast'],
    status: 'ongoing',
    storyWriter: 'Kim Jung-Hyun',
    artist: 'Park Dong-Seok',
    rating: 4.9,
    totalChapters: 80,
    contentType: '18plus',
    comicType: 'webtoon',
    isFree: false,
    isVisibleOnHome: true,
    isPublished: true,
    sourceApi: 'Lezhin VIP Feed',
    sourceUrl: 'https://lezhin.com'
  },
  {
    title: 'Stepmother Friends (Teman Ibu Tiri)',
    slug: 'stepmother-friends',
    coverImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Seok-Woo sering menghabiskan waktu di rumah bersama ibu tirinya yang anggun. Namun suasana berubah saat teman-teman sosialita sang ibu tiri mulai sering berkunjung dan menggoda dirinya.',
    genres: ['Milf', 'Romance 18+', 'Drama Dewasa', 'Harem', 'Cheating'],
    status: 'ongoing',
    storyWriter: 'Mito',
    artist: 'Gohyeon',
    rating: 4.9,
    totalChapters: 75,
    contentType: '18plus',
    comicType: 'webtoon',
    isFree: false,
    isVisibleOnHome: true,
    isPublished: true,
    sourceApi: 'TopToon Direct VIP Feed',
    sourceUrl: 'https://toptoon.com'
  },
  {
    title: 'Bad Thinking Diary',
    slug: 'bad-thinking-diary',
    coverImage: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Minji dan Yuna telah berteman baik sejak SMA. Memasuki dunia kampus, perasaan persahabatan yang polos mulai berubah menjadi hasrat asmara romantis yang tak terkendali.',
    genres: ['Yuri / GL', 'Romance 18+', 'College', 'Drama Dewasa', 'Emotional'],
    status: 'completed',
    storyWriter: 'Hodot',
    artist: 'Rangrari',
    rating: 4.8,
    totalChapters: 60,
    contentType: '18plus',
    comicType: 'webtoon',
    isFree: false,
    isVisibleOnHome: true,
    isPublished: true,
    sourceApi: 'Lezhin VIP Feed',
    sourceUrl: 'https://lezhin.com'
  },
  {
    title: 'Circles: Theater Club Scandal',
    slug: 'circles-theater-club',
    coverImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Klub drama teater kampus yang hampir bubar mendadak ramai saat anggota senior wanita yang cantik dan junior baru terlibat skandal cinta segitiga di belakang panggung.',
    genres: ['Campus', 'Romance 18+', 'Harem', 'Drama Dewasa', 'Noona'],
    status: 'ongoing',
    storyWriter: 'ZOO',
    artist: 'ZOO',
    rating: 4.8,
    totalChapters: 110,
    contentType: '18plus',
    comicType: 'webtoon',
    isFree: false,
    isVisibleOnHome: true,
    isPublished: true,
    sourceApi: 'TopToon Direct VIP Feed',
    sourceUrl: 'https://toptoon.com'
  },
  {
    title: 'Silent War (Perang Dingin Cinta)',
    slug: 'silent-war-manhwa',
    coverImage: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Hyun-Soo yang pendiam memiliki ruang rahasia dengan kamera pengintai di asramanya. Rahasia terlarang para penghuni wanita di asrama mulai terungkap satu per satu.',
    genres: ['Drama Dewasa', 'Romance 18+', 'Psychological', 'Revenge', 'Thrill'],
    status: 'completed',
    storyWriter: 'Yullo',
    artist: 'Gim Gwang-Hyeon',
    rating: 4.9,
    totalChapters: 92,
    contentType: '18plus',
    comicType: 'webtoon',
    isFree: false,
    isVisibleOnHome: true,
    isPublished: true,
    sourceApi: 'Lezhin VIP Feed',
    sourceUrl: 'https://lezhin.com'
  },
  {
    title: 'Queen Bee: Forbidden Seduction',
    slug: 'queen-bee-forbidden-seduction',
    coverImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Pyo Min-Yeob terjebak dalam pusaran intrik gelap dan manipulasi wanita paling berkuasa di kotanya. Hasrat, pengkhianatan, dan cinta terlarang bersatu dalam kisah penuh ketegangan.',
    genres: ['Drama Dewasa', 'Romance 18+', 'Revenge', 'Dark Romance', 'Thriller'],
    status: 'ongoing',
    storyWriter: 'Kangkang',
    artist: 'Namoo',
    rating: 4.9,
    totalChapters: 210,
    contentType: '18plus',
    comicType: 'webtoon',
    isFree: false,
    isVisibleOnHome: true,
    isPublished: true,
    sourceApi: 'TopToon Direct VIP Feed',
    sourceUrl: 'https://toptoon.com'
  },
  {
    title: 'Touch To Unlock: Secret Smartphone',
    slug: 'touch-to-unlock',
    coverImage: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Sebuah smartphone misterius tanpa kunci layar ditemukan di sebuah kafe. Pemiliknya ternyata menyimpan galeri foto dan video rahasia dari wanita-wanita paling cantik di kampus.',
    genres: ['Campus', 'Romance 18+', 'Harem', 'Drama Dewasa', 'Vanilla'],
    status: 'ongoing',
    storyWriter: 'Park Jin-Ho',
    artist: 'Lee Sang-Woo',
    rating: 4.85,
    totalChapters: 105,
    contentType: '18plus',
    comicType: 'webtoon',
    isFree: false,
    isVisibleOnHome: true,
    isPublished: true,
    sourceApi: 'Lezhin VIP Feed',
    sourceUrl: 'https://lezhin.com'
  }
];

export const DOUJINDESU_SCRAPE_FEEDS: ScrapedComicResult[] = PRESET_IMPORT_FEEDS.filter(
  item => item.contentType === '18plus' || item.comicType === 'doujin' || item.sourceApi.includes('Doujindesu')
);

export const PRESET_SCRAPE_FEEDS = DOUJINDESU_SCRAPE_FEEDS;

// ============================================================================
// KOMIKTAP SCRAPER & DATA EXTRACTOR (Komiktap.info)
// Scrapes comic metadata, chapters, and chapter pages directly
// ============================================================================

export async function searchKomiktap(
  query: string = '',
  category: string = 'all',
  page: number = 1,
  order: string = 'popular'
): Promise<ScrapedComicResult[]> {
  try {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (category) params.append('category', category);
    params.append('page', String(page));
    params.append('order', order);

    const res = await fetch(`/api/komiktap/search?${params.toString()}`);
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        return json.data.map((item: any) => ({
          title: item.title,
          slug: item.slug,
          coverImage: item.coverImage,
          bannerImage: item.coverImage,
          synopsis: `Komik ${item.title} dari Komiktap.info. Tipe: ${item.comicType || 'Manhwa'}.`,
          genres: ['Manhwa 18+', 'Doujin', 'Dewasa', 'Romance 18+'],
          status: 'ongoing' as const,
          storyWriter: 'Komiktap Creator',
          artist: 'Komiktap Artist',
          rating: item.rating || 4.9,
          totalChapters: 10,
          contentType: '18plus' as const,
          comicType: item.comicType || 'manhwa',
          isFree: false,
          isVisibleOnHome: true,
          isPublished: true,
          sourceApi: 'Komiktap API (Komiktap.info)',
          sourceUrl: item.url || `https://komiktap.info/manga/${item.slug}/`
        }));
      }
    }
  } catch (e) {
    console.warn('Komiktap search error via Express proxy:', e);
  }

  // Fallback to serverless route /api/komiktap-proxy
  try {
    const params = new URLSearchParams({ action: 'search' });
    if (query) params.append('q', query);
    if (category) params.append('category', category);
    params.append('page', String(page));
    params.append('order', order);

    const res = await fetch(`/api/komiktap-proxy?${params.toString()}`);
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        return json.data.map((item: any) => ({
          title: item.title,
          slug: item.slug,
          coverImage: item.coverImage,
          bannerImage: item.coverImage,
          synopsis: `Komik ${item.title} dari Komiktap.info. Tipe: ${item.comicType || 'Manhwa'}.`,
          genres: ['Manhwa 18+', 'Doujin', 'Dewasa', 'Romance 18+'],
          status: 'ongoing' as const,
          storyWriter: 'Komiktap Creator',
          artist: 'Komiktap Artist',
          rating: item.rating || 4.9,
          totalChapters: 10,
          contentType: '18plus' as const,
          comicType: item.comicType || 'manhwa',
          isFree: false,
          isVisibleOnHome: true,
          isPublished: true,
          sourceApi: 'Komiktap API (Komiktap.info)',
          sourceUrl: item.url || `https://komiktap.info/manga/${item.slug}/`
        }));
      }
    }
  } catch (e) {
    console.warn('Komiktap search error via Serverless proxy:', e);
  }

  return [];
}

export async function fetchKomiktapDetail(slugOrUrl: string): Promise<any> {
  const cleanSlug = slugOrUrl.startsWith('http')
    ? (slugOrUrl.replace(/\/$/, '').split('/').pop() || '')
    : slugOrUrl.replace(/^\/|\/$/g, '');

  try {
    const res = await fetch(`/api/komiktap/comic/${encodeURIComponent(cleanSlug)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.data) return json.data;
    }
  } catch (e) {}

  try {
    const res = await fetch(`/api/komiktap-proxy?action=detail&slug=${encodeURIComponent(cleanSlug)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.data) return json.data;
    }
  } catch (e) {}

  return null;
}

export async function runControlledConcurrency<T, R>(
  items: T[],
  concurrency: number,
  taskFn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let currentIndex = 0;
  const actualConcurrency = Math.max(1, Math.min(concurrency, items.length));

  const workers = Array.from({ length: actualConcurrency }, async () => {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      try {
        results[idx] = await taskFn(items[idx], idx);
      } catch (err: any) {
        results[idx] = null as any;
      }
    }
  });

  await Promise.all(workers);
  return results;
}

export async function fetchKomiktapChapterPages(chapterUrlOrSlug: string): Promise<{
  pages: Array<{ id: string; pageNumber: number; imageUrl: string; fallbackUrl: string; directUrl: string }>;
  total: number;
}> {
  const baseUrl = typeof window !== 'undefined' ? '' : 'http://localhost:3000';
  try {
    const res = await fetch(`${baseUrl}/api/komiktap/chapter?url=${encodeURIComponent(chapterUrlOrSlug)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.pages && Array.isArray(json.pages)) {
        return json;
      }
    }
  } catch (e) {}

  try {
    const res = await fetch(`${baseUrl}/api/komiktap-proxy?action=chapter&url=${encodeURIComponent(chapterUrlOrSlug)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.pages && Array.isArray(json.pages)) {
        return json;
      }
    }
  } catch (e) {}

  return { pages: [], total: 0 };
}

export async function fetchKomikindoChapterPages(chapterUrlOrSlug: string): Promise<{
  pages: Array<{ id: string; pageNumber: number; imageUrl: string; fallbackUrl: string; directUrl: string }>;
  total: number;
}> {
  const baseUrl = typeof window !== 'undefined' ? '' : 'http://localhost:3000';
  try {
    const res = await fetch(`${baseUrl}/api/komikindo/chapter?url=${encodeURIComponent(chapterUrlOrSlug)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.pages && Array.isArray(json.pages)) {
        return json;
      }
    }
  } catch (e) {}

  try {
    const res = await fetch(`${baseUrl}/api/komikindo-proxy?action=chapter&url=${encodeURIComponent(chapterUrlOrSlug)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.pages && Array.isArray(json.pages)) {
        return json;
      }
    }
  } catch (e) {}

  return { pages: [], total: 0 };
}

// Fetch real chapters from MangaDex API
export async function fetchMangaDexChapters(mangaId: string): Promise<any[]> {
  // Attempt 1: Express Server API Proxy
  try {
    const res = await fetch(`/api/mangadex/chapters/${mangaId}`);
    if (res.ok) {
      const data = await res.json();
      if (data.chapters && Array.isArray(data.chapters) && data.chapters.length > 0) {
        return data.chapters;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch real MangaDex chapters via Express proxy:', err);
  }

  // Attempt 2: Serverless Function Proxy (Vercel)
  try {
    const serverlessRes = await fetch(`/api/mangadex-proxy?action=chapters&mangaId=${mangaId}`);
    if (serverlessRes.ok) {
      const data = await serverlessRes.json();
      if (data.chapters && Array.isArray(data.chapters) && data.chapters.length > 0) {
        return data.chapters;
      }
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        return data.data;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch real MangaDex chapters via Serverless proxy:', err);
  }

  // Attempt 3: Fallback to direct MangaDex feed
  try {
    const directUrl = `https://api.mangadex.org/manga/${mangaId}/feed?limit=100&order[chapter]=asc&includes[]=scanlation_group`;
    const directRes = await fetch(directUrl, { headers: { 'Accept': 'application/json' } });
    if (directRes.ok) {
      const json = await directRes.json();
      if (json.data && Array.isArray(json.data) && json.data.length > 0) {
        const chapterMap = new Map<string, any>();
        
        for (const item of json.data) {
          const chNumStr = item.attributes?.chapter || '1';
          const itemLang = item.attributes?.translatedLanguage || '';
          const existing = chapterMap.get(chNumStr);
          if (!existing) {
            chapterMap.set(chNumStr, item);
          } else {
            if (itemLang === 'id') {
              chapterMap.set(chNumStr, item);
            } else if (itemLang === 'en' && existing.attributes?.translatedLanguage !== 'id') {
              chapterMap.set(chNumStr, item);
            }
          }
        }

        const deduplicated = Array.from(chapterMap.values()).sort((a, b) => {
          const numA = parseFloat(a.attributes?.chapter || '0');
          const numB = parseFloat(b.attributes?.chapter || '0');
          return numA - numB;
        });

        return deduplicated.map((ch: any, idx: number) => {
          const chNum = parseFloat(ch.attributes?.chapter || String(idx + 1)) || (idx + 1);
          const rawTitle = ch.attributes?.title || '';
          return {
            id: ch.id,
            chapterNumber: chNum,
            title: rawTitle.trim() ? `Chapter ${chNum}: ${rawTitle.trim()}` : `Chapter ${chNum}`,
            pagesCount: ch.attributes?.pages || 8,
            releaseDate: (ch.attributes?.publishAt || ch.attributes?.readableAt || new Date().toISOString()).split('T')[0],
            translatedLanguage: ch.attributes?.translatedLanguage || 'en',
            externalUrl: ch.attributes?.externalUrl || null,
          };
        });
      }
    }
  } catch (directErr) {
    console.warn('Direct MangaDex chapters fetch failed:', directErr);
  }

  return [];
}

// Fetch real chapter image pages from MangaDex At-Home Server
export async function fetchMangaDexPages(chapterId: string): Promise<any[]> {
  // Attempt 1: Express Server API Proxy
  try {
    const res = await fetch(`/api/mangadex/pages/${chapterId}`);
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      const data = await res.json();
      if (data.pages && Array.isArray(data.pages) && data.pages.length > 0) {
        return data.pages;
      }
    }
  } catch (err) {
    // try next
  }

  // Attempt 2: Serverless Function Proxy (Vercel)
  try {
    const serverlessRes = await fetch(`/api/mangadex-proxy?action=pages&chapterId=${chapterId}`);
    if (serverlessRes.ok && serverlessRes.headers.get('content-type')?.includes('application/json')) {
      const data = await serverlessRes.json();
      if (data.pages && Array.isArray(data.pages) && data.pages.length > 0) {
        return data.pages;
      }
    }
  } catch (err) {
    // try next
  }

  // Attempt 3: Direct MangaDex At-Home server API
  try {
    const directRes = await fetch(`https://api.mangadex.org/at-home/server/${chapterId}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (directRes.ok) {
      const atHomeData = await directRes.json();
      const baseUrl = atHomeData.baseUrl;
      const hash = atHomeData.chapter?.hash;
      const fileNames = atHomeData.chapter?.data || [];
      return fileNames.map((fn: string, pIdx: number) => ({
        id: `p-${chapterId}-${pIdx + 1}`,
        pageNumber: pIdx + 1,
        imageUrl: `${baseUrl}/data/${hash}/${fn}`,
        caption: `Halaman ${pIdx + 1}`
      }));
    }
  } catch (directErr) {
    console.warn('Direct MangaDex pages fetch failed:', directErr);
  }

  return [];
}

// Helper to determine if a comic is a Doujinshi / Short 18+ Oneshot (1 - 3 chapters only)
export function isDoujinshiOrOneshot(scraped: ScrapedComicResult): boolean {
  const genresStr = (scraped.genres || []).join(' ').toLowerCase();
  const titleLower = (scraped.title || '').toLowerCase();
  
  if (genresStr.includes('doujin') || genresStr.includes('oneshot') || genresStr.includes('hentai')) {
    return true;
  }
  if (titleLower.includes('oneshot') || titleLower.includes('[doujin]') || titleLower.includes('(doujin)') || titleLower.includes('doujinshi')) {
    return true;
  }
  if (scraped.contentType === '18plus' && scraped.totalChapters && scraped.totalChapters <= 3) {
    return true;
  }
  return false;
}

// Helper to convert scraped item into genuine Comic & initial Chapters (if available from source)
export function buildComicFromScrape(
  scraped: ScrapedComicResult,
  customSettings?: {
    contentType?: ComicContentType | 'auto';
    comicType?: ComicCategoryType;
    isFree?: boolean;
    isVisibleOnHome?: boolean;
    isPublished?: boolean;
    primaryDriveAccountId?: string;
  }
): { comic: Comic; chapters: Chapter[] } {
  const comicId = `comic-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString().split('T')[0];

  const requestedContentType = customSettings?.contentType ?? scraped.contentType ?? 'normal';
  const finalContentType: ComicContentType = requestedContentType === 'auto'
    ? (isStrictlyAdultComic(scraped) ? '18plus' : 'normal')
    : requestedContentType;

  const isFree = customSettings?.isFree ?? (finalContentType === 'normal');
  const isVisibleOnHome = customSettings?.isVisibleOnHome ?? scraped.isVisibleOnHome ?? true;
  const isPublished = customSettings?.isPublished ?? scraped.isPublished ?? true;
  const comicType = customSettings?.comicType ?? scraped.comicType ?? 'manga';

  const isShortDoujin = isDoujinshiOrOneshot(scraped);
  const rawChapters = scraped.chapters || [];

  const comic: Comic = {
    id: comicId,
    title: scraped.title,
    slug: scraped.slug || scraped.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    coverImage: scraped.coverImage || getFallbackCover(scraped.title, comicType),
    bannerImage: scraped.bannerImage || scraped.coverImage || getFallbackCover(scraped.title, comicType),
    synopsis: scraped.synopsis,
    genres: scraped.genres,
    status: isShortDoujin ? 'completed' : scraped.status,
    storyWriter: scraped.storyWriter || 'Official Writer',
    artist: scraped.artist || 'Official Artist',
    rating: scraped.rating || 4.85,
    ratingCount: 0,
    totalChapters: rawChapters.length,
    totalReaders: 0,
    createdAt: now,
    updatedAt: now,
    isTrending: true,
    isFeatured: isVisibleOnHome,
    contentType: finalContentType,
    comicType,
    type: comicType,
    isFree,
    isVisibleOnHome,
    showOnHome: isVisibleOnHome,
    isPublished,
    sourceApi: scraped.sourceApi,
    sourceUrl: scraped.sourceUrl,
    mangaDexId: scraped.mangaDexId,
    primaryDriveAccountId: customSettings?.primaryDriveAccountId
  };

  // If real chapters are provided from source (Komikindo, Doujindesu, etc.)
  const seenChapterIds = new Set<string>();
  const chapters: Chapter[] = rawChapters.map((ch, idx) => {
    const chNum = ch.chapterNumber || (idx + 1);
    let chId = (ch as any).id || `ch-${comicId}-${chNum}`;
    if (seenChapterIds.has(chId)) {
      chId = `${chId}-sub${idx + 1}`;
    }
    seenChapterIds.add(chId);

    return {
      id: chId,
      comicId: comicId,
      chapterNumber: chNum,
      title: ch.title || `Chapter ${chNum}`,
      releaseDate: ch.releaseDate || now,
      isNew: idx >= rawChapters.length - 2,
      isLocked: !isFree,
      sourceType: 'images' as const,
      pages: [],
      viewsCount: 0,
      driveUrl: ch.driveUrl
    };
  });

  return { comic, chapters };
}

// Asynchronous Builder that pulls real Komiktap/MangaDex chapters or auto-resolves Jikan/MAL manga titles
export async function buildComicFromScrapeAsync(
  scraped: ScrapedComicResult,
  customSettings?: {
    contentType?: ComicContentType | 'auto';
    comicType?: ComicCategoryType;
    isFree?: boolean;
    isVisibleOnHome?: boolean;
    isPublished?: boolean;
    primaryDriveAccountId?: string;
    onProgress?: (current: number, total: number, chapterTitle: string) => void;
  }
): Promise<{ comic: Comic; chapters: Chapter[] }> {
  // If source is Komikindo (komikindo.ch), pull complete detail and all real chapters!
  if (scraped.sourceApi?.toLowerCase().includes('komikindo') || scraped.sourceUrl?.includes('komikindo.ch')) {
    try {
      const detail = await fetchKomikindoDetail(scraped.slug || scraped.sourceUrl || '');
      if (detail) {
        const comicId = `comic-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const now = new Date().toISOString().split('T')[0];
        const isAdult = detail.contentType === '18plus' || /18\+|dewasa/i.test(detail.title) || (detail.genres || []).some((g: string) => /18\+|dewasa/i.test(g));
        const defaultType: ComicContentType = isAdult ? '18plus' : 'normal';
        const requestedContentType = customSettings?.contentType ?? defaultType;
        const finalContentType: ComicContentType = requestedContentType === 'auto' ? defaultType : requestedContentType;
        const isFree = customSettings?.isFree ?? (finalContentType === 'normal');
        const isVisibleOnHome = customSettings?.isVisibleOnHome ?? true;
        const isPublished = customSettings?.isPublished ?? true;
        const comicType = customSettings?.comicType ?? detail.comicType ?? 'manga';

        const comic: Comic = {
          id: comicId,
          title: detail.title || scraped.title,
          slug: detail.slug || scraped.slug || (detail.title || scraped.title).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          coverImage: detail.coverImage || scraped.coverImage || getFallbackCover(scraped.title, comicType),
          bannerImage: detail.bannerImage || detail.coverImage || scraped.coverImage || getFallbackCover(scraped.title, comicType),
          synopsis: detail.synopsis || scraped.synopsis || `Komik ${detail.title} dari Komikindo`,
          genres: detail.genres && detail.genres.length > 0 ? detail.genres : ['Action', 'Fantasy', 'Manga'],
          status: detail.status || 'ongoing',
          storyWriter: detail.storyWriter || 'Komikindo Author',
          artist: detail.artist || 'Komikindo Artist',
          rating: detail.rating || 4.8,
          ratingCount: 0,
          totalChapters: detail.chapters?.length || 0,
          totalReaders: 0,
          createdAt: now,
          updatedAt: now,
          isTrending: true,
          isFeatured: isVisibleOnHome,
          contentType: finalContentType,
          comicType,
          type: comicType,
          isFree,
          isVisibleOnHome,
          showOnHome: isVisibleOnHome,
          isPublished,
          sourceApi: 'Komikindo API (komikindo.ch)',
          sourceUrl: detail.url || scraped.sourceUrl || `https://komikindo.ch/komik/${detail.slug}/`,
          primaryDriveAccountId: customSettings?.primaryDriveAccountId
        };

        const seenChapterNums = new Map<number, number>();
        const seenChapterIds = new Set<string>();

        const preloadedPagesMap = new Map<number, any[]>();
        const chaptersToPreload = detail.chapters || [];
        const totalChaps = chaptersToPreload.length;

        if (chaptersToPreload.length > 0) {
          try {
            let processedPreload = 0;
            await runControlledConcurrency(chaptersToPreload, 3, async (ch: any, idx: number) => {
              const chTarget = ch.url || ch.slug || '';
              if (!chTarget) return null;
              const chPagesRes = await fetchKomikindoChapterPages(chTarget);
              if (chPagesRes && chPagesRes.pages && chPagesRes.pages.length > 0) {
                preloadedPagesMap.set(idx, chPagesRes.pages);
              }
              processedPreload++;
              if (customSettings?.onProgress) {
                customSettings.onProgress(
                  processedPreload,
                  totalChaps,
                  ch.title || `Chapter ${ch.chapterNumber || idx + 1}`
                );
              }
              return null;
            });
          } catch (e) {
            console.warn('Komikindo chapter pages preloading encountered error:', e);
          }
        }

        const chapters: Chapter[] = (detail.chapters || []).map((ch: any, idx: number) => {
          let baseNum = ch.chapterNumber ?? (idx + 1);
          if (isNaN(baseNum) || baseNum <= 0) baseNum = idx + 1;

          let finalChapterNum = baseNum;
          if (seenChapterNums.has(baseNum)) {
            const collisionCount = seenChapterNums.get(baseNum)! + 1;
            seenChapterNums.set(baseNum, collisionCount);
            finalChapterNum = Number((baseNum + collisionCount * 0.1).toFixed(2));
          } else {
            seenChapterNums.set(baseNum, 0);
          }

          let baseId = `ch-${comicId}-${finalChapterNum}`;
          let finalChapterId = baseId;
          let idSuffix = 1;
          while (seenChapterIds.has(finalChapterId)) {
            finalChapterId = `${baseId}-${idSuffix++}`;
          }
          seenChapterIds.add(finalChapterId);

          const preloadedPages = preloadedPagesMap.get(idx) || [];
          const pagesCount = preloadedPages.length > 0 ? preloadedPages.length : 15;

          return {
            id: finalChapterId,
            comicId,
            chapterNumber: finalChapterNum,
            title: ch.title || `Chapter ${finalChapterNum}`,
            slug: ch.slug || `${comic.slug}-chapter-${finalChapterNum}`,
            releaseDate: ch.releaseDate || now,
            pagesCount,
            sourceType: 'images' as const,
            pages: preloadedPages,
            externalUrl: ch.url || '',
            driveUrl: ch.url || ch.slug || ''
          };
        });

        return { comic, chapters };
      }
    } catch (kiErr) {
      console.warn('Komikindo async scrape detail error:', kiErr);
    }
  }

  // If source is Komiktap (Komiktap.info), pull complete detail and all real chapters!
  if (scraped.sourceApi?.includes('Komiktap') || scraped.sourceUrl?.includes('komiktap.info')) {
    try {
      const detail = await fetchKomiktapDetail(scraped.slug || scraped.sourceUrl || '');
      if (detail) {
        const comicId = `comic-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const now = new Date().toISOString().split('T')[0];
        const requestedContentType = customSettings?.contentType ?? '18plus';
        const finalContentType: ComicContentType = requestedContentType === 'auto' ? '18plus' : requestedContentType;
        const isFree = customSettings?.isFree ?? false;
        const isVisibleOnHome = customSettings?.isVisibleOnHome ?? true;
        const isPublished = customSettings?.isPublished ?? true;
        const comicType = customSettings?.comicType ?? detail.comicType ?? 'manhwa';

        const comic: Comic = {
          id: comicId,
          title: detail.title || scraped.title,
          slug: detail.slug || scraped.slug || (detail.title || scraped.title).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          coverImage: detail.coverImage || scraped.coverImage || getFallbackCover(scraped.title, comicType),
          bannerImage: detail.bannerImage || detail.coverImage || scraped.coverImage || getFallbackCover(scraped.title, comicType),
          synopsis: detail.synopsis || scraped.synopsis || `Komik ${detail.title} dari Komiktap.info`,
          genres: detail.genres && detail.genres.length > 0 ? detail.genres : ['Manhwa 18+', 'Doujin', 'Dewasa', 'Romance 18+'],
          status: detail.status || 'ongoing',
          storyWriter: detail.storyWriter || 'Komiktap Creator',
          artist: detail.artist || 'Komiktap Artist',
          rating: detail.rating || 4.9,
          ratingCount: 0,
          totalChapters: detail.chapters?.length || 0,
          totalReaders: 0,
          createdAt: now,
          updatedAt: now,
          isTrending: true,
          isFeatured: isVisibleOnHome,
          contentType: finalContentType,
          comicType,
          type: comicType,
          isFree,
          isVisibleOnHome,
          showOnHome: isVisibleOnHome,
          isPublished,
          sourceApi: 'Komiktap API (Komiktap.info)',
          sourceUrl: detail.url || scraped.sourceUrl || `https://komiktap.info/manga/${detail.slug}/`,
          primaryDriveAccountId: customSettings?.primaryDriveAccountId
        };

        // Disambiguation maps for unique IDs and unique chapter numbers
        const seenChapterNums = new Map<number, number>();
        const seenChapterIds = new Set<string>();

        // Preload chapter pages for all chapters concurrently (zero hard limits)
        const preloadedPagesMap = new Map<number, any[]>();
        const chaptersToPreload = detail.chapters || [];
        const totalChaps = chaptersToPreload.length;

        if (chaptersToPreload.length > 0) {
          try {
            let processedPreload = 0;
            await runControlledConcurrency(chaptersToPreload, 3, async (ch: any, idx: number) => {
              const chTarget = ch.slug || ch.url || '';
              if (!chTarget) return null;
              const chPagesRes = await fetchKomiktapChapterPages(chTarget);
              if (chPagesRes && chPagesRes.pages && chPagesRes.pages.length > 0) {
                preloadedPagesMap.set(idx, chPagesRes.pages);
              }
              processedPreload++;
              if (customSettings?.onProgress) {
                customSettings.onProgress(
                  processedPreload,
                  totalChaps,
                  ch.title || `Chapter ${ch.chapterNumber || idx + 1}`
                );
              }
              return null;
            });
          } catch (e) {
            console.warn('Could not prefetch chapter pages:', e);
          }
        }

        const chapters: Chapter[] = (detail.chapters || []).map((ch: any, idx: number) => {
          let chNum = typeof ch.chapterNumber === 'number' ? ch.chapterNumber : (parseFloat(ch.chapterNumber) || (idx + 1));
          if (seenChapterNums.has(chNum)) {
            const count = seenChapterNums.get(chNum)! + 1;
            seenChapterNums.set(chNum, count);
            chNum = Number((chNum + count * 0.1).toFixed(1));
          } else {
            seenChapterNums.set(chNum, 0);
          }

          const chSlug = ch.url || ch.slug || `${detail.slug}-chapter-${chNum}`;
          const numStr = String(chNum).replace('.', '_');
          let chId = `ch-${comicId}-${numStr}`;
          if (seenChapterIds.has(chId)) {
            chId = `ch-${comicId}-${numStr}-${idx + 1}`;
          }
          seenChapterIds.add(chId);

          const chapterPages = preloadedPagesMap.get(idx) || ch.pages || [];

          return {
            id: chId,
            comicId: comicId,
            chapterNumber: chNum,
            title: ch.title || `Chapter ${chNum}`,
            slug: chSlug,
            releaseDate: ch.releaseDate || now,
            isNew: idx >= (detail.chapters?.length || 0) - 2,
            isLocked: !isFree,
            sourceType: 'images' as const,
            pages: chapterPages,
            viewsCount: 0,
            driveUrl: chSlug
          };
        });

        return { comic, chapters };
      }
    } catch (ktErr) {
      console.warn('Komiktap async scrape detail error:', ktErr);
    }
  }

  let targetMangaDexId = scraped.mangaDexId;

  // Auto-resolver for Jikan / MyAnimeList & external items:
  // If no MangaDex ID yet, search MangaDex in background to automatically attach real chapters!
  if (!targetMangaDexId && scraped.title) {
    try {
      const cleanTitle = scraped.title.replace(/:\s*.*$/, '').replace(/\(.*?\)/g, '').trim();
      const mdSearchRes = await fetch(`/api/mangadex/search?title=${encodeURIComponent(cleanTitle)}&limit=1`);
      if (mdSearchRes.ok) {
        const mdSearchData = await mdSearchRes.json();
        if (mdSearchData && mdSearchData.data && mdSearchData.data.length > 0) {
          targetMangaDexId = mdSearchData.data[0].id;
        }
      }
    } catch (e) {
      // Continue to fallback
    }
  }

  // If no MangaDex ID found after auto-resolution, fallback to synchronous builder with genuine data
  if (!targetMangaDexId) {
    return buildComicFromScrape(scraped, customSettings);
  }

  try {
    const rawMangaDexChapters = await fetchMangaDexChapters(targetMangaDexId);
    if (rawMangaDexChapters && rawMangaDexChapters.length > 0) {
      const comicId = `comic-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString().split('T')[0];

      const requestedContentType = customSettings?.contentType ?? scraped.contentType ?? 'normal';
      const finalContentType: ComicContentType = requestedContentType === 'auto'
        ? (isStrictlyAdultComic(scraped) ? '18plus' : 'normal')
        : requestedContentType;

      const isFree = customSettings?.isFree ?? (finalContentType === 'normal');
      const isVisibleOnHome = customSettings?.isVisibleOnHome ?? scraped.isVisibleOnHome ?? true;
      const isPublished = customSettings?.isPublished ?? scraped.isPublished ?? true;
      const comicType = customSettings?.comicType ?? scraped.comicType ?? 'manga';

      const isShort = isDoujinshiOrOneshot(scraped);
      const selectedMdChapters = isShort 
        ? rawMangaDexChapters.slice(0, 3) 
        : rawMangaDexChapters;

      const comic: Comic = {
        id: comicId,
        title: scraped.title,
        slug: scraped.slug || scraped.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        coverImage: scraped.coverImage || getFallbackCover(scraped.title, comicType),
        bannerImage: scraped.bannerImage || scraped.coverImage || getFallbackCover(scraped.title, comicType),
        synopsis: scraped.synopsis,
        genres: scraped.genres,
        status: isShort ? 'completed' : scraped.status,
        storyWriter: scraped.storyWriter || 'Official Writer',
        artist: scraped.artist || 'Official Artist',
        rating: scraped.rating || 4.85,
        ratingCount: 0,
        totalChapters: selectedMdChapters.length,
        totalReaders: 0,
        createdAt: now,
        updatedAt: now,
        isTrending: true,
        isFeatured: isVisibleOnHome,
        contentType: finalContentType,
        comicType,
        type: comicType,
        isFree,
        isVisibleOnHome,
        showOnHome: isVisibleOnHome,
        isPublished,
        sourceApi: 'MangaDex Live API',
        sourceUrl: scraped.sourceUrl,
        mangaDexId: targetMangaDexId,
        primaryDriveAccountId: customSettings?.primaryDriveAccountId
      };

      const seenAsyncChapterIds = new Set<string>();
      const chapters: Chapter[] = selectedMdChapters.map((mdCh, idx) => {
        const chNum = mdCh.chapterNumber || (idx + 1);
        let chId = mdCh.id ? `ch-${mdCh.id}` : `ch-${comicId}-${chNum}`;
        if (seenAsyncChapterIds.has(chId)) {
          chId = `${chId}-sub${idx + 1}`;
        }
        seenAsyncChapterIds.add(chId);

        return {
          id: chId,
          comicId: comicId,
          chapterNumber: chNum,
          title: mdCh.title || `Chapter ${chNum}`,
          slug: mdCh.id, // Preserved for database sync
          releaseDate: mdCh.releaseDate || now,
          isNew: idx >= selectedMdChapters.length - 2,
          isLocked: !isFree,
          sourceType: 'images' as const,
          pages: [],
          viewsCount: 0,
          mangadexChapterId: mdCh.id,
          mangadexMangaId: targetMangaDexId
        };
      });

      return { comic, chapters };
    }
  } catch (err) {
    console.warn('buildComicFromScrapeAsync failed, falling back to sync:', err);
  }

  return buildComicFromScrape(scraped, customSettings);
}

// ============================================================================
// UNIVERSAL HIGH-CAPACITY CLIENT-SIDE MASS SCRAPER ENGINE (VERCEL + CLOUD COMPLIANT)
// Capable of pulling thousands of distinct comics directly in the browser & cloud
// ============================================================================

export interface ClientScraperOptions {
  targetCount: number;
  categoryFilter?: string;
  existingComicIds?: Set<string>;
  existingTitles?: Set<string>;
  defaultContentType?: ComicContentType | 'auto';
  defaultDriveAccountId?: string;
  onProgress?: (progress: {
    scrapedThisSession: number;
    targetCount: number;
    statusMessage: string;
    currentCategory: string;
    newlyAddedBatch: { comic: Comic; chapters: Chapter[] }[];
  }) => void;
  onLog?: (log: string) => void;
  shouldStop?: () => boolean;
}

const CLIENT_SCRAPER_CURSOR_KEY = 'antitimpa_scraper_cursors_v2';

export function getClientScraperOffsets(): Record<string, number> {
  try {
    const raw = localStorage.getItem(CLIENT_SCRAPER_CURSOR_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (e) {
    // ignore
  }
  return {};
}

export function saveClientScraperOffsets(offsets: Record<string, number>) {
  try {
    localStorage.setItem(CLIENT_SCRAPER_CURSOR_KEY, JSON.stringify(offsets));
  } catch (e) {
    // ignore
  }
}

export function resetClientScraperOffsets() {
  try {
    localStorage.removeItem(CLIENT_SCRAPER_CURSOR_KEY);
  } catch (e) {
    // ignore
  }
}

// 22 Diverse Multi-Stream Query Feeds for MangaDex (100 comics per batch, up to 10,000 offset each = 200,000+ comics pool)
export const MANGADEX_MULTI_STREAMS = [
  // Manhwa Korea (Popular, Rating, Latest, Created)
  { key: 'md_manhwa_popular', label: '🇰🇷 Top Korean Manhwa (Populer)', params: 'originalLanguage[]=ko&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive' },
  { key: 'md_manhwa_rating', label: '🇰🇷 Top Korean Manhwa (Rating Tertinggi)', params: 'originalLanguage[]=ko&order[rating]=desc&contentRating[]=safe&contentRating[]=suggestive' },
  { key: 'md_manhwa_latest', label: '🇰🇷 Korean Manhwa (Chapter Terbaru)', params: 'originalLanguage[]=ko&order[latestUploadedChapter]=desc&contentRating[]=safe&contentRating[]=suggestive' },
  { key: 'md_manhwa_created', label: '🇰🇷 Korean Manhwa (Judul Baru Rilis)', params: 'originalLanguage[]=ko&order[createdAt]=desc&contentRating[]=safe&contentRating[]=suggestive' },
  
  // Manga Jepang (Popular, Rating, Latest, Updated)
  { key: 'md_manga_popular', label: '🇯🇵 Top Japanese Manga (Populer)', params: 'originalLanguage[]=ja&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive' },
  { key: 'md_manga_rating', label: '🇯🇵 Top Japanese Manga (Rating Tertinggi)', params: 'originalLanguage[]=ja&order[rating]=desc&contentRating[]=safe&contentRating[]=suggestive' },
  { key: 'md_manga_latest', label: '🇯🇵 Japanese Manga (Update Terbaru)', params: 'originalLanguage[]=ja&order[latestUploadedChapter]=desc&contentRating[]=safe&contentRating[]=suggestive' },
  { key: 'md_manga_shounen', label: '🇯🇵 Top Shounen Manga Hits', params: 'originalLanguage[]=ja&includedTags[]=391b0423-d847-456f-aff0-8b04c36f3b7b&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive' },
  
  // Manhua China (Popular, Rating, Latest)
  { key: 'md_manhua_popular', label: '🇨🇳 Top Chinese Manhua (Populer)', params: 'originalLanguage[]=zh&originalLanguage[]=zh-hk&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive' },
  { key: 'md_manhua_rating', label: '🇨🇳 Top Chinese Manhua (Rating)', params: 'originalLanguage[]=zh&originalLanguage[]=zh-hk&order[rating]=desc&contentRating[]=safe&contentRating[]=suggestive' },
  { key: 'md_manhua_latest', label: '🇨🇳 Chinese Manhua (Update Terbaru)', params: 'originalLanguage[]=zh&originalLanguage[]=zh-hk&order[latestUploadedChapter]=desc&contentRating[]=safe&contentRating[]=suggestive' },
  
  // 18+ VIP Dewasa & Erotica (Popular, Rating, Latest)
  { key: 'md_18plus_popular', label: '🔞 18+ VIP Dewasa / Erotica (Populer)', params: 'contentRating[]=erotica&contentRating[]=pornographic&order[followedCount]=desc' },
  { key: 'md_18plus_rating', label: '🔞 18+ VIP Dewasa (Rating Tertinggi)', params: 'contentRating[]=erotica&contentRating[]=pornographic&order[rating]=desc' },
  { key: 'md_18plus_latest', label: '🔞 18+ VIP Dewasa (Rilis Terbaru)', params: 'contentRating[]=erotica&contentRating[]=pornographic&order[latestUploadedChapter]=desc' },
  
  // Genre Spesifik Favorit Penggemar
  { key: 'md_action_super', label: '⚡ Action & Superpower', params: 'includedTags[]=391b0423-d847-456f-aff0-8b04c36f3b7b&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive' },
  { key: 'md_isekai_fantasy', label: '🌀 Isekai & Reincarnation', params: 'includedTags[]=0a39e5ac-30ab-443a-96e7-b6e7732a0313&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive' },
  { key: 'md_murim_martial', label: '🥋 Murim & Martial Arts', params: 'includedTags[]=799c43e2-a302-490d-854f-e271a32237ce&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive' },
  { key: 'md_romance_drama', label: '💖 Romance & Drama', params: 'includedTags[]=423e2eae-a7a2-4a8b-ac03-a8351462d71d&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive' },
  { key: 'md_fantasy_magic', label: '🧙 Magic & High Fantasy', params: 'includedTags[]=cdc58593-87dd-415e-bbc0-2ec27bf404cc&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive' },
  { key: 'md_comedy_slice', label: '🎭 Comedy & Slice of Life', params: 'includedTags[]=4d32cc48-9f00-4cca-9b5a-a839f0764984&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive' },
  { key: 'md_mystery_horror', label: '🩸 Mystery & Supernatural Horror', params: 'includedTags[]=eabc5b4c-6aff-42f3-b657-3e90cbd00b75&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive' },
  { key: 'md_all_rating', label: '🌟 Semua Komik (Rating Tertinggi Global)', params: 'order[rating]=desc&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica' },
  { key: 'md_all_latest', label: '🔥 Semua Komik (Update Teranyar Global)', params: 'order[latestUploadedChapter]=desc&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica' },
];

export const JIKAN_MULTI_STREAMS = [
  { key: 'jikan_top_manga', label: 'MAL Top Japanese Manga', type: 'manga' },
  { key: 'jikan_top_manhwa', label: 'MAL Top Korean Manhwa', type: 'manhwa' },
  { key: 'jikan_top_manhua', label: 'MAL Top Chinese Manhua', type: 'manhua' },
  { key: 'jikan_top_doujin', label: 'MAL Top 18+ Doujinshi', type: 'doujin' },
  { key: 'jikan_top_popular', label: 'MAL Top by Popularity', filter: 'bypopularity' },
  { key: 'jikan_top_favorite', label: 'MAL Top by Favorite', filter: 'favorite' },
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function runClientSideMassScraper(options: ClientScraperOptions): Promise<{ totalAdded: number; message: string }> {
  const targetLimit = Math.max(10, options.targetCount || 500);
  const catFilter = (options.categoryFilter || 'all').toLowerCase();
  const existingIds = options.existingComicIds || new Set<string>();
  const existingTitles = options.existingTitles || new Set<string>();
  const persistentOffsets = getClientScraperOffsets();

  const log = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString('id-ID');
    if (options.onLog) {
      options.onLog(`[${timestamp}] ${msg}`);
    }
  };

  log(`🚀 Memulai Penarikan Komik Massal Turbo (Target: ${targetLimit} Komik, Filter: ${catFilter.toUpperCase()})`);

  let activeMdStreams = MANGADEX_MULTI_STREAMS;
  let activeJikanStreams = JIKAN_MULTI_STREAMS;

  if (catFilter === 'manhwa') {
    activeMdStreams = MANGADEX_MULTI_STREAMS.filter(s => s.key.includes('manhwa'));
    activeJikanStreams = JIKAN_MULTI_STREAMS.filter(s => s.type === 'manhwa');
  } else if (catFilter === 'manhua') {
    activeMdStreams = MANGADEX_MULTI_STREAMS.filter(s => s.key.includes('manhua'));
    activeJikanStreams = JIKAN_MULTI_STREAMS.filter(s => s.type === 'manhua');
  } else if (catFilter === 'manga') {
    activeMdStreams = MANGADEX_MULTI_STREAMS.filter(s => s.key.includes('manga'));
    activeJikanStreams = JIKAN_MULTI_STREAMS.filter(s => s.type === 'manga');
  } else if (catFilter === '18plus') {
    activeMdStreams = MANGADEX_MULTI_STREAMS.filter(s => s.key.includes('18plus'));
    activeJikanStreams = JIKAN_MULTI_STREAMS.filter(s => s.type === 'doujin');
  } else if (catFilter === 'isekai') {
    activeMdStreams = MANGADEX_MULTI_STREAMS.filter(s => s.key.includes('isekai'));
    activeJikanStreams = [];
  } else if (catFilter === 'action') {
    activeMdStreams = MANGADEX_MULTI_STREAMS.filter(s => s.key.includes('action') || s.key.includes('murim'));
    activeJikanStreams = [];
  }

  let newlyAdded = 0;
  let streamIndex = 0;
  let consecutiveEmptyBatches = 0;
  const now = new Date().toISOString().split('T')[0];

  while (newlyAdded < targetLimit) {
    if (options.shouldStop && options.shouldStop()) {
      log('⏹️ Penarikan dihentikan oleh admin.');
      break;
    }

    if (consecutiveEmptyBatches >= (activeMdStreams.length + activeJikanStreams.length) * 3) {
      log('ℹ️ Seluruh aliran scraper telah mencapai halaman terakhir.');
      break;
    }

    const newlyAddedBatch: { comic: Comic; chapters: Chapter[] }[] = [];

    // 1. MANGA DEX STREAM INGESTION (100 Items per batch)
    if (activeMdStreams.length > 0 && newlyAdded < targetLimit) {
      const stream = activeMdStreams[streamIndex % activeMdStreams.length];
      const currentOffset = persistentOffsets[stream.key] || 0;

      if (options.onProgress) {
        options.onProgress({
          scrapedThisSession: newlyAdded,
          targetCount: targetLimit,
          statusMessage: `Sedang menarik ${stream.label} (Offset: ${currentOffset})...`,
          currentCategory: stream.label,
          newlyAddedBatch: []
        });
      }

      try {
        let mdData: any = null;
        
        // 1. Try Vercel Serverless Proxy First
        try {
          const proxyRes = await fetch(`/api/mangadex/search?limit=100&offset=${currentOffset}&${stream.params}`);
          const contentType = proxyRes.headers.get('content-type') || '';
          if (proxyRes.ok && contentType.includes('application/json')) {
            const parsed = await proxyRes.json();
            if (parsed && Array.isArray(parsed.data) && parsed.data.length > 0) {
              mdData = parsed;
            }
          }
        } catch (_) {}

        const mdUrl = `https://api.mangadex.org/manga?${stream.params}&limit=100&offset=${currentOffset}&includes[]=cover_art&includes[]=author&includes[]=artist`;

        // 2. Direct MangaDex API Fallback
        if (!mdData || !Array.isArray(mdData.data) || mdData.data.length === 0) {
          try {
            const res = await fetch(mdUrl, {
              headers: { Accept: 'application/json' }
            });
            if (res.ok) {
              const parsed = await res.json();
              if (parsed && Array.isArray(parsed.data)) {
                mdData = parsed;
              }
            }
          } catch (_) {}
        }

        // 3. Resilient CORS Proxy 1 Fallback (AllOrigins)
        if (!mdData || !Array.isArray(mdData.data) || mdData.data.length === 0) {
          try {
            const allOriginsUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(mdUrl)}`;
            const res = await fetch(allOriginsUrl);
            if (res.ok) {
              const parsed = await res.json();
              if (parsed && Array.isArray(parsed.data)) {
                mdData = parsed;
              }
            }
          } catch (_) {}
        }

        // 4. Resilient CORS Proxy 2 Fallback (CorsProxy.io)
        if (!mdData || !Array.isArray(mdData.data) || mdData.data.length === 0) {
          try {
            const corsProxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(mdUrl)}`;
            const res = await fetch(corsProxyUrl);
            if (res.ok) {
              const parsed = await res.json();
              if (parsed && Array.isArray(parsed.data)) {
                mdData = parsed;
              }
            }
          } catch (_) {}
        }

        if (mdData && Array.isArray(mdData.data)) {
          const items = mdData.data;
          if (items.length === 0) {
            consecutiveEmptyBatches++;
            persistentOffsets[stream.key] = 0; // Wrap around to start if end reached
          } else {
            consecutiveEmptyBatches = 0;
            // Advance cursor by 100 for this stream
            persistentOffsets[stream.key] = (currentOffset + 100) % 10000;
            saveClientScraperOffsets(persistentOffsets);

            let streamBatchCount = 0;
            for (const item of items) {
              if (newlyAdded >= targetLimit) break;
              if (options.shouldStop && options.shouldStop()) break;

              const mangaId = item.id;
              const attributes = item.attributes || {};
              const titleObj = attributes.title || {};
              const altTitles = attributes.altTitles || [];
              let title = titleObj.en || titleObj.ja || titleObj.ko || titleObj.zh || titleObj.id || Object.values(titleObj)[0];
              if (!title && altTitles.length > 0) {
                for (const alt of altTitles) {
                  if (alt.en || alt.ja || alt.ko || alt.id || alt.zh) {
                    title = alt.en || alt.ja || alt.ko || alt.id || alt.zh;
                    break;
                  }
                }
              }
              if (!title) title = 'Manga Title';

              const normalizedTitle = title.trim().toLowerCase();
              const comicId = `comic-md-${mangaId}`;

              if (existingIds.has(comicId) || existingTitles.has(normalizedTitle)) {
                continue;
              }

              const descObj = attributes.description || {};
              let synopsis = descObj.en || descObj.id || descObj.ja || descObj.ko || Object.values(descObj)[0] || '';
              if (!synopsis || synopsis.trim().length < 10) {
                synopsis = `${title} adalah serial komik resmi dari MangaDex dengan pembaruan berkala.`;
              }

              let coverFileName = '';
              let authorName = 'Official Writer';
              let artistName = 'Official Artist';

              if (Array.isArray(item.relationships)) {
                for (const rel of item.relationships) {
                  if (rel.type === 'cover_art' && rel.attributes?.fileName) {
                    coverFileName = rel.attributes.fileName;
                  }
                  if (rel.type === 'author' && rel.attributes?.name) {
                    authorName = rel.attributes.name;
                  }
                  if (rel.type === 'artist' && rel.attributes?.name) {
                    artistName = rel.attributes.name;
                  }
                }
              }

              const coverImage = coverFileName
                ? `https://uploads.mangadex.org/covers/${mangaId}/${coverFileName}.512.jpg`
                : getFallbackCover(title, 'manga');

              const genres = (attributes.tags || [])
                .map((t: any) => t.attributes?.name?.en)
                .filter(Boolean);

              const contentRating = (attributes.contentRating || 'safe').toLowerCase();
              const isAdult = isStrictlyAdultComic({
                genres,
                contentRating,
                title,
                synopsis,
                categoryFilter: stream.key.includes('18plus') ? '18plus' : catFilter,
                defaultContentType: options.defaultContentType === 'auto' ? undefined : options.defaultContentType
              });
              const rawOriginalLang = (attributes.originalLanguage || '').toLowerCase();
              let comicType: ComicCategoryType = 'manga';
              if (rawOriginalLang === 'ko') comicType = 'manhwa';
              else if (rawOriginalLang === 'zh' || rawOriginalLang === 'zh-hk') comicType = 'manhua';
              else if (isAdult) comicType = 'webtoon';

              const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

              // Build default chapters
              const lastChapNum = attributes.lastChapter ? parseFloat(attributes.lastChapter) || 1 : 1;
              const chapsToBuildCount = Math.min(3, Math.max(1, Math.floor(lastChapNum)));
              const builtChapters: Chapter[] = Array.from({ length: chapsToBuildCount }, (_, idx) => ({
                id: `ch-md-${mangaId}-${idx + 1}`,
                comicId,
                chapterNumber: idx + 1,
                title: `Chapter ${idx + 1}`,
                pageCount: 10,
                releaseDate: now,
                isNew: idx === chapsToBuildCount - 1,
                isLocked: isAdult,
                sourceType: 'images' as const,
                pages: [],
                viewsCount: Math.floor(Math.random() * 800) + 100,
                mangadexMangaId: mangaId
              }));

              const newComic: Comic = {
                id: comicId,
                title,
                slug,
                coverImage,
                bannerImage: coverImage,
                synopsis: synopsis.slice(0, 500),
                genres: genres.length > 0 ? genres.slice(0, 5) : [comicType === 'manhwa' ? 'Manhwa' : 'Action', 'Drama'],
                status: attributes.status === 'completed' ? 'completed' : 'ongoing',
                storyWriter: authorName,
                artist: artistName,
                rating: isAdult ? 4.9 : 4.88,
                ratingCount: Math.floor(Math.random() * 3000) + 800,
                totalChapters: Math.max(builtChapters.length, Math.floor(lastChapNum)),
                totalReaders: Math.floor(Math.random() * 12000) + 2000,
                createdAt: now,
                updatedAt: now,
                isTrending: true,
                isFeatured: true,
                contentType: isAdult ? '18plus' : 'normal',
                comicType,
                type: comicType,
                isFree: !isAdult,
                isVisibleOnHome: true,
                showOnHome: true,
                isPublished: true,
                sourceApi: 'MangaDex Live API',
                sourceUrl: `https://mangadex.org/title/${mangaId}`,
                mangaDexId: mangaId,
                primaryDriveAccountId: options.defaultDriveAccountId
              };

              existingIds.add(comicId);
              existingTitles.add(normalizedTitle);
              newlyAddedBatch.push({ comic: newComic, chapters: builtChapters });
              newlyAdded++;
              streamBatchCount++;
            }

            if (streamBatchCount > 0) {
              log(`+ [MangaDex] +${streamBatchCount} komik baru dari "${stream.label}" (Offset ${currentOffset})`);
            }
          }
        }
      } catch (streamErr: any) {
        log(`Peringatan stream (${stream.label}): ${streamErr?.message || 'Koneksi lambat'}`);
      }
    }

    // 2. JIKAN / MYANIMELIST INGESTION STREAM
    if (activeJikanStreams.length > 0 && newlyAdded < targetLimit) {
      if (options.shouldStop && options.shouldStop()) break;

      const jStream = activeJikanStreams[streamIndex % activeJikanStreams.length];
      const curPage = persistentOffsets[jStream.key] || 1;

      try {
        let jData: any = null;

        // 1. Try Jikan Vercel Serverless Proxy First
        try {
          let proxyUrl = `/api/jikan/top?page=${curPage}&limit=25`;
          if (jStream.type) proxyUrl += `&type=${jStream.type}`;
          if (jStream.filter) proxyUrl += `&filter=${jStream.filter}`;
          const pRes = await fetch(proxyUrl);
          const pType = pRes.headers.get('content-type') || '';
          if (pRes.ok && pType.includes('application/json')) {
            const parsed = await pRes.json();
            if (parsed && Array.isArray(parsed.data) && parsed.data.length > 0) {
              jData = parsed;
            }
          }
        } catch (_) {}

        // 2. Direct Jikan MOE Fallback
        if (!jData || !Array.isArray(jData.data) || jData.data.length === 0) {
          const jUrl = `https://api.jikan.moe/v4/top/manga?page=${curPage}&limit=25${jStream.type ? `&type=${jStream.type}` : ''}${jStream.filter ? `&filter=${jStream.filter}` : ''}`;

          try {
            const jRes = await fetch(jUrl, { headers: { Accept: 'application/json' } });
            if (jRes.ok) {
              const parsed = await jRes.json();
              if (parsed && Array.isArray(parsed.data)) {
                jData = parsed;
              }
            }
          } catch (_) {}

          // 3. Resilient CORS Proxy 1 Fallback (AllOrigins)
          if (!jData || !Array.isArray(jData.data) || jData.data.length === 0) {
            try {
              const allOriginsUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(jUrl)}`;
              const res = await fetch(allOriginsUrl);
              if (res.ok) {
                const parsed = await res.json();
                if (parsed && Array.isArray(parsed.data)) {
                  jData = parsed;
                }
              }
            } catch (_) {}
          }

          // 4. Resilient CORS Proxy 2 Fallback (CorsProxy.io)
          if (!jData || !Array.isArray(jData.data) || jData.data.length === 0) {
            try {
              const corsProxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(jUrl)}`;
              const res = await fetch(corsProxyUrl);
              if (res.ok) {
                const parsed = await res.json();
                if (parsed && Array.isArray(parsed.data)) {
                  jData = parsed;
                }
              }
            } catch (_) {}
          }
        }

        if (jData && Array.isArray(jData.data)) {
          const jItems = jData.data;

          if (jItems.length > 0) {
            persistentOffsets[jStream.key] = curPage + 1;
            saveClientScraperOffsets(persistentOffsets);

            let jAdded = 0;
            for (const item of jItems) {
              if (newlyAdded >= targetLimit) break;
              if (options.shouldStop && options.shouldStop()) break;

              const malId = item.mal_id;
              const title = item.title_english || item.title || 'Manga Title';
              const normalizedTitle = title.trim().toLowerCase();
              const comicId = `comic-mal-${malId}`;

              if (existingIds.has(comicId) || existingTitles.has(normalizedTitle)) continue;

              const genres = (item.genres || []).map((g: any) => (typeof g === 'string' ? g : g.name)).filter(Boolean);
              const explicitGenres = (item.explicit_genres || []).map((g: any) => (typeof g === 'string' ? g : g.name)).filter(Boolean);
              const allGenres = [...genres, ...explicitGenres];
              const isAdult = isStrictlyAdultComic({
                genres: allGenres,
                title,
                synopsis: item.synopsis,
                categoryFilter: jStream.type === 'doujin' ? '18plus' : catFilter,
                defaultContentType: options.defaultContentType === 'auto' ? undefined : options.defaultContentType
              });

              const typeLower = (item.type || '').toLowerCase();
              let comicType: ComicCategoryType = 'manga';
              if (typeLower === 'manhwa') comicType = 'manhwa';
              else if (typeLower === 'manhua') comicType = 'manhua';
              else if (isAdult) comicType = 'webtoon';

              const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
              const coverImage = item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url || getFallbackCover(title, comicType);

              const malChapters: Chapter[] = [
                {
                  id: `ch-mal-${malId}-1`,
                  comicId,
                  chapterNumber: 1,
                  title: 'Chapter 1 (Prologue)',
                  pageCount: 12,
                  releaseDate: now,
                  isNew: true,
                  isLocked: isAdult,
                  sourceType: 'images' as const,
                  pages: [],
                  viewsCount: Math.floor(Math.random() * 900) + 150
                }
              ];

              const newComic: Comic = {
                id: comicId,
                title,
                slug,
                coverImage,
                bannerImage: coverImage,
                synopsis: (item.synopsis || `${title} adalah salah satu komik dengan rating tertinggi di MyAnimeList.`).slice(0, 500),
                genres: genres.length > 0 ? genres.slice(0, 5) : ['Top Manga', 'Popular'],
                status: item.publishing ? 'ongoing' : 'completed',
                storyWriter: item.authors?.[0]?.name || 'Official Author',
                artist: item.authors?.[1]?.name || item.authors?.[0]?.name || 'Official Artist',
                rating: item.score ? Math.min(5, Math.max(4, item.score / 2)) : 4.88,
                ratingCount: item.scored_by || Math.floor(Math.random() * 5000) + 1200,
                totalChapters: item.chapters || 1,
                totalReaders: item.members || Math.floor(Math.random() * 20000) + 5000,
                createdAt: now,
                updatedAt: now,
                isTrending: true,
                isFeatured: true,
                contentType: isAdult ? '18plus' : 'normal',
                comicType,
                type: comicType,
                isFree: !isAdult,
                isVisibleOnHome: true,
                showOnHome: true,
                isPublished: true,
                sourceApi: 'MyAnimeList Jikan API',
                sourceUrl: item.url || `https://myanimelist.net/manga/${malId}`,
                primaryDriveAccountId: options.defaultDriveAccountId
              };

              existingIds.add(comicId);
              existingTitles.add(normalizedTitle);
              newlyAddedBatch.push({ comic: newComic, chapters: malChapters });
              newlyAdded++;
              jAdded++;
            }

            if (jAdded > 0) {
              log(`+ [MyAnimeList] +${jAdded} komik baru dari "${jStream.label}" (Page ${curPage})`);
            }
          }
        }
      } catch (jErr: any) {
        log(`Peringatan MAL Jikan: ${jErr?.message || 'Rate limit delay'}`);
      }
    }

    // Flush batch to caller & UI
    if (newlyAddedBatch.length > 0 && options.onProgress) {
      options.onProgress({
        scrapedThisSession: newlyAdded,
        targetCount: targetLimit,
        statusMessage: `Menyimpan ${newlyAdded}/${targetLimit} komik ke database...`,
        currentCategory: 'Database Sync',
        newlyAddedBatch
      });
    }

    streamIndex++;
    // Polite throttle between requests (120ms) to ensure smooth browser performance and zero rate limiting
    await sleep(120);
  }

  log(`✅ Selesai! Berhasil mengimpor total ${newlyAdded} judul komik baru ke database.`);
  return {
    totalAdded: newlyAdded,
    message: `Berhasil mengimpor ${newlyAdded} komik baru!`
  };
}

/**
 * Repairs missing chapter images for a KomikTap comic using controlled concurrency (3-4 workers)
 * and directly persists images to Supabase while preserving existing data.
 */
export async function repairMissingKomiktapChapterImages(
  comicId: string,
  chapters: Chapter[],
  options?: {
    comicSlug?: string;
    comicSourceUrl?: string;
    comicTitle?: string;
    concurrency?: number;
    onProgress?: (p: { current: number; total: number; success: number; failed: number; currentTitle: string }) => void;
    isCancelled?: () => boolean;
  }
): Promise<{
  attempted: number;
  success: number;
  failed: number;
  totalImagesExtracted: number;
  failedChapters: Array<{ id: string; chapterNumber: number; title: string; url: string; error: string }>;
}> {
  const missing = chapters.filter(c => !c.pages || c.pages.length === 0);
  const total = missing.length;
  const concurrency = options?.concurrency || 3;
  let successCount = 0;
  let failedCount = 0;
  let totalImagesExtracted = 0;
  const failedChapters: Array<{ id: string; chapterNumber: number; title: string; url: string; error: string }> = [];

  if (total === 0) {
    return {
      attempted: 0,
      success: 0,
      failed: 0,
      totalImagesExtracted: 0,
      failedChapters: []
    };
  }

  let derivedComicSlug = options?.comicSlug || '';
  if (!derivedComicSlug && options?.comicSourceUrl && options.comicSourceUrl.includes('komiktap.info/manga/')) {
    derivedComicSlug = options.comicSourceUrl.replace(/\/$/, '').split('/').pop() || '';
  }
  if (!derivedComicSlug && options?.comicTitle) {
    derivedComicSlug = options.comicTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  let processedCount = 0;

  await runControlledConcurrency(missing, concurrency, async (ch) => {
    if (options?.isCancelled && options.isCancelled()) return;

    let targetUrl = ch.slug || ch.driveUrl || ch.externalUrl || '';
    if (!targetUrl || targetUrl.startsWith('ch-') || !targetUrl.includes('chapter')) {
      if (derivedComicSlug) {
        targetUrl = `${derivedComicSlug}-chapter-${ch.chapterNumber}`;
      }
    }

    if (!targetUrl) {
      failedCount++;
      failedChapters.push({
        id: ch.id,
        chapterNumber: ch.chapterNumber,
        title: ch.title,
        url: '',
        error: 'Missing chapter source URL'
      });
      return;
    }

    try {
      const res = await fetchKomiktapChapterPages(targetUrl);
      if (res && Array.isArray(res.pages) && res.pages.length > 0) {
        ch.pages = res.pages;
        totalImagesExtracted += res.pages.length;
        successCount++;
        // Persist directly to Supabase
        await ChapterRepository.saveChapterPages(ch.id, res.pages);
      } else {
        failedCount++;
        failedChapters.push({
          id: ch.id,
          chapterNumber: ch.chapterNumber,
          title: ch.title,
          url: targetUrl,
          error: '0 images extracted from reader'
        });
      }
    } catch (err: any) {
      failedCount++;
      failedChapters.push({
        id: ch.id,
        chapterNumber: ch.chapterNumber,
        title: ch.title,
        url: targetUrl,
        error: err.message || 'Fetch error'
      });
    } finally {
      processedCount++;
      options?.onProgress?.({
        current: processedCount,
        total,
        success: successCount,
        failed: failedCount,
        currentTitle: ch.title
      });
    }
  });

  return {
    attempted: total,
    success: successCount,
    failed: failedCount,
    totalImagesExtracted,
    failedChapters
  };
}

/**
 * Repairs missing chapter images for a Komikindo comic using controlled concurrency (3-4 workers)
 * and directly persists images to Supabase while preserving existing data.
 */
export async function repairMissingKomikindoChapterImages(
  comicId: string,
  chapters: Chapter[],
  options?: {
    comicSlug?: string;
    comicSourceUrl?: string;
    comicTitle?: string;
    concurrency?: number;
    onProgress?: (p: { current: number; total: number; success: number; failed: number; currentTitle: string }) => void;
    isCancelled?: () => boolean;
  }
): Promise<{
  attempted: number;
  success: number;
  failed: number;
  totalImagesExtracted: number;
  failedChapters: Array<{ id: string; chapterNumber: number; title: string; url: string; error: string }>;
}> {
  const missing = chapters.filter(c => !c.pages || c.pages.length === 0);
  const total = missing.length;
  const concurrency = options?.concurrency || 3;
  let successCount = 0;
  let failedCount = 0;
  let totalImagesExtracted = 0;
  const failedChapters: Array<{ id: string; chapterNumber: number; title: string; url: string; error: string }> = [];

  if (total === 0) {
    return {
      attempted: 0,
      success: 0,
      failed: 0,
      totalImagesExtracted: 0,
      failedChapters: []
    };
  }

  let derivedComicSlug = options?.comicSlug || '';
  if (!derivedComicSlug && options?.comicSourceUrl && options.comicSourceUrl.includes('komikindo.ch/komik/')) {
    derivedComicSlug = options.comicSourceUrl.replace(/\/$/, '').split('/').pop() || '';
  }
  if (!derivedComicSlug && options?.comicTitle) {
    derivedComicSlug = options.comicTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  let processedCount = 0;

  await runControlledConcurrency(missing, concurrency, async (ch) => {
    if (options?.isCancelled && options.isCancelled()) return;

    let targetUrl = ch.externalUrl || ch.driveUrl || ch.slug || '';
    if (!targetUrl || targetUrl.startsWith('ch-') || !targetUrl.includes('chapter')) {
      if (derivedComicSlug) {
        targetUrl = `https://komikindo.ch/${derivedComicSlug}-chapter-${ch.chapterNumber}/`;
      }
    }

    if (!targetUrl) {
      failedCount++;
      failedChapters.push({
        id: ch.id,
        chapterNumber: ch.chapterNumber,
        title: ch.title,
        url: '',
        error: 'Missing chapter source URL'
      });
      return;
    }

    try {
      const res = await fetchKomikindoChapterPages(targetUrl);
      if (res && Array.isArray(res.pages) && res.pages.length > 0) {
        ch.pages = res.pages;
        totalImagesExtracted += res.pages.length;
        successCount++;
        // Persist directly to Supabase
        await ChapterRepository.saveChapterPages(ch.id, res.pages);
      } else {
        failedCount++;
        failedChapters.push({
          id: ch.id,
          chapterNumber: ch.chapterNumber,
          title: ch.title,
          url: targetUrl,
          error: '0 images extracted from reader'
        });
      }
    } catch (err: any) {
      failedCount++;
      failedChapters.push({
        id: ch.id,
        chapterNumber: ch.chapterNumber,
        title: ch.title,
        url: targetUrl,
        error: err.message || 'Fetch error'
      });
    } finally {
      processedCount++;
      options?.onProgress?.({
        current: processedCount,
        total,
        success: successCount,
        failed: failedCount,
        currentTitle: ch.title
      });
    }
  });

  return {
    attempted: total,
    success: successCount,
    failed: failedCount,
    totalImagesExtracted,
    failedChapters
  };
}

