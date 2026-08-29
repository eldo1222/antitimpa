import { Comic } from '../types';

export interface GenreItem {
  id: string;
  name: string;
  category?: 'body' | 'plot' | 'character' | 'setting' | 'kink';
  description?: string;
  color?: string;
}

// User-specified exact genre list & popular categories (clean, parsed, no duplicates)
export const PRESET_GENRES: string[] = [
  '3D',
  'Action',
  'Adventure',
  'Anal',
  'Anime',
  'Aunt',
  'Beautymark',
  'Big Ass',
  'Big Penis',
  'Bigbreast',
  'Blowjob',
  'Cheating',
  'Condom',
  'Dilf',
  'Dragon ball',
  'Fantasi',
  'Fetish',
  'Fingering',
  'Friends',
  'Full color',
  'Futanari',
  'Ghost',
  'Girlfriend',
  'Glasses',
  'Gyaru',
  'Handjob',
  'Hijab',
  'Hot Mom',
  'Incest',
  'Kissing',
  'Lesbian',
  'Masturbation',
  'Milf',
  'Milk',
  'Mom & Son',
  'Naruto',
  'Ntr (Netorare)',
  'Nurse',
  'Oldman',
  'One Piece',
  'Pregnant',
  'Prostitution',
  'Rape',
  'Romance',
  'School',
  'Shin-chan',
  'Shota',
  'Sister',
  'Step mother',
  'Step Sister',
  'Stocking',
  'Sub English',
  'Sub indo',
  'Teacher',
  'Threesome',
  'Uncensored',
  'Virgin',
  'Wife'
];

/**
 * Intelligent genre string parser that can take comma-separated, semicolon-separated,
 * or even camelCase / concatenated genre strings (e.g. "UncensoredVirginWife")
 * and cleanly split them into individual unique title-cased genre tags.
 */
export const parseAndCleanGenres = (input: string | string[]): string[] => {
  if (!input) return [];

  let rawList: string[] = [];

  if (Array.isArray(input)) {
    rawList = input;
  } else if (typeof input === 'string') {
    // If it contains delimiters like commas, semicolons, pipes, or newlines
    if (/[,;|/\n]/.test(input)) {
      rawList = input.split(/[,;|/\n]+/);
    } else {
      // Known multi-word tokens to extract first before camel-case splitting
      const multiWordPatterns = [
        'Dragon ball', 'dragon ball',
        'One Piece', 'one piece',
        'Shin-chan', 'shin-chan',
        'Full color', 'full color',
        'Big Ass', 'big ass',
        'Big Penis', 'big penis',
        'Hot Mom', 'hot mom',
        'Mom & Son', 'mom & son',
        'Mom and Son', 'mom and son',
        'Step mother', 'step mother',
        'Step Sister', 'step sister',
        'Sub English', 'sub english',
        'Sub indo', 'sub indo',
        'Ntr (Netorare)', 'ntr (netorare)'
      ];

      let workingStr = input;
      const extracted: string[] = [];

      multiWordPatterns.forEach(pattern => {
        const regex = new RegExp(pattern.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'gi');
        if (regex.test(workingStr)) {
          extracted.push(pattern);
          workingStr = workingStr.replace(regex, ' ');
        }
      });

      // Split camel-cased tokens: e.g. "UncensoredVirginWife" -> ["Uncensored", "Virgin", "Wife"]
      const camelTokens = workingStr
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .split(/\s+/)
        .filter(Boolean);

      rawList = [...extracted, ...camelTokens];
    }
  }

  // Deduplicate and normalize capitalization
  const seen = new Set<string>();
  const cleaned: string[] = [];

  rawList.forEach(item => {
    const trimmed = item.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      // Look up preset match for pristine casing
      const matchedPreset = PRESET_GENRES.find(p => p.toLowerCase() === lower);
      if (matchedPreset) {
        cleaned.push(matchedPreset);
      } else {
        // Default capitalize first letter of each word
        const formatted = trimmed
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        cleaned.push(formatted);
      }
    }
  });

  return cleaned;
};

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
