import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Home, Compass, Bookmark, User, BookOpen } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    selectComic, 
    selectedComicId, 
    readingChapterId, 
    bookmarks,
    currentUser,
    openLoginModal
  } = useApp();

  const [isVisible, setIsVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollYRef.current + 10 && currentScrollY > 60) {
        // Scrolling down -> hide navbar to free up screen space
        setIsVisible(false);
      } else if (currentScrollY < lastScrollYRef.current - 10 || currentScrollY <= 20) {
        // Scrolling up or at top -> show navbar
        setIsVisible(true);
      }
      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hide bottom nav if reader is actively open (for full immersive comic reading experience)
  if (readingChapterId) return null;

  const handleTabClick = (tab: 'home' | 'discover' | 'library' | 'profile') => {
    selectComic(null);
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 z-40 bg-[#0f0f14]/95 backdrop-blur-lg border-t border-[#1f1f2c] px-4 py-2 text-slate-400 transition-all duration-300 transform md:hidden ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
      }`}
    >
      <div className="max-w-md mx-auto flex items-center justify-around relative">
        {/* Home */}
        <button
          onClick={() => handleTabClick('home')}
          className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors ${
            activeTab === 'home' && !selectedComicId ? 'text-[#ff5b14] font-bold' : 'hover:text-slate-200'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">Home</span>
        </button>

        {/* Discover / Search */}
        <button
          onClick={() => handleTabClick('discover')}
          className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors ${
            activeTab === 'discover' && !selectedComicId ? 'text-[#ff5b14] font-bold' : 'hover:text-slate-200'
          }`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px]">Jelajah</span>
        </button>

        {/* Floating Quick Action Reader / Trending */}
        <div className="relative -top-3">
          <button
            onClick={() => {
              // Open first trending comic or start reading
              selectComic('comic-1');
            }}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#ff5b14] to-[#f97316] text-white flex items-center justify-center shadow-lg shadow-[#ff5b14]/30 hover:scale-105 active:scale-95 transition-all"
            title="Baca Komik Pilihan"
          >
            <BookOpen className="w-5 h-5" />
          </button>
        </div>

        {/* Library / Koleksi */}
        <button
          onClick={() => handleTabClick('library')}
          className={`flex flex-col items-center gap-1 py-1 px-3 relative transition-colors ${
            activeTab === 'library' && !selectedComicId ? 'text-[#ff5b14] font-bold' : 'hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Bookmark className="w-5 h-5" />
            {bookmarks.length > 0 && (
              <span className="absolute -top-1 -right-2 px-1 text-[9px] font-extrabold bg-[#ff5b14] text-white rounded-full min-w-3.5 h-3.5 flex items-center justify-center">
                {bookmarks.length}
              </span>
            )}
          </div>
          <span className="text-[10px]">Koleksi</span>
        </button>

        {/* Profile */}
        <button
          onClick={() => {
            if (!currentUser) {
              openLoginModal();
            } else {
              handleTabClick('profile');
            }
          }}
          className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors ${
            activeTab === 'profile' && !selectedComicId ? 'text-[#ff5b14] font-bold' : 'hover:text-slate-200'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px]">Profil</span>
        </button>
      </div>
    </div>
  );
};
