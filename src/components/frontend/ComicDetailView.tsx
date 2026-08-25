import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getSimilarComics } from '../../data/genres';
import { 
  Star, 
  BookOpen, 
  Bookmark, 
  BookmarkCheck, 
  ArrowLeft, 
  Share2, 
  Sparkles, 
  Clock, 
  Layers, 
  Eye, 
  Lock, 
  Unlock, 
  ShieldCheck, 
  ChevronRight,
  ArrowUpDown,
  Tag,
  Globe,
  ExternalLink,
  Tv
} from 'lucide-react';
import { CommentSection } from '../CommentSection';
import { AdBanner } from './AdBanner';
import { WhereToReadModal } from '../common/WhereToReadModal';
import { Chapter } from '../../types';

export const ComicDetailView: React.FC = () => {
  const { comicId } = useParams<{ comicId: string }>();
  const navigate = useNavigate();
  const { 
    comics, 
    chapters, 
    selectComic, 
    toggleBookmark, 
    isBookmarked,
    readingHistory,
    currentUser,
    googleUser,
    openLoginModal,
    startReading,
    canUserReadComic,
    navigateToGenre
  } = useApp();

  const isUserAuthenticated = !!currentUser || !!googleUser;

  // Resolve comic by ID or slug
  const comic = comics.find(c => c.id === comicId || c.slug === comicId);

  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
  const [chapterSearch, setChapterSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [copiedLinkNotice, setCopiedLinkNotice] = useState(false);

  // Where to Read / Watch Modal State (MAL Style Gateway)
  const [isWhereToReadOpen, setIsWhereToReadOpen] = useState(false);
  const [selectedGatewayChapter, setSelectedGatewayChapter] = useState<Chapter | null>(null);

  // Scroll to top upon opening
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [comicId]);

  if (!comic) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center text-slate-100">
        <div className="w-16 h-16 rounded-2xl bg-[#1a1a26] border border-[#2e2e42] flex items-center justify-center text-slate-400 mb-4 text-2xl">
          📖
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Komik Tidak Ditemukan</h2>
        <p className="text-xs text-slate-400 max-w-sm mb-6">
          Komik yang Anda cari mungkin telah diubah judulnya atau dinonaktifkan oleh admin.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2.5 bg-[#ff5b14] hover:bg-[#e04e0e] text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
        >
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  const rawChaptersList: Chapter[] = chapters[comic.id] || [];
  
  // Sort and filter chapters
  const chaptersList = [...rawChaptersList]
    .filter(ch => {
      if (!chapterSearch.trim()) return true;
      return ch.title.toLowerCase().includes(chapterSearch.toLowerCase()) ||
             ch.chapterNumber.toString().includes(chapterSearch);
    })
    .sort((a, b) => {
      if (sortOrder === 'desc') {
        return b.chapterNumber - a.chapterNumber;
      }
      return a.chapterNumber - b.chapterNumber;
    });

  const bookmarked = isBookmarked(comic.id);
  const readingProgress = readingHistory.find(r => r.comicId === comic.id);

  // Check read access
  const accessCheck = canUserReadComic(comic.id, currentUser);
  const isAccessAllowed = accessCheck.allowed;

  // Similar Comics based on tags (deduplicated)
  const similarComics = getSimilarComics(comic, comics, 6);

  // Check if series has external sources / gateway links
  const hasExternalSources = 
    (comic.externalLinks && comic.externalLinks.length > 0) || 
    (comic.whereToRead && comic.whereToRead.length > 0) || 
    !!comic.sourceUrl || 
    !!comic.mangaDexId ||
    rawChaptersList.some(ch => ch.sourceType === 'external' || !!ch.externalUrl);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLinkNotice(true);
      setTimeout(() => setCopiedLinkNotice(false), 2500);
    }
  };

  const openWhereToRead = (targetChapter?: Chapter | null) => {
    setSelectedGatewayChapter(targetChapter || null);
    setIsWhereToReadOpen(true);
  };

  const handleChapterClick = (chapter: Chapter) => {
    // If chapter is an external link, open the Where to Read gateway modal immediately
    if (chapter.sourceType === 'external' || chapter.externalUrl || (chapter.externalSources && chapter.externalSources.length > 0)) {
      openWhereToRead(chapter);
      return;
    }

    if (!currentUser) {
      openLoginModal('🔒 Anda harus masuk/login akun terlebih dahulu untuk mulai membaca.');
      return;
    }

    if (!isAccessAllowed) {
      openLoginModal(`🔒 ${accessCheck.message || 'Komik ini hanya tersedia untuk paket akun VIP AntiTimpa.'}`);
      return;
    }

    startReading(chapter.id);
    navigate(`/read/${comic.id}/${chapter.id}`);
  };

  return (
    <div className="min-h-screen pb-24 text-slate-100 animate-in fade-in">
      {/* Where to Read / Watch Modal */}
      <WhereToReadModal
        isOpen={isWhereToReadOpen}
        onClose={() => setIsWhereToReadOpen(false)}
        comic={comic}
        chapter={selectedGatewayChapter}
      />

      {/* Top Floating Action Bar */}
      <div className="sticky top-0 z-30 bg-[#0f0f14]/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3 border-b border-[#222232]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => {
              selectComic(null);
              navigate(-1);
            }}
            className="p-2 -ml-1 text-slate-300 hover:text-white rounded-xl hover:bg-white/5 active:scale-95 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
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
          className="w-full h-full object-cover filter blur-md brightness-30 scale-105" 
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
                  style={{ filter: !isUserAuthenticated ? 'blur(10px)' : 'none' }}
                  className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
                    !isUserAuthenticated ? 'scale-110 brightness-75' : ''
                  }`} 
                />

                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shadow backdrop-blur-md border ${
                    comic.status === 'ongoing' ? 'bg-emerald-500/80 text-white border-emerald-400/40' : 'bg-purple-500/80 text-white border-purple-400/40'
                  }`}>
                    {comic.status === 'ongoing' ? '🟢 Ongoing' : '🟣 Tamat'}
                  </span>
                </div>

                {!isUserAuthenticated && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 text-center">
                    <div className="p-3 rounded-full bg-[#ff5b14]/20 border border-[#ff5b14]/40 text-[#ff5b14] mb-2">
                      <Lock className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-black text-white">Sensor Blur Aktif</span>
                    <span className="text-[10px] text-slate-300 mt-1">Masuk untuk melihat cover & membaca</span>
                  </div>
                )}

                <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/80 backdrop-blur-sm text-xs font-bold text-amber-300 flex items-center gap-1 border border-white/10">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {typeof comic.rating === 'number' ? comic.rating.toFixed(1) : '4.8'}
                </div>
              </div>

              {/* Story / Art Metadata */}
              <div className="space-y-1.5 text-xs text-slate-300 pt-1 border-t border-[#1f1f2e]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Penulis (Story):</span>
                  <span className="font-semibold text-white truncate max-w-[160px]">{comic.storyWriter || comic.author || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ilustrator (Art):</span>
                  <span className="font-semibold text-white truncate max-w-[160px]">{comic.artist || comic.author || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tipe Komik:</span>
                  <span className="font-semibold text-[#ff7a3d] uppercase">{comic.comicType || comic.type || 'Manga'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Pembaca:</span>
                  <span className="font-semibold text-slate-200">{(comic.totalReaders || 0).toLocaleString()} Kali</span>
                </div>
              </div>

              {/* Action Buttons: Baca Sekarang / Lanjut Baca / Where to Read */}
              <div className="space-y-2 pt-2 border-t border-[#1f1f2e]">
                {rawChaptersList.length === 0 ? (
                  <button
                    onClick={() => openWhereToRead(null)}
                    className="w-full py-3 px-4 bg-gradient-to-r from-[#ff5b14] to-[#f97316] hover:opacity-95 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-[#ff5b14]/30 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
                  >
                    <Globe className="w-4 h-4" />
                    <span>Where to Read & Watch (Penyedia Link)</span>
                  </button>
                ) : currentUser ? (
                  isAccessAllowed ? (
                    <button
                      onClick={() => {
                        const targetCh = rawChaptersList.find(c => c.id === readingProgress?.chapterId) || rawChaptersList[0];
                        if (targetCh) {
                          handleChapterClick(targetCh);
                        }
                      }}
                      className="w-full py-3 px-4 bg-gradient-to-r from-[#ff5b14] to-[#f97316] hover:opacity-95 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-[#ff5b14]/30 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
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
                    <span>Login untuk Membaca</span>
                  </button>
                )}

                {/* Where to Read Secondary Gateway Button (MAL Style) */}
                {hasExternalSources && (
                  <button
                    onClick={() => openWhereToRead(null)}
                    className="w-full py-2.5 rounded-xl border border-[#ff5b14]/40 bg-[#ff5b14]/10 hover:bg-[#ff5b14]/20 text-[#ff7a3d] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Where to Watch / Read (Sumber Mitra)</span>
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
          </div>

          {/* RIGHT COLUMN: Title, Genre Pills, Synopsis, Chapters */}
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

                {rawChaptersList.length > 0 && (
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
                )}
              </div>

              {/* If 0 local chapters exist (e.g. from Jikan / MAL API Scrape) */}
              {rawChaptersList.length === 0 ? (
                <div className="p-6 bg-[#161622] rounded-xl border border-[#28283c] text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#ff5b14]/20 border border-[#ff5b14]/40 flex items-center justify-center text-[#ff5b14] mx-auto">
                    <Globe className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 max-w-md mx-auto">
                    <h4 className="font-extrabold text-sm sm:text-base text-white">
                      Direktori Portal & Where to Read (Model MAL)
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Judul ini terindeks di AntiTimpa sebagai direktori penyedia link. Klik tombol di bawah untuk memilih platform resmi, partner, dan scanlation yang menyediakan komik/anime ini.
                    </p>
                  </div>
                  <button
                    onClick={() => openWhereToRead(null)}
                    className="px-6 py-2.5 bg-gradient-to-r from-[#ff5b14] to-[#f97316] hover:opacity-95 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 mx-auto transition-all active:scale-95 cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Buka Platform Penyedia (Where to Read & Watch)</span>
                  </button>
                </div>
              ) : (
                /* Chapters List */
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {chaptersList.map((chapter) => {
                    const isCurrentReading = readingProgress?.chapterId === chapter.id;
                    const isExternalChapter = chapter.sourceType === 'external' || !!chapter.externalUrl || (chapter.externalSources && chapter.externalSources.length > 0);

                    return (
                      <div
                        key={chapter.id}
                        onClick={() => handleChapterClick(chapter)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                          isCurrentReading 
                            ? 'bg-[#ff5b14]/10 border-[#ff5b14]/40 shadow-sm' 
                            : isExternalChapter
                            ? 'bg-[#181826] hover:bg-[#202034] border-[#2f2f45]'
                            : 'bg-[#171722] hover:bg-[#1f1f2e] border-[#252538]'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-2">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                            isCurrentReading 
                              ? 'bg-[#ff5b14] text-white shadow-md shadow-[#ff5b14]/30' 
                              : isExternalChapter
                              ? 'bg-gradient-to-br from-pink-600/30 to-purple-600/30 text-pink-300 border border-pink-500/30'
                              : 'bg-[#222232] text-slate-300 group-hover:bg-[#ff5b14] group-hover:text-white transition-colors'
                          }`}>
                            #{chapter.chapterNumber}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-xs sm:text-sm text-slate-200 truncate group-hover:text-[#ff5b14] transition-colors" title={chapter.title}>
                                {chapter.title}
                              </h4>
                              {isExternalChapter && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-pink-500/20 text-pink-300 border border-pink-500/40 shrink-0 flex items-center gap-0.5">
                                  <Globe className="w-2.5 h-2.5" />
                                  <span>{chapter.externalPlatform || 'Link Eksternal'}</span>
                                </span>
                              )}
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
                              {isExternalChapter ? (
                                <span className="text-pink-400 font-semibold">Where to Read Gateway ↗</span>
                              ) : chapter.sourceType === 'drive' ? (
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

                          {isExternalChapter ? (
                            <div className="p-1.5 rounded-lg bg-pink-500/10 text-pink-400 group-hover:bg-pink-500 group-hover:text-white transition-colors">
                              <ExternalLink className="w-4 h-4" />
                            </div>
                          ) : currentUser ? (
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
              )}
            </div>

            {/* Ad Banner: Bawah Daftar Chapter */}
            <AdBanner position="detail_bottom" />

            {/* Threaded Comment Section */}
            <div className="bg-[#12121a] rounded-2xl border border-[#222232] p-5 sm:p-6 shadow-xl">
              <CommentSection comicId={comic.id} comicTitle={comic.title} />
            </div>

            {/* 🌟 REKOMENDASI KOMIK SERUPA (Ditaruh di Bagian Bawah Kolom Komentar) */}
            {similarComics.length > 0 && (
              <div className="bg-[#12121a] rounded-2xl border border-[#222232] p-5 sm:p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-[#1f1f2e]">
                  <div className="flex items-center gap-2 font-black text-sm sm:text-base text-white">
                    <Sparkles className="w-4 h-4 text-[#ff5b14]" />
                    <span>Rekomendasi Komik Serupa</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    Berdasarkan kesamaan genre & tag
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {similarComics.map((sComic) => (
                    <div
                      key={sComic.id}
                      onClick={() => {
                        selectComic(sComic.id);
                        navigate(`/comic/${sComic.slug || sComic.id}`);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="bg-[#171724] hover:bg-[#1f1f2e] rounded-xl overflow-hidden border border-[#27273a] hover:border-[#ff5b14]/50 cursor-pointer group transition-all flex flex-col justify-between"
                    >
                      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#181824]">
                        <img 
                          src={sComic.coverImage} 
                          alt={sComic.title} 
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          style={{ filter: !isUserAuthenticated ? 'blur(10px)' : 'none' }}
                          className={`w-full h-full object-cover group-hover:scale-105 transition-transform ${
                            !isUserAuthenticated ? 'scale-110' : ''
                          }`} 
                        />
                        <div className="absolute bottom-1 left-1 px-1.5 py-0.2 rounded bg-black/70 text-[9px] font-bold text-amber-400 flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-amber-400" />
                          {sComic.rating ? sComic.rating.toFixed(1) : '4.8'}
                        </div>
                      </div>
                      <div className="p-2">
                        <h5 className="font-bold text-xs text-white truncate group-hover:text-[#ff5b14]">
                          {sComic.title}
                        </h5>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {sComic.genres.slice(0, 2).join(', ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComicDetailView;
