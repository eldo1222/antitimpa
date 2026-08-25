import React from 'react';
import { BookOpen, Sparkles, Image as ImageIcon } from 'lucide-react';

interface ComicSkeletonCoverProps {
  title?: string;
  comicType?: string;
  className?: string;
}

/**
 * Generates a clean, ultra-professional dark SVG data URI representing
 * a sleek manga storyboard grid with subtle branding and title watermark.
 */
export function getProfessionalComicSkeletonUrl(title: string = 'Komik AntiTimpa', comicType: string = 'manga'): string {
  const cleanTitle = title.replace(/["<>]/g, '').slice(0, 30);
  const typeUpper = (comicType || 'MANGA').toUpperCase();
  
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="100%" height="100%">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0e0e17"/>
      <stop offset="50%" stop-color="#141422"/>
      <stop offset="100%" stop-color="#0a0a10"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ff5b14" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#ff7a3d" stop-opacity="0.8"/>
    </linearGradient>
    <linearGradient id="shimmer" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#ffffff" stroke-width="0.3" stroke-opacity="0.03"/>
    </pattern>
  </defs>

  <!-- Background Base -->
  <rect width="400" height="600" fill="url(#bg)"/>
  <rect width="400" height="600" fill="url(#grid)"/>

  <!-- Comic Storyboard Panel Frames (Dark Manga Layout) -->
  <!-- Top Panel -->
  <rect x="25" y="30" width="350" height="150" rx="8" fill="#181828" stroke="#25253c" stroke-width="1.5"/>
  <path d="M 35 155 L 75 80 L 120 155" fill="none" stroke="#2d2d48" stroke-width="1.5"/>
  <circle cx="100" cy="70" r="14" fill="#222238" stroke="#323250" stroke-width="1"/>

  <!-- Middle Panel Left -->
  <rect x="25" y="195" width="200" height="170" rx="8" fill="#181828" stroke="#25253c" stroke-width="1.5"/>
  <line x1="45" y1="230" x2="185" y2="230" stroke="#282840" stroke-width="2" stroke-linecap="round"/>
  <line x1="45" y1="255" x2="150" y2="255" stroke="#282840" stroke-width="2" stroke-linecap="round"/>
  <line x1="45" y1="280" x2="195" y2="280" stroke="#282840" stroke-width="2" stroke-linecap="round"/>

  <!-- Middle Panel Right -->
  <rect x="240" y="195" width="135" height="170" rx="8" fill="#161624" stroke="#25253c" stroke-width="1.5"/>
  <!-- Speech Bubble Silhouette -->
  <path d="M 260 230 C 260 215, 350 215, 350 230 C 350 245, 290 245, 280 260 L 280 245 C 260 245, 260 230, 260 230 Z" fill="#222236" stroke="#363654" stroke-width="1"/>

  <!-- Bottom Panel -->
  <rect x="25" y="380" width="350" height="140" rx="8" fill="#181828" stroke="#25253c" stroke-width="1.5"/>
  <line x1="45" y1="415" x2="355" y2="415" stroke="#282840" stroke-width="1.5" stroke-dasharray="4,4"/>
  <line x1="45" y1="445" x2="320" y2="445" stroke="#282840" stroke-width="1.5" stroke-dasharray="4,4"/>

  <!-- Shimmer Overlay -->
  <rect width="400" height="600" fill="url(#shimmer)"/>

  <!-- Badge Top Right -->
  <rect x="270" y="45" width="90" height="24" rx="12" fill="url(#accent)"/>
  <text x="315" y="61" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="10" fill="#ffffff" text-anchor="middle" letter-spacing="1">${typeUpper}</text>

  <!-- Title & Watermark Bottom -->
  <rect x="0" y="525" width="400" height="75" fill="#0b0b12" fill-opacity="0.95"/>
  <line x1="0" y1="525" x2="400" y2="525" stroke="#ff5b14" stroke-width="2"/>
  <text x="200" y="555" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="14" fill="#f1f5f9" text-anchor="middle">${cleanTitle}</text>
  <text x="200" y="575" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="600" font-size="10" fill="#64748b" text-anchor="middle">ANTITIMPA COMIC READER</text>
</svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Animated professional comic box skeleton placeholder for cards & thumbnails.
 */
export const ComicSkeletonBox: React.FC<ComicSkeletonCoverProps> = ({ title, comicType = 'manga', className = '' }) => {
  return (
    <div className={`relative overflow-hidden bg-[#10101a] border border-[#222234] rounded-2xl flex flex-col items-center justify-between p-3 select-none ${className}`}>
      {/* Animated Glowing Shimmer Bar */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />

      {/* Top Manga Header Grid */}
      <div className="w-full flex items-center justify-between border-b border-[#1c1c2c] pb-2">
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-[#ff5b14]" />
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
            {comicType || 'MANGA'}
          </span>
        </div>
        <span className="w-2 h-2 rounded-full bg-[#ff5b14]/70 animate-ping" />
      </div>

      {/* Comic Storyboard Box Structure */}
      <div className="w-full my-auto space-y-2 py-3">
        {/* Storyboard Panel Top */}
        <div className="w-full h-12 bg-[#171726] rounded-lg border border-[#26263a] flex items-center justify-center relative overflow-hidden">
          <div className="w-12 h-6 border border-[#35354e] rounded-full flex items-center justify-center opacity-60">
            <span className="text-[8px] font-bold text-slate-500">FRAME 1</span>
          </div>
        </div>

        {/* Storyboard Panel Split */}
        <div className="grid grid-cols-2 gap-2">
          <div className="h-14 bg-[#151522] rounded-lg border border-[#222236] flex flex-col justify-center p-2 space-y-1">
            <div className="w-full h-1 bg-[#2b2b40] rounded" />
            <div className="w-3/4 h-1 bg-[#2b2b40] rounded" />
          </div>
          <div className="h-14 bg-[#151522] rounded-lg border border-[#222236] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-slate-600 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Title & AntiTimpa Footer */}
      <div className="w-full pt-2 border-t border-[#1c1c2c] text-center">
        {title ? (
          <p className="text-xs font-bold text-slate-300 truncate">{title}</p>
        ) : (
          <div className="w-2/3 h-2.5 bg-[#252538] rounded mx-auto" />
        )}
        <span className="text-[9px] text-slate-500 font-mono mt-0.5 block">AntiTimpa Panel</span>
      </div>
    </div>
  );
};

/**
 * Vertical full-page comic skeleton for ComicReaderView while chapter images load
 */
export const ComicReaderPageSkeleton: React.FC<{ pageIndex: number }> = ({ pageIndex }) => {
  return (
    <div className="w-full max-w-3xl mx-auto min-h-[650px] bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl p-6 flex flex-col items-center justify-between my-4 relative overflow-hidden shadow-2xl">
      {/* Animated scanning shimmer */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2.2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />

      {/* Top Bar */}
      <div className="w-full flex items-center justify-between text-xs text-slate-500 pb-3 border-b border-[#1a1a28]">
        <span className="font-mono">HALAMAN {pageIndex}</span>
        <span className="text-[#ff5b14] text-[10px] font-bold">MEMUAT PANEL KOMIK...</span>
      </div>

      {/* Vertical Manga Storyboard Frame Layout */}
      <div className="w-full flex-1 my-6 space-y-4 max-w-xl">
        {/* Frame 1 */}
        <div className="w-full h-44 bg-[#141420] rounded-xl border border-[#232336] p-4 flex flex-col justify-between">
          <div className="w-24 h-6 rounded-full bg-[#1e1e30] flex items-center justify-center">
            <span className="text-[10px] text-slate-400 font-mono">PANEL 1</span>
          </div>
          <div className="space-y-1.5">
            <div className="w-full h-2 bg-[#202032] rounded" />
            <div className="w-4/5 h-2 bg-[#202032] rounded" />
          </div>
        </div>

        {/* Frame 2 & 3 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="h-40 bg-[#12121e] rounded-xl border border-[#202032] p-3 flex flex-col justify-end">
            <div className="w-16 h-2 bg-[#222236] rounded mb-1" />
            <div className="w-24 h-2 bg-[#222236] rounded" />
          </div>
          <div className="h-40 bg-[#12121e] rounded-xl border border-[#202032] flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-slate-700 animate-pulse" />
          </div>
        </div>

        {/* Frame 4 */}
        <div className="w-full h-36 bg-[#141420] rounded-xl border border-[#232336] p-4 flex items-center justify-center">
          <div className="text-center space-y-1">
            <Sparkles className="w-5 h-5 text-[#ff5b14] mx-auto animate-spin" />
            <p className="text-[11px] font-semibold text-slate-400">Sinkronisasi Gambar Chapter Scanlation</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full text-center pt-3 border-t border-[#1a1a28]">
        <span className="text-[10px] font-mono text-slate-600">ANTITIMPA ULTRA READER ENGINE</span>
      </div>
    </div>
  );
};
