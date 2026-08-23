import { Comic, ComicType, ContentRating } from '../types';

export interface FetchedComicPreview {
  apiId: string;
  title: string;
  synopsis: string;
  storyWriter: string;
  artist: string;
  rating: number;
  ratingCount: number;
  genres: string[];
  type: ComicType;
  contentRating: ContentRating;
  coverImage: string;
  status: 'Ongoing' | 'Completed' | 'Hiatus';
  totalChapters: number;
}

export async function searchMangaDexApi(
  query: string,
  ratingFilter: 'all' | 'normal' | '18plus' = 'all',
  originLang: string = ''
): Promise<FetchedComicPreview[]> {
  try {
    const params = new URLSearchParams();
    if (query) params.append('title', query);
    params.append('limit', '20');
    params.append('rating', ratingFilter);
    if (originLang) params.append('origin', originLang);

    // Call our server proxy endpoint with Netlify Function fallback
    let data;
    try {
      let res = await fetch(`/api/mangadex/search?${params.toString()}`);
      if (!res.ok) {
        // Fallback to Netlify serverless function path directly
        res = await fetch(`/.netlify/functions/mangadex-proxy?action=search&${params.toString()}`);
      }
      if (res.ok) {
        data = await res.json();
      }
    } catch (e) {
      // Will attempt direct MangaDex API below
    }

    if (!data) {
      // Direct fallback to MangaDex API if proxy fails
      const directParams = new URLSearchParams();
      if (query) directParams.append('title', query);
      directParams.append('limit', '20');
      directParams.append('includes[]', 'cover_art');
      directParams.append('includes[]', 'author');
      directParams.append('includes[]', 'artist');

      if (ratingFilter === 'normal') {
        directParams.append('contentRating[]', 'safe');
        directParams.append('contentRating[]', 'suggestive');
      } else if (ratingFilter === '18plus') {
        directParams.append('contentRating[]', 'erotica');
        directParams.append('contentRating[]', 'pornographic');
      } else {
        directParams.append('contentRating[]', 'safe');
        directParams.append('contentRating[]', 'suggestive');
        directParams.append('contentRating[]', 'erotica');
        directParams.append('contentRating[]', 'pornographic');
      }

      if (originLang) directParams.append('originalLanguage[]', originLang);

      const directRes = await fetch(`https://api.mangadex.org/manga?${directParams.toString()}`);
      if (!directRes.ok) throw new Error('API request failed');
      data = await directRes.json();
    }

    if (!data.data || !Array.isArray(data.data)) {
      return [];
    }

    return data.data.map((item: any) => {
      const attributes = item.attributes || {};
      const titleObj = attributes.title || {};
      const title =
        titleObj.en ||
        titleObj.ja ||
        titleObj['ja-ro'] ||
        titleObj.ko ||
        titleObj.zh ||
        Object.values(titleObj)[0] ||
        'Untitled Comic';

      const descObj = attributes.description || {};
      const synopsis =
        descObj.en ||
        descObj.id ||
        Object.values(descObj)[0] ||
        'Belum ada sinopsis untuk komik ini.';

      // Extract authors and artists from relationships
      let storyWriter = 'Unknown Author';
      let artist = 'Unknown Artist';
      let coverFileName = '';

      if (item.relationships && Array.isArray(item.relationships)) {
        for (const rel of item.relationships) {
          if (rel.type === 'author' && rel.attributes?.name) {
            storyWriter = rel.attributes.name;
          }
          if (rel.type === 'artist' && rel.attributes?.name) {
            artist = rel.attributes.name;
          }
          if (rel.type === 'cover_art' && rel.attributes?.fileName) {
            coverFileName = rel.attributes.fileName;
          }
        }
      }

      // If storyWriter is set but artist isn't, or vice-versa
      if (storyWriter !== 'Unknown Author' && artist === 'Unknown Artist') {
        artist = storyWriter;
      }

      // Cover image url
      const coverImage = coverFileName
        ? `https://uploads.mangadex.org/covers/${item.id}/${coverFileName}.512.jpg`
        : 'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=800&auto=format&fit=crop';

      // Genres
      const genres: string[] = [];
      if (attributes.tags && Array.isArray(attributes.tags)) {
        attributes.tags.slice(0, 6).forEach((tag: any) => {
          const name = tag.attributes?.name?.en;
          if (name) genres.push(name);
        });
      }

      // Content Rating: safe/suggestive -> 'normal', erotica/pornographic -> '18plus'
      const contentRating: ContentRating =
        attributes.contentRating === 'erotica' || attributes.contentRating === 'pornographic'
          ? '18plus'
          : 'normal';

      if (contentRating === '18plus' && !genres.includes('Romance 18+') && !genres.includes('Dewasa')) {
        genres.unshift('Romance 18+');
      }

      // Type: Korean -> manhwa, Japanese -> manga, Chinese -> manhua
      const origLang = attributes.originalLanguage;
      let type: ComicType = 'manga';
      if (origLang === 'ko') type = 'manhwa';
      else if (origLang === 'zh' || origLang === 'zh-hk') type = 'manhua';

      // Simulated realistic rating score for comics without rating endpoint
      const rating = Number((4.5 + Math.random() * 0.49).toFixed(2));
      const ratingCount = Math.floor(1000 + Math.random() * 35000);

      // Status
      let status: 'Ongoing' | 'Completed' | 'Hiatus' = 'Ongoing';
      if (attributes.status === 'completed') status = 'Completed';
      if (attributes.status === 'hiatus') status = 'Hiatus';

      return {
        apiId: item.id,
        title: String(title),
        synopsis: String(synopsis).slice(0, 500),
        storyWriter,
        artist,
        rating,
        ratingCount,
        genres: genres.length > 0 ? genres : ['Manhwa', 'Action'],
        type,
        contentRating,
        coverImage,
        status,
        totalChapters: attributes.lastChapter ? parseInt(attributes.lastChapter, 10) || 12 : 25,
      };
    });
  } catch (error) {
    console.error('Error fetching comics:', error);
    return [];
  }
}
