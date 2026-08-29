export default async function handler(req: any, res: any) {
  const query = req.query || req.queryStringParameters || {};
  const q = (query.q || query.search || query.title || '').trim().toLowerCase();
  const category = (query.category || 'all').toLowerCase();

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

  const doujinFeeds = [
    {
      title: 'Secret Class (18+ Manhwa)',
      slug: 'secret-class-vip',
      coverImage: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
      bannerImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80',
      synopsis: 'Dae-ho yang yatim piatu diadopsi oleh keluarga teman ayahnya. Ketika dewasa, ia mulai belajar banyak hal rahasia tentang cinta dan kehidupan orang dewasa dari bibi dan kedua kakak perempuannya.',
      genres: ['Romance 18+', 'Drama Dewasa', 'Harem', 'Manhwa 18+', 'VIP Series'],
      status: 'ongoing',
      storyWriter: 'Wang Kang Chul',
      artist: 'Minachan',
      rating: 4.95,
      totalChapters: 210,
      contentType: '18plus',
      comicType: 'manhwa',
      isFree: false,
      isVisibleOnHome: true,
      isPublished: true,
      sourceApi: 'Doujindesu API'
    },
    {
      title: 'Boarding Diary: Roommate 18+',
      slug: 'boarding-diary-roommate',
      coverImage: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80',
      bannerImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
      synopsis: 'Junwoo pindah ke indekos milik teman ibunya untuk kuliah. Namun suasana rumah kos yang penuh gadis-gadis cantik membuatnya sulit fokus belajar.',
      genres: ['Romance 18+', 'Comedy Dewasa', 'Harem', 'Manhwa 18+'],
      status: 'completed',
      storyWriter: 'Kim Dong Hwan',
      artist: 'Park Tae Jun',
      rating: 4.92,
      totalChapters: 130,
      contentType: '18plus',
      comicType: 'manhwa',
      isFree: false,
      isVisibleOnHome: true,
      isPublished: true,
      sourceApi: 'Doujindesu API'
    },
    {
      title: 'Stepmother\'s Friends (VIP 18+)',
      slug: 'stepmothers-friends-vip',
      coverImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
      bannerImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80',
      synopsis: 'Seok-woo tinggal bersama ibu tirinya yang memiliki teman-teman wanita sosialita yang anggun dan mempesona. Kisah drama romansa penuh rahasia di balik pintu tertutup.',
      genres: ['Romance 18+', 'Drama Dewasa', 'Milf', 'VIP Series'],
      status: 'ongoing',
      storyWriter: 'Bae Jae-Kwon',
      artist: 'Lee Min-Seok',
      rating: 4.96,
      totalChapters: 175,
      contentType: '18plus',
      comicType: 'manhwa',
      isFree: false,
      isVisibleOnHome: true,
      isPublished: true,
      sourceApi: 'Doujindesu API'
    },
    {
      title: 'Silent War: Office Secret (18+)',
      slug: 'silent-war-office-secret',
      coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
      bannerImage: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&auto=format&fit=crop&q=80',
      synopsis: 'Intrik dan persaingan ketat di kantor agensi model yang berubah menjadi hubungan asmara terlarang di antara para karyawan dan pimpinan.',
      genres: ['Drama Dewasa', 'Romance 18+', 'Office Romance'],
      status: 'completed',
      storyWriter: 'Choi Jin-Woo',
      artist: 'Han Se-Rim',
      rating: 4.88,
      totalChapters: 120,
      contentType: '18plus',
      comicType: 'manhwa',
      isFree: false,
      isVisibleOnHome: true,
      isPublished: true,
      sourceApi: 'Doujindesu API'
    },
    {
      title: 'Sister Neighbor: Tetangga Kamar (18+)',
      slug: 'sister-neighbor-tetangga',
      coverImage: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
      bannerImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80',
      synopsis: 'Tetangga sebelah apartemen yang ramah sering meminta bantuan hal-hal sepele, sampai suatu malam yang hujan mengubah segalanya.',
      genres: ['Romance 18+', 'Drama Dewasa', 'Slice of Life'],
      status: 'ongoing',
      storyWriter: 'Lee Hyun',
      artist: 'Studio G',
      rating: 4.9,
      totalChapters: 90,
      contentType: '18plus',
      comicType: 'manhwa',
      isFree: false,
      isVisibleOnHome: true,
      isPublished: true,
      sourceApi: 'Doujindesu API'
    }
  ];

  let filtered = doujinFeeds;
  if (q) {
    filtered = filtered.filter(item => 
      item.title.toLowerCase().includes(q) ||
      item.genres.some(g => g.toLowerCase().includes(q)) ||
      item.storyWriter.toLowerCase().includes(q)
    );
  }

  if (category && category !== 'all' && category !== '18plus') {
    filtered = filtered.filter(item => 
      item.genres.some(g => g.toLowerCase().includes(category)) ||
      item.comicType === category
    );
  }

  return sendResponse(200, {
    status: 'success',
    count: filtered.length,
    data: filtered
  });
}
