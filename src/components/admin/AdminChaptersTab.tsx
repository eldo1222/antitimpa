import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Chapter, ChapterSourceType } from '../../types';
import { getComicProjectType, getComicProjectTypeLabel } from '../../utils/comicUtils';
import { formatGoogleDriveEmbedUrl, isGoogleDriveUrl } from '../../utils/driveHelper';
import { downloadDrivePdf, convertImagesToPdf } from '../../utils/pdfConverter';
import { getProfessionalComicSkeletonUrl } from '../common/ComicSkeletonBox';
import { AdminModalPortal } from '../common/AdminModalPortal';
import { runControlledConcurrency, fetchKomiktapChapterPages } from '../../services/comicScraperService';
import { ChapterRepository } from '../../features/chapters/services/chapterRepository';
import { 
  Plus, 
  Trash2, 
  Edit, 
  FileText, 
  Image as ImageIcon, 
  HardDrive, 
  ExternalLink, 
  Check, 
  Eye, 
  UploadCloud, 
  X, 
  AlertCircle,
  AlertTriangle,
  Sparkles,
  Link as LinkIcon,
  Download,
  Loader2,
  CheckSquare,
  Square,
  ShieldAlert,
  Search,
  Folder,
  FolderOpen,
  ArrowLeft,
  Filter,
  Layers,
  BookOpen,
  Globe,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Crown,
  Zap
} from 'lucide-react';

export const AdminChaptersTab: React.FC = () => {
  const { 
    comics, 
    chapters, 
    driveAccounts,
    addChapter, 
    updateChapter, 
    batchUpdateChapterPages,
    deleteChapter, 
    batchDeleteChapters,
    batchDeleteComics,
    startReading, 
    setIsAdminView 
  } = useApp();
  
  // View Modes: 'folders' (Comic Folder Explorer) or 'chapters' (Detail Chapter Manager for Selected Comic)
  const [viewMode, setViewMode] = useState<'folders' | 'chapters'>('folders');
  const [selectedComicId, setSelectedComicId] = useState<string>(comics[0]?.id || '');
  
  // Smart Search & Filter States for Comic Folders
  const [comicSearchQuery, setComicSearchQuery] = useState('');
  const [comicCategoryFilter, setComicCategoryFilter] = useState<'all' | 'admin_personal' | 'scraped_ready' | 'preview_gateway' | 'has_chapters' | 'no_chapters' | '18plus' | 'normal' | 'manga' | 'manhwa' | 'doujin'>('all');
  
  // Pagination State for Folder Mode
  const [folderPage, setFolderPage] = useState<number>(1);
  const [foldersPerPage, setFoldersPerPage] = useState<number>(12);

  // Multi-Select for Comic Folders
  const [selectedFolderComicIds, setSelectedFolderComicIds] = useState<string[]>([]);
  const [showFolderDeleteModal, setShowFolderDeleteModal] = useState(false);
  const [folderDeleteReason, setFolderDeleteReason] = useState('');

  // Chapter-specific search inside the active comic
  const [chapterSearchQuery, setChapterSearchQuery] = useState('');
  
  // Pagination State for Chapter Table Mode
  const [chapterPage, setChapterPage] = useState<number>(1);
  const [chaptersPerPage, setChaptersPerPage] = useState<number>(15);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);

  // Multi-Select & Batch Delete States for Chapters
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [chaptersToDelete, setChaptersToDelete] = useState<Chapter[]>([]);
  const [deleteReason, setDeleteReason] = useState('');

  // Chapter PDF downloading state
  const [downloadingChapterId, setDownloadingChapterId] = useState<string | null>(null);
  const [fetchingChapterId, setFetchingChapterId] = useState<string | null>(null);
  const [pdfToastMsg, setPdfToastMsg] = useState<string | null>(null);
  const [isBatchPullingPages, setIsBatchPullingPages] = useState(false);
  const [batchPullProgress, setBatchPullProgress] = useState<{ current: number; total: number; success: number; currentName: string } | null>(null);
  const cancelBatchPullRef = useRef(false);

  // Form State
  const [chapterNumber, setChapterNumber] = useState<number>(1);
  const [title, setTitle] = useState('');
  const [sourceType, setSourceType] = useState<ChapterSourceType>('images');

  // Option 1: Images State
  const [imageUploadMode, setImageUploadMode] = useState<'files' | 'urls' | 'svg'>('files');
  const [customImageFiles, setCustomImageFiles] = useState<string[]>([]);
  const [imageUrlsText, setImageUrlsText] = useState('');
  const [pageCount, setPageCount] = useState<number>(8);

  // Option 2: PDF State
  const [pdfMode, setPdfMode] = useState<'file' | 'url'>('file');
  const [pdfFileUrl, setPdfFileUrl] = useState<string>('');
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const [pdfWebUrl, setPdfWebUrl] = useState<string>('');

  // Option 3: Google Drive State
  const [driveUrl, setDriveUrl] = useState<string>('');
  const [driveAccountId, setDriveAccountId] = useState<string>('');
  const [driveNotes, setDriveNotes] = useState<string>('');
  const [drivePreviewTest, setDrivePreviewTest] = useState<boolean>(false);

  // Option 4: External Link Gateway State (NHentai, DoujinDesu, MangaPlus, etc.)
  const [externalUrl, setExternalUrl] = useState<string>('');
  const [externalPlatform, setExternalPlatform] = useState<string>('NHentai');
  const [externalNote, setExternalNote] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const currentComic = comics.find(c => c.id === selectedComicId);
  const allCurrentChapters = [...(chapters[selectedComicId] || [])].sort((a, b) => b.chapterNumber - a.chapterNumber);

  // Filtered Chapters based on search inside active comic
  const currentChapters = useMemo(() => {
    if (!chapterSearchQuery.trim()) return allCurrentChapters;
    const q = chapterSearchQuery.toLowerCase().trim();
    return allCurrentChapters.filter(ch => 
      String(ch.chapterNumber).includes(q) ||
      ch.title.toLowerCase().includes(q) ||
      ch.sourceType.toLowerCase().includes(q)
    );
  }, [allCurrentChapters, chapterSearchQuery]);

  // Chapter Pagination Calculations
  const totalChapterPages = Math.ceil(currentChapters.length / chaptersPerPage) || 1;
  const validChapterPage = Math.min(Math.max(1, chapterPage), totalChapterPages);
  const chapterStartIndex = (validChapterPage - 1) * chaptersPerPage;
  const chapterEndIndex = Math.min(chapterStartIndex + chaptersPerPage, currentChapters.length);
  const paginatedChapters = useMemo(() => {
    return currentChapters.slice(chapterStartIndex, chapterEndIndex);
  }, [currentChapters, chapterStartIndex, chapterEndIndex]);

  // Filtered Comics for Folder Explorer
  const filteredComics = useMemo(() => {
    return comics.filter(c => {
      const chList = chapters[c.id] || [];
      const chCount = chList.length;
      const projType = getComicProjectType(c, chList);

      // Category / Status Filter
      if (comicCategoryFilter === 'admin_personal' && projType !== 'admin_personal') return false;
      if (comicCategoryFilter === 'scraped_ready' && projType !== 'scraped_ready') return false;
      if (comicCategoryFilter === 'preview_gateway' && projType !== 'preview_gateway') return false;
      if (comicCategoryFilter === 'has_chapters' && chCount === 0) return false;
      if (comicCategoryFilter === 'no_chapters' && chCount > 0) return false;
      if (comicCategoryFilter === '18plus' && c.contentType !== '18plus') return false;
      if (comicCategoryFilter === 'normal' && c.contentType === '18plus') return false;
      if (comicCategoryFilter === 'manga' && c.comicType !== 'manga' && c.type !== 'manga') return false;
      if (comicCategoryFilter === 'manhwa' && c.comicType !== 'manhwa' && c.type !== 'manhwa') return false;
      if (comicCategoryFilter === 'doujin' && c.comicType !== 'doujin' && c.type !== 'doujin') return false;

      // Search Query
      if (comicSearchQuery.trim()) {
        const q = comicSearchQuery.toLowerCase().trim();
        const matchTitle = c.title.toLowerCase().includes(q);
        const matchAuthor = (c.storyWriter || '').toLowerCase().includes(q) || (c.artist || '').toLowerCase().includes(q);
        const matchGenre = (c.genres || []).some(g => g.toLowerCase().includes(q));
        if (!matchTitle && !matchAuthor && !matchGenre) return false;
      }

      return true;
    });
  }, [comics, chapters, comicCategoryFilter, comicSearchQuery]);

  // Folder Pagination Calculations
  const totalFolderPages = Math.ceil(filteredComics.length / foldersPerPage) || 1;
  const validFolderPage = Math.min(Math.max(1, folderPage), totalFolderPages);
  const folderStartIndex = (validFolderPage - 1) * foldersPerPage;
  const folderEndIndex = Math.min(folderStartIndex + foldersPerPage, filteredComics.length);
  const paginatedFolderComics = useMemo(() => {
    return filteredComics.slice(folderStartIndex, folderEndIndex);
  }, [filteredComics, folderStartIndex, folderEndIndex]);

  // Progressive render streaming limit for 60fps folder view
  const [renderedFoldersCount, setRenderedFoldersCount] = useState<number>(36);
  useEffect(() => {
    setRenderedFoldersCount(Math.min(36, paginatedFolderComics.length));
    if (paginatedFolderComics.length > 36) {
      let current = 36;
      const interval = setInterval(() => {
        current += 48;
        setRenderedFoldersCount(current);
        if (current >= paginatedFolderComics.length) {
          clearInterval(interval);
        }
      }, 16);
      return () => clearInterval(interval);
    }
  }, [paginatedFolderComics.length, validFolderPage, comicCategoryFilter, comicSearchQuery, foldersPerPage]);

  const visibleFolderComics = paginatedFolderComics.slice(0, renderedFoldersCount);

  // Progressive render streaming limit for 60fps chapter table view
  const [renderedChaptersCount, setRenderedChaptersCount] = useState<number>(50);
  useEffect(() => {
    setRenderedChaptersCount(Math.min(50, paginatedChapters.length));
    if (paginatedChapters.length > 50) {
      let current = 50;
      const interval = setInterval(() => {
        current += 75;
        setRenderedChaptersCount(current);
        if (current >= paginatedChapters.length) {
          clearInterval(interval);
        }
      }, 16);
      return () => clearInterval(interval);
    }
  }, [paginatedChapters.length, validChapterPage, selectedComicId, chapterSearchQuery, chaptersPerPage]);

  const visibleChapters = paginatedChapters.slice(0, renderedChaptersCount);

  // Folder multi-select helpers
  const isAllFoldersSelected = paginatedFolderComics.length > 0 && paginatedFolderComics.every(c => selectedFolderComicIds.includes(c.id));
  
  const handleToggleFolderSelectAll = () => {
    if (isAllFoldersSelected) {
      setSelectedFolderComicIds(prev => prev.filter(id => !paginatedFolderComics.some(c => c.id === id)));
    } else {
      const pageIds = paginatedFolderComics.map(c => c.id);
      setSelectedFolderComicIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleFolderSelectOne = (id: string) => {
    setSelectedFolderComicIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleConfirmDeleteFolders = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFolderComicIds.length === 0) return;
    batchDeleteComics(selectedFolderComicIds, folderDeleteReason.trim() || 'Penghapusan batch folder komik oleh Administrator');
    setShowFolderDeleteModal(false);
    setSelectedFolderComicIds([]);
  };

  // Reset pagination on search or filter change
  React.useEffect(() => {
    setFolderPage(1);
  }, [comicSearchQuery, comicCategoryFilter, foldersPerPage]);

  React.useEffect(() => {
    setChapterPage(1);
  }, [selectedComicId, chapterSearchQuery, chaptersPerPage]);

  // Generate dynamic page numbers helper
  const getPageNumbers = (currentP: number, totalP: number) => {
    const delta = 2;
    const range: (number | string)[] = [];
    for (let i = Math.max(2, currentP - delta); i <= Math.min(totalP - 1, currentP + delta); i++) {
      range.push(i);
    }
    if (currentP - delta > 2) range.unshift('...');
    range.unshift(1);
    if (currentP + delta < totalP - 1) range.push('...');
    if (totalP > 1) range.push(totalP);
    return range;
  };

  // Selection Logic
  const isAllSelected = currentChapters.length > 0 && currentChapters.every(ch => selectedChapterIds.includes(ch.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedChapterIds([]);
    } else {
      setSelectedChapterIds(currentChapters.map(ch => ch.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedChapterIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleOpenAddForComic = (comicId: string) => {
    setSelectedComicId(comicId);
    setViewMode('chapters');
    const existingList = chapters[comicId] || [];
    const highestCh = existingList.reduce((max, ch) => Math.max(max, ch.chapterNumber), 0);
    setChapterNumber(highestCh + 1);
    setTitle(`Chapter ${highestCh + 1}`);
    setEditingChapter(null);
    setSourceType('images');
    setImageUploadMode('files');
    setCustomImageFiles([]);
    setImageUrlsText('');
    setPageCount(8);
    setPdfFileUrl('');
    setPdfFileName('');
    setPdfWebUrl('');
    setDriveUrl('');
    setDriveAccountId('');
    setDriveNotes('');
    setExternalUrl('');
    setExternalPlatform('NHentai');
    setExternalNote('');
    setShowAddModal(true);
  };

  const handleOpenManageForComic = (comicId: string) => {
    setSelectedComicId(comicId);
    setSelectedChapterIds([]);
    setChapterSearchQuery('');
    setViewMode('chapters');
  };

  // Trigger Single Chapter Delete
  const handleRequestSingleDelete = (ch: Chapter) => {
    setChaptersToDelete([ch]);
    setDeleteReason('');
    setShowDeleteConfirmModal(true);
  };

  // Trigger Batch Chapter Delete
  const handleRequestBatchDelete = () => {
    const targets = currentChapters.filter(ch => selectedChapterIds.includes(ch.id));
    if (targets.length === 0) return;
    setChaptersToDelete(targets);
    setDeleteReason('');
    setShowDeleteConfirmModal(true);
  };

  // Confirm Chapter Delete Handler
  const handleConfirmDeleteChapters = (e: React.FormEvent) => {
    e.preventDefault();
    const ids = chaptersToDelete.map(ch => ch.id);
    const reasonText = deleteReason.trim() || 'Penghapusan chapter oleh Administrator';

    batchDeleteChapters(selectedComicId, ids, reasonText);
    setShowDeleteConfirmModal(false);
    setSelectedChapterIds(prev => prev.filter(id => !ids.includes(id)));
  };

  // Open Add Chapter modal with smart defaults
  const handleOpenAdd = () => {
    setEditingChapter(null);
    const nextNum = currentChapters.length > 0 
      ? Math.max(...currentChapters.map(c => c.chapterNumber)) + 1 
      : 1;
    setChapterNumber(nextNum);
    setTitle(`Chapter ${nextNum}`);
    setSourceType('drive');
    setImageUploadMode('files');
    setCustomImageFiles([]);
    setImageUrlsText('');
    setPageCount(8);
    setPdfFileUrl('');
    setPdfFileName('');
    setPdfWebUrl('');
    setDriveUrl('');
    setDriveAccountId(currentComic?.primaryDriveAccountId || driveAccounts[0]?.id || '');
    setDriveNotes('');
    setDrivePreviewTest(false);
    setExternalUrl('');
    setExternalPlatform('NHentai');
    setExternalNote('');
    setShowAddModal(true);
  };

  // Open Edit Chapter modal
  const handleOpenEdit = (ch: Chapter) => {
    setEditingChapter(ch);
    setChapterNumber(ch.chapterNumber);
    setTitle(ch.title);
    setSourceType(ch.sourceType || 'images');
    setPageCount(ch.pageCount || 8);
    if (ch.sourceType === 'drive') {
      setDriveUrl(ch.driveUrl || '');
      setDriveAccountId(ch.driveAccountId || currentComic?.primaryDriveAccountId || driveAccounts[0]?.id || '');
      setDriveNotes(ch.driveNotes || '');
    } else if (ch.sourceType === 'pdf') {
      if (ch.pdfUrl?.startsWith('data:')) {
        setPdfMode('file');
        setPdfFileUrl(ch.pdfUrl);
        setPdfFileName(ch.pdfFileName || 'document.pdf');
      } else {
        setPdfMode('url');
        setPdfWebUrl(ch.pdfUrl || '');
      }
    } else if (ch.sourceType === 'external') {
      setExternalUrl(ch.externalUrl || '');
      setExternalPlatform(ch.externalPlatform || 'NHentai');
      setExternalNote(ch.externalNote || '');
    } else {
      if (ch.pages && ch.pages.length > 0) {
        setCustomImageFiles(ch.pages.map(p => p.imageUrl));
      }
    }
    setShowAddModal(true);
  };

  // Handle Multi Image File Selection
  const handleImageFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files.item(i);
      if (!file) continue;
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCustomImageFiles(prev => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle PDF File Selection
  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPdfFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPdfFileUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Form Submit (Add or Edit)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComicId) return;

    if (editingChapter) {
      // Update existing chapter
      let updates: Partial<Chapter> = {
        chapterNumber: Number(chapterNumber),
        title,
        sourceType,
        pageCount: Number(pageCount)
      };

      if (sourceType === 'drive') {
        updates.driveUrl = driveUrl;
        updates.driveEmbedUrl = formatGoogleDriveEmbedUrl(driveUrl);
        updates.driveAccountId = driveAccountId || undefined;
        updates.driveNotes = driveNotes || undefined;
      } else if (sourceType === 'pdf') {
        updates.pdfUrl = pdfMode === 'file' ? pdfFileUrl : pdfWebUrl;
        updates.pdfFileName = pdfFileName || 'document.pdf';
      } else if (sourceType === 'external') {
        updates.externalUrl = externalUrl;
        updates.externalPlatform = externalPlatform;
        updates.externalNote = externalNote;
      } else {
        // Images mode
        let pagesToSave: string[] | undefined = undefined;
        if (imageUploadMode === 'files' && customImageFiles.length > 0) {
          pagesToSave = customImageFiles;
        } else if (imageUploadMode === 'urls' && imageUrlsText.trim()) {
          pagesToSave = imageUrlsText.split('\n').map(s => s.trim()).filter(Boolean);
        }
        if (pagesToSave && pagesToSave.length > 0) {
          updates.pages = pagesToSave.map((url, idx) => ({
            id: `p-${editingChapter.id}-${idx + 1}`,
            pageNumber: idx + 1,
            imageUrl: url
          }));
        }
      }

      updateChapter(selectedComicId, editingChapter.id, updates);
    } else {
      // Add new chapter
      if (sourceType === 'drive') {
        addChapter(selectedComicId, {
          chapterNumber: Number(chapterNumber),
          title: title || `Chapter ${chapterNumber}`,
          sourceType: 'drive',
          driveUrl,
          driveEmbedUrl: formatGoogleDriveEmbedUrl(driveUrl),
          driveAccountId: driveAccountId || undefined,
          driveNotes: driveNotes || undefined,
          pageCount: Number(pageCount)
        });
      } else if (sourceType === 'pdf') {
        const finalPdfUrl = pdfMode === 'file' ? pdfFileUrl : pdfWebUrl;
        addChapter(selectedComicId, {
          chapterNumber: Number(chapterNumber),
          title: title || `Chapter ${chapterNumber}`,
          sourceType: 'pdf',
          pdfUrl: finalPdfUrl,
          pdfFileName: pdfFileName || 'document.pdf',
          pageCount: Number(pageCount)
        });
      } else if (sourceType === 'external') {
        addChapter(selectedComicId, {
          chapterNumber: Number(chapterNumber),
          title: title || `Chapter ${chapterNumber}`,
          sourceType: 'external',
          externalUrl,
          externalPlatform: externalPlatform || 'NHentai',
          externalNote,
          pageCount: Number(pageCount) || 1
        });
      } else {
        // Images mode
        let pagesToSave: string[] | undefined = undefined;
        if (imageUploadMode === 'files' && customImageFiles.length > 0) {
          pagesToSave = customImageFiles;
        } else if (imageUploadMode === 'urls' && imageUrlsText.trim()) {
          pagesToSave = imageUrlsText.split('\n').map(s => s.trim()).filter(Boolean);
        }

        addChapter(selectedComicId, {
          chapterNumber: Number(chapterNumber),
          title: title || `Chapter ${chapterNumber}`,
          sourceType: 'images',
          pageCount: Number(pageCount),
          customPages: pagesToSave
        });
      }
    }

    setShowAddModal(false);
  };

  const handlePreviewInReader = (chapterId: string) => {
    startReading(chapterId);
    setIsAdminView(false);
  };

  const handleFetchChapterPages = async (ch: Chapter) => {
    if (!currentComic) return;
    setFetchingChapterId(ch.id);
    const chTitle = ch.title || `Chapter ${ch.chapterNumber}`;
    setPdfToastMsg(`Menarik gambar untuk ${chTitle}...`);

    try {
      let targetUrl = ch.slug || ch.driveUrl || ch.externalUrl || '';
      if (!targetUrl || targetUrl.startsWith('ch-')) {
        const cSlug = currentComic.slug || currentComic.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || '';
        targetUrl = `${cSlug}-chapter-${ch.chapterNumber}`;
      }

      const res = await fetch(`/api/komiktap/chapter?url=${encodeURIComponent(targetUrl)}`);
      const data = await res.json();
      if (data && data.pages && data.pages.length > 0) {
        updateChapter(currentComic.id, ch.id, { pages: data.pages, sourceType: 'images' });
        setPdfToastMsg(`Berhasil! ${data.pages.length} gambar tersimpan untuk ${chTitle}.`);
        setTimeout(() => setPdfToastMsg(null), 3500);
      } else {
        setPdfToastMsg(`Gagal: ${data?.error || 'Tidak ada gambar yang ditemukan.'}`);
        setTimeout(() => setPdfToastMsg(null), 4000);
      }
    } catch (err: any) {
      setPdfToastMsg(`Gagal: ${err.message || 'Koneksi bermasalah'}`);
      setTimeout(() => setPdfToastMsg(null), 4000);
    } finally {
      setFetchingChapterId(null);
    }
  };

  const handleBatchPullMissingPages = async () => {
    if (!currentComic) return;
    const missing = allCurrentChapters.filter(ch => !ch.pages || ch.pages.length === 0);
    if (missing.length === 0) {
      setPdfToastMsg('Semua chapter dalam komik ini sudah memiliki gambar lengkap!');
      setTimeout(() => setPdfToastMsg(null), 3000);
      return;
    }

    setIsBatchPullingPages(true);
    cancelBatchPullRef.current = false;
    let successCount = 0;
    let processedCount = 0;
    const collectedUpdates: Array<{ chapterId: string; pages: any[] }> = [];

    // Derive canonical comic slug for Komiktap
    let cSlug = '';
    if (currentComic.sourceUrl && currentComic.sourceUrl.includes('komiktap.info/manga/')) {
      cSlug = currentComic.sourceUrl.replace(/\/$/, '').split('/').pop() || '';
    }
    if (!cSlug) {
      cSlug = currentComic.slug || currentComic.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || '';
    }

    await runControlledConcurrency(missing, 3, async (ch) => {
      if (cancelBatchPullRef.current) return null;

      let targetUrl = ch.slug || ch.driveUrl || ch.externalUrl || '';
      if (!targetUrl || targetUrl.startsWith('ch-') || !targetUrl.includes('chapter')) {
        targetUrl = `${cSlug}-chapter-${ch.chapterNumber}`;
      }

      try {
        const data = await fetchKomiktapChapterPages(targetUrl);
        if (data && Array.isArray(data.pages) && data.pages.length > 0) {
          await ChapterRepository.saveChapterPages(ch.id, data.pages);
          collectedUpdates.push({ chapterId: ch.id, pages: data.pages });
          successCount++;
        }
      } catch (err) {
        console.warn('Batch pull error on chapter:', ch.title, err);
      } finally {
        processedCount++;
        setBatchPullProgress({
          current: processedCount,
          total: missing.length,
          success: successCount,
          currentName: ch.title || `Chapter ${ch.chapterNumber}`
        });
      }
      return null;
    });

    if (collectedUpdates.length > 0) {
      batchUpdateChapterPages(currentComic.id, collectedUpdates);
    }

    setIsBatchPullingPages(false);
    setBatchPullProgress(null);
    setPdfToastMsg(`Selesai! ${successCount} dari ${missing.length} chapter berhasil ditarik & disimpan ke Supabase.`);
    setTimeout(() => setPdfToastMsg(null), 4000);
  };

  const handleCancelBatchPull = () => {
    cancelBatchPullRef.current = true;
    setIsBatchPullingPages(false);
    setBatchPullProgress(null);
    setPdfToastMsg('Pengambilan gambar dibatalkan.');
    setTimeout(() => setPdfToastMsg(null), 3000);
  };

  const handleDownloadChapterPdf = async (ch: Chapter) => {
    if (!currentComic) return;
    setDownloadingChapterId(ch.id);
    setPdfToastMsg(`Menyiapkan Chapter ${ch.chapterNumber}...`);

    try {
      const filename = `${currentComic.title} - Ch ${ch.chapterNumber}`;
      if (ch.sourceType === 'drive') {
        const driveTarget = ch.driveEmbedUrl || ch.driveFileId || ch.driveUrl || '';
        await downloadDrivePdf(driveTarget, filename, (msg) => setPdfToastMsg(msg));
      } else if (ch.sourceType === 'pdf') {
        if (ch.pdfUrl?.startsWith('data:') || ch.pdfUrl?.startsWith('blob:')) {
          const a = document.createElement('a');
          a.href = ch.pdfUrl;
          a.download = `${filename}.pdf`;
          a.click();
          setPdfToastMsg('Unduhan selesai!');
        } else {
          await downloadDrivePdf(ch.pdfUrl || '', filename, (msg) => setPdfToastMsg(msg));
        }
      } else {
        const pagesToConvert = (ch.pages || []).map(p => typeof p === 'string' ? p : p.imageUrl);
        if (pagesToConvert.length === 0) {
          throw new Error('Tidak ada halaman gambar dalam chapter ini.');
        }
        await convertImagesToPdf(pagesToConvert, filename, (curr, tot, msg) => {
          setPdfToastMsg(`Mengonversi (${curr}/${tot}): ${msg}`);
        });
      }
    } catch (err: any) {
      alert('Gagal mengunduh PDF: ' + err.message);
    } finally {
      setDownloadingChapterId(null);
      setTimeout(() => setPdfToastMsg(null), 3500);
    }
  };

  return (
    <div className="space-y-4">
      {/* View Mode 1: Folderized Comic Explorer & Smart Search (Designed for scaling to 500+ comics) */}
      {viewMode === 'folders' ? (
        <div className="space-y-4 animate-in fade-in">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pb-2 border-b border-[#1c1c2a]">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Folder className="w-4 h-4 text-[#ff5b14]" />
                <span>Katalog Folder Komik & Manajemen Chapter</span>
              </h2>
              <p className="text-xs text-slate-400">Pilih folder komik untuk melihat, menambah, atau mengedit daftar chapter di dalamnya</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-[#14141f] border border-[#202030] text-xs font-mono text-slate-300">
                Total: <strong className="text-white">{comics.length}</strong> Komik
              </span>
            </div>
          </div>

          {/* Smart Search Bar & Filter Tabs */}
          <div className="p-4 bg-[#12121a] rounded-2xl border border-[#1f1f2e] space-y-3 shadow-md">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari dari 500+ judul komik, nama author/artist, atau genre..."
                value={comicSearchQuery}
                onChange={(e) => setComicSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#171724] border border-[#26263a] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14] transition-all"
              />
              {comicSearchQuery && (
                <button
                  onClick={() => setComicSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {[
                { id: 'all', label: `🌟 Semua (${comics.length})` },
                { id: 'admin_personal', label: `👑 Proyek Pribadi (${comics.filter(c => getComicProjectType(c, chapters[c.id] || []) === 'admin_personal').length})` },
                { id: 'scraped_ready', label: `⚡ Scraping Berhasil (${comics.filter(c => getComicProjectType(c, chapters[c.id] || []) === 'scraped_ready').length})` },
                { id: 'preview_gateway', label: `🌐 Gateway Preview (${comics.filter(c => getComicProjectType(c, chapters[c.id] || []) === 'preview_gateway').length})` },
                { id: 'has_chapters', label: `📚 Ada Chapter (${comics.filter(c => (chapters[c.id] || []).length > 0).length})` },
                { id: 'no_chapters', label: `⚠️ Kosong (${comics.filter(c => !(chapters[c.id] || []).length).length})` },
                { id: '18plus', label: `🔞 18+ VIP (${comics.filter(c => c.contentType === '18plus').length})` },
                { id: 'normal', label: `✨ Normal (${comics.filter(c => c.contentType !== '18plus').length})` },
                { id: 'manhwa', label: `🇰🇷 Manhwa (${comics.filter(c => c.comicType === 'manhwa' || c.type === 'manhwa').length})` },
                { id: 'manga', label: `🇯🇵 Manga (${comics.filter(c => c.comicType === 'manga' || c.type === 'manga').length})` },
                { id: 'doujin', label: `🌸 Doujin (${comics.filter(c => c.comicType === 'doujin' || c.type === 'doujin').length})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setComicCategoryFilter(tab.id as any)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    comicCategoryFilter === tab.id
                      ? 'bg-[#ff5b14] text-white shadow-md shadow-[#ff5b14]/20'
                      : 'bg-[#181826] text-slate-400 hover:text-slate-200 hover:bg-[#202032] border border-[#252538]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Folderized Comic Cards Grid */}
          {filteredComics.length === 0 ? (
            <div className="p-12 text-center bg-[#12121a] rounded-2xl border border-[#1f1f2e] space-y-3">
              <FolderOpen className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm text-slate-400 font-semibold">Tidak ditemukan komik yang cocok dengan pencarian atau filter Anda.</p>
              <button
                onClick={() => {
                  setComicSearchQuery('');
                  setComicCategoryFilter('all');
                }}
                className="px-4 py-1.5 bg-[#181826] text-slate-300 text-xs font-bold rounded-xl border border-[#28283a] hover:bg-[#202032]"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <>
              {/* Folder Multi-Select & Batch Toolbar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-[#161622] rounded-xl border border-[#222234]">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleToggleFolderSelectAll}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1c1c2c] hover:bg-[#25253a] text-slate-300 text-xs font-bold transition-all border border-[#2a2a40] cursor-pointer"
                  >
                    {isAllFoldersSelected ? <CheckSquare className="w-4 h-4 text-[#ff5b14]" /> : <Square className="w-4 h-4 text-slate-500" />}
                    <span>{isAllFoldersSelected ? 'Batal Pilih Semua' : 'Pilih Semua di Halaman'}</span>
                  </button>
                  {selectedFolderComicIds.length > 0 && (
                    <span className="text-xs text-[#ff7a3d] font-bold">
                      {selectedFolderComicIds.length} Folder Komik Terpilih
                    </span>
                  )}
                </div>

                {selectedFolderComicIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setFolderDeleteReason('');
                      setShowFolderDeleteModal(true);
                    }}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Batch Folder ({selectedFolderComicIds.length})</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {visibleFolderComics.map(comic => {
                  const isSelectedFolder = selectedFolderComicIds.includes(comic.id);
                  const chList = chapters[comic.id] || [];
                  const chCount = chList.length;
                  const is18 = comic.contentType === '18plus';
                  const projType = getComicProjectType(comic, chList);

                  return (
                    <div
                      key={comic.id}
                      className={`p-3.5 bg-[#12121c] hover:bg-[#151522] border rounded-2xl flex flex-col justify-between transition-all duration-200 shadow-md group ${
                        isSelectedFolder ? 'border-[#ff5b14] bg-[#ff5b14]/5' : 'border-[#1f1f2e] hover:border-[#3a3a52]'
                      }`}
                      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 220px' }}
                    >
                      <div>
                        <div className="flex gap-3 items-start mb-2.5">
                          <div className="relative w-16 h-22 rounded-xl overflow-hidden shrink-0 bg-[#0d0d14] border border-[#222234]">
                            <img
                              src={comic.coverImage}
                              alt={comic.title}
                              referrerPolicy="no-referrer"
                              loading="lazy"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = getProfessionalComicSkeletonUrl(comic.title, comic.comicType || comic.type);
                              }}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {/* Quick Select Checkbox overlay */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFolderSelectOne(comic.id);
                              }}
                              className="absolute top-1 left-1 p-1 rounded-md bg-black/70 hover:bg-black text-white cursor-pointer shadow-sm backdrop-blur-xs"
                              title={isSelectedFolder ? 'Batalkan pilihan' : 'Pilih folder ini'}
                            >
                              {isSelectedFolder ? (
                                <CheckSquare className="w-3.5 h-3.5 text-[#ff5b14]" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
                              )}
                            </button>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 mb-1 flex-wrap">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                                is18 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}>
                                {is18 ? '18+ VIP' : 'GRATIS'}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-[#181826] text-slate-400 border border-[#252538]">
                                {comic.comicType || comic.type || 'manga'}
                              </span>
                            </div>

                            <h4 className="font-bold text-xs text-white truncate group-hover:text-[#ff7a3d] transition-colors" title={comic.title}>
                              {comic.title}
                            </h4>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">
                              {comic.genres?.slice(0, 2).join(', ') || 'General'}
                            </p>
                          </div>
                        </div>

                        {/* Project Type & Chapter Status Pills */}
                        <div className="flex flex-col gap-1.5 mb-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                              projType === 'admin_personal' 
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' 
                                : projType === 'scraped_ready' 
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                                : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                            }`}>
                              {projType === 'admin_personal' && <Crown className="w-2.5 h-2.5 text-amber-400" />}
                              {projType === 'scraped_ready' && <Zap className="w-2.5 h-2.5 text-emerald-400" />}
                              {projType === 'preview_gateway' && <Globe className="w-2.5 h-2.5 text-sky-400" />}
                              <span>{getComicProjectTypeLabel(projType).shortLabel}</span>
                            </span>
                          </div>

                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold ${
                            chCount > 0 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' 
                              : 'bg-amber-500/10 text-amber-300 border border-amber-500/25'
                          }`}>
                            <Folder className="w-3.5 h-3.5" />
                            <span>{chCount > 0 ? `${chCount} Chapter Siap Baca` : '0 Chapter (Kosong)'}</span>
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1a1a28]">
                        <button
                          onClick={() => handleOpenManageForComic(comic.id)}
                          className="w-full py-1.5 bg-[#1a1a2a] hover:bg-[#222236] text-slate-200 hover:text-white text-xs font-bold rounded-xl border border-[#28283c] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <FolderOpen className="w-3.5 h-3.5 text-[#ff5b14]" />
                          <span>Kelola ({chCount})</span>
                        </button>

                        <button
                          onClick={() => handleOpenAddForComic(comic.id)}
                          className="w-full py-1.5 bg-[#ff5b14]/15 hover:bg-[#ff5b14]/25 text-[#ff7a3d] text-xs font-bold rounded-xl border border-[#ff5b14]/30 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Upload</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Folder Grid Pagination Bar */}
              {filteredComics.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-[#12121a] rounded-2xl border border-[#1f1f2e] shadow-sm text-xs mt-4">
                  <div className="text-slate-400 text-xs flex items-center gap-2 flex-wrap">
                    <span>Menampilkan <strong className="text-white">{folderStartIndex + 1}</strong> - <strong className="text-white">{folderEndIndex}</strong> dari <strong className="text-white">{filteredComics.length}</strong> folder komik</span>
                    {renderedFoldersCount < paginatedFolderComics.length && (
                      <span className="text-[10px] bg-[#ff5b14]/20 text-[#ff7a3d] px-2 py-0.5 rounded-full font-bold animate-pulse">
                        Streaming {renderedFoldersCount}/{paginatedFolderComics.length} folder...
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Rows per page selector */}
                    <div className="flex items-center gap-1.5 mr-2">
                      <span className="text-slate-500 text-[11px]">Per halaman:</span>
                      <select
                        value={foldersPerPage}
                        onChange={(e) => setFoldersPerPage(Number(e.target.value))}
                        className="bg-[#181826] border border-[#26263a] rounded-lg px-2 py-1 text-slate-300 text-xs focus:outline-none focus:border-[#ff5b14]"
                      >
                        <option value={8}>8</option>
                        <option value={12}>12</option>
                        <option value={24}>24</option>
                        <option value={48}>48</option>
                        <option value={100}>100</option>
                        <option value={999999}>Tampilkan Semua (All)</option>
                      </select>
                    </div>

                    {/* Pagination Buttons */}
                    {totalFolderPages > 1 && (
                      <>
                        <button
                          onClick={() => setFolderPage(1)}
                          disabled={validFolderPage === 1}
                          className="p-1.5 rounded-lg bg-[#181826] border border-[#252538] text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          title="Halaman Pertama"
                        >
                          <ChevronsLeft className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setFolderPage(prev => Math.max(1, prev - 1))}
                          disabled={validFolderPage === 1}
                          className="p-1.5 rounded-lg bg-[#181826] border border-[#252538] text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          title="Halaman Sebelumnya"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>

                        {/* Numbered Page Buttons */}
                        <div className="flex items-center gap-1">
                          {getPageNumbers(validFolderPage, totalFolderPages).map((p, idx) => (
                            typeof p === 'number' ? (
                              <button
                                key={idx}
                                onClick={() => setFolderPage(p)}
                                className={`min-w-[28px] h-7 px-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                                  validFolderPage === p
                                    ? 'bg-[#ff5b14] text-white shadow-md shadow-[#ff5b14]/20'
                                    : 'bg-[#181826] border border-[#252538] text-slate-400 hover:text-slate-200 hover:bg-[#202032]'
                                }`}
                              >
                                {p}
                              </button>
                            ) : (
                              <span key={idx} className="px-1 text-slate-500 font-bold select-none">...</span>
                            )
                          ))}
                        </div>

                        <button
                          onClick={() => setFolderPage(prev => Math.min(totalFolderPages, prev + 1))}
                          disabled={validFolderPage === totalFolderPages}
                          className="p-1.5 rounded-lg bg-[#181826] border border-[#252538] text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          title="Halaman Berikutnya"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setFolderPage(totalFolderPages)}
                          disabled={validFolderPage === totalFolderPages}
                          className="p-1.5 rounded-lg bg-[#181826] border border-[#252538] text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          title="Halaman Terakhir"
                        >
                          <ChevronsRight className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* View Mode 2: Detailed Chapter Manager for Selected Comic */
        <div className="space-y-4 animate-in fade-in">
          {/* Top Breadcrumb Header Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pb-2 border-b border-[#1c1c2a]">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode('folders')}
                className="px-3 py-1.5 bg-[#161622] hover:bg-[#1e1e2e] text-slate-300 hover:text-white rounded-xl border border-[#252538] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow"
              >
                <ArrowLeft className="w-4 h-4 text-[#ff5b14]" />
                <span>Semua Folder Komik</span>
              </button>

              <div className="hidden sm:block h-5 w-px bg-[#242436]" />

              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2 truncate max-w-md">
                  <span>📁</span>
                  <span className="truncate">{currentComic?.title || 'Manajemen Chapter'}</span>
                </h2>
                <p className="text-[11px] text-slate-400">Total {allCurrentChapters.length} chapter terdaftar di database</p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <button
                onClick={handleOpenAdd}
                className="px-3.5 py-2 bg-[#ff5b14] hover:bg-[#e04e0e] text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Upload Chapter Baru</span>
              </button>
            </div>
          </div>

          {/* Comic Summary Header Card with Quick Switcher */}
          {currentComic && (
            <div className="p-4 bg-[#12121c] rounded-2xl border border-[#1f1f2e] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md">
              <div className="flex items-center gap-3.5 min-w-0">
                <img
                  src={currentComic.coverImage}
                  alt={currentComic.title}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = getProfessionalComicSkeletonUrl(currentComic.title, currentComic.comicType || currentComic.type);
                  }}
                  className="w-12 h-16 rounded-xl object-cover border border-[#26263a] shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      currentComic.contentType === '18plus' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {currentComic.contentType === '18plus' ? '18+ VIP' : 'GRATIS'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#181826] text-slate-300 border border-[#252538]">
                      {currentComic.comicType || currentComic.type || 'manga'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#181826] text-slate-400">
                      {allCurrentChapters.length} Chapter
                    </span>
                  </div>
                  <h3 className="font-extrabold text-sm text-white truncate">{currentComic.title}</h3>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    Penulis: <span className="text-slate-300">{currentComic.storyWriter || 'Official'}</span> • Genre: {currentComic.genres?.slice(0, 3).join(', ')}
                  </p>
                </div>
              </div>

              {/* Quick Comic Dropdown Switcher */}
              <div className="w-full md:w-auto flex items-center gap-2">
                <label className="text-xs font-bold text-slate-400 whitespace-nowrap">Ganti Komik:</label>
                <select
                  value={selectedComicId}
                  onChange={(e) => {
                    setSelectedComicId(e.target.value);
                    setSelectedChapterIds([]);
                    setChapterSearchQuery('');
                  }}
                  className="w-full md:w-64 bg-[#181824] border border-[#28283a] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#ff5b14]"
                >
                  {comics.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({(chapters[c.id] || []).length} Ch)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Chapter Quick Search Bar */}
          <div className="p-3 bg-[#12121a] rounded-xl border border-[#1f1f2e] flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari chapter berdasarkan nomor (#10) atau judul..."
                value={chapterSearchQuery}
                onChange={(e) => setChapterSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-[#171724] border border-[#26263a] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14]"
              />
            </div>

            <div className="text-xs text-slate-400 font-mono shrink-0">
              Menampilkan: <strong className="text-white">{currentChapters.length}</strong> / {allCurrentChapters.length}
            </div>
          </div>

          {/* Scrape Health Matrix & Image Coverage Repair Center */}
          {(() => {
            const total = allCurrentChapters.length;
            const missingCount = allCurrentChapters.filter(ch => !ch.pages || ch.pages.length === 0).length;
            const withImagesCount = total - missingCount;
            const coveragePercent = total > 0 ? Math.round((withImagesCount / total) * 100) : 0;
            const isFullyCovered = total > 0 && missingCount === 0;

            return (
              <div className="p-4 bg-gradient-to-r from-[#141420] via-[#161626] to-[#12121c] border border-[#26263c] rounded-2xl shadow-lg space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      isFullyCovered 
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : coveragePercent > 0 
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' 
                        : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                    }`}>
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>Scrape Health Matrix & Image Coverage</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${
                          isFullyCovered 
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}>
                          {coveragePercent}% Coverage
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {isBatchPullingPages && batchPullProgress
                          ? `Workers Aktif (Concurrency 3): ${batchPullProgress.currentName} (${batchPullProgress.current}/${batchPullProgress.total}) — Sukses: ${batchPullProgress.success}`
                          : isFullyCovered
                          ? 'Semua chapter dalam komik ini memiliki gambar lengkap dan tersimpan aman di Supabase.'
                          : `Terdapat ${missingCount} chapter yang belum memiliki gambar. Jalankan Repair Mode untuk mengisi gambar secara otomatis.`}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                    {isBatchPullingPages ? (
                      <button
                        onClick={handleCancelBatchPull}
                        className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow"
                      >
                        Batalkan Repair
                      </button>
                    ) : (
                      <button
                        onClick={handleBatchPullMissingPages}
                        disabled={missingCount === 0}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow cursor-pointer ${
                          missingCount === 0
                            ? 'bg-[#1e1e2c] text-slate-500 cursor-not-allowed border border-[#2a2a3c]'
                            : 'bg-gradient-to-r from-rose-600 to-[#ff5b14] hover:from-rose-500 hover:to-[#ff6d2e] text-white shadow-rose-900/20'
                        }`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Repair Missing Images ({missingCount})</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar during batch pull */}
                {isBatchPullingPages && batchPullProgress && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                      <span>Proses: {batchPullProgress.current} / {batchPullProgress.total}</span>
                      <span className="text-emerald-400 font-bold">{batchPullProgress.success} Chapter Berhasil Masuk</span>
                    </div>
                    <div className="w-full bg-[#1e1e2c] h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-[#ff5b14] to-emerald-400 h-full transition-all duration-300"
                        style={{ width: `${Math.round((batchPullProgress.current / batchPullProgress.total) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Scrape Health Matrix Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-[#181826] border border-[#242436]">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Chapters</div>
                    <div className="text-sm font-extrabold text-white font-mono mt-0.5">{total}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#181826] border border-[#242436]">
                    <div className="text-[10px] text-emerald-400/80 uppercase font-semibold">Images &gt; 0 (Ready)</div>
                    <div className="text-sm font-extrabold text-emerald-400 font-mono mt-0.5">{withImagesCount}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#181826] border border-[#242436]">
                    <div className="text-[10px] text-rose-400/80 uppercase font-semibold">Images = 0 (Missing)</div>
                    <div className="text-sm font-extrabold text-rose-400 font-mono mt-0.5">{missingCount}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#181826] border border-[#242436]">
                    <div className="text-[10px] text-amber-400/80 uppercase font-semibold">Coverage Status</div>
                    <div className="text-sm font-extrabold text-amber-400 font-mono mt-0.5">{coveragePercent}%</div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Global Batch Action Toolbar for Chapters (Always Visible in Both Folder & Detail View when Selected) */}
      {selectedChapterIds.length > 0 && (
        <div className="p-3 bg-[#171724] border border-[#ff5b14]/50 rounded-xl flex items-center justify-between gap-3 animate-in fade-in shadow-xl sticky top-2 z-30">
          <div className="flex items-center gap-2 text-xs text-white">
            <span className="px-2.5 py-1 rounded-lg bg-[#ff5b14] font-extrabold text-white shadow-xs">
              {selectedChapterIds.length} Chapter Terpilih
            </span>
            <span className="text-slate-300 hidden sm:inline font-medium">
              di komik <strong className="text-white">"{currentComic?.title}"</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRequestBatchDelete}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md active:scale-95"
              title="Hapus bab-bab terpilih sekaligus"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Batch ({selectedChapterIds.length})</span>
            </button>

            <button
              onClick={() => setSelectedChapterIds([])}
              className="px-2.5 py-1.5 text-slate-400 hover:text-white bg-[#111118] hover:bg-[#1a1a24] rounded-lg text-xs cursor-pointer transition-colors"
              title="Batalkan Pilihan"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Chapters Table */}
      <div className="bg-[#12121a] rounded-xl border border-[#1f1f2e] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#161622] text-slate-400 font-semibold border-b border-[#222234]">
              <tr>
                <th className="p-3 w-10 text-center">
                  <button 
                    onClick={handleToggleSelectAll}
                    className="text-slate-400 hover:text-white cursor-pointer"
                    title={isAllSelected ? 'Batalkan Pilih Semua' : 'Pilih Semua'}
                  >
                    {isAllSelected ? <CheckSquare className="w-4 h-4 text-[#ff5b14]" /> : <Square className="w-4 h-4 text-slate-400" />}
                  </button>
                </th>
                <th className="p-3">Chapter</th>
                <th className="p-3">Judul Chapter</th>
                <th className="p-3">Tipe Sumber</th>
                <th className="p-3">Halaman / Drive Info</th>
                <th className="p-3">Tanggal Unggah</th>
                <th className="p-3 text-right">
                  {selectedChapterIds.length > 0 ? (
                    <button
                      onClick={handleRequestBatchDelete}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[11px] font-bold inline-flex items-center gap-1 shadow cursor-pointer transition-all active:scale-95"
                      title="Hapus bab terpilih"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Hapus ({selectedChapterIds.length})</span>
                    </button>
                  ) : (
                    <span>Aksi</span>
                  )}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b1b28]">
              {visibleChapters.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Belum ada chapter untuk komik ini. Silakan klik "Upload Chapter Baru".
                  </td>
                </tr>
              ) : (
                visibleChapters.map((ch, idx) => {
                  const isSelected = selectedChapterIds.includes(ch.id);
                  return (
                    <tr 
                      key={`${ch.id || ch.chapterNumber}-${idx}`} 
                      className={`hover:bg-[#161624] transition-colors ${isSelected ? 'bg-[#ff5b14]/5' : ''}`}
                      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 52px' }}
                    >
                      <td className="p-3 text-center">
                        <button 
                          onClick={() => handleToggleSelectOne(ch.id)}
                          className="cursor-pointer text-slate-400 hover:text-white"
                        >
                          {isSelected ? <CheckSquare className="w-4 h-4 text-[#ff5b14]" /> : <Square className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="p-3 font-mono font-bold text-white">
                        #{ch.chapterNumber}
                      </td>
                      <td className="p-3 font-semibold text-slate-200">
                        {ch.title}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          ch.sourceType === 'drive' 
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                            : ch.sourceType === 'pdf'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : ch.sourceType === 'external'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {ch.sourceType === 'drive' && <HardDrive className="w-3 h-3" />}
                          {ch.sourceType === 'pdf' && <FileText className="w-3 h-3" />}
                          {ch.sourceType === 'external' && <Globe className="w-3 h-3" />}
                          {ch.sourceType === 'images' && <ImageIcon className="w-3 h-3" />}
                          <span className="uppercase">{ch.sourceType === 'external' ? (ch.externalPlatform || 'EXTERNAL') : ch.sourceType}</span>
                        </span>
                      </td>
                      <td className="p-3 text-slate-400 font-mono text-[11px]">
                        {ch.sourceType === 'drive' ? (
                          <span className="truncate block max-w-xs text-blue-400/80">
                            {ch.driveNotes || (ch.driveAccountId ? `Akun: ${ch.driveAccountId}` : 'Google Drive Terproteksi')}
                          </span>
                        ) : ch.sourceType === 'pdf' ? (
                          <span>PDF Dokumen</span>
                        ) : ch.sourceType === 'external' ? (
                          <span className="truncate block max-w-xs text-purple-300">
                            {ch.externalUrl ? ch.externalUrl : `Gateway: ${ch.externalPlatform || 'Penyedia Eksternal'}`}
                          </span>
                        ) : (
                          <span>{ch.pages?.length || ch.pageCount || 0} Gambar</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-500 whitespace-nowrap">
                        {new Date(ch.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleDownloadChapterPdf(ch)}
                          disabled={downloadingChapterId === ch.id}
                          className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                          title="Download / Convert ke PDF"
                        >
                          {downloadingChapterId === ch.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {(!ch.pages || ch.pages.length === 0) && (
                          <button
                            onClick={() => handleFetchChapterPages(ch)}
                            disabled={fetchingChapterId === ch.id}
                            className="p-1.5 text-amber-400 hover:text-white hover:bg-amber-500/20 rounded-lg transition-colors cursor-pointer"
                            title="Tarik Lembar Gambar Chapter"
                          >
                            {fetchingChapterId === ch.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handlePreviewInReader(ch.id)}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Uji Baca di Reader"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(ch)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                          title="Edit Chapter"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleRequestSingleDelete(ch)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Chapter"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Chapter Table Pagination Bar */}
        {currentChapters.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-[#161624] border-t border-[#202032] text-xs">
            <div className="text-slate-400 text-xs flex items-center gap-2 flex-wrap">
              <span>Menampilkan <strong className="text-white">{chapterStartIndex + 1}</strong> - <strong className="text-white">{chapterEndIndex}</strong> dari <strong className="text-white">{currentChapters.length}</strong> chapter</span>
              {renderedChaptersCount < paginatedChapters.length && (
                <span className="text-[10px] bg-[#ff5b14]/20 text-[#ff7a3d] px-2 py-0.5 rounded-full font-bold animate-pulse">
                  Streaming {renderedChaptersCount}/{paginatedChapters.length} baris...
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Rows per page selector */}
              <div className="flex items-center gap-1.5 mr-2">
                <span className="text-slate-500 text-[11px]">Per halaman:</span>
                <select
                  value={chaptersPerPage}
                  onChange={(e) => setChaptersPerPage(Number(e.target.value))}
                  className="bg-[#181826] border border-[#26263a] rounded-lg px-2 py-1 text-slate-300 text-xs focus:outline-none focus:border-[#ff5b14]"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={250}>250</option>
                  <option value={500}>500</option>
                  <option value={999999}>Tampilkan Semua (All)</option>
                </select>
              </div>

              {/* Pagination Buttons */}
              {totalChapterPages > 1 && (
                <>
                  <button
                    onClick={() => setChapterPage(1)}
                    disabled={validChapterPage === 1}
                    className="p-1.5 rounded-lg bg-[#181826] border border-[#252538] text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title="Halaman Pertama"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setChapterPage(prev => Math.max(1, prev - 1))}
                    disabled={validChapterPage === 1}
                    className="p-1.5 rounded-lg bg-[#181826] border border-[#252538] text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title="Halaman Sebelumnya"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  {/* Numbered Page Buttons */}
                  <div className="flex items-center gap-1">
                    {getPageNumbers(validChapterPage, totalChapterPages).map((p, idx) => (
                      typeof p === 'number' ? (
                        <button
                          key={idx}
                          onClick={() => setChapterPage(p)}
                          className={`min-w-[28px] h-7 px-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                            validChapterPage === p
                              ? 'bg-[#ff5b14] text-white shadow-md shadow-[#ff5b14]/20'
                              : 'bg-[#181826] border border-[#252538] text-slate-400 hover:text-slate-200 hover:bg-[#202032]'
                          }`}
                        >
                          {p}
                        </button>
                      ) : (
                        <span key={idx} className="px-1 text-slate-500 font-bold select-none">...</span>
                      )
                    ))}
                  </div>

                  <button
                    onClick={() => setChapterPage(prev => Math.min(totalChapterPages, prev + 1))}
                    disabled={validChapterPage === totalChapterPages}
                    className="p-1.5 rounded-lg bg-[#181826] border border-[#252538] text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title="Halaman Berikutnya"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setChapterPage(totalChapterPages)}
                    disabled={validChapterPage === totalChapterPages}
                    className="p-1.5 rounded-lg bg-[#181826] border border-[#252538] text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title="Halaman Terakhir"
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* PDF Toast Notification Banner */}
      {pdfToastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 bg-[#141420] border border-[#ff5b14]/50 text-white rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Loader2 className="w-4 h-4 text-[#ff5b14] animate-spin shrink-0" />
          <span>{pdfToastMsg}</span>
        </div>
      )}

      {/* Upload / Edit Chapter Modal */}
      <AdminModalPortal isOpen={showAddModal} onClose={() => setShowAddModal(false)} maxWidth="max-w-xl">
        <div className="w-full bg-[#12121a] border border-[#262638] rounded-2xl p-5 text-slate-200 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-[#202030]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#ff5b14]/20 text-[#ff5b14] flex items-center justify-center font-bold">
                {editingChapter ? <Edit className="w-4 h-4" /> : <UploadCloud className="w-4 h-4" />}
              </div>
              <h3 className="font-extrabold text-sm text-white">
                {editingChapter ? `Edit Chapter #${chapterNumber}` : `Upload Chapter Baru — ${currentComic?.title}`}
              </h3>
            </div>
            <button
              onClick={() => setShowAddModal(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Basic Chapter Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Nomor Chapter</label>
                  <input
                    type="number"
                    value={chapterNumber}
                    onChange={(e) => setChapterNumber(Number(e.target.value))}
                    className="w-full p-2 bg-[#181824] border border-[#27273a] rounded-xl text-white font-bold focus:outline-none focus:border-[#ff5b14]"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-slate-400 mb-1 font-semibold">Judul Chapter</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Pertemuan Rahasia"
                    className="w-full p-2 bg-[#181824] border border-[#27273a] rounded-xl text-white focus:outline-none focus:border-[#ff5b14]"
                    required
                  />
                </div>
              </div>

              {/* Source Type Selector (The 4 Methods) */}
              <div>
                <label className="block text-slate-300 mb-1.5 font-bold">Pilih Format & Metode Chapter:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Method 1: Images */}
                  <button
                    type="button"
                    onClick={() => setSourceType('images')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      sourceType === 'images' 
                        ? 'bg-[#ff5b14]/15 border-[#ff5b14] text-white ring-1 ring-[#ff5b14]' 
                        : 'bg-[#161622] border-[#252536] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-[#ff7a3d]">
                      <ImageIcon className="w-4 h-4 shrink-0" />
                      <span>1. File Gambar</span>
                    </div>
                    <p className="text-[10px] text-slate-400">JPG, PNG, WebP</p>
                  </button>

                  {/* Method 2: PDF */}
                  <button
                    type="button"
                    onClick={() => setSourceType('pdf')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      sourceType === 'pdf' 
                        ? 'bg-red-500/15 border-red-500 text-white ring-1 ring-red-500' 
                        : 'bg-[#161622] border-[#252536] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-red-400">
                      <FileText className="w-4 h-4 shrink-0" />
                      <span>2. File PDF</span>
                    </div>
                    <p className="text-[10px] text-slate-400">Dokumen Lengkap</p>
                  </button>

                  {/* Method 3: Google Drive */}
                  <button
                    type="button"
                    onClick={() => setSourceType('drive')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      sourceType === 'drive' 
                        ? 'bg-blue-500/15 border-blue-500 text-white ring-1 ring-blue-500' 
                        : 'bg-[#161622] border-[#252536] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-blue-400">
                      <HardDrive className="w-4 h-4 shrink-0" />
                      <span>3. Google Drive</span>
                    </div>
                    <p className="text-[10px] text-slate-400">Link Share Reader</p>
                  </button>

                  {/* Method 4: External Gateway */}
                  <button
                    type="button"
                    onClick={() => setSourceType('external')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      sourceType === 'external' 
                        ? 'bg-purple-500/20 border-purple-500 text-white ring-1 ring-purple-500' 
                        : 'bg-[#161622] border-[#252536] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-purple-400">
                      <Globe className="w-4 h-4 shrink-0" />
                      <span>4. Link Eksternal</span>
                    </div>
                    <p className="text-[10px] text-slate-400">NHentai, MangaDex, dll</p>
                  </button>
                </div>
              </div>

              {/* METHOD 1 CONFIGURATION: IMAGES */}
              {sourceType === 'images' && (
                <div className="p-3.5 bg-[#161622] rounded-xl border border-[#242436] space-y-3">
                  <div className="flex items-center gap-2 border-b border-[#222232] pb-2">
                    <button
                      type="button"
                      onClick={() => setImageUploadMode('files')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        imageUploadMode === 'files' ? 'bg-[#ff5b14] text-white' : 'text-slate-400'
                      }`}
                    >
                      Upload File Lokal (JPG/PNG)
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageUploadMode('urls')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        imageUploadMode === 'urls' ? 'bg-[#ff5b14] text-white' : 'text-slate-400'
                      }`}
                    >
                      URL Gambar Eksternal
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageUploadMode('svg')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        imageUploadMode === 'svg' ? 'bg-[#ff5b14] text-white' : 'text-slate-400'
                      }`}
                    >
                      Panel Komik Otomatis
                    </button>
                  </div>

                  {imageUploadMode === 'files' && (
                    <div className="space-y-2">
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-[#333348] hover:border-[#ff5b14] rounded-xl p-4 text-center cursor-pointer bg-[#101018] transition-colors"
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageFilesChange}
                          className="hidden"
                        />
                        <UploadCloud className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                        <p className="font-semibold text-slate-300">Klik untuk memilih file gambar (JPG/PNG/WebP)</p>
                        <p className="text-[10px] text-slate-500">Bisa memilih beberapa file sekaligus</p>
                      </div>

                      {customImageFiles.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-emerald-400 font-bold">{customImageFiles.length} File Gambar Dipilih:</span>
                            <button
                              type="button"
                              onClick={() => setCustomImageFiles([])}
                              className="text-red-400 hover:underline"
                            >
                              Reset
                            </button>
                          </div>
                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-28 overflow-y-auto p-1 bg-[#101018] rounded-lg">
                            {customImageFiles.map((img, idx) => (
                              <div key={idx} className="relative aspect-[3/4] rounded-md overflow-hidden border border-[#2b2b3b]">
                                <img src={img} alt={`Hal ${idx + 1}`} className="w-full h-full object-cover" />
                                <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] text-center text-white">
                                  #{idx + 1}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {imageUploadMode === 'urls' && (
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Tautan URL Gambar (Satu URL per baris)</label>
                      <textarea
                        value={imageUrlsText}
                        onChange={(e) => setImageUrlsText(e.target.value)}
                        placeholder="https://example.com/page-1.jpg&#10;https://example.com/page-2.jpg"
                        rows={3}
                        className="w-full p-2 bg-[#101018] border border-[#27273a] rounded-xl text-white font-mono text-[11px]"
                      />
                    </div>
                  )}

                  {imageUploadMode === 'svg' && (
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Jumlah Panel Komik High-Res (Auto-Render):</label>
                      <input
                        type="number"
                        min={4}
                        max={30}
                        value={pageCount}
                        onChange={(e) => setPageCount(Number(e.target.value))}
                        className="w-full p-2 bg-[#101018] border border-[#27273a] rounded-xl text-white font-bold"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        Sistem membuat cerita visual berurutan dengan dialog dan sound effect.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* METHOD 2 CONFIGURATION: PDF */}
              {sourceType === 'pdf' && (
                <div className="p-3.5 bg-[#161622] rounded-xl border border-red-500/30 space-y-3">
                  <div className="flex items-center gap-2 border-b border-[#222232] pb-2">
                    <button
                      type="button"
                      onClick={() => setPdfMode('file')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        pdfMode === 'file' ? 'bg-red-500 text-white' : 'text-slate-400'
                      }`}
                    >
                      Upload File PDF Lokal
                    </button>
                    <button
                      type="button"
                      onClick={() => setPdfMode('url')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        pdfMode === 'url' ? 'bg-red-500 text-white' : 'text-slate-400'
                      }`}
                    >
                      URL Dokumen PDF Web
                    </button>
                  </div>

                  {pdfMode === 'file' ? (
                    <div>
                      <div 
                        onClick={() => pdfInputRef.current?.click()}
                        className="border-2 border-dashed border-red-500/40 hover:border-red-500 rounded-xl p-4 text-center cursor-pointer bg-[#101018] transition-colors"
                      >
                        <input
                          ref={pdfInputRef}
                          type="file"
                          accept=".pdf,application/pdf"
                          onChange={handlePdfFileChange}
                          className="hidden"
                        />
                        <FileText className="w-6 h-6 text-red-400 mx-auto mb-1" />
                        <p className="font-semibold text-slate-300">
                          {pdfFileName ? `File Terpilih: ${pdfFileName}` : 'Klik untuk memilih file PDF komik'}
                        </p>
                        <p className="text-[10px] text-slate-500">Mendukung file PDF single / multi-page</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Tautan Langsung PDF</label>
                      <input
                        type="url"
                        value={pdfWebUrl}
                        onChange={(e) => setPdfWebUrl(e.target.value)}
                        placeholder="https://example.com/comic-ch1.pdf"
                        className="w-full p-2 bg-[#101018] border border-[#27273a] rounded-xl text-white text-xs font-mono"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* METHOD 3 CONFIGURATION: GOOGLE DRIVE */}
              {sourceType === 'drive' && (
                <div className="p-3.5 bg-[#161622] rounded-xl border border-blue-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                      <HardDrive className="w-4 h-4" />
                      <span>Integrasi Google Drive Reader Multi-Akun</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">
                      Pilih Akun Google Drive Penampung:
                    </label>
                    <select
                      value={driveAccountId}
                      onChange={(e) => setDriveAccountId(e.target.value)}
                      className="w-full p-2 bg-[#101018] border border-[#27273a] rounded-xl text-white text-xs focus:border-blue-500"
                    >
                      {driveAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">
                      Tautan Berbagi / Share Link Google Drive:
                    </label>
                    <input
                      type="url"
                      value={driveUrl}
                      onChange={(e) => setDriveUrl(e.target.value)}
                      placeholder="https://drive.google.com/file/d/1a2b3c4d5e/view?usp=sharing"
                      className="w-full p-2 bg-[#101018] border border-[#27273a] rounded-xl text-white text-xs font-mono focus:border-blue-500"
                      required={sourceType === 'drive'}
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Sistem akan otomatis mengonversi tautan menjadi mode preview baca langsung (<code className="text-blue-300">/preview</code>).
                    </p>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">
                      Catatan Drive / Keterangan Chapter (Opsional):
                    </label>
                    <input
                      type="text"
                      value={driveNotes}
                      onChange={(e) => setDriveNotes(e.target.value)}
                      placeholder="Contoh: PDF Chapter HD 1080p, sudah di-cek lancar"
                      className="w-full p-2 bg-[#101018] border border-[#27273a] rounded-xl text-white text-xs"
                    />
                  </div>

                  {driveUrl && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setDrivePreviewTest(prev => !prev)}
                        className="px-3 py-1.5 bg-blue-500/20 text-blue-300 hover:text-white border border-blue-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{drivePreviewTest ? 'Tutup Preview' : 'Uji Tampilan Preview Drive'}</span>
                      </button>

                      {drivePreviewTest && (
                        <div className="mt-2 rounded-xl overflow-hidden border border-[#2e2e42] h-48 bg-black">
                          <iframe
                            src={formatGoogleDriveEmbedUrl(driveUrl)}
                            title="Drive Preview"
                            className="w-full h-full border-0"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* METHOD 4 CONFIGURATION: EXTERNAL LINK GATEWAY */}
              {sourceType === 'external' && (
                <div className="p-3.5 bg-[#161622] rounded-xl border border-purple-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                      <Globe className="w-4 h-4" />
                      <span>Where to Read / Gateway Link Eksternal (NHentai, MangaDex, dll)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 mb-1 font-semibold text-xs">
                        Platform / Sumber Penyedia:
                      </label>
                      <select
                        value={externalPlatform}
                        onChange={(e) => setExternalPlatform(e.target.value)}
                        className="w-full p-2 bg-[#101018] border border-[#27273a] rounded-xl text-white text-xs focus:border-purple-500"
                      >
                        <option value="NHentai">NHentai (nhentai.net)</option>
                        <option value="DoujinDesu">DoujinDesu (doujindesu.tv)</option>
                        <option value="MangaDex">MangaDex (mangadex.org)</option>
                        <option value="MangaPlus">MangaPlus Shueisha</option>
                        <option value="Bato.to">Bato.to</option>
                        <option value="Komikindo">Komikindo</option>
                        <option value="Crunchyroll">Crunchyroll</option>
                        <option value="Webtoon">LINE Webtoon</option>
                        <option value="Lainnya">Lainnya / Custom</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold text-xs">
                        Keterangan Bahasa / Badge:
                      </label>
                      <input
                        type="text"
                        value={externalNote}
                        onChange={(e) => setExternalNote(e.target.value)}
                        placeholder="Contoh: Bahasa Indonesia, Raw Official, Warna"
                        className="w-full p-2 bg-[#101018] border border-[#27273a] rounded-xl text-white text-xs focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold text-xs">
                      Tautan URL Chapter Eksternal:
                    </label>
                    <input
                      type="url"
                      value={externalUrl}
                      onChange={(e) => setExternalUrl(e.target.value)}
                      placeholder="https://nhentai.net/g/123456/1/ atau link chapter tujuan"
                      className="w-full p-2 bg-[#101018] border border-[#27273a] rounded-xl text-white text-xs font-mono focus:border-purple-500"
                      required={sourceType === 'external'}
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Pengunjung yang mengklik chapter ini akan diarahkan melalui pop-up modal gateway resmi sebelum dialihkan ke platform penyedia.
                    </p>
                  </div>

                  {externalUrl && (
                    <div className="pt-1 flex items-center gap-2">
                      <a
                        href={externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-purple-500/20 text-purple-300 hover:text-white border border-purple-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Uji Buka Tautan Eksternal</span>
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-3 border-t border-[#1f1f2e]">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#ff5b14] hover:bg-[#e04e0e] text-white font-bold rounded-xl shadow transition-colors"
                >
                  {editingChapter ? 'Simpan Perubahan Chapter' : 'Publikasikan Chapter'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-[#1a1a24] hover:bg-[#222232] text-slate-300 rounded-xl"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
      </AdminModalPortal>

      {/* Chapter Custom Delete Confirmation Modal with Audit Reason (ISO/IEC 27001) */}
      <AdminModalPortal isOpen={showDeleteConfirmModal} onClose={() => setShowDeleteConfirmModal(false)} maxWidth="max-w-md">
        <div className="w-full bg-[#12121a] border border-red-500/30 rounded-2xl p-5 text-slate-200 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-[#202030]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white">Konfirmasi Hapus Chapter (Audit Trail)</h3>
                <p className="text-[10px] text-slate-400">Pencatatan Alasan &amp; Verifikasi Super Admin</p>
              </div>
            </div>
            <button 
              onClick={() => setShowDeleteConfirmModal(false)} 
              className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/25 text-xs text-red-200 space-y-1.5">
            <p className="font-bold flex items-center gap-1.5 text-red-400">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {chaptersToDelete.length === 1 
                ? `Hapus Chapter #${chaptersToDelete[0]?.chapterNumber}: "${chaptersToDelete[0]?.title}"` 
                : `Hapus Massal ${chaptersToDelete.length} Chapter Terpilih`}
            </p>
            <div className="max-h-24 overflow-y-auto space-y-0.5 text-[11px] text-red-200/90 pl-1 font-mono">
              {chaptersToDelete.map((ch, idx) => (
                <p key={`${ch.id || ch.chapterNumber}-${idx}`} className="truncate">• Ch #{ch.chapterNumber} — {ch.title}</p>
              ))}
            </div>
            <p className="text-[10px] text-red-300/80 pt-1">
              ⚠️ Halaman gambar atau embed drive terkait chapter ini akan dihapus permanen dari basis data.
            </p>
          </div>

          <form onSubmit={handleConfirmDeleteChapters} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">
                Alasan Penghapusan (Masuk ke Log Aktivitas):
              </label>
              <input
                type="text"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Contoh: Perbaikan halaman rusak / update versi chapter..."
                className="w-full p-2 bg-[#181824] border border-[#27273a] rounded-xl text-white text-xs focus:outline-none focus:border-[#ff5b14]"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#1f1f2e]">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white bg-[#181824] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Konfirmasi Hapus ({chaptersToDelete.length})</span>
              </button>
            </div>
          </form>
        </div>
      </AdminModalPortal>
      {/* Folder Batch Delete Confirmation Modal */}
      <AdminModalPortal isOpen={showFolderDeleteModal} onClose={() => setShowFolderDeleteModal(false)} maxWidth="max-w-md">
        <div className="w-full bg-[#12121a] border border-red-500/30 rounded-2xl p-5 text-slate-200 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-[#202030]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white">Konfirmasi Hapus Batch Folder Komik</h3>
                <p className="text-[10px] text-slate-400">Hapus Folder Komik Beserta Seluruh Chapternya</p>
              </div>
            </div>
            <button 
              onClick={() => setShowFolderDeleteModal(false)} 
              className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/25 text-xs text-red-200 space-y-1.5">
            <p className="font-bold flex items-center gap-1.5 text-red-400">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Hapus Massal {selectedFolderComicIds.length} Folder Komik Terpilih</span>
            </p>
            <div className="max-h-28 overflow-y-auto space-y-0.5 text-[11px] text-red-200/90 pl-1 font-mono">
              {comics.filter(c => selectedFolderComicIds.includes(c.id)).map((c, idx) => (
                <p key={c.id} className="truncate">• {c.title} ({(chapters[c.id] || []).length} Chapter)</p>
              ))}
            </div>
            <p className="text-[10px] text-red-300/80 pt-1">
              ⚠️ Seluruh data komik, sampul, dan bab di dalam folder terpilih akan dihapus permanen.
            </p>
          </div>

          <form onSubmit={handleConfirmDeleteFolders} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">
                Alasan Penghapusan (Audit Trail):
              </label>
              <input
                type="text"
                value={folderDeleteReason}
                onChange={(e) => setFolderDeleteReason(e.target.value)}
                placeholder="Contoh: Pembersihan komik duplikat / rusak..."
                className="w-full p-2 bg-[#181824] border border-[#27273a] rounded-xl text-white text-xs focus:outline-none focus:border-[#ff5b14]"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#1f1f2e]">
              <button
                type="button"
                onClick={() => setShowFolderDeleteModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white bg-[#181824] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Konfirmasi Hapus ({selectedFolderComicIds.length} Folder)</span>
              </button>
            </div>
          </form>
        </div>
      </AdminModalPortal>
    </div>
  );
};
