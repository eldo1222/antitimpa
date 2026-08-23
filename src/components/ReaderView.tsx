import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Lock, 
  BookOpen, 
  MessageSquare, 
  Maximize2, 
  Minimize2,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { Comic, Chapter, UserAccount, GoogleUser } from '../types';
import { store } from '../services/store';
import { CommentSection } from './CommentSection';

interface ReaderViewProps {
  comic: Comic;
  chapter: Chapter;
  onBack: () => void;
  onChangeChapter: (newChapter: Chapter) => void;
  onOpenAuth: () => void;
  currentReader: UserAccount | null;
  currentGoogleUser: GoogleUser | null;
  onLoginGoogle: () => void;
  onLogoutGoogle: () => void;
}

export const ReaderView: React.FC<ReaderViewProps> = ({
  comic,
  chapter,
  onBack,
  onChangeChapter,
  onOpenAuth,
  currentReader,
  currentGoogleUser,
  onLoginGoogle,
  onLogoutGoogle,
}) => {
  const [access, setAccess] = useState<{ allowed: boolean; reason?: string }>({ allowed: true });
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);

  useEffect(() => {
    const chs = store.getComicChapters(comic.id);
    setAllChapters(chs);
    const accessCheck = store.canAccess18PlusComic(comic.id);
    setAccess(accessCheck);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [comic, chapter, currentReader]);

  const currentIndex = allChapters.findIndex((c) => c.id === chapter.id);
  const prevChapter = currentIndex < allChapters.length - 1 ? allChapters[currentIndex + 1] : null;
  const nextChapter = currentIndex > 0 ? allChapters[currentIndex - 1] : null;

  // Mock comic reader images (High quality webtoon panel stripes)
  const defaultPages = [
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?q=80&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=1000&auto=format&fit=crop',
  ];

  const pages = chapter.pages && chapter.pages.length > 0 ? chapter.pages : defaultPages;

  if (comic.contentRating === '18plus' && !access.allowed) {
    return (
      <div className="min-h-screen bg-[#0b0d14] flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-[#131622] rounded-3xl p-8 border border-red-900/50 shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Akses Komik 18+ Dibatasi</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              {access.reason || 'Komik ini adalah konten 18+ khusus pengguna berbayar.'}
            </p>
          </div>

          {currentReader && currentReader.planType === 'plan_5k_single' && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-left text-xs text-amber-300">
              <p className="font-bold">Paket 5K Anda (1 Komik Terpilih):</p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Komik terpilih Anda saat ini berbeda dari komik ini. Silakan hubungi admin untuk mengganti komik pilihan atau upgrade ke VIP All.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={onOpenAuth}
              className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-950/50 transition-all"
            >
              Login Akun Pembaca Berbayar
            </button>
            <button
              onClick={onBack}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all"
            >
              Kembali ke Detail Komik
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080c] text-slate-100 flex flex-col">
      {/* Sticky Reader Header */}
      <header className="sticky top-0 z-40 bg-[#0d0f17]/95 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 shadow-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/80 px-3 py-1.5 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Detail</span>
          </button>

          <div className="text-center truncate flex-1">
            <h2 className="font-bold text-xs sm:text-sm text-slate-100 truncate">{comic.title}</h2>
            <p className="text-[11px] text-rose-400 font-medium truncate">{chapter.title}</p>
          </div>

          {/* Chapter selector */}
          <div className="flex items-center gap-1.5">
            <button
              disabled={!prevChapter}
              onClick={() => prevChapter && onChangeChapter(prevChapter)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Chapter Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <select
              value={chapter.id}
              onChange={(e) => {
                const sel = allChapters.find((c) => c.id === e.target.value);
                if (sel) onChangeChapter(sel);
              }}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none"
            >
              {allChapters.map((c) => (
                <option key={c.id} value={c.id}>
                  Ch. {c.chapterNumber}
                </option>
              ))}
            </select>

            <button
              disabled={!nextChapter}
              onClick={() => nextChapter && onChangeChapter(nextChapter)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Chapter Selanjutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Comic Page Vertical Stream (Webtoon Scroll) */}
      <main className="flex-1 max-w-3xl w-full mx-auto bg-black flex flex-col items-center shadow-2xl">
        {pages.map((imgUrl, idx) => (
          <div key={idx} className="w-full relative">
            <img
              src={imgUrl}
              alt={`Page ${idx + 1}`}
              loading="lazy"
              className="w-full h-auto block select-none"
            />
            <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-slate-400 font-mono">
              Halaman {idx + 1} / {pages.length}
            </div>
          </div>
        ))}
      </main>

      {/* Bottom Chapter Navigation Bar */}
      <div className="bg-[#0f121d] border-t border-slate-800 py-6 px-4">
        <div className="max-w-xl mx-auto space-y-4 text-center">
          <p className="text-xs text-slate-400">
            Anda telah selesai membaca <strong className="text-slate-200">{chapter.title}</strong>
          </p>

          <div className="flex items-center justify-center gap-3">
            {prevChapter && (
              <button
                onClick={() => onChangeChapter(prevChapter)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Chapter Sebelumnya</span>
              </button>
            )}

            {nextChapter ? (
              <button
                onClick={() => onChangeChapter(nextChapter)}
                className="px-5 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-lg shadow-rose-950/40 transition-all"
              >
                <span>Lanjut Chapter Berikutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                Ini adalah chapter paling baru!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Discussion & Comments Area */}
      <div className="max-w-4xl w-full mx-auto p-4 sm:p-6 pb-20">
        <CommentSection
          comicId={comic.id}
          comicTitle={`${comic.title} (${chapter.title})`}
        />
      </div>
    </div>
  );
};
