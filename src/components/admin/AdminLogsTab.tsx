import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Activity, 
  Search, 
  Trash2, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  ShieldAlert,
  Clock,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Lock,
  X,
  Database
} from 'lucide-react';
import { SettingsRepository } from '../../features/settings/services/settingsRepository';
import { ActivityLog } from '../../types';

export const AdminLogsTab: React.FC = () => {
  const { activityLogs, clearActivityLogs, verifyAdminPassword } = useApp();
  
  // Query and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'all' | 'today' | '7d' | '30d'>('all');

  // Pagination States
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [paginatedLogs, setPaginatedLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Elevated Audit Confirmation Modal State
  const [showClearModal, setShowClearModal] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [auditReasonInput, setAuditReasonInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Fetch paginated logs from Supabase / Server
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await SettingsRepository.getLogsPaginated({
        page,
        pageSize,
        search: searchQuery,
        status: filterStatus,
        type: filterType,
      });

      if (res && res.data) {
        // Filter by timeRange if selected
        let finalData = res.data;
        if (timeRange !== 'all') {
          const now = Date.now();
          const cutoff = timeRange === 'today' 
            ? new Date().setHours(0, 0, 0, 0)
            : timeRange === '7d'
            ? now - 7 * 86400000
            : now - 30 * 86400000;
          finalData = finalData.filter(l => new Date(l.timestamp).getTime() >= cutoff);
        }

        setPaginatedLogs(finalData);
        setTotalCount(res.totalCount);
        setTotalPages(res.totalPages || Math.ceil(res.totalCount / pageSize) || 1);
      } else {
        // Fallback to in-memory activityLogs
        let filtered = activityLogs;
        if (filterStatus !== 'all') filtered = filtered.filter(l => l.status === filterStatus);
        if (filterType !== 'all') filtered = filtered.filter(l => l.type === filterType);
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          filtered = filtered.filter(l => 
            l.username.toLowerCase().includes(q) ||
            l.action.toLowerCase().includes(q) ||
            (l.details && l.details.toLowerCase().includes(q))
          );
        }
        setTotalCount(filtered.length);
        setTotalPages(Math.ceil(filtered.length / pageSize) || 1);
        const from = (page - 1) * pageSize;
        setPaginatedLogs(filtered.slice(from, from + pageSize));
      }
    } catch (_) {
      // Fallback to in-memory
      setPaginatedLogs(activityLogs.slice(0, pageSize));
      setTotalCount(activityLogs.length);
      setTotalPages(Math.ceil(activityLogs.length / pageSize) || 1);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, searchQuery, filterStatus, filterType, timeRange, activityLogs]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset to page 1 on filter/search change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterStatus(e.target.value);
    setPage(1);
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterType(e.target.value);
    setPage(1);
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };

  // Export to CSV for audit compliance
  const handleExportCSV = () => {
    if (paginatedLogs.length === 0) return;
    const headers = ['ID', 'Waktu', 'Pengguna', 'Aksi', 'Tipe', 'Status', 'IP Address', 'Detail'];
    const rows = paginatedLogs.map(l => [
      l.id,
      `"${new Date(l.timestamp).toISOString()}"`,
      `"${l.username}"`,
      `"${(l.action || '').replace(/"/g, '""')}"`,
      `"${l.type}"`,
      `"${l.status}"`,
      `"${l.ipAddress || '127.0.0.1'}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `activity_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmClearLogs = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!adminPasswordInput.trim()) {
      setAuthError('Password akun Super Admin wajib dimasukkan demi keamanan audit.');
      return;
    }

    const isValid = verifyAdminPassword ? verifyAdminPassword(adminPasswordInput.trim()) : true;
    if (!isValid) {
      setAuthError('Password Super Admin salah! Penghapusan audit log ditolak demi integritas data.');
      return;
    }

    if (clearActivityLogs) {
      clearActivityLogs(auditReasonInput.trim() || 'Pembersihan audit berkala oleh Super Admin');
    }

    setShowClearModal(false);
    setAdminPasswordInput('');
    setAuditReasonInput('');
    setTimeout(() => {
      fetchLogs();
    }, 500);
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pb-2 border-b border-[#1c1c2a]">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#ff5b14]" />
            <span>Log Aktivitas &amp; Audit Trail Lengkap (Database Supabase)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Pencatatan persisten seluruh aktivitas tanpa batasan limit. Dilengkapi server-side pagination &amp; ekspor laporan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            title="Ekspor data saat ini ke CSV"
            className="px-3 py-1.5 bg-[#181824] hover:bg-[#202030] text-slate-300 hover:text-white border border-[#27273a] text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ekspor CSV</span>
          </button>

          <button
            onClick={() => fetchLogs()}
            disabled={isLoading}
            title="Refresh log aktivitas"
            className="p-1.5 bg-[#181824] hover:bg-[#202030] text-slate-300 hover:text-white border border-[#27273a] rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#ff5b14]' : ''}`} />
          </button>

          {clearActivityLogs && (
            <button
              onClick={() => {
                setAuthError(null);
                setAdminPasswordInput('');
                setAuditReasonInput('');
                setShowClearModal(true);
              }}
              className="px-3 py-1.5 bg-[#181824] hover:bg-red-500/15 text-slate-300 hover:text-red-400 border border-[#27273a] hover:border-red-500/30 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bersihkan Log</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 bg-[#12121a] p-3 rounded-xl border border-[#1f1f2e]">
        {/* Search */}
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Cari aktivitas, username, atau detail..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#181824] border border-[#262638] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14]"
          />
        </div>

        {/* Filter Status */}
        <div className="flex items-center gap-1.5">
          <select
            value={filterStatus}
            onChange={handleStatusChange}
            className="w-full bg-[#181824] border border-[#262638] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-[#ff5b14]"
          >
            <option value="all">Semua Status</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="failed">Failed / Lock</option>
            <option value="info">Info</option>
          </select>
        </div>

        {/* Filter Type */}
        <div className="flex items-center gap-1.5">
          <select
            value={filterType}
            onChange={handleTypeChange}
            className="w-full bg-[#181824] border border-[#262638] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-[#ff5b14]"
          >
            <option value="all">Semua Tipe Aksi</option>
            <option value="comic_create">Suntik / Buat Komik</option>
            <option value="chapter_create">Suntik Chapter</option>
            <option value="system_settings">Pengaturan Sistem</option>
            <option value="auth">Autentikasi &amp; Login</option>
            <option value="scraper">Scraper / Jikan</option>
            <option value="database">Database / Migrasi</option>
          </select>
        </div>

        {/* Timeframe */}
        <div className="flex items-center gap-1.5">
          <select
            value={timeRange}
            onChange={(e) => {
              setTimeRange(e.target.value as any);
              setPage(1);
            }}
            className="w-full bg-[#181824] border border-[#262638] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-[#ff5b14]"
          >
            <option value="all">Semua Rentang Waktu</option>
            <option value="today">Hari Ini</option>
            <option value="7d">7 Hari Terakhir</option>
            <option value="30d">30 Hari Terakhir</option>
          </select>
        </div>
      </div>

      {/* Meta Stats & Row Count */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-400 px-1 gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[#ff5b14] font-semibold">
            <Database className="w-3.5 h-3.5" />
            Total {totalCount.toLocaleString()} Rekor Log Tersimpan
          </span>
          <span className="text-slate-600">•</span>
          <span>Halaman {page} dari {totalPages}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[11px]">Tampilkan per halaman:</span>
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            className="bg-[#181824] border border-[#262638] rounded-md px-2 py-0.5 text-xs text-white focus:outline-none focus:border-[#ff5b14]"
          >
            <option value={10}>10 Baris</option>
            <option value={20}>20 Baris</option>
            <option value={50}>50 Baris</option>
            <option value={100}>100 Baris</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[#12121a] rounded-xl border border-[#1f1f2e] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#161622] text-slate-400 font-semibold border-b border-[#222234]">
              <tr>
                <th className="p-3 w-36">Waktu &amp; Tanggal</th>
                <th className="p-3 w-36">Pengguna</th>
                <th className="p-3 w-48">Aksi / Event</th>
                <th className="p-3">Detail Peristiwa &amp; Alasan</th>
                <th className="p-3 w-28 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b1b28]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#ff5b14]" />
                    <span className="text-xs">Memuat data log aktivitas dari database...</span>
                  </td>
                </tr>
              ) : paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-500">
                    <Activity className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                    <span className="text-xs">Tidak ada catatan aktivitas yang sesuai dengan filter.</span>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const date = new Date(log.timestamp);
                  const timeFormatted = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  const dateFormatted = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

                  return (
                    <tr key={log.id} className="hover:bg-[#161624] transition-colors">
                      <td className="p-3 font-mono text-slate-400 whitespace-nowrap">
                        <span className="text-white block font-semibold">{timeFormatted}</span>
                        <span className="text-[10px] text-slate-500">{dateFormatted}</span>
                      </td>
                      <td className="p-3 font-semibold text-slate-200">
                        <span className="px-2 py-0.5 rounded bg-[#1c1c2b] text-slate-300 font-mono text-[11px] border border-[#2b2b3e]">
                          {log.username}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-white">
                        <span className="block truncate max-w-[200px]" title={log.action}>
                          {log.action}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 font-normal">
                          {log.type}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">
                        <p className="line-clamp-2 text-[11px] font-sans text-slate-300 leading-relaxed">
                          {log.details || '-'}
                        </p>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          log.status === 'success' 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : log.status === 'failed' 
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                            : log.status === 'warning' 
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}>
                          {log.status === 'success' && <CheckCircle2 className="w-3 h-3" />}
                          {log.status === 'failed' && <ShieldAlert className="w-3 h-3" />}
                          {log.status === 'warning' && <AlertTriangle className="w-3 h-3" />}
                          {log.status === 'info' && <Info className="w-3 h-3" />}
                          <span>{log.status}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Navigation Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-[#14141e] border-t border-[#1f1f2e]">
            <div className="text-xs text-slate-400">
              Menampilkan <span className="text-white font-semibold">{((page - 1) * pageSize) + 1}</span> - <span className="text-white font-semibold">{Math.min(page * pageSize, totalCount)}</span> dari <span className="text-white font-semibold">{totalCount}</span> log
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="p-1.5 rounded-lg bg-[#1a1a27] text-slate-300 hover:text-white hover:bg-[#222233] disabled:opacity-40 disabled:pointer-events-none cursor-pointer border border-[#29293d]"
                title="Halaman Pertama"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2.5 py-1.5 rounded-lg bg-[#1a1a27] text-xs text-slate-300 hover:text-white hover:bg-[#222233] disabled:opacity-40 disabled:pointer-events-none cursor-pointer border border-[#29293d] flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Sebelumnya</span>
              </button>

              {/* Page Number Chips */}
              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                  let pageNum = page;
                  if (totalPages <= 5) {
                    pageNum = idx + 1;
                  } else if (page <= 3) {
                    pageNum = idx + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + idx;
                  } else {
                    pageNum = page - 2 + idx;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                        page === pageNum
                          ? 'bg-[#ff5b14] text-white'
                          : 'bg-[#1a1a27] text-slate-300 hover:bg-[#252538] hover:text-white border border-[#29293d]'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-2.5 py-1.5 rounded-lg bg-[#1a1a27] text-xs text-slate-300 hover:text-white hover:bg-[#222233] disabled:opacity-40 disabled:pointer-events-none cursor-pointer border border-[#29293d] flex items-center gap-1"
              >
                <span>Selanjutnya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg bg-[#1a1a27] text-slate-300 hover:text-white hover:bg-[#222233] disabled:opacity-40 disabled:pointer-events-none cursor-pointer border border-[#29293d]"
                title="Halaman Terakhir"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Elevated Audit Log Clear Modal (ISO/IEC 27001 Protection) */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-[#12121a] border border-red-500/30 rounded-2xl p-5 text-slate-200 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#242434]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Persetujuan Tingkat Lanjut (Audit Clear)</h3>
                  <p className="text-[10px] text-slate-400">Konfirmasi Keamanan ISO/IEC 27001</p>
                </div>
              </div>
              <button onClick={() => setShowClearModal(false)} className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/25 text-xs text-red-200 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-red-400">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Peringatan Integritas Audit Trail
              </p>
              <p className="text-[11px] text-red-200/90 leading-relaxed">
                Menghapus log audit akan mereset riwayat aktivitas. Tindakan ini memerlukan otentikasi kata sandi Super Admin dan alasan penghapusan resmi untuk dicatat kembali sebagai jejak audit baru.
              </p>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-xs text-red-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmClearLogs} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Alasan Pembersihan Audit Trail (Wajib / Opsional)</label>
                <input
                  type="text"
                  value={auditReasonInput}
                  onChange={(e) => setAuditReasonInput(e.target.value)}
                  placeholder="Contoh: Pemeliharaan berkala server / rotasi log..."
                  className="w-full p-2 bg-[#181824] border border-[#27273a] rounded-xl text-white text-xs focus:outline-none focus:border-[#ff5b14]"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Masukkan Kata Sandi Super Admin</label>
                <div className="relative">
                  <input
                    type="password"
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    placeholder="Ketik password Super Admin..."
                    className="w-full p-2 pl-8 bg-[#181824] border border-[#27273a] rounded-xl text-white font-mono text-xs focus:border-red-500 focus:outline-none"
                    required
                  />
                  <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#1f1f2e]">
                <button
                  type="button"
                  onClick={() => setShowClearModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white bg-[#181824] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Verifikasi &amp; Bersihkan Log</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
