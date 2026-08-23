import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DriveAccount, Chapter } from '../../types';
import { 
  HardDrive, 
  Plus, 
  FolderOpen, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  Eye, 
  Link2, 
  Layers, 
  Sparkles,
  Share2,
  X,
  FileText,
  ShieldCheck,
  RefreshCw,
  FolderPlus,
  Play
} from 'lucide-react';
import { formatGoogleDriveEmbedUrl, isGoogleDriveUrl } from '../../utils/driveHelper';

export const AdminDriveCatalogTab: React.FC = () => {
  const { 
    comics, 
    chapters, 
    driveAccounts, 
    addDriveAccount, 
    updateDriveAccount, 
    deleteDriveAccount, 
    updateChapterDriveLink,
    systemSettings 
  } = useApp();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDriveFilter, setSelectedDriveFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedComicId, setExpandedComicId] = useState<string | null>(comics[0]?.id || null);

  // Account Modal state
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<DriveAccount | null>(null);
  const [accountName, setAccountName] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [accountFolderUrl, setAccountFolderUrl] = useState('');
  const [accountStatus, setAccountStatus] = useState<DriveAccount['status']>('active');
  const [accountStorageUsed, setAccountStorageUsed] = useState<number>(0);
  const [accountStorageTotal, setAccountStorageTotal] = useState<number>(15);
  const [accountColorTag, setAccountColorTag] = useState('#ff5b14');
  const [accountNotes, setAccountNotes] = useState('');

  // Chapter Drive Link Modal state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [targetComicId, setTargetComicId] = useState<string>('');
  const [targetChapterId, setTargetChapterId] = useState<string>('');
  const [inputDriveUrl, setInputDriveUrl] = useState<string>('');
  const [inputDriveAccountId, setInputDriveAccountId] = useState<string>('');
  const [inputDriveNotes, setInputDriveNotes] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewEmbedUrl, setPreviewEmbedUrl] = useState<string | null>(null);

  // Helper to count comics and chapters for an account
  const getAccountStats = (accountId: string) => {
    let comicCount = 0;
    let chapterCount = 0;

    comics.forEach(c => {
      const comicChapters = chapters[c.id] || [];
      const hasChaptersInDrive = comicChapters.some(ch => ch.driveAccountId === accountId);
      if (c.primaryDriveAccountId === accountId || hasChaptersInDrive) {
        comicCount++;
      }
      chapterCount += comicChapters.filter(ch => ch.driveAccountId === accountId).length;
    });

    return { comicCount, chapterCount };
  };

  const handleOpenAccountModal = (account?: DriveAccount) => {
    if (account) {
      setEditingAccount(account);
      setAccountName(account.name);
      setAccountEmail(account.email);
      setAccountFolderUrl(account.folderUrl || '');
      setAccountStatus(account.status);
      setAccountStorageUsed(account.storageUsedGb || 0);
      setAccountStorageTotal(account.storageTotalGb || 15);
      setAccountColorTag(account.colorTag || '#ff5b14');
      setAccountNotes(account.notes || '');
    } else {
      setEditingAccount(null);
      setAccountName('');
      setAccountEmail('');
      setAccountFolderUrl('');
      setAccountStatus('active');
      setAccountStorageUsed(0);
      setAccountStorageTotal(15);
      setAccountColorTag('#ff5b14');
      setAccountNotes('');
    }
    setShowAccountModal(true);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim() || !accountEmail.trim()) return;

    if (editingAccount) {
      updateDriveAccount(editingAccount.id, {
        name: accountName.trim(),
        email: accountEmail.trim(),
        folderUrl: accountFolderUrl.trim(),
        status: accountStatus,
        storageUsedGb: Number(accountStorageUsed),
        storageTotalGb: Number(accountStorageTotal),
        colorTag: accountColorTag,
        notes: accountNotes.trim()
      });
    } else {
      addDriveAccount({
        name: accountName.trim(),
        email: accountEmail.trim(),
        folderUrl: accountFolderUrl.trim(),
        status: accountStatus,
        storageUsedGb: Number(accountStorageUsed),
        storageTotalGb: Number(accountStorageTotal),
        colorTag: accountColorTag,
        notes: accountNotes.trim()
      });
    }
    setShowAccountModal(false);
  };

  const handleOpenLinkModal = (comicId: string, chapter: Chapter) => {
    setTargetComicId(comicId);
    setTargetChapterId(chapter.id);
    setInputDriveUrl(chapter.driveUrl || '');
    setInputDriveAccountId(chapter.driveAccountId || driveAccounts[0]?.id || '');
    setInputDriveNotes(chapter.driveNotes || '');
    setShowLinkModal(true);
  };

  const handleSaveLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetComicId || !targetChapterId || !inputDriveUrl.trim()) return;

    updateChapterDriveLink(
      targetComicId,
      targetChapterId,
      inputDriveUrl.trim(),
      inputDriveAccountId || undefined,
      inputDriveNotes.trim() || undefined
    );
    setShowLinkModal(false);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter comics based on criteria
  const filteredComics = comics.filter(c => {
    const comicChapters = chapters[c.id] || [];
    const matchSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.genres.some(g => g.toLowerCase().includes(searchQuery.toLowerCase())) ||
      comicChapters.some(ch => ch.title.toLowerCase().includes(searchQuery.toLowerCase()) || (ch.driveUrl && ch.driveUrl.toLowerCase().includes(searchQuery.toLowerCase())));

    const matchDrive = selectedDriveFilter === 'all' || 
      c.primaryDriveAccountId === selectedDriveFilter ||
      comicChapters.some(ch => ch.driveAccountId === selectedDriveFilter);

    const matchStatus = statusFilter === 'all' ||
      (statusFilter === 'has_drive' && comicChapters.some(ch => ch.sourceType === 'drive' && ch.driveUrl)) ||
      (statusFilter === 'no_drive' && !comicChapters.some(ch => ch.sourceType === 'drive' && ch.driveUrl));

    return matchSearch && matchDrive && matchStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in pb-16 text-slate-100">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-[#171724] via-[#151520] to-[#101018] border border-[#262638] rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-[#ff5b14]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#ff5b14]/20 text-[#ff5b14] border border-[#ff5b14]/30 flex items-center gap-1">
                <HardDrive className="w-3 h-3" />
                Multi-Drive Storage Engine
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                TikTok @anti.timpa Sync
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
              Katalog Pemetaan Google Drive
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl mt-1">
              Atur dan lacak lokasi Google Drive tempat file komik diupload. Anda dapat mengelompokkan komik ke berbagai akun Google Drive berbeda agar terstruktur, mudah dilacak, dan siap dipromosikan di akun TikTok <strong className="text-white">@anti.timpa</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <a
              href={systemSettings.tiktokUrl || 'https://www.tiktok.com/@anti.timpa'}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-[#1b1b28] hover:bg-[#252536] border border-[#2d2d42] text-xs font-semibold text-slate-200 rounded-xl transition-all flex items-center gap-2 shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5 text-[#ff5b14]" />
              <span>TikTok @anti.timpa</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            <button
              onClick={() => handleOpenAccountModal()}
              className="px-3.5 py-2 bg-[#ff5b14] hover:bg-[#e04f10] text-xs font-bold text-white rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-[#ff5b14]/20"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Tambah Akun Drive</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: Google Drive Accounts Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-[#ff5b14]" />
            <span>Daftar Akun Google Drive ({driveAccounts.length} Akun Terdaftar)</span>
          </h2>
          <span className="text-[11px] text-slate-400">
            Klik kartu untuk memfilter katalog komik di bawah
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {driveAccounts.map((account) => {
            const stats = getAccountStats(account.id);
            const isSelected = selectedDriveFilter === account.id;
            const percentUsed = account.storageTotalGb 
              ? Math.min(100, Math.round(((account.storageUsedGb || 0) / account.storageTotalGb) * 100))
              : 0;

            return (
              <div
                key={account.id}
                onClick={() => setSelectedDriveFilter(isSelected ? 'all' : account.id)}
                className={`bg-[#12121a] border rounded-2xl p-4 cursor-pointer transition-all hover:border-[#ff5b14]/60 relative overflow-hidden flex flex-col justify-between group ${
                  isSelected 
                    ? 'border-[#ff5b14] ring-2 ring-[#ff5b14]/30 shadow-lg shadow-[#ff5b14]/10 bg-[#161622]' 
                    : 'border-[#222232] hover:bg-[#151520]'
                }`}
              >
                {/* Top Accent Strip */}
                <div 
                  className="absolute top-0 left-0 right-0 h-1" 
                  style={{ backgroundColor: account.colorTag || '#ff5b14' }} 
                />

                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 text-white shadow-inner"
                        style={{ backgroundColor: account.colorTag || '#ff5b14' }}
                      >
                        GD
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-xs text-white truncate group-hover:text-[#ff5b14] transition-colors">
                          {account.name}
                        </h3>
                        <p className="text-[10px] text-slate-400 truncate">{account.email}</p>
                      </div>
                    </div>

                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase border shrink-0 ${
                      account.status === 'active' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : account.status === 'warning' 
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : account.status === 'full'
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                    }`}>
                      {account.status}
                    </span>
                  </div>

                  {account.notes && (
                    <p className="text-[11px] text-slate-400 line-clamp-2 mb-3 bg-[#0d0d14] p-2 rounded-lg border border-[#1d1d2b]">
                      {account.notes}
                    </p>
                  )}

                  {/* Storage Progress Bar */}
                  <div className="space-y-1 my-2.5">
                    <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                      <span>Kapasitas Storage</span>
                      <span className="text-slate-200">
                        {account.storageUsedGb || 0} GB / {account.storageTotalGb || 15} GB ({percentUsed}%)
                      </span>
                    </div>
                    <div className="w-full bg-[#1e1e2c] h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          percentUsed > 90 ? 'bg-red-500' : percentUsed > 75 ? 'bg-amber-500' : 'bg-[#ff5b14]'
                        }`}
                        style={{ width: `${percentUsed}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Counts and Quick Action Buttons */}
                <div className="pt-3 border-t border-[#1d1d2b] flex items-center justify-between mt-1">
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                    <span className="bg-[#181824] px-1.5 py-0.5 rounded border border-[#27273a] text-white font-bold">
                      {stats.comicCount} Komik
                    </span>
                    <span>•</span>
                    <span className="bg-[#181824] px-1.5 py-0.5 rounded border border-[#27273a] text-slate-300">
                      {stats.chapterCount} Ch Drive
                    </span>
                  </div>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {account.folderUrl && (
                      <a
                        href={account.folderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-md transition-colors"
                        title="Buka Folder Google Drive"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => handleOpenAccountModal(account)}
                      className="p-1 text-slate-400 hover:text-white hover:bg-[#202030] rounded-md transition-colors"
                      title="Edit Akun Drive"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Hapus akun drive "${account.name}" dari katalog? Komik yang terhubung tidak akan terhapus.`)) {
                          deleteDriveAccount(account.id);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                      title="Hapus Akun"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Comic-to-Drive Catalog & Link Matrix */}
      <div className="bg-[#101018] border border-[#202030] rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#1c1c2a]">
          <div>
            <h2 className="font-extrabold text-sm text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#ff5b14]" />
              <span>Katalog & Status Link Komik per Akun Drive</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Menampilkan {filteredComics.length} dari {comics.length} judul komik. Klik judul untuk memeriksa dan mengelola tautan Google Drive pada masing-masing chapter.
            </p>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari judul komik / chapter..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#171724] border border-[#28283c] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14]"
              />
            </div>

            <select
              value={selectedDriveFilter}
              onChange={(e) => setSelectedDriveFilter(e.target.value)}
              className="bg-[#171724] border border-[#28283c] text-slate-300 text-xs px-2.5 py-1.5 rounded-xl focus:outline-none focus:border-[#ff5b14]"
            >
              <option value="all">Semua Akun Drive</option>
              {driveAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#171724] border border-[#28283c] text-slate-300 text-xs px-2.5 py-1.5 rounded-xl focus:outline-none focus:border-[#ff5b14]"
            >
              <option value="all">Semua Sumber</option>
              <option value="has_drive">Hanya yang Pakai Drive</option>
              <option value="no_drive">Belum Ada Drive Link</option>
            </select>
          </div>
        </div>

        {/* Comics List / Accordions */}
        {filteredComics.length === 0 ? (
          <div className="text-center py-12 bg-[#14141e] rounded-xl border border-dashed border-[#262638]">
            <HardDrive className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-300">Tidak ada komik yang cocok dengan filter</p>
            <p className="text-[11px] text-slate-500 mt-1">Coba ubah kata kunci pencarian atau reset filter akun Google Drive.</p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedDriveFilter('all'); setStatusFilter('all'); }}
              className="mt-3 px-3 py-1.5 bg-[#ff5b14]/20 text-[#ff5b14] hover:bg-[#ff5b14]/30 rounded-lg text-xs font-bold transition-colors"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredComics.map((comic) => {
              const comicChapters = chapters[comic.id] || [];
              const driveChapters = comicChapters.filter(ch => ch.sourceType === 'drive' && ch.driveUrl);
              const isExpanded = expandedComicId === comic.id;

              // Find primary drive account info
              const primaryAccount = driveAccounts.find(a => a.id === comic.primaryDriveAccountId) ||
                driveAccounts.find(a => comicChapters.some(ch => ch.driveAccountId === a.id)) ||
                driveAccounts[0];

              return (
                <div 
                  key={comic.id}
                  className="bg-[#14141e] border border-[#222232] rounded-2xl overflow-hidden transition-all shadow-sm"
                >
                  {/* Comic Summary Header Bar */}
                  <div 
                    onClick={() => setExpandedComicId(isExpanded ? null : comic.id)}
                    className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#181826] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img 
                        src={comic.coverImage} 
                        alt={comic.title} 
                        className="w-11 h-15 object-cover rounded-lg border border-[#2d2d40] shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-sm text-white truncate">
                            {comic.title}
                          </h3>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#ff5b14]/15 text-[#ff5b14] border border-[#ff5b14]/30">
                            {comic.genres[0] || '18+'}
                          </span>
                          {comic.status === 'completed' ? (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                              Tamat
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                              Ongoing
                            </span>
                          )}
                        </div>

                        {/* Drive & TikTok Info Tags */}
                        <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-slate-400">
                          {primaryAccount ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-300">
                              <span 
                                className="w-2 h-2 rounded-full inline-block" 
                                style={{ backgroundColor: primaryAccount.colorTag || '#ff5b14' }} 
                              />
                              Lokasi: <span className="text-white">{primaryAccount.name}</span>
                            </span>
                          ) : (
                            <span className="text-amber-400 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Belum dihubungkan ke akun Drive
                            </span>
                          )}

                          <span>•</span>
                          <span className="font-bold text-slate-300">
                            {driveChapters.length} dari {comicChapters.length} Chapter via Drive
                          </span>

                          {comic.tiktokPromoNote && (
                            <>
                              <span>•</span>
                              <span className="text-cyan-400 font-medium">
                                🎵 {comic.tiktokPromoNote}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-xl border ${
                        driveChapters.length === comicChapters.length && comicChapters.length > 0
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : driveChapters.length > 0
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {driveChapters.length}/{comicChapters.length} Terhubung Drive
                      </span>
                      <button className="p-1 text-slate-400 hover:text-white rounded-lg">
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Chapters Table */}
                  {isExpanded && (
                    <div className="p-4 bg-[#0d0d14] border-t border-[#1e1e2d] space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                        <span>Daftar Chapter & Tautan Google Drive:</span>
                        <span className="text-[11px] text-slate-500 font-normal">
                          Perbarui tautan langsung kapan saja tanpa mengganggu data chapter pembaca
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-[#202030] text-slate-400 text-[10px] uppercase font-bold">
                              <th className="py-2 px-3">Ch</th>
                              <th className="py-2 px-3">Judul Chapter</th>
                              <th className="py-2 px-3">Akun Drive Penampung</th>
                              <th className="py-2 px-3">Tautan Google Drive (Share Link)</th>
                              <th className="py-2 px-3">Status Reader</th>
                              <th className="py-2 px-3 text-right">Tindakan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#181824]">
                            {comicChapters.map((ch) => {
                              const chDriveAccount = driveAccounts.find(a => a.id === ch.driveAccountId) || primaryAccount;
                              const hasDrive = ch.sourceType === 'drive' && ch.driveUrl;

                              return (
                                <tr key={ch.id} className="hover:bg-[#141420] transition-colors">
                                  <td className="py-2.5 px-3 font-black text-[#ff5b14]">
                                    #{ch.chapterNumber}
                                  </td>
                                  <td className="py-2.5 px-3 font-semibold text-slate-200">
                                    {ch.title}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {chDriveAccount ? (
                                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-300 bg-[#161624] px-2 py-0.5 rounded-md border border-[#242438]">
                                        <span 
                                          className="w-1.5 h-1.5 rounded-full" 
                                          style={{ backgroundColor: chDriveAccount.colorTag || '#ff5b14' }} 
                                        />
                                        {chDriveAccount.name}
                                      </span>
                                    ) : (
                                      <span className="text-slate-500 text-[11px]">-</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {hasDrive ? (
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-slate-300 font-mono text-[11px] max-w-[220px] truncate bg-[#161622] px-2 py-0.5 rounded border border-[#232334]">
                                          {ch.driveUrl}
                                        </span>
                                        <button
                                          onClick={() => copyToClipboard(ch.driveUrl || '', ch.id)}
                                          className="p-1 text-slate-400 hover:text-white hover:bg-[#202030] rounded transition-colors"
                                          title="Salin Link Google Drive"
                                        >
                                          {copiedId === ch.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-slate-500 italic text-[11px]">
                                        {ch.sourceType === 'pdf' ? 'Dokumen PDF internal' : `${ch.pages.length} Halaman Gambar`}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {hasDrive ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                        <ShieldCheck className="w-3 h-3" /> Drive Reader Aktif
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-[#161622] px-2 py-0.5 rounded border border-[#242436]">
                                        Standard Reader
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      {hasDrive && ch.driveEmbedUrl && (
                                        <button
                                          onClick={() => setPreviewEmbedUrl(ch.driveEmbedUrl || null)}
                                          className="p-1.5 text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                                          title="Pratinjau Tampilan Iframe Drive Reader"
                                        >
                                          <Play className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleOpenLinkModal(comic.id, ch)}
                                        className="px-2.5 py-1 bg-[#202030] hover:bg-[#ff5b14] hover:text-white text-slate-200 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1"
                                      >
                                        <Link2 className="w-3 h-3" />
                                        <span>{hasDrive ? 'Ganti Link' : 'Set Drive'}</span>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: Tambah / Edit Akun Google Drive */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#12121a] border border-[#262638] rounded-2xl p-5 text-slate-200 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#202030]">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-[#ff5b14]" />
                <h3 className="font-extrabold text-sm text-white">
                  {editingAccount ? 'Edit Akun Google Drive' : 'Tambah Akun Google Drive Baru'}
                </h3>
              </div>
              <button onClick={() => setShowAccountModal(false)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Nama / Label Akun Drive</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Contoh: Google Drive #1 (Romance & Milf 18+)"
                  className="w-full p-2.5 bg-[#181824] border border-[#27273a] rounded-xl text-white focus:outline-none focus:border-[#ff5b14]"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Alamat Email Google / Drive</label>
                <input
                  type="email"
                  value={accountEmail}
                  onChange={(e) => setAccountEmail(e.target.value)}
                  placeholder="Contoh: antitimpa.storage01@gmail.com"
                  className="w-full p-2.5 bg-[#181824] border border-[#27273a] rounded-xl text-white focus:outline-none focus:border-[#ff5b14]"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Link Folder Utama di Google Drive (Opsional)</label>
                <input
                  type="url"
                  value={accountFolderUrl}
                  onChange={(e) => setAccountFolderUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full p-2.5 bg-[#181824] border border-[#27273a] rounded-xl text-white focus:outline-none focus:border-[#ff5b14]"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Untuk memudahkan admin mengklik langsung ke folder Drive saat ingin mengupload bab komik baru.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Status Akun</label>
                  <select
                    value={accountStatus}
                    onChange={(e) => setAccountStatus(e.target.value as any)}
                    className="w-full p-2.5 bg-[#181824] border border-[#27273a] rounded-xl text-white focus:outline-none focus:border-[#ff5b14]"
                  >
                    <option value="active">Active (Penyimpanan Aktif)</option>
                    <option value="warning">Warning (Hampir Penuh)</option>
                    <option value="full">Full (Penuh - Jangan Upload Baru)</option>
                    <option value="backup">Backup / Mirror</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Warna Tag Identifikasi</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accountColorTag}
                      onChange={(e) => setAccountColorTag(e.target.value)}
                      className="w-10 h-9 p-0.5 bg-[#181824] border border-[#27273a] rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={accountColorTag}
                      onChange={(e) => setAccountColorTag(e.target.value)}
                      className="flex-1 p-2 bg-[#181824] border border-[#27273a] rounded-xl text-white font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Storage Terpakai (GB)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1000"
                    value={accountStorageUsed}
                    onChange={(e) => setAccountStorageUsed(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-[#181824] border border-[#27273a] rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Total Kapasitas (GB)</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={accountStorageTotal}
                    onChange={(e) => setAccountStorageTotal(parseFloat(e.target.value) || 15)}
                    className="w-full p-2.5 bg-[#181824] border border-[#27273a] rounded-xl text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Catatan / Rincian Konten Akun Ini</label>
                <textarea
                  value={accountNotes}
                  onChange={(e) => setAccountNotes(e.target.value)}
                  placeholder="Contoh: Khusus komik romance 18+, drama perselingkuhan kantor, dan promosi video TikTok minggu pertama..."
                  rows={2}
                  className="w-full p-2.5 bg-[#181824] border border-[#27273a] rounded-xl text-white focus:outline-none focus:border-[#ff5b14]"
                />
              </div>

              <div className="pt-3 border-t border-[#202030] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="px-4 py-2 bg-[#1b1b26] hover:bg-[#252536] text-slate-300 rounded-xl font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#ff5b14] hover:bg-[#e04f10] text-white rounded-xl font-bold transition-all shadow-lg shadow-[#ff5b14]/20"
                >
                  {editingAccount ? 'Simpan Perubahan' : 'Tambah Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Hubungkan / Update Link Drive Chapter */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#12121a] border border-[#262638] rounded-2xl p-5 text-slate-200 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#202030]">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-[#ff5b14]" />
                <h3 className="font-extrabold text-sm text-white">
                  Kelola Tautan Google Drive Chapter
                </h3>
              </div>
              <button onClick={() => setShowLinkModal(false)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLink} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Pilih Akun Google Drive Penampung</label>
                <select
                  value={inputDriveAccountId}
                  onChange={(e) => setInputDriveAccountId(e.target.value)}
                  className="w-full p-2.5 bg-[#181824] border border-[#27273a] rounded-xl text-white focus:outline-none focus:border-[#ff5b14]"
                >
                  {driveAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.email})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Menghubungkan chapter ini ke akun Drive spesifik agar jika terjadi kendala kuota, Anda langsung tahu Drive mana yang perlu diperbaiki.
                </p>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Link Google Drive (Share Link File PDF / Gambar)</label>
                <input
                  type="url"
                  value={inputDriveUrl}
                  onChange={(e) => setInputDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/xxxx/view?usp=sharing"
                  className="w-full p-2.5 bg-[#181824] border border-[#27273a] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#ff5b14]"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Sistem AntiTimpa akan otomatis mengonversi link di atas menjadi format embed pratinjau yang aman dengan perisai klik transparan.
                </p>
              </div>

              {inputDriveUrl && (
                <div className="p-3 bg-[#0d0d14] rounded-xl border border-[#202030] space-y-1">
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Konversi Otomatis Iframe Embed:
                  </span>
                  <p className="font-mono text-[11px] text-slate-300 break-all">
                    {formatGoogleDriveEmbedUrl(inputDriveUrl)}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Catatan Khusus Chapter (Opsional)</label>
                <input
                  type="text"
                  value={inputDriveNotes}
                  onChange={(e) => setInputDriveNotes(e.target.value)}
                  placeholder="Contoh: File resolusi HD 1080p, sudah dioptimasi untuk mobile"
                  className="w-full p-2.5 bg-[#181824] border border-[#27273a] rounded-xl text-white"
                />
              </div>

              <div className="pt-3 border-t border-[#202030] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2 bg-[#1b1b26] hover:bg-[#252536] text-slate-300 rounded-xl font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#ff5b14] hover:bg-[#e04f10] text-white rounded-xl font-bold transition-all shadow-lg shadow-[#ff5b14]/20"
                >
                  Simpan Tautan Drive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Realtime Embed Viewer Preview */}
      {previewEmbedUrl && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#12121a] border border-[#27273c] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-3.5 bg-[#161622] border-b border-[#232336] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="font-extrabold text-xs text-white">
                  Pratinjau Reader Google Drive (Dengan Perisai Anti-Popout)
                </span>
              </div>
              <button 
                onClick={() => setPreviewEmbedUrl(null)} 
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative w-full h-[520px] bg-black">
              {/* Iframe with Drive Reader */}
              <iframe
                src={previewEmbedUrl}
                className="w-full h-full border-0"
                allow="autoplay"
                title="Google Drive Reader Preview"
              />

              {/* Transparent Shield on pop-out button */}
              <div
                className="absolute top-0 right-0 w-20 h-16 z-30 cursor-default bg-transparent"
                title="Shield Proteksi Anti-Popout"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              />
            </div>

            <div className="p-3 bg-[#101018] border-t border-[#1e1e2d] text-center text-[11px] text-slate-400">
              Perisai transparan aktif di sudut kanan atas untuk mencegah pengguna mengklik tombol pop-out eksternal.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
