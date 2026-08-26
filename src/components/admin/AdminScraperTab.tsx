import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  searchMangaDex, 
  searchJikanManga,
  searchKomikcast,
  getKomikcastDetail,
  searchDoujindesu,
  DOUJINDESU_SCRAPE_FEEDS,
  PRESET_SCRAPE_FEEDS, 
  buildComicFromScrape, 
  buildComicFromScrapeAsync,
  ScrapedComicResult,
  runClientSideMassScraper,
  getClientScraperOffsets,
  saveClientScraperOffsets,
  resetClientScraperOffsets
} from '../../services/comicScraperService';
import { getProfessionalComicSkeletonUrl } from '../common/ComicSkeletonBox';
import { downloadDrivePdf, convertImagesToPdf } from '../../utils/pdfConverter';
import { 
  Download, 
  Search, 
  Globe, 
  Sparkles, 
  CheckCircle2, 
  RefreshCw, 
  Eye, 
  Lock, 
  Unlock, 
  Plus, 
  AlertCircle, 
  FileJson, 
  Layers, 
  Zap, 
  Tag, 
  Check, 
  Flame, 
  Filter,
  FileText,
  HardDrive,
  Loader2,
  ExternalLink,
  BookOpen,
  ArrowDownToLine,
  RotateCcw
} from 'lucide-react';
import { ComicContentType, ComicCategoryType } from '../../types';

export const AdminScraperTab: React.FC = () => {
  const { comics, chapters, injectComicWithChapters, batchInjectComicsWithChapters, driveAccounts, addActivityLog } = useApp();

  const [activeSource, setActiveSource] = useState<'komikcast' | 'mangadex' | 'jikan' | 'presets' | 'pdf_converter' | 'custom'>('komikcast');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ScrapedComicResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Komikcast filters
  const [komikcastCategoryFilter, setKomikcastCategoryFilter] = useState<'all' | 'manga' | 'manhwa' | 'manhua' | 'doujin' | '18plus'>('all');
  const [komikcastOrder, setKomikcastOrder] = useState<'popular' | 'latest' | 'update'>('popular');

  // MangaDex, Doujindesu & Preset filters
  const [mangadexCategoryFilter, setMangadexCategoryFilter] = useState<'all' | '18plus' | 'manhwa' | 'manga' | 'manhua'>('18plus');
  const [doujindesuCategoryFilter, setDoujindesuCategoryFilter] = useState<'all' | '18plus' | 'doujin' | 'netorare' | 'milf' | 'harem'>('all');
  const [presetCategoryFilter, setPresetCategoryFilter] = useState<'all' | 'manga' | 'manhwa' | 'manhua' | '18plus'>('18plus');

  // Custom JSON input
  const [customJson, setCustomJson] = useState('');

  // Default import configuration settings
  const [defaultContentType, setDefaultContentType] = useState<ComicContentType>('18plus');
  const [defaultIsVisibleOnHome, setDefaultIsVisibleOnHome] = useState(true);
  const [defaultIsFree, setDefaultIsFree] = useState(false);
  const [defaultDriveAccountId, setDefaultDriveAccountId] = useState(driveAccounts[0]?.id || '');

  // Track imported titles in this session
  const [importedSlugs, setImportedSlugs] = useState<Record<string, boolean>>({});
  const [batchStatus, setBatchStatus] = useState<string | null>(null);

  // PDF Downloader Tool State
  const [drivePdfUrl, setDrivePdfUrl] = useState('');
  const [drivePdfTitle, setDrivePdfTitle] = useState('');
  const [isDownloadingDrivePdf, setIsDownloadingDrivePdf] = useState(false);
  const [drivePdfStatusMsg, setDrivePdfStatusMsg] = useState<string | null>(null);

  // Chapter-to-PDF Converter State
  const [selectedComicIdForPdf, setSelectedComicIdForPdf] = useState<string>(comics[0]?.id || '');
  const [selectedChapterIdForPdf, setSelectedChapterIdForPdf] = useState<string>('');
  const [isConvertingChapterPdf, setIsConvertingChapterPdf] = useState(false);
  const [chapterPdfProgress, setChapterPdfProgress] = useState<string | null>(null);

  // Auto-Scraper Background Status State
  const [autoScraperInfo, setAutoScraperInfo] = useState<{
    isRunning: boolean;
    statusMessage: string;
    totalComicsInDB: number;
    totalChaptersInDB: number;
    scrapedThisSession: number;
    targetCount?: number;
    currentCategory?: string;
    logs: string[];
    offsets?: Record<string, number>;
  }>({
    isRunning: false,
    statusMessage: 'Siap (Idle)',
    totalComicsInDB: comics.length,
    totalChaptersInDB: 0,
    scrapedThisSession: 0,
    targetCount: 500,
    currentCategory: 'Standby',
    logs: [],
    offsets: getClientScraperOffsets()
  });
  const [selectedBatchSize, setSelectedBatchSize] = useState<number>(500);
  const [selectedAutoCategory, setSelectedAutoCategory] = useState<string>('all');
  const [isTriggeringSync, setIsTriggeringSync] = useState(false);
  const [showScraperLogs, setShowScraperLogs] = useState(false);
  const clientScraperStopRef = useRef(false);

  // Poll Auto-Scraper Status from Server (if backend is active)
  const fetchAutoScraperStatus = async () => {
    try {
      const res = await fetch('/api/scraper/auto-status');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data && typeof data.totalComicsInDB === 'number') {
          setAutoScraperInfo(prev => ({
            ...data,
            totalComicsInDB: Math.max(data.totalComicsInDB, comics.length),
            logs: data.logs && data.logs.length > 0 ? data.logs : prev.logs
          }));
        }
      }
    } catch (e) {
      // ignore
    }
  };

  React.useEffect(() => {
    fetchAutoScraperStatus();
    const interval = setInterval(fetchAutoScraperStatus, autoScraperInfo.isRunning ? 2000 : 8000);
    return () => clearInterval(interval);
  }, [autoScraperInfo.isRunning]);

  // Dual-Engine Mass Scraper Trigger (Universal for both Netlify SPA & AI Studio Server)
  const handleTriggerAutoSync = async () => {
    setIsTriggeringSync(true);
    clientScraperStopRef.current = false;

    let serverSuccess = false;
    try {
      const res = await fetch('/api/scraper/auto-sync', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ 
          targetCount: selectedBatchSize, 
          categoryFilter: selectedAutoCategory,
          preFetchChapters: true 
        })
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data && data.success && data.mode !== 'client_turbo') {
          serverSuccess = true;
          setAutoScraperInfo(prev => ({ 
            ...prev, 
            isRunning: true, 
            targetCount: selectedBatchSize,
            statusMessage: `Memulai mass scraper server (Target: ${selectedBatchSize} komik)...` 
          }));
        }
      }
    } catch (e) {
      serverSuccess = false;
    }

    // If server-side Express scraper is not running (e.g. Netlify Static SPA hosting), execute Universal Client-Side Turbo Scraper!
    if (!serverSuccess) {
      setAutoScraperInfo(prev => ({
        ...prev,
        isRunning: true,
        targetCount: selectedBatchSize,
        scrapedThisSession: 0,
        currentCategory: 'Mempersiapkan Aliran Data...',
        statusMessage: `Memulai Turbo Mass Scraper (Target: ${selectedBatchSize} komik)...`,
        logs: [`[${new Date().toLocaleTimeString('id-ID')}] 🚀 Memulai Turbo Client Scraper (Target: ${selectedBatchSize} Komik, Filter: ${selectedAutoCategory.toUpperCase()})`, ...prev.logs]
      }));

      const existingComicIds = new Set(comics.map(c => c.id));
      const existingTitles = new Set(comics.map(c => (c.title || '').toLowerCase().trim()));

      try {
        const result = await runClientSideMassScraper({
          targetCount: selectedBatchSize,
          categoryFilter: selectedAutoCategory,
          existingComicIds,
          existingTitles,
          defaultContentType,
          defaultDriveAccountId,
          shouldStop: () => clientScraperStopRef.current,
          onLog: (logMsg) => {
            setAutoScraperInfo(prev => ({
              ...prev,
              logs: [logMsg, ...prev.logs.slice(0, 79)]
            }));
          },
          onProgress: ({ scrapedThisSession, targetCount, statusMessage, currentCategory, newlyAddedBatch }) => {
            if (newlyAddedBatch && newlyAddedBatch.length > 0) {
              batchInjectComicsWithChapters(newlyAddedBatch);
            }
            setAutoScraperInfo(prev => ({
              ...prev,
              scrapedThisSession,
              targetCount,
              statusMessage,
              currentCategory,
              totalComicsInDB: comics.length + scrapedThisSession
            }));
          }
        });

        addActivityLog('comic_create', `Admin menjalankan Mass Scraper: Berhasil menarik ${result.totalAdded} komik baru ke database`);
      } catch (err: any) {
        console.error('Client mass scraper error:', err);
      } finally {
        setAutoScraperInfo(prev => ({
          ...prev,
          isRunning: false,
          statusMessage: 'Selesai (Siap)'
        }));
      }
    }

    setIsTriggeringSync(false);
  };

  const handleStopAutoScraper = async () => {
    clientScraperStopRef.current = true;
    try {
      await fetch('/api/scraper/auto-stop', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    setAutoScraperInfo(prev => ({
      ...prev,
      isRunning: false,
      statusMessage: 'Dihentikan oleh Admin'
    }));
  };

  const handleResetScraperCursor = async () => {
    if (!window.confirm('Reset offset scraper ke awal (offset 0)? Penarikan selanjutnya akan mengambil kembali komik teratas.')) return;
    resetClientScraperOffsets();
    try {
      await fetch('/api/scraper/auto-reset-cursor', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    setAutoScraperInfo(prev => ({
      ...prev,
      statusMessage: 'Offset scraper telah direset ke 0',
      logs: [`[${new Date().toLocaleTimeString('id-ID')}] Offset scraper berhasil direset ke 0.`, ...prev.logs]
    }));
  };

  // Initial mount: load Komikcast popular
  React.useEffect(() => {
    if (searchResults.length === 0 && activeSource === 'komikcast') {
      handleSearchKomikcast(undefined, '', 'all', 'popular');
    }
  }, []);

  // 1. Live Komikcast Scraper Search
  const handleSearchKomikcast = async (
    e?: React.FormEvent, 
    customQ?: string, 
    catFilter?: 'all' | 'manga' | 'manhwa' | 'manhua' | 'doujin' | '18plus',
    orderFilter?: 'popular' | 'latest' | 'update'
  ) => {
    if (e) e.preventDefault();
    const q = customQ !== undefined ? customQ : searchQuery;
    const cat = catFilter !== undefined ? catFilter : komikcastCategoryFilter;
    const ord = orderFilter !== undefined ? orderFilter : komikcastOrder;

    setIsSearching(true);
    setErrorMsg('');
    try {
      const results = await searchKomikcast(q, cat, ord);
      setSearchResults(results);
      setHasSearched(true);
      if (results.length === 0) {
        setErrorMsg(`Tidak ditemukan komik di Komikcast untuk "${q || cat}".`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Gagal terhubung ke Komikcast Scraper.');
    } finally {
      setIsSearching(false);
    }
  };

  // 2. Live MangaDex Search
  const handleSearchMangaDex = async (e?: React.FormEvent, customQ?: string, overrideCategory?: 'all' | '18plus' | 'manhwa' | 'manga' | 'manhua') => {
    if (e) e.preventDefault();
    const queryToSearch = customQ !== undefined ? customQ : searchQuery;
    const catToUse = overrideCategory !== undefined ? overrideCategory : mangadexCategoryFilter;

    setIsSearching(true);
    setErrorMsg('');
    try {
      const results = await searchMangaDex(queryToSearch, 20, catToUse);
      setSearchResults(results);
      setHasSearched(true);
      if (results.length === 0) {
        setErrorMsg(`Tidak ditemukan hasil untuk "${queryToSearch || catToUse}".`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Gagal menarik data dari API MangaDex.');
    } finally {
      setIsSearching(false);
    }
  };

  // 3. Live Jikan MAL Search
  const handleSearchJikan = async (e?: React.FormEvent, customQ?: string) => {
    if (e) e.preventDefault();
    const queryToSearch = customQ !== undefined ? customQ : searchQuery;

    setIsSearching(true);
    setErrorMsg('');
    try {
      const results = await searchJikanManga(queryToSearch.trim(), 16);
      setSearchResults(results);
      setHasSearched(true);
      if (results.length === 0) {
        setErrorMsg(`Tidak ditemukan hasil di MyAnimeList untuk "${queryToSearch}".`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Gagal menarik data dari Jikan API.');
    } finally {
      setIsSearching(false);
    }
  };

  // 4. Import single scraped item (fetches full Komikcast details if from Komikcast)
  const handleImportSingle = async (item: ScrapedComicResult, overrideOptions?: { isVisibleOnHome?: boolean; contentType?: ComicContentType; comicType?: ComicCategoryType }) => {
    let itemToUse = item;

    // If Komikcast, fetch full chapter list from detail scraper
    if (item.sourceApi === 'Komikcast API' && item.slug) {
      try {
        const fullDetail = await getKomikcastDetail(item.slug);
        if (fullDetail) {
          itemToUse = fullDetail;
        }
      } catch (e) {
        console.warn('Failed to load full Komikcast details, using basic item:', e);
      }
    }

    const finalContentType = overrideOptions?.contentType ?? itemToUse.contentType ?? defaultContentType;
    const isNormal = finalContentType === 'normal';
    
    setBatchStatus(`⏳ Menarik data & chapter asli "${itemToUse.title}"...`);
    const { comic, chapters: comicChaps } = await buildComicFromScrapeAsync(itemToUse, {
      contentType: finalContentType,
      comicType: overrideOptions?.comicType ?? itemToUse.comicType,
      isFree: isNormal ? true : defaultIsFree,
      isVisibleOnHome: overrideOptions?.isVisibleOnHome ?? defaultIsVisibleOnHome,
      primaryDriveAccountId: defaultDriveAccountId
    });

    injectComicWithChapters(comic, comicChaps);

    setImportedSlugs(prev => ({ ...prev, [item.slug || item.title]: true }));
    addActivityLog('comic_create', `Admin mengimpor "${comic.title}" (${(comic.comicType || 'manga').toUpperCase()}) dari ${item.sourceApi} dengan ${comicChaps.length} chapter asli`);
    setBatchStatus(`✅ Berhasil mengimpor "${comic.title}" (${comicChaps.length} chapter asli) ke katalog web!`);
    setTimeout(() => setBatchStatus(null), 3500);
  };

  // 5. Tarik Komik Cepat (Batch Pull & Auto-Hide from Home)
  const handleBatchPullAndHideCategory = async (targetCategory: 'manga' | 'manhwa' | 'manhua' | '18plus' | 'all') => {
    let targets: ScrapedComicResult[] = [];
    if (targetCategory === 'all') {
      targets = PRESET_SCRAPE_FEEDS;
    } else if (targetCategory === '18plus') {
      targets = PRESET_SCRAPE_FEEDS.filter(p => p.contentType === '18plus');
    } else {
      targets = PRESET_SCRAPE_FEEDS.filter(p => p.comicType === targetCategory && p.contentType !== '18plus');
    }

    const filteredTargets = targets
      .filter(item => !comics.some(c => c.title.toLowerCase() === item.title.toLowerCase()) && !importedSlugs[item.slug || item.title]);

    if (filteredTargets.length === 0) {
      setBatchStatus(`Semua judul pada kategori ${targetCategory.toUpperCase()} sudah ada di katalog admin!`);
      setTimeout(() => setBatchStatus(null), 3000);
      return;
    }

    setBatchStatus(`⏳ Memproses penarikan ${filteredTargets.length} judul komik beserta chapter...`);

    const itemsToInject = await Promise.all(
      filteredTargets.map(item => {
        const finalContentType = item.contentType ?? (targetCategory === '18plus' ? '18plus' : 'normal');
        const isNormal = finalContentType === 'normal';
        return buildComicFromScrapeAsync(item, {
          contentType: finalContentType,
          comicType: item.comicType,
          isFree: isNormal ? true : defaultIsFree,
          isVisibleOnHome: false, // Tarik cepat: Otomatis disembunyikan dari beranda sampai admin mengaktifkan kembali
          primaryDriveAccountId: defaultDriveAccountId
        });
      })
    );

    batchInjectComicsWithChapters(itemsToInject);

    const newSlugs: Record<string, boolean> = {};
    itemsToInject.forEach(it => {
      newSlugs[it.comic.slug || it.comic.title] = true;
    });
    setImportedSlugs(prev => ({ ...prev, ...newSlugs }));

    setBatchStatus(`✅ Berhasil menarik ${itemsToInject.length} judul ${targetCategory.toUpperCase()} ke admin (Status: Disembunyikan dari Beranda).`);
    setTimeout(() => setBatchStatus(null), 4500);
  };

  // 6. Import all visible items
  const handleImportAllVisible = async () => {
    const currentList = activeSource === 'presets' 
      ? PRESET_SCRAPE_FEEDS.filter(p => {
          if (presetCategoryFilter === 'all') return true;
          if (presetCategoryFilter === '18plus') return p.contentType === '18plus';
          return p.comicType === presetCategoryFilter && p.contentType !== '18plus';
        })
      : searchResults;

    const filteredList = currentList
      .filter(item => !comics.some(c => c.title.toLowerCase() === item.title.toLowerCase()) && !importedSlugs[item.slug || item.title]);

    if (filteredList.length === 0) {
      setBatchStatus('Semua komik pada tampilan saat ini sudah ada di katalog website!');
      setTimeout(() => setBatchStatus(null), 3000);
      return;
    }

    setBatchStatus(`⏳ Memproses impor ${filteredList.length} judul komik...`);

    const itemsToInject = await Promise.all(
      filteredList.map(item => {
        const finalContentType = item.contentType ?? defaultContentType;
        const isNormal = finalContentType === 'normal';
        return buildComicFromScrapeAsync(item, {
          contentType: finalContentType,
          comicType: item.comicType,
          isFree: isNormal ? true : defaultIsFree,
          isVisibleOnHome: defaultIsVisibleOnHome,
          primaryDriveAccountId: defaultDriveAccountId
        });
      })
    );

    batchInjectComicsWithChapters(itemsToInject);

    const newSlugs: Record<string, boolean> = {};
    itemsToInject.forEach(it => {
      newSlugs[it.comic.slug || it.comic.title] = true;
    });
    setImportedSlugs(prev => ({ ...prev, ...newSlugs }));

    setBatchStatus(`✅ Berhasil menyuntikkan ${itemsToInject.length} judul komik beserta chapter asli ke katalog!`);
    setTimeout(() => setBatchStatus(null), 4500);
  };

  // 7. Custom JSON Importer
  const handleImportCustomJson = async () => {
    try {
      const parsed = JSON.parse(customJson);
      const items: ScrapedComicResult[] = Array.isArray(parsed) ? parsed : [parsed];
      setBatchStatus(`⏳ Memproses impor ${items.length} komik dari custom JSON...`);
      const itemsToInject = await Promise.all(
        items.map(item => {
          const finalContentType = item.contentType ?? defaultContentType;
          const isNormal = finalContentType === 'normal';
          return buildComicFromScrapeAsync(item, {
            contentType: finalContentType,
            comicType: item.comicType || 'manga',
            isFree: isNormal ? true : defaultIsFree,
            isVisibleOnHome: defaultIsVisibleOnHome,
            primaryDriveAccountId: defaultDriveAccountId
          });
        })
      );

      batchInjectComicsWithChapters(itemsToInject);
      setBatchStatus(`✅ Berhasil mengimpor ${itemsToInject.length} komik dari data JSON custom ke web!`);
      setCustomJson('');
      setTimeout(() => setBatchStatus(null), 4000);
    } catch (err) {
      alert('Format JSON tidak valid! Pastikan format JSON sesuai struktur komik.');
    }
  };

  // 8. Admin Download Google Drive PDF Tool
  const handleDownloadDrivePdfTool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drivePdfUrl.trim()) return;

    setIsDownloadingDrivePdf(true);
    setDrivePdfStatusMsg('Menghubungkan ke Google Drive...');
    try {
      const title = drivePdfTitle.trim() || 'drive-document';
      const success = await downloadDrivePdf(drivePdfUrl.trim(), title, (msg) => setDrivePdfStatusMsg(msg));
      if (!success) {
        throw new Error('Gagal mengunduh berkas dari link Google Drive.');
      }
    } catch (err: any) {
      setDrivePdfStatusMsg(`Gagal: ${err.message || 'Terjadi kesalahan'}`);
    } finally {
      setIsDownloadingDrivePdf(false);
    }
  };

  // 9. Admin Convert Existing Chapter to PDF Tool
  const handleConvertChapterToPdf = async () => {
    const selectedComic = comics.find(c => c.id === selectedComicIdForPdf);
    if (!selectedComic) return;

    const comicChaps = chapters[selectedComic.id] || [];
    const targetChap = comicChaps.find(ch => ch.id === selectedChapterIdForPdf) || comicChaps[0];
    if (!targetChap) {
      alert('Pilih chapter yang akan dikonversi!');
      return;
    }

    setIsConvertingChapterPdf(true);
    setChapterPdfProgress('Menyiapkan gambar chapter...');

    try {
      const filename = `${selectedComic.title} - Ch ${targetChap.chapterNumber}`;
      if (targetChap.sourceType === 'drive' && (targetChap.driveEmbedUrl || targetChap.driveFileId)) {
        await downloadDrivePdf(targetChap.driveEmbedUrl || targetChap.driveFileId || '', filename, (msg) => setChapterPdfProgress(msg));
      } else {
        const pagesToConvert = (targetChap.pages || [])
          .map(p => typeof p === 'string' ? p : p?.imageUrl || '')
          .filter(Boolean);
        if (pagesToConvert.length === 0) {
          throw new Error('Chapter ini tidak memiliki gambar untuk dikonversi.');
        }
        await convertImagesToPdf(pagesToConvert, filename, (curr, tot, msg) => {
          setChapterPdfProgress(`Mengonversi (${curr}/${tot}): ${msg}`);
        });
      }
    } catch (err: any) {
      alert('Gagal mengonversi ke PDF: ' + err.message);
    } finally {
      setIsConvertingChapterPdf(false);
      setTimeout(() => setChapterPdfProgress(null), 3000);
    }
  };

  const [showConfigSettings, setShowConfigSettings] = useState(false);

  const filteredPresets = PRESET_SCRAPE_FEEDS.filter(p => {
    if (presetCategoryFilter === 'all') return true;
    if (presetCategoryFilter === '18plus') return p.contentType === '18plus';
    return p.comicType === presetCategoryFilter && p.contentType !== '18plus';
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pb-4 border-b border-[#1c1c2a]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#ff5b14]/10 border border-[#ff5b14]/30 flex items-center justify-center text-[#ff5b14]">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Tarik Data Komik &amp; Scraper Otomatis
              </h2>
              <p className="text-xs text-slate-400">
                Impor komik Manga, Manhwa, Manhua &amp; 18+ VIP lengkap dengan chapter, cover, dan metadata siap baca
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowConfigSettings(prev => !prev)}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
              showConfigSettings
                ? 'bg-[#ff5b14]/15 border-[#ff5b14]/40 text-[#ff5b14]'
                : 'bg-[#141420] border-[#252536] text-slate-300 hover:text-white hover:border-[#38384f]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pengaturan Impor</span>
          </button>

          {activeSource !== 'pdf_converter' && activeSource !== 'custom' && (
            <button
              onClick={handleImportAllVisible}
              className="px-4 py-2 bg-gradient-to-r from-[#ff5b14] to-[#e04e0e] hover:opacity-95 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-[#ff5b14]/20 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Suntikkan Semua ({activeSource === 'presets' ? filteredPresets.length : searchResults.length} Judul)</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Alert Banner */}
      {batchStatus && (
        <div className="p-3.5 bg-emerald-950/50 border border-emerald-500/40 rounded-2xl text-emerald-200 text-xs font-semibold flex items-center gap-2.5 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{batchStatus}</span>
        </div>
      )}

      {/* Auto-Scraping All Catalog Engine (MangaDex & MyAnimeList Background Ingest) */}
      <div className="p-4 sm:p-5 bg-gradient-to-br from-[#131224] via-[#10101b] to-[#1c1428] rounded-2xl border border-indigo-500/30 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${autoScraperInfo.isRunning ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                {autoScraperInfo.isRunning ? 'Auto-Scraper Berjalan (Continuous Multi-Stream)' : 'Auto-Scraper Standby & Siap Sedot'}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Penyedot Ribuan Komik (MangaDex Multi-Offset + MAL Jikan API)
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#ff5b14]" />
              Mass Auto-Scraper Catalog Engine (Multi-Stream Pagination)
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl">
              Sistem scraper kini menggunakan <strong>Persistent Offset Cursor</strong> yang melompati batasan 20-30 komik. Scraper akan terus menarik komik dari halaman ke-1, 2, 3 hingga puluhan halaman berikutnya tanpa henti sampai target ribuan judul tercapai.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
            {autoScraperInfo.isRunning ? (
              <button
                onClick={handleStopAutoScraper}
                className="px-4 py-2.5 rounded-xl bg-red-600/90 hover:bg-red-600 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-red-600/20 active:scale-95"
              >
                <AlertCircle className="w-4 h-4" />
                <span>Hentikan Scraper</span>
              </button>
            ) : (
              <button
                onClick={handleTriggerAutoSync}
                disabled={isTriggeringSync}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#ff5b14] to-indigo-600 hover:opacity-95 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/20 active:scale-95"
              >
                {isTriggeringSync ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                    <span>Menghubungkan...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Jalankan Mass Scraper ({selectedBatchSize} Komik)</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleResetScraperCursor}
              title="Reset offset ke 0 jika ingin memulai penarikan dari halaman pertama lagi"
              className="px-3 py-2.5 rounded-xl bg-[#1a1a2e] border border-slate-700 hover:border-amber-500 text-slate-300 hover:text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Cursor (0)</span>
            </button>

            <button
              onClick={() => setShowScraperLogs(prev => !prev)}
              className="px-3 py-2.5 rounded-xl bg-[#1a1a2e] border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{showScraperLogs ? 'Tutup Log' : 'Lihat Log Ingest'}</span>
            </button>
          </div>
        </div>

        {/* Target Batch Size & Stream Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-black/40 rounded-xl border border-white/5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <span>Target Jumlah Komik yang Ditarik:</span>
              <span className="text-[#ff5b14] font-black">{selectedBatchSize} Komik</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[100, 300, 500, 1000, 2500, 5000, 10000].map(sz => (
                <button
                  key={sz}
                  onClick={() => setSelectedBatchSize(sz)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedBatchSize === sz
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-[#1b1b2a] text-slate-400 hover:text-white hover:bg-[#25253a]'
                  }`}
                >
                  {sz >= 1000 ? `${sz / 1000}k` : sz} Komik
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <span>Filter Aliran Sumber (Stream Filter):</span>
              <span className="text-cyan-400 font-black uppercase">{selectedAutoCategory}</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: 'Semua Kategori (MangaDex + MAL)' },
                { id: 'manhwa', label: 'Manhwa Korea' },
                { id: 'manhua', label: 'Manhua China' },
                { id: 'manga', label: 'Manga Jepang' },
                { id: '18plus', label: '18+ VIP Dewasa' },
                { id: 'isekai', label: 'Isekai Fantasy' },
                { id: 'action', label: 'Action & Murim' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedAutoCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedAutoCategory === cat.id
                      ? 'bg-[#ff5b14] text-white shadow-md shadow-[#ff5b14]/30'
                      : 'bg-[#1b1b2a] text-slate-400 hover:text-white hover:bg-[#25253a]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Realtime Stats & Progress Bar */}
        <div className="space-y-2">
          {autoScraperInfo.isRunning && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-semibold text-slate-300">
                <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Progress Tarik Sesi Ini: {autoScraperInfo.scrapedThisSession || 0} / {autoScraperInfo.targetCount || selectedBatchSize} komik
                </span>
                <span className="text-indigo-300 font-bold">
                  {Math.min(100, Math.round(((autoScraperInfo.scrapedThisSession || 0) / (autoScraperInfo.targetCount || selectedBatchSize || 1)) * 100))}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#ff5b14] via-indigo-500 to-cyan-400 transition-all duration-500 rounded-full"
                  style={{ 
                    width: `${Math.min(100, Math.round(((autoScraperInfo.scrapedThisSession || 0) / (autoScraperInfo.targetCount || selectedBatchSize || 1)) * 100))}%` 
                  }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5 text-xs">
            <div className="p-2.5 bg-black/30 rounded-xl border border-white/5 flex flex-col">
              <span className="text-[10px] text-slate-400">Total Komik di Database:</span>
              <span className="font-black text-white text-sm text-indigo-300">{autoScraperInfo.totalComicsInDB || comics.length} Judul</span>
            </div>
            <div className="p-2.5 bg-black/30 rounded-xl border border-white/5 flex flex-col">
              <span className="text-[10px] text-slate-400">Status Mesin:</span>
              <span className="font-bold text-emerald-400 truncate">{autoScraperInfo.statusMessage}</span>
            </div>
            <div className="p-2.5 bg-black/30 rounded-xl border border-white/5 flex flex-col">
              <span className="text-[10px] text-slate-400">Tersedot Sesi Ini:</span>
              <span className="font-bold text-amber-300">+{autoScraperInfo.scrapedThisSession || 0} Komik Baru</span>
            </div>
            <div className="p-2.5 bg-black/30 rounded-xl border border-white/5 flex flex-col">
              <span className="text-[10px] text-slate-400">Metode Ingest:</span>
              <span className="font-bold text-cyan-300">Cursor Multi-Stream Loop</span>
            </div>
          </div>
        </div>

        {/* Collapsible Live Log Drawer */}
        {showScraperLogs && (
          <div className="p-3 bg-[#0a0a10] rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 max-h-52 overflow-y-auto space-y-1 scrollbar-thin">
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold border-b border-slate-800 pb-1 mb-1">
              <span>CONSOLE LOG AUTO-SCRAPER BACKGROUND:</span>
              <button onClick={fetchAutoScraperStatus} className="text-[#ff5b14] hover:underline cursor-pointer">Refresh Status</button>
            </div>
            {autoScraperInfo.logs && autoScraperInfo.logs.length > 0 ? (
              autoScraperInfo.logs.map((log, idx) => (
                <div key={idx} className="leading-tight text-slate-400">
                  {log}
                </div>
              ))
            ) : (
              <div className="text-slate-500 italic py-2">Belum ada log aktivitas. Klik "Jalankan Mass Scraper" untuk memulai proses ingest.</div>
            )}
          </div>
        )}
      </div>

      {/* Expandable Import Configuration Settings */}
      {showConfigSettings && (
        <div className="p-4 bg-[#11111a] rounded-2xl border border-[#242436] space-y-3.5 shadow-xl animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-[#1c1c2a] pb-2.5">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#ff5b14]" />
              Pengaturan Default untuk Komik Baru yang Diimpor
            </span>
            <span className="text-[11px] text-slate-400">Otomatis diterapkan saat klik Tarik Data</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Content Type Selector */}
            <div className="p-3 bg-[#171724] rounded-xl border border-[#242438] space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 block">Kategori Akses Konten</label>
              <select
                value={defaultContentType}
                onChange={(e) => {
                  const val = e.target.value as ComicContentType;
                  setDefaultContentType(val);
                  if (val === 'normal') setDefaultIsFree(true);
                }}
                className="w-full p-2 bg-[#0d0d14] border border-[#2e2e42] rounded-lg text-white font-medium text-xs focus:border-[#ff5b14] outline-none"
              >
                <option value="18plus">🔞 Komik Dewasa 18+ (VIP / Koin)</option>
                <option value="normal">🟢 Komik Normal (Bebas Baca / Gratis)</option>
              </select>
            </div>

            {/* Visibility on Home */}
            <div className="p-3 bg-[#171724] rounded-xl border border-[#242438] flex flex-col justify-center gap-1.5">
              <label className="text-[11px] font-bold text-slate-300 block">Visibilitas Katalog</label>
              <label className="flex items-center gap-2.5 text-slate-300 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={defaultIsVisibleOnHome}
                  onChange={(e) => setDefaultIsVisibleOnHome(e.target.checked)}
                  className="rounded border-[#3a3a4e] text-[#ff5b14] focus:ring-[#ff5b14] w-4 h-4 cursor-pointer accent-[#ff5b14]"
                />
                <span>Tampilkan di Halaman Beranda Web</span>
              </label>
            </div>

            {/* Drive Storage */}
            <div className="p-3 bg-[#171724] rounded-xl border border-[#242438] space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 block">Server Penyimpanan</label>
              <select
                value={defaultDriveAccountId}
                onChange={(e) => setDefaultDriveAccountId(e.target.value)}
                className="w-full p-2 bg-[#0d0d14] border border-[#2e2e42] rounded-lg text-white font-medium text-xs focus:border-[#ff5b14] outline-none"
              >
                {driveAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 1-Click Quick Batch Pull (Tarik Komik Cepat & Sembunyikan dari Beranda) */}
      <div className="p-4 bg-[#11111a] rounded-2xl border border-[#202030] shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-black text-white flex items-center gap-2 uppercase tracking-wider">
            <Download className="w-4 h-4 text-[#ff5b14]" />
            Tarik Komik Cepat (Tarik ke Admin &amp; Sembunyikan dari Beranda)
          </span>
          <span className="text-[10px] text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 font-medium">
            🔒 Komik yang ditarik otomatis disembunyikan dari beranda hingga diaktifkan admin
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <button
            onClick={() => handleBatchPullAndHideCategory('manga')}
            className="p-3 bg-[#141624] hover:bg-[#1b1e32] border border-indigo-500/30 hover:border-indigo-400/60 rounded-xl text-left transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-300">🇯🇵 Manga Jepang</span>
                <Download className="w-3.5 h-3.5 text-indigo-400 group-hover:translate-y-0.5 transition-transform" />
              </div>
              <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">One Piece, Jujutsu Kaisen, Spy x Family</p>
            </div>
            <span className="inline-block mt-2 text-[9px] font-bold text-indigo-200 bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 rounded text-center">
              Tarik Manga (Sembunyi)
            </span>
          </button>

          <button
            onClick={() => handleBatchPullAndHideCategory('manhwa')}
            className="p-3 bg-[#131b17] hover:bg-[#1a2620] border border-emerald-500/30 hover:border-emerald-400/60 rounded-xl text-left transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-300">🇰🇷 Manhwa Populer</span>
                <Download className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
              </div>
              <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">Solo Leveling, Eleceed, ORV</p>
            </div>
            <span className="inline-block mt-2 text-[9px] font-bold text-emerald-200 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded text-center">
              Tarik Manhwa (Sembunyi)
            </span>
          </button>

          <button
            onClick={() => handleBatchPullAndHideCategory('manhua')}
            className="p-3 bg-[#1d1712] hover:bg-[#281f18] border border-amber-500/30 hover:border-amber-400/60 rounded-xl text-left transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-300">🇨🇳 Manhua China</span>
                <Download className="w-3.5 h-3.5 text-amber-400 group-hover:translate-y-0.5 transition-transform" />
              </div>
              <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">Tales of Demons, Martial Peak</p>
            </div>
            <span className="inline-block mt-2 text-[9px] font-bold text-amber-200 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded text-center">
              Tarik Manhua (Sembunyi)
            </span>
          </button>

          <button
            onClick={() => handleBatchPullAndHideCategory('18plus')}
            className="p-3 bg-[#17141e] hover:bg-[#201a2c] border border-rose-500/30 hover:border-rose-400/60 rounded-xl text-left transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-rose-300">🔞 Manhwa 18+ VIP</span>
                <Download className="w-3.5 h-3.5 text-rose-400 group-hover:translate-y-0.5 transition-transform" />
              </div>
              <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">Secret Class, Boarding Diary, Circles</p>
            </div>
            <span className="inline-block mt-2 text-[9px] font-bold text-rose-200 bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 rounded text-center">
              Tarik 18+ (Sembunyi)
            </span>
          </button>

          <button
            onClick={() => handleBatchPullAndHideCategory('all')}
            className="p-3 bg-[#201511] hover:bg-[#2c1d17] border border-[#ff5b14]/40 hover:border-[#ff5b14]/70 rounded-xl text-left transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#ff7a3d]">⚡ TARIK SEMUA</span>
                <Download className="w-3.5 h-3.5 text-[#ff5b14] group-hover:translate-y-0.5 transition-transform" />
              </div>
              <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">Seluruh Katalog Feed</p>
            </div>
            <span className="inline-block mt-2 text-[9px] font-bold text-white bg-[#ff5b14] px-2 py-0.5 rounded text-center shadow">
              Tarik Semua ({PRESET_SCRAPE_FEEDS.length})
            </span>
          </button>
        </div>
      </div>

      {/* Source Selector Tabs */}
      <div className="flex border-b border-[#202030] gap-2 text-xs overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => {
            setActiveSource('komikcast');
            if (searchResults.length === 0) handleSearchKomikcast(undefined, '', 'all', 'popular');
          }}
          className={`pb-2.5 px-3.5 font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeSource === 'komikcast'
              ? 'border-[#ff5b14] text-white bg-white/5 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-[#ff5b14]" />
          <span>Komikcast Indo</span>
        </button>

        <button
          onClick={() => {
            setActiveSource('mangadex');
            if (searchResults.length === 0) handleSearchMangaDex(undefined, '', '18plus');
          }}
          className={`pb-2.5 px-3.5 font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeSource === 'mangadex'
              ? 'border-[#ff5b14] text-white bg-white/5 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-blue-400" />
          <span>MangaDex API</span>
        </button>

        <button
          onClick={() => {
            setActiveSource('presets');
            if (searchResults.length === 0) {
              setSearchResults(DOUJINDESU_SCRAPE_FEEDS);
            }
          }}
          className={`pb-2.5 px-3.5 font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeSource === 'presets'
              ? 'border-[#ff5b14] text-white bg-white/5 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-rose-400" />
          <span>API Doujindesu (18+ &amp; Doujin)</span>
        </button>

        <button
          onClick={() => {
            setActiveSource('jikan');
            if (searchResults.length === 0) handleSearchJikan(undefined, 'One Piece');
          }}
          className={`pb-2.5 px-3.5 font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeSource === 'jikan'
              ? 'border-[#ff5b14] text-white bg-white/5 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Search className="w-3.5 h-3.5 text-emerald-400" />
          <span>MyAnimeList (Jikan)</span>
        </button>

        <button
          onClick={() => setActiveSource('pdf_converter')}
          className={`pb-2.5 px-3.5 font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeSource === 'pdf_converter'
              ? 'border-[#ff5b14] text-white bg-white/5 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowDownToLine className="w-3.5 h-3.5 text-rose-400" />
          <span>Alat PDF &amp; Drive</span>
        </button>

        <button
          onClick={() => setActiveSource('custom')}
          className={`pb-2.5 px-3.5 font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeSource === 'custom'
              ? 'border-[#ff5b14] text-white bg-white/5 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileJson className="w-3.5 h-3.5 text-purple-400" />
          <span>Custom JSON</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: KOMIKCAST LIVE API (INDONESIA)                         */}
      {/* ============================================================ */}
      {activeSource === 'komikcast' && (
        <div className="space-y-4">
          {/* Category & Order Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#11111a] p-3 rounded-2xl border border-[#202030]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-400 text-xs font-bold flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5 text-[#ff5b14]" />
                Kategori:
              </span>

              {(['all', 'manga', 'manhwa', 'manhua', 'doujin', '18plus'] as const).map((cat) => {
                const label = 
                  cat === 'all' ? '⚡ Semua' :
                  cat === 'manga' ? '🇯🇵 Manga' :
                  cat === 'manhwa' ? '🇰🇷 Manhwa' :
                  cat === 'manhua' ? '🇨🇳 Manhua' :
                  cat === 'doujin' ? '🌸 Doujin' : '🔞 18+ Dewasa';

                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setKomikcastCategoryFilter(cat);
                      handleSearchKomikcast(undefined, searchQuery, cat, komikcastOrder);
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1 ${
                      komikcastCategoryFilter === cat
                        ? cat === '18plus' 
                          ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                          : 'bg-[#ff5b14] text-white shadow-md shadow-[#ff5b14]/30'
                        : 'bg-[#181824] text-slate-300 hover:text-white border border-[#262638]'
                    }`}
                  >
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-400 text-[11px] mr-1">Urutan:</span>
              {(['popular', 'latest', 'update'] as const).map((ord) => (
                <button
                  key={ord}
                  onClick={() => {
                    setKomikcastOrder(ord);
                    handleSearchKomikcast(undefined, searchQuery, komikcastCategoryFilter, ord);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                    komikcastOrder === ord
                      ? 'bg-white/15 text-white border border-white/25'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {ord === 'popular' ? '🔥 Populer' : ord === 'latest' ? '✨ Terbaru' : '🔄 Update'}
                </button>
              ))}
            </div>
          </div>

          {/* Search Input */}
          <form onSubmit={(e) => handleSearchKomikcast(e)} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari komik di Komikcast (contoh: Solo Leveling, Eleceed, Secret Class, Magic Emperor)..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#11111a] border border-[#222234] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14]"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-4 py-2.5 bg-[#ff5b14] hover:bg-[#e04e0e] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 cursor-pointer transition-all"
            >
              {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Cari Komikcast</span>
            </button>
          </form>

          {/* Recommendation Tags */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-[11px] text-slate-500 font-semibold">Rekomendasi:</span>
            {['Solo Leveling', 'Secret Class', 'Boarding Diary', 'Magic Emperor', 'Wind Breaker', 'Martial Peak', 'Return of Mount Hua'].map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setSearchQuery(tag);
                  handleSearchKomikcast(undefined, tag);
                }}
                className="px-2.5 py-0.5 bg-[#161622] hover:bg-[#202032] border border-[#262638] rounded-full text-[10px] text-slate-300 cursor-pointer transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Results Grid - Enhanced Card Layout */}
          {searchResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((item, idx) => {
                const isImported = importedSlugs[item.slug || item.title] || comics.some(c => c.title.toLowerCase() === item.title.toLowerCase());

                return (
                  <div key={idx} className="p-3.5 bg-[#12121c] border border-[#202030] rounded-2xl flex flex-col justify-between transition-all hover:border-[#383850] shadow-md group">
                    <div className="flex gap-3.5 items-start">
                      <div className="relative w-20 h-28 rounded-xl overflow-hidden shrink-0 shadow ring-1 ring-white/10">
                        <img 
                          src={item.coverImage} 
                          alt={item.title} 
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = getProfessionalComicSkeletonUrl(item.title, item.comicType);
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold border ${
                            item.contentType === '18plus'
                              ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          }`}>
                            {item.contentType === '18plus' ? '🔞 18+ VIP' : (item.comicType || 'manga').toUpperCase()}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate">{item.storyWriter}</span>
                        </div>
                        <h4 className="font-bold text-sm text-white line-clamp-1 leading-snug">{item.title}</h4>
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">{item.synopsis}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {item.genres.slice(0, 2).map(g => (
                            <span key={g} className="px-1.5 py-0.2 rounded bg-[#1c1c2a] text-[9px] text-slate-300">{g}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#1b1b2a] text-xs">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {item.sourceApi}
                      </span>

                      {isImported ? (
                        <span className="px-3 py-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Sudah Ada
                        </span>
                      ) : (
                        <button
                          onClick={() => handleImportSingle(item)}
                          className="px-3 py-1.5 bg-[#ff5b14] hover:bg-[#e04e0e] text-white rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer shadow-sm active:scale-95 transition-all"
                        >
                          <Download className="w-3.5 h-3.5" /> Tarik ke Web
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: MANGADEX LIVE SEARCH                                  */}
      {/* ============================================================ */}
      {activeSource === 'mangadex' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 bg-[#11111a] p-3 rounded-2xl border border-[#202030]">
            <span className="text-slate-400 text-xs font-bold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-[#ff5b14]" />
              Kategori:
            </span>

            <button
              onClick={() => {
                setMangadexCategoryFilter('18plus');
                handleSearchMangaDex(undefined, '', '18plus');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1 ${
                mangadexCategoryFilter === '18plus'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'bg-[#181824] text-slate-300 hover:text-white border border-[#262638]'
              }`}
            >
              <span>🔞 Manhwa 18+ Dewasa</span>
            </button>

            <button
              onClick={() => {
                setMangadexCategoryFilter('manhwa');
                handleSearchMangaDex(undefined, '', 'manhwa');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1 ${
                mangadexCategoryFilter === 'manhwa'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-[#181824] text-slate-300 hover:text-white border border-[#262638]'
              }`}
            >
              <span>🇰🇷 Manhwa Populer</span>
            </button>

            <button
              onClick={() => {
                setMangadexCategoryFilter('manga');
                handleSearchMangaDex(undefined, '', 'manga');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1 ${
                mangadexCategoryFilter === 'manga'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-[#181824] text-slate-300 hover:text-white border border-[#262638]'
              }`}
            >
              <span>🇯🇵 Manga Jepang</span>
            </button>

            <button
              onClick={() => {
                setMangadexCategoryFilter('manhua');
                handleSearchMangaDex(undefined, '', 'manhua');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1 ${
                mangadexCategoryFilter === 'manhua'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'bg-[#181824] text-slate-300 hover:text-white border border-[#262638]'
              }`}
            >
              <span>🇨🇳 Manhua China</span>
            </button>

            <button
              onClick={() => {
                setMangadexCategoryFilter('all');
                handleSearchMangaDex(undefined, '', 'all');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1 ${
                mangadexCategoryFilter === 'all'
                  ? 'bg-[#ff5b14] text-white shadow-md shadow-[#ff5b14]/30'
                  : 'bg-[#181824] text-slate-300 hover:text-white border border-[#262638]'
              }`}
            >
              <span>⚡ Semua Populer</span>
            </button>
          </div>

          <form onSubmit={(e) => handleSearchMangaDex(e)} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari judul spesifik di MangaDex (contoh: Secret Class, Solo Leveling, Circles)..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#11111a] border border-[#222234] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14]"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-4 py-2.5 bg-[#ff5b14] hover:bg-[#e04e0e] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 cursor-pointer"
            >
              {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Cari MangaDex</span>
            </button>
          </form>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((item, idx) => {
                const isImported = importedSlugs[item.slug || item.title] || comics.some(c => c.title.toLowerCase() === item.title.toLowerCase());

                return (
                  <div key={idx} className="p-3.5 bg-[#12121c] border border-[#202030] rounded-2xl flex flex-col justify-between transition-all hover:border-[#383850] shadow-md group">
                    <div className="flex gap-3.5 items-start">
                      <div className="relative w-20 h-28 rounded-xl overflow-hidden shrink-0 shadow ring-1 ring-white/10">
                        <img 
                          src={item.coverImage} 
                          alt={item.title} 
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = getProfessionalComicSkeletonUrl(item.title, item.comicType);
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold border ${
                            item.contentType === '18plus'
                              ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          }`}>
                            {item.contentType === '18plus' ? '🔞 18+ VIP' : (item.comicType || 'manga').toUpperCase()}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate">{item.storyWriter}</span>
                        </div>
                        <h4 className="font-bold text-sm text-white line-clamp-1 leading-snug">{item.title}</h4>
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">{item.synopsis}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#1b1b2a] text-xs">
                      <span className="text-[10px] text-slate-500 font-mono">{item.sourceApi}</span>
                      {isImported ? (
                        <span className="px-3 py-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Sudah Ada
                        </span>
                      ) : (
                        <button
                          onClick={() => handleImportSingle(item)}
                          className="px-3 py-1.5 bg-[#ff5b14] hover:bg-[#e04e0e] text-white rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" /> Tarik ke Web
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: API DOUJINDESU & 18+ VIP SCRAPER                      */}
      {/* ============================================================ */}
      {activeSource === 'presets' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#11111a] p-3 rounded-2xl border border-[#202030]">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-bold mr-1 text-xs">Filter Doujindesu:</span>
              <button
                onClick={() => setPresetCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  presetCategoryFilter === 'all'
                    ? 'bg-[#ff5b14] text-white shadow-sm'
                    : 'bg-[#181824] text-slate-400 hover:text-slate-200 border border-[#262638]'
                }`}
              >
                🔞 Semua 18+ ({DOUJINDESU_SCRAPE_FEEDS.length})
              </button>

              <button
                onClick={() => setPresetCategoryFilter('18plus')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  presetCategoryFilter === '18plus'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-[#181824] text-slate-400 hover:text-slate-200 border border-[#262638]'
                }`}
              >
                🔥 Netorare / NTR &amp; VIP
              </button>

              <button
                onClick={() => setPresetCategoryFilter('manhwa')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  presetCategoryFilter === 'manhwa'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-[#181824] text-slate-400 hover:text-slate-200 border border-[#262638]'
                }`}
              >
                👠 MILF / Noona
              </button>

              <button
                onClick={() => setPresetCategoryFilter('manga')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  presetCategoryFilter === 'manga'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-[#181824] text-slate-400 hover:text-slate-200 border border-[#262638]'
                }`}
              >
                👑 Harem 18+
              </button>

              <button
                onClick={() => setPresetCategoryFilter('manhua')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  presetCategoryFilter === 'manhua'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-[#181824] text-slate-400 hover:text-slate-200 border border-[#262638]'
                }`}
              >
                🌸 Doujinshi Lengkap
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DOUJINDESU_SCRAPE_FEEDS.map((item, idx) => {
              const isImported = importedSlugs[item.slug || item.title] || comics.some(c => c.title.toLowerCase() === item.title.toLowerCase());

              return (
                <div key={idx} className="p-3.5 bg-[#12121c] border border-[#202030] rounded-2xl flex flex-col justify-between transition-all hover:border-[#383850] shadow-md group">
                  <div className="flex gap-3.5 items-start">
                    <div className="relative w-20 h-28 rounded-xl overflow-hidden shrink-0 shadow ring-1 ring-white/10">
                      <img 
                        src={item.coverImage} 
                        alt={item.title} 
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getProfessionalComicSkeletonUrl(item.title, item.comicType);
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold border ${
                          item.contentType === '18plus'
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        }`}>
                          {item.contentType === '18plus' ? '🔞 18+ VIP' : (item.comicType || 'manga').toUpperCase()}
                        </span>
                        <span className="text-[10px] text-slate-400">{(item.status || 'ongoing').toUpperCase()}</span>
                      </div>
                      <h4 className="font-bold text-sm text-white line-clamp-1 leading-snug">{item.title}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">{item.synopsis}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#1b1b2a] text-xs">
                    <span className="text-[10px] text-slate-500 font-mono">{item.sourceApi}</span>
                    {isImported ? (
                      <span className="px-3 py-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Sudah Ada
                      </span>
                    ) : (
                      <button
                        onClick={() => handleImportSingle(item)}
                        className="px-3 py-1.5 bg-[#ff5b14] hover:bg-[#e04e0e] text-white rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> Tarik ke Web
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: MYANIMELIST (JIKAN)                                   */}
      {/* ============================================================ */}
      {activeSource === 'jikan' && (
        <div className="space-y-4">
          <form onSubmit={handleSearchJikan} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari di database MyAnimeList (contoh: Berserk, Vagabond, Tower of God, Demon Slayer)..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#11111a] border border-[#222234] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14]"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 cursor-pointer transition-all"
            >
              {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Cari Jikan MAL</span>
            </button>
          </form>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((item, idx) => {
                const isImported = importedSlugs[item.slug || item.title] || comics.some(c => c.title.toLowerCase() === item.title.toLowerCase());

                return (
                  <div key={idx} className="p-3.5 bg-[#12121c] border border-[#202030] rounded-2xl flex flex-col justify-between transition-all hover:border-[#383850] shadow-md group">
                    <div className="flex gap-3.5 items-start">
                      <div className="relative w-20 h-28 rounded-xl overflow-hidden shrink-0 shadow ring-1 ring-white/10">
                        <img 
                          src={item.coverImage} 
                          alt={item.title} 
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = getProfessionalComicSkeletonUrl(item.title, item.comicType);
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-white line-clamp-1 leading-snug">{item.title}</h4>
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">{item.synopsis}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#1b1b2a] text-xs">
                      <span className="text-[10px] text-slate-500 font-mono">Jikan MAL</span>
                      {isImported ? (
                        <span className="px-3 py-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Sudah Ada
                        </span>
                      ) : (
                        <button
                          onClick={() => handleImportSingle(item)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" /> Tarik Data
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 5: DEDICATED ADMIN PDF & GOOGLE DRIVE CONVERTER TOOL     */}
      {/* ============================================================ */}
      {activeSource === 'pdf_converter' && (
        <div className="space-y-6">
          {/* Tool 1: Google Drive Bypass Downloader */}
          <div className="p-5 bg-[#11111a] rounded-2xl border border-[#222234] space-y-4 shadow-xl">
            <div className="flex items-center gap-3 border-b border-[#1c1c2a] pb-3.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Google Drive PDF Stream Downloader</h3>
                <p className="text-[11px] text-slate-400">
                  Unduh langsung file PDF dari link Google Drive publik maupun view-only/restricted tanpa batasan tombol download Google.
                </p>
              </div>
            </div>

            <form onSubmit={handleDownloadDrivePdfTool} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Link Google Drive (Preview / View / File URL atau File ID)
                </label>
                <input
                  type="text"
                  value={drivePdfUrl}
                  onChange={(e) => setDrivePdfUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/1A2B3C4D5E6F.../view?usp=sharing"
                  className="w-full px-3.5 py-2.5 bg-[#171724] border border-[#2b2b3e] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14] font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Nama File PDF Tujuan (Opsional)
                </label>
                <input
                  type="text"
                  value={drivePdfTitle}
                  onChange={(e) => setDrivePdfTitle(e.target.value)}
                  placeholder="Judul-Komik-Chapter-1"
                  className="w-full px-3.5 py-2.5 bg-[#171724] border border-[#2b2b3e] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14]"
                />
              </div>

              {drivePdfStatusMsg && (
                <div className="p-3 bg-[#171726] border border-[#2b2b3e] rounded-xl text-xs text-amber-300 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ff5b14] shrink-0" />
                  <span>{drivePdfStatusMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isDownloadingDrivePdf || !drivePdfUrl.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                {isDownloadingDrivePdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sedang Mengunduh Stream...</span>
                  </>
                ) : (
                  <>
                    <ArrowDownToLine className="w-4 h-4" />
                    <span>Unduh &amp; Simpan Berkas PDF</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Tool 2: Chapter-to-PDF Stitcher / Converter */}
          <div className="p-5 bg-[#11111a] rounded-2xl border border-[#222234] space-y-4 shadow-xl">
            <div className="flex items-center gap-3 border-b border-[#1c1c2a] pb-3.5">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Konversi Chapter Komik ke Dokumen PDF</h3>
                <p className="text-[11px] text-slate-400">
                  Satukan seluruh halaman gambar dari chapter komik pilihan menjadi satu berkas PDF berkualitas tinggi siap unduh.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Pilih Komik</label>
                <select
                  value={selectedComicIdForPdf}
                  onChange={(e) => {
                    setSelectedComicIdForPdf(e.target.value);
                    const list = chapters[e.target.value] || [];
                    if (list.length > 0) setSelectedChapterIdForPdf(list[0].id);
                  }}
                  className="w-full p-2.5 bg-[#171724] border border-[#2b2b3e] rounded-xl text-xs text-white focus:border-[#ff5b14] outline-none"
                >
                  {comics.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({(c.comicType || 'manga').toUpperCase()} - {c.contentType || 'normal'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Pilih Chapter</label>
                <select
                  value={selectedChapterIdForPdf}
                  onChange={(e) => setSelectedChapterIdForPdf(e.target.value)}
                  className="w-full p-2.5 bg-[#171724] border border-[#2b2b3e] rounded-xl text-xs text-white focus:border-[#ff5b14] outline-none"
                >
                  {(chapters[selectedComicIdForPdf] || []).map((ch, idx) => (
                    <option key={`${ch.id || ch.chapterNumber}-${idx}`} value={ch.id}>
                      Ch. {ch.chapterNumber} - {ch.title} ({(ch.pages?.length || 0)} Halaman / {(ch.sourceType || 'manual').toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {chapterPdfProgress && (
              <div className="p-3 bg-[#171726] border border-[#2b2b3e] rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400 shrink-0" />
                <span>{chapterPdfProgress}</span>
              </div>
            )}

            <button
              onClick={handleConvertChapterToPdf}
              disabled={isConvertingChapterPdf || !selectedComicIdForPdf}
              className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              {isConvertingChapterPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sedang Mengonversi ke PDF...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Konversi &amp; Download PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 6: CUSTOM JSON                                           */}
      {/* ============================================================ */}
      {activeSource === 'custom' && (
        <div className="p-5 bg-[#11111a] rounded-2xl border border-[#222234] space-y-3.5 shadow-xl">
          <label className="text-xs font-bold text-slate-300 block">
            Paste Data JSON Komik / Webhook Data
          </label>
          <textarea
            value={customJson}
            onChange={(e) => setCustomJson(e.target.value)}
            rows={8}
            placeholder={`[\n  {\n    "title": "Secret Stepmother",\n    "comicType": "manhwa",\n    "storyWriter": "Kim Min-Woo",\n    "artist": "Park Jin-Ah",\n    "genres": ["Romance 18+", "Drama Dewasa", "Milf / Noona"],\n    "synopsis": "Cerita seru...",\n    "coverImage": "https://...",\n    "status": "ongoing",\n    "totalChapters": 45,\n    "contentType": "18plus"\n  }\n]`}
            className="w-full p-3 bg-[#171724] border border-[#2b2b3e] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-[#ff5b14]"
          />
          <button
            onClick={handleImportCustomJson}
            disabled={!customJson.trim()}
            className="px-4 py-2.5 bg-[#ff5b14] hover:bg-[#e04e0e] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Impor Data JSON ke Katalog</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminScraperTab;
