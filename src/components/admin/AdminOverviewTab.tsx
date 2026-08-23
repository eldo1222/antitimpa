import React from 'react';
import { useApp } from '../../context/AppContext';
import { Chapter } from '../../types';
import { 
  BookOpen, 
  FileText, 
  Users, 
  ShieldAlert, 
  Activity, 
  Plus, 
  TrendingUp, 
  ExternalLink,
  ChevronRight,
  HardDrive,
  CheckCircle2
} from 'lucide-react';

export const AdminOverviewTab: React.FC = () => {
  const { 
    comics, 
    chapters, 
    users, 
    activityLogs, 
    setAdminActiveMenu, 
    setIsAdminView 
  } = useApp();

  const totalChapters = (Object.values(chapters) as Chapter[][]).reduce((acc, list) => acc + (list?.length || 0), 0);
  const readerUsers = users.filter(u => u.role !== 'admin');
  const lockedUsers = readerUsers.filter(u => u.status === 'locked' || u.failedAttempts >= 3);
  const recentLogs = activityLogs.slice(0, 6);

  return (
    <div className="space-y-5">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1 */}
        <div 
          onClick={() => setAdminActiveMenu('comics')}
          className="p-4 bg-[#12121a] hover:bg-[#161622] rounded-xl border border-[#1f1f2e] cursor-pointer transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Total Komik</span>
            <BookOpen className="w-4 h-4 text-[#ff5b14]" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{comics.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {comics.filter(c => c.status === 'ongoing').length} ongoing, {comics.filter(c => c.status === 'completed').length} tamat
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div 
          onClick={() => setAdminActiveMenu('chapters')}
          className="p-4 bg-[#12121a] hover:bg-[#161622] rounded-xl border border-[#1f1f2e] cursor-pointer transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Total Chapter</span>
            <FileText className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{totalChapters}</div>
            <div className="text-[11px] text-emerald-400 font-semibold mt-0.5">
              Siap dibaca pembaca
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div 
          onClick={() => setAdminActiveMenu('readers')}
          className="p-4 bg-[#12121a] hover:bg-[#161622] rounded-xl border border-[#1f1f2e] cursor-pointer transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Akun Pembaca</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{readerUsers.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {readerUsers.filter(u => u.status === 'active').length} akun aktif
            </div>
          </div>
        </div>

        {/* Metric 4 */}
        <div 
          onClick={() => setAdminActiveMenu('readers')}
          className="p-4 bg-[#12121a] hover:bg-[#161622] rounded-xl border border-[#1f1f2e] cursor-pointer transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Akun Terkunci (3x)</span>
            <ShieldAlert className={`w-4 h-4 ${lockedUsers.length > 0 ? 'text-red-400 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <div>
            <div className={`text-2xl font-black ${lockedUsers.length > 0 ? 'text-red-400' : 'text-white'}`}>
              {lockedUsers.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {lockedUsers.length > 0 ? 'Perlu tindakan admin' : 'Semua akun aman'}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts & Recent List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Komik List Quick View */}
        <div className="lg:col-span-2 p-4 bg-[#12121a] rounded-xl border border-[#1f1f2e] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#ff5b14]" />
              <span>Daftar Komik Terbaru</span>
            </h3>
            <button
              onClick={() => setAdminActiveMenu('comics')}
              className="text-xs text-[#ff5b14] hover:underline font-semibold flex items-center gap-1"
            >
              <span>Kelola Semua</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#1c1c2b]">
            {comics.slice(0, 4).map(c => {
              const chCount = (chapters[c.id] || []).length;
              return (
                <div key={c.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img src={c.coverImage} alt={c.title} className="w-8 h-11 rounded object-cover shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{c.title}</p>
                      <p className="text-[11px] text-slate-400">{c.genres.slice(0, 2).join(', ')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded bg-[#181826] text-slate-300 text-[10px] font-semibold">
                      {chCount} Ch.
                    </span>
                    <button
                      onClick={() => setAdminActiveMenu('chapters')}
                      className="px-2 py-1 bg-[#ff5b14]/15 hover:bg-[#ff5b14]/25 text-[#ff7a3d] rounded text-[11px] font-bold"
                    >
                      + Upload Ch.
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Recent Audit Trail */}
        <div className="p-4 bg-[#12121a] rounded-xl border border-[#1f1f2e] space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                <span>Audit Log Terbaru</span>
              </h3>
              <button
                onClick={() => setAdminActiveMenu('logs')}
                className="text-xs text-slate-400 hover:text-white"
              >
                Semua
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {recentLogs.map(l => (
                <div key={l.id} className="p-2 rounded-lg bg-[#161622] border border-[#222232] text-[11px]">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-slate-200">{l.action}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(l.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    User: <strong className="text-slate-300">{l.username}</strong> {l.details ? `— ${l.details}` : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#1c1c2b]">
            <button
              onClick={() => setIsAdminView(false)}
              className="w-full py-2 bg-[#181824] hover:bg-[#202030] text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 border border-[#262638]"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#ff5b14]" />
              <span>Lihat Tampilan Reader</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
