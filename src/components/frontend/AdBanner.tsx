import React, { useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { AdSlotPosition, AdItem } from '../../types';
import { ExternalLink, Megaphone, ShieldCheck, Sparkles } from 'lucide-react';

interface AdBannerProps {
  position: AdSlotPosition;
  className?: string;
  compact?: boolean;
  itemIndex?: number; // Optional index if multiple ads are assigned to the same position
  fallbackAd?: AdItem;
}

export const AdBanner: React.FC<AdBannerProps> = ({ 
  position, 
  className = '', 
  compact = false,
  itemIndex = 0,
  fallbackAd
}) => {
  const { getAdsByPosition, trackAdClick, trackAdView, adSettings } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptContainerRef = useRef<HTMLDivElement>(null);
  const hasTrackedViewRef = useRef<boolean>(false);
  const viewTimerRef = useRef<NodeJS.Timeout | null>(null);

  const eligibleAds = getAdsByPosition(position);
  const selectedAd = eligibleAds[itemIndex] || eligibleAds[0] || fallbackAd;

  // Real Viewable Impression Tracking (Industry Standard MRC / IAB: >=50% visible for >= 1s)
  useEffect(() => {
    if (!selectedAd || hasTrackedViewRef.current || !adSettings.adsEnabled) return;

    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      // Fallback: immediate track if IntersectionObserver not available
      hasTrackedViewRef.current = true;
      trackAdView(selectedAd.id);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          // Start timer for 1 second continuous viewability
          if (!viewTimerRef.current && !hasTrackedViewRef.current) {
            viewTimerRef.current = setTimeout(() => {
              if (!hasTrackedViewRef.current) {
                hasTrackedViewRef.current = true;
                trackAdView(selectedAd.id);
              }
            }, 1000);
          }
        } else {
          // If user scrolled away before 1s, clear timer
          if (viewTimerRef.current) {
            clearTimeout(viewTimerRef.current);
            viewTimerRef.current = null;
          }
        }
      },
      {
        threshold: [0.5]
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
        viewTimerRef.current = null;
      }
    };
  }, [selectedAd?.id, adSettings.adsEnabled, trackAdView]);

  // Execute embedded HTML scripts dynamically so external Ad Networks count impressions
  useEffect(() => {
    if (!selectedAd || selectedAd.type !== 'html_code' || !selectedAd.htmlCode || !scriptContainerRef.current) return;

    const container = scriptContainerRef.current;
    container.innerHTML = selectedAd.htmlCode;

    // Search and run any <script> tags
    const scripts = container.querySelectorAll('script');
    scripts.forEach((oldScript) => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.appendChild(document.createTextNode(oldScript.innerHTML));
      if (oldScript.parentNode) {
        oldScript.parentNode.replaceChild(newScript, oldScript);
      }
    });
  }, [selectedAd?.id, selectedAd?.htmlCode]);

  if (!adSettings.adsEnabled || !selectedAd || !selectedAd.isActive) {
    return null;
  }

  const handleClick = () => {
    trackAdClick(selectedAd.id);
  };

  return (
    <div 
      ref={containerRef}
      id={`ad-slot-${position}-${selectedAd.id}`}
      className={`w-full transition-all duration-300 ${className}`}
    >
      {/* 1. Format: Banner Gambar */}
      {(selectedAd.type === 'banner' || selectedAd.type === 'banner_image') && selectedAd.imageUrl && (
        <div className="relative group overflow-hidden rounded-xl bg-[#12121c] border border-[#222232] shadow-sm hover:border-[#ff5b14]/40 transition-all">
          {adSettings.showAdLabel !== false && (
            <div className="absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-xs text-[9px] font-bold text-slate-300 border border-white/10 flex items-center gap-1">
              <Megaphone className="w-2.5 h-2.5 text-amber-400" />
              <span>{selectedAd.sponsorName ? `${selectedAd.sponsorName}` : (selectedAd.badgeLabel || 'Sponsor')}</span>
            </div>
          )}

          <a
            href={selectedAd.targetUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className="block cursor-pointer"
          >
            <img
              src={selectedAd.imageUrl}
              alt={selectedAd.altText || selectedAd.title}
              className={`w-full object-cover transition-transform duration-300 group-hover:scale-[1.01] ${
                compact ? 'max-h-20 sm:max-h-24' : 'max-h-36 sm:max-h-52'
              }`}
              onError={(e) => {
                // If image fails to load, collapse gently
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </a>
        </div>
      )}

      {/* 2. Format: Native Text Card */}
      {selectedAd.type === 'native_text' && (
        <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-[#141420] to-[#191928] border border-[#252538] hover:border-[#ff5b14]/40 transition-all">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="space-y-1 max-w-xl">
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-extrabold uppercase tracking-wide border border-amber-500/30">
                  {selectedAd.sponsorName || selectedAd.badgeLabel || 'Sponsor'}
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">
                  {selectedAd.headline || selectedAd.title}
                </h4>
              </div>
              {selectedAd.description && (
                <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed line-clamp-2">
                  {selectedAd.description}
                </p>
              )}
            </div>

            {selectedAd.targetUrl && (
              <a
                href={selectedAd.targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleClick}
                className="shrink-0 px-3.5 py-1.5 bg-[#ff5b14] hover:bg-[#e04e0e] text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>{selectedAd.ctaText || 'Lihat Info'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* 3. Format: Custom HTML / Script Snippet */}
      {(selectedAd.type === 'html_code' || selectedAd.type === 'html_script') && selectedAd.htmlCode && (
        <div className="relative rounded-xl overflow-hidden bg-[#101018] border border-[#202030] p-2 text-center">
          {adSettings.showAdLabel !== false && (
            <div className="text-right mb-1">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-end gap-1">
                <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                <span>Iklan Mitra Terverifikasi</span>
              </span>
            </div>
          )}
          <div 
            ref={scriptContainerRef}
            className="w-full flex justify-center items-center overflow-x-auto min-h-[50px]"
          />
        </div>
      )}
    </div>
  );
};

export default AdBanner;
