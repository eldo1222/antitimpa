import React, { useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { AdSlotPosition, AdItem } from '../../types';
import { ExternalLink, Megaphone, Sparkles } from 'lucide-react';

interface AdBannerProps {
  position: AdSlotPosition;
  className?: string;
  compact?: boolean;
}

export const AdBanner: React.FC<AdBannerProps> = ({ position, className = '', compact = false }) => {
  const { getAdsByPosition, trackAdClick, trackAdView, adSettings } = useApp();
  const viewedAdsRef = useRef<Set<string>>(new Set());

  const eligibleAds = getAdsByPosition(position);

  // Auto-record views / impressions once per component lifecycle
  useEffect(() => {
    eligibleAds.forEach(ad => {
      if (!viewedAdsRef.current.has(ad.id)) {
        viewedAdsRef.current.add(ad.id);
        trackAdView(ad.id);
      }
    });
  }, [eligibleAds, trackAdView]);

  if (!adSettings.adsEnabled || eligibleAds.length === 0) {
    return null;
  }

  // Display the first matching ad or pick one
  const ad = eligibleAds[0];

  const handleClick = (e: React.MouseEvent) => {
    trackAdClick(ad.id);
  };

  return (
    <div 
      id={`ad-slot-${position}-${ad.id}`}
      className={`w-full transition-all duration-300 ${className}`}
    >
      {/* 1. Format: Banner Gambar */}
      {ad.type === 'banner' && ad.imageUrl && (
        <div className="relative group overflow-hidden rounded-xl bg-[#12121c] border border-[#222232] shadow-sm hover:border-[#ff5b14]/40 transition-all">
          {adSettings.showAdLabel !== false && (
            <div className="absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[9px] font-bold text-slate-400 border border-white/10 flex items-center gap-1">
              <Megaphone className="w-2.5 h-2.5 text-amber-400" />
              <span>{ad.sponsorName ? `Sponsor: ${ad.sponsorName}` : 'Sponsor'}</span>
            </div>
          )}

          <a
            href={ad.targetUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className="block cursor-pointer"
          >
            <img
              src={ad.imageUrl}
              alt={ad.title}
              className={`w-full object-cover transition-transform duration-300 group-hover:scale-[1.01] ${
                compact ? 'max-h-20 sm:max-h-24' : 'max-h-36 sm:max-h-48'
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
      {ad.type === 'native_text' && (
        <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-[#141420] to-[#191928] border border-[#252538] hover:border-[#ff5b14]/40 transition-all">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="space-y-1 max-w-xl">
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-extrabold uppercase tracking-wide border border-amber-500/30">
                  {ad.sponsorName || 'Sponsor'}
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">
                  {ad.headline || ad.title}
                </h4>
              </div>
              {ad.description && (
                <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed line-clamp-2">
                  {ad.description}
                </p>
              )}
            </div>

            {ad.targetUrl && (
              <a
                href={ad.targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleClick}
                className="shrink-0 px-3.5 py-1.5 bg-[#ff5b14] hover:bg-[#e04e0e] text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>{ad.ctaText || 'Lihat Info'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* 3. Format: Custom HTML / Script Snippet */}
      {ad.type === 'html_code' && ad.htmlCode && (
        <div className="relative rounded-xl overflow-hidden bg-[#101018] border border-[#202030] p-2 text-center">
          {adSettings.showAdLabel !== false && (
            <div className="text-right mb-1">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                Iklan Sponsor
              </span>
            </div>
          )}
          <div 
            className="w-full flex justify-center items-center overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: ad.htmlCode }} 
          />
        </div>
      )}
    </div>
  );
};
export default AdBanner;
