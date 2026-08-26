import React from 'react';
import { Star, Lock, BookOpen, User, Palette } from 'lucide-react';
import { Comic } from '../types';
import { getProfessionalComicSkeletonUrl } from './common/ComicSkeletonBox';
import { isComic18Plus, shouldBlurComic } from '../utils/comicUtils';
import { useApp } from '../context/AppContext';

interface ComicCardProps {
  comic: Comic;
  onSelectComic: (comic: Comic) => void;
  onSelectGenre: (genre: string) => void;
  hasAccess?: boolean;
}

export const ComicCard: React.FC<ComicCardProps> = ({
  comic,
  onSelectComic,
  onSelectGenre,
  hasAccess = true,
}) => {
  const { currentUser, googleUser, openLoginModal } = useApp();
  const isUserAuthenticated = !!currentUser || !!googleUser;
  const is18 = isComic18Plus(comic);
  const isBlurred = shouldBlurComic(comic, isUserAuthenticated);

  const handleCardClick = () => {
    if (is18 && !isUserAuthenticated) {
      openLoginModal('Komik ini berkategori 18+. Silakan masuk untuk melihat gambar dan membaca chapter.');
      return;
    }
    onSelectComic(comic);
  };

  return (
    <div
      id={`comic-card-${comic.id}`}
      className="group relative bg-[#141721] rounded-2xl overflow-hidden border border-slate-800/90 hover:border-rose-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-rose-950/20 flex flex-col"
    >
      {/* Cover Image Container */}
      <div 
        className="relative aspect-[3/4] w-full overflow-hidden bg-slate-900 cursor-pointer"
        onClick={handleCardClick}
      >
        <img
          src={comic.coverImage}
          alt={comic.title}
          referrerPolicy="no-referrer"
          loading="lazy"
          style={{ filter: isBlurred ? 'blur(12px)' : 'none' }}
          className={`w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ${
            isBlurred ? 'scale-110 brightness-75' : ''
          }`}
          onError={(e) => {
            (e.target as HTMLImageElement).src = getProfessionalComicSkeletonUrl(comic.title, comic.type || comic.comicType);
          }}
        />

        {/* Blur Lock Overlay for 18+ content when Guest */}
        {isBlurred && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-3 bg-black/40 text-center">
            <div className="w-8 h-8 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-lg shadow-rose-900/50 mb-1.5 animate-pulse">
              <Lock className="w-4 h-4" />
            </div>
            <span className="px-2 py-0.5 rounded-md bg-black/80 text-rose-300 text-[10px] font-extrabold border border-rose-500/40 uppercase tracking-wide">
              18+ Sensor
            </span>
            <span className="text-[9px] text-slate-300 mt-1 font-medium bg-black/60 px-2 py-0.5 rounded">
              Masuk untuk melihat
            </span>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#141721] via-transparent to-black/40 opacity-80 group-hover:opacity-60 transition-opacity" />

        {/* Type Badge & Access Badge */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-black/70 backdrop-blur-md text-white border border-white/10">
            {comic.type || comic.comicType || 'MANGA'}
          </span>
          {is18 ? (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-red-600/90 text-white flex items-center gap-1 shadow-sm">
              <Lock className="w-2.5 h-2.5" />
              18+ VIP
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-600/90 text-white shadow-sm">
              GRATIS
            </span>
          )}
        </div>

        {/* Chapter count badge */}
        <div className="absolute bottom-2.5 right-2.5 z-10 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-md text-[11px] font-mono text-slate-300 border border-white/10">
          Ch. {comic.totalChapters || 1}
        </div>
      </div>

      {/* Comic Meta & Content */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Title */}
          <h3
            onClick={handleCardClick}
            className="font-bold text-sm text-slate-100 line-clamp-1 group-hover:text-rose-400 transition-colors cursor-pointer"
            title={comic.title}
          >
            {comic.title}
          </h3>

          {/* Story & Art Info */}
          <div className="mt-1.5 space-y-0.5 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5 truncate">
              <User className="w-3 h-3 text-slate-500 shrink-0" />
              <span>Story: <strong className="text-slate-300 font-medium">{comic.storyWriter || 'Unknown'}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <Palette className="w-3 h-3 text-slate-500 shrink-0" />
              <span>Art: <strong className="text-slate-300 font-medium">{comic.artist || 'Unknown'}</strong></span>
            </div>
          </div>

          {/* Rating Section: 4.9 (18,450 rating) */}
          <div className="mt-2 flex items-center gap-1.5">
            <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded text-amber-400 font-bold text-xs">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{typeof comic.rating === 'number' ? comic.rating.toFixed(1) : '4.8'}</span>
            </div>
            <span className="text-[11px] text-slate-400">
              ({typeof comic.ratingCount === 'number' ? comic.ratingCount.toLocaleString() : '1,200'} rating)
            </span>
          </div>
        </div>

        {/* Clickable Genres Tags List */}
        <div className="pt-2 border-t border-slate-800/80">
          <div className="flex flex-wrap gap-1.5">
            {(comic.genres || []).slice(0, 3).map((genre, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectGenre(genre);
                }}
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-all ${
                  genre.toLowerCase().includes('18+') || genre.toLowerCase().includes('dewasa')
                    ? 'bg-red-950/60 text-red-300 hover:bg-red-900/80 border border-red-800/40'
                    : 'bg-slate-800/90 text-slate-300 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-700/50 border border-slate-700/50'
                }`}
                title={`Filter komik bergenre ${genre}`}
              >
                {genre}
              </button>
            ))}
            {(comic.genres || []).length > 3 && (
              <span className="text-[10px] text-slate-500 self-center">
                +{(comic.genres || []).length - 3}
              </span>
            )}
          </div>
        </div>

        {/* Read Action Button */}
        <button
          onClick={handleCardClick}
          className={`w-full mt-2 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
            is18
              ? 'bg-gradient-to-r from-red-700 to-rose-700 hover:from-red-600 hover:to-rose-600 text-white shadow-red-950/50'
              : 'bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>{is18 ? (isUserAuthenticated ? 'Buka VIP 18+' : 'Masuk untuk 18+') : 'Baca Sekarang'}</span>
        </button>
      </div>
    </div>
  );
};
