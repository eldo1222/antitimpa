export async function handler(event: any) {
  const query = event.queryStringParameters || {};
  const action = query.action || '';
  const mangaId = query.mangaId || '';
  const chapterId = query.chapterId || '';
  const title = query.title || '';

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  try {
    // 1. Chapters Feed for specific Manga
    if (action === 'chapters' && mangaId) {
      const directUrl = `https://api.mangadex.org/manga/${mangaId}/feed?limit=100&order[chapter]=asc&includes[]=scanlation_group`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9000);
      
      const res = await fetch(directUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KomikYuk/2.0)', 'Accept': 'application/json' }
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

    // 2. Chapter Page Images
    if (action === 'pages' && chapterId) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9000);

      const atHomeRes = await fetch(`https://api.mangadex.org/at-home/server/${chapterId}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KomikYuk/2.0)', 'Accept': 'application/json' }
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

    // 3. Search / Multi-Stream Listing
    let rawQueryString = event.rawQuery || '';
    if (!rawQueryString) {
      const p = new URLSearchParams();
      Object.entries(query).forEach(([k, v]) => {
        if (k !== 'action') p.append(k, String(v));
      });
      rawQueryString = p.toString();
    }

    if (title && !rawQueryString.includes('title=')) {
      rawQueryString += (rawQueryString ? '&' : '') + `title=${encodeURIComponent(title)}`;
    }

    if (!rawQueryString.includes('includes%5B%5D=cover_art') && !rawQueryString.includes('includes[]=cover_art')) {
      rawQueryString += (rawQueryString ? '&' : '') + 'includes[]=cover_art&includes[]=author&includes[]=artist';
    }

    const searchUrl = `https://api.mangadex.org/manga?${rawQueryString}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    const res = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KomikYuk/2.0; +https://komikyuk.netlify.app)',
        'Accept': 'application/json'
      }
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ data: [], error: `MangaDex response ${res.status}` })
      };
    }

    const json = await res.json();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(json)
    };
  } catch (err: any) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ data: [], error: err.message || 'MangaDex Proxy Failed' })
    };
  }
}
