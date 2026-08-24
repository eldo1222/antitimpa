import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { ComicPage } from '../../types';
import { downloadDrivePdf, convertImagesToPdf } from '../../utils/pdfConverter';
import { AdBanner } from './AdBanner';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Settings, 
  Maximize, 
  Minimize, 
  Lock, 
  BookOpen, 
  Sliders, 
  RotateCcw, 
  Sparkles, 
  CheckCircle2, 
  ListOrdered,
  X,
  ExternalLink,
  FileText,
  HardDrive,
  Download,
  Loader2
} from 'lucide-react';

export const ComicReaderView: React.FC = () => {
  const { 
    readingChapterId, 
    closeReader, 
    comics, 
    chapters, 
    currentUser, 
    openLoginModal, 
    startReading, 
    saveReadingProgress,
    getReadingProgress 
  } = useApp();

  const [readingMode, setReadingMode] = useState<'vertical' | 'paged'>('vertical');
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isHudVisible, setIsHudVisible] = useState(true);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChapterDrawer, setShowChapterDrawer] = useState(false);
  const [brightness, setBrightness] = useState<number>(100);
  const [livePages, setLivePages] = useState<ComicPage[] | null>(null);
  const [isLoadingPages, setIsLoadingPages] = useState(false);

  // Admin PDF Download / Conversion State
  const [isConvertingPdf, setIsConvertingPdf] = useState(false);
  const [pdfProgressText, setPdfProgressText] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef<number>(0);

  // Auto-hide HUD on scroll handler
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const currentScrollTop = scrollContainerRef.current.scrollTop;
    if (Math.abs(currentScrollTop - lastScrollTopRef.current) > 8) {
      if (isHudVisible) {
        setIsHudVisible(false);
      }
      lastScrollTopRef.current = currentScrollTop;
    }
  };

  // Find active comic and chapter
  let activeComic = comics.find(c => {
    const list = chapters[c.id] || [];
    return list.some(ch => ch.id === readingChapterId);
  });

  let activeChapter = activeComic ? (chapters[activeComic.id] || []).find(ch => ch.id === readingChapterId) : null;
  const comicChaptersList = activeComic ? [...(chapters[activeComic.id] || [])].sort((a, b) => a.chapterNumber - b.chapterNumber) : [];

  const currentChapterIndexInSorted = comicChaptersList.findIndex(ch => ch.id === readingChapterId);
  const prevChapter = currentChapterIndexInSorted > 0 ? comicChaptersList[currentChapterIndexInSorted - 1] : null;
  const nextChapter = currentChapterIndexInSorted < comicChaptersList.length - 1 ? comicChaptersList[currentChapterIndexInSorted + 1] : null;

  const sourceType = activeChapter?.sourceType || 'images';

  // Live fetch real scanlation pages if chapter originates from MangaDex or Komikcast
  useEffect(() => {
    if (!activeChapter) return;
    setLivePages(null);

    const mdChapterId = activeChapter.mangadexChapterId || 
      (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeChapter.id) ? activeChapter.id : null);

    if (mdChapterId) {
      setIsLoadingPages(true);

      const loadMangaDexPages = async () => {
        // Attempt 1: Express Server API route
        try {
          const res = await fetch(`/api/mangadex/pages/${mdChapterId}?quality=data`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.pages && data.pages.length > 0) {
              setLivePages(data.pages);
              return;
            }
          }
        } catch (err) {
          console.warn('Attempt 1 (Express MangaDex pages) failed:', err);
        }

        // Attempt 2: Netlify Function route
        try {
          const netlifyRes = await fetch(`/.netlify/functions/mangadex-proxy?action=pages&chapterId=${mdChapterId}&quality=data`);
          if (netlifyRes.ok) {
            const data = await netlifyRes.json();
            if (data && data.pages && data.pages.length > 0) {
              setLivePages(data.pages);
              return;
            }
          }
        } catch (err) {
          console.warn('Attempt 2 (Netlify MangaDex pages) failed:', err);
        }

        // Attempt 3: Client-side direct MangaDex API resolution (via proxy for images)
        try {
          const directRes = await fetch(`https://api.mangadex.org/at-home/server/${mdChapterId}`, {
            headers: { 'Accept': 'application/json' }
          });
          if (directRes.ok) {
            const json = await directRes.json();
            const baseUrl = json.baseUrl || 'https://uploads.mangadex.org';
            const hash = json.chapter?.hash;
            const fileList = json.chapter?.data || json.chapter?.dataSaver || [];
            if (hash && fileList.length > 0) {
              const mappedPages = fileList.map((filename: string, idx: number) => {
                const directUrl = `${baseUrl}/data/${hash}/${filename}`;
                return {
                  id: `p-${mdChapterId}-${idx + 1}`,
                  pageNumber: idx + 1,
                  imageUrl: `/api/mangadex/image?chapterId=${mdChapterId}&hash=${hash}&filename=${encodeURIComponent(filename)}&quality=data`,
                  fallbackUrl: `/api/proxy-image?url=${encodeURIComponent(directUrl)}`,
                  directUrl
                };
              });
              setLivePages(mappedPages);
              return;
            }
          }
        } catch (err) {
          console.warn('Attempt 3 (Direct MangaDex API) failed:', err);
        }
      };

      loadMangaDexPages().finally(() => {
        setIsLoadingPages(false);
      });
    } else if (activeChapter.driveUrl && activeChapter.driveUrl.includes('chapter') && !activeChapter.driveUrl.startsWith('http')) {
      // Komikcast chapter slug stored in driveUrl
      setIsLoadingPages(true);
      fetch(`/api/komikcast/chapter?slug=${encodeURIComponent(activeChapter.driveUrl)}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.pages && data.pages.length > 0) {
            setLivePages(data.pages);
          }
        })
        .catch(err => {
          console.warn('Failed to load Komikcast pages:', err);
        })
        .finally(() => {
          setIsLoadingPages(false);
        });
    }
  }, [activeChapter?.id, activeChapter?.mangadexChapterId, activeChapter?.driveUrl]);

  // Restore previous page if exists
  useEffect(() => {
    if (activeComic && activeChapter) {
      const prog = getReadingProgress(activeComic.id);
      if (prog && prog.chapterId === activeChapter.id && prog.pageNumber > 1) {
        setCurrentPageIndex(prog.pageNumber - 1);
      } else {
        setCurrentPageIndex(0);
      }
    }
  }, [readingChapterId]);

  const rawPages = (livePages && livePages.length > 0) ? livePages : (activeChapter?.pages || []);
  const pages = rawPages.map((p, idx) => typeof p === 'string' ? { id: `p-${idx}`, pageNumber: idx + 1, imageUrl: p } : p);

  // Admin PDF Download & Converter Handler
  const handleAdminDownloadPdf = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeChapter || !activeComic) return;

    setIsConvertingPdf(true);
    setPdfProgressText('Menyiapkan berkas dokumen...');

    try {
      const filename = `${activeComic.title} - Ch ${activeChapter.chapterNumber}`;

      if (sourceType === 'drive') {
        const driveTarget = activeChapter.driveEmbedUrl || activeChapter.driveFileId || '';
        const success = await downloadDrivePdf(driveTarget, filename, (msg) => setPdfProgressText(msg));
        if (!success) {
          throw new Error('Gagal mengunduh stream dari Google Drive.');
        }
      } else if (sourceType === 'pdf') {
        if (activeChapter.pdfUrl && activeChapter.pdfUrl.startsWith('blob:')) {
          const a = document.createElement('a');
          a.href = activeChapter.pdfUrl;
          a.download = `${filename}.pdf`;
          a.click();
          setPdfProgressText('Selesai mengunduh PDF!');
        } else {
          await downloadDrivePdf(activeChapter.pdfUrl || '', filename, (msg) => setPdfProgressText(msg));
        }
      } else {
        // Image pages mode -> convert to multi-page PDF!
        const imageUrls = pages.map(p => typeof p === 'string' ? p : p.imageUrl);
        await convertImagesToPdf(imageUrls, filename, (curr, total, msg) => {
          setPdfProgressText(`Mengonversi (${curr}/${total}): ${msg}`);
        });
      }
    } catch (err: any) {
      console.error('PDF Action failed:', err);
      alert('Gagal mengunduh/mengonversi PDF: ' + (err.message || 'Error'));
    } finally {
      setIsConvertingPdf(false);
      setTimeout(() => setPdfProgressText(null), 3500);
    }
  };

  // Update progress on page change
  useEffect(() => {
    if (activeComic && activeChapter && pages.length) {
      saveReadingProgress(
        activeComic.id, 
        activeChapter.id, 
        activeChapter.chapterNumber, 
        currentPageIndex + 1, 
        pages.length
      );
    }
  }, [currentPageIndex, activeChapter?.id, pages.length]);

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  if (!readingChapterId || !activeComic || !activeChapter) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0c0c10] flex flex-col items-center justify-center p-6 text-center text-slate-100 animate-in fade-in">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400 mb-4 border border-slate-700">
          <BookOpen className="w-8 h-8" />
        </div>
        <h2 className="font-extrabold text-xl text-white mb-2">Chapter Tidak Ditemukan</h2>
        <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">
          Chapter ini mungkin sedang dalam pembaruan atau URL tidak valid.
        </p>
        <button
          onClick={closeReader}
          className="px-6 py-2.5 bg-[#ff5b14] hover:bg-[#e04e0e] text-white font-bold rounded-xl shadow-lg cursor-pointer transition-all active:scale-95 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Detail Komik</span>
        </button>
      </div>
    );
  }

  const isNormalComic = activeComic.contentType === 'normal' || activeComic.isFree === true || !activeChapter.isLocked;

  // Security Check: If comic is VIP/18+ and unauthenticated, render lock block
  if (!isNormalComic && !currentUser) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0c0c10] flex flex-col items-center justify-center p-6 text-center text-slate-100 animate-in fade-in">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-lg">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="font-extrabold text-xl text-white mb-2">Chapter 18+ VIP Dikunci</h2>
        <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">
          Akses membaca chapter <span className="text-amber-400 font-bold">"{activeChapter.title}"</span> membutuhkan akun VIP aktif.
        </p>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => openLoginModal('🔒 Silakan login dengan akun VIP untuk membaca chapter ini.')}
            className="w-full py-3 bg-[#ff5b14] text-white font-bold rounded-xl shadow-lg shadow-[#ff5b14]/30 active:scale-95 transition-all cursor-pointer"
          >
            Login Akun VIP
          </button>
          <button
            onClick={closeReader}
            className="w-full py-2.5 bg-[#1a1a24] text-slate-300 font-semibold rounded-xl border border-[#2b2b3b] hover:bg-[#252535] transition-colors cursor-pointer"
          >
            Kembali ke Detail
          </button>
        </div>
      </div>
    );
  }

  const handleNextPage = () => {
    if (currentPageIndex < pages.length - 1) {
      setCurrentPageIndex(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Multi-tier fallback handler for MangaDex and remote chapter images
  const handlePageImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, fallbackUrl?: string) => {
    const target = e.currentTarget;
    const currentSrc = target.src;

    // Stage 1: If /api/mangadex/image fails, try Netlify functions route
    if (currentSrc.includes('/api/mangadex/image')) {
      const queryStr = currentSrc.split('/api/mangadex/image')[1] || '';
      target.src = `/.netlify/functions/mangadex-image${queryStr}`;
      return;
    }

    // Stage 2: If .netlify/functions/mangadex-image fails, try /api/proxy-image with fallbackUrl
    if (currentSrc.includes('/.netlify/functions/mangadex-image')) {
      if (fallbackUrl) {
        target.src = `/api/proxy-image?url=${encodeURIComponent(fallbackUrl)}`;
        return;
      }
    }

    // Stage 3: If /api/proxy-image fails, try /.netlify/functions/image-proxy
    if (currentSrc.includes('/api/proxy-image?url=')) {
      const originalUrl = decodeURIComponent(currentSrc.split('/api/proxy-image?url=')[1] || '');
      if (originalUrl) {
        target.src = `/.netlify/functions/image-proxy?url=${encodeURIComponent(originalUrl)}`;
        return;
      }
    }

    // Stage 4: If /.netlify/functions/image-proxy failed, try loading directly with no-referrer
    if (currentSrc.includes('/.netlify/functions/image-proxy?url=')) {
      const originalUrl = decodeURIComponent(currentSrc.split('/.netlify/functions/image-proxy?url=')[1] || '');
      if (originalUrl) {
        target.src = originalUrl;
        return;
      }
    }

    // Stage 5: If fallbackUrl provided and hasn't been tried yet
    if (fallbackUrl && target.src !== fallbackUrl) {
      target.src = fallbackUrl;
      return;
    }

    // Fallback: Clean illustrated placeholder
    target.src = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80';
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-[#09090c] text-slate-100 flex flex-col overflow-hidden select-none"
      style={{ filter: `brightness(${brightness}%)` }}
    >
      {/* Top Floating HUD Header */}
      <div 
        className={`fixed top-0 left-0 right-0 z-40 bg-[#0f0f14]/95 backdrop-blur-md px-4 py-3 border-b border-[#222232] flex items-center justify-between transition-all duration-300 transform ${
          isHudVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={closeReader}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Tutup Reader"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="min-w-0 max-w-[180px] sm:max-w-xs md:max-w-md">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs sm:text-sm text-white truncate" title={activeComic.title}>
                {activeComic.title}
              </h3>
              {activeChapter.mangadexChapterId && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold shrink-0">
                  {isLoadingPages ? 'Loading Scan...' : 'MangaDex Scan'}
                </span>
              )}
              {sourceType === 'drive' && (
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold flex items-center gap-1 shrink-0">
                  <HardDrive className="w-3 h-3" /> Drive Reader
                </span>
              )}
              {sourceType === 'pdf' && (
                <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-bold flex items-center gap-1 shrink-0">
                  <FileText className="w-3 h-3" /> PDF Reader
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#ff5b14] font-medium truncate" title={`Ch. ${activeChapter.chapterNumber} - ${activeChapter.title}`}>
              Ch. {activeChapter.chapterNumber} - {activeChapter.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Admin Download / PDF Converter Action */}
          {currentUser?.role === 'admin' && (
            <button
              onClick={handleAdminDownloadPdf}
              disabled={isConvertingPdf}
              className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-[#ff5b14] text-white text-xs font-bold shadow-md hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Khusus Akun Admin: Download / Konversi Dokumen ini ke PDF Asli"
            >
              {isConvertingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {isConvertingPdf ? 'Mengunduh...' : 'Admin: Download PDF'}
              </span>
            </button>
          )}

          {/* Chapter Picker Drawer Trigger */}
          <button
            onClick={() => setShowChapterDrawer(true)}
            className="p-2 rounded-xl bg-[#1a1a24] text-slate-300 hover:text-white border border-[#2b2b3e] text-xs font-semibold flex items-center gap-1.5"
            title="Pilih Chapter"
          >
            <ListOrdered className="w-4 h-4 text-[#ff5b14]" />
            <span className="hidden sm:inline">Chapter</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-[#1a1a24] text-slate-300 hover:text-white border border-[#2b2b3e]"
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Admin PDF Progress Notification Toast */}
      {pdfProgressText && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-[#12121c]/95 border border-[#ff5b14]/60 text-white rounded-full shadow-2xl backdrop-blur-md text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <Loader2 className="w-3.5 h-3.5 text-[#ff5b14] animate-spin shrink-0" />
          <span>{pdfProgressText}</span>
        </div>
      )}

      {/* Main Comic Canvas Area */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col items-center bg-[#070709] w-full"
        onClick={() => setIsHudVisible(prev => !prev)}
      >
        {/* CASE 1: GOOGLE DRIVE READER MODE - EXTENDED FULLSCREEN HEIGHT */}
        {sourceType === 'drive' ? (
          <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col items-center justify-between p-0 sm:p-2 pt-12 sm:pt-14 pb-8 min-h-[calc(100vh-20px)]">
            <div className="w-full flex-1 rounded-none sm:rounded-2xl overflow-hidden border-0 sm:border border-[#232338] bg-[#11111a] shadow-2xl relative flex flex-col min-h-[92vh] sm:min-h-[90vh] h-[calc(100vh-70px)] sm:h-[calc(100vh-100px)]">
              {activeChapter.driveEmbedUrl ? (
                <div className="relative w-full flex-1 min-h-[92vh] sm:min-h-[90vh] h-full">
                  <iframe
                    src={activeChapter.driveEmbedUrl}
                    title={`Google Drive - ${activeChapter.title}`}
                    className="w-full h-full min-h-[92vh] sm:min-h-[90vh] border-0 rounded-none sm:rounded-2xl bg-[#0e0e16]"
                    allow="autoplay; fullscreen"
                  />
                  
                  {/* Top-Right Transparent Protection Shield: Blocks clicks to Google Drive external popout/arrow button */}
                  <div 
                    className="absolute top-0 right-0 w-36 h-20 bg-transparent z-20 cursor-default"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    title="AntiTimpa Secure Reader"
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <HardDrive className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-white text-base">Dokumen Google Drive</h4>
                  <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                    Dokumen chapter ini disimpan secara aman pada server Google Drive reader terenkripsi.
                  </p>
                </div>
              )}
            </div>

            {/* End of Chapter Card */}
            <div className="w-full max-w-2xl p-4 my-4 rounded-2xl bg-[#13131c] border border-[#252538] text-center space-y-2 shadow-xl">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h4 className="font-extrabold text-xs text-white">Chapter {activeChapter.chapterNumber} (Google Drive Mode)</h4>
              
              {/* Ad Banner: Bawah Chapter */}
              <AdBanner position="reader_bottom_nav" className="my-2" />

              <div className="flex flex-wrap gap-2 justify-center pt-1">
                {nextChapter && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startReading(nextChapter.id);
                    }}
                    className="px-4 py-2 bg-[#ff5b14] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
                  >
                    <span>Lanjut Ch. {nextChapter.chapterNumber}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeReader();
                  }}
                  className="px-4 py-2 bg-[#1c1c28] text-slate-300 font-semibold text-xs rounded-xl border border-[#2a2a3e]"
                >
                  Kembali ke Detail
                </button>
              </div>
            </div>
          </div>
        ) : sourceType === 'pdf' ? (
          /* CASE 2: PDF DOCUMENT READER MODE */
          <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col items-center justify-between p-3 sm:p-4 pt-16 pb-20">
            <div className="w-full flex-1 rounded-2xl overflow-hidden border border-[#232338] bg-[#11111a] shadow-2xl relative flex flex-col min-h-[75vh]">
              {activeChapter.pdfUrl ? (
                <iframe
                  src={`${activeChapter.pdfUrl}#toolbar=1&navpanes=0`}
                  title={`PDF - ${activeChapter.title}`}
                  className="w-full flex-1 min-h-[72vh] border-0 rounded-2xl bg-[#0e0e16]"
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-white text-base">Dokumen Komik PDF</h4>
                  <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                    Dokumen PDF ini siap dibaca. Jika preview di browser tidak muncul otomatis, klik tautan di bawah.
                  </p>
                </div>
              )}
            </div>

            {/* End of Chapter Navigation for PDF */}
            <div className="w-full max-w-2xl p-5 my-6 rounded-2xl bg-[#13131c] border border-[#252538] text-center space-y-3 shadow-xl">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-sm text-white">Chapter {activeChapter.chapterNumber} (PDF Mode)</h4>
              
              {/* Ad Banner: Bawah Chapter */}
              <AdBanner position="reader_bottom_nav" className="my-2" />

              <div className="flex flex-wrap gap-2 justify-center pt-2">
                {nextChapter && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startReading(nextChapter.id);
                    }}
                    className="px-4 py-2 bg-[#ff5b14] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
                  >
                    <span>Lanjut Ch. {nextChapter.chapterNumber}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeReader();
                  }}
                  className="px-4 py-2 bg-[#1c1c28] text-slate-300 font-semibold text-xs rounded-xl border border-[#2a2a3e]"
                >
                  Kembali ke Detail
                </button>
              </div>
            </div>
          </div>
        ) : readingMode === 'vertical' ? (
          /* CASE 3: Vertical Webtoon Scroll Mode (JPG / Image Pages) */
          <div className="w-full max-w-2xl mx-auto flex flex-col items-center py-12 px-1 sm:px-2 space-y-3">
            {pages.map((page, idx) => {
              const pageUrl = typeof page === 'string' ? page : page.imageUrl;
              const pageId = typeof page === 'string' ? `page-${idx}` : page.id;
              const fallbackUrl = typeof page === 'object' && page ? (page as any).fallbackUrl || (page as any).directUrl : undefined;
              return (
                <div 
                  key={pageId} 
                  className="w-full relative shadow-2xl rounded-lg overflow-hidden bg-[#101017] border border-[#1f1f2d]"
                  style={{ maxWidth: `${zoomLevel}%` }}
                >
                  <img 
                    src={pageUrl} 
                    alt={`Halaman ${idx + 1}`}
                    className="w-full h-auto block object-cover"
                    loading="lazy" 
                    referrerPolicy="no-referrer"
                    onError={(e) => handlePageImageError(e, fallbackUrl)}
                  />
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[10px] text-slate-400 font-mono">
                    {idx + 1} / {pages.length}
                  </div>
                </div>
              );
            })}

            {/* End of Chapter Card */}
            <div className="w-full p-6 my-8 rounded-2xl bg-[#13131c] border border-[#252538] text-center space-y-4 shadow-xl">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <h4 className="font-extrabold text-base text-white">Chapter {activeChapter.chapterNumber} Selesai!</h4>
                <p className="text-xs text-slate-400 mt-1">Kamu telah menyelesaikan membaca chapter ini.</p>
              </div>

              {/* Ad Banner: Bawah Chapter */}
              <AdBanner position="reader_bottom_nav" className="my-2" />

              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                {nextChapter ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startReading(nextChapter.id);
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-[#ff5b14] to-[#f97316] text-white font-bold text-xs rounded-xl shadow-lg shadow-[#ff5b14]/30 flex items-center justify-center gap-2"
                  >
                    <span>Lanjut ke Chapter {nextChapter.chapterNumber}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="text-xs font-semibold text-amber-400 py-1">
                    Ini adalah chapter terbaru saat ini.
                  </div>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeReader();
                  }}
                  className="px-4 py-2.5 bg-[#1c1c28] text-slate-300 hover:text-white font-semibold text-xs rounded-xl border border-[#2a2a3e]"
                >
                  Kembali ke Detail
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* CASE 4: Single Page Paged Mode (JPG / Image Pages) */
          <div className="flex-1 w-full max-w-2xl mx-auto flex flex-col justify-center items-center p-4 relative min-h-screen">
            {pages[currentPageIndex] && (
              <div 
                className="w-full relative shadow-2xl rounded-xl overflow-hidden bg-[#101017] border border-[#1f1f2d]"
                style={{ maxWidth: `${zoomLevel}%` }}
              >
                <img 
                  src={typeof pages[currentPageIndex] === 'string' ? (pages[currentPageIndex] as string) : (pages[currentPageIndex] as ComicPage).imageUrl} 
                  alt={`Halaman ${currentPageIndex + 1}`}
                  className="w-full h-auto max-h-[85vh] object-contain mx-auto block" 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const cur = pages[currentPageIndex];
                    const fb = typeof cur === 'object' && cur ? (cur as any).fallbackUrl || (cur as any).directUrl : undefined;
                    handlePageImageError(e, fb);
                  }}
                />
              </div>
            )}

            {/* Left & Right Touch/Click Overlay Zones */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrevPage();
              }}
              disabled={currentPageIndex === 0}
              className={`absolute left-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 text-white backdrop-blur-sm border border-white/10 hover:bg-[#ff5b14] transition-all ${
                currentPageIndex === 0 ? 'opacity-20 cursor-not-allowed' : 'opacity-80 hover:opacity-100'
              }`}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNextPage();
              }}
              disabled={currentPageIndex === pages.length - 1}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 text-white backdrop-blur-sm border border-white/10 hover:bg-[#ff5b14] transition-all ${
                currentPageIndex === pages.length - 1 ? 'opacity-20 cursor-not-allowed' : 'opacity-80 hover:opacity-100'
              }`}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>

      {/* Bottom Floating Controls Bar */}
      <div 
        className={`fixed bottom-0 left-0 right-0 z-40 bg-[#0f0f14]/95 backdrop-blur-md px-4 py-2.5 border-t border-[#222232] flex items-center justify-between transition-all duration-300 transform text-xs ${
          isHudVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        {/* Prev Chapter */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (prevChapter) startReading(prevChapter.id);
          }}
          disabled={!prevChapter}
          className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1 ${
            prevChapter 
              ? 'bg-[#181824] border-[#29293c] text-slate-200 hover:text-white' 
              : 'opacity-30 border-transparent text-slate-600 cursor-not-allowed'
          }`}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Prev Ch.</span>
        </button>

        {/* Center: Mode switcher & Page indicator */}
        {sourceType === 'images' ? (
          <div 
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex bg-[#191924] p-1 rounded-xl border border-[#2b2b3b]">
              <button
                onClick={() => setReadingMode('vertical')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  readingMode === 'vertical' ? 'bg-[#ff5b14] text-white shadow' : 'text-slate-400'
                }`}
              >
                Webtoon
              </button>
              <button
                onClick={() => setReadingMode('paged')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  readingMode === 'paged' ? 'bg-[#ff5b14] text-white shadow' : 'text-slate-400'
                }`}
              >
                Halaman
              </button>
            </div>

            <span className="font-mono text-[11px] text-slate-400 bg-[#161620] px-2.5 py-1 rounded-lg border border-[#242434]">
              {readingMode === 'vertical' ? `${pages.length} Hal.` : `${currentPageIndex + 1} / ${pages.length}`}
            </span>
          </div>
        ) : (
          <div className="text-slate-400 text-xs font-semibold flex items-center gap-1.5">
            {sourceType === 'drive' ? (
              <span>Mode Baca Google Drive Interaktif</span>
            ) : (
              <span>Mode Baca PDF Interaktif</span>
            )}
          </div>
        )}

        {/* Next Chapter */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (nextChapter) startReading(nextChapter.id);
          }}
          disabled={!nextChapter}
          className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1 ${
            nextChapter 
              ? 'bg-[#ff5b14] border-[#ff5b14] text-white hover:opacity-90 shadow-md shadow-[#ff5b14]/20' 
              : 'opacity-30 border-transparent text-slate-600 cursor-not-allowed'
          }`}
        >
          <span className="hidden sm:inline">Next Ch.</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Chapter Drawer List Modal */}
      {showChapterDrawer && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end animate-in fade-in"
          onClick={() => setShowChapterDrawer(false)}
        >
          <div 
            className="w-80 max-w-[85vw] h-full bg-[#13131a] border-l border-[#242436] p-5 flex flex-col justify-between text-slate-200 animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#222232]">
                <div>
                  <h3 className="font-bold text-sm text-white">Daftar Chapter</h3>
                  <p className="text-[11px] text-slate-400">{activeComic.title}</p>
                </div>
                <button 
                  onClick={() => setShowChapterDrawer(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="my-3 space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
                {comicChaptersList.map(ch => {
                  const isCurrent = ch.id === readingChapterId;
                  const st = ch.sourceType || 'images';
                  return (
                    <button
                      key={ch.id}
                      onClick={() => {
                        startReading(ch.id);
                        setShowChapterDrawer(false);
                      }}
                      className={`w-full p-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-all ${
                        isCurrent 
                          ? 'bg-[#ff5b14] text-white shadow-md' 
                          : 'bg-[#181824] hover:bg-[#202030] text-slate-300 border border-[#262638]'
                      }`}
                    >
                      <div className="truncate flex items-center gap-1.5 flex-1 min-w-0" title={`Ch. ${ch.chapterNumber} - ${ch.title}`}>
                        <span className="truncate">Ch. {ch.chapterNumber} - {ch.title}</span>
                        {ch.mangadexChapterId && <span className="text-[9px] px-1 bg-emerald-500/30 text-emerald-200 rounded shrink-0">Live</span>}
                        {st === 'drive' && <span className="text-[9px] px-1 bg-blue-500/30 text-blue-200 rounded shrink-0">Drive</span>}
                        {st === 'pdf' && <span className="text-[9px] px-1 bg-red-500/30 text-red-200 rounded shrink-0">PDF</span>}
                      </div>
                      {isCurrent && <span className="text-[10px] px-1.5 py-0.5 bg-black/30 rounded shrink-0">Sedang Dibaca</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setShowChapterDrawer(false)}
              className="w-full py-2 bg-[#1b1b26] text-xs font-bold text-slate-300 rounded-xl"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
