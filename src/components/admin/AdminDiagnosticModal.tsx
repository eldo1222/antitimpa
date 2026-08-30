import React, { useState } from 'react';
import { 
  Activity, 
  X, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Copy, 
  Check, 
  RefreshCw, 
  Database, 
  Terminal, 
  ShieldAlert,
  Sparkles,
  Layers
} from 'lucide-react';
import { runSupabaseSingleItemDiagnostic, DiagnosticTestResult } from '../../services/supabase/diagnosticRunner';
import { isSupabaseConfigured } from '../../lib/supabase';

interface AdminDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminDiagnosticModal: React.FC<AdminDiagnosticModalProps> = ({ isOpen, onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<DiagnosticTestResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [keepTestRow, setKeepTestRow] = useState(false);

  if (!isOpen) return null;

  const handleRunDiagnostic = async () => {
    setIsRunning(true);
    try {
      const res = await runSupabaseSingleItemDiagnostic({ cleanupAfterTest: !keepTestRow });
      setResult(res);
    } catch (e: any) {
      console.error('Diagnostic error:', e);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyReport = () => {
    if (!result?.rawReport) return;
    navigator.clipboard.writeText(result.rawReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0f0f18] border border-[#252538] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1c1c2b] flex items-center justify-between bg-[#141422]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Supabase Write Diagnostic Engine (1-Item Test)
              </h3>
              <p className="text-xs text-slate-400">
                Uji langsung penulisan 1 Komik &amp; 1 Chapter ke database PostgreSQL Supabase tanpa batch
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#1e1e2f] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* Diagnostic Mode Notice */}
          <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs text-indigo-200 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-indigo-300">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <span>Protokol Diagnostik Ketat PostgREST / PostgreSQL:</span>
            </div>
            <p className="text-slate-300">
              Alat ini mengeksekusi <strong>1 komik tunggal</strong> dan <strong>1 chapter tunggal</strong> secara langsung ke Supabase client untuk menangkap error mentah (PostgreSQL Error Code, PostgREST Message, Details, Hint, &amp; RLS) tanpa ditutup-tutupi oleh fallback lokal.
            </p>
          </div>

          {/* Action Trigger Card */}
          <div className="p-4 bg-[#141422] rounded-xl border border-[#232336] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-xs font-bold text-white">Status Konfigurasi Supabase:</span>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isSupabaseConfigured() ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span className="text-xs text-slate-300 font-semibold">
                  {isSupabaseConfigured() ? 'Terkoneksi ke URL & Key' : 'Belum Dikonfigurasi'}
                </span>
              </div>
              <label className="flex items-center gap-2 pt-1 text-[11px] text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={keepTestRow}
                  onChange={e => setKeepTestRow(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-0"
                />
                <span>Simpan data uji di database (Jangan hapus setelah pengujian)</span>
              </label>
            </div>

            <button
              onClick={handleRunDiagnostic}
              disabled={isRunning || !isSupabaseConfigured()}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-[#ff5b14] hover:opacity-95 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap active:scale-95"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Sedang Menguji Write...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Jalankan Uji 1 Komik ke Supabase</span>
                </>
              )}
            </button>
          </div>

          {/* Results Display */}
          {result && (
            <div className="space-y-4 animate-in fade-in">
              {/* Overall Banner */}
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                result.overallStatus === 'PASS' 
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : 'bg-red-950/40 border-red-500/40 text-red-200'
              }`}>
                {result.overallStatus === 'PASS' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="text-sm font-black tracking-wide">
                    {result.overallStatus === 'PASS' ? '✅ DIAGNOSTIC PASS: SUPABASE MENERIMA DATA' : '🚨 DIAGNOSTIC FAIL: SUPABASE MENOLAK DATA'}
                  </div>
                  <div className="text-xs text-slate-300 font-medium">{result.summary}</div>
                </div>
              </div>

              {/* Step by Step Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Step 1: Comics Table */}
                <div className="p-3.5 bg-[#12121e] rounded-xl border border-[#1f1f30] space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-indigo-400" />
                      <span>1. Tabel public.comics</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      result.steps.comicWrite.status === 'PASS' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {result.steps.comicWrite.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 space-y-1 bg-black/30 p-2.5 rounded-lg border border-white/5 font-mono">
                    <div><span className="text-slate-500">Code:</span> <strong className="text-amber-400">{result.steps.comicWrite.code || 'None'}</strong></div>
                    <div className="text-slate-400 truncate"><span className="text-slate-500">Message:</span> {result.steps.comicWrite.message}</div>
                    {result.steps.comicWrite.hint && (
                      <div className="text-cyan-400"><span className="text-slate-500">Hint:</span> {result.steps.comicWrite.hint}</div>
                    )}
                    {result.steps.comicWrite.details && (
                      <div className="text-slate-400"><span className="text-slate-500">Details:</span> {result.steps.comicWrite.details}</div>
                    )}
                  </div>
                </div>

                {/* Step 2: Chapters Table */}
                <div className="p-3.5 bg-[#12121e] rounded-xl border border-[#1f1f30] space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      <span>2. Tabel public.chapters</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      result.steps.chapterWrite.status === 'PASS' ? 'bg-emerald-500/20 text-emerald-400' : 
                      result.steps.chapterWrite.status === 'SKIPPED' ? 'bg-slate-700 text-slate-300' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {result.steps.chapterWrite.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 space-y-1 bg-black/30 p-2.5 rounded-lg border border-white/5 font-mono">
                    <div><span className="text-slate-500">Code:</span> <strong className="text-amber-400">{result.steps.chapterWrite.code || 'None'}</strong></div>
                    <div className="text-slate-400 truncate"><span className="text-slate-500">Message:</span> {result.steps.chapterWrite.message}</div>
                    {result.steps.chapterWrite.hint && (
                      <div className="text-cyan-400"><span className="text-slate-500">Hint:</span> {result.steps.chapterWrite.hint}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Raw Report Log Viewer */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-slate-400" />
                    <span>Laporan Diagnostik Mentah (Siap Salin)</span>
                  </span>
                  <button
                    onClick={handleCopyReport}
                    className="px-2.5 py-1 rounded bg-[#1f1f32] hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Laporan</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="p-3 bg-black/60 rounded-xl border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-56 custom-scrollbar whitespace-pre-wrap leading-relaxed">
                  {result.rawReport}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1c1c2b] bg-[#141422] flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Engine Versi: Supabase Diagnostic Runner v2.4 (Strict Isolation)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1f1f32] hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
