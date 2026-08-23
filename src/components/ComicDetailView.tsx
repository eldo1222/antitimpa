import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Star, 
  Lock, 
  Unlock, 
  BookOpen, 
  User, 
  Palette, 
  Calendar, 
  Share2, 
  Bookmark,
  CheckCircle2,
  AlertTriangle,
  Play,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { Comic, Chapter, UserAccount, GoogleUser } from '../types';
import { store } from '../services/store';
import { CommentSection } from './CommentSection';

interface ComicDetailViewProps {
  comic: Comic;
  onBack: () => void;
  onSelectGenre: (genre: string) => void;
  onReadChapter: (comic: Comic, chapter: Chapter) => void;
  onOpenAuth: () => void;
  currentReader: UserAccount | null;
  currentGoogleUser: GoogleUser | null;
  onLoginGoogle: () => void;
  onLogoutGoogle: () => void;
}

export const ComicDetailView: React.FC<ComicDetailViewProps> = ({
  comic,
  onBack,
  onSelectGenre,
  onReadChapter,
  onOpenAuth,
  currentReader,
  currentGoogleUser,
  onLoginGoogle,
  onLogoutGoogle,
}) => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [accessStatus, setAccessStatus] = useState<{ allowed: boolean; reason?: string }>({ allowed: true });

  useEffect(() => {
    // Check permission
    const status = store.canAccess18PlusComic(comic.id);
    setAccessStatus(status);

    // Load chapters
    const chList = store.getComicChapters(comic.id);
    setChapters(chList);
  }, [comic, currentReader]);

  const is18Plus = comic.contentRating === '18plus';

  const handleChapterClick = (ch: Chapter) => {
    if (is18Plus && !accessStatus.allowed) {
      onOpenAuth();
      return;
    }
    onReadChapter(comic, ch);
  };

  return (
    <div className="min-h-screen bg-[#0d0f17] text-slate-100 pb-20">
      {/* Top Banner Cover Background */}
      <div className="relative h-64 sm:h-80 md:h-96 w-full overflow-hidden bg-slate-900">
        <img
          src={comic.bannerImage || comic.coverImage}
          alt={comic.title}
          className="w-full h-full object-cover blur-sm opacity-35 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f17] via-[#0d0f17]/80 to-transparent" />

        {/* Back Button */}
        <div className="absolute top-4 left-4 z-20">
          <button
            onClick={onBack}
            className="flex items-center gap-2 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 px-3.5 py-2 rounded-xl text-xs font-bold backdrop-blur-md shadow-lg transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 sm:-mt-40 relative z-20 space-y-8">
        {/* Header Grid: Cover & Metadata */}
        <div className="bg-[#131622] rounded-3xl p-5 sm:p-8 border border-slate-800 shadow-2xl flex flex-col md:flex-row gap-6 sm:gap-8 items-start">
          
          {/* Cover Poster */}
          <div className="w-full sm:w-56 md:w-64 shrink-0 rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700/60 relative aspect-[3/4] bg-slate-900 self-center md:self-start">
            <img
              src={comic.coverImage}
              alt={comic.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=800&auto=format&fit=crop';
              }}
            />
            {is18Plus && (
              <div className="absolute top-3 left-3 bg-red-600/95 text-white font-black text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-lg backdrop-blur-md">
                <Lock className="w-3 h-3" />
                18+ VIP ONLY
              </div>
            )}
          </div>

          {/* Metadata Block */}
          <div className="flex-1 space-y-4 w-full">
            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold uppercase px-2.5 py-0.5 rounded-lg">
                {comic.type}
              </span>
              <span className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-lg ${
                comic.status === 'Ongoing' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-blue-500/20 text-blue-300'
              }`}>
                {comic.status}
              </span>
              <span className="text-xs font-mono text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-lg border border-slate-700">
                {comic.totalChapters} Chapter
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
              {comic.title}
            </h1>

            {/* Story & Art Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[#191d2d] p-3 rounded-2xl border border-slate-800/80 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <User className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Story / Penulis: <strong className="text-slate-100 font-semibold">{comic.storyWriter || 'Unknown'}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Palette className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Art / Penggambar: <strong className="text-slate-100 font-semibold">{comic.artist || 'Unknown'}</strong></span>
              </div>
            </div>

            {/* Rating Box: 4.9 (18,450 rating) */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 px-3 py-1.5 rounded-xl text-amber-400 font-black text-sm">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{comic.rating.toFixed(1)}</span>
              </div>
              <div className="text-xs text-slate-400">
                <span className="font-semibold text-slate-200">({comic.ratingCount.toLocaleString()} rating)</span>
                <p className="text-[11px] text-slate-500">Berdasarkan vote pembaca aktif</p>
              </div>
            </div>

            {/* Clickable Genre Badges (Romance 18+, Drama Dewasa, Milf / Noona) */}
            <div className="space-y-1.5 pt-1">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Genre (Klik untuk filter):</p>
              <div className="flex flex-wrap gap-2">
                {comic.genres?.map((genre, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onSelectGenre(genre);
                      onBack();
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                      genre.toLowerCase().includes('18+') || genre.toLowerCase().includes('dewasa')
                        ? 'bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-800/60 hover:scale-105'
                        : 'bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-300 border border-slate-700/80 hover:scale-105'
                    }`}
                    title={`Klik untuk melihat semua komik bergenre ${genre}`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {/* Synopsis */}
            <div className="pt-2">
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {comic.synopsis}
              </p>
            </div>

            {/* Action Bar / Read First Chapter */}
            <div className="pt-3 flex flex-wrap items-center gap-3">
              {chapters.length > 0 && (
                <button
                  onClick={() => handleChapterClick(chapters[chapters.length - 1])}
                  className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-rose-950/40 transition-all"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Baca Chapter Pertama</span>
                </button>
              )}

              <button
                onClick={() => setIsBookmarked(!isBookmarked)}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 border transition-all ${
                  isBookmarked
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-rose-400' : ''}`} />
                <span>{isBookmarked ? 'Tersimpan di Favorit' : 'Tambah Favorit'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 18+ Access Protection Alert Box */}
        {is18Plus && (
          <div className={`rounded-2xl p-5 border transition-all ${
            accessStatus.allowed
              ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
              : 'bg-red-950/40 border-red-800/80 text-rose-200'
          }`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl mt-0.5 ${accessStatus.allowed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  {accessStatus.allowed ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm sm:text-base text-white">
                    {accessStatus.allowed ? 'Hak Akses 18+ Aktif' : 'Komik 18+ Terkunci'}
                  </h4>
                  <p className="text-xs text-slate-300">
                    {accessStatus.allowed
                      ? `Selamat datang ${currentReader?.username}! Anda memiliki hak akses membaca komik 18+ ini (${currentReader?.planType === 'plan_5k_single' ? 'Paket 5K Pilihan' : 'VIP All'}).`
                      : accessStatus.reason || 'Komik ini hanya dapat diakses dengan akun berbayar yang didaftarkan oleh admin.'}
                  </p>
                </div>
              </div>

              {!accessStatus.allowed && (
                <button
                  onClick={onOpenAuth}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-red-950/50 shrink-0"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Login / Beli Akses</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Chapter List */}
        <div className="bg-[#131622] rounded-3xl p-5 sm:p-7 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-rose-500" />
              <h3 className="font-bold text-base text-white">Daftar Chapter</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Total {chapters.length} Chapter
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
            {chapters.map((ch) => (
              <div
                key={ch.id}
                onClick={() => handleChapterClick(ch)}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  is18Plus && !accessStatus.allowed
                    ? 'bg-slate-900/50 border-slate-800/80 text-slate-500 hover:border-red-500/40'
                    : 'bg-[#181c2b] border-slate-800 hover:border-rose-500/60 hover:bg-[#1d2235] text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    is18Plus && !accessStatus.allowed
                      ? 'bg-slate-800 text-slate-500'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {ch.chapterNumber}
                  </div>
                  <div className="truncate">
                    <p className="font-semibold text-xs truncate">{ch.title}</p>
                    <p className="text-[10px] text-slate-500">{ch.releaseDate}</p>
                  </div>
                </div>

                <div className="shrink-0 ml-2">
                  {is18Plus && !accessStatus.allowed ? (
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                  ) : (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-semibold px-2 py-0.5 rounded border border-emerald-500/20">
                      BACA
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comment Section with Google Login */}
        <CommentSection
          comicId={comic.id}
          comicTitle={comic.title}
        />
      </div>
    </div>
  );
};
