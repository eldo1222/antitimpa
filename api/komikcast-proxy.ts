export default async function handler(req: any, res: any) {
  const query = req.query || req.queryStringParameters || {};
  const action = query.action || 'search';
  const slug = query.slug || '';

  const sendResponse = (statusCode: number, data: any) => {
    if (res && typeof res.status === 'function') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Content-Type', 'application/json');
      return res.status(statusCode).json(data);
    }
    return {
      statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    };
  };

  if (req.method === 'OPTIONS') {
    return sendResponse(200, { ok: true });
  }

  if (action === 'detail' && slug) {
    const title = slug.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    const chapters = Array.from({ length: 15 }, (_, i) => ({
      title: `Chapter ${15 - i}`,
      chapterNumber: 15 - i,
      chapterSlug: `${slug}-chapter-${15 - i}`,
      link: `/chapter/${slug}-chapter-${15 - i}`,
      releaseDate: `${i + 1} hari lalu`
    }));

    return sendResponse(200, {
      status: 'success',
      fallback: true,
      data: {
        title,
        slug,
        coverImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
        synopsis: `Sinopsis lengkap untuk komik ${title}.`,
        genres: ['Action', 'Adventure', 'Fantasy', 'Manhwa'],
        storyWriter: 'Original Creator',
        artist: 'Studio Staff',
        status: 'ongoing',
        comicType: 'manhwa',
        contentType: 'normal',
        chapters
      }
    });
  }

  if (action === 'chapter' && slug) {
    const pages = Array.from({ length: 8 }, (_, i) => ({
      id: `kc-${slug}-${i + 1}`,
      pageNumber: i + 1,
      imageUrl: `https://images.unsplash.com/photo-${1607604276583 + i * 100}?w=900&auto=format&fit=crop&q=80`
    }));

    return sendResponse(200, {
      status: 'success',
      fallback: true,
      chapterSlug: slug,
      count: pages.length,
      pages
    });
  }

  return sendResponse(200, {
    status: 'success',
    fallback: true,
    count: 0,
    data: []
  });
}
