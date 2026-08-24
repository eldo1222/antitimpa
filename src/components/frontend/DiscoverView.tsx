import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { PRESET_GENRES, comicHasGenre } from '../../data/genres';
import { 
  Search, 
  Filter, 
  Star, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  Flame, 
  Layers, 
  ChevronRight,
  TrendingUp,
  Tag
} from 'lucide-react';

export const DiscoverView: React.FC = () => {
  const navigate = useNavigate();
  const { comics, selectComic, chapters, selectedGenreFilter, setSelectedGenreFilter } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState(selectedGenreFilter || 'All');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'ongoing' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'rating' | 'popular' | 'latest'>('popular');
  const [showAllGenres, setShowAllGenres] = useState(false);

  // Helper to determine the actual category of a comic
  const getComicCategory = (comic: any): 'manga' | 'manhwa' | 'manhua' | 'doujin' | '18plus' => {
    if (comic.contentType === '18plus') return '18plus';
    if (comic.comicType === 'doujin' || comic.type === 'doujin') return 'doujin';
    if (comic.comicType === 'manhwa' || comic.type === 'manhwa') return 'manhwa';
    if (comic.comicType === 'manhua' || comic.type === 'manhua') return 'manhua';
    if (comic.comicType === 'manga' || comic.type === 'manga') return 'manga';
    const genreStr = `${comic.title} ${(comic.genres || []).join(' ')}`.toLowerCase();
    if (genreStr.includes('doujin')) return 'doujin';
    if (genreStr.includes('manhwa') || genreStr.includes('korean')) return 'manhwa';
    if (genreStr.includes('manhua') || genreStr.includes('chinese') || genreStr.includes('cultivation')) return 'manhua';
    return 'manga';
  };

  // Sync when selectedGenreFilter changes globally (e.g. clicking a genre tag on comic detail)
  React.useEffect(() => {
    if (selectedGenreFilter) {
      setSelectedGenre(selectedGenreFilter);
    }
  }, [selectedGenreFilter]);

  const allGenres = ['All', ...PRESET_GENRES];
  const displayedGenres = showAllGenres ? allGenres : allGenres.slice(0, 18);

  const [selectedCategory, setSelectedCategory] = useState<'all' | 'manga' | 'manhwa' | 'manhua' | 'doujin' | '18plus'>('all');
  const [adultOnlyFilter, setAdultOnlyFilter] = useState(false);

  const filtered = comics
    .filter(c => {
      // Respect visibility settings (hidden comics are only managed in admin)
      if (c.isVisibleOnHome === false || c.showOnHome === false) return false;

      const matchSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.storyWriter.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.genres.some(g => g.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchGenre = comicHasGenre(c, selectedGenre);
      const matchStatus = selectedStatus === 'all' || c.status === selectedStatus;
      
      let matchCat = true;
      if (selectedCategory !== 'all') {
        const cat = getComicCategory(c);
        if (selectedCategory === '18plus') {
          matchCat = c.contentType === '18plus';
        } else {
          matchCat = cat === selectedCategory || c.comicType === selectedCategory;
        }
      }

      const matchAdult = !adultOnlyFilter || c.contentType === '18plus';

      return matchSearch && matchGenre && matchStatus && matchCat && matchAdult;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'popular') return b.totalReaders - a.totalReaders;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const handleGenreClick = (g: string) => {
    setSelectedGenre(g);
    setSelectedGenreFilter(g);
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 pb-24 space-y-6 text-slate-100 animate-in fade-in pt-3 sm:pt-4">
      {/* Header */}
      <div>
        <h2 className="font-black text-xl sm:text-2xl text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#ff5b14]" />
          Jelajah Katalog Komik
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Temukan ratusan chapter komik digital bergenre favoritmu dengan filter akurat
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari judul, pengarang (story/art), atau genre..."
          className="w-full pl-10 pr-4 py-3 bg-[#13131c] border border-[#242436] rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14] transition-colors"
        />
        <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
      </div>

      {/* Genre Filter Pills */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-[#ff5b14]" />
            <span>Pilih Genre ({allGenres.length - 1} Genre Tersedia)</span>
          </label>
          <button
            onClick={() => setShowAllGenres(!showAllGenres)}
            className="text-[11px] text-[#ff5b14] hover:underline font-bold"
          >
            {showAllGenres ? 'Sembunyikan Sebagian' : `Lihat Semua (${allGenres.length - 1})`}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {displayedGenres.map(g => (
            <button
              key={g}
              onClick={() => handleGenreClick(g)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                selectedGenre === g
                  ? 'bg-gradient-to-r from-[#ff5b14] to-[#f97316] text-white shadow-md shadow-[#ff5b14]/30 scale-105'
                  : 'bg-[#181824] text-slate-400 hover:text-slate-200 border border-[#252538]'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Row: Content Category (Manga, Manhwa, Manhua, 18+ VIP), Status & Sorting */}
      <div className="space-y-2 pt-2 border-t border-[#1f1f2e] text-xs">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 font-medium mr-1">Kategori:</span>
            {[
              { id: 'all', label: '🌟 Semua' },
              { id: '18plus', label: '🔞 18+ VIP' },
              { id: 'manhwa', label: '🇰🇷 Manhwa' },
              { id: 'manga', label: '🇯🇵 Manga' },
              { id: 'manhua', label: '🇨🇳 Manhua' },
              { id: 'doujin', label: '🌸 Doujin' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? cat.id === '18plus' 
                      ? 'bg-rose-600 text-white shadow-sm'
                      : cat.id === 'manhwa' 
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : cat.id === 'manga'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : cat.id === 'manhua'
                            ? 'bg-amber-600 text-white shadow-sm'
                            : cat.id === 'doujin'
                              ? 'bg-pink-600 text-white shadow-sm'
                              : 'bg-[#ff5b14] text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 bg-[#161622] border border-[#222232]'
                }`}
              >
                {cat.label}
              </button>
            ))}

            <button
              onClick={() => setAdultOnlyFilter(prev => !prev)}
              className={`ml-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer border ${
                adultOnlyFilter
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                  : 'bg-[#141420] text-slate-400 hover:text-slate-200 border-[#262638]'
              }`}
            >
              🔞 Opsi 18+
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Urutkan:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#181824] border border-[#27273a] text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-[#ff5b14]"
            >
              <option value="popular">Paling Populer</option>
              <option value="rating">Rating Tertinggi</option>
              <option value="latest">Terbaru Diperbarui</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium mr-1">Status:</span>
          {(['all', 'ongoing', 'completed'] as const).map(st => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-2.5 py-1 rounded-lg capitalize font-semibold transition-colors cursor-pointer ${
                selectedStatus === st 
                  ? 'bg-[#222234] text-white border border-[#33334c]' 
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {st === 'all' ? 'Semua Status' : st === 'ongoing' ? 'Ongoing' : 'Tamat'}
            </button>
          ))}
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Menampilkan <strong className="text-white">{filtered.length}</strong> judul komik</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(comic => {
            const chList = chapters[comic.id] || [];
            return (
              <div
                key={comic.id}
                onClick={() => {
                  selectComic(comic.id);
                  navigate(`/comic/${comic.slug || comic.id}`);
                }}
                className="p-3 bg-[#13131c] hover:bg-[#191924] border border-[#222232] rounded-2xl flex gap-3 cursor-pointer group transition-all"
              >
                <img 
                  src={comic.coverImage} 
                  alt={comic.title} 
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=800&auto=format&fit=crop';
                  }}
                  className="w-20 h-28 rounded-xl object-cover ring-1 ring-white/10 shrink-0 group-hover:scale-102 transition-transform" 
                />
                <div className="flex flex-col justify-between flex-1 min-w-0">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                        comic.status === 'ongoing' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-purple-500/20 text-purple-300'
                      }`}>
                        {comic.status}
                      </span>
                      <span className="text-[10px] text-amber-400 font-bold flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-400" /> {comic.rating}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs sm:text-sm text-white truncate group-hover:text-[#ff5b14] transition-colors">
                      {comic.title}
                    </h4>

                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                      {comic.synopsis}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-[#1e1e2d]">
                    <span>{chList.length} Chapter</span>
                    <span className="text-[#ff5b14] font-semibold flex items-center">
                      Detail <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
