import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { PRESET_GENRES, comicHasGenre } from '../../data/genres';
import { 
  Star, 
  Flame, 
  Bookmark, 
  BookmarkCheck, 
  ChevronRight, 
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Play, 
  Sparkles, 
  Clock, 
  Search,
  Zap,
  Globe,
  Layers,
  X,
  BookOpen,
  TrendingUp,
  Award,
  Filter
} from 'lucide-react';
import { ComicCategoryType } from '../../types';
import { AdBanner } from './AdBanner';

const ITEMS_PER_PAGE = 24;

export const HomeView: React.FC = () => {
  const navigate = useNavigate();
  const { 
    comics, 
    banners, 
    selectComic, 
    toggleBookmark, 
    isBookmarked,
    chapters,
    setActiveTab,
    triggerPopunder
  } = useApp();

  const handleOpenComic = (comicId: string) => {
    selectComic(comicId);
    const comic = comics.find(c => c.id === comicId);
    navigate(`/comic/${comic?.slug || comicId}`);
  };

  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [selectedTypeTab, setSelectedTypeTab] = useState<'all' | 'manga' | 'manhwa' | 'manhua' | '18plus'>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ongoing' | 'completed'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showJumpModal, setShowJumpModal] = useState<boolean>(false);
  const [jumpPageInput, setJumpPageInput] = useState<string>('1');

  const catalogSectionRef = useRef<HTMLDivElement>(null);

  const genresList = ['All', ...PRESET_GENRES];
  const activeBanners = banners.filter(b => 
    b.isActive && (!b.targetComicId || comics.some(c => c.id === b.targetComicId && c.isVisibleOnHome !== false && c.showOnHome !== false))
  );

  // Auto slide banner every 5s
  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex(prev => (prev + 1) % activeBanners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeBanners.length]);

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTypeTab, selectedGenre, searchQuery, statusFilter]);

  // Helper to determine the actual category of a comic
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

  // Filtered and Sorted Comics (Strictly respects admin visibility isVisibleOnHome !== false)
  const visibleComics = [...comics].filter(c => c.isVisibleOnHome !== false && c.showOnHome !== false);

  // Counts for quick stats
  const totalCount = visibleComics.length;
  const mangaCount = visibleComics.filter(c => getComicCategory(c) === 'manga').length;
  const manhwaCount = visibleComics.filter(c => getComicCategory(c) === 'manhwa').length;
  const manhuaCount = visibleComics.filter(c => getComicCategory(c) === 'manhua').length;
  const adultCount = visibleComics.filter(c => c.contentType === '18plus').length;

  // Trending comics for sidebar widget (sorted by totalReaders or rating)
  const trendingComics = [...visibleComics]
    .sort((a, b) => (b.totalReaders || 0) - (a.totalReaders || 0))
    .slice(0, 4);

  const filteredComics = visibleComics
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    })
    .filter(comic => {
      // 1. Filter by Comic Type (Manga, Manhwa, Manhua, 18+ VIP)
      if (selectedTypeTab !== 'all') {
        const cat = getComicCategory(comic);
        if (selectedTypeTab === '18plus') {
          if (comic.contentType !== '18plus') return false;
        } else {
          if (cat !== selectedTypeTab) return false;
        }
      }

      // 2. Filter by Genre
      const matchesGenre = comicHasGenre(comic, selectedGenre);

      // 3. Search Filter
      const matchesSearch = comic.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (comic.storyWriter && comic.storyWriter.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            comic.genres.some(g => g.toLowerCase().includes(searchQuery.toLowerCase()));

      // 4. Status Filter
      const matchesStatus = statusFilter === 'all' || comic.status === statusFilter;

      return matchesGenre && matchesSearch && matchesStatus;
    });

  const currentBanner = activeBanners[currentBannerIndex] || activeBanners[0];
  const totalPages = Math.max(1, Math.ceil(filteredComics.length / ITEMS_PER_PAGE));

  return (
    <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 space-y-6 pb-24 text-slate-100 animate-in fade-in pt-3 sm:pt-4">
      
      {/* 1. Hero & Trending Bento Grid for Desktop & Mobile */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Main Hero Banner (8 cols on lg) */}
        {currentBanner && (
          <div className="lg:col-span-8 rounded-2xl overflow-hidden shadow-2xl border border-[#222232] bg-[#111118] relative group">
            <div className="relative h-64 sm:h-80 md:h-96 w-full overflow-hidden">
              <img 
                src={currentBanner.imageUrl} 
                alt={currentBanner.title}
                className="w-full h-full object-cover object-center filter brightness-90 group-hover:scale-105 transition-transform duration-700" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#09090d] via-[#09090d]/70 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#09090d]/90 via-[#09090d]/30 to-transparent hidden sm:block" />

              {/* Banner Content Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8 flex flex-col justify-end">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-[#ff5b14] to-[#f97316] text-white tracking-wider uppercase shadow-md shadow-[#ff5b14]/30 flex items-center gap-1">
                    <Flame className="w-3 h-3" />
                    {currentBanner.badgeText || 'REKOMENDASI UTAMA'}
                  </span>
                  <span className="text-xs text-slate-200 font-bold flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    4.9
                  </span>
                </div>

                <h2 className="font-black text-xl sm:text-2xl md:text-3xl text-white tracking-tight leading-tight line-clamp-1">
                  {currentBanner.title}
                </h2>

                <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 max-w-xl mt-1.5 mb-4 leading-relaxed">
                  {currentBanner.subtitle}
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleOpenComic(currentBanner.targetComicId)}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ff5b14] to-[#f97316] hover:opacity-95 active:scale-95 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-xl shadow-[#ff5b14]/30 transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Baca Sekarang</span>
                  </button>

                  <button
                    onClick={() => handleOpenComic(currentBanner.targetComicId)}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs sm:text-sm font-bold backdrop-blur-md border border-white/10 transition-all cursor-pointer"
                  >
                    Detail Komik
                  </button>
                </div>
              </div>

              {/* Carousel Dots */}
              {activeBanners.length > 1 && (
                <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-white/10 z-10">
                  {activeBanners.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentBannerIndex(idx)}
                      aria-label={`Banner ${idx + 1}`}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        idx === currentBannerIndex 
                          ? 'w-6 bg-[#ff5b14]' 
                          : 'w-2 bg-white/40 hover:bg-white/70'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Desktop Sidebar: Trending & Top Rank (4 cols on lg, structured like Admin overview) */}
        <div className="lg:col-span-4 bg-[#12121a] rounded-2xl border border-[#222232] p-4 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#1f1f2e] mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#ff5b14]/15 border border-[#ff5b14]/30 flex items-center justify-center text-[#ff5b14]">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="font-black text-sm text-white tracking-tight">
                  Komik Paling Populer
                </h3>
              </div>
              <button
                onClick={() => navigate('/discover')}
                className="text-[11px] font-bold text-[#ff5b14] hover:text-[#ff7a3d] flex items-center gap-0.5 cursor-pointer"
              >
                <span>Semua</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* List of Trending items */}
            <div className="space-y-2.5">
              {trendingComics.map((comic, index) => {
                const comicChaptersList = chapters[comic.id] || [];
                const latestChapter = comicChaptersList[0];
                const rankColor = 
                  index === 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                  index === 1 ? 'bg-slate-300/20 text-slate-200 border-slate-300/40' :
                  index === 2 ? 'bg-amber-700/20 text-amber-500 border-amber-700/40' :
                  'bg-slate-800 text-slate-400 border-slate-700';

                return (
                  <div
                    key={comic.id}
                    onClick={() => handleOpenComic(comic.id)}
                    className="p-2 rounded-xl bg-[#171722] hover:bg-[#1d1d2b] border border-[#232334] hover:border-[#ff5b14]/40 transition-all flex items-center gap-3 cursor-pointer group"
                  >
                    {/* Rank Badge */}
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs border shrink-0 ${rankColor}`}>
                      {index + 1}
                    </div>

                    {/* Thumbnail */}
                    <div className="w-10 h-13 rounded-lg overflow-hidden shrink-0 bg-[#222232] border border-[#2a2a3c]">
                      <img 
                        src={comic.coverImage} 
                        alt={comic.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs text-white truncate group-hover:text-[#ff5b14] transition-colors">
                        {comic.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {comic.genres.slice(0, 2).join(', ')}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px]">
                        <span className="text-amber-400 font-bold flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-amber-400" />
                          {comic.rating ? comic.rating.toFixed(1) : '4.8'}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400 font-medium">
                          {latestChapter ? `Ch. ${latestChapter.chapterNumber}` : `${comic.totalChapters || 10} Ch.`}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-[#ff5b14] group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#1f1f2e] text-center">
            <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              Diperbarui otomatis berdasarkan pembaca aktif
            </span>
          </div>
        </div>
      </section>

      {/* Ad Banner: Bawah Carousel Hero */}
      <AdBanner position="home_hero_bottom" className="my-1" />

      {/* 2. Quick Metrics / Category Ribbon (like Admin Stats Cards) */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
        {/* Total Catalog */}
        <button
          onClick={() => {
            setSelectedTypeTab('all');
            catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
            selectedTypeTab === 'all'
              ? 'bg-gradient-to-br from-[#ff5b14]/20 to-[#ff5b14]/5 border-[#ff5b14]/50 ring-1 ring-[#ff5b14]/30'
              : 'bg-[#12121a] hover:bg-[#181824] border-[#222232]'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-[#ff5b14]/15 border border-[#ff5b14]/30 flex items-center justify-center text-[#ff5b14] shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-slate-400 truncate">Semua Komik</div>
            <div className="text-base font-black text-white">{totalCount} <span className="text-[10px] text-slate-400 font-normal">Judul</span></div>
          </div>
        </button>

        {/* Manga */}
        <button
          onClick={() => {
            setSelectedTypeTab('manga');
            catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
            selectedTypeTab === 'manga'
              ? 'bg-indigo-950/40 border-indigo-500/50 ring-1 ring-indigo-500/30'
              : 'bg-[#12121a] hover:bg-[#181824] border-[#222232]'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-slate-400 truncate">🇯🇵 Manga Jepang</div>
            <div className="text-base font-black text-white">{mangaCount} <span className="text-[10px] text-slate-400 font-normal">Judul</span></div>
          </div>
        </button>

        {/* Manhwa */}
        <button
          onClick={() => {
            setSelectedTypeTab('manhwa');
            catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
            selectedTypeTab === 'manhwa'
              ? 'bg-emerald-950/40 border-emerald-500/50 ring-1 ring-emerald-500/30'
              : 'bg-[#12121a] hover:bg-[#181824] border-[#222232]'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-slate-400 truncate">🇰🇷 Manhwa Korea</div>
            <div className="text-base font-black text-white">{manhwaCount} <span className="text-[10px] text-slate-400 font-normal">Judul</span></div>
          </div>
        </button>

        {/* Manhua */}
        <button
          onClick={() => {
            setSelectedTypeTab('manhua');
            catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
            selectedTypeTab === 'manhua'
              ? 'bg-amber-950/40 border-amber-500/50 ring-1 ring-amber-500/30'
              : 'bg-[#12121a] hover:bg-[#181824] border-[#222232]'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-slate-400 truncate">🇨🇳 Manhua China</div>
            <div className="text-base font-black text-white">{manhuaCount} <span className="text-[10px] text-slate-400 font-normal">Judul</span></div>
          </div>
        </button>

        {/* 18+ VIP */}
        <button
          onClick={() => {
            setSelectedTypeTab('18plus');
            catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className={`col-span-2 sm:col-span-1 p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
            selectedTypeTab === '18plus'
              ? 'bg-rose-950/40 border-rose-500/50 ring-1 ring-rose-500/30'
              : 'bg-[#12121a] hover:bg-[#181824] border-[#222232]'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-slate-400 truncate">🔞 18+ VIP Dewasa</div>
            <div className="text-base font-black text-white">{adultCount} <span className="text-[10px] text-slate-400 font-normal">Judul</span></div>
          </div>
        </button>
      </section>

      {/* Ad Banner: Antara Kategori dan Pencarian */}
      <AdBanner position="home_between_sections" className="my-1" />

      {/* 3. Search & Filter Bar */}
      <section className="bg-[#12121a] rounded-2xl border border-[#222232] p-4 sm:p-5 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul komik, author, atau genre favoritmu..."
              className="w-full pl-10 pr-10 py-2.5 bg-[#171722] border border-[#262638] rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#ff5b14] transition-colors"
            />
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-2.5 p-0.5 text-slate-400 hover:text-white rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Toggle Buttons */}
          <div className="flex items-center gap-1 bg-[#171722] p-1 rounded-xl border border-[#262638] shrink-0 self-start md:self-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-[#ff5b14] text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Semua Status
            </button>
            <button
              onClick={() => setStatusFilter('ongoing')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'ongoing'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ongoing
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'completed'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tamat
            </button>
          </div>
        </div>

        {/* Primary Type Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setSelectedTypeTab('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black tracking-wide transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              selectedTypeTab === 'all'
                ? 'bg-gradient-to-r from-[#ff5b14] to-[#f97316] text-white shadow-md shadow-[#ff5b14]/25'
                : 'bg-[#171722] text-slate-400 hover:text-slate-200 border border-[#262638]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Semua Katalog</span>
          </button>

          <button
            onClick={() => setSelectedTypeTab('manga')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black tracking-wide transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              selectedTypeTab === 'manga'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-[#171722] text-slate-400 hover:text-slate-200 border border-[#262638]'
            }`}
          >
            <span>🇯🇵 Manga (Jepang)</span>
          </button>

          <button
            onClick={() => setSelectedTypeTab('manhwa')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black tracking-wide transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              selectedTypeTab === 'manhwa'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-[#171722] text-slate-400 hover:text-slate-200 border border-[#262638]'
            }`}
          >
            <span>🇰🇷 Manhwa (Korea)</span>
          </button>

          <button
            onClick={() => setSelectedTypeTab('manhua')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black tracking-wide transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              selectedTypeTab === 'manhua'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'bg-[#171722] text-slate-400 hover:text-slate-200 border border-[#262638]'
            }`}
          >
            <span>🇨🇳 Manhua (China)</span>
          </button>

          <button
            onClick={() => setSelectedTypeTab('18plus')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black tracking-wide transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              selectedTypeTab === '18plus'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'bg-[#171722] text-slate-400 hover:text-slate-200 border border-[#262638]'
            }`}
          >
            <span>🔞 18+ VIP Dewasa</span>
          </button>
        </div>

        {/* Genre Pill Carousel */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-[#1f1f2e] text-xs">
          {genresList.map(genre => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-3 py-1 rounded-full font-semibold whitespace-nowrap transition-all text-[11px] cursor-pointer ${
                selectedGenre === genre
                  ? 'bg-white/20 text-white border border-white/40 shadow-sm'
                  : 'bg-[#171722] text-slate-400 hover:text-slate-200 border border-[#242434]'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </section>

      {/* 4. Comics Catalog Grid */}
      <section ref={catalogSectionRef} className="space-y-4 scroll-mt-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-black text-base sm:text-lg text-white tracking-tight flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#ff5b14]" />
              {selectedTypeTab === 'all' && 'Katalog Komik Terbaru'}
              {selectedTypeTab === 'manga' && '🇯🇵 Koleksi Manga Jepang'}
              {selectedTypeTab === 'manhwa' && '🇰🇷 Koleksi Manhwa Korea'}
              {selectedTypeTab === 'manhua' && '🇨🇳 Koleksi Manhua China'}
              {selectedTypeTab === '18plus' && '🔞 Komik Dewasa 18+ VIP'}
            </h3>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#1c1c28] text-slate-300 font-bold border border-[#2a2a3c]">
              {filteredComics.length} Judul
            </span>
          </div>

          <div className="text-xs text-slate-400 hidden sm:block">
            Halaman {currentPage} dari {totalPages}
          </div>
        </div>

        {/* Responsive Desktop & Mobile Grid: 2 cols on mobile -> 3 sm -> 4 md -> 5 lg -> 6 xl */}
        {filteredComics.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-4.5">
              {filteredComics
                .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                .map((comic) => {
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
                          className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-500" 
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=800&auto=format&fit=crop';
                          }}
                        />
                        
                        {/* Top Badges (Category & Status) */}
                        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                          {/* Comic Category Tag Badge */}
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shadow backdrop-blur-md border ${
                            category === 'manga'
                              ? 'bg-indigo-600/90 text-white border-indigo-400/40'
                              : category === 'manhwa'
                                ? 'bg-emerald-600/90 text-white border-emerald-400/40'
                                : category === 'manhua'
                                  ? 'bg-amber-600/90 text-white border-amber-400/40'
                                  : 'bg-rose-600/90 text-white border-rose-400/40'
                          }`}>
                            {category === 'manga' && '🇯🇵 Manga'}
                            {category === 'manhwa' && '🇰🇷 Manhwa'}
                            {category === 'manhua' && '🇨🇳 Manhua'}
                            {category === '18plus' && '🔞 18+ VIP'}
                          </span>

                          {/* Content Type Badge */}
                          {comic.contentType === '18plus' ? (
                            <span className="px-1.5 py-0.5 rounded-md bg-rose-950/90 text-rose-300 border border-rose-500/40 text-[8px] font-black uppercase tracking-wider">
                              VIP
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 text-[8px] font-black uppercase tracking-wider">
                              GRATIS
                            </span>
                          )}
                        </div>

                        {/* Bookmark Toggle on Card */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBookmark(comic.id);
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-white hover:text-[#ff5b14] transition-colors z-10 cursor-pointer"
                          title={bookmarked ? 'Hapus Bookmark' : 'Tambah Bookmark'}
                        >
                          {bookmarked ? (
                            <BookmarkCheck className="w-3.5 h-3.5 text-[#ff5b14] fill-[#ff5b14]" />
                          ) : (
                            <Bookmark className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Rating Pill overlay */}
                        <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-sm text-[10px] font-bold text-amber-300 flex items-center gap-1 z-10 border border-white/10">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {comic.rating ? comic.rating.toFixed(1) : '4.8'}
                        </div>
                      </div>

                      {/* Comic Metadata Info */}
                      <div className="p-3 flex flex-col justify-between flex-1">
                        <div>
                          <h4 className="font-bold text-xs sm:text-sm text-white line-clamp-1 group-hover:text-[#ff5b14] transition-colors" title={comic.title}>
                            {comic.title}
                          </h4>
                          <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                            {comic.genres.slice(0, 2).join(' • ')}
                          </p>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-[#1f1f2e] flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3 text-[#ff5b14]" />
                            {latestChapter ? `Ch. ${latestChapter.chapterNumber}` : `${comic.totalChapters || 10} Ch.`}
                          </span>
                          <span className="text-[#ff5b14] font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                            Baca <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Pagination Controls & Navigation Bar */}
            {filteredComics.length > 0 && (
              <div className="mt-8 pt-5 border-t border-[#222232] flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Info Text */}
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span>
                    Menampilkan <strong className="text-white">{(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredComics.length)}</strong> dari <strong className="text-[#ff5b14]">{filteredComics.length}</strong> komik
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-[#1c1c28] text-slate-300 font-bold text-[11px] border border-[#2a2a3c]">
                    Halaman {currentPage} / {totalPages}
                  </span>
                </div>

                {/* Page Navigation Controls */}
                <div className="flex items-center gap-1.5 flex-wrap justify-center">
                  {/* First Page Button */}
                  {currentPage > 2 && (
                    <button
                      onClick={() => {
                        setCurrentPage(1);
                        catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="p-2 rounded-xl bg-[#14141e] hover:bg-[#20202e] text-slate-300 hover:text-white border border-[#252538] transition-all cursor-pointer"
                      title="Halaman Pertama"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>
                  )}

                  {/* Previous Button */}
                  <button
                    disabled={currentPage === 1}
                    onClick={() => {
                      if (currentPage > 1) {
                        setCurrentPage(prev => prev - 1);
                        catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                      currentPage === 1
                        ? 'bg-[#101017] text-slate-600 border border-[#1b1b26] cursor-not-allowed'
                        : 'bg-[#181824] hover:bg-[#222232] text-slate-200 border border-[#2a2a3e] cursor-pointer active:scale-95'
                    }`}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Sebelumnya</span>
                  </button>

                  {/* Numbered Page Buttons */}
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                    .filter(page => {
                      if (totalPages <= 5) return true;
                      return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                    })
                    .map((page, idx, arr) => {
                      const prev = arr[idx - 1];
                      const isGap = prev && page - prev > 1;
                      const isActive = page === currentPage;

                      return (
                        <React.Fragment key={page}>
                          {isGap && <span className="px-1 text-slate-600">...</span>}
                          <button
                            onClick={() => {
                              setCurrentPage(page);
                              catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            className={`min-w-8 h-8 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isActive
                                ? 'bg-[#ff5b14] text-white shadow-md shadow-[#ff5b14]/30 scale-105'
                                : 'bg-[#14141e] hover:bg-[#20202e] text-slate-300 border border-[#222234]'
                            }`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      );
                    })}

                  {/* Next Button */}
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => {
                      if (currentPage < totalPages) {
                        setCurrentPage(prev => prev + 1);
                        catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                      currentPage >= totalPages
                        ? 'bg-[#101017] text-slate-600 border border-[#1b1b26] cursor-not-allowed'
                        : 'bg-[#181824] hover:bg-[#222232] text-slate-200 border border-[#2a2a3e] cursor-pointer active:scale-95'
                    }`}
                  >
                    <span>Selanjutnya</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Last Page Button */}
                  {currentPage < totalPages - 1 && (
                    <button
                      onClick={() => {
                        setCurrentPage(totalPages);
                        catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="p-2 rounded-xl bg-[#14141e] hover:bg-[#20202e] text-slate-300 hover:text-white border border-[#252538] transition-all cursor-pointer"
                      title="Halaman Terakhir"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  )}

                  {/* Modal Trigger for Page Jump */}
                  {totalPages > 1 && (
                    <button
                      onClick={() => {
                        setJumpPageInput(String(currentPage));
                        setShowJumpModal(true);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-[#1a1a26] hover:bg-[#252538] text-slate-300 border border-[#2c2c40] text-xs font-semibold flex items-center gap-1 ml-1 cursor-pointer"
                      title="Lompat ke Halaman Tertentu"
                    >
                      <Layers className="w-3.5 h-3.5 text-[#ff5b14]" />
                      <span className="hidden sm:inline">Lompat</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-12 text-center bg-[#12121a] rounded-2xl border border-[#222232] space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#ff5b14]/10 border border-[#ff5b14]/20 flex items-center justify-center text-[#ff5b14] mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-base font-bold text-white">Tidak ada komik yang sesuai filter</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Coba gunakan kata kunci lain atau klik tombol reset filter untuk melihat seluruh katalog.
            </p>
            <button
              onClick={() => {
                setSelectedTypeTab('all');
                setSelectedGenre('All');
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="px-4 py-2 rounded-xl bg-[#ff5b14] text-white text-xs font-bold shadow-md shadow-[#ff5b14]/20 cursor-pointer"
            >
              Reset Semua Filter
            </button>
          </div>
        )}
      </section>

      {/* Ad Banner: Footer Beranda */}
      <AdBanner position="home_footer" className="mt-6 mb-2" />

      {/* Modal Lompat Halaman (Page Jump Modal) */}
      {showJumpModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowJumpModal(false)}
        >
          <div 
            className="w-full max-w-sm bg-[#13131b] border border-[#27273a] rounded-2xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-slate-100"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#222232]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#ff5b14]/15 border border-[#ff5b14]/30 flex items-center justify-center text-[#ff5b14]">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Lompat ke Halaman</h3>
                  <p className="text-[11px] text-slate-400">Total {totalPages} Halaman Komik</p>
                </div>
              </div>
              <button 
                onClick={() => setShowJumpModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const target = parseInt(jumpPageInput, 10);
                if (!isNaN(target) && target >= 1 && target <= totalPages) {
                  setCurrentPage(target);
                  setShowJumpModal(false);
                  catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Masukkan Nomor Halaman (1 - {totalPages}):
                </label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number"
                    min={1}
                    max={totalPages}
                    value={jumpPageInput}
                    onChange={(e) => setJumpPageInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#1a1a26] border border-[#2e2e42] text-white font-bold text-center text-base focus:border-[#ff5b14] outline-none"
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick Jump Buttons */}
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                {Array.from({ length: Math.min(6, totalPages) }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setJumpPageInput(String(num))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      jumpPageInput === String(num)
                        ? 'bg-[#ff5b14] text-white border-[#ff5b14]'
                        : 'bg-[#181824] text-slate-300 border-[#262638] hover:bg-[#222234]'
                    }`}
                  >
                    Hal {num}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJumpModal(false)}
                  className="w-1/2 py-2.5 bg-[#1b1b26] hover:bg-[#222232] text-slate-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-[#ff5b14] hover:bg-[#e04e0e] text-white font-bold rounded-xl text-xs shadow-lg shadow-[#ff5b14]/30 transition-all cursor-pointer"
                >
                  Buka Halaman
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeView;
