import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  BookOpen, 
  FileText, 
  Users, 
  Activity, 
  TrendingUp, 
  ExternalLink,
  ChevronRight,
  PieChart,
  Tag,
  Eye,
  UserCheck,
  Smartphone,
  Monitor,
  RefreshCw,
  Calendar,
  Sparkles,
  BarChart3,
  Flame,
  Globe
} from 'lucide-react';
import { AnalyticsRepository } from '../../features/analytics/services/analyticsRepository';
import { 
  AnalyticsSummary, 
  AnalyticsTimeframe 
} from '../../features/analytics/types/analytics.types';

export const AdminOverviewTab: React.FC = () => {
  const { 
    comics, 
    chapters, 
    users, 
    activityLogs, 
    setAdminActiveMenu, 
    setIsAdminView 
  } = useApp();

  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>('30d');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hoveredDataPoint, setHoveredDataPoint] = useState<number | null>(null);

  const loadAnalytics = useCallback(async (selectedTimeframe: AnalyticsTimeframe) => {
    setIsLoading(true);
    try {
      const data = await AnalyticsRepository.computeSummary(selectedTimeframe, {
        comics,
        chapters,
        users,
      });
      setSummary(data);
    } catch (err) {
      console.error('[Load Analytics Failed]:', err);
    } finally {
      setIsLoading(false);
    }
  }, [comics, chapters, users]);

  useEffect(() => {
    loadAnalytics(timeframe);
  }, [timeframe, loadAnalytics]);

  const totalChapters = summary?.totalChapters || (Object.values(chapters)).reduce((acc, list) => acc + (list?.length || 0), 0);
  const totalComics = summary?.totalComics || comics.length;
  const totalRegistered = summary?.totalRegisteredUsers || users.filter(u => u.role !== 'admin').length;
  const newRegistrations = summary?.newRegistrations || 0;
  const totalReads = summary?.totalReads || 0;
  const uniqueReaders = summary?.uniqueReaders || 0;
  const totalComicViews = summary?.totalComicViews || 0;
  const activeReaders = summary?.activeReadersCount || 0;

  // Calculate read-per-reader ratio
  const readRatio = uniqueReaders > 0 ? (totalReads / uniqueReaders).toFixed(1) : '1.0';

  // Timeframe labels
  const timeframeLabels: Record<AnalyticsTimeframe, string> = {
    today: 'Hari Ini',
    '7d': '7 Hari Terakhir',
    '30d': '30 Hari Terakhir',
    year: 'Tahun Ini',
    all: 'Semua Waktu',
  };

  // SVG Chart Dimensions & Math
  const trends = summary?.readTrends || [];
  const chartHeight = 160;
  const chartWidth = 600;
  const maxTrendReads = Math.max(10, ...trends.map(t => Math.max(t.reads, t.uniqueReaders)));

  return (
    <div className="space-y-5">
      {/* 1. Header & Period Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-[#12121a] rounded-2xl border border-[#1f1f2e]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#ff5b14]/10 text-[#ff5b14] border border-[#ff5b14]/20">
              <BarChart3 className="w-4 h-4" />
            </span>
            <h2 className="text-base font-extrabold text-white">Pusat Analytics &amp; Statistik Real-Time</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Data riil aktivitas pembacaan, perbandingan total reads vs pembaca unik, &amp; performa konten.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Timeframe selector pills */}
          <div className="flex items-center bg-[#181824] p-1 rounded-xl border border-[#262638] text-xs">
            {(['today', '7d', '30d', 'year', 'all'] as AnalyticsTimeframe[]).map(t => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  timeframe === t
                    ? 'bg-[#ff5b14] text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {timeframeLabels[t]}
              </button>
            ))}
          </div>

          <button
            onClick={() => loadAnalytics(timeframe)}
            disabled={isLoading}
            title="Muat ulang analytics"
            className="p-2 rounded-xl bg-[#181824] hover:bg-[#202030] text-slate-300 hover:text-white border border-[#262638] transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#ff5b14]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Core KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Total Reads */}
        <div className="p-4 bg-[#12121a] rounded-xl border border-[#1f1f2e] flex flex-col justify-between hover:border-[#ff5b14]/40 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Total Pembacaan (Reads)</span>
            <BookOpen className="w-4 h-4 text-[#ff5b14]" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">
              {isLoading ? '...' : totalReads.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Rasio: <strong className="text-slate-200">{readRatio}x</strong> per pembaca</span>
              <span className="text-emerald-400 font-semibold text-[10px]">Aktif</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Unique Readers */}
        <div className="p-4 bg-[#12121a] rounded-xl border border-[#1f1f2e] flex flex-col justify-between hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Pembaca Unik (Unique)</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">
              {isLoading ? '...' : uniqueReaders.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {uniqueReaders > 0 ? `${uniqueReaders} orang/sesi berbeda` : 'Mulai baca komik'}
            </div>
          </div>
        </div>

        {/* Metric 3: Comic Detail Views */}
        <div className="p-4 bg-[#12121a] rounded-xl border border-[#1f1f2e] flex flex-col justify-between hover:border-indigo-500/40 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Tampilan Detail Komik</span>
            <Eye className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">
              {isLoading ? '...' : totalComicViews.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Kunjungan halaman sinopsis
            </div>
          </div>
        </div>

        {/* Metric 4: Pendaftaran Akun */}
        <div 
          onClick={() => setAdminActiveMenu('readers')}
          className="p-4 bg-[#12121a] hover:bg-[#161622] rounded-xl border border-[#1f1f2e] cursor-pointer transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Pendaftaran User Baru</span>
            <Users className="w-4 h-4 text-[#ff7a3d]" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">
              {isLoading ? '...' : `+${newRegistrations}`}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Total {totalRegistered} pembaca terdaftar
            </div>
          </div>
        </div>
      </div>

      {/* 3. Interactive Visual Trends Graph (Reads vs Unique Readers) */}
      <div className="p-4 bg-[#12121a] rounded-xl border border-[#1f1f2e] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#ff5b14]" />
              <span>Tren Aktivitas Pembacaan ({timeframeLabels[timeframe]})</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Perbandingan antara jumlah total kali chapter dibuka (Reads) dengan jumlah orang/sesi unik (Unique Readers)
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#ff5b14]" />
              <span className="text-slate-300">Total Reads</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-400" />
              <span className="text-slate-300">Unique Readers</span>
            </div>
          </div>
        </div>

        {/* Chart Canvas */}
        {trends.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-slate-500 text-xs">
            Belum ada data aktivitas pada periode ini.
          </div>
        ) : (
          <div className="relative pt-3 pb-2">
            <div className="w-full overflow-x-auto">
              <div className="min-w-[500px]">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-44 overflow-visible">
                  {/* Background grid lines */}
                  {[0.25, 0.5, 0.75, 1].map((pct, idx) => {
                    const y = chartHeight - pct * (chartHeight - 30);
                    return (
                      <g key={idx}>
                        <line x1="0" y1={y} x2={chartWidth} y2={y} stroke="#1d1d2b" strokeDasharray="3 3" strokeWidth="1" />
                        <text x="0" y={y - 3} fill="#55556b" fontSize="9" fontFamily="monospace">
                          {Math.round(maxTrendReads * pct)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Dual Bar series */}
                  {trends.map((point, idx) => {
                    const barGroupWidth = chartWidth / trends.length;
                    const barWidth = Math.max(3, Math.min(16, barGroupWidth * 0.35));
                    const xCenter = idx * barGroupWidth + barGroupWidth / 2;

                    const readsHeight = (point.reads / maxTrendReads) * (chartHeight - 40);
                    const uniquesHeight = (point.uniqueReaders / maxTrendReads) * (chartHeight - 40);

                    const readsY = chartHeight - 20 - readsHeight;
                    const uniquesY = chartHeight - 20 - uniquesHeight;

                    const isHovered = hoveredDataPoint === idx;

                    return (
                      <g 
                        key={point.date}
                        onMouseEnter={() => setHoveredDataPoint(idx)}
                        onMouseLeave={() => setHoveredDataPoint(null)}
                        className="cursor-pointer"
                      >
                        {/* Hover highlight column */}
                        {isHovered && (
                          <rect
                            x={idx * barGroupWidth}
                            y={0}
                            width={barGroupWidth}
                            height={chartHeight - 20}
                            fill="#ff5b14"
                            opacity="0.07"
                            rx="4"
                          />
                        )}

                        {/* Bar 1: Total Reads */}
                        <rect
                          x={xCenter - barWidth - 1}
                          y={readsY}
                          width={barWidth}
                          height={Math.max(2, readsHeight)}
                          fill="#ff5b14"
                          rx="2"
                          opacity={isHovered ? 1 : 0.85}
                        />

                        {/* Bar 2: Unique Readers */}
                        <rect
                          x={xCenter + 1}
                          y={uniquesY}
                          width={barWidth}
                          height={Math.max(2, uniquesHeight)}
                          fill="#34d399"
                          rx="2"
                          opacity={isHovered ? 1 : 0.85}
                        />

                        {/* Date label */}
                        {(idx % Math.ceil(trends.length / 8) === 0 || idx === trends.length - 1) && (
                          <text
                            x={xCenter}
                            y={chartHeight - 4}
                            textAnchor="middle"
                            fill="#8e8ea6"
                            fontSize="9"
                            fontFamily="sans-serif"
                          >
                            {point.label}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Hover Tooltip display */}
            {hoveredDataPoint !== null && trends[hoveredDataPoint] && (
              <div className="mt-2 p-2.5 bg-[#171724] border border-[#2b2b3f] rounded-xl flex items-center justify-between text-xs animate-in fade-in">
                <div className="flex items-center gap-2 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-[#ff5b14]" />
                  <span className="font-bold text-white">{trends[hoveredDataPoint].label} ({trends[hoveredDataPoint].date})</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-[#ff7a3d] font-bold">
                    Reads: {trends[hoveredDataPoint].reads}x
                  </span>
                  <span className="text-emerald-400 font-bold">
                    Pembaca Unik: {trends[hoveredDataPoint].uniqueReaders}
                  </span>
                  {trends[hoveredDataPoint].views > 0 && (
                    <span className="text-indigo-400">
                      Views: {trends[hoveredDataPoint].views}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Top 10 Popular Comics & Top Chapters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Top 10 Komik Populer */}
        <div className="lg:col-span-2 p-4 bg-[#12121a] rounded-xl border border-[#1f1f2e] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#ff5b14]" />
              <span>Komik Paling Diminati (Peringkat Riil)</span>
            </h3>
            <span className="text-[11px] text-slate-400">Berdasarkan Total Reads</span>
          </div>

          <div className="divide-y divide-[#1b1b28]">
            {(summary?.topComics || []).slice(0, 7).map((c, idx) => (
              <div key={c.comicId} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-[10px] shrink-0 ${
                    idx === 0 ? 'bg-amber-500 text-black font-extrabold' :
                    idx === 1 ? 'bg-slate-300 text-black font-extrabold' :
                    idx === 2 ? 'bg-amber-700 text-white font-extrabold' :
                    'bg-[#1e1e2d] text-slate-400'
                  }`}>
                    {idx + 1}
                  </span>
                  <img src={c.coverImage} alt={c.title} className="w-8 h-11 rounded object-cover shrink-0" />
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate max-w-[200px] sm:max-w-[280px]">{c.title}</p>
                    <span className="text-[10px] uppercase font-bold text-[#ff7a3d]">
                      {c.comicType} • {c.totalChapters} Ch.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-right">
                  <div>
                    <span className="font-mono font-bold text-white block">
                      {c.reads.toLocaleString()} <span className="text-[10px] text-slate-400 font-sans">Reads</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 block font-mono">
                      {c.uniqueReaders.toLocaleString()} Unik
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Top Chapters */}
        <div className="p-4 bg-[#12121a] rounded-xl border border-[#1f1f2e] space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Chapter Terpopuler</span>
              </h3>
              <span className="text-[10px] text-slate-400">Views</span>
            </div>

            <div className="space-y-2 text-xs">
              {(summary?.topChapters || []).slice(0, 6).map((ch) => (
                <div key={ch.chapterId} className="p-2.5 rounded-lg bg-[#161622] border border-[#222232] flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-bold text-white block truncate text-[11px]">
                      {ch.comicTitle}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Chapter {ch.chapterNumber}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#101018] text-emerald-400 font-mono font-bold text-[11px] shrink-0">
                    {ch.viewsCount.toLocaleString()}x
                  </span>
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
              <span>Lihat Tampilan Pembaca</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Audience & Technical Demographics (Device & Distribution) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Device Breakdown */}
        <div className="p-4 bg-[#12121a] rounded-xl border border-[#1f1f2e] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-400" />
              <span>Perangkat Pembaca</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Sesi Riil</span>
          </div>

          {(() => {
            const dev = summary?.deviceBreakdown || { mobile: 0, desktop: 0, tablet: 0 };
            const totalDev = Math.max(1, dev.mobile + dev.desktop + dev.tablet);
            const mobilePct = Math.round((dev.mobile / totalDev) * 100);
            const desktopPct = Math.round((dev.desktop / totalDev) * 100);
            const tabletPct = 100 - mobilePct - desktopPct;

            return (
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                      Smartphone (Mobile)
                    </span>
                    <span className="text-white">{dev.mobile} ({mobilePct}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#1a1a28] rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${mobilePct}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <Monitor className="w-3.5 h-3.5 text-indigo-400" />
                      Komputer / Laptop (Desktop)
                    </span>
                    <span className="text-white">{dev.desktop} ({desktopPct}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#1a1a28] rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${desktopPct}%` }} />
                  </div>
                </div>

                {dev.tablet > 0 && (
                  <div>
                    <div className="flex justify-between font-semibold mb-1">
                      <span className="text-slate-300">Tablet / iPad</span>
                      <span className="text-white">{dev.tablet} ({tabletPct}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#1a1a28] rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${tabletPct}%` }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* User Status: Member vs Guest */}
        <div className="p-4 bg-[#12121a] rounded-xl border border-[#1f1f2e] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-[#ff7a3d]" />
              <span>Segmentasi Pembaca</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Autentikasi</span>
          </div>

          {(() => {
            const usr = summary?.userTypeBreakdown || { members: 0, guests: 0 };
            const totalUsr = Math.max(1, usr.members + usr.guests);
            const memberPct = Math.round((usr.members / totalUsr) * 100);
            const guestPct = 100 - memberPct;

            return (
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-slate-300">Tamu Anonim (Guest)</span>
                    <span className="text-white">{usr.guests} ({guestPct}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#1a1a28] rounded-full overflow-hidden">
                    <div className="h-full bg-slate-500 rounded-full" style={{ width: `${guestPct}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-slate-300">Pengguna Terdaftar (Member)</span>
                    <span className="text-[#ff5b14]">{usr.members} ({memberPct}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#1a1a28] rounded-full overflow-hidden">
                    <div className="h-full bg-[#ff5b14] rounded-full" style={{ width: `${memberPct}%` }} />
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-[#181826] text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Total Koleksi Akun:</span>
                  <span className="font-bold text-white">{totalRegistered} Akun</span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Comic Type Distribution */}
        <div className="p-4 bg-[#12121a] rounded-xl border border-[#1f1f2e] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[#ff5b14]" />
              <span>Distribusi Jenis Komik</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">{totalComics} Judul</span>
          </div>

          <div className="space-y-2">
            {Object.entries(summary?.typeDistribution || {}).map(([typeName, count]) => {
              const pct = Math.round((count / totalComics) * 100);
              return (
                <div key={typeName} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300 capitalize">{typeName}</span>
                    <span className="text-slate-400">{count} Judul ({pct}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#181826] rounded-full overflow-hidden">
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
      </div>
    </div>
  );
};
