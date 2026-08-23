import React, { useState, useEffect } from 'react';
import { 
  Star, 
  BookOpen, 
  Lock, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  User, 
  Palette 
} from 'lucide-react';
import { Comic } from '../types';

interface HeroSliderProps {
  comics: Comic[];
  onSelectComic: (comic: Comic) => void;
  onSelectGenre: (genre: string) => void;
}

export const HeroSlider: React.FC<HeroSliderProps> = ({
  comics,
  onSelectComic,
  onSelectGenre,
}) => {
  const featuredComics = comics.filter((c) => (c.isFeatured || c.isTrending) && c.isVisibleOnHome !== false && c.showOnHome !== false).slice(0, 5);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (featuredComics.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredComics.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [featuredComics.length]);

  if (featuredComics.length === 0) return null;

  const current = featuredComics[currentIndex];
  if (!current) return null;

  const is18Plus = current.contentType === '18plus' || current.contentRating === '18plus';
  const ratingVal = typeof current.rating === 'number' ? current.rating.toFixed(1) : '4.8';
  const ratingCountVal = typeof current.ratingCount === 'number' ? current.ratingCount.toLocaleString() : '1,250';
  const comicGenres = Array.isArray(current.genres) ? current.genres : [];
  const typeLabel = (current.comicType || current.type || 'manga').toUpperCase();

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-[#111420] border border-slate-800 shadow-2xl">
      {/* Background Banner with Gradient */}
      <div className="relative h-[340px] sm:h-[400px] w-full overflow-hidden">
        <img
          src={current.bannerImage || current.coverImage}
          alt={current.title}
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80';
          }}
          className="w-full h-full object-cover object-top filter blur-sm scale-105 opacity-40 transition-all duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111420] via-[#111420]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#111420] via-[#111420]/90 to-transparent" />

        {/* Slide Content */}
        <div className="absolute inset-0 p-6 sm:p-10 flex flex-col sm:flex-row items-center sm:items-end gap-6 z-10">
          
          {/* Cover Thumbnail */}
          <div 
            onClick={() => onSelectComic(current)}
            className="hidden sm:block w-36 md:w-44 shrink-0 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700/80 cursor-pointer group relative"
          >
            <img
              src={current.coverImage}
              alt={current.title}
              referrerPolicy="no-referrer"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=800&auto=format&fit=crop';
              }}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {is18Plus && (
              <div className="absolute top-2 left-2 bg-red-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded shadow">
                18+
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 space-y-3 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-md">
                {typeLabel}
              </span>
              {is18Plus ? (
                <span className="bg-red-600 text-white text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-md flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> 18+ VIP SERIES
                </span>
              ) : (
                <span className="bg-emerald-600 text-white text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-md">
                  GRATIS BACA
                </span>
              )}
              <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-400" /> {ratingVal} ({ratingCountVal} votes)
              </span>
            </div>

            <h2 
              onClick={() => onSelectComic(current)}
              className="text-xl sm:text-3xl font-extrabold text-white tracking-tight cursor-pointer hover:text-rose-400 transition-colors line-clamp-1"
            >
              {current.title}
            </h2>

            {/* Story & Art */}
            <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-slate-300">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-rose-400" /> Story: <strong>{current.storyWriter || 'Official'}</strong>
              </span>
              <span className="flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-amber-400" /> Art: <strong>{current.artist || 'Official'}</strong>
              </span>
            </div>

            <p className="text-xs text-slate-300 line-clamp-2 max-w-2xl leading-relaxed">
              {current.synopsis || 'Komik pilihan terbaik dengan alur cerita menarik dan chapter diperbarui secara berkala.'}
            </p>

            {/* Genre tags */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
              {comicGenres.map((g, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectGenre(g)}
                  className="text-[11px] px-2.5 py-0.5 rounded-lg font-medium bg-slate-800/90 text-slate-300 hover:bg-rose-600 hover:text-white border border-slate-700/80 transition-all"
                >
                  {g}
                </button>
              ))}
            </div>

            {/* Action button */}
            <div className="pt-2">
              <button
                onClick={() => onSelectComic(current)}
                className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-rose-950/40 transition-all mx-auto sm:mx-0 cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>{is18Plus ? 'Buka Chapter 18+' : 'Mulai Baca Sekarang'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Carousel Slider Controls */}
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
          <button
            onClick={() => setCurrentIndex((prev) => (prev - 1 + featuredComics.length) % featuredComics.length)}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700 backdrop-blur-md"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1 px-1">
            {featuredComics.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentIndex ? 'w-5 bg-rose-500' : 'w-1.5 bg-slate-600'
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % featuredComics.length)}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700 backdrop-blur-md"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
