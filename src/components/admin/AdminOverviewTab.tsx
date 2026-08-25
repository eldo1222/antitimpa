import React from 'react';
import { useApp } from '../../context/AppContext';
import { Chapter } from '../../types';
import { 
  BookOpen, 
  FileText, 
  Users, 
  ShieldAlert, 
  Activity, 
  TrendingUp, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  PieChart,
  Eye,
  Tag
} from 'lucide-react';

export const AdminOverviewTab: React.FC = () => {
  const { 
    comics, 
    chapters, 
    users, 
    activityLogs, 
    readingHistory,
    setAdminActiveMenu, 
    setIsAdminView 
  } = useApp();

  const totalChapters = (Object.values(chapters) as Chapter[][]).reduce((acc, list) => acc + (list?.length || 0), 0);
  const readerUsers = users.filter(u => u.role !== 'admin');
  const activeReaders = readerUsers.filter(u => u.status === 'active');
  const lockedUsers = readerUsers.filter(u => u.status === 'locked' || u.failedAttempts >= 3);
  const recentLogs = activityLogs.slice(0, 6);

  // 1. Genuine Total Registered Readers & Today's Visits
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogs = activityLogs.filter(l => l.timestamp.startsWith(todayStr));
  const todayVisits = Math.max(1, todayLogs.length || 1);
  const totalRegisteredReaders = readerUsers.length;

  // 2. Breakdown of Most Popular Comic Types (Genuine Data)
  const typeCounts: Record<string, number> = {};
  comics.forEach(c => {
    const t = c.comicType || c.type || 'manga';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });
  const totalComics = Math.max(1, comics.length);

  // 3. Top 5 Most Popular Genres (Genuine Frequency)
  const genreCounts: Record<string, number> = {};
  comics.forEach(c => {
    (c.genres || []).forEach(g => {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    });
  });
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-5">
      {/* 1. Core Metric Cards */}
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

        {/* Metric 3: Total Pembaca Riil dari Hasil Pendaftar Akun */}
        <div 
          onClick={() => setAdminActiveMenu('readers')}
          className="p-4 bg-[#12121a] hover:bg-[#161622] rounded-xl border border-[#1f1f2e] cursor-pointer transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Total Pembaca Terdaftar</span>
            <Users className="w-4 h-4 text-[#ff7a3d]" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{totalRegisteredReaders}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {activeReaders.length} akun aktif, {lockedUsers.length} terkunci
            </div>
          </div>
        </div>

        {/* Metric 4: Total Kunjungan Hari Ini */}
        <div 
          onClick={() => setAdminActiveMenu('logs')}
          className="p-4 bg-[#12121a] hover:bg-[#161622] rounded-xl border border-[#1f1f2e] cursor-pointer transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Kunjungan Hari Ini</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{todayVisits}</div>
            <div className="text-[11px] text-emerald-400 font-semibold mt-0.5">
              Aktivitas sesi tercatat
            </div>
          </div>
        </div>
      </div>

      {/* 2. Real-Time Smart Analytics (Jenis & Genre Paling Diminati) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Jenis Komik Paling Diminati */}
        <div className="p-4 bg-[#12121a] rounded-xl border border-[#1f1f2e] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[#ff5b14]" />
              <span>Distribusi Jenis Komik</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Data Riil</span>
          </div>

          <div className="space-y-2.5">
            {Object.entries(typeCounts).map(([typeName, count]) => {
              const pct = Math.round((count / totalComics) * 100);
              return (
                <div key={typeName} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300 capitalize">{typeName}</span>
                    <span className="text-slate-400">{count} Judul ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-[#181826] rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        typeName === 'manhwa' ? 'bg-indigo-500' :
                        typeName === 'manga' ? 'bg-[#ff5b14]' :
                        typeName === 'doujin' ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 5 Genre Paling Diminati */}
        <div className="p-4 bg-[#12121a] rounded-xl border border-[#1f1f2e] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-400" />
              <span>Genre Paling Populer</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Frekuensi Riil</span>
          </div>

          <div className="space-y-2">
            {topGenres.map(([gName, gCount], idx) => (
              <div key={gName} className="p-2 bg-[#171724] rounded-lg border border-[#222234] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#202032] flex items-center justify-center font-mono font-bold text-[10px] text-[#ff7a3d]">
                    #{idx + 1}
                  </span>
                  <span className="font-semibold text-slate-200">{gName}</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#101018] text-slate-300 font-mono font-bold text-[11px]">
                  {gCount} Komik
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Quick Action Shortcuts & Recent List */}
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
              className="text-xs text-[#ff5b14] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
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
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      chCount > 0 ? 'bg-[#181826] text-slate-300' : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    }`}>
                      {chCount} Ch.
                    </span>
                    <button
                      onClick={() => setAdminActiveMenu('chapters')}
                      className="px-2.5 py-1 bg-[#ff5b14]/15 hover:bg-[#ff5b14]/25 text-[#ff7a3d] rounded text-[11px] font-bold cursor-pointer transition-colors"
                    >
                      📁 Kelola Ch.
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
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
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
              className="w-full py-2 bg-[#181824] hover:bg-[#202030] text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 border border-[#262638] cursor-pointer transition-colors"
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
