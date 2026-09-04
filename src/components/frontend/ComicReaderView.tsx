import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ComicPage } from '../../types';
import { downloadDrivePdf, convertImagesToPdf } from '../../utils/pdfConverter';
import { getProfessionalComicSkeletonUrl } from '../common/ComicSkeletonBox';
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
  Loader2,
  Globe,
  Tv,
  Share2,
  ImageOff,
  AlertTriangle
} from 'lucide-react';

export const ComicReaderView: React.FC = () => {
  const params = useParams<{ comicId?: string; chapterId?: string }>();
  const navigate = useNavigate();
  const { 
    readingChapterId, 
    closeReader, 
    comics, 
    chapters, 
    currentUser, 
    openLoginModal, 
    startReading, 
    saveReadingProgress,
    getReadingProgress,
    updateChapter
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

  // Target chapter ID resolution from router params or state
  const effectiveChapterId = params.chapterId || readingChapterId;
  const effectiveComicId = params.comicId;

  // Find active comic and chapter with fallback matching by id, slug, or chapter number
  let activeComic = comics.find(c => {
    if (effectiveComicId && (c.id === effectiveComicId || c.slug === effectiveComicId)) return true;
    const list = chapters[c.id] || [];
    return list.some(ch => ch.id === effectiveChapterId || ch.slug === effectiveChapterId || String(ch.chapterNumber) === effectiveChapterId);
  }) || comics.find(c => {
    const list = chapters[c.id] || [];
    return list.some(ch => ch.id === effectiveChapterId || ch.slug === effectiveChapterId || String(ch.chapterNumber) === effectiveChapterId);
  });

  let activeChapter = activeComic 
    ? (chapters[activeComic.id] || []).find(ch => ch.id === effectiveChapterId || ch.slug === effectiveChapterId || String(ch.chapterNumber) === effectiveChapterId) 
    : null;

  if (!activeChapter && effectiveChapterId) {
    for (const c of comics) {
      const found = (chapters[c.id] || []).find(ch => ch.id === effectiveChapterId || ch.slug === effectiveChapterId || String(ch.chapterNumber) === effectiveChapterId);
      if (found) {
        activeComic = c;
        activeChapter = found;
        break;
      }
    }
  }

  // Ensure state matches router on mount or route changes
  useEffect(() => {
    if (effectiveChapterId && effectiveChapterId !== readingChapterId) {
      startReading(effectiveChapterId);
    }
  }, [effectiveChapterId]);

  // Scroll to top automatically whenever chapter changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [effectiveChapterId, readingChapterId]);

  const handleClose = () => {
    closeReader();
    if (activeComic) {
      navigate(`/comic/${activeComic.slug || activeComic.id}`);
    } else {
      navigate('/');
    }
  };

  const handleNavigateChapter = (newChapterId: string) => {
    if (!newChapterId) return;

    // Reset pagination and buffer states for the next chapter
    setCurrentPageIndex(0);
    setLivePages(null);
    setIsLoadingPages(false);

    // Scroll to top immediately
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Sync app context
    startReading(newChapterId);

    // Update browser URL
    const targetComicParam = params.comicId || activeComic?.slug || activeComic?.id;
    if (targetComicParam) {
      navigate(`/read/${targetComicParam}/${newChapterId}`);
    }
  };

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

  const comicChaptersList = activeComic ? [...(chapters[activeComic.id] || [])].sort((a, b) => a.chapterNumber - b.chapterNumber) : [];

  const currentChapterIndexInSorted = activeChapter 
    ? comicChaptersList.findIndex(ch => ch.id === activeChapter.id)
    : comicChaptersList.findIndex(ch => ch.id === effectiveChapterId || ch.slug === effectiveChapterId || String(ch.chapterNumber) === effectiveChapterId);

  const prevChapter = currentChapterIndexInSorted > 0 ? comicChaptersList[currentChapterIndexInSorted - 1] : null;
  const nextChapter = (currentChapterIndexInSorted >= 0 && currentChapterIndexInSorted < comicChaptersList.length - 1) 
    ? comicChaptersList[currentChapterIndexInSorted + 1] 
    : null;

  const sourceType = activeChapter?.sourceType || 'images';

  // Live fetch real scanlation pages if chapter originates from MangaDex, Komiktap, or Komikindo
  useEffect(() => {
    if (!activeChapter) return;
    
    // If pages already exist in memory / database, use them immediately
    if (activeChapter.pages && activeChapter.pages.length > 0) {
      setLivePages(activeChapter.pages as any);
      setIsLoadingPages(false);
      return;
    }

    setLivePages(null);

    // 1. KOMIKTAP DETECTION & FETCHING
    const isKomiktap = (activeChapter.externalUrl && activeChapter.externalUrl.includes('komiktap.info')) ||
      (activeChapter.slug && activeChapter.slug.includes('komiktap.info')) ||
      (activeChapter.slug && activeChapter.slug.includes('-chapter-')) ||
      (activeChapter.driveUrl && activeChapter.driveUrl.includes('komiktap.info')) ||
      (activeChapter.driveUrl && activeChapter.driveUrl.includes('-chapter-')) ||
      (activeComic?.sourceApi?.toLowerCase().includes('komiktap')) ||
      (activeComic?.sourceUrl?.toLowerCase().includes('komiktap.info'));

    if (isKomiktap) {
      setIsLoadingPages(true);
      let targetUrl = activeChapter.slug || activeChapter.driveUrl || activeChapter.externalUrl || '';
      if (!targetUrl || targetUrl.startsWith('ch-')) {
        const cSlug = activeComic?.slug || activeComic?.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || '';
        targetUrl = `${cSlug}-chapter-${activeChapter.chapterNumber}`;
      }

      const fetchUrl = `/api/komiktap/chapter?url=${encodeURIComponent(targetUrl)}`;
      const fallbackProxyUrl = `/api/komiktap-proxy?action=chapter&url=${encodeURIComponent(targetUrl)}`;

      fetch(fetchUrl)
        .then(async r => {
          if (r.ok) return r.json();
          const r2 = await fetch(fallbackProxyUrl);
          return r2.json();
        })
        .then(data => {
          if (data && data.pages && data.pages.length > 0) {
            setLivePages(data.pages);
            if (activeComic?.id && activeChapter?.id) {
              updateChapter(activeComic.id, activeChapter.id, { pages: data.pages, sourceType: 'images' });
            }
          }
        })
        .catch(err => {
          console.warn('Failed to load Komiktap pages:', err);
        })
        .finally(() => {
          setIsLoadingPages(false);
        });
      return;
    }

    // 2. KOMIKINDO DETECTION & FETCHING
    const isKomikindo = (activeChapter.externalUrl && activeChapter.externalUrl.includes('komikindo.ch')) ||
      (activeChapter.driveUrl && activeChapter.driveUrl.includes('komikindo.ch')) ||
      (activeComic?.sourceApi?.toLowerCase().includes('komikindo')) ||
      (activeComic?.sourceUrl?.toLowerCase().includes('komikindo.ch'));

    if (isKomikindo) {
      setIsLoadingPages(true);
      let targetUrl = activeChapter.externalUrl || activeChapter.driveUrl || activeChapter.slug || '';
      if (!targetUrl || targetUrl.startsWith('ch-')) {
        const cSlug = activeComic?.slug || activeComic?.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || '';
        targetUrl = `https://komikindo.ch/${cSlug}-chapter-${activeChapter.chapterNumber}/`;
      }

      const fetchUrl = `/api/komikindo/chapter?url=${encodeURIComponent(targetUrl)}`;
      const fallbackProxyUrl = `/api/komikindo-proxy?action=chapter&url=${encodeURIComponent(targetUrl)}`;

      fetch(fetchUrl)
        .then(async r => {
          if (r.ok) return r.json();
          const r2 = await fetch(fallbackProxyUrl);
          return r2.json();
        })
        .then(data => {
          if (data && data.pages && data.pages.length > 0) {
            setLivePages(data.pages);
            if (activeComic?.id && activeChapter?.id) {
              updateChapter(activeComic.id, activeChapter.id, { pages: data.pages, sourceType: 'images' });
            }
          }
        })
        .catch(err => {
          console.warn('Failed to load Komikindo pages:', err);
        })
        .finally(() => {
          setIsLoadingPages(false);
        });
      return;
    }

    // 2. MANGADEX DETECTION & FETCHING
    const rawSlug = String(activeChapter.slug || '');
    const rawId = String(activeChapter.id || '').replace(/^ch-/, '');
    const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    const mdChapterId = activeChapter.mangadexChapterId || 
      (isUuid(rawSlug) ? rawSlug : (isUuid(rawId) ? rawId : null));

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

        // Attempt 2: Serverless Function route (/api/mangadex-proxy)
        try {
          const vercelRes = await fetch(`/api/mangadex-proxy?action=pages&chapterId=${mdChapterId}&quality=data`);
          if (vercelRes.ok) {
            const data = await vercelRes.json();
            if (data && data.pages && data.pages.length > 0) {
              setLivePages(data.pages);
              return;
            }
          }
        } catch (err) {
          console.warn('Attempt 2 (Serverless MangaDex pages) failed:', err);
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
                const uploadsDirectUrl = `https://uploads.mangadex.org/data/${hash}/${filename}`;
                return {
                  id: `p-${mdChapterId}-${idx + 1}`,
                  pageNumber: idx + 1,
                  imageUrl: `/api/mangadex/image?chapterId=${mdChapterId}&hash=${hash}&filename=${encodeURIComponent(filename)}&quality=data&baseUrl=${encodeURIComponent(baseUrl)}`,
                  fallbackUrl: `/api/proxy-image?url=${encodeURIComponent(uploadsDirectUrl)}`,
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
    }
  }, [activeChapter?.id, activeChapter?.slug, activeChapter?.mangadexChapterId, activeChapter?.driveUrl, activeChapter?.externalUrl]);

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

  // Keyboard navigation support: Left Arrow = Previous, Right Arrow = Next
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        if (readingMode === 'paged') {
          if (currentPageIndex > 0) {
            handlePrevPage();
          } else if (prevChapter) {
            handleNavigateChapter(prevChapter.id);
          }
        } else if (prevChapter) {
          handleNavigateChapter(prevChapter.id);
        }
      } else if (e.key === 'ArrowRight') {
        if (readingMode === 'paged') {
          if (currentPageIndex < pages.length - 1) {
            handleNextPage();
          } else if (nextChapter) {
            handleNavigateChapter(nextChapter.id);
          }
        } else if (nextChapter) {
          handleNavigateChapter(nextChapter.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readingMode, currentPageIndex, pages.length, prevChapter?.id, nextChapter?.id]);

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

  // Multi-tier fallback handler for MangaDex, Komiktap, and remote chapter images
  const handlePageImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, fallbackUrl?: string) => {
    const target = e.currentTarget;
    const currentSrc = target.src;

    // Stage 1: If /api/mangadex/image fails and fallbackUrl exists, try /api/proxy-image
    if (currentSrc.includes('/api/mangadex/image')) {
      if (fallbackUrl) {
        target.src = `/api/proxy-image?url=${encodeURIComponent(fallbackUrl)}`;
        return;
      }
    }

    // Stage 2: If /api/proxy-image fails, try direct URL without referrer or external CORS proxy
    if (currentSrc.includes('/api/proxy-image?url=')) {
      const originalUrl = decodeURIComponent(currentSrc.split('/api/proxy-image?url=')[1] || '');
      if (originalUrl) {
        // First attempt direct load with no-referrer
        target.referrerPolicy = 'no-referrer';
        target.src = originalUrl;
        return;
      }
    }

    // Stage 3: If direct load failed, try corsproxy.io as reliable CDN bridge
    if (!currentSrc.includes('corsproxy.io/?url=') && (fallbackUrl || currentSrc.startsWith('http'))) {
      const targetUrl = fallbackUrl || currentSrc;
      target.src = `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`;
      return;
    }

    // Stage 4: If fallbackUrl provided and hasn't been tried yet
    if (fallbackUrl && target.src !== fallbackUrl) {
      target.referrerPolicy = 'no-referrer';
      target.src = fallbackUrl;
      return;
    }

    // If all stages fail, hide the broken image cleanly to avoid annoying placeholder clutter
    target.style.display = 'none';
    const parentContainer = target.parentElement;
    if (parentContainer && !parentContainer.querySelector('.reader-img-failed-notice')) {
      const noticeDiv = document.createElement('div');
      noticeDiv.className = 'reader-img-failed-notice p-8 text-center bg-[#101018] text-slate-400 text-xs flex flex-col items-center gap-2';
      noticeDiv.innerHTML = '<span class="text-amber-400 font-semibold text-xs flex items-center gap-1.5">⚠️ Halaman ini tidak dapat dimuat dari server sumber.</span>';
      parentContainer.appendChild(noticeDiv);
    }
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
            onClick={handleClose}
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

          {/* Quick Prev / Next Chapter Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (prevChapter) handleNavigateChapter(prevChapter.id);
              }}
              disabled={!prevChapter}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all ${
                prevChapter 
                  ? 'bg-[#1a1a24] text-slate-300 hover:text-white hover:bg-[#252536] border-[#2b2b3e] cursor-pointer' 
                  : 'bg-[#12121a] text-slate-600 border-transparent cursor-not-allowed opacity-30'
              }`}
              title={prevChapter ? `Ke Ch. ${prevChapter.chapterNumber}` : 'Tidak ada chapter sebelumnya'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (nextChapter) handleNavigateChapter(nextChapter.id);
              }}
              disabled={!nextChapter}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all ${
                nextChapter 
                  ? 'bg-[#ff5b14] text-white hover:bg-[#e04e0e] border-[#ff5b14] shadow cursor-pointer' 
                  : 'bg-[#12121a] text-slate-600 border-transparent cursor-not-allowed opacity-30'
              }`}
              title={nextChapter ? `Ke Ch. ${nextChapter.chapterNumber}` : 'Tidak ada chapter berikutnya'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Chapter Picker Drawer Trigger */}
          <button
            onClick={() => setShowChapterDrawer(true)}
            className="p-2 rounded-xl bg-[#1a1a24] text-slate-300 hover:text-white border border-[#2b2b3e] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            title="Pilih Chapter"
          >
            <ListOrdered className="w-4 h-4 text-[#ff5b14]" />
            <span className="hidden sm:inline">Chapter</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-[#1a1a24] text-slate-300 hover:text-white border border-[#2b2b3e] cursor-pointer"
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
        {/* CASE 0: EXTERNAL GATEWAY READER MODE (NHentai, DoujinDesu, MangaPlus, etc.) */}
        {(sourceType === 'external' && pages.length === 0 && !livePages && !isLoadingPages) ? (
          <div className="w-full max-w-3xl mx-auto flex-1 flex flex-col items-center justify-center p-4 sm:p-6 pt-20 pb-20 space-y-6">
            <div className="w-full bg-[#12121c] border border-[#2b2b3d] rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200">
              
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ff5b14]/30 to-pink-600/30 border border-[#ff5b14]/40 text-[#ff5b14] shadow-lg">
                <Globe className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ff5b14]/20 border border-[#ff5b14]/40 text-[11px] font-black text-[#ff7a3d] uppercase tracking-wide">
                  <span>Where to Read • Gateway Eksternal</span>
                </div>
                
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Chapter #{activeChapter.chapterNumber}: {activeChapter.title}
                </h2>

                <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
                  Chapter ini disediakan dan dihosting melalui platform mitra penyedia (
                  <strong className="text-white">{activeChapter.externalPlatform || 'Penyedia Pihak Ketiga'}</strong>
                  ). Anda akan dialihkan secara aman ke tautan baca resmi/scanlation.
                </p>
              </div>

              {/* Target URL Preview */}
              {activeChapter.externalUrl && (
                <div className="p-3 bg-black/50 border border-white/10 rounded-xl max-w-md mx-auto truncate text-xs font-mono text-slate-400">
                  {activeChapter.externalUrl}
                </div>
              )}

              {/* Primary Action Button */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activeChapter.externalUrl) {
                      window.open(activeChapter.externalUrl, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-[#ff5b14] to-[#f97316] hover:opacity-95 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-xl shadow-[#ff5b14]/30 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Buka di {activeChapter.externalPlatform || 'Platform Penyedia'} (Tab Baru)</span>
                </button>
              </div>

              {/* Reader Ad Banner */}
              <div className="pt-4 border-t border-[#1f1f2e]">
                <AdBanner position="reader_bottom_nav" />
              </div>
            </div>

            {/* Seamless Chapter Switcher */}
            <div className="w-full bg-[#141420] border border-[#252538] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                {prevChapter && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNavigateChapter(prevChapter.id);
                    }}
                    className="px-3.5 py-2 bg-[#1e1e2c] hover:bg-[#28283a] text-slate-300 font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Ch. {prevChapter.chapterNumber}</span>
                  </button>
                )}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                className="px-4 py-2 bg-[#1e1e2c] hover:bg-[#28283a] text-white font-bold rounded-xl transition-colors cursor-pointer"
              >
                Kembali ke Detail Komik
              </button>

              <div className="flex items-center gap-2">
                {nextChapter && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNavigateChapter(nextChapter.id);
                    }}
                    className="px-4 py-2 bg-[#ff5b14] hover:bg-[#e04e0e] text-white font-extrabold rounded-xl flex items-center gap-1.5 shadow transition-colors cursor-pointer"
                  >
                    <span>Ch. {nextChapter.chapterNumber}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : sourceType === 'drive' ? (
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
                {prevChapter && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNavigateChapter(prevChapter.id);
                    }}
                    className="px-4 py-2 bg-[#1c1c28] hover:bg-[#252538] text-slate-300 font-semibold text-xs rounded-xl border border-[#2a2a3e] flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev Ch. {prevChapter.chapterNumber}</span>
                  </button>
                )}
                {nextChapter && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNavigateChapter(nextChapter.id);
                    }}
                    className="px-4 py-2 bg-[#ff5b14] hover:bg-[#e04e0e] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <span>Lanjut Ch. {nextChapter.chapterNumber}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                  }}
                  className="px-4 py-2 bg-[#1c1c28] hover:bg-[#252538] text-slate-300 font-semibold text-xs rounded-xl border border-[#2a2a3e] cursor-pointer"
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
                {prevChapter && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNavigateChapter(prevChapter.id);
                    }}
                    className="px-4 py-2 bg-[#1c1c28] hover:bg-[#252538] text-slate-300 font-semibold text-xs rounded-xl border border-[#2a2a3e] flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev Ch. {prevChapter.chapterNumber}</span>
                  </button>
                )}
                {nextChapter && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNavigateChapter(nextChapter.id);
                    }}
                    className="px-4 py-2 bg-[#ff5b14] hover:bg-[#e04e0e] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <span>Lanjut Ch. {nextChapter.chapterNumber}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                  }}
                  className="px-4 py-2 bg-[#1c1c28] hover:bg-[#252538] text-slate-300 font-semibold text-xs rounded-xl border border-[#2a2a3e] cursor-pointer"
                >
                  Kembali ke Detail
                </button>
              </div>
            </div>
          </div>
        ) : readingMode === 'vertical' ? (
          /* CASE 3: Vertical Webtoon Scroll Mode (JPG / Image Pages) */
          <div className="w-full max-w-2xl mx-auto flex flex-col items-center py-12 px-1 sm:px-2 space-y-3">
            {/* Top Reader Ad Banner (Paling Atas Sebelum Halaman 1) */}
            <div className="w-full mb-2">
              <AdBanner position="reader_top_bar" />
            </div>

            {isLoadingPages && pages.length === 0 ? (
              <div className="w-full py-24 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-[#ff5b14] animate-spin" />
                <p className="text-xs text-slate-400 font-medium">Memuat halaman chapter...</p>
              </div>
            ) : null}

            {!isLoadingPages && pages.length === 0 ? (
              <div className="w-full max-w-md mx-auto my-16 p-8 bg-[#12121c] rounded-2xl border border-[#252538] text-center space-y-4 shadow-xl">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
                  <ImageOff className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Gambar Chapter Belum Tersedia</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Chapter #{activeChapter.chapterNumber} saat ini belum memiliki konten gambar atau server sumber sedang tidak dapat dijangkau.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                  {prevChapter ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigateChapter(prevChapter.id);
                      }}
                      className="px-4 py-2.5 bg-[#1c1c28] hover:bg-[#252538] text-slate-300 hover:text-white font-semibold text-xs rounded-xl border border-[#2a2a3e] flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Prev Ch. {prevChapter.chapterNumber}</span>
                    </button>
                  ) : null}
                  {nextChapter ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigateChapter(nextChapter.id);
                      }}
                      className="px-4 py-2.5 bg-[#ff5b14] hover:bg-[#e04e0e] text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <span>Lanjut ke Ch. {nextChapter.chapterNumber}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : null}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClose();
                    }}
                    className="px-4 py-2.5 bg-[#1c1c28] hover:bg-[#252538] text-slate-300 hover:text-white font-semibold text-xs rounded-xl border border-[#2a2a3e] cursor-pointer"
                  >
                    Kembali ke Detail
                  </button>
                </div>
              </div>
            ) : null}

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
            {pages.length > 0 && (
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
                  {prevChapter ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigateChapter(prevChapter.id);
                      }}
                      className="px-4 py-2.5 bg-[#1c1c28] hover:bg-[#252538] text-slate-300 hover:text-white font-semibold text-xs rounded-xl border border-[#2a2a3e] flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Prev Ch. {prevChapter.chapterNumber}</span>
                    </button>
                  ) : null}

                  {nextChapter ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigateChapter(nextChapter.id);
                      }}
                      className="px-5 py-2.5 bg-gradient-to-r from-[#ff5b14] to-[#f97316] text-white font-bold text-xs rounded-xl shadow-lg shadow-[#ff5b14]/30 flex items-center justify-center gap-2 cursor-pointer hover:opacity-95 transition-all"
                    >
                      <span>Lanjut ke Ch. {nextChapter.chapterNumber}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="text-xs font-semibold text-amber-400 py-2.5 px-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      Ini adalah chapter paling akhir saat ini.
                    </div>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClose();
                    }}
                    className="px-4 py-2.5 bg-[#1c1c28] hover:bg-[#252538] text-slate-300 hover:text-white font-semibold text-xs rounded-xl border border-[#2a2a3e] cursor-pointer"
                  >
                    Kembali ke Detail
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* CASE 4: Single Page Paged Mode (JPG / Image Pages) */
          <div className="flex-1 w-full max-w-2xl mx-auto flex flex-col justify-center items-center p-4 relative min-h-screen">
            {isLoadingPages && pages.length === 0 && (
              <div className="w-full py-24 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-[#ff5b14] animate-spin" />
                <p className="text-xs text-slate-400 font-medium">Memuat halaman chapter...</p>
              </div>
            )}

            {!isLoadingPages && pages.length === 0 && (
              <div className="w-full max-w-md mx-auto my-16 p-8 bg-[#12121c] rounded-2xl border border-[#252538] text-center space-y-4 shadow-xl">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
                  <ImageOff className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Gambar Chapter Belum Tersedia</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Chapter #{activeChapter.chapterNumber} saat ini belum memiliki konten gambar atau server sumber sedang tidak dapat dijangkau.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClose();
                    }}
                    className="px-4 py-2.5 bg-[#1c1c28] text-slate-300 hover:text-white font-semibold text-xs rounded-xl border border-[#2a2a3e]"
                  >
                    Kembali ke Detail
                  </button>
                </div>
              </div>
            )}

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
            {pages.length > 0 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (currentPageIndex > 0) {
                      handlePrevPage();
                    } else if (prevChapter) {
                      handleNavigateChapter(prevChapter.id);
                    }
                  }}
                  disabled={currentPageIndex === 0 && !prevChapter}
                  className={`absolute left-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 text-white backdrop-blur-sm border border-white/10 hover:bg-[#ff5b14] transition-all cursor-pointer ${
                    currentPageIndex === 0 && !prevChapter ? 'opacity-20 cursor-not-allowed' : 'opacity-80 hover:opacity-100'
                  }`}
                  title={currentPageIndex === 0 && prevChapter ? `Ke Ch. Sebelumnya (${prevChapter.chapterNumber})` : 'Halaman Sebelumnya'}
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (currentPageIndex < pages.length - 1) {
                      handleNextPage();
                    } else if (nextChapter) {
                      handleNavigateChapter(nextChapter.id);
                    }
                  }}
                  disabled={currentPageIndex === pages.length - 1 && !nextChapter}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 text-white backdrop-blur-sm border border-white/10 hover:bg-[#ff5b14] transition-all cursor-pointer ${
                    currentPageIndex === pages.length - 1 && !nextChapter ? 'opacity-20 cursor-not-allowed' : 'opacity-80 hover:opacity-100'
                  }`}
                  title={currentPageIndex === pages.length - 1 && nextChapter ? `Ke Ch. Berikutnya (${nextChapter.chapterNumber})` : 'Halaman Berikutnya'}
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
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
            if (prevChapter) handleNavigateChapter(prevChapter.id);
          }}
          disabled={!prevChapter}
          className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1 transition-all ${
            prevChapter 
              ? 'bg-[#181824] border-[#29293c] text-slate-200 hover:text-white hover:bg-[#232336] cursor-pointer' 
              : 'opacity-30 border-transparent text-slate-600 cursor-not-allowed'
          }`}
          title={prevChapter ? `Ke Chapter ${prevChapter.chapterNumber}` : 'Tidak ada chapter sebelumnya'}
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
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  readingMode === 'vertical' ? 'bg-[#ff5b14] text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Webtoon
              </button>
              <button
                onClick={() => setReadingMode('paged')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  readingMode === 'paged' ? 'bg-[#ff5b14] text-white shadow' : 'text-slate-400 hover:text-slate-200'
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
            if (nextChapter) handleNavigateChapter(nextChapter.id);
          }}
          disabled={!nextChapter}
          className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1 transition-all ${
            nextChapter 
              ? 'bg-[#ff5b14] border-[#ff5b14] text-white hover:bg-[#e04e0e] shadow-md shadow-[#ff5b14]/20 cursor-pointer' 
              : 'opacity-30 border-transparent text-slate-600 cursor-not-allowed'
          }`}
          title={nextChapter ? `Ke Chapter ${nextChapter.chapterNumber}` : 'Tidak ada chapter berikutnya'}
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
                {comicChaptersList.map((ch, idx) => {
                  const isCurrent = ch.id === readingChapterId || ch.id === effectiveChapterId || ch.id === activeChapter?.id || (effectiveChapterId && ch.slug === effectiveChapterId);
                  const st = ch.sourceType || 'images';
                  return (
                    <button
                      key={`${ch.id || ch.chapterNumber}-${idx}`}
                      onClick={() => {
                        handleNavigateChapter(ch.id);
                        setShowChapterDrawer(false);
                      }}
                      className={`w-full p-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
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
