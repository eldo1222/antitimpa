import React, { useState } from 'react';
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
  Search
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
    selectedComicId,
    bookmarks,
    isMobileDeviceFrame,
    toggleMobileDeviceFrame,
    activityLogs
  } = useApp();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const pathname = location.pathname;

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0c0c12]/95 backdrop-blur-md border-b border-[#1f1f2e] text-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between">
          {/* Left Side: Drawer Trigger on mobile & Brand Logo */}
          <div className="flex items-center gap-3 sm:gap-6">
            <button
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Buka Menu"
              className="p-2 -ml-1 text-slate-300 hover:text-white rounded-xl hover:bg-white/5 active:scale-95 transition-all md:hidden"
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
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  pathname === '/' && !isAdminView
                    ? 'bg-[#ff5b14] text-white shadow-md shadow-[#ff5b14]/25'
                    : 'text-slate-300 hover:text-white hover:bg-[#181824]'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Beranda</span>
              </button>

              <button
                onClick={() => { selectComic(null); setActiveTab('discover'); setIsAdminView(false); navigate('/discover'); }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  pathname.startsWith('/discover') && !isAdminView
                    ? 'bg-[#ff5b14] text-white shadow-md shadow-[#ff5b14]/25'
                    : 'text-slate-300 hover:text-white hover:bg-[#181824]'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>Jelajah</span>
              </button>

              <button
                onClick={() => { selectComic(null); setActiveTab('library'); setIsAdminView(false); navigate('/library'); }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer relative ${
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
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ml-1 ${
                    pathname.startsWith('/admin')
                      ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                      : 'text-amber-300 hover:text-amber-200 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Panel Admin</span>
                </button>
              )}
            </nav>
          </div>

          {/* Right Side: Device Frame, Notifications & Auth */}
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

            {/* Notification Button */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationOpen(prev => !prev)}
                aria-label="Notifikasi"
                className="p-2 text-slate-300 hover:text-white rounded-xl bg-[#161622] border border-[#252536] relative active:scale-95 transition-all cursor-pointer hover:border-slate-500"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#ff5b14] ring-2 ring-[#0c0c12]" />
              </button>

              {/* Notification Dropdown */}
              {isNotificationOpen && (
                <div 
                  className="absolute right-0 mt-2 w-80 bg-[#161622] border border-[#2d2d3d] rounded-2xl shadow-2xl p-4 text-xs z-50 animate-in fade-in zoom-in-95"
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
                      onClick={() => { setIsNotificationOpen(false); setIsAdminView(true); }}
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
                onClick={() => { selectComic(null); setActiveTab('profile'); }}
                className="flex items-center gap-2 p-1.5 pl-2.5 bg-[#161622] border border-[#252536] rounded-xl hover:border-[#ff5b14]/50 transition-all cursor-pointer"
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

      {/* Mobile Drawer Menu */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex animate-in fade-in"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div 
            className="w-72 max-w-[80vw] h-full bg-[#121217] border-r border-[#242432] p-5 flex flex-col justify-between text-slate-200 animate-in slide-in-from-left duration-300"
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
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
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
                      className="w-full py-2 bg-[#ff5b14] text-white text-xs font-bold rounded-lg shadow"
                    >
                      Masuk / Login Akun
                    </button>
                  </div>
                )}
              </div>

              {/* Navigation Links */}
              <nav className="space-y-1.5 text-sm">
                <button
                  onClick={() => { setActiveTab('home'); selectComic(null); setIsAdminView(false); setIsDrawerOpen(false); navigate('/'); }}
                  className="w-full px-3 py-2.5 rounded-xl hover:bg-[#1f1f2c] flex items-center gap-3 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-[#ff5b14]" />
                  <span>Katalog Beranda</span>
                </button>

                <button
                  onClick={() => { setActiveTab('discover'); selectComic(null); setIsAdminView(false); setIsDrawerOpen(false); navigate('/discover'); }}
                  className="w-full px-3 py-2.5 rounded-xl hover:bg-[#1f1f2c] flex items-center gap-3 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>Jelajah & Genre</span>
                </button>

                <button
                  onClick={() => { setActiveTab('library'); selectComic(null); setIsAdminView(false); setIsDrawerOpen(false); navigate('/library'); }}
                  className="w-full px-3 py-2.5 rounded-xl hover:bg-[#1f1f2c] flex items-center gap-3 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>Koleksi & Riwayat</span>
                </button>

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
                  className="w-full py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
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
