import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { 
  Bookmark, 
  History, 
  BookOpen, 
  Trash2, 
  ChevronRight, 
  Play, 
  Clock, 
  Star,
  Lock
} from 'lucide-react';

export const LibraryView: React.FC = () => {
  const navigate = useNavigate();
  const { 
    bookmarks, 
    readingHistory, 
    comics, 
    chapters, 
    selectComic, 
    startReading, 
    toggleBookmark,
    currentUser,
    googleUser,
    openLoginModal
  } = useApp();

  const isUserAuthenticated = !!currentUser || !!googleUser;

  const [activeTab, setActiveTab] = useState<'bookmarks' | 'history'>('bookmarks');

  const bookmarkedComics = comics.filter(c => bookmarks.some(b => b.comicId === c.id));

  return (
    <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 pb-24 space-y-6 text-slate-100 animate-in fade-in pt-3 sm:pt-4">
      {/* Header */}
      <div>
        <h2 className="font-black text-xl sm:text-2xl text-white">Perpustakaan & Koleksi Saya</h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Akses cepat komik favorit yang disimpan dan riwayat membaca terakhirmu
        </p>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-[#15151e] rounded-2xl border border-[#242434] text-xs max-w-md">
        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`flex-1 py-2.5 font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'bookmarks' 
              ? 'bg-[#ff5b14] text-white shadow-md shadow-[#ff5b14]/25' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Koleksi Disimpan ({bookmarks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2.5 font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'history' 
              ? 'bg-[#ff5b14] text-white shadow-md shadow-[#ff5b14]/25' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Riwayat Baca ({readingHistory.length})</span>
        </button>
      </div>

      {/* Content */}
      {activeTab === 'bookmarks' ? (
        bookmarkedComics.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4.5">
            {bookmarkedComics.map(comic => {
              const chList = chapters[comic.id] || [];
              return (
                <div
                  key={comic.id}
                  onClick={() => {
                    selectComic(comic.id);
                    navigate(`/comic/${comic.slug || comic.id}`);
                  }}
                  className="bg-[#12121a] hover:bg-[#161622] border border-[#222232] hover:border-[#ff5b14]/50 rounded-2xl overflow-hidden cursor-pointer group flex flex-col justify-between transition-all duration-300 shadow-lg"
                >
                  <div className="relative aspect-[3/4] bg-[#181824] overflow-hidden">
                    <img 
                      src={comic.coverImage} 
                      alt={comic.title} 
                      referrerPolicy="no-referrer"
                      style={{ filter: !isUserAuthenticated ? 'blur(10px)' : 'none' }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />

                    {/* Sensor Blur Lock for Unauthenticated Visitors */}
                    {!isUserAuthenticated && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          openLoginModal('Daftar / Masuk dengan Akun Google untuk membuka sensor koleksi.');
                        }}
                        className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] p-2 text-center"
                      >
                        <Lock className="w-4 h-4 text-white drop-shadow-md" />
                        <span className="text-[8px] font-black text-white uppercase tracking-tighter mt-1 bg-red-600/90 px-1 py-0.2 rounded shadow">
                          18+ Sensor
                        </span>
                      </div>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark(comic.id);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-[#ff5b14] hover:bg-black transition-colors cursor-pointer z-10"
                      title="Hapus dari Bookmark"
                    >
                      <Bookmark className="w-3.5 h-3.5 fill-[#ff5b14]" />
                    </button>
                  </div>

                  <div className="p-3">
                    <h4 className="font-bold text-xs sm:text-sm text-white truncate group-hover:text-[#ff5b14] transition-colors">
                      {comic.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                      {comic.genres.slice(0, 2).join(' • ')}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 pt-2 border-t border-[#1e1e2d]">
                      <span>{chList.length} Chapter</span>
                      <span className="text-[#ff5b14] font-semibold flex items-center">
                        Buka <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center bg-[#12121a] rounded-2xl border border-[#222232] p-6 space-y-3">
            <Bookmark className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="font-bold text-base text-white">Belum Ada Komik yang Disimpan</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Simpan komik favoritmu dengan menekan tombol bookmark pada cover komik untuk membacanya nanti.
            </p>
          </div>
        )
      ) : (
        readingHistory.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {readingHistory.map((hist, index) => {
              const comic = comics.find(c => c.id === hist.comicId);
              if (!comic) return null;

              const chList = chapters[comic.id] || [];
              const readChapter = chList.find(ch => ch.id === hist.chapterId);
              const readDate = new Date(hist.updatedAt || Date.now()).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={`${hist.comicId}-${hist.chapterId}-${hist.updatedAt || index}`}
                  onClick={() => {
                    if (hist.chapterId) {
                      navigate(`/read/${comic.slug || comic.id}/${hist.chapterId}`);
                    } else {
                      navigate(`/comic/${comic.slug || comic.id}`);
                    }
                  }}
                  className="p-3 bg-[#12121a] hover:bg-[#161622] border border-[#222232] hover:border-[#ff5b14]/40 rounded-2xl flex gap-3.5 cursor-pointer group transition-all"
                >
                  <div className="relative w-16 h-22 rounded-xl overflow-hidden ring-1 ring-white/10 shrink-0 group-hover:scale-102 transition-transform bg-[#181824]">
                    <img 
                      src={comic.coverImage} 
                      alt={comic.title} 
                      referrerPolicy="no-referrer"
                      style={{ filter: !isUserAuthenticated ? 'blur(10px)' : 'none' }}
                      className="w-full h-full object-cover transition-all" 
                    />
                    {!isUserAuthenticated && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                        <Lock className="w-3.5 h-3.5 text-white drop-shadow" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-between flex-1 min-w-0">
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-white truncate group-hover:text-[#ff5b14] transition-colors">
                        {comic.title}
                      </h4>
                      <p className="text-[11px] text-[#ff7a3d] font-semibold mt-0.5">
                        Terakhir Dibaca: Ch. {hist.chapterNumber || readChapter?.chapterNumber || 1}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {readDate}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#1e1e2d] text-xs">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startReading(hist.chapterId);
                        }}
                        className="px-3 py-1 bg-[#ff5b14] hover:bg-[#e04e0e] text-white text-[11px] font-bold rounded-lg flex items-center gap-1 shadow transition-colors cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-white" /> Lanjut Baca
                      </button>
                      <span className="text-[10px] text-slate-400">
                        Hal {hist.pageNumber || 1}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center bg-[#12121a] rounded-2xl border border-[#222232] p-6 space-y-3">
            <History className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="font-bold text-base text-white">Riwayat Baca Masih Kosong</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Komik dan chapter yang kamu baca akan otomatis tersimpan di sini agar kamu bisa melanjutkan membaca kapan saja.
            </p>
          </div>
        )
      )}
    </div>
  );
};

export default LibraryView;
