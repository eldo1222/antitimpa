import React, { useState } from 'react';
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
  ShieldCheck,
  KeyRound,
  Lock,
  X
} from 'lucide-react';

export const AdminLogsTab: React.FC = () => {
  const { activityLogs, clearActivityLogs, currentUser } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Elevated Audit Confirmation Modal State
  const [showClearModal, setShowClearModal] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [auditReasonInput, setAuditReasonInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const filteredLogs = activityLogs.filter(log => {
    const matchesSearch = 
      log.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const handleConfirmClearLogs = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!adminPasswordInput.trim()) {
      setAuthError('Password akun Super Admin wajib dimasukkan demi keamanan audit.');
      return;
    }

    if (currentUser && currentUser.passwordHash !== adminPasswordInput) {
      setAuthError('Password Super Admin salah! Penghapusan audit log ditolak demi integritas data.');
      return;
    }

    if (clearActivityLogs) {
      clearActivityLogs(auditReasonInput.trim() || 'Pembersihan audit berkala oleh Super Admin');
    }

    setShowClearModal(false);
    setAdminPasswordInput('');
    setAuditReasonInput('');
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pb-2 border-b border-[#1c1c2a]">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#ff5b14]" />
            <span>Log Aktivitas &amp; Audit Trail (ISO/IEC 27001 Standard)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Pencatatan real-time aksi login, percobaan gagal, perubahan data komik, penghapusan, dan status sistem
          </p>
        </div>

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
            <span>Pembersihan Log (Persetujuan Tingkat Lanjut)</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#12121a] p-3 rounded-xl border border-[#1f1f2e]">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari aktivitas, username, atau detail..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#181824] border border-[#262638] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#181824] border border-[#262638] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">Semua Status ({activityLogs.length})</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="failed">Failed / Lock</option>
            <option value="info">Info</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[#12121a] rounded-xl border border-[#1f1f2e] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#161622] text-slate-400 font-semibold border-b border-[#222234]">
              <tr>
                <th className="p-3">Waktu</th>
                <th className="p-3">Pengguna</th>
                <th className="p-3">Aksi / Event</th>
                <th className="p-3">Detail Peristiwa &amp; Alasan</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b1b28]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    Tidak ada catatan aktivitas.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const date = new Date(log.timestamp);
                  const timeFormatted = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  const dateFormatted = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

                  return (
                    <tr key={log.id} className="hover:bg-[#161624] transition-colors">
                      <td className="p-3 font-mono text-slate-400 whitespace-nowrap">
                        <span className="text-white block font-semibold">{timeFormatted}</span>
                        <span className="text-[10px] text-slate-500">{dateFormatted}</span>
                      </td>
                      <td className="p-3 font-semibold text-slate-200">
                        {log.username}
                      </td>
                      <td className="p-3 font-bold text-white">
                        {log.action}
                      </td>
                      <td className="p-3 text-slate-400 max-w-sm">
                        <p className="line-clamp-2">{log.details || '-'}</p>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
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
