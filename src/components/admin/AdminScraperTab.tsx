import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  searchMangaDex, 
  searchJikanManga,
  searchKomikindo,
  fetchKomikindoDetail,
  getKomikindoDetail,
  searchDoujindesu,
  searchKomiktap,
  fetchKomiktapDetail,
  runKomiktapDiagnostic,
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
  RotateCcw,
  Activity
} from 'lucide-react';
import { ComicContentType, ComicCategoryType } from '../../types';
import { AdminDiagnosticModal } from './AdminDiagnosticModal';
import { KomikindoDiagnosticModal } from './KomikindoDiagnosticModal';

export const AdminScraperTab: React.FC = () => {
  const { comics, chapters, injectComicWithChapters, batchInjectComicsWithChapters, driveAccounts, addActivityLog } = useApp();

  const [activeSource, setActiveSource] = useState<'komikindo' | 'mangadex' | 'komiktap' | 'jikan' | 'presets' | 'pdf_converter'>('komikindo');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isKomikindoDiagOpen, setIsKomikindoDiagOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<ScrapedComicResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);


  // Komikindo filters
  const [komikindoCategoryFilter, setKomikindoCategoryFilter] = useState<'all' | 'manga' | 'manhwa' | 'manhua' | '18plus'>('all');
  const [komikindoOrder, setKomikindoOrder] = useState<'popular' | 'latest' | 'update'>('popular');
  const [komikindoPage, setKomikindoPage] = useState<number>(1);

  // Komiktap filters & direct URL scraper input
  const [komiktapCategoryFilter, setKomiktapCategoryFilter] = useState<'all' | 'manhwa' | 'manga' | 'manhua'>('all');
  const [komiktapDirectInput, setKomiktapDirectInput] = useState('');
  const [isDirectImporting, setIsDirectImporting] = useState(false);

  // MangaDex, Doujindesu & Preset filters
  const [mangadexCategoryFilter, setMangadexCategoryFilter] = useState<'all' | '18plus' | 'manhwa' | 'manga' | 'manhua'>('all');
  const [mangadexLimit, setMangadexLimit] = useState<number>(50);
  const [mangadexOffset, setMangadexOffset] = useState<number>(0);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [doujindesuCategoryFilter, setDoujindesuCategoryFilter] = useState<'all' | '18plus' | 'doujin' | 'netorare' | 'milf' | 'harem'>('all');
  const [presetCategoryFilter, setPresetCategoryFilter] = useState<'all' | 'manga' | 'manhwa' | 'manhua' | '18plus'>('all');

  // Default import configuration settings (auto = smart selective genre detection)
  const [defaultContentType, setDefaultContentType] = useState<'auto' | 'normal' | '18plus'>('auto');
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

  // Komiktap Diagnostic Probe State
  const [isTestingKomiktap, setIsTestingKomiktap] = useState(false);
  const [komiktapDiagReport, setKomiktapDiagReport] = useState<any>(null);

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
  const clientScraperActiveRef = useRef(false);

  // Poll Auto-Scraper Status from Server (if backend is active)
  const fetchAutoScraperStatus = async () => {
    // If browser client-side turbo scraper is actively running locally, do NOT overwrite its active state
    if (clientScraperActiveRef.current) return;
    try {
      const res = await fetch('/api/scraper/auto-status');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data && typeof data.totalComicsInDB === 'number') {
          if (clientScraperActiveRef.current) return;
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

  // Dual-Engine Mass Scraper Trigger (Universal for both Vercel & Node Server)
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

    // If server-side Express scraper is not running (e.g. Vercel Serverless / SPA hosting), execute Universal Client-Side Turbo Scraper!
    if (!serverSuccess) {
      clientScraperActiveRef.current = true;
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
        clientScraperActiveRef.current = false;
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
    clientScraperActiveRef.current = false;
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

  // Initial mount: load Komikindo popular
  React.useEffect(() => {
    if (searchResults.length === 0 && activeSource === 'komikindo') {
      handleSearchKomikindo(undefined, '', 'all', 'popular', 1);
    }
  }, []);

  // 1. Live Komikindo Scraper Search
  const handleSearchKomikindo = async (
    e?: React.FormEvent, 
    customQ?: string, 
    catFilter?: 'all' | 'manga' | 'manhwa' | 'manhua' | '18plus',
    orderFilter?: 'popular' | 'latest' | 'update',
    pageNum: number = 1
  ) => {
    if (e) e.preventDefault();
    const rawQ = (customQ !== undefined ? customQ : searchQuery).trim();
    const isAll = rawQ.toLowerCase() === 'all' || rawQ.toLowerCase() === 'semua';
    const cleanQ = isAll ? '' : rawQ;
    const cat = catFilter !== undefined ? catFilter : komikindoCategoryFilter;
    const ord = orderFilter !== undefined ? orderFilter : komikindoOrder;

    setIsSearching(true);
    setErrorMsg('');
    try {
      const results = await searchKomikindo(cleanQ, cat, ord, pageNum);
      setSearchResults(results);
      setKomikindoPage(pageNum);
      setHasSearched(true);
      if (results.length === 0) {
        const customStatusMsg = (results as any).statusMessage;
        if (customStatusMsg) {
          setErrorMsg(customStatusMsg);
        } else if (cleanQ) {
          setErrorMsg(`🔍 [KOMIKINDO_SEARCH_EMPTY] Tidak ada komik yang cocok untuk judul "${cleanQ}".`);
        } else {
          setErrorMsg(`🔍 [KOMIKINDO_SEARCH_EMPTY] Tidak ada komik yang ditemukan pada kategori "${cat}".`);
        }
      }
    } catch (err: any) {
      console.error('Komikindo search error:', err);
      setErrorMsg(err.message || 'Gagal terhubung ke Komikindo Scraper.');
    } finally {
      setIsSearching(false);
    }
  };

  // 2. Live MangaDex Search (Supports high-capacity limit and pagination/load more)
  const handleSearchMangaDex = async (
    e?: React.FormEvent, 
    customQ?: string, 
    overrideCategory?: 'all' | '18plus' | 'manhwa' | 'manga' | 'manhua',
    overrideLimit?: number,
    isAppend: boolean = false,
    newOffset: number = 0
  ) => {
    if (e) e.preventDefault();
    const queryToSearch = customQ !== undefined ? customQ : searchQuery;
    const catToUse = overrideCategory !== undefined ? overrideCategory : mangadexCategoryFilter;
    const limitToUse = overrideLimit !== undefined ? overrideLimit : mangadexLimit;

    if (isAppend) {
      setIsLoadingMore(true);
    } else {
      setIsSearching(true);
      setMangadexOffset(0);
    }
    setErrorMsg('');

    try {
      const results = await searchMangaDex(queryToSearch, limitToUse, catToUse, isAppend ? newOffset : 0);
      if (isAppend) {
        setSearchResults(prev => {
          const seen = new Set(prev.map(p => (p.slug || p.title).toLowerCase()));
          const newUnique = results.filter(r => !seen.has((r.slug || r.title).toLowerCase()));
          return [...prev, ...newUnique];
        });
        setMangadexOffset(newOffset);
      } else {
        setSearchResults(results);
        setHasSearched(true);
      }

      if (results.length === 0 && !isAppend) {
        setErrorMsg(`Tidak ditemukan hasil untuk "${queryToSearch || catToUse}".`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Gagal menarik data dari API MangaDex.');
    } finally {
      setIsSearching(false);
      setIsLoadingMore(false);
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

  // 4. Komiktap (Komiktap.info) Search
  const handleSearchKomiktap = async (
    e?: React.FormEvent,
    customQ?: string,
    overrideCategory?: 'all' | 'manhwa' | 'manga' | 'manhua',
    pageToUse: number = 1
  ) => {
    if (e) e.preventDefault();
    const queryToSearch = customQ !== undefined ? customQ : searchQuery;
    const catToUse = overrideCategory !== undefined ? overrideCategory : komiktapCategoryFilter;

    setIsSearching(true);
    setErrorMsg('');
    try {
      const results = await searchKomiktap(queryToSearch.trim(), catToUse, pageToUse);
      if (results && results.length > 0) {
        setSearchResults(results);
        setHasSearched(true);
      } else {
        // Fallback to preset feeds so admin always has quality titles to choose from
        setSearchResults(DOUJINDESU_SCRAPE_FEEDS);
        setHasSearched(true);
        if (queryToSearch) {
          setErrorMsg(`Tidak ditemukan hasil langsung di Komiktap untuk "${queryToSearch}". Menampilkan katalog rekomendasi.`);
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal menarik data dari Komiktap.');
    } finally {
      setIsSearching(false);
    }
  };

  // Live Diagnostic Probe for Komiktap (Komiktap.info) Upstream & Chapter Parsing
  const handleTestKomiktapDiagnostic = async () => {
    setIsTestingKomiktap(true);
    setKomiktapDiagReport(null);
    try {
      const rep = await runKomiktapDiagnostic('Shitataru Kano Haha');
      setKomiktapDiagReport(rep);
    } catch (err: any) {
      setKomiktapDiagReport({ status: 'ERROR', error: err.message });
    } finally {
      setIsTestingKomiktap(false);
    }
  };

  // Direct Komiktap.info URL / Slug Scraper
  const handleDirectKomiktapImport = async () => {
    if (!komiktapDirectInput.trim()) return;
    setIsDirectImporting(true);
    setErrorMsg('');
    const inputVal = komiktapDirectInput.trim();
    setBatchStatus(`⏳ Menghubungi Komiktap.info untuk "${inputVal}"...`);

    try {
      const detail = await fetchKomiktapDetail(inputVal);
      if (!detail) {
        setErrorMsg('Gagal menemukan data di Komiktap.info. Pastikan slug atau tautan valid (contoh: irodori-kazoku)');
        setBatchStatus(null);
        return;
      }

      const scrapedItem: ScrapedComicResult = {
        title: detail.title,
        slug: detail.slug,
        coverImage: detail.coverImage,
        bannerImage: detail.coverImage,
        synopsis: detail.synopsis || `Komik ${detail.title} dari Komiktap.info`,
        genres: detail.genres && detail.genres.length > 0 ? detail.genres : ['Manhwa 18+', 'Doujin', 'Dewasa'],
        status: detail.status || 'ongoing',
        storyWriter: detail.storyWriter || 'Komiktap Creator',
        artist: detail.artist || 'Komiktap Artist',
        rating: detail.rating || 4.9,
        totalChapters: detail.chapters?.length || 0,
        contentType: '18plus',
        comicType: detail.comicType || 'manhwa',
        isFree: defaultIsFree,
        isVisibleOnHome: defaultIsVisibleOnHome,
        isPublished: true,
        sourceApi: 'Komiktap API (Komiktap.info)',
        sourceUrl: detail.url || `https://komiktap.info/manga/${detail.slug}/`,
        chapters: detail.chapters || []
      };

      await handleImportSingle(scrapedItem);
      setKomiktapDirectInput('');
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Terjadi kesalahan saat menarik dari Komiktap: ' + (err.message || ''));
      setBatchStatus(null);
    } finally {
      setIsDirectImporting(false);
    }
  };

  // 5. Import single scraped item (fetches full details if from Komikindo or Komiktap)
  const handleImportSingle = async (item: ScrapedComicResult, overrideOptions?: { isVisibleOnHome?: boolean; contentType?: ComicContentType; comicType?: ComicCategoryType }) => {
    try {
      let itemToUse = item;

      // If Komikindo, fetch full chapter list from detail scraper
      if ((item.sourceApi?.toLowerCase().includes('komikindo') || item.sourceUrl?.includes('komikindo.ch')) && (item.slug || item.sourceUrl)) {
        setBatchStatus(`⏳ Mengambil struktur chapter lengkap Komikindo untuk "${item.title}"...`);
        const fullDetail = await getKomikindoDetail(item.slug || item.sourceUrl || '');
        if (fullDetail) {
          itemToUse = fullDetail;
        }
      }

      // If Komiktap, fetch full detail & chapters from Komiktap scraper
      if ((item.sourceApi?.includes('Komiktap') || item.sourceUrl?.includes('komiktap.info')) && (item.slug || item.sourceUrl)) {
        setBatchStatus(`⏳ Mengambil struktur chapter lengkap Komiktap untuk "${item.title}"...`);
        const ktDetail = await fetchKomiktapDetail(item.slug || item.sourceUrl || '');
        if (ktDetail && typeof ktDetail === 'object' && !Array.isArray(ktDetail)) {
          const validChapters = (Array.isArray(ktDetail.chapters) && ktDetail.chapters.length > 0)
            ? ktDetail.chapters
            : (Array.isArray(itemToUse.chapters) && itemToUse.chapters.length > 0 ? itemToUse.chapters : []);

          itemToUse = {
            ...itemToUse,
            title: ktDetail.title || itemToUse.title,
            slug: ktDetail.slug || itemToUse.slug,
            coverImage: ktDetail.coverImage || itemToUse.coverImage,
            synopsis: ktDetail.synopsis || itemToUse.synopsis,
            chapters: validChapters,
            totalChapters: validChapters.length,
            genres: ktDetail.genres && ktDetail.genres.length > 0 ? ktDetail.genres : itemToUse.genres,
            sourceUrl: ktDetail.url || itemToUse.sourceUrl,
            comicType: ktDetail.comicType || itemToUse.comicType,
            contentType: '18plus'
          };
        }
      }

      const finalContentType = overrideOptions?.contentType ?? itemToUse.contentType ?? (defaultContentType === 'auto' ? undefined : defaultContentType);
      const isNormal = finalContentType === 'normal';
      
      setBatchStatus(`⏳ Menarik data & chapter asli "${itemToUse.title}"...`);
      const { comic, chapters: comicChaps } = await buildComicFromScrapeAsync(itemToUse, {
        contentType: finalContentType,
        comicType: overrideOptions?.comicType ?? itemToUse.comicType,
        isFree: isNormal ? true : defaultIsFree,
        isVisibleOnHome: overrideOptions?.isVisibleOnHome ?? defaultIsVisibleOnHome,
        primaryDriveAccountId: defaultDriveAccountId,
        onProgress: (current, total, chTitle) => {
          setBatchStatus(`⏳ Menarik lembar gambar chapter ${current}/${total}: ${chTitle}...`);
        }
      });

      const injectResult = await injectComicWithChapters(comic, comicChaps);

      if (injectResult.success) {
        setImportedSlugs(prev => ({ ...prev, [item.slug || item.title]: true }));
        addActivityLog('comic_create', `Admin mengimpor "${comic.title}" (${(comic.comicType || 'manga').toUpperCase()}) dari ${item.sourceApi} dengan ${comicChaps.length} chapter asli`);
        setBatchStatus(`✅ Berhasil mengimpor "${comic.title}" (${comicChaps.length} chapter) ke database & katalog!`);
        setTimeout(() => setBatchStatus(null), 3500);
      } else {
        setBatchStatus(`❌ GAGAL Sinkronisasi Supabase: ${injectResult.error || 'Penulisan ditolak'}`);
      }
    } catch (err: any) {
      console.error('Import error:', err);
      setBatchStatus(`❌ GAGAL Impor: ${err.message || 'Terjadi kesalahan saat memproses data komik.'}`);
    }
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

    const batchRes = await batchInjectComicsWithChapters(itemsToInject);

    if (batchRes.success) {
      const newSlugs: Record<string, boolean> = {};
      itemsToInject.forEach(it => {
        newSlugs[it.comic.slug || it.comic.title] = true;
      });
      setImportedSlugs(prev => ({ ...prev, ...newSlugs }));
      setBatchStatus(`✅ Berhasil menarik ${itemsToInject.length} judul ${targetCategory.toUpperCase()} ke Supabase & admin.`);
      setTimeout(() => setBatchStatus(null), 4500);
    } else {
      setBatchStatus(`❌ Batch Gagal ke Supabase: ${batchRes.error}`);
    }
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

    const batchRes = await batchInjectComicsWithChapters(itemsToInject);

    if (batchRes.success) {
      const newSlugs: Record<string, boolean> = {};
      itemsToInject.forEach(it => {
        newSlugs[it.comic.slug || it.comic.title] = true;
      });
      setImportedSlugs(prev => ({ ...prev, ...newSlugs }));
      setBatchStatus(`✅ Berhasil menyuntikkan ${itemsToInject.length} judul komik ke database & katalog!`);
      setTimeout(() => setBatchStatus(null), 4500);
    } else {
      setBatchStatus(`❌ Impor Semua Gagal ke Supabase: ${batchRes.error}`);
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
            onClick={() => setIsDiagnosticOpen(true)}
            className="px-3 py-2 bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>Mode Diagnostik (Uji 1 Komik)</span>
          </button>

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

          {activeSource !== 'pdf_converter' && (
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
              {[1, 5, 100, 300, 500, 1000, 2500, 5000, 10000].map(sz => (
                <button
                  key={sz}
                  onClick={() => setSelectedBatchSize(sz)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedBatchSize === sz
                      ? sz === 1 ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30' : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-[#1b1b2a] text-slate-400 hover:text-white hover:bg-[#25253a]'
                  }`}
                >
                  {sz === 1 ? '🔬 1 Komik (Uji Coba)' : sz >= 1000 ? `${sz / 1000}k` : `${sz} Komik`}
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
                  const val = e.target.value as 'auto' | 'normal' | '18plus';
                  setDefaultContentType(val);
                  if (val === 'normal') setDefaultIsFree(true);
                }}
                className="w-full p-2 bg-[#0d0d14] border border-[#2e2e42] rounded-lg text-white font-medium text-xs focus:border-[#ff5b14] outline-none"
              >
                <option value="auto">🎯 Otomatis Selektif (18+ jika genre dewasa, Normal jika aman)</option>
                <option value="normal">🟢 Paksa Semua Normal (Bebas Baca / Gratis)</option>
                <option value="18plus">🔞 Paksa Semua 18+ (VIP / Koin)</option>
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
            setActiveSource('komikindo');
            if (searchResults.length === 0) handleSearchKomikindo(undefined, '', 'all', 'popular', 1);
          }}
          className={`pb-2.5 px-3.5 font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeSource === 'komikindo'
              ? 'border-[#ff5b14] text-white bg-white/5 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-[#ff5b14]" />
          <span>Komikindo (Manga &amp; Manhwa Indo)</span>
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
            setActiveSource('komiktap');
            if (searchResults.length === 0) {
              handleSearchKomiktap(undefined, '', 'all');
            }
          }}
          className={`pb-2.5 px-3.5 font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeSource === 'komiktap' || activeSource === 'presets'
              ? 'border-[#ff5b14] text-white bg-white/5 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-rose-400" />
          <span>Komiktap.info (18+ &amp; Manhwa)</span>
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
      </div>

      {/* ============================================================ */}
      {/* TAB 1: KOMIKINDO LIVE SCRAPER (INDONESIA)                    */}
      {/* ============================================================ */}
      {activeSource === 'komikindo' && (
        <div className="space-y-4">
          {/* Category & Order Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#11111a] p-3 rounded-2xl border border-[#202030]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-400 text-xs font-bold flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5 text-[#ff5b14]" />
                Kategori:
              </span>

              {(['all', 'manga', 'manhwa', 'manhua', '18plus'] as const).map((cat) => {
                const label = 
                  cat === 'all' ? '⚡ Semua' :
                  cat === 'manga' ? '🇯🇵 Manga' :
                  cat === 'manhwa' ? '🇰🇷 Manhwa' :
                  cat === 'manhua' ? '🇨🇳 Manhua' : '🔞 18+ Dewasa';

                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setKomikindoCategoryFilter(cat);
                      handleSearchKomikindo(undefined, searchQuery, cat, komikindoOrder, 1);
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1 ${
                      komikindoCategoryFilter === cat
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
                    setKomikindoOrder(ord);
                    handleSearchKomikindo(undefined, searchQuery, komikindoCategoryFilter, ord, 1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                    komikindoOrder === ord
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
          <form onSubmit={(e) => handleSearchKomikindo(e, undefined, undefined, undefined, 1)} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari komik di Komikindo (contoh: Solo Leveling, Eleceed, Magic Emperor, Martial Peak)..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#11111a] border border-[#222234] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14]"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-4 py-2.5 bg-[#ff5b14] hover:bg-[#e04e0e] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 cursor-pointer transition-all"
            >
              {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Cari Komikindo</span>
            </button>
            <button
              type="button"
              onClick={() => setIsKomikindoDiagOpen(true)}
              title="Audit diagnostik koneksi upstream Komikindo vs Cloudflare / Vercel"
              className="px-3.5 py-2.5 bg-[#171726] hover:bg-[#202038] text-indigo-300 hover:text-white border border-indigo-500/30 font-bold text-xs rounded-xl shadow flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
            >
              <Activity className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Audit Upstream</span>
            </button>
          </form>

          {/* Recommendation Tags and Page Pagination */}
          <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-500 font-semibold">Rekomendasi:</span>
              {['Solo Leveling', 'Magic Emperor', 'Martial Peak', 'Return of Mount Hua', 'Eleceed', 'Nano Machine', 'Damn Reincarnation'].map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setSearchQuery(tag);
                    handleSearchKomikindo(undefined, tag, undefined, undefined, 1);
                  }}
                  className="px-2.5 py-0.5 bg-[#161622] hover:bg-[#202032] border border-[#262638] rounded-full text-[10px] text-slate-300 cursor-pointer transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Hal. <strong className="text-white">{komikindoPage}</strong></span>
              <button
                type="button"
                disabled={komikindoPage <= 1 || isSearching}
                onClick={() => handleSearchKomikindo(undefined, searchQuery, komikindoCategoryFilter, komikindoOrder, komikindoPage - 1)}
                className="px-2.5 py-1 bg-[#171724] border border-[#27273a] hover:bg-[#202032] disabled:opacity-30 rounded-lg text-[11px] text-slate-300 hover:text-white font-medium cursor-pointer transition-all"
              >
                &larr; Prev
              </button>
              <button
                type="button"
                disabled={isSearching || searchResults.length === 0}
                onClick={() => handleSearchKomikindo(undefined, searchQuery, komikindoCategoryFilter, komikindoOrder, komikindoPage + 1)}
                className="px-2.5 py-1 bg-[#171724] border border-[#27273a] hover:bg-[#202032] disabled:opacity-30 rounded-lg text-[11px] text-slate-300 hover:text-white font-medium cursor-pointer transition-all"
              >
                Next &rarr;
              </button>
            </div>
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
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#11111a] p-3 rounded-2xl border border-[#202030]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-400 text-xs font-bold flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5 text-[#ff5b14]" />
                Kategori:
              </span>

              <button
                onClick={() => {
                  setMangadexCategoryFilter('18plus');
                  handleSearchMangaDex(undefined, searchQuery, '18plus');
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
                  handleSearchMangaDex(undefined, searchQuery, 'manhwa');
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
                  handleSearchMangaDex(undefined, searchQuery, 'manga');
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
                  handleSearchMangaDex(undefined, searchQuery, 'manhua');
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
                  handleSearchMangaDex(undefined, searchQuery, 'all');
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

            {/* High-Capacity Batch Limit Selector */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 text-[11px] font-bold">Limit Tarik:</span>
              {[20, 50, 100, 200, 500].map((lim) => (
                <button
                  key={lim}
                  type="button"
                  onClick={() => {
                    setMangadexLimit(lim);
                    handleSearchMangaDex(undefined, searchQuery, mangadexCategoryFilter, lim);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black cursor-pointer transition-all ${
                    mangadexLimit === lim
                      ? 'bg-[#ff5b14] text-white shadow-sm ring-1 ring-white/20'
                      : 'bg-[#181824] text-slate-400 hover:text-white border border-[#262638]'
                  }`}
                >
                  {lim === 500 ? '500 (Max)' : lim}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={(e) => handleSearchMangaDex(e)} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kata kunci di MangaDex (contoh: Slime, Isekai, Solo Leveling, Reincarnation, Secret Class)..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#11111a] border border-[#222234] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14]"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-4 py-2.5 bg-[#ff5b14] hover:bg-[#e04e0e] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 cursor-pointer transition-all"
            >
              {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Cari MangaDex ({mangadexLimit})</span>
            </button>
          </form>

          {/* Recommendation Tags for MangaDex */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-[11px] text-slate-500 font-semibold">Kata Kunci Populer:</span>
            {['Slime', 'Isekai', 'Solo Leveling', 'Reincarnation', 'System', 'Martial Peak', 'Magic Emperor', 'Secret Class', 'Circles', 'Demon King', 'Overpowered'].map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setSearchQuery(tag);
                  handleSearchMangaDex(undefined, tag);
                }}
                className="px-2.5 py-0.5 bg-[#161622] hover:bg-[#202032] border border-[#262638] rounded-full text-[10px] text-slate-300 cursor-pointer transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Results Count Header */}
          {hasSearched && searchResults.length > 0 && (
            <div className="flex items-center justify-between text-xs px-1 text-slate-400">
              <span>
                Ditemukan <strong className="text-white">{searchResults.length}</strong> judul komik untuk kata kunci <strong className="text-[#ff5b14]">"{searchQuery || mangadexCategoryFilter}"</strong> (Kapasitas: {mangadexLimit} per tarikan)
              </span>
              <button
                onClick={handleImportAllVisible}
                className="text-xs text-[#ff5b14] hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Suntikkan Semua {searchResults.length} Komik</span>
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-4">
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
                        <span className="text-[10px] text-slate-500 font-mono">{item.sourceApi}</span>
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

              {/* Load More / Next Page Pagination for MangaDex */}
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => {
                    const nextOffset = mangadexOffset + searchResults.length;
                    handleSearchMangaDex(undefined, searchQuery, mangadexCategoryFilter, mangadexLimit, true, nextOffset);
                  }}
                  disabled={isLoadingMore}
                  className="px-6 py-2.5 bg-[#171724] hover:bg-[#202032] border border-[#2e2e42] hover:border-[#ff5b14]/50 rounded-xl text-xs font-bold text-slate-200 hover:text-white flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#ff5b14]" />
                      <span>Menarik Halaman Berikutnya dari MangaDex...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 text-[#ff5b14]" />
                      <span>Muat Lebih Banyak / Tarik Halaman Berikutnya (+{mangadexLimit} Judul)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: KOMIKTAP.INFO (18+ & MANHWA) REAL SCRAPER             */}
      {/* ============================================================ */}
      {(activeSource === 'komiktap' || activeSource === 'presets') && (
        <div className="space-y-4">
          {/* Direct URL / Slug Quick Importer */}
          <div className="p-4 bg-gradient-to-r from-[#171120] to-[#12121c] border border-rose-500/30 rounded-2xl shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-rose-400" />
              <h3 className="font-extrabold text-white text-sm">Tarik Langsung via URL / Slug Komiktap.info</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Gambar &amp; Chapter Asli
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Mendukung ekstraksi komik lengkap beserta seluruh chapter dan gambar scanlation aslinya (contoh: <code className="text-rose-300 bg-rose-950/40 px-1 py-0.5 rounded">irodori-kazoku</code> atau <code className="text-rose-300 bg-rose-950/40 px-1 py-0.5 rounded">https://komiktap.info/manga/irodori-kazoku/</code>).
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={komiktapDirectInput}
                  onChange={(e) => setKomiktapDirectInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleDirectKomiktapImport(); }}
                  placeholder="Masukkan slug atau link Komiktap (contoh: irodori-kazoku)..."
                  className="w-full px-4 py-2.5 bg-[#0e0e16] border border-[#262638] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>
              <button
                type="button"
                onClick={handleDirectKomiktapImport}
                disabled={isDirectImporting || !komiktapDirectInput.trim()}
                className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-[#ff5b14] hover:from-rose-500 hover:to-[#ff6d2e] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
              >
                {isDirectImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>Tarik Komik &amp; Chapter</span>
              </button>
            </div>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchKomiktap} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari judul komik di Komiktap.info (contoh: Irodori Kazoku, Silent War, Stepmother Friends)..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#11111a] border border-[#222234] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14]"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-4 py-2.5 bg-[#ff5b14] hover:bg-[#e04e0e] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
            >
              {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Cari Komiktap</span>
            </button>
          </form>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#11111a] p-3 rounded-2xl border border-[#202030]">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-bold mr-1 text-xs">Kategori Komiktap:</span>
              <button
                type="button"
                onClick={() => {
                  setKomiktapCategoryFilter('all');
                  handleSearchKomiktap(undefined, searchQuery, 'all');
                }}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  komiktapCategoryFilter === 'all'
                    ? 'bg-[#ff5b14] text-white shadow-sm'
                    : 'bg-[#181824] text-slate-400 hover:text-slate-200 border border-[#262638]'
                }`}
              >
                🔞 Semua 18+
              </button>

              <button
                type="button"
                onClick={() => {
                  setKomiktapCategoryFilter('manhwa');
                  handleSearchKomiktap(undefined, searchQuery, 'manhwa');
                }}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  komiktapCategoryFilter === 'manhwa'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-[#181824] text-slate-400 hover:text-slate-200 border border-[#262638]'
                }`}
              >
                🔥 Manhwa 18+
              </button>

              <button
                type="button"
                onClick={() => {
                  setKomiktapCategoryFilter('manga');
                  handleSearchKomiktap(undefined, searchQuery, 'manga');
                }}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  komiktapCategoryFilter === 'manga'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-[#181824] text-slate-400 hover:text-slate-200 border border-[#262638]'
                }`}
              >
                👑 Manga 18+
              </button>

              <button
                type="button"
                onClick={() => {
                  setKomiktapCategoryFilter('manhua');
                  handleSearchKomiktap(undefined, searchQuery, 'manhua');
                }}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  komiktapCategoryFilter === 'manhua'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-[#181824] text-slate-400 hover:text-slate-200 border border-[#262638]'
                }`}
              >
                🌸 Manhua 18+
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestKomiktapDiagnostic}
                disabled={isTestingKomiktap}
                className="text-[11px] font-bold text-rose-400 hover:text-rose-300 disabled:opacity-50 flex items-center gap-1 cursor-pointer px-2.5 py-1 rounded-lg bg-rose-950/40 border border-rose-500/30 transition-all"
              >
                {isTestingKomiktap ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                <span>{isTestingKomiktap ? 'Memeriksa...' : 'Audit Upstream'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSearchKomiktap(undefined, '', 'all')}
                className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Muat Ulang Katalog
              </button>
            </div>
          </div>

          {komiktapDiagReport && (
            <div className={`p-4 rounded-2xl border text-xs ${
              komiktapDiagReport.verdict === 'WORKING' 
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' 
                : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
            }`}>
              <div className="flex items-center justify-between font-bold mb-2">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Audit Upstream Komiktap.info: {komiktapDiagReport.verdict} ({komiktapDiagReport.status})</span>
                </span>
                <span className="text-[10px] font-mono opacity-70">
                  {komiktapDiagReport.runtime} • {komiktapDiagReport.durationMs}ms
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 pt-2 border-t border-white/10 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Homepage Probe:</span>
                  <span>HTTP {komiktapDiagReport.probes?.homepage?.httpStatus || 'N/A'} ({komiktapDiagReport.probes?.homepage?.challengeDetected ? 'CF Challenge' : 'Clean'})</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Katalog Search:</span>
                  <span>{komiktapDiagReport.probes?.search?.parserMatches || 0} judul cocok</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Detail Discovery:</span>
                  <span className="font-bold text-white">
                    {komiktapDiagReport.probes?.detail?.rawChaptersFound ?? 0} chapter ditemukan
                  </span>
                </div>
              </div>
              {komiktapDiagReport.probes?.detail?.sampleChapters && komiktapDiagReport.probes.detail.sampleChapters.length > 0 && (
                <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-2">
                  <span>Sample chapters:</span>
                  {komiktapDiagReport.probes.detail.sampleChapters.map((sc: string, sci: number) => (
                    <span key={sci} className="bg-black/30 px-1.5 py-0.5 rounded text-rose-300 border border-white/5">{sc}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(searchResults.length > 0 ? searchResults : DOUJINDESU_SCRAPE_FEEDS).map((item, idx) => {
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
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold border bg-rose-500/15 text-rose-300 border-rose-500/30">
                          🔞 18+ VIP
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/5 text-slate-300 border border-white/10">
                          {(item.comicType || 'manhwa').toUpperCase()}
                        </span>
                        <span className="text-[10px] text-slate-400">{(item.status || 'ongoing').toUpperCase()}</span>
                      </div>
                      <h4 className="font-bold text-sm text-white line-clamp-1 leading-snug">{item.title}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">{item.synopsis}</p>
                      {item.sourceUrl && (
                        <p className="text-[10px] text-rose-400/80 truncate mt-1 font-mono">
                          {item.sourceUrl.replace('https://', '')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#1b1b2a] text-xs">
                    <span className="text-[10px] text-slate-500 font-mono">Komiktap.info</span>
                    {isImported ? (
                      <span className="px-3 py-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Sudah Ada di Web
                      </span>
                    ) : (
                      <button
                        onClick={() => handleImportSingle(item)}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-rose-600 to-[#ff5b14] hover:from-rose-500 hover:to-[#ff6d2e] text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                      >
                        <Download className="w-3.5 h-3.5" /> Tarik Komik &amp; Gambar
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

      {/* Diagnostic Modal */}
      <AdminDiagnosticModal
        isOpen={isDiagnosticOpen}
        onClose={() => setIsDiagnosticOpen(false)}
      />

      {/* Komikindo Upstream Forensic Diagnostic Modal */}
      <KomikindoDiagnosticModal
        isOpen={isKomikindoDiagOpen}
        onClose={() => setIsKomikindoDiagOpen(false)}
        initialQuery={searchQuery || 'titan forge'}
      />
    </div>
  );
};

export default AdminScraperTab;
