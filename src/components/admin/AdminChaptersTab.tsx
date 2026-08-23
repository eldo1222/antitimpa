import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Chapter, ChapterSourceType } from '../../types';
import { formatGoogleDriveEmbedUrl, isGoogleDriveUrl } from '../../utils/driveHelper';
import { downloadDrivePdf, convertImagesToPdf } from '../../utils/pdfConverter';
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
  ShieldAlert
} from 'lucide-react';

export const AdminChaptersTab: React.FC = () => {
  const { 
    comics, 
    chapters, 
    driveAccounts,
    addChapter, 
    updateChapter, 
    deleteChapter, 
    batchDeleteChapters,
    startReading, 
    setIsAdminView 
  } = useApp();
  
  const [selectedComicId, setSelectedComicId] = useState<string>(comics[0]?.id || '');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);

  // Multi-Select & Batch Delete States
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [chaptersToDelete, setChaptersToDelete] = useState<Chapter[]>([]);
  const [deleteReason, setDeleteReason] = useState('');

  // Chapter PDF downloading state
  const [downloadingChapterId, setDownloadingChapterId] = useState<string | null>(null);
  const [pdfToastMsg, setPdfToastMsg] = useState<string | null>(null);

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const currentComic = comics.find(c => c.id === selectedComicId);
  const currentChapters = [...(chapters[selectedComicId] || [])].sort((a, b) => b.chapterNumber - a.chapterNumber);

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
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pb-2 border-b border-[#1c1c2a]">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#ff5b14]" />
            <span>Manajemen Chapter Komik</span>
          </h2>
          <p className="text-xs text-slate-400">Pilih judul komik dan kelola chapter dengan berbagai opsi unggah (Gambar, PDF, Google Drive)</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-3.5 py-2 bg-[#ff5b14] hover:bg-[#e04e0e] text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Chapter Baru</span>
        </button>
      </div>

      {/* Select Comic Dropdown & Stats */}
      <div className="p-3.5 bg-[#12121a] rounded-xl border border-[#1f1f2e] flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <label className="text-xs font-bold text-slate-300 whitespace-nowrap">Pilih Komik:</label>
        <select
          value={selectedComicId}
          onChange={(e) => {
            setSelectedComicId(e.target.value);
            setSelectedChapterIds([]);
          }}
          className="flex-1 w-full bg-[#181824] border border-[#28283a] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#ff5b14]"
        >
          {comics.map(c => (
            <option key={c.id} value={c.id}>
              {c.title} — ({c.status}) • {(chapters[c.id] || []).length} Chapter
            </option>
          ))}
        </select>

        {currentComic && (
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#1c1c2b] text-slate-300 font-semibold text-[11px]">
              Total: {currentChapters.length} Chapter
            </span>
          </div>
        )}
      </div>

      {/* Batch Action Toolbar for Chapters */}
      {selectedChapterIds.length > 0 && (
        <div className="p-3 bg-[#171724] border border-[#ff5b14]/40 rounded-xl flex items-center justify-between gap-3 animate-in fade-in shadow-lg">
          <div className="flex items-center gap-2 text-xs text-white">
            <span className="px-2.5 py-1 rounded-lg bg-[#ff5b14] font-extrabold text-white">
              {selectedChapterIds.length} Chapter Terpilih
            </span>
            <span className="text-slate-400 hidden sm:inline">Pilih tindakan batch:</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRequestBatchDelete}
              className="px-3.5 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Hapus bab-bab terpilih sekaligus"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Banyak ({selectedChapterIds.length})</span>
            </button>

            <button
              onClick={() => setSelectedChapterIds([])}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
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
                    {isAllSelected ? <CheckSquare className="w-4 h-4 text-[#ff5b14]" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="p-3">Chapter</th>
                <th className="p-3">Judul Chapter</th>
                <th className="p-3">Tipe Sumber</th>
                <th className="p-3">Halaman / Drive Info</th>
                <th className="p-3">Tanggal Unggah</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b1b28]">
              {currentChapters.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Belum ada chapter untuk komik ini. Silakan klik "Upload Chapter Baru".
                  </td>
                </tr>
              ) : (
                currentChapters.map(ch => {
                  const isSelected = selectedChapterIds.includes(ch.id);
                  return (
                    <tr key={ch.id} className={`hover:bg-[#161624] transition-colors ${isSelected ? 'bg-[#ff5b14]/5' : ''}`}>
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
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {ch.sourceType === 'drive' && <HardDrive className="w-3 h-3" />}
                          {ch.sourceType === 'pdf' && <FileText className="w-3 h-3" />}
                          {ch.sourceType === 'images' && <ImageIcon className="w-3 h-3" />}
                          <span className="uppercase">{ch.sourceType}</span>
                        </span>
                      </td>
                      <td className="p-3 text-slate-400 font-mono text-[11px]">
                        {ch.sourceType === 'drive' ? (
                          <span className="truncate block max-w-xs text-blue-400/80">
                            {ch.driveNotes || (ch.driveAccountId ? `Akun: ${ch.driveAccountId}` : 'Google Drive Terproteksi')}
                          </span>
                        ) : ch.sourceType === 'pdf' ? (
                          <span>PDF Dokumen</span>
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
      </div>

      {/* PDF Toast Notification Banner */}
      {pdfToastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 bg-[#141420] border border-[#ff5b14]/50 text-white rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Loader2 className="w-4 h-4 text-[#ff5b14] animate-spin shrink-0" />
          <span>{pdfToastMsg}</span>
        </div>
      )}

      {/* Upload / Edit Chapter Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#12121a] border border-[#262638] rounded-2xl p-5 text-slate-200 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
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
                className="p-1 text-slate-400 hover:text-white rounded-lg"
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

              {/* Source Type Selector (The 3 Methods) */}
              <div>
                <label className="block text-slate-300 mb-1.5 font-bold">Pilih Format & Metode Upload:</label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Method 1: Images */}
                  <button
                    type="button"
                    onClick={() => setSourceType('images')}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      sourceType === 'images' 
                        ? 'bg-[#ff5b14]/15 border-[#ff5b14] text-white' 
                        : 'bg-[#161622] border-[#252536] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-[#ff7a3d]">
                      <ImageIcon className="w-4 h-4" />
                      <span>1. File Gambar</span>
                    </div>
                    <p className="text-[10px] text-slate-400">JPG, PNG, WebP atau Panel Komik</p>
                  </button>

                  {/* Method 2: PDF */}
                  <button
                    type="button"
                    onClick={() => setSourceType('pdf')}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      sourceType === 'pdf' 
                        ? 'bg-red-500/15 border-red-500 text-white' 
                        : 'bg-[#161622] border-[#252536] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-red-400">
                      <FileText className="w-4 h-4" />
                      <span>2. File PDF</span>
                    </div>
                    <p className="text-[10px] text-slate-400">Dokumen PDF Komik Lengkap</p>
                  </button>

                  {/* Method 3: Google Drive */}
                  <button
                    type="button"
                    onClick={() => setSourceType('drive')}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      sourceType === 'drive' 
                        ? 'bg-blue-500/15 border-blue-500 text-white' 
                        : 'bg-[#161622] border-[#252536] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-blue-400">
                      <HardDrive className="w-4 h-4" />
                      <span>3. Google Drive</span>
                    </div>
                    <p className="text-[10px] text-slate-400">Link Share Drive Mode Baca</p>
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
        </div>
      )}
      {/* Chapter Custom Delete Confirmation Modal with Audit Reason (ISO/IEC 27001) */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-[#12121a] border border-red-500/30 rounded-2xl p-5 text-slate-200 space-y-4 shadow-2xl">
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
                {chaptersToDelete.map(ch => (
                  <p key={ch.id} className="truncate">• Ch #{ch.chapterNumber} — {ch.title}</p>
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
        </div>
      )}
    </div>
  );
};
