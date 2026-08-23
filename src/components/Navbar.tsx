import React, { useState } from 'react';
import { 
  BookOpen, 
  Flame, 
  Lock, 
  Search, 
  ShieldCheck, 
  User, 
  LogOut, 
  Sparkles,
  Layers,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { store } from '../services/store';
import { UserAccount, GoogleUser } from '../types';

interface NavbarProps {
  activeTab: 'all' | 'manga' | 'manhwa' | 'manhua' | '18plus';
  onTabChange: (tab: 'all' | 'manga' | 'manhwa' | 'manhua' | '18plus') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenAdmin: () => void;
  onOpenAuth: () => void;
  selectedGenre: string | null;
  onResetGenre: () => void;
  currentReader: UserAccount | null;
  currentGoogleUser: GoogleUser | null;
  onLogoutReader: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  onOpenAdmin,
  onOpenAuth,
  selectedGenre,
  onResetGenre,
  currentReader,
  currentGoogleUser,
  onLogoutReader,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#0f1117]/95 backdrop-blur-md border-b border-slate-800/80 shadow-lg">
      {/* Top Banner Notice */}
      <div className="bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-purple-500/15 border-b border-slate-800/50 px-4 py-1.5 text-xs text-slate-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-full">
              INFO AKSES
            </span>
            <span>
              Komik biasa (Manga/Manhwa/Manhua) <strong>GRATIS tanpa login</strong>. Genre <strong>18+ khusus akun berbayar</strong> (Paket 5k / 15k).
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-400">
            {currentReader ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Login: <strong>{currentReader.username}</strong> ({currentReader.planType === 'plan_5k_single' ? 'Paket 5K' : currentReader.role === 'admin' ? 'Super Admin' : 'VIP 15K'})
              </span>
            ) : (
              <button
                onClick={onOpenAuth}
                className="text-amber-400 hover:text-amber-300 font-medium underline underline-offset-2"
              >
                Login Akun Berbayar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { onTabChange('all'); onResetGenre(); }}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-rose-600 to-purple-600 flex items-center justify-center shadow-lg shadow-rose-600/20">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-white">Komik<span className="text-rose-500">Yuk</span></span>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-mono font-bold">DIGITAL</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block">Manga, Manhwa, Manhua &amp; 18+ Series</p>
            </div>
          </div>

          {/* Desktop Nav Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => { onTabChange('all'); onResetGenre(); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'all' && !selectedGenre
                  ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              Semua Komik
            </button>

            <button
              onClick={() => { onTabChange('manhwa'); onResetGenre(); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'manhwa'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              Manhwa
            </button>

            <button
              onClick={() => { onTabChange('manga'); onResetGenre(); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'manga'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              Manga
            </button>

            <button
              onClick={() => { onTabChange('manhua'); onResetGenre(); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'manhua'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              Manhua
            </button>

            <button
              onClick={() => { onTabChange('18plus'); onResetGenre(); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === '18plus'
                  ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md shadow-rose-900/30'
                  : 'text-rose-400 hover:text-rose-300 hover:bg-rose-950/40'
              }`}
            >
              <Lock className="w-3 h-3 text-amber-400" />
              Genre 18+ (VIP)
            </button>
          </nav>

          {/* Search Box */}
          <div className="flex-1 max-w-xs relative hidden lg:block">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari judul, cerita, penggambar..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
            />
          </div>

          {/* User & Admin Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Admin Panel Button */}
            <button
              onClick={onOpenAdmin}
              className="px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
              title="Panel Admin & Penarik API"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Admin Panel</span>
            </button>

            {/* Reader / VIP Status */}
            {currentReader ? (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1 pr-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                  {currentReader.username.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left text-[11px]">
                  <p className="font-bold text-slate-200 leading-tight truncate max-w-[90px]">
                    {currentReader.username}
                  </p>
                  <p className="text-[10px] text-amber-400 font-medium">
                    {currentReader.planType === 'plan_5k_single' ? '1 Komik (5K)' : currentReader.role === 'admin' ? 'Admin' : 'VIP All'}
                  </p>
                </div>
                <button
                  onClick={onLogoutReader}
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded transition-colors"
                  title="Logout Akun"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-3.5 py-1.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition-all"
              >
                <User className="w-3.5 h-3.5" />
                <span>Masuk 18+</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search input */}
        <div className="pb-3 lg:hidden">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari komik, story, art, genre..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        {/* Mobile Category Bar */}
        <div className="flex md:hidden overflow-x-auto space-x-1 pb-2 scrollbar-none text-xs">
          <button
            onClick={() => { onTabChange('all'); onResetGenre(); }}
            className={`px-3 py-1 rounded-lg shrink-0 font-medium ${
              activeTab === 'all' && !selectedGenre ? 'bg-rose-600 text-white' : 'bg-slate-900 text-slate-400'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => { onTabChange('manhwa'); onResetGenre(); }}
            className={`px-3 py-1 rounded-lg shrink-0 font-medium ${
              activeTab === 'manhwa' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-slate-400'
            }`}
          >
            Manhwa
          </button>
          <button
            onClick={() => { onTabChange('manga'); onResetGenre(); }}
            className={`px-3 py-1 rounded-lg shrink-0 font-medium ${
              activeTab === 'manga' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-slate-400'
            }`}
          >
            Manga
          </button>
          <button
            onClick={() => { onTabChange('manhua'); onResetGenre(); }}
            className={`px-3 py-1 rounded-lg shrink-0 font-medium ${
              activeTab === 'manhua' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-slate-400'
            }`}
          >
            Manhua
          </button>
          <button
            onClick={() => { onTabChange('18plus'); onResetGenre(); }}
            className={`px-3 py-1 rounded-lg shrink-0 font-medium flex items-center gap-1 ${
              activeTab === '18plus' ? 'bg-red-600 text-white' : 'bg-slate-900 text-rose-400'
            }`}
          >
            <Lock className="w-3 h-3" />
            18+ (VIP)
          </button>
        </div>
      </div>
    </header>
  );
};
