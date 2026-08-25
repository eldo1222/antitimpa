import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { 
  Bell, 
  Menu, 
  ShieldCheck, 
  Smartphone, 
  Monitor, 
  User, 
  X, 
  Sparkles, 
  BookOpen, 
  Flame, 
  Layers, 
  LogIn, 
  LogOut,
  ExternalLink,
  Home,
  Compass,
  Bookmark,
  Search,
  ChevronDown,
  ChevronRight,
  Tag,
  Star,
  Zap,
  Globe
} from 'lucide-react';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    currentUser, 
    isAdminView, 
    setIsAdminView, 
    openLoginModal, 
    logout, 
    activeTab,
    setActiveTab, 
    selectComic,
    comics,
    chapters,
    bookmarks,
    isMobileDeviceFrame,
    toggleMobileDeviceFrame,
    setSelectedGenreFilter
  } = useApp();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Accordion & Dropdown states
  const [isDrawerComicOpen, setIsDrawerComicOpen] = useState(true);
  const [isDesktopComicDropdownOpen, setIsDesktopComicDropdownOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const desktopComicRef = useRef<HTMLDivElement>(null);

  const pathname = location.pathname;

  // Auto-focus search input when search pop-up opens
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isSearchOpen]);

  // Close popups when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (desktopComicRef.current && !desktopComicRef.current.contains(e.target as Node)) {
        setIsDesktopComicDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter visible comics for search popup live suggestions
  const liveSearchResults = comics
    .filter(c => c.isVisibleOnHome !== false && c.showOnHome !== false)
    .filter(comic => {
      if (!searchQuery.trim()) return false;
      const q = searchQuery.toLowerCase();
      return (
        comic.title.toLowerCase().includes(q) ||
        (comic.storyWriter && comic.storyWriter.toLowerCase().includes(q)) ||
        comic.genres.some(g => g.toLowerCase().includes(q))
      );
    })
    .slice(0, 5);

  const handleSelectComicResult = (comicId: string) => {
    selectComic(comicId);
    setIsSearchOpen(false);
    setSearchQuery('');
    const comic = comics.find(c => c.id === comicId);
    navigate(`/comic/${comic?.slug || comicId}`);
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearchOpen(false);
      navigate(`/discover?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleNavigateComicType = (type: string) => {
    setIsDrawerOpen(false);
    setIsDesktopComicDropdownOpen(false);
    selectComic(null);
    setActiveTab('discover');
    navigate(`/discover?type=${type}`);
  };

  const handleNavigateGenre = (genre: string = 'Semua') => {
    setIsDrawerOpen(false);
    selectComic(null);
    setSelectedGenreFilter(genre);
    navigate(`/genre${genre && genre !== 'Semua' ? `?genre=${encodeURIComponent(genre)}` : ''}`);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0c0c12]/95 backdrop-blur-md border-b border-[#1f1f2e] text-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between">
          {/* Left Side: Drawer Trigger on mobile & Brand Logo */}
          <div className="flex items-center gap-3 sm:gap-6">
            <button
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Buka Menu"
              className="p-2 -ml-1 text-slate-300 hover:text-white rounded-xl hover:bg-white/5 active:scale-95 transition-all md:hidden cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo */}
            <button 
              onClick={() => { 
                selectComic(null); 
                setActiveTab('home'); 
                setIsAdminView(false); 
                navigate('/');
              }}
              className="flex items-center gap-2 focus:outline-none group text-left cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#ff5b14] to-[#f97316] hidden sm:flex items-center justify-center text-white font-black text-sm shadow-md shadow-[#ff5b14]/30 group-hover:scale-105 transition-transform">
                AT
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-black text-lg sm:text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent group-hover:text-white transition-all">
                  Anti<span className="text-[#ff5b14]">Timpa</span>
                </span>
                <span className="hidden sm:inline-block text-[9px] font-black px-1.5 py-0.2 rounded-md bg-[#ff5b14]/15 text-[#ff7a3d] border border-[#ff5b14]/30 tracking-wider">
                  KOMIK
                </span>
              </div>
            </button>

            {/* Desktop Navigation Links (Visible on md and larger screens) */}
            <nav className="hidden md:flex items-center gap-1 ml-4 lg:ml-6">
              <button
                onClick={() => { selectComic(null); setActiveTab('home'); setIsAdminView(false); navigate('/'); }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  pathname === '/' && !isAdminView
                    ? 'bg-[#ff5b14] text-white shadow-md shadow-[#ff5b14]/25'
                    : 'text-slate-300 hover:text-white hover:bg-[#181824]'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Beranda</span>
              </button>

              {/* Desktop Komik Dropdown */}
              <div className="relative" ref={desktopComicRef}>
                <button
                  onClick={() => setIsDesktopComicDropdownOpen(prev => !prev)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    pathname.startsWith('/discover') && location.search.includes('type=')
                      ? 'bg-[#ff5b14] text-white shadow-md shadow-[#ff5b14]/25'
                      : 'text-slate-300 hover:text-white hover:bg-[#181824]'
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-[#ff5b14]" />
                  <span>Komik</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isDesktopComicDropdownOpen ? 'rotate-180 text-white' : 'text-slate-400'}`} />
                </button>

                {isDesktopComicDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-52 bg-[#14141e] border border-[#262638] rounded-2xl shadow-2xl p-2 text-xs z-50 animate-in fade-in zoom-in-95">
                    <div className="text-[10px] font-bold text-slate-400 px-3 py-1.5 uppercase tracking-wider border-b border-[#202030] mb-1">
                      Kategori Jenis Komik
                    </div>
                    <button
                      onClick={() => handleNavigateComicType('all')}
                      className="w-full text-left px-3 py-2 rounded-xl text-slate-200 hover:text-white hover:bg-[#1f1f2e] flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#ff5b14]" />
                      <span>Semua Komik</span>
                    </button>
                    <button
                      onClick={() => handleNavigateComicType('manhwa')}
                      className="w-full text-left px-3 py-2 rounded-xl text-slate-200 hover:text-white hover:bg-[#1f1f2e] flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <span className="text-sm">🇰🇷</span>
                      <span>Manhwa (Korea)</span>
                    </button>
                    <button
                      onClick={() => handleNavigateComicType('manga')}
                      className="w-full text-left px-3 py-2 rounded-xl text-slate-200 hover:text-white hover:bg-[#1f1f2e] flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <span className="text-sm">🇯🇵</span>
                      <span>Manga (Jepang)</span>
                    </button>
                    <button
                      onClick={() => handleNavigateComicType('manhua')}
                      className="w-full text-left px-3 py-2 rounded-xl text-slate-200 hover:text-white hover:bg-[#1f1f2e] flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <span className="text-sm">🇨🇳</span>
                      <span>Manhua (China)</span>
                    </button>
                    <button
                      onClick={() => handleNavigateComicType('18plus')}
                      className="w-full text-left px-3 py-2 rounded-xl text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 flex items-center gap-2.5 transition-colors cursor-pointer font-semibold"
                    >
                      <Flame className="w-3.5 h-3.5 text-rose-400" />
                      <span>18+ VIP Dewasa</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Desktop Genre Page Link */}
              <button
                onClick={() => handleNavigateGenre()}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  pathname.startsWith('/genre')
                    ? 'bg-[#ff5b14] text-white shadow-md shadow-[#ff5b14]/25'
                    : 'text-slate-300 hover:text-white hover:bg-[#181824]'
                }`}
              >
                <Tag className="w-4 h-4 text-amber-400" />
                <span>Genre</span>
              </button>

              {/* Desktop Discover Link */}
              <button
                onClick={() => { selectComic(null); setActiveTab('discover'); setIsAdminView(false); navigate('/discover'); }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  pathname.startsWith('/discover') && !location.search.includes('type=') && !isAdminView
                    ? 'bg-[#ff5b14] text-white shadow-md shadow-[#ff5b14]/25'
                    : 'text-slate-300 hover:text-white hover:bg-[#181824]'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>Jelajah</span>
              </button>

              {/* Desktop Koleksi Link */}
              <button
                onClick={() => { selectComic(null); setActiveTab('library'); setIsAdminView(false); navigate('/library'); }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer relative ${
                  pathname.startsWith('/library') && !isAdminView
                    ? 'bg-[#ff5b14] text-white shadow-md shadow-[#ff5b14]/25'
                    : 'text-slate-300 hover:text-white hover:bg-[#181824]'
                }`}
              >
                <Bookmark className="w-4 h-4" />
                <span>Koleksi</span>
                {bookmarks.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-[#ff5b14]/30 text-white border border-[#ff5b14]/50">
                    {bookmarks.length}
                  </span>
                )}
              </button>

              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => { setIsAdminView(true); navigate('/admin'); }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ml-1 ${
                    pathname.startsWith('/admin')
                      ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                      : 'text-amber-300 hover:text-amber-200 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Admin</span>
                </button>
              )}
            </nav>
          </div>

          {/* Right Side: Device Frame, Search Icon (beside Notification), Notification & Auth */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Toggle Device Frame for previewing phone shell on desktop */}
            <button
              onClick={toggleMobileDeviceFrame}
              className={`p-2 rounded-xl border transition-colors hidden lg:flex items-center justify-center cursor-pointer ${
                isMobileDeviceFrame 
                  ? 'bg-[#ff5b14]/20 border-[#ff5b14]/40 text-[#ff5b14]' 
                  : 'bg-[#161622] border-[#252536] text-slate-400 hover:text-white hover:border-slate-500'
              }`}
              title={isMobileDeviceFrame ? "Beralih ke Tampilan Penuh Desktop" : "Simulasi Frame HP Mobile"}
            >
              <Smartphone className="w-4 h-4" />
            </button>

            {/* 🔍 SEARCH ICON BUTTON (Positioned right beside notification icon) */}
            <div className="relative" ref={searchContainerRef}>
              <button
                onClick={() => {
                  setIsSearchOpen(prev => !prev);
                  setIsNotificationOpen(false);
                }}
                aria-label="Cari Komik"
                className={`p-2 rounded-xl border relative active:scale-95 transition-all cursor-pointer ${
                  isSearchOpen
                    ? 'bg-[#ff5b14] border-[#ff5b14] text-white shadow-lg shadow-[#ff5b14]/30'
                    : 'bg-[#161622] border-[#252536] text-slate-300 hover:text-white hover:border-slate-500'
                }`}
                title="Pencarian Komik"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* SEARCH POP-UP DROPDOWN (Pops down smoothly from header) */}
              {isSearchOpen && (
                <div 
                  className="fixed sm:absolute right-2 sm:right-0 top-14 sm:top-full mt-2 w-[calc(100vw-16px)] sm:w-96 max-w-lg bg-[#14141d] border border-[#2a2a3e] rounded-2xl shadow-2xl p-4 text-xs z-50 animate-in fade-in zoom-in-95 slide-in-from-top-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Pop-up Header / Input Form */}
                  <form onSubmit={handleSearchSubmit} className="relative">
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari judul komik, author, genre..."
                      className="w-full pl-9 pr-8 py-2.5 bg-[#1b1b28] border border-[#313148] focus:border-[#ff5b14] rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                    />
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-2.5 p-0.5 text-slate-400 hover:text-white rounded-md cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </form>

                  {/* Live Results Preview */}
                  <div className="mt-3 max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {searchQuery.trim() ? (
                      liveSearchResults.length > 0 ? (
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 pb-1.5 flex items-center justify-between">
                            <span>Hasil Ditemukan</span>
                            <span className="text-[#ff5b14]">{liveSearchResults.length} saran</span>
                          </div>
                          <div className="space-y-1.5">
                            {liveSearchResults.map((comic) => {
                              const comicChaptersList = chapters[comic.id] || [];
                              const latestChapter = comicChaptersList[0];
                              return (
                                <div
                                  key={comic.id}
                                  onClick={() => handleSelectComicResult(comic.id)}
                                  className="p-2 rounded-xl bg-[#1b1b27] hover:bg-[#232334] border border-[#28283c] hover:border-[#ff5b14]/50 flex items-center gap-3 cursor-pointer transition-all group"
                                >
                                  <div className="relative w-10 h-13 rounded-lg overflow-hidden bg-[#2a2a3c] shrink-0">
                                    <img 
                                      src={comic.coverImage} 
                                      alt={comic.title} 
                                      referrerPolicy="no-referrer"
                                      style={{ filter: !isUserAuthenticated ? 'blur(6px)' : 'none' }}
                                      className="w-full h-full object-cover transition-all" 
                                    />
                                    {!isUserAuthenticated && (
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
                                        <Lock className="w-2.5 h-2.5 text-white/80" />
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
                                      <span className="text-slate-400">
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
                      ) : (
                        <div className="text-center py-6 text-slate-400">
                          <p className="text-xs">Tidak ada komik yang cocok dengan "{searchQuery}"</p>
                        </div>
                      )
                    ) : (
                      /* Quick Keywords / Populer Tags when search query is empty */
                      <div className="py-2">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 pb-2">
                          Pencarian Populer
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {['Netorare', 'Milf', 'Romance 18+', 'Action', 'Isekai', 'Manga', 'Manhwa', 'Drama Dewasa'].map(tag => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => {
                                setSearchQuery(tag);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#1c1c28] hover:bg-[#262638] text-slate-300 hover:text-white border border-[#2a2a3c] text-[11px] transition-colors cursor-pointer"
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pop-up Footer: Full Discover jump */}
                  <div className="mt-3 pt-2.5 border-t border-[#232334] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleNavigateGenre()}
                      className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <Tag className="w-3 h-3" />
                      <span>Eksplorasi Tag Genre</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSearchSubmit()}
                      className="text-[11px] text-[#ff5b14] hover:underline flex items-center gap-1 font-bold cursor-pointer"
                    >
                      <span>Lihat di Jelajah</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Notification Button */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsNotificationOpen(prev => !prev);
                  setIsSearchOpen(false);
                }}
                aria-label="Notifikasi"
                className="p-2 text-slate-300 hover:text-white rounded-xl bg-[#161622] border border-[#252536] relative active:scale-95 transition-all cursor-pointer hover:border-slate-500"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#ff5b14] ring-2 ring-[#0c0c12]" />
              </button>

              {/* Notification Dropdown */}
              {isNotificationOpen && (
                <div 
                  className="fixed sm:absolute right-2 sm:right-0 top-14 sm:top-full mt-2 w-[calc(100vw-16px)] sm:w-80 bg-[#161622] border border-[#2d2d3d] rounded-2xl shadow-2xl p-4 text-xs z-50 animate-in fade-in zoom-in-95"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-[#242432]">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-[#ff5b14]" />
                      Pemberitahuan & Update
                    </div>
                    <button 
                      onClick={() => setIsNotificationOpen(false)}
                      className="text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-3 mt-3 max-h-64 overflow-y-auto pr-1">
                    <div className="p-2.5 rounded-xl bg-[#1f1f2d] border border-[#2c2c40]">
                      <span className="text-[10px] font-bold text-[#ff5b14] uppercase">Chapter Baru</span>
                      <p className="font-semibold text-slate-200 mt-0.5">Neon Shadows: Zero - Ch. 46 rilis!</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Sari J. baru saja mengunggah halaman terbaru.</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#1f1f2d] border border-[#2c2c40]">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase">Sistem Keamanan</span>
                      <p className="font-semibold text-slate-200 mt-0.5">Sistem Anti-Brute Force Aktif</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Maksimal 3x percobaan login sebelum akun terkunci otomatis.</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-[#242432] text-center">
                    <button 
                      onClick={() => { setIsNotificationOpen(false); setIsAdminView(true); navigate('/admin'); }}
                      className="text-[11px] text-[#ff5b14] hover:underline font-semibold cursor-pointer"
                    >
                      Buka Log Aktivitas di Admin →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar or Login Button */}
            {currentUser ? (
              <button
                onClick={() => { 
                  selectComic(null); 
                  setActiveTab('profile'); 
                  setIsAdminView(false);
                  navigate('/profile');
                }}
                className="flex items-center gap-2 p-1.5 pl-2.5 bg-[#161622] border border-[#252536] rounded-xl hover:border-[#ff5b14]/50 transition-all cursor-pointer"
                title="Buka Halaman Profil"
              >
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-white max-w-[90px] truncate leading-tight">
                    {currentUser.username}
                  </div>
                  <div className="text-[10px] text-[#ff7a3d] font-semibold">
                    {currentUser.role === 'admin' ? 'Super Admin' : currentUser.tier}
                  </div>
                </div>
                <img 
                  src={currentUser.avatar} 
                  alt={currentUser.username} 
                  className="w-7 h-7 rounded-lg object-cover ring-1 ring-[#ff5b14]/50" 
                />
              </button>
            ) : (
              <button
                onClick={() => openLoginModal()}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#ff5b14] to-[#f95700] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#ff5b14]/20 hover:opacity-95 transition-opacity cursor-pointer active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Drawer Sidebar Menu */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex animate-in fade-in"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div 
            className="w-72 max-w-[80vw] h-full bg-[#121217] border-r border-[#242432] p-5 flex flex-col justify-between text-slate-200 animate-in slide-in-from-left duration-300 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#222230]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#ff5b14] flex items-center justify-center text-white font-extrabold text-lg">
                    AT
                  </div>
                  <div>
                    <h2 className="font-extrabold text-base text-white">AntiTimpa</h2>
                    <p className="text-[11px] text-slate-400">Platform Komik Dewasa Mobile</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Snapshot in Drawer */}
              <div className="my-4 p-3 rounded-xl bg-[#1a1a24] border border-[#2c2c3e]">
                {currentUser ? (
                  <div className="flex items-center gap-3">
                    <img 
                      src={currentUser.avatar} 
                      alt={currentUser.username} 
                      className="w-10 h-10 rounded-xl object-cover ring-2 ring-[#ff5b14]/40" 
                    />
                    <div className="overflow-hidden">
                      <div className="font-bold text-sm text-white truncate">{currentUser.username}</div>
                      <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {currentUser.tier} • {currentUser.role === 'admin' ? 'Super Admin' : 'Aktif'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-xs text-slate-300 mb-2">Belum masuk akun?</p>
                    <button
                      onClick={() => { setIsDrawerOpen(false); openLoginModal(); }}
                      className="w-full py-2 bg-[#ff5b14] text-white text-xs font-bold rounded-lg shadow cursor-pointer"
                    >
                      Masuk / Login Akun
                    </button>
                  </div>
                )}
              </div>

              {/* Navigation Links in Sidebar */}
              <nav className="space-y-1.5 text-sm">
                {/* Beranda */}
                <button
                  onClick={() => { setActiveTab('home'); selectComic(null); setIsAdminView(false); setIsDrawerOpen(false); navigate('/'); }}
                  className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 transition-colors cursor-pointer ${
                    pathname === '/' && !isAdminView ? 'bg-[#ff5b14] text-white font-bold' : 'text-slate-300 hover:bg-[#1f1f2c] hover:text-white'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  <span>Katalog Beranda</span>
                </button>

                {/* 📂 KOMIK (Dropdown Accordion in Sidebar as requested) */}
                <div className="rounded-xl bg-[#161622] border border-[#232334] overflow-hidden">
                  <button
                    onClick={() => setIsDrawerComicOpen(prev => !prev)}
                    className="w-full px-3 py-2.5 flex items-center justify-between text-slate-200 font-semibold hover:text-white transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-4 h-4 text-[#ff5b14]" />
                      <span>Komik</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isDrawerComicOpen ? 'rotate-180 text-white' : ''}`} />
                  </button>

                  {isDrawerComicOpen && (
                    <div className="px-2 pb-2 pt-1 space-y-1 text-xs border-t border-[#202030] bg-[#12121a]">
                      <button
                        onClick={() => handleNavigateComicType('all')}
                        className="w-full px-3 py-2 rounded-lg text-left text-slate-300 hover:text-white hover:bg-[#1c1c28] flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#ff5b14]" />
                        <span>Semua Komik</span>
                      </button>
                      <button
                        onClick={() => handleNavigateComicType('manhwa')}
                        className="w-full px-3 py-2 rounded-lg text-left text-slate-300 hover:text-white hover:bg-[#1c1c28] flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <span className="text-sm">🇰🇷</span>
                        <span>Manhwa (Korea)</span>
                      </button>
                      <button
                        onClick={() => handleNavigateComicType('manga')}
                        className="w-full px-3 py-2 rounded-lg text-left text-slate-300 hover:text-white hover:bg-[#1c1c28] flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <span className="text-sm">🇯🇵</span>
                        <span>Manga (Jepang)</span>
                      </button>
                      <button
                        onClick={() => handleNavigateComicType('manhua')}
                        className="w-full px-3 py-2 rounded-lg text-left text-slate-300 hover:text-white hover:bg-[#1c1c28] flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <span className="text-sm">🇨🇳</span>
                        <span>Manhua (China)</span>
                      </button>
                      <button
                        onClick={() => handleNavigateComicType('18plus')}
                        className="w-full px-3 py-2 rounded-lg text-left text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                      >
                        <Flame className="w-3.5 h-3.5 text-rose-400" />
                        <span>18+ VIP Dewasa</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 🏷️ GENRE (Sidebar Menu Item as requested) */}
                <button
                  onClick={() => handleNavigateGenre()}
                  className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                    pathname.startsWith('/genre') ? 'bg-[#ff5b14] text-white font-bold' : 'text-slate-300 hover:bg-[#1f1f2c] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Tag className="w-4 h-4 text-amber-400" />
                    <span>Genre</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Netorare, Milf, dll
                  </span>
                </button>

                {/* Jelajah */}
                <button
                  onClick={() => { setActiveTab('discover'); selectComic(null); setIsAdminView(false); setIsDrawerOpen(false); navigate('/discover'); }}
                  className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 transition-colors cursor-pointer ${
                    pathname.startsWith('/discover') && !location.search.includes('type=') && !isAdminView
                      ? 'bg-[#ff5b14] text-white font-bold'
                      : 'text-slate-300 hover:bg-[#1f1f2c] hover:text-white'
                  }`}
                >
                  <Compass className="w-4 h-4 text-cyan-400" />
                  <span>Jelajah & Filter Lengkap</span>
                </button>

                {/* Koleksi */}
                <button
                  onClick={() => { setActiveTab('library'); selectComic(null); setIsAdminView(false); setIsDrawerOpen(false); navigate('/library'); }}
                  className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                    pathname.startsWith('/library') && !isAdminView
                      ? 'bg-[#ff5b14] text-white font-bold'
                      : 'text-slate-300 hover:bg-[#1f1f2c] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <span>Koleksi & Riwayat</span>
                  </div>
                  {bookmarks.length > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ff5b14]/20 text-[#ff7a3d] font-bold">
                      {bookmarks.length}
                    </span>
                  )}
                </button>

                {/* Panel Admin (if user is admin) */}
                {currentUser?.role === 'admin' && (
                  <div className="pt-2 border-t border-[#222230] my-2">
                    <button
                      onClick={() => { setIsAdminView(true); setIsDrawerOpen(false); navigate('/admin'); }}
                      className="w-full px-3 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 flex items-center justify-between text-amber-300 font-semibold transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="w-4 h-4 text-amber-400" />
                        <span>Admin Console</span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                    </button>
                  </div>
                )}
              </nav>
            </div>

            {/* Drawer Footer */}
            <div className="pt-4 border-t border-[#222230]">
              {currentUser ? (
                <button
                  onClick={() => { logout(); setIsDrawerOpen(false); }}
                  className="w-full py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar Akun</span>
                </button>
              ) : (
                <p className="text-[11px] text-slate-500 text-center">
                  AntiTimpa Web Reader v2.4 • Mode Mobile
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
