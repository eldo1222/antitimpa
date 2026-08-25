import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { PRESET_GENRES, comicHasGenre } from '../../data/genres';
import { 
  Tag, 
  Search, 
  Star, 
  Sparkles, 
  Flame, 
  Layers, 
  ChevronRight, 
  BookOpen, 
  Bookmark, 
  BookmarkCheck, 
  Filter, 
  SlidersHorizontal,
  Zap,
  Globe
} from 'lucide-react';
import { AdBanner } from './AdBanner';

export const GenreView: React.FC = () => {
  const navigate = useNavigate();
  const { genreName } = useParams<{ genreName?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { 
    comics, 
    selectComic, 
    chapters, 
    toggleBookmark, 
    isBookmarked, 
    selectedGenreFilter, 
    setSelectedGenreFilter,
    currentUser,
    googleUser 
  } = useApp();

  const isUserAuthenticated = !!currentUser || !!googleUser;

  const initialGenre = genreName || searchParams.get('genre') || selectedGenreFilter || 'Netorare';
  const [activeGenre, setActiveGenre] = useState<string>(initialGenre);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'latest'>('popular');
  const [typeFilter, setTypeFilter] = useState<'all' | 'manga' | 'manhwa' | 'manhua' | '18plus'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ongoing' | 'completed'>('all');

  // Sync when route param changes
  useEffect(() => {
    if (genreName) {
      setActiveGenre(genreName);
      setSelectedGenreFilter(genreName);
    }
  }, [genreName, setSelectedGenreFilter]);

  const handleSelectGenre = (genre: string) => {
    setActiveGenre(genre);
    setSelectedGenreFilter(genre);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('genre', genre);
      return next;
    });
  };

  const getComicCategory = (comic: any): 'manga' | 'manhwa' | 'manhua' | '18plus' => {
    if (comic.contentType === '18plus') return '18plus';
    if (comic.comicType === 'manhwa' || comic.type === 'manhwa') return 'manhwa';
    if (comic.comicType === 'manhua' || comic.type === 'manhua') return 'manhua';
    if (comic.comicType === 'manga' || comic.type === 'manga') return 'manga';
    const genreStr = `${comic.title} ${(comic.genres || []).join(' ')}`.toLowerCase();
    if (genreStr.includes('manhwa') || genreStr.includes('korean')) return 'manhwa';
    if (genreStr.includes('manhua') || genreStr.includes('chinese') || genreStr.includes('cultivation')) return 'manhua';
    return 'manga';
  };

  const visibleComics = useMemo(() => {
    return comics.filter(c => c.isVisibleOnHome !== false && c.showOnHome !== false);
  }, [comics]);

  // Filter comics matching active genre
  const filteredComics = useMemo(() => {
    return visibleComics.filter(comic => {
      // Genre matching
      const matchesGenre = activeGenre === 'Semua' || activeGenre === 'All' 
        ? true 
        : comicHasGenre(comic, activeGenre);

      // Type matching
      let matchesType = true;
      if (typeFilter !== 'all') {
        const cat = getComicCategory(comic);
        if (typeFilter === '18plus') {
          matchesType = comic.contentType === '18plus';
        } else {
          matchesType = cat === typeFilter || comic.comicType === typeFilter;
        }
      }

      // Status matching
      const matchesStatus = statusFilter === 'all' || comic.status === statusFilter;

      // Keyword matching
      const matchesKeyword = searchKeyword.trim() === '' || 
        comic.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        (comic.storyWriter && comic.storyWriter.toLowerCase().includes(searchKeyword.toLowerCase())) ||
        comic.genres.some(g => g.toLowerCase().includes(searchKeyword.toLowerCase()));

      return matchesGenre && matchesType && matchesStatus && matchesKeyword;
    }).sort((a, b) => {
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'popular') return (b.totalReaders || 0) - (a.totalReaders || 0);
      return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
    });
  }, [visibleComics, activeGenre, typeFilter, statusFilter, searchKeyword, sortBy]);

  // Compute total comics per genre for count indicators
  const genreCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    PRESET_GENRES.forEach(g => {
      counts[g] = visibleComics.filter(c => comicHasGenre(c, g)).length;
    });
    return counts;
  }, [visibleComics]);

  const handleOpenComic = (comicId: string) => {
    selectComic(comicId);
    const comic = comics.find(c => c.id === comicId);
    navigate(`/comic/${comic?.slug || comicId}`);
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 space-y-6 pb-24 text-slate-100 animate-in fade-in pt-3 sm:pt-4">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#171724] via-[#1b1b2a] to-[#12121a] border border-[#26263a] rounded-3xl p-5 sm:p-7 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#ff5b14]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff5b14]/15 border border-[#ff5b14]/30 text-[#ff7a3d] text-xs font-bold mb-3">
            <Tag className="w-3.5 h-3.5" />
            <span>Katalog & Eksplorasi Genre</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight">
            Cari Komik Berdasarkan <span className="bg-gradient-to-r from-[#ff5b14] to-[#f97316] bg-clip-text text-transparent">Genre Favorit</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1.5 leading-relaxed">
            Pilih tag genre di bawah untuk langsung memfilter komik bertema khusus seperti <strong className="text-amber-400">Netorare</strong>, Romance, Milf, Isekai, Action, dsb.
          </p>
        </div>
      </div>

      {/* Top Horizontal Genre Tags Bar (Berjajar di Atas Halaman) */}
      <section className="bg-[#12121a] border border-[#222232] rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#ff5b14]" />
            <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
              Daftar Tag Genre ({PRESET_GENRES.length} Genre)
            </h2>
          </div>
          {activeGenre && (
            <span className="text-xs text-slate-400">
              Genre Aktif: <strong className="text-[#ff5b14] font-black">{activeGenre}</strong> ({filteredComics.length} Judul)
            </span>
          )}
        </div>

        {/* Scrollable & Wrapping Tag List */}
        <div className="flex flex-wrap gap-2 max-h-48 sm:max-h-60 overflow-y-auto pr-1 pb-1 custom-scrollbar">
          {/* Semua / All option */}
          <button
            onClick={() => handleSelectGenre('Semua')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeGenre === 'Semua' || activeGenre === 'All'
                ? 'bg-gradient-to-r from-[#ff5b14] to-[#f97316] text-white shadow-lg shadow-[#ff5b14]/30 scale-105'
                : 'bg-[#181824] hover:bg-[#202030] text-slate-300 border border-[#28283c]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Semua Genre</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-semibold">
              {visibleComics.length}
            </span>
          </button>

          {PRESET_GENRES.map((genre) => {
            const isSelected = activeGenre.toLowerCase() === genre.toLowerCase();
            const count = genreCounts[genre] || 0;
            const isNetorare = genre.toLowerCase().includes('netorare');
            const isSpecial = isNetorare || genre.toLowerCase().includes('milf') || genre.toLowerCase().includes('romance');

            return (
              <button
                key={genre}
                onClick={() => handleSelectGenre(genre)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#ff5b14] to-[#f97316] text-white shadow-lg shadow-[#ff5b14]/30 scale-105 ring-1 ring-white/30 font-bold'
                    : isSpecial
                      ? 'bg-[#1c1c28] hover:bg-[#242436] text-amber-300 border border-amber-500/30'
                      : 'bg-[#181824] hover:bg-[#202030] text-slate-300 border border-[#28283c]'
                }`}
              >
                <span>{genre}</span>
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                    isSelected ? 'bg-black/30 text-white' : 'bg-black/40 text-slate-400'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Ad Banner: Bawah Tag Genre */}
      <AdBanner position="home_between_sections" className="my-1" />

      {/* Filter and Search Bar for Genre Results */}
      <section className="bg-[#12121a] border border-[#222232] rounded-2xl p-4 space-y-3 shadow-md">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Quick Keyword in this Genre */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder={`Cari judul dalam genre "${activeGenre}"...`}
              className="w-full pl-9 pr-4 py-2 bg-[#171722] border border-[#262638] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14] transition-colors"
            />
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
          </div>

          {/* Type filters & Sorting */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Comic Type Filter */}
            <div className="flex items-center gap-1 bg-[#171722] p-1 rounded-xl border border-[#262638]">
              {[
                { id: 'all', label: 'Semua Tipe' },
                { id: 'manhwa', label: '🇰🇷 Manhwa' },
                { id: 'manga', label: '🇯🇵 Manga' },
                { id: 'manhua', label: '🇨🇳 Manhua' },
                { id: '18plus', label: '🔞 18+' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTypeFilter(t.id as any)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    typeFilter === t.id
                      ? 'bg-[#ff5b14] text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#171722] border border-[#262638] text-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#ff5b14] cursor-pointer"
            >
              <option value="popular">🔥 Terpopuler</option>
              <option value="rating">⭐ Rating Tertinggi</option>
              <option value="latest">⏱️ Baru Diperbarui</option>
            </select>
          </div>
        </div>
      </section>

      {/* Results Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#ff5b14]" />
            Hasil Komik Bertag: <span className="text-[#ff5b14]">"{activeGenre}"</span>
          </h2>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#1c1c28] text-slate-300 font-bold border border-[#2a2a3c]">
            {filteredComics.length} Judul
          </span>
        </div>
      </div>

      {/* Comic Grid (Directly beneath the genre tags) */}
      {filteredComics.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-4.5">
          {filteredComics.map((comic) => {
            const bookmarked = isBookmarked(comic.id);
            const comicChaptersList = chapters[comic.id] || [];
            const latestChapter = comicChaptersList[0];
            const category = getComicCategory(comic);

            return (
              <div
                key={comic.id}
                onClick={() => handleOpenComic(comic.id)}
                className="group relative bg-[#12121a] hover:bg-[#161622] rounded-2xl overflow-hidden border border-[#222232] hover:border-[#ff5b14]/60 hover:shadow-xl hover:shadow-[#ff5b14]/10 transition-all duration-300 cursor-pointer flex flex-col justify-between"
              >
                {/* Thumbnail Cover Area */}
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#181824]">
                  <img 
                    src={comic.coverImage} 
                    alt={comic.title}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    style={{ filter: !isUserAuthenticated ? 'blur(10px)' : 'none' }}
                    className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
                      !isUserAuthenticated ? 'scale-110' : ''
                    }`} 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d12] via-transparent to-transparent opacity-80" />

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                    {/* Comic Type / Category Badge */}
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow ${
                      category === '18plus' ? 'bg-rose-600/90 text-white' :
                      category === 'manhwa' ? 'bg-emerald-600/90 text-white' :
                      category === 'manga' ? 'bg-indigo-600/90 text-white' :
                      'bg-amber-600/90 text-white'
                    }`}>
                      {category === '18plus' ? '18+ VIP' : category}
                    </span>

                    {/* Bookmark Quick Action Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark(comic.id);
                      }}
                      aria-label="Simpan ke Koleksi"
                      className={`p-1.5 rounded-lg backdrop-blur-md transition-transform active:scale-90 pointer-events-auto cursor-pointer ${
                        bookmarked 
                          ? 'bg-[#ff5b14] text-white shadow-md shadow-[#ff5b14]/40' 
                          : 'bg-black/60 text-slate-300 hover:text-white hover:bg-black/80'
                      }`}
                    >
                      {bookmarked ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Bottom Stats Overlay inside Thumbnail */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-slate-200">
                    <span className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-md font-bold text-amber-400">
                      <Star className="w-3 h-3 fill-amber-400" />
                      {comic.rating ? comic.rating.toFixed(1) : '4.8'}
                    </span>
                    <span className="bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-md font-medium text-slate-300">
                      {latestChapter ? `Ch. ${latestChapter.chapterNumber}` : `${comic.totalChapters || 1} Ch.`}
                    </span>
                  </div>
                </div>

                {/* Comic Card Content */}
                <div className="p-3 flex flex-col flex-1 justify-between">
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-white line-clamp-1 group-hover:text-[#ff5b14] transition-colors leading-snug">
                      {comic.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 truncate mt-1">
                      {comic.storyWriter || comic.artist || comic.author || 'AntiTimpa Studio'}
                    </p>
                  </div>

                  {/* Genre Tags inside Card */}
                  <div className="mt-2 pt-2 border-t border-[#1f1f2e] flex flex-wrap gap-1">
                    {comic.genres.slice(0, 2).map((g, idx) => (
                      <span 
                        key={idx} 
                        className={`text-[9px] px-1.5 py-0.2 rounded font-semibold truncate max-w-[85px] ${
                          g.toLowerCase() === activeGenre.toLowerCase()
                            ? 'bg-[#ff5b14]/20 text-[#ff7a3d] border border-[#ff5b14]/40 font-bold'
                            : 'bg-[#181824] text-slate-400'
                        }`}
                      >
                        {g}
                      </span>
                    ))}
                    {comic.genres.length > 2 && (
                      <span className="text-[9px] text-slate-500 font-medium">
                        +{comic.genres.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="py-16 text-center bg-[#12121a] rounded-3xl border border-[#222232] p-8 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#1f1f2e] text-slate-400 flex items-center justify-center mx-auto text-2xl">
            🏷️
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Belum Ada Komik untuk Genre "{activeGenre}"</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Coba pilih genre lain di atas atau reset filter pencarian tipe komik untuk melihat koleksi lainnya.
            </p>
          </div>
          <button
            onClick={() => handleSelectGenre('Semua')}
            className="px-5 py-2 rounded-xl bg-[#ff5b14] hover:bg-[#e04e0e] text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-[#ff5b14]/20"
          >
            Lihat Semua Genre
          </button>
        </div>
      )}
    </div>
  );
};
