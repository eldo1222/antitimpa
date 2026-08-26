import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Megaphone, ExternalLink, Sparkles, ShieldCheck } from 'lucide-react';

const SESSION_STORAGE_KEY = 'antitimpa_welcome_popup_session_v1';
const LOCAL_STORAGE_COOLDOWN_KEY = 'antitimpa_welcome_popup_last_shown';
const POPUP_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours cooldown

export const WelcomePopUpModal: React.FC = () => {
  const { getAdsByPosition, trackAdClick, trackAdView, adSettings, currentUser } = useApp();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeAd, setActiveAd] = useState<any>(null);

  useEffect(() => {
    // Check if ads are enabled
    if (!adSettings.adsEnabled || adSettings.welcomePopupEnabled === false) return;

    // Check VIP bypass
    if (adSettings.hideAdsForVip && currentUser && (currentUser.isVip || currentUser.tier === 'Premium' || currentUser.tier === 'Pro Member' || currentUser.role === 'admin')) {
      return;
    }

    // Check session or cooldown
    try {
      const sessionShown = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (sessionShown) return;

      const lastShown = localStorage.getItem(LOCAL_STORAGE_COOLDOWN_KEY);
      if (lastShown) {
        const timeDiff = Date.now() - parseInt(lastShown, 10);
        if (timeDiff < POPUP_COOLDOWN_MS) return;
      }
    } catch (e) {
      // ignore
    }

    const popupAds = getAdsByPosition('welcome_popup');
    if (popupAds.length > 0 && popupAds[0].isActive) {
      const ad = popupAds[0];
      setActiveAd(ad);

      // Delay 1.5 seconds after initial site load so page loads smoothly first
      const timer = setTimeout(() => {
        setIsOpen(true);
        trackAdView(ad.id);
        try {
          sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
          localStorage.setItem(LOCAL_STORAGE_COOLDOWN_KEY, Date.now().toString());
        } catch (_) {}
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [adSettings, currentUser, getAdsByPosition, trackAdView]);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleAdClick = () => {
    if (activeAd) {
      trackAdClick(activeAd.id);
    }
  };

  if (!isOpen || !activeAd) return null;

  return (
    <div 
      id="welcome-popup-modal"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div 
        className="relative w-full max-w-md bg-[#12121e] border-2 border-[#ff5b14]/50 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar with Sponsor Badge & Close Button */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#171728] border-b border-[#24243a]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1">
              <Megaphone className="w-3 h-3" />
              {activeAd.sponsorName || activeAd.badgeLabel || 'Sponsor AntiTimpa'}
            </span>
          </div>

          {/* Prominent Close [X] Button */}
          <button
            id="btn-close-welcome-popup"
            onClick={handleClose}
            aria-label="Tutup Iklan Pop-up"
            className="p-1.5 rounded-full bg-[#202034] hover:bg-rose-600/80 text-slate-300 hover:text-white transition-all cursor-pointer shadow-md group"
          >
            <X className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Banner Image */}
          {activeAd.imageUrl && (
            <div className="rounded-2xl overflow-hidden border border-[#26263e] shadow-lg relative group bg-black">
              <a
                href={activeAd.targetUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleAdClick}
                className="block cursor-pointer"
              >
                <img
                  src={activeAd.imageUrl}
                  alt={activeAd.title}
                  className="w-full h-44 sm:h-52 object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </a>
            </div>
          )}

          {/* HTML Code support if HTML type */}
          {activeAd.type === 'html_code' && activeAd.htmlCode && (
            <div 
              className="w-full overflow-x-auto min-h-[100px] flex justify-center items-center"
              dangerouslySetInnerHTML={{ __html: activeAd.htmlCode }}
            />
          )}

          {/* Title & Description */}
          <div className="space-y-1.5 text-center">
            <h3 className="font-black text-base sm:text-lg text-white leading-tight">
              {activeAd.headline || activeAd.title}
            </h3>
            {activeAd.description && (
              <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                {activeAd.description}
              </p>
            )}
          </div>

          {/* CTA & Dismiss Buttons */}
          <div className="space-y-2 pt-1">
            {activeAd.targetUrl && (
              <a
                href={activeAd.targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleAdClick}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#ff5b14] to-[#f97316] hover:opacity-95 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-[#ff5b14]/30 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
              >
                <span>{activeAd.ctaText || 'Klaim Promo / Kunjungi Link'}</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <button
              onClick={handleClose}
              className="w-full py-2.5 text-slate-400 hover:text-slate-200 text-xs font-semibold hover:underline cursor-pointer transition-colors"
            >
              Lewati & Lanjut Baca Komik
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-[#0d0d16] border-t border-[#1e1e30] flex items-center justify-between text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            Iklan aman & non-intrusif
          </span>
          <span>AntiTimpa Portal</span>
        </div>
      </div>
    </div>
  );
};
