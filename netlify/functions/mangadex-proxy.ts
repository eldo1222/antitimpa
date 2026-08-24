export async function handler(event: any) {
  const query = event.queryStringParameters || {};
  const action = query.action || '';
  const mangaId = query.mangaId || '';
  const chapterId = query.chapterId || '';
  const title = query.title || '';

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    if (action === 'chapters' && mangaId) {
      const directUrl = `https://api.mangadex.org/manga/${mangaId}/feed?limit=100&order[chapter]=asc&includes[]=scanlation_group`;
      const res = await fetch(directUrl, { headers: { 'User-Agent': 'KomikYuk-Client/1.0' } });
      if (!res.ok) {
        return { statusCode: res.status, headers, body: JSON.stringify({ chapters: [] }) };
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
          pagesCount: ch.attributes?.pages || 8,
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

    if (action === 'pages' && chapterId) {
      const atHomeRes = await fetch(`https://api.mangadex.org/at-home/server/${chapterId}`);
      if (!atHomeRes.ok) {
        return { statusCode: atHomeRes.status, headers, body: JSON.stringify({ pages: [] }) };
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

    if (action === 'search' && title) {
      const searchUrl = `https://api.mangadex.org/manga?title=${encodeURIComponent(title)}&limit=25&order[relevance]=desc&includes[]=cover_art&includes[]=author&includes[]=artist&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&contentRating[]=pornographic`;
      const res = await fetch(searchUrl);
      const json = await res.json();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(json)
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid action or parameters' })
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
}
