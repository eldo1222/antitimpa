import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
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
  Zap, 
  Tag,
  BookOpen, 
  TrendingUp, 
  Award,
  Layers,
  X,
  Lock,
  Clock,
  Unlock
} from 'lucide-react';
import { AdBanner } from './AdBanner';
import { Chapter, Comic } from '../../types';
import { isComic18Plus, shouldBlurComic } from '../../utils/comicUtils';

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
    currentUser,
    googleUser,
    openLoginModal,
    startReading,
    setSelectedGenreFilter
  } = useApp();

  const isUserAuthenticated = !!currentUser || !!googleUser;

  const handleOpenComic = (comicId: string) => {
    const comic = comics.find(c => c.id === comicId);
    if (comic && shouldBlurComic(comic, isUserAuthenticated)) {
      openLoginModal('🔒 Komik ini berkategori 18+. Silakan masuk / login untuk membuka sensor gambar dan membaca.');
      return;
    }
    selectComic(comicId);
    navigate(`/comic/${comic?.slug || comicId}`);
  };

  const handleReadChapter = (comicId: string, chapterId: string) => {
    const comic = comics.find(c => c.id === comicId);
    if (comic && shouldBlurComic(comic, isUserAuthenticated)) {
      openLoginModal('🔒 Komik ini berkategori 18+. Silakan masuk / login untuk membuka sensor gambar dan membaca.');
      return;
    }
    selectComic(comicId);
    const success = startReading(chapterId);
    if (success) {
      navigate(`/read/${comicId}/${chapterId}`);
    }
  };

  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | 'ongoing' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'rating'>('latest');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showJumpModal, setShowJumpModal] = useState<boolean>(false);
  const [jumpPageInput, setJumpPageInput] = useState<string>('1');

  const catalogSectionRef = useRef<HTMLDivElement>(null);

  // Helper to determine category
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

  // Strictly deduplicate comics by normalized title and ID so no duplicates ever appear
  const uniqueVisibleComics = useMemo(() => {
    const seenTitles = new Set<string>();
    const result: Comic[] = [];

    for (const c of comics) {
      if (c.isVisibleOnHome === false || c.showOnHome === false) continue;
      const normalizedTitle = (c.title || '').trim().toLowerCase();
      if (!seenTitles.has(normalizedTitle)) {
        seenTitles.add(normalizedTitle);
        result.push(c);
      }
    }
    return result;
  }, [comics]);

  // Active hero banners from DB / AppContext with fallback support for both targetComicId and linkComicId
  const activeBanners = banners.filter(b => {
    if (!b.isActive) return false;
    const targetId = b.targetComicId || b.linkComicId;
    if (!targetId) return true;
    return uniqueVisibleComics.some(c => c.id === targetId);
  });

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
  }, [statusFilter, sortBy]);

  // Trending / Popular comics sorted by readers/views
  const popularComics = useMemo(() => {
    return [...uniqueVisibleComics]
      .sort((a, b) => (b.totalReaders || 0) - (a.totalReaders || 0))
      .slice(0, 6);
  }, [uniqueVisibleComics]);

  // Filtered and Sorted catalog
  const filteredComics = useMemo(() => {
    return [...uniqueVisibleComics]
      .filter(comic => {
        if (statusFilter === 'all') return true;
        return comic.status === statusFilter;
      })
      .sort((a, b) => {
        if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
        if (sortBy === 'popular') return (b.totalReaders || 0) - (a.totalReaders || 0);
        const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return dateB - dateA;
      });
  }, [uniqueVisibleComics, statusFilter, sortBy]);

  const currentBanner = activeBanners[currentBannerIndex] || activeBanners[0];
  const bannerTargetComicId = currentBanner ? (currentBanner.targetComicId || currentBanner.linkComicId) : undefined;
  const bannerTargetComic = bannerTargetComicId ? comics.find(c => c.id === bannerTargetComicId) : null;
  const isBannerBlurred = shouldBlurComic(bannerTargetComic, isUserAuthenticated);
  const totalPages = Math.max(1, Math.ceil(filteredComics.length / ITEMS_PER_PAGE));

  return (
    <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 space-y-6 pb-24 text-slate-100 animate-in fade-in pt-3 sm:pt-4">
      
      {/* 1. DESKTOP BENTO GRID (Hero Banner 8 cols + Populer Sidebar 4 cols) & MOBILE HERO BANNER */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Main Hero Banner */}
        {currentBanner && (
          <div className="lg:col-span-8 rounded-2xl overflow-hidden shadow-2xl border border-[#222232] bg-[#111118] relative group">
            <div className="relative h-64 sm:h-80 md:h-96 w-full overflow-hidden">
              <img 
                src={currentBanner.imageUrl} 
                alt={currentBanner.title}
                referrerPolicy="no-referrer"
                style={{ filter: isBannerBlurred ? 'blur(14px)' : 'none' }}
                className={`w-full h-full object-cover object-center filter brightness-90 group-hover:scale-105 transition-transform duration-700 ${
                  isBannerBlurred ? 'scale-110 brightness-75' : ''
                }`} 
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
                  {isBannerBlurred && (
                    <span className="text-[10px] text-amber-300 font-semibold bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-400" />
                      18+ Sensor (Login untuk buka)
                    </span>
                  )}
                </div>

                <h2 className="font-black text-xl sm:text-2xl md:text-3xl text-white tracking-tight leading-tight line-clamp-1">
                  {currentBanner.title}
                </h2>

                <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 max-w-xl mt-1.5 mb-4 leading-relaxed">
                  {currentBanner.subtitle}
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (bannerTargetComicId) {
                        handleOpenComic(bannerTargetComicId);
                      }
                    }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ff5b14] to-[#f97316] hover:opacity-95 active:scale-95 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-xl shadow-[#ff5b14]/30 transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Baca Sekarang</span>
                  </button>

                  <button
                    onClick={() => {
                      if (bannerTargetComicId) {
                        handleOpenComic(bannerTargetComicId);
                      }
                    }}
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

        {/* Desktop Sidebar: Trending & Top Rank (Visible on Desktop lg) */}
        <div className="hidden lg:flex lg:col-span-4 bg-[#12121a] rounded-2xl border border-[#222232] p-4 flex-col justify-between shadow-xl">
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

            {/* List of Trending items on Desktop */}
            <div className="space-y-2.5">
              {popularComics.slice(0, 4).map((comic, index) => {
                const comicChaptersList = chapters[comic.id] || [];
                const latestChapter = comicChaptersList[0];
                const isItemBlurred = shouldBlurComic(comic, isUserAuthenticated);
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
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs border shrink-0 ${rankColor}`}>
                      {index + 1}
                    </div>

                    <div className="w-10 h-13 rounded-lg overflow-hidden shrink-0 bg-[#222232] border border-[#2a2a3c] relative">
                      <img 
                        src={comic.coverImage} 
                        alt={comic.title}
                        referrerPolicy="no-referrer"
                        style={{ filter: isItemBlurred ? 'blur(10px)' : 'none' }}
                        className={`w-full h-full object-cover group-hover:scale-105 transition-transform ${
                          isItemBlurred ? 'scale-110' : ''
                        }`} 
                      />
                      {isItemBlurred && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <Lock className="w-3.5 h-3.5 text-amber-300" />
                        </div>
                      )}
                    </div>

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
                          {latestChapter ? `Ch. ${latestChapter.chapterNumber}` : `${comic.totalChapters || 1} Ch.`}
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

      {/* Ad Banner: Bawah Hero Banner */}
      <AdBanner position="home_hero_bottom" className="my-1" />

      {/* 2. MOBILE ONLY: KOMIK POPULER CARDS (Di bawah Banner untuk layar HP) */}
      <section className="block lg:hidden space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#ff5b14]/15 border border-[#ff5b14]/30 flex items-center justify-center text-[#ff5b14]">
              <TrendingUp className="w-3.5 h-3.5" />
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

        {/* Horizontal scroll cards on mobile */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {popularComics.map((comic, idx) => {
            const comicChaptersList = chapters[comic.id] || [];
            const latestChapter = comicChaptersList[0];
            const isItemBlurred = shouldBlurComic(comic, isUserAuthenticated);
            return (
              <div
                key={comic.id}
                onClick={() => handleOpenComic(comic.id)}
                className="w-36 shrink-0 bg-[#13131c] hover:bg-[#181824] rounded-2xl overflow-hidden border border-[#222232] cursor-pointer flex flex-col justify-between group transition-all"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#181824]">
                  <img
                    src={comic.coverImage}
                    alt={comic.title}
                    referrerPolicy="no-referrer"
                    style={{ filter: isItemBlurred ? 'blur(10px)' : 'none' }}
                    className={`w-full h-full object-cover group-hover:scale-105 transition-transform ${
                      isItemBlurred ? 'scale-110' : ''
                    }`}
                  />
                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-black/70 text-amber-300 border border-white/10 flex items-center gap-1">
                    #{idx + 1}
                  </div>
                  {isItemBlurred && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Lock className="w-4 h-4 text-amber-300 drop-shadow" />
                    </div>
                  )}
                  <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between text-[9px] text-slate-200">
                    <span className="flex items-center gap-0.5 bg-black/70 px-1 py-0.2 rounded text-amber-400 font-bold">
                      <Star className="w-2.5 h-2.5 fill-amber-400" />
                      {comic.rating ? comic.rating.toFixed(1) : '4.8'}
                    </span>
                    <span className="bg-black/70 px-1 py-0.2 rounded text-slate-300">
                      {latestChapter ? `Ch. ${latestChapter.chapterNumber}` : `${comic.totalChapters || 1} Ch.`}
                    </span>
                  </div>
                </div>
                <div className="p-2">
                  <h4 className="font-bold text-[11px] text-white line-clamp-1 group-hover:text-[#ff5b14]">
                    {comic.title}
                  </h4>
                  <p className="text-[9px] text-slate-400 truncate mt-0.5">
                    {comic.genres.slice(0, 1).join('')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Guest Blur Notice / Invitation banner */}
      {!isUserAuthenticated && (
        <section className="bg-gradient-to-r from-[#ff5b14]/15 via-[#1a1a28] to-[#12121a] border border-[#ff5b14]/30 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ff5b14]/20 border border-[#ff5b14]/40 flex items-center justify-center text-[#ff5b14] shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                <span>Mode Tamu: Sensor Gambar Aktif</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-bold">18+ Guard</span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Cover komik dan preview diburamkan. Masuk / Login untuk membuka sensor gambar dan membaca chapter.
              </p>
            </div>
          </div>

          <button
            onClick={() => openLoginModal('Silakan login untuk membuka sensor blur gambar dan menikmati ribuan chapter komik.')}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff5b14] to-[#f97316] hover:opacity-95 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-[#ff5b14]/30 transition-all cursor-pointer shrink-0"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Login / Buka Sensor</span>
          </button>
        </section>
      )}

      {/* 3. UPDATE TERBARU SECTION */}
      <section ref={catalogSectionRef} className="space-y-4 scroll-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
          <div className="flex items-center gap-2">
            <h3 className="font-black text-base sm:text-lg text-white tracking-tight flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#ff5b14]" />
              <span>Update Komik Terbaru</span>
            </h3>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#1c1c28] text-slate-300 font-bold border border-[#2a2a3c]">
              {filteredComics.length} Judul
            </span>
          </div>

          {/* Quick Filters (Status & Sort) */}
          <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
            <div className="flex items-center gap-1 bg-[#151520] p-1 rounded-xl border border-[#242436]">
              {(['all', 'ongoing', 'completed'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-[#ff5b14] text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st === 'all' ? 'Semua' : st === 'ongoing' ? 'Ongoing' : 'Tamat'}
                </button>
              ))}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#151520] border border-[#242436] text-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#ff5b14] cursor-pointer"
            >
              <option value="latest">⏱️ Terbaru</option>
              <option value="popular">🔥 Terpopuler</option>
              <option value="rating">⭐ Rating</option>
            </select>
          </div>
        </div>

        {/* RESULTS RENDERING: MOBILE (Horizontal Stacked Chapters) VS DESKTOP (Grid Cards with Chapter Pills) */}
        {filteredComics.length > 0 ? (
          <>
            {/* A. MOBILE VIEW: KOTAK MENYAMPING (COVER KIRI + 3 CHAPTER CEPAT MENURUN DI KANAN) */}
            <div className="block lg:hidden space-y-3">
              {filteredComics
                .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                .map((comic) => {
                  const bookmarked = isBookmarked(comic.id);
                  const comicChaptersList: Chapter[] = chapters[comic.id] || [];
                  const category = getComicCategory(comic);
                  const isItemBlurred = shouldBlurComic(comic, isUserAuthenticated);

                  // Take top 3 latest chapters (or default placeholder if none)
                  const top3Chapters = comicChaptersList.slice(0, 3);

                  return (
                    <div
                      key={comic.id}
                      className="bg-[#12121a] hover:bg-[#161622] rounded-2xl border border-[#222232] p-2.5 sm:p-3 flex gap-3 transition-all shadow-md group"
                    >
                      {/* Left: Comic Cover Thumbnail */}
                      <div 
                        onClick={() => handleOpenComic(comic.id)}
                        className="w-24 sm:w-28 aspect-[3/4] rounded-xl overflow-hidden bg-[#181824] relative shrink-0 cursor-pointer border border-[#28283c]"
                      >
                        <img 
                          src={comic.coverImage} 
                          alt={comic.title}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          style={{ filter: isItemBlurred ? 'blur(10px)' : 'none' }}
                          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
                            isItemBlurred ? 'scale-110' : ''
                          }`} 
                        />
                        <div className="absolute top-1 left-1 flex flex-col gap-0.5">
                          <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase shadow backdrop-blur-md ${
                            category === '18plus' ? 'bg-rose-600/90 text-white' :
                            category === 'manhwa' ? 'bg-emerald-600/90 text-white' :
                            category === 'manga' ? 'bg-indigo-600/90 text-white' :
                            'bg-amber-600/90 text-white'
                          }`}>
                            {category === '18plus' ? '18+' : category}
                          </span>
                        </div>

                        {isItemBlurred && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                            <Lock className="w-4 h-4 text-amber-300" />
                          </div>
                        )}

                        <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between text-[9px] text-slate-200">
                          <span className="flex items-center gap-0.5 bg-black/70 px-1 py-0.2 rounded font-bold text-amber-400">
                            <Star className="w-2.5 h-2.5 fill-amber-400" />
                            {comic.rating ? comic.rating.toFixed(1) : '4.8'}
                          </span>
                        </div>
                      </div>

                      {/* Right: Info & 3 Stacked Quick Chapter Buttons */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        {/* Title & Category Header */}
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <h4 
                              onClick={() => handleOpenComic(comic.id)}
                              className="font-black text-xs sm:text-sm text-white line-clamp-1 group-hover:text-[#ff5b14] transition-colors cursor-pointer"
                            >
                              {comic.title}
                            </h4>
                            <button
                              onClick={() => toggleBookmark(comic.id)}
                              className="text-slate-400 hover:text-[#ff5b14] p-1 shrink-0 cursor-pointer"
                            >
                              {bookmarked ? <BookmarkCheck className="w-3.5 h-3.5 fill-[#ff5b14] text-[#ff5b14]" /> : <Bookmark className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                            <span className="truncate max-w-[120px]">{comic.genres.slice(0, 2).join(', ')}</span>
                            <span>•</span>
                            <span className={comic.status === 'completed' ? 'text-purple-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                              {comic.status === 'completed' ? 'Tamat' : 'Ongoing'}
                            </span>
                          </div>
                        </div>

                        {/* 3 Quick Chapters Columns Stacked Vertically */}
                        <div className="space-y-1 mt-2">
                          {top3Chapters.length > 0 ? (
                            top3Chapters.map((ch, chIdx) => (
                              <button
                                key={`${ch.id || ch.chapterNumber}-${chIdx}`}
                                onClick={() => handleReadChapter(comic.id, ch.id)}
                                className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-[11px] transition-all cursor-pointer ${
                                  chIdx === 0 
                                    ? 'bg-[#1c1c28] hover:bg-[#ff5b14] text-white hover:text-white border border-[#2b2b3e] hover:border-[#ff5b14] font-bold shadow-sm'
                                    : 'bg-[#151520] hover:bg-[#20202e] text-slate-300 hover:text-white border border-[#202030]'
                                }`}
                              >
                                <span className="flex items-center gap-1.5 truncate">
                                  <BookOpen className="w-3 h-3 text-[#ff5b14]" />
                                  <span>Chapter {ch.chapterNumber}</span>
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  {chIdx === 0 && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded font-black bg-[#ff5b14] text-white tracking-wider">
                                      NEW
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    {ch.releaseDate || 'Hari ini'}
                                  </span>
                                </div>
                              </button>
                            ))
                          ) : (
                            <button
                              onClick={() => handleOpenComic(comic.id)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[#1c1c28] hover:bg-[#ff5b14] text-white flex items-center justify-between text-[11px] font-bold cursor-pointer"
                            >
                              <span>Buka Chapter Lengkap</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* B. DESKTOP VIEW: STANDARD GRID LAYOUT ENHANCED WITH CHAPTER SHORTCUT PILLS */}
            <div className="hidden lg:grid grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {filteredComics
                .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                .map((comic) => {
                  const bookmarked = isBookmarked(comic.id);
                  const comicChaptersList: Chapter[] = chapters[comic.id] || [];
                  const category = getComicCategory(comic);
                  const latestChapter = comicChaptersList[0];
                  const prevChapter = comicChaptersList[1];
                  const isItemBlurred = shouldBlurComic(comic, isUserAuthenticated);

                  return (
                    <div
                      key={comic.id}
                      className="group relative bg-[#12121a] hover:bg-[#161622] rounded-2xl overflow-hidden border border-[#222232] hover:border-[#ff5b14]/60 hover:shadow-xl hover:shadow-[#ff5b14]/10 transition-all duration-300 flex flex-col justify-between"
                    >
                      {/* Thumbnail Cover Area */}
                      <div 
                        onClick={() => handleOpenComic(comic.id)}
                        className="relative aspect-[3/4] w-full overflow-hidden bg-[#181824] cursor-pointer"
                      >
                        <img 
                          src={comic.coverImage} 
                          alt={comic.title}
                          referrerPolicy="no-referrer"
                          style={{ filter: isItemBlurred ? 'blur(10px)' : 'none' }}
                          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
                            isItemBlurred ? 'scale-110' : ''
                          }`} 
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d12] via-transparent to-transparent opacity-80" />

                        {/* Top Badges */}
                        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider backdrop-blur-md shadow ${
                            category === '18plus' ? 'bg-rose-600/90 text-white' :
                            category === 'manhwa' ? 'bg-emerald-600/90 text-white' :
                            category === 'manga' ? 'bg-indigo-600/90 text-white' :
                            'bg-amber-600/90 text-white'
                          }`}>
                            {category === '18plus' ? '18+ VIP' : category}
                          </span>

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
                            {bookmarked ? <BookmarkCheck className="w-3.5 h-3.5 fill-white" /> : <Bookmark className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {isItemBlurred && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] pointer-events-none p-2 text-center">
                            <Lock className="w-5 h-5 text-amber-300 drop-shadow mb-1" />
                            <span className="text-[10px] font-bold text-amber-300">Sensor Aktif</span>
                          </div>
                        )}

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

                      {/* Comic Card Content with Chapter Shortcut Pills */}
                      <div className="p-3 flex flex-col flex-1 justify-between">
                        <div>
                          <h4 
                            onClick={() => handleOpenComic(comic.id)}
                            className="font-bold text-xs sm:text-sm text-white line-clamp-1 group-hover:text-[#ff5b14] transition-colors leading-snug cursor-pointer"
                          >
                            {comic.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {comic.storyWriter || comic.artist || comic.author || 'AntiTimpa Studio'}
                          </p>
                        </div>

                        {/* Chapter shortcuts directly inside card */}
                        <div className="mt-2.5 pt-2 border-t border-[#1f1f2e] space-y-1">
                          {latestChapter ? (
                            <button
                              onClick={() => handleReadChapter(comic.id, latestChapter.id)}
                              className="w-full px-2 py-1 rounded-lg bg-[#181824] hover:bg-[#ff5b14] text-slate-200 hover:text-white flex items-center justify-between text-[10px] font-bold transition-colors cursor-pointer border border-[#242436]"
                            >
                              <span className="flex items-center gap-1 truncate">
                                <BookOpen className="w-3 h-3 text-[#ff5b14] group-hover:text-white" />
                                <span>Ch. {latestChapter.chapterNumber}</span>
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-[#ff5b14] text-white">
                                NEW
                              </span>
                            </button>
                          ) : null}

                          {prevChapter && (
                            <button
                              onClick={() => handleReadChapter(comic.id, prevChapter.id)}
                              className="w-full px-2 py-1 rounded-lg bg-[#13131c] hover:bg-[#20202e] text-slate-400 hover:text-slate-200 flex items-center justify-between text-[10px] transition-colors cursor-pointer"
                            >
                              <span>Ch. {prevChapter.chapterNumber}</span>
                              <span className="text-[9px] text-slate-500">{prevChapter.releaseDate || 'Lalu'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[#1e1e2d]">
                <div className="text-xs text-slate-400">
                  Menampilkan <strong className="text-white">{(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredComics.length)}</strong> dari <strong className="text-white">{filteredComics.length}</strong> komik
                </div>

                <div className="flex items-center gap-1.5 flex-wrap justify-center">
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
            <p className="text-base font-bold text-white">Tidak ada komik dalam kategori ini</p>
            <button
              onClick={() => {
                setStatusFilter('all');
                setSortBy('latest');
              }}
              className="px-4 py-2 rounded-xl bg-[#ff5b14] text-white text-xs font-bold shadow-md shadow-[#ff5b14]/20 cursor-pointer"
            >
              Reset Filter
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
