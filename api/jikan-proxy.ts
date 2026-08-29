export default async function handler(req: any, res: any) {
  const query = req.query || req.queryStringParameters || {};
  const q = (query.q || '').trim();
  const limit = parseInt(query.limit || '25', 10);
  const page = query.page || '1';
  const type = query.type || '';
  const filter = query.filter || '';

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

  // Attempt 1: Fetch from Jikan v4 with strict timeout
  try {
    let url = '';
    if (q) {
      url = `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(q)}&limit=${limit}&page=${page}&sfw=false`;
    } else {
      url = `https://api.jikan.moe/v4/top/manga?limit=${limit}&page=${page}`;
      if (type) url += `&type=${encodeURIComponent(type)}`;
      if (filter) url += `&filter=${encodeURIComponent(filter)}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AntiTimpa/2.0; +https://antitimpa.id)',
        'Accept': 'application/json'
      }
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data.data) && data.data.length > 0) {
        return sendResponse(200, data);
      }
    }
  } catch (err) {
    // Fall through to Kitsu fallback
  }

  // Attempt 2: High-reliability Fallback via Kitsu API (Mapped to Jikan data format)
  try {
    const kitsuUrl = q
      ? `https://kitsu.io/api/edge/manga?filter[text]=${encodeURIComponent(q)}&page[limit]=${limit}`
      : `https://kitsu.io/api/edge/manga?sort=-userCount&page[limit]=${limit}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const kRes = await fetch(kitsuUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/vnd.api+json'
      }
    });
    clearTimeout(timeout);

    if (kRes.ok) {
      const kJson = await kRes.json();
      if (kJson && Array.isArray(kJson.data) && kJson.data.length > 0) {
        const mappedData = kJson.data.map((item: any) => {
          const attr = item.attributes || {};
          const titles = attr.titles || {};
          const title = attr.canonicalTitle || titles.en || titles.en_jp || Object.values(titles)[0] || 'Manga Title';
          const poster = attr.posterImage || {};
          const imgUrl = poster.large || poster.original || poster.medium || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80';
          const subtype = (attr.subtype || attr.mangaType || 'manga').toLowerCase();

          return {
            mal_id: parseInt(item.id, 10) || Math.floor(Math.random() * 100000),
            url: `https://kitsu.io/manga/${item.id}`,
            title,
            title_english: titles.en || title,
            title_japanese: titles.ja_jp || title,
            images: {
              jpg: { image_url: imgUrl, large_image_url: imgUrl },
              webp: { image_url: imgUrl, large_image_url: imgUrl }
            },
            type: subtype === 'manhwa' ? 'Manhwa' : (subtype === 'manhua' ? 'Manhua' : 'Manga'),
            chapters: attr.chapterCount || null,
            publishing: attr.status === 'current',
            status: attr.status === 'finished' ? 'Finished' : 'Publishing',
            score: attr.averageRating ? parseFloat(attr.averageRating) / 10 : 8.5,
            synopsis: attr.synopsis || attr.description || 'Sinopsis komik dari database MyAnimeList / Kitsu.',
            genres: [{ name: subtype === 'manhwa' ? 'Manhwa' : 'Action' }, { name: 'Drama' }]
          };
        });

        return sendResponse(200, { data: mappedData, source: 'kitsu_fallback' });
      }
    }
  } catch (kErr) {
    // ignore
  }

  // Graceful empty response (Never 500)
  return sendResponse(200, { data: [] });
}
