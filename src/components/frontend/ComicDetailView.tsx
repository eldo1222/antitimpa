import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getSimilarComics } from '../../data/genres';
import { CommentSection } from '../CommentSection';
import { 
  ArrowLeft, 
  Share2, 
  Bookmark, 
  BookmarkCheck, 
  Star, 
  Clock, 
  BookOpen, 
  Lock, 
  Eye, 
  CheckCircle2, 
  Flame, 
  ArrowUpDown,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  Tag,
  Layers,
  ChevronRight,
  Unlock,
  Crown
} from 'lucide-react';
import { AdBanner } from './AdBanner';

export const ComicDetailView: React.FC = () => {
  const { 
    selectedComicId, 
    selectComic, 
    comics, 
    chapters, 
    currentUser, 
    startReading, 
    openLoginModal, 
    toggleBookmark, 
    isBookmarked,
    getReadingProgress,
    canUserReadComic,
    setActiveTab,
    navigateToGenre,
    triggerPopunder
  } = useApp();

  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [chapterSearch, setChapterSearch] = useState('');
  const [copiedLinkNotice, setCopiedLinkNotice] = useState(false);

  const comic = comics.find(c => c.id === selectedComicId);
  if (!comic) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-6 text-center text-slate-100">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400 mb-4 border border-slate-700">
          <BookOpen className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-white mb-1">Komik Tidak Ditemukan</h2>
        <p className="text-xs text-slate-400 max-w-xs mb-6 leading-relaxed">
          Komik yang Anda pilih mungkin telah diperbarui atau belum tersedia di daftar katalog.
        </p>
        <button
          onClick={() => {
            selectComic(null);
            setActiveTab('home');
          }}
          className="px-5 py-2.5 bg-[#ff5b14] hover:bg-[#e04e0e] text-white font-bold text-xs rounded-xl shadow-lg cursor-pointer transition-all active:scale-95 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </button>
      </div>
    );
  }

  const rawChaptersList = chapters[comic.id] || [];
  const chaptersList = [...rawChaptersList]
    .filter(ch => chapterSearch === '' || ch.title.toLowerCase().includes(chapterSearch.toLowerCase()) || String(ch.chapterNumber).includes(chapterSearch))
    .sort((a, b) => 
      sortOrder === 'desc' ? b.chapterNumber - a.chapterNumber : a.chapterNumber - b.chapterNumber
    );

  const readingProgress = getReadingProgress(comic.id);
  const bookmarked = isBookmarked(comic.id);

  // Check whether this comic is free/normal vs 18+ VIP
  const isNormalComic = comic.contentType === 'normal' || comic.isFree === true;

  // Similar genre comics recommendation
  const similarComics = getSimilarComics(comic, comics, 4);

  // Check access permissions
  const accessCheck = canUserReadComic(comic.id, currentUser);
  const isAccessAllowed = isNormalComic || accessCheck.allowed;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: comic.title,
        text: `Baca komik "${comic.title}" di AntiTimpa!`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      setCopiedLinkNotice(true);
      setTimeout(() => setCopiedLinkNotice(false), 2000);
    }
  };

  const handleStartReadCTA = () => {
    if (!isNormalComic && !currentUser) {
      openLoginModal('🔒 Komik 18+ VIP: Silakan login dengan akun VIP Anda untuk mulai membaca chapter.');
      return;
    }

    if (!isAccessAllowed) {
      openLoginModal(`🔒 ${accessCheck.message || 'Akses dibatasi untuk paket akun Anda.'}`);
      return;
    }

    if (readingProgress) {
      triggerPopunder();
      startReading(readingProgress.chapterId);
    } else if (rawChaptersList.length > 0) {
      const ch1 = rawChaptersList.find(c => c.chapterNumber === 1) || rawChaptersList[rawChaptersList.length - 1];
      triggerPopunder();
      startReading(ch1.id);
    }
  };

  const handleChapterClick = (chapterId: string) => {
    if (!isNormalComic && !currentUser) {
      openLoginModal('🔒 Komik 18+ VIP: Silakan login dengan akun VIP Anda.');
      return;
    }
    if (!isAccessAllowed) {
      openLoginModal(`🔒 ${accessCheck.message || 'Akses dibatasi untuk paket akun Anda.'}`);
      return;
    }
    triggerPopunder();
    startReading(chapterId);
  };

  return (
    <div className="min-h-screen pb-24 text-slate-100 animate-in fade-in">
      {/* Top Floating Action Bar */}
      <div className="sticky top-0 z-30 bg-[#0f0f14]/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3 border-b border-[#222232]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => selectComic(null)}
            className="p-2 -ml-1 text-slate-300 hover:text-white rounded-xl hover:bg-white/5 active:scale-95 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Katalog</span>
          </button>

          <span className="text-xs font-bold text-slate-200 max-w-[240px] sm:max-w-md truncate">
            {comic.title}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/5 transition-colors relative cursor-pointer"
              title="Bagikan Komik"
            >
              <Share2 className="w-4 h-4" />
              {copiedLinkNotice && (
                <span className="absolute -bottom-7 right-0 text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded shadow whitespace-nowrap">
                  Link Disalin!
                </span>
              )}
            </button>

            <button
              onClick={() => toggleBookmark(comic.id)}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                bookmarked ? 'text-[#ff5b14] bg-[#ff5b14]/15' : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
              title="Simpan ke Bookmark"
            >
              {bookmarked ? <BookmarkCheck className="w-4 h-4 fill-[#ff5b14]" /> : <Bookmark className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Hero Backdrop Banner */}
      <div className="relative h-64 sm:h-80 lg:h-96 w-full overflow-hidden bg-[#12121a]">
        <img 
          src={comic.bannerImage || comic.coverImage} 
          alt={comic.title} 
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover filter blur-sm brightness-40 scale-105" 
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090d] via-[#09090d]/80 to-transparent" />
      </div>

      {/* Main Comic Details in Responsive Grid (Left 4 cols, Right 8 cols on Desktop) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 sm:-mt-44 relative z-10 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* LEFT COLUMN: Cover Image, Meta, Access Card & CTAs */}
          <div className="lg:col-span-4 space-y-4">
            {/* Main Cover Card */}
            <div className="bg-[#12121a] rounded-2xl border border-[#222232] p-4 shadow-2xl space-y-4">
              <div className="aspect-[3/4] w-full rounded-xl overflow-hidden shadow-2xl border-2 border-[#2b2b3d] bg-[#161622] relative group">
                <img 
                  src={comic.coverImage} 
                  alt={comic.title} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=800&auto=format&fit=crop';
                  }}
                />

                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shadow backdrop-blur-md border ${
                    comic.status === 'ongoing' ? 'bg-emerald-500/80 text-white border-emerald-400/40' : 'bg-purple-500/80 text-white border-purple-400/40'
                  }`}>
                    {comic.status === 'ongoing' ? '🟢 Ongoing' : '🟣 Tamat'}
                  </span>
                </div>

                <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/80 backdrop-blur-sm text-xs font-bold text-amber-300 flex items-center gap-1 border border-white/10">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {typeof comic.rating === 'number' ? comic.rating.toFixed(1) : '4.8'}
                </div>
              </div>

              {/* Story / Art Metadata */}
              <div className="space-y-1.5 text-xs text-slate-300 pt-1 border-t border-[#1f1f2e]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Penulis (Story):</span>
                  <span className="font-semibold text-white truncate max-w-[160px]">{comic.storyWriter || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ilustrator (Art):</span>
                  <span className="font-semibold text-white truncate max-w-[160px]">{comic.artist || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tipe Komik:</span>
                  <span className="font-semibold text-[#ff7a3d] uppercase">{comic.comicType || comic.type || 'Manga'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Chapter:</span>
                  <span className="font-semibold text-white">{rawChaptersList.length} Ch.</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Pembaca:</span>
                  <span className="font-semibold text-white">{comic.totalReaders?.toLocaleString() || 0}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-[#1f1f2e]">
                {isNormalComic ? (
                  <button
                    onClick={handleStartReadCTA}
                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>
                      {readingProgress 
                        ? `Lanjut Baca Ch. ${readingProgress.chapterNumber}` 
                        : `Mulai Baca Ch. 1`}
                    </span>
                  </button>
                ) : currentUser ? (
                  isAccessAllowed ? (
                    <button
                      onClick={handleStartReadCTA}
                      className="w-full py-3 px-4 bg-gradient-to-r from-[#ff5b14] to-[#f97316] hover:opacity-95 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-[#ff5b14]/30 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>
                        {readingProgress 
                          ? `Lanjut Baca Ch. ${readingProgress.chapterNumber}` 
                          : `Mulai Baca Ch. 1`}
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={() => openLoginModal(`🔒 Upgrade ke Paket Rp 15.000 (VIP All Access) untuk membaca komik "${comic.title}"!`)}
                      className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all hover:opacity-90 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-black" />
                      <span>Info Upgrade ke Paket 15k</span>
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => openLoginModal('🔒 Anda harus login akun VIP untuk membaca seluruh chapter komik 18+ ini.')}
                    className="w-full py-3 px-4 bg-gradient-to-r from-[#ff5b14] to-[#f95700] hover:opacity-95 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-[#ff5b14]/30 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Login VIP untuk Membaca</span>
                  </button>
                )}

                <button
                  onClick={() => toggleBookmark(comic.id)}
                  className={`w-full py-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    bookmarked 
                      ? 'bg-[#ff5b14]/15 border-[#ff5b14]/40 text-[#ff5b14]' 
                      : 'bg-[#181824] border-[#29293c] text-slate-300 hover:text-white'
                  }`}
                >
                  {bookmarked ? (
                    <>
                      <BookmarkCheck className="w-4 h-4 fill-[#ff5b14]" />
                      <span>Tersimpan di Koleksi</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4" />
                      <span>Simpan ke Bookmark</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Similar Comics in Left Sidebar */}
            {similarComics.length > 0 && (
              <div className="bg-[#12121a] rounded-2xl border border-[#222232] p-4 space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                    <Sparkles className="w-3.5 h-3.5 text-[#ff5b14]" />
                    <span>Rekomendasi Serupa</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {similarComics.slice(0, 3).map((sComic) => (
                    <div
                      key={sComic.id}
                      onClick={() => {
                        selectComic(sComic.id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="p-2 rounded-xl bg-[#181824] hover:bg-[#20202e] border border-[#27273a] flex items-center gap-2.5 cursor-pointer group transition-all"
                    >
                      <img 
                        src={sComic.coverImage} 
                        alt={sComic.title} 
                        referrerPolicy="no-referrer"
                        className="w-10 h-13 rounded-lg object-cover shrink-0" 
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs text-white truncate group-hover:text-[#ff5b14]">
                          {sComic.title}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {sComic.genres.slice(0, 2).join(', ')}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-[#ff5b14] shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Title, Genre Pills, Synopsis, Chapters & Comments */}
          <div className="lg:col-span-8 space-y-5">
            {/* Ad Banner: Atas Detail Komik */}
            <AdBanner position="detail_top" />

            {/* Header Title & Tags */}
            <div className="bg-[#12121a] rounded-2xl border border-[#222232] p-5 sm:p-6 shadow-xl space-y-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                    comic.contentType === '18plus' 
                      ? 'bg-rose-950/80 text-rose-300 border-rose-500/40' 
                      : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                  }`}>
                    {comic.contentType === '18plus' ? '🔞 18+ VIP DEWASA' : '🌟 SEMUA UMUR / GRATIS'}
                  </span>

                  {currentUser && isAccessAllowed && (
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Akses Terbuka
                    </span>
                  )}
                </div>

                <h1 className="font-black text-2xl sm:text-3xl text-white tracking-tight leading-tight">
                  {comic.title}
                </h1>
              </div>

              {/* Genre Pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(comic.genres || []).map(g => (
                  <button 
                    key={g} 
                    onClick={() => navigateToGenre(g)}
                    className="px-3 py-1 rounded-xl text-xs font-semibold bg-[#181824] hover:bg-[#ff5b14] hover:text-white text-slate-300 border border-[#28283a] hover:border-[#ff5b14] transition-all cursor-pointer shadow-sm active:scale-95"
                    title={`Jelajahi komik bergenre ${g}`}
                  >
                    {g}
                  </button>
                ))}
              </div>

              {/* Synopsis Block */}
              <div className="pt-3 border-t border-[#1f1f2e] space-y-2">
                <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                  <span>Sinopsis Lengkap</span>
                </h3>
                <p className={`text-xs sm:text-sm text-slate-300 leading-relaxed ${isSynopsisExpanded ? '' : 'line-clamp-3'}`}>
                  {comic.synopsis}
                </p>
                <button
                  onClick={() => setIsSynopsisExpanded(!isSynopsisExpanded)}
                  className="text-xs font-bold text-[#ff5b14] hover:underline pt-1 cursor-pointer"
                >
                  {isSynopsisExpanded ? 'Sembunyikan Sinopsis' : 'Baca Selengkapnya...'}
                </button>
              </div>
            </div>

            {/* Chapters Section */}
            <div className="bg-[#12121a] rounded-2xl border border-[#222232] p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1f1f2e]">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-base sm:text-lg text-white">Daftar Chapter</h3>
                  <span className="text-xs text-slate-400 font-bold bg-[#1c1c28] px-2 py-0.5 rounded-md border border-[#2a2a3c]">
                    {rawChaptersList.length} Chapter
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={chapterSearch}
                    onChange={(e) => setChapterSearch(e.target.value)}
                    placeholder="Cari chapter #..."
                    className="px-3 py-1.5 bg-[#171722] border border-[#28283c] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14] w-36"
                  />

                  <button
                    onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    className="px-3 py-1.5 bg-[#171722] border border-[#28283c] rounded-xl text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 text-[#ff5b14]" />
                    <span className="hidden sm:inline">{sortOrder === 'desc' ? 'Terbaru' : 'Terlama'}</span>
                  </button>
                </div>
              </div>

              {/* Chapters List */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {chaptersList.map((chapter) => {
                  const isCurrentReading = readingProgress?.chapterId === chapter.id;

                  return (
                    <div
                      key={chapter.id}
                      onClick={() => handleChapterClick(chapter.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                        isCurrentReading 
                          ? 'bg-[#ff5b14]/10 border-[#ff5b14]/40 shadow-sm' 
                          : 'bg-[#171722] hover:bg-[#1f1f2e] border-[#252538]'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-2">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                          isCurrentReading 
                            ? 'bg-[#ff5b14] text-white shadow-md shadow-[#ff5b14]/30' 
                            : 'bg-[#222232] text-slate-300 group-hover:bg-[#ff5b14] group-hover:text-white transition-colors'
                        }`}>
                          #{chapter.chapterNumber}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs sm:text-sm text-slate-200 truncate group-hover:text-[#ff5b14] transition-colors" title={chapter.title}>
                              {chapter.title}
                            </h4>
                            {chapter.mangadexChapterId && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                                MangaDex
                              </span>
                            )}
                            {chapter.isNew && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-[#ff5b14] text-white uppercase shrink-0">
                                NEW
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                            <span>{chapter.releaseDate}</span>
                            <span>•</span>
                            {chapter.sourceType === 'drive' ? (
                              <span className="text-blue-400 font-semibold">Google Drive</span>
                            ) : chapter.sourceType === 'pdf' ? (
                              <span className="text-red-400 font-semibold">Dokumen PDF</span>
                            ) : (
                              <span>{chapter.pages?.length || 8} Halaman Gambar</span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isCurrentReading && (
                          <span className="text-[10px] font-bold text-[#ff5b14] bg-[#ff5b14]/15 px-2.5 py-0.5 rounded-full hidden sm:inline">
                            Sedang Dibaca
                          </span>
                        )}

                        {currentUser ? (
                          isAccessAllowed ? (
                            <BookOpen className="w-4 h-4 text-slate-400 group-hover:text-[#ff5b14] transition-colors" />
                          ) : (
                            <Lock className="w-4 h-4 text-blue-400" />
                          )
                        ) : (
                          <Lock className="w-4 h-4 text-amber-500/80" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ad Banner: Bawah Daftar Chapter */}
            <AdBanner position="detail_bottom" />

            {/* Threaded Comment Section */}
            <div className="bg-[#12121a] rounded-2xl border border-[#222232] p-5 sm:p-6 shadow-xl">
              <CommentSection comicId={comic.id} comicTitle={comic.title} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComicDetailView;
