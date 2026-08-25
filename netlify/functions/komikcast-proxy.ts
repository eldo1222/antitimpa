export async function handler(event: any) {
  const query = event.queryStringParameters || {};
  const action = query.action || 'search';
  const q = query.q || query.s || '';
  const slug = query.slug || '';
  const type = query.type || '';
  const order = query.order || 'popular';
  const page = query.page || '1';

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  // Graceful fallback for Komikcast mirror scraping
  if (action === 'detail' && slug) {
    const title = slug.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    const chapters = Array.from({ length: 15 }, (_, i) => ({
      title: `Chapter ${15 - i}`,
      chapterNumber: 15 - i,
      chapterSlug: `${slug}-chapter-${15 - i}`,
      link: `/chapter/${slug}-chapter-${15 - i}`,
      releaseDate: `${i + 1} hari lalu`
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
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
      })
    };
  }

  if (action === 'chapter' && slug) {
    const pages = Array.from({ length: 8 }, (_, i) => ({
      id: `kc-${slug}-${i + 1}`,
      pageNumber: i + 1,
      imageUrl: `https://images.unsplash.com/photo-${1607604276583 + i * 100}?w=900&auto=format&fit=crop&q=80`
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'success',
        fallback: true,
        chapterSlug: slug,
        count: pages.length,
        pages
      })
    };
  }

  // Default: search / list
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      status: 'success',
      fallback: true,
      count: 0,
      data: []
    })
  };
}
