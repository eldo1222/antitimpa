import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ShieldAlert, MessageCircle, Heart, Share2, FileText, ShieldCheck } from 'lucide-react';
import { LegalModal } from './LegalModal';

export const Footer: React.FC = () => {
  const { systemSettings } = useApp();
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'disclaimer' | null>(null);

  const phoneValue = systemSettings?.adminPhone || '+6289514441988';
  const displayPhone = phoneValue.startsWith('+') 
    ? phoneValue 
    : (phoneValue.startsWith('62') ? `+${phoneValue}` : `+62${phoneValue.replace(/^0/, '')}`);
  const cleanWaNumber = phoneValue.replace(/[^0-9]/g, '') || '6289514441988';

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'AntiTimpa - Platform Arsip Komik Eksklusif',
        text: 'Akses arsip preview komik dan manhwa digital terproteksi dengan pembaca visual tajam.',
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Tautan AntiTimpa berhasil disalin ke clipboard!');
    }
  };

  return (
    <footer className="mt-8 border-t border-[#202030] bg-[#0d0d14] px-4 py-8 text-slate-400 space-y-6">
      {/* Brand & Badge */}
      <div className="flex flex-col items-center text-center space-y-2">
        <div className="flex items-center gap-2">
          {systemSettings?.siteFavicon ? (
            <img 
              src={systemSettings.siteFavicon} 
              alt="Favicon" 
              className="w-8 h-8 rounded-xl object-cover ring-1 ring-[#ff5b14]/50 shadow-md"
            />
          ) : (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#ff5b14] to-[#f97316] flex items-center justify-center text-white font-extrabold text-xs shadow-lg shadow-[#ff5b14]/25">
              AT
            </div>
          )}
          <span className="font-extrabold text-lg text-white tracking-tight">
            {systemSettings?.siteName || 'AntiTimpa'}
          </span>
        </div>
        <p className="text-xs text-slate-400 max-w-md leading-relaxed">
          Platform arsip &amp; preview konten grafis eksklusif AntiTimpa dengan resolusi tinggi, proteksi multi-server terisolasi, dan akses terkurasi.
        </p>
      </div>

      {/* Social & Contact Actions (Including TikTok Button) */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {/* TikTok Button */}
        <a
          href={systemSettings?.tiktokUrl || 'https://www.tiktok.com/@anti.timpa'}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#000000] hover:bg-[#1a1a24] text-white border border-[#2e2e42] text-xs font-bold shadow-lg transition-all active:scale-95 group"
        >
          <svg className="w-4 h-4 text-[#00f2fe] group-hover:text-[#fe2c55] transition-colors" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.88 2.89 2.89 0 0 1-2.89-2.88 2.89 2.89 0 0 1 2.89-2.89c.3 0 .59.04.86.13V9.4a6.37 6.37 0 0 0-.86-.06A6.33 6.33 0 0 0 3 15.67 6.33 6.33 0 0 0 9.33 22a6.33 6.33 0 0 0 6.34-6.33V9.07c1.47 1.05 3.27 1.68 5.22 1.72v-3.5c-.44-.02-.88-.2-1.3-.6z"/>
          </svg>
          <span>TikTok {systemSettings?.tiktokHandle || '@anti.timpa'}</span>
        </a>

        {/* Admin WhatsApp Button */}
        <a
          href={`https://wa.me/${cleanWaNumber}?text=Halo%20Admin%20AntiTimpa,%20saya%20ingin%20bertanya%20mengenai%20layanan%20komik.`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold shadow-lg transition-all active:scale-95"
        >
          <MessageCircle className="w-4 h-4 text-emerald-400" />
          <span>WA Admin: {displayPhone}</span>
        </a>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1a1a26] hover:bg-[#252538] text-slate-300 border border-[#2b2b40] text-xs font-semibold shadow transition-all active:scale-95 cursor-pointer"
        >
          <Share2 className="w-4 h-4 text-[#ff5b14]" />
          <span>Bagikan</span>
        </button>
      </div>

      {/* Mandatory Preview Disclaimer Notice */}
      <div className="p-4 rounded-2xl bg-[#14141f] border border-[#232335] text-[11px] leading-relaxed text-slate-300 space-y-2 max-w-2xl mx-auto shadow-inner">
        <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>Official Preview Disclaimer</span>
        </div>
        <p className="italic text-slate-300">
          all the comics in the website are only previews of the original comics, there may be many language errors, character names, and story lines. for the original version, please buy the comic if it's available in your city
        </p>
      </div>

      {/* Legal & Policy Quick Navigation Links (Public Pages for Google OAuth Compliance) */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-medium text-slate-400 pt-1">
        <Link
          to="/privacy"
          className="hover:text-[#ff5b14] flex items-center gap-1.5 transition-colors py-1.5 px-3 rounded-lg bg-[#14141e] border border-[#222234] hover:border-[#ff5b14]/40 text-slate-300"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Kebijakan Privasi (Privacy Policy)</span>
        </Link>
        <Link
          to="/terms"
          className="hover:text-[#ff5b14] flex items-center gap-1.5 transition-colors py-1.5 px-3 rounded-lg bg-[#14141e] border border-[#222234] hover:border-[#ff5b14]/40 text-slate-300"
        >
          <FileText className="w-3.5 h-3.5 text-amber-400" />
          <span>Syarat &amp; Ketentuan (Terms of Service)</span>
        </Link>
      </div>

      {/* Copyright */}
      <div className="text-center pt-2 text-[11px] text-slate-500 flex flex-col items-center gap-1 border-t border-[#1a1a28]">
        <p>© {new Date().getFullYear()} {systemSettings?.siteName || 'AntiTimpa'}. Hak Cipta Dilindungi Undang-Undang.</p>
        <p className="flex items-center gap-1 text-slate-500">
          Dibuat dengan <Heart className="w-3 h-3 text-red-500 fill-red-500 inline" /> untuk pembaca setia AntiTimpa.
        </p>
      </div>

      {/* Legal Dialog */}
      <LegalModal
        isOpen={!!legalModalType}
        onClose={() => setLegalModalType(null)}
        type={legalModalType || 'privacy'}
      />
    </footer>
  );
};
