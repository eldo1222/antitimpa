import { Comic } from '../types';

export interface GenreItem {
  id: string;
  name: string;
  category?: 'body' | 'plot' | 'character' | 'setting' | 'kink';
  description?: string;
  color?: string;
}

// User-specified exact genre list & popular categories
export const PRESET_GENRES: string[] = [
  'Romance 18+',
  'Drama Dewasa',
  'Milf / Noona',
  'Action',
  'Fantasy',
  'Manhwa',
  'Manga',
  'Manhua',
  'Webtoon',
  'Martial Arts',
  'Cultivation',
  'Leveling',
  'Dungeon',
  'Superpower',
  'Comedy',
  'Shounen',
  'Big Tits',
  'Small Tits',
  'Bondage',
  'Netorare',
  'Vanilla',
  'Romance',
  'Ahegao',
  'Anal',
  'Creampy',
  'Loli',
  'Rape',
  'Furry',
  'Parody',
  'Big Penis',
  'Solo Male',
  'Solo Female',
  'Threesome',
  'Group',
  'MMF Threesome',
  'FFM Threesome',
  'Milf',
  'Sister',
  'Mother',
  'Bikini',
  'School Uniform',
  'Dark Skin',
  'Netorase',
  'Cheating',
  'Big Breast',
  'Elf',
  'Pregnant',
  'Harem',
  'Supernatural',
  'Reincarnation',
  'Isekai'
];

// Helper to normalize genre string comparison (e.g. "big tits" === "Big Tits")
export const normalizeGenre = (genre: string): string => {
  return genre.trim().toLowerCase().replace(/[-_/]/g, ' ');
};

// Check if a comic matches a specific genre
export const comicHasGenre = (comic: Comic, targetGenre: string): boolean => {
  if (!targetGenre || targetGenre === 'All' || targetGenre === 'Semua') return true;
  const targetNorm = normalizeGenre(targetGenre);
  return comic.genres.some(g => {
    const gNorm = normalizeGenre(g);
    return gNorm === targetNorm || gNorm.includes(targetNorm) || targetNorm.includes(gNorm);
  });
};

// Find similar comics sharing the most genres with a reference comic
export const getSimilarComics = (referenceComic: Comic, allComics: Comic[], limit: number = 4): Comic[] => {
  if (!referenceComic || !allComics || allComics.length === 0) return [];

  const refGenreNorms = referenceComic.genres.map(normalizeGenre);

  const scored = allComics
    .filter(c => c.id !== referenceComic.id)
    .map(c => {
      let matchCount = 0;
      c.genres.forEach(g => {
        const norm = normalizeGenre(g);
        if (refGenreNorms.some(rg => rg === norm || rg.includes(norm) || norm.includes(rg))) {
          matchCount += 1;
        }
      });
      return { comic: c, matchCount };
    })
    .filter(item => item.matchCount > 0)
    .sort((a, b) => {
      if (b.matchCount !== a.matchCount) {
        return b.matchCount - a.matchCount; // Highest matching genres first
      }
      return b.comic.rating - a.comic.rating; // Then higher rating
    });

  // If not enough matching genre comics, fill with highest rated other comics
  const results = scored.map(s => s.comic);
  if (results.length < limit) {
    const remaining = allComics
      .filter(c => c.id !== referenceComic.id && !results.some(r => r.id === c.id))
      .sort((a, b) => b.rating - a.rating);
    results.push(...remaining.slice(0, limit - results.length));
  }

  return results.slice(0, limit);
};
