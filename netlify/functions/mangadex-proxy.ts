export async function handler(event: any) {
  const query = event.queryStringParameters || {};
  const action = query.action || '';
  const mangaId = query.mangaId || '';
  const chapterId = query.chapterId || '';
  const qTitle = (query.title || query.q || '').trim();
  const category = (query.category || 'all').toLowerCase();
  const rating = (query.rating || '').toLowerCase();
  const origin = query.origin || query.originalLanguage || '';
  const limitReq = parseInt(query.limit || '50', 10);
  const offsetReq = parseInt(query.offset || '0', 10);

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  try {
    // 1. Chapters Feed for specific Manga (Supports Indonesian & English translation prioritization)
    if (action === 'chapters' && mangaId) {
      const directUrl = `https://api.mangadex.org/manga/${mangaId}/feed?limit=500&order[chapter]=asc&includes[]=scanlation_group`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9500);

      const res = await fetch(directUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AntiTimpa/2.0; +https://antitimpa.id)',
          'Accept': 'application/json'
        }
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return { statusCode: 200, headers, body: JSON.stringify({ chapters: [] }) };
      }
      const json = await res.json();
      const rawChapters = json.data || [];

      const chapterMap = new Map<string, any>();
      for (const item of rawChapters) {
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

      const chapters = deduplicated.map((ch: any, idx: number) => {
        const chNum = parseFloat(ch.attributes?.chapter || String(idx + 1)) || (idx + 1);
        const rawTitle = ch.attributes?.title || '';
        return {
          id: ch.id,
          chapterNumber: chNum,
          title: rawTitle.trim() ? `Chapter ${chNum}: ${rawTitle.trim()}` : `Chapter ${chNum}`,
          pageCount: ch.attributes?.pages || 10,
          releaseDate: (ch.attributes?.publishAt || ch.attributes?.readableAt || new Date().toISOString()).split('T')[0],
          translatedLanguage: ch.attributes?.translatedLanguage || 'en'
        };
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ chapters })
      };
    }

    // 2. Chapter Page Images from At-Home Server
    if (action === 'pages' && chapterId) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9500);

      const atHomeRes = await fetch(`https://api.mangadex.org/at-home/server/${chapterId}`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AntiTimpa/2.0; +https://antitimpa.id)',
          'Accept': 'application/json'
        }
      });
      clearTimeout(timeout);

      if (!atHomeRes.ok) {
        return { statusCode: 200, headers, body: JSON.stringify({ pages: [] }) };
      }
      const atHomeData = await atHomeRes.json();
      const baseUrl = atHomeData.baseUrl;
      const hash = atHomeData.chapter?.hash;
      const fileNames = atHomeData.chapter?.data || [];

      const pages = fileNames.map((fn: string, pIdx: number) => ({
        id: `p-${chapterId}-${pIdx + 1}`,
        pageNumber: pIdx + 1,
        imageUrl: `${baseUrl}/data/${hash}/${fn}`,
        caption: `Halaman ${pIdx + 1}`
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ pages })
      };
    }

    // 3. Search & Multi-Batch Listing with Comprehensive Content Rating & Relevance
    const safeLimit = Math.min(100, Math.max(1, limitReq || 50));
    const safeOffset = Math.max(0, offsetReq || 0);

    const buildParams = (chunkLimit: number, currentOffset: number) => {
      const params = new URLSearchParams();
      
      // Copy over known MangaDex parameters if provided in event.rawQuery
      const rawQuery = event.rawQuery || '';
      if (rawQuery) {
        const rawParams = new URLSearchParams(rawQuery);
        rawParams.forEach((val, key) => {
          if (!['limit', 'offset', 'action', 'q', 'category', 'rating', 'origin'].includes(key)) {
            params.append(key, val);
          }
        });
      }

      if (!params.has('order[followedCount]') && !params.has('order[rating]') && !params.has('order[latestUploadedChapter]') && !params.has('order[relevance]')) {
        if (qTitle) {
          params.append('title', qTitle);
          params.append('order[relevance]', 'desc');
        } else {
          params.append('order[followedCount]', 'desc');
        }
      } else if (qTitle && !params.has('title')) {
        params.append('title', qTitle);
      }

      params.set('limit', String(chunkLimit));
      params.set('offset', String(currentOffset));
      
      if (!params.getAll('includes[]').includes('cover_art')) params.append('includes[]', 'cover_art');
      if (!params.getAll('includes[]').includes('author')) params.append('includes[]', 'author');
      if (!params.getAll('includes[]').includes('artist')) params.append('includes[]', 'artist');

      if (!params.has('contentRating[]')) {
        if (rating === '18plus' || category === '18plus') {
          params.append('contentRating[]', 'erotica');
          params.append('contentRating[]', 'pornographic');
        } else if (rating === 'normal') {
          params.append('contentRating[]', 'safe');
          params.append('contentRating[]', 'suggestive');
        } else {
          params.append('contentRating[]', 'safe');
          params.append('contentRating[]', 'suggestive');
          params.append('contentRating[]', 'erotica');
          params.append('contentRating[]', 'pornographic');
        }
      }

      if (!params.has('originalLanguage[]')) {
        if (origin) {
          params.append('originalLanguage[]', String(origin));
        } else if (!qTitle) {
          if (category === 'manhwa') {
            params.append('originalLanguage[]', 'ko');
          } else if (category === 'manhua') {
            params.append('originalLanguage[]', 'zh');
            params.append('originalLanguage[]', 'zh-hk');
          } else if (category === 'manga') {
            params.append('originalLanguage[]', 'ja');
          }
        }
      }
      return params;
    };

    const fetchMangaDexChunk = async (chunkLimit: number, chunkOffset: number) => {
      const p = buildParams(chunkLimit, chunkOffset);
      const url = `https://api.mangadex.org/manga?${p.toString()}`;
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 9500);

      const r = await fetch(url, {
        signal: ctrl.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AntiTimpa/2.0; +https://antitimpa.id)',
          'Accept': 'application/json'
        }
      });
      clearTimeout(t);
      if (!r.ok) return null;
      return await r.json();
    };

    const firstChunkLimit = Math.min(100, safeLimit);
    const firstJson = await fetchMangaDexChunk(firstChunkLimit, safeOffset);

    if (!firstJson || !firstJson.data) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ data: [], total: 0 })
      };
    }

    let allItems = [...firstJson.data];
    const totalAvailable = typeof firstJson.total === 'number' ? firstJson.total : allItems.length;

    // Fetch next batches if user requested limit > 100
    if (safeLimit > 100 && totalAvailable > allItems.length) {
      const targetCount = Math.min(safeLimit, totalAvailable);
      let curOffset = safeOffset + allItems.length;

      while (allItems.length < targetCount && curOffset < totalAvailable) {
        const nextLimit = Math.min(100, targetCount - allItems.length);
        try {
          const nextJson = await fetchMangaDexChunk(nextLimit, curOffset);
          if (nextJson && Array.isArray(nextJson.data) && nextJson.data.length > 0) {
            allItems.push(...nextJson.data);
            curOffset += nextJson.data.length;
            if (nextJson.data.length < nextLimit) break;
          } else {
            break;
          }
        } catch {
          break;
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        data: allItems,
        total: totalAvailable,
        limit: safeLimit,
        offset: safeOffset
      })
    };
  } catch (err: any) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ data: [], error: err.message || 'MangaDex Proxy Error' })
    };
  }
}
