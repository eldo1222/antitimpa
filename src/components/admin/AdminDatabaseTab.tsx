import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Database, 
  ExternalLink, 
  Search, 
  RefreshCw, 
  Download, 
  Copy, 
  Check, 
  Layers, 
  BookOpen, 
  FileText, 
  Users, 
  HardDrive, 
  Image as ImageIcon, 
  Activity, 
  Settings, 
  ShieldCheck, 
  FileCode, 
  Eye, 
  X,
  Sparkles,
  Server
} from 'lucide-react';
import firebaseConfigJson from '../../../firebase-applet-config.json';

type CollectionName = 'comics' | 'chapters' | 'users' | 'driveAccounts' | 'banners' | 'activityLogs' | 'systemSettings';

export const AdminDatabaseTab: React.FC = () => {
  const { 
    comics, 
    chapters, 
    users, 
    driveAccounts, 
    banners, 
    activityLogs, 
    systemSettings,
    cleanOrphanData
  } = useApp();

  const [selectedCollection, setSelectedCollection] = useState<CollectionName>('comics');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocJson, setSelectedDocJson] = useState<{ id: string; data: any } | null>(null);
  const [copiedDocId, setCopiedDocId] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState<{ deletedChapters: number; deletedComments: number; deletedBanners: number } | null>(null);

  const handleCleanOrphans = async () => {
    if (!window.confirm('Bersihkan seluruh chapter, komentar, atau banner orphan (yang komiknya sudah dihapus) di Firestore?')) {
      return;
    }
    setIsCleaning(true);
    try {
      const res = await cleanOrphanData();
      setCleanResult(res);
      setTimeout(() => setCleanResult(null), 8000);
    } catch (e) {
      console.error(e);
      alert('Gagal membersihkan data orphan Firestore');
    } finally {
      setIsCleaning(false);
    }
  };

  const projectId = firebaseConfigJson.projectId || 'gen-lang-client-0256082852';
  const databaseId = firebaseConfigJson.firestoreDatabaseId || 'ai-studio-komikyuk-6f02fa55-fee7-4f9b-abff-67fecf326e55';
  const consoleUrl = `https://console.firebase.google.com/project/${projectId}/firestore/databases/${databaseId}/data`;

  // Flatten all chapters into an array for viewing
  const allChaptersList = Object.entries(chapters).flatMap(([comicId, chList]) => 
    Array.isArray(chList) ? chList.map((ch: any) => ({ ...ch, parentComicId: comicId })) : []
  );

  const getCollectionData = (col: CollectionName): { id: string; [key: string]: any }[] => {
    switch (col) {
      case 'comics':
        return comics;
      case 'chapters':
        return allChaptersList;
      case 'users':
        return users;
      case 'driveAccounts':
        return driveAccounts;
      case 'banners':
        return banners;
      case 'activityLogs':
        return activityLogs;
      case 'systemSettings':
        return [{ id: 'config_global', ...systemSettings }];
      default:
        return [];
    }
  };

  const rawData = getCollectionData(selectedCollection);

  // Filter based on search query
  const filteredData = rawData.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const asString = JSON.stringify(item).toLowerCase();
    return asString.includes(q);
  });

  const collectionsMeta: { id: CollectionName; label: string; icon: React.ComponentType<{ className?: string }>; count: number; desc: string }[] = [
    { id: 'comics', label: 'comics', icon: BookOpen, count: comics.length, desc: 'Metadata judul komik, genre, status, rating' },
    { id: 'chapters', label: 'chapters', icon: FileText, count: allChaptersList.length, desc: 'Daftar bab, halaman gambar & link Google Drive' },
    { id: 'users', label: 'users', icon: Users, count: users.length, desc: 'Akun admin & pembaca, paket 15k/5k, password hash' },
    { id: 'driveAccounts', label: 'driveAccounts', icon: HardDrive, count: driveAccounts.length, desc: 'Akun multi Google Drive penyimpanan komik' },
    { id: 'banners', label: 'banners', icon: ImageIcon, count: banners.length, desc: 'Banner promo carousel antarmuka depan' },
    { id: 'activityLogs', label: 'activityLogs', icon: Activity, count: activityLogs.length, desc: 'Audit log login, update & keamanan sistem' },
    { id: 'systemSettings', label: 'systemSettings', icon: Settings, count: 1, desc: 'Konfigurasi identitas platform & security lockout' }
  ];

  const handleCopyJson = (docId: string, data: any) => {
    navigator.clipboard?.writeText(JSON.stringify(data, null, 2));
    setCopiedDocId(docId);
    setTimeout(() => setCopiedDocId(null), 2000);
  };

  const handleExportCollectionJson = () => {
    const jsonStr = JSON.stringify(rawData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `firestore_${selectedCollection}_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl animate-in fade-in pb-12">
      {/* Top Header Card */}
      <div className="p-5 bg-gradient-to-r from-[#12121c] via-[#151524] to-[#12121c] rounded-2xl border border-[#27273c] shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">Database Explorer & Firestore Viewer</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Firestore Online
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Pantau langsung seluruh data koleksi, dokumen JSON, dan struktur cloud database Anda
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCleanOrphans}
              disabled={isCleaning}
              className="px-3.5 py-2 rounded-xl bg-[#222234] hover:bg-rose-950/40 text-rose-300 border border-rose-900/40 font-bold text-xs flex items-center gap-1.5 transition-all hover:scale-102 disabled:opacity-50"
              title="Pindai dan bersihkan chapter/data yang komiknya sudah dihapus dari Firestore"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCleaning ? 'animate-spin text-rose-400' : 'text-rose-400'}`} />
              <span>{isCleaning ? 'Membersihkan Data...' : 'Bersihkan Data Sampah / Orphan'}</span>
            </button>
            <a
              href={consoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-[#ff5b14] hover:bg-[#e04e0e] text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#ff5b14]/20 transition-all hover:scale-102"
              title="Buka konsol Firebase Firestore di browser"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Buka Firebase Console Web</span>
            </a>
          </div>
        </div>

        {/* Clean Result Alert Banner */}
        {cleanResult && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Pembersihan Selesai:</strong> {cleanResult.deletedChapters} chapter sampah, {cleanResult.deletedComments} komentar tidak valid, dan {cleanResult.deletedBanners} banner orphan berhasil dihapus dari cloud Firestore.
              </span>
            </div>
            <button onClick={() => setCleanResult(null)} className="text-emerald-400 hover:text-white text-xs font-bold px-2 py-0.5">
              ✕
            </button>
          </div>
        )}

        {/* Database Connection Specs Pill Box */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[#1f1f30] text-xs">
          <div className="p-2.5 bg-[#171724] rounded-xl border border-[#242436]">
            <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Project ID</span>
            <span className="font-mono text-slate-200 font-semibold text-xs truncate block">{projectId}</span>
          </div>
          <div className="p-2.5 bg-[#171724] rounded-xl border border-[#242436]">
            <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Database ID</span>
            <span className="font-mono text-amber-300 font-semibold text-xs truncate block">{databaseId}</span>
          </div>
          <div className="p-2.5 bg-[#171724] rounded-xl border border-[#242436] flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Sinkronisasi Realtime</span>
              <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> 7 Koleksi Aktif
              </span>
            </div>
            <button
              onClick={handleExportCollectionJson}
              className="p-1.5 text-slate-300 hover:text-white bg-[#222234] hover:bg-[#2b2b42] rounded-lg transition-colors flex items-center gap-1 text-[11px] font-semibold"
              title="Download backup JSON koleksi aktif"
            >
              <Download className="w-3.5 h-3.5 text-orange-400" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Collection Selection Tabs Carousel */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-[#ff5b14]" />
          <span>Pilih Koleksi Firestore</span>
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {collectionsMeta.map(col => {
            const Icon = col.icon;
            const isSelected = selectedCollection === col.id;
            return (
              <button
                key={col.id}
                onClick={() => {
                  setSelectedCollection(col.id);
                  setSearchQuery('');
                }}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  isSelected 
                    ? 'bg-[#1e1a26] border-[#ff5b14] shadow-md shadow-[#ff5b14]/15 scale-102' 
                    : 'bg-[#12121a] hover:bg-[#181824] border-[#222232] text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-[#ff5b14]' : 'text-slate-500'}`} />
                  <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-black ${
                    isSelected ? 'bg-[#ff5b14] text-white' : 'bg-[#1a1a28] text-slate-400'
                  }`}>
                    {col.count}
                  </span>
                </div>
                <div className="font-mono font-bold text-xs text-white truncate">
                  {col.label}
                </div>
                <div className="text-[9px] text-slate-500 line-clamp-1 mt-0.5">
                  {col.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Data Table & Inspector */}
      <div className="p-4 bg-[#12121a] rounded-2xl border border-[#232336] space-y-4 shadow-xl">
        {/* Table Top Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1f1f2e]">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-black text-white bg-[#191928] px-2.5 py-1 rounded-lg border border-[#2a2a40]">
              /{selectedCollection}
            </span>
            <span className="text-xs text-slate-400">
              Menampilkan <strong className="text-white">{filteredData.length}</strong> dari {rawData.length} dokumen
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Cari di /${selectedCollection}...`}
                className="w-full pl-8 pr-3 py-1.5 bg-[#181824] border border-[#27273a] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14]"
              />
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
            </div>

            <button
              onClick={handleExportCollectionJson}
              className="px-3 py-1.5 bg-[#1a1a28] hover:bg-[#242438] text-slate-200 border border-[#2a2a3e] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
              title="Download dokumen sebagai file .json"
            >
              <Download className="w-3.5 h-3.5 text-[#ff5b14]" />
              <span className="hidden sm:inline">Export JSON</span>
            </button>
          </div>
        </div>

        {/* Document List Table */}
        <div className="overflow-x-auto rounded-xl border border-[#1f1f2e]">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#181824] text-slate-400 font-bold border-b border-[#222234] uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Document ID</th>
                <th className="py-2.5 px-3">Ringkasan Field Utama</th>
                <th className="py-2.5 px-3 text-right">Aksi JSON</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b1b28] font-mono">
              {filteredData.length > 0 ? (
                filteredData.map((docItem) => {
                  const docId = docItem.id || 'untitled_doc';
                  const summaryFields = Object.entries(docItem)
                    .filter(([k]) => k !== 'id' && k !== 'passwordHash' && k !== 'pages')
                    .slice(0, 4)
                    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
                    .join(' • ');

                  return (
                    <tr key={docId} className="hover:bg-[#171724] transition-colors">
                      <td className="py-2.5 px-3 font-bold text-amber-400 whitespace-nowrap">
                        {docId}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px] truncate max-w-md font-sans">
                        {summaryFields}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedDocJson({ id: docId, data: docItem })}
                            className="px-2.5 py-1 rounded-lg bg-[#222234] hover:bg-[#2d2d44] text-slate-200 font-sans text-xs flex items-center gap-1 transition-colors"
                            title="Lihat raw JSON dokumen"
                          >
                            <Eye className="w-3 h-3 text-[#ff5b14]" />
                            <span>Lihat JSON</span>
                          </button>
                          <button
                            onClick={() => handleCopyJson(docId, docItem)}
                            className="p-1.5 rounded-lg bg-[#1a1a28] hover:bg-[#252538] text-slate-300 transition-colors"
                            title="Salin JSON ke Clipboard"
                          >
                            {copiedDocId === docId ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-500 font-sans">
                    Tidak ada dokumen yang cocok dengan filter pencarian di /{selectedCollection}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Viewer Modal */}
      {selectedDocJson && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-2xl bg-[#101018] border border-[#28283c] rounded-2xl p-5 text-slate-200 space-y-3 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-[#1f1f2e] shrink-0">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-[#ff5b14]" />
                <span className="font-mono font-bold text-xs text-white">
                  /{selectedCollection}/{selectedDocJson.id}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyJson(selectedDocJson.id, selectedDocJson.data)}
                  className="px-2.5 py-1 bg-[#1c1c2b] hover:bg-[#28283d] text-xs font-semibold rounded-lg text-slate-300 flex items-center gap-1 transition-colors"
                >
                  {copiedDocId === selectedDocJson.id ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Salin JSON</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setSelectedDocJson(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-[#0a0a0f] p-3 rounded-xl border border-[#1e1e2d]">
              <pre className="font-mono text-xs text-emerald-400 whitespace-pre-wrap">
                {JSON.stringify(selectedDocJson.data, null, 2)}
              </pre>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 shrink-0">
              <span>Cloud Firestore live schema inspector</span>
              <button
                onClick={() => setSelectedDocJson(null)}
                className="px-4 py-1.5 bg-[#202030] hover:bg-[#2a2a40] text-slate-200 font-semibold rounded-lg"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
