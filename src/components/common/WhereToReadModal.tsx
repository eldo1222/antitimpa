import React, { useState, useEffect } from 'react';
import { Comic, Chapter, ExternalSource } from '../../types';
import { 
  Globe, 
  ExternalLink, 
  X, 
  ShieldCheck, 
  Sparkles, 
  Copy, 
  Check, 
  Tv, 
  BookOpen, 
  Flame, 
  ArrowRight,
  Info,
  Clock,
  Layers,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { AdBanner } from '../frontend/AdBanner';

interface WhereToReadModalProps {
  isOpen: boolean;
  onClose: () => void;
  comic: Comic;
  chapter?: Chapter | null;
}

// Helper to determine platform theme color & badge style
export function getPlatformBadgeInfo(platformName: string = '', url: string = ''): {
  color: string;
  bgColor: string;
  borderColor: string;
  iconType: 'comic' | 'anime' | 'raw' | 'official' | 'general';
  label: string;
} {
  const p = (platformName || '').toLowerCase();
  const u = (url || '').toLowerCase();

  if (p.includes('nhentai') || u.includes('nhentai.net')) {
    return {
      color: 'text-pink-400',
      bgColor: 'bg-pink-950/60 hover:bg-pink-900/60',
      borderColor: 'border-pink-500/40',
      iconType: 'raw',
      label: '🔞 NHentai (18+ Doujinshi)'
    };
  }
  if (p.includes('mangadex') || u.includes('mangadex.org')) {
    return {
      color: 'text-orange-400',
      bgColor: 'bg-orange-950/60 hover:bg-orange-900/60',
      borderColor: 'border-orange-500/40',
      iconType: 'comic',
      label: 'MangaDex (Scanlation)'
    };
  }
  if (p.includes('doujindesu') || u.includes('doujindesu')) {
    return {
      color: 'text-rose-400',
      bgColor: 'bg-rose-950/60 hover:bg-rose-900/60',
      borderColor: 'border-rose-500/40',
      iconType: 'raw',
      label: 'DoujinDesu (Indo 18+)'
    };
  }
  if (p.includes('mangaplus') || u.includes('mangaplus.shueisha.co.jp')) {
    return {
      color: 'text-red-400',
      bgColor: 'bg-red-950/60 hover:bg-red-900/60',
      borderColor: 'border-red-500/40',
      iconType: 'official',
      label: 'MANGA Plus by SHUEISHA'
    };
  }
  if (p.includes('crunchyroll') || u.includes('crunchyroll.com')) {
    return {
      color: 'text-amber-400',
      bgColor: 'bg-amber-950/60 hover:bg-amber-900/60',
      borderColor: 'border-amber-500/40',
      iconType: 'anime',
      label: 'Crunchyroll (Official Stream)'
    };
  }
  if (p.includes('muse') || u.includes('youtube.com/@muse')) {
    return {
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-950/60 hover:bg-cyan-900/60',
      borderColor: 'border-cyan-500/40',
      iconType: 'anime',
      label: 'Muse Asia / Muse Indonesia'
    };
  }
  if (p.includes('bato') || u.includes('bato.to') || u.includes('battwo.com')) {
    return {
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-950/60 hover:bg-emerald-900/60',
      borderColor: 'border-emerald-500/40',
      iconType: 'comic',
      label: 'Bato.to (Global Scanlation)'
    };
  }
  if (p.includes('myanimelist') || u.includes('myanimelist.net') || p.includes('jikan')) {
    return {
      color: 'text-blue-400',
      bgColor: 'bg-blue-950/60 hover:bg-blue-900/60',
      borderColor: 'border-blue-500/40',
      iconType: 'general',
      label: 'MyAnimeList (Database & Hub)'
    };
  }
  if (p.includes('komikcast') || u.includes('komikcast.cz')) {
    return {
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-950/60 hover:bg-yellow-900/60',
      borderColor: 'border-yellow-500/40',
      iconType: 'comic',
      label: 'Komikcast (Bahasa Indonesia)'
    };
  }
  if (p.includes('toptoon') || p.includes('lezhin') || p.includes('kakaopage') || p.includes('webtoon')) {
    return {
      color: 'text-purple-400',
      bgColor: 'bg-purple-950/60 hover:bg-purple-900/60',
      borderColor: 'border-purple-500/40',
      iconType: 'official',
      label: `${platformName || 'Official Webtoon'}`
    };
  }

  return {
    color: 'text-[#ff7a3d]',
    bgColor: 'bg-[#181826] hover:bg-[#202032]',
    borderColor: 'border-[#2e2e42]',
    iconType: 'general',
    label: platformName || 'Platform Penyedia Eksternal'
  };
}

export const WhereToReadModal: React.FC<WhereToReadModalProps> = ({
  isOpen,
  onClose,
  comic,
  chapter
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<'all' | 'id' | 'en' | 'raw'>('all');
  const [activeRedirectingSource, setActiveRedirectingSource] = useState<ExternalSource | null>(null);
  const [countdown, setCountdown] = useState<number>(3);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Compile all available external sources
  const sources: ExternalSource[] = React.useMemo(() => {
    const list: ExternalSource[] = [];

    // 1. Chapter-specific sources
    if (chapter) {
      if (chapter.externalSources && chapter.externalSources.length > 0) {
        list.push(...chapter.externalSources);
      }
      if (chapter.externalUrl) {
        list.push({
          name: chapter.externalPlatform || (chapter.externalUrl.includes('nhentai') ? 'NHentai' : 'Platform Pihak Ketiga'),
          url: chapter.externalUrl,
          type: 'read',
          notes: chapter.externalNote || `Chapter ${chapter.chapterNumber}`,
          language: 'ID'
        });
      }
      if (chapter.driveUrl) {
        list.push({
          name: 'Google Drive Mirror (AntiTimpa)',
          url: chapter.driveUrl,
          type: 'mirror',
          notes: 'Direct cloud storage link',
          language: 'ID'
        });
      }
      if (chapter.mangadexChapterId) {
        list.push({
          name: 'MangaDex Live Reader',
          url: `https://mangadex.org/chapter/${chapter.mangadexChapterId}`,
          type: 'read',
          notes: `Chapter ${chapter.chapterNumber} on MangaDex`,
          language: 'ID'
        });
      }
    }

    // 2. Comic-level sources
    if (comic.externalLinks && comic.externalLinks.length > 0) {
      list.push(...comic.externalLinks);
    }
    if (comic.whereToRead && comic.whereToRead.length > 0) {
      list.push(...comic.whereToRead);
    }

    // 3. Fallback to comic.sourceUrl if available
    if (comic.sourceUrl) {
      let srcName = 'Platform Asal / Sumber Komik';
      if (comic.sourceUrl.includes('nhentai.net')) srcName = 'NHentai.net';
      else if (comic.sourceUrl.includes('mangadex.org')) srcName = 'MangaDex';
      else if (comic.sourceUrl.includes('doujin.desu') || comic.sourceUrl.includes('doujindesu')) srcName = 'DoujinDesu';
      else if (comic.sourceUrl.includes('myanimelist.net')) srcName = 'MyAnimeList';
      else if (comic.sourceUrl.includes('komikcast')) srcName = 'Komikcast';

      list.push({
        name: srcName,
        url: comic.sourceUrl,
        type: 'read',
        notes: comic.sourceApi ? `Indeks via ${comic.sourceApi}` : 'Portal resmi'
      });
    }

    if (comic.mangaDexId) {
      list.push({
        name: 'MangaDex Series Page',
        url: `https://mangadex.org/title/${comic.mangaDexId}`,
        type: 'read',
        notes: 'MangaDex catalog & chapters',
        language: 'EN'
      });
    }

    // Deduplicate by URL
    const seenUrls = new Set<string>();
    return list.filter(item => {
      if (!item.url || seenUrls.has(item.url.trim().toLowerCase())) return false;
      seenUrls.add(item.url.trim().toLowerCase());
      return true;
    });
  }, [comic, chapter]);

  // Handle countdown when user clicks a source
  useEffect(() => {
    let timer: any;
    if (activeRedirectingSource) {
      setCountdown(3);
      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            // Open the link safely
            if (activeRedirectingSource.url) {
              window.open(activeRedirectingSource.url, '_blank', 'noopener,noreferrer');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeRedirectingSource]);

  if (!isOpen) return null;

  // Filter sources by selected language
  const filteredSources = sources.filter(s => {
    if (selectedLanguage === 'all') return true;
    const lang = (s.language || '').toLowerCase();
    if (selectedLanguage === 'id') return lang.includes('id') || lang.includes('indo') || !lang;
    if (selectedLanguage === 'en') return lang.includes('en') || lang.includes('eng');
    if (selectedLanguage === 'raw') return lang.includes('raw') || lang.includes('jp') || lang.includes('kr');
    return true;
  });

  const handleCopyLink = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2500);
    }
  };

  const handleDirectLaunch = (source: ExternalSource) => {
    window.open(source.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#0e0e14] border border-[#262638] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-[#1f1f2e] bg-[#13131c] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#ff5b14] to-[#f97316] flex items-center justify-center text-white shadow-md shadow-[#ff5b14]/20">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                  Where to Read & Watch
                </h3>
                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-[#ff5b14]/20 text-[#ff5b14] border border-[#ff5b14]/30">
                  Portal Gateway
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Direktori &amp; Tautan Sumber Eksternal Bebas Netral (Model MyAnimeList)
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setActiveRedirectingSource(null);
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Comic / Chapter Summary Card */}
          <div className="bg-[#151520] border border-[#252538] rounded-xl p-3.5 flex items-center gap-3.5">
            <img 
              src={comic.coverImage} 
              alt={comic.title}
              referrerPolicy="no-referrer"
              className="w-12 h-16 object-cover rounded-lg border border-[#2f2f45] shadow shrink-0" 
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#ff5b14]/20 text-[#ff5b14] uppercase">
                  {comic.comicType || 'Komik'}
                </span>
                {chapter && (
                  <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                    Chapter #{chapter.chapterNumber}
                  </span>
                )}
              </div>
              <h4 className="font-bold text-xs sm:text-sm text-white truncate mt-0.5" title={comic.title}>
                {comic.title}
              </h4>
              {chapter && (
                <p className="text-[11px] text-slate-400 truncate">
                  Target: {chapter.title || `Chapter ${chapter.chapterNumber}`}
                </p>
              )}
            </div>
          </div>

          {/* ACTIVE REDIRECT GATEWAY INTERSTITIAL (Replaces boring loading with an elegant Interstitial Ad) */}
          {activeRedirectingSource ? (
            <div className="bg-[#141422] border-2 border-[#ff5b14]/50 rounded-2xl p-5 text-center space-y-4 animate-in zoom-in-95 duration-200 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#252538] pb-3">
                <div className="flex items-center gap-2 text-left">
                  <div className="w-8 h-8 rounded-xl bg-[#ff5b14]/20 text-[#ff5b14] border border-[#ff5b14]/40 flex items-center justify-center font-bold">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                      Mengarahkan ke Sumber Eksternal
                    </span>
                    <h4 className="font-extrabold text-sm text-white truncate max-w-xs">
                      {activeRedirectingSource.name}
                    </h4>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-semibold block">Otomatis dalam</span>
                  <span className="text-base font-black text-[#ff5b14] font-mono">{countdown}s</span>
                </div>
              </div>

              {/* High-Converting Interstitial Sponsor Banner Slot */}
              <div className="space-y-2">
                <div className="text-left flex items-center justify-between text-[10px] text-slate-400 font-bold px-1">
                  <span className="flex items-center gap-1 text-slate-300">
                    <Sparkles className="w-3 h-3 text-[#ff5b14]" />
                    Pesan Iklan / Sponsor
                  </span>
                  <span className="text-[9px] text-slate-500 uppercase">Iklan Terverifikasi</span>
                </div>
                <AdBanner position="mitra_interstitial" />
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 max-w-sm mx-auto pt-1">
                <div className="w-full bg-[#202030] h-2 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className="bg-gradient-to-r from-[#ff5b14] via-amber-400 to-emerald-400 h-full transition-all duration-1000 ease-linear"
                    style={{ width: `${((3 - countdown) / 3) * 100}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-mono truncate px-2">
                  Tautan Luar: {activeRedirectingSource.url}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2 border-t border-[#252538]">
                <button
                  onClick={() => handleDirectLaunch(activeRedirectingSource)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#ff5b14] hover:bg-[#e04e0e] text-white font-extrabold text-xs rounded-xl shadow-lg shadow-[#ff5b14]/20 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Lewati / Buka Sekarang</span>
                </button>

                <button
                  onClick={() => setActiveRedirectingSource(null)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-[#202030] hover:bg-[#28283c] text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Batal & Pilih Sumber Lain
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Language / Source Filters */}
              <div className="flex items-center justify-between gap-2 pb-1">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#ff5b14]" />
                  <span>Pilihan Sumber Eksternal ({filteredSources.length})</span>
                </span>

                <div className="flex items-center gap-1 bg-[#151520] p-1 rounded-xl border border-[#232334]">
                  <button
                    onClick={() => setSelectedLanguage('all')}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                      selectedLanguage === 'all' ? 'bg-[#ff5b14] text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    onClick={() => setSelectedLanguage('id')}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                      selectedLanguage === 'id' ? 'bg-[#ff5b14] text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🇮🇩 Indo
                  </button>
                  <button
                    onClick={() => setSelectedLanguage('en')}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                      selectedLanguage === 'en' ? 'bg-[#ff5b14] text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🇬🇧 Eng
                  </button>
                </div>
              </div>

              {/* Sources Provider List */}
              {filteredSources.length > 0 ? (
                <div className="space-y-2.5">
                  {filteredSources.map((src, idx) => {
                    const badge = getPlatformBadgeInfo(src.name, src.url);
                    const isCopied = copiedUrl === src.url;

                    return (
                      <div
                        key={idx}
                        onClick={() => setActiveRedirectingSource(src)}
                        className={`p-3.5 rounded-xl border ${badge.borderColor} ${badge.bgColor} transition-all cursor-pointer flex items-center justify-between group hover:scale-[1.01] shadow-sm`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                          <div className={`w-9 h-9 rounded-xl bg-black/40 border ${badge.borderColor} flex items-center justify-center shrink-0 ${badge.color}`}>
                            {badge.iconType === 'anime' ? (
                              <Tv className="w-4 h-4" />
                            ) : badge.iconType === 'official' ? (
                              <ShieldCheck className="w-4 h-4" />
                            ) : badge.iconType === 'raw' ? (
                              <Flame className="w-4 h-4" />
                            ) : (
                              <BookOpen className="w-4 h-4" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="font-bold text-xs sm:text-sm text-white group-hover:text-[#ff7a3d] transition-colors truncate">
                                {src.name}
                              </h5>
                              {src.language && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-black/40 text-slate-300 border border-white/10 uppercase">
                                  {src.language}
                                </span>
                              )}
                              {src.type && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#ff5b14]/20 text-[#ff5b14] border border-[#ff5b14]/30 uppercase">
                                  {src.type === 'read' ? 'Baca Komik' : src.type === 'watch' ? 'Tonton Anime' : src.type}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {src.notes || src.url}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={(e) => handleCopyLink(src.url, e)}
                            className="p-2 rounded-lg bg-black/40 hover:bg-black/80 text-slate-300 hover:text-white transition-colors cursor-pointer"
                            title="Salin Link Eksternal"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>

                          <div className="px-3 py-1.5 rounded-lg bg-[#ff5b14] text-white font-extrabold text-xs flex items-center gap-1 shadow group-hover:bg-[#e04e0e] transition-colors">
                            <span>Buka</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center bg-[#13131c] rounded-xl border border-[#222232] space-y-2">
                  <Info className="w-8 h-8 text-slate-500 mx-auto" />
                  <h5 className="font-bold text-xs text-white">Belum Ada Link Platform Tambahan</h5>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Admin belum menyematkan link penyedia eksternal khusus untuk komik ini. Anda dapat meminta link melalui form saran.
                  </p>
                </div>
              )}

              {/* Disclaimer / Info Box */}
              <div className="p-3 bg-[#13131c] rounded-xl border border-[#222230] flex items-start gap-2.5 text-slate-400 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong className="text-slate-200">Gateway AntiTimpa:</strong> Kami menghubungkan pembaca dengan platform resmi, scanlation, & database anime/komik global layaknya direktori MyAnimeList. Konten eksternal dihosting dan dikelola oleh masing-masing penyedia.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[#1f1f2e] bg-[#111118] flex items-center justify-between text-xs text-slate-400">
          <span className="truncate">
            AntiTimpa v2.4 • Portal Gateway
          </span>
          <button
            onClick={() => {
              setActiveRedirectingSource(null);
              onClose();
            }}
            className="px-4 py-1.5 bg-[#1e1e2c] hover:bg-[#28283a] text-white font-bold rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};

export default WhereToReadModal;
