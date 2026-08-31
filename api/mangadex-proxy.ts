export default async function handler(req: any, res: any) {
  const query = req.query || req.queryStringParameters || {};
  const action = query.action || 'search';
  const mangaId = query.mangaId || '';
  const chapterId = query.chapterId || '';
  const quality = query.quality || 'data';
  const qTitle = query.q || query.title || '';
  const limitReq = parseInt(query.limit || '50', 10);
  const offsetReq = parseInt(query.offset || '0', 10);
  const category = query.category || '';
  const rating = query.rating || '';
  const origin = query.origin || '';

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
    // 1. Chapter Page List Ingestion
    if (action === 'pages' && chapterId) {
      const atHomeUrl = `https://api.mangadex.org/at-home/server/${chapterId}`;
      const response = await fetch(atHomeUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 AntiTimpa/2.0',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        return sendResponse(response.status, {
          result: 'error',
          errors: [{ detail: `MangaDex At-Home server returned status ${response.status}` }]
        });
      }

      const data = await response.json();
      const baseUrl = data.baseUrl || 'https://uploads.mangadex.org';
      const chapterHash = data.chapter?.hash;
      const fileNames: string[] = (quality === 'dataSaver' ? data.chapter?.dataSaver : data.chapter?.data) || [];

      const pages = fileNames.map((fileName, index) => {
        const directUrl = `${baseUrl}/${quality}/${chapterHash}/${fileName}`;
        const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(directUrl)}`;
        return {
          pageNumber: index + 1,
          fileName,
          directUrl,
          proxyUrl
        };
      });

      return sendResponse(200, {
        result: 'ok',
        baseUrl,
        chapterHash,
        quality,
        total: pages.length,
        pages
      });
    }

    // 2. Manga Chapters Fetch
    if (action === 'chapters' && mangaId) {
      const targetLanguages = ['id', 'en'];
      let chapters: any[] = [];
      let totalAvailable = 0;

      for (const lang of targetLanguages) {
        const feedUrl = `https://api.mangadex.org/manga/${mangaId}/feed?translatedLanguage[]=${lang}&order[chapter]=asc&limit=500&includes[]=scanlation_group&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&contentRating[]=pornographic`;

        try {
          const feedRes = await fetch(feedUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; AntiTimpa/2.0; +https://antitimpa.id)',
              'Accept': 'application/json'
            }
          });

          if (feedRes.ok) {
            const feedData = await feedRes.json();
            if (feedData.data && feedData.data.length > 0) {
              chapters = feedData.data.map((ch: any) => {
                const attr = ch.attributes || {};
                return {
                  id: ch.id,
                  chapterNumber: parseFloat(attr.chapter) || 0,
                  title: attr.title ? `Ch. ${attr.chapter} - ${attr.title}` : `Chapter ${attr.chapter || 'Oneshot'}`,
                  translatedLanguage: attr.translatedLanguage,
                  publishAt: attr.publishAt,
                  pages: attr.pages || 0,
                  readableAtHome: attr.readableAtHome !== false
                };
              });
              totalAvailable = feedData.total || chapters.length;
              break;
            }
          }
        } catch (e) {
          console.warn(`Error fetching ${lang} feed:`, e);
        }
      }

      return sendResponse(200, {
        result: 'ok',
        mangaId,
        total: totalAvailable,
        data: chapters
      });
    }

    // 3. Search & Multi-Batch Listing
    const safeLimit = Math.min(100, Math.max(1, limitReq || 50));
    const safeOffset = Math.max(0, offsetReq || 0);

    const buildParams = (chunkLimit: number, currentOffset: number) => {
      const params = new URLSearchParams();

      if (req.url && req.url.includes('?')) {
        const rawUrl = new URL(req.url, 'http://localhost');
        rawUrl.searchParams.forEach((val, key) => {
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

    const targetUrl = `https://api.mangadex.org/manga?${buildParams(safeLimit, safeOffset).toString()}`;
    const mdRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 AntiTimpa/1.0',
        'Accept': 'application/json'
      }
    });

    if (!mdRes.ok) {
      return sendResponse(mdRes.status, {
        result: 'error',
        errors: [{ detail: `Upstream MangaDex search returned status ${mdRes.status}` }]
      });
    }

    const payload = await mdRes.json();
    return sendResponse(200, payload);
  } catch (err: any) {
    return sendResponse(500, {
      result: 'error',
      errors: [{ detail: err.message || 'MangaDex Proxy Internal Error' }]
    });
  }
}
