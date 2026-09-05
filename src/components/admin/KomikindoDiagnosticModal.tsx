import React, { useState } from 'react';
import { 
  Activity, 
  X, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Copy, 
  Check, 
  Globe, 
  ShieldAlert, 
  ShieldCheck, 
  Terminal,
  Search
} from 'lucide-react';
import { fetchKomikindoDiagnostic } from '../../services/comicScraperService';

interface KomikindoDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export const KomikindoDiagnosticModal: React.FC<KomikindoDiagnosticModalProps> = ({
  isOpen,
  onClose,
  initialQuery = 'titan forge'
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [isRunning, setIsRunning] = useState(false);
  const [data, setData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      handleRunDiagnostic();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRunDiagnostic = async () => {
    setIsRunning(true);
    try {
      const res = await fetchKomikindoDiagnostic(query || 'titan forge');
      setData(res);
    } catch (err: any) {
      setData({
        status: 'FETCH_FAILED',
        verdict: 'FETCH_FAILED',
        error: err.message || 'Gagal menjalankan audit upstream'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopy = () => {
    if (!data) return;
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isBlocked = data?.status === 'BLOCKED_BY_UPSTREAM' || data?.httpStatus === 403 || data?.challengeDetected;
  const isWorking = data?.status === 'OK' || data?.verdict === 'WORKING';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0f0f18] border border-[#252538] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1c1c2b] flex items-center justify-between bg-[#141422]">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
              isWorking 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : isBlocked 
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
            }`}>
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                KomikIndo Forensic Audit &amp; Upstream Diagnostic
              </h3>
              <p className="text-xs text-slate-400">
                Uji live request langsung ke komikindo.ch untuk memverifikasi blokade Cloudflare vs integritas parser
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
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar text-xs">
          
          {/* Query Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Query pengujian (contoh: titan forge, solo leveling)..."
                className="w-full pl-9 pr-3 py-2 bg-[#12121c] border border-[#232336] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14]"
              />
            </div>
            <button
              onClick={handleRunDiagnostic}
              disabled={isRunning}
              className="px-4 py-2 bg-[#ff5b14] hover:bg-[#e04e0e] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 cursor-pointer transition-all"
            >
              {isRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
              <span>Jalankan Audit</span>
            </button>
          </div>

          {/* Verdict Banner */}
          {data && (
            <div className={`p-4 rounded-xl border space-y-2 ${
              isWorking
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                : isBlocked
                  ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                  : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm uppercase flex items-center gap-2">
                  {isWorking ? (
                    <>
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      KOMIKINDO = WORKING
                    </>
                  ) : isBlocked ? (
                    <>
                      <ShieldAlert className="w-5 h-5 text-rose-400" />
                      KOMIKINDO = BLOCKED BY UPSTREAM FROM VERCEL
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                      {data.verdict || data.status}
                    </>
                  )}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md font-mono uppercase bg-black/40 border border-white/10">
                  {data.environment || 'production'} ({data.runtime || 'serverless'})
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-300">
                {isWorking
                  ? 'Permintaan HTTP upstream berhasil (Status 200 OK), HTML diterima lengkap, dan parser animepost mengekstrak komik dengan sukses tanpa rintangan bot verification.'
                  : isBlocked
                    ? 'Upstream komikindo.ch menolak akses dengan HTTP 403 Forbidden atau Cloudflare bot challenge pada server Vercel. Parser regex tidak rusak, melainkan IP datacenter hosting dibatasi secara perimeter oleh Cloudflare.'
                    : data.error || 'Terjadi kendala saat menghubungkan probe upstream.'}
              </p>
            </div>
          )}

          {/* Upstream Comparison Table */}
          {data?.probes && (
            <div className="bg-[#12121c] border border-[#232336] rounded-xl p-4 space-y-3">
              <span className="font-bold text-slate-200 block">Detail Pemeriksaan Dua Jalur Upstream</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* Probe 1: Homepage */}
                <div className="p-3 bg-[#171724] border border-[#27273a] rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-indigo-400" />
                      Homepage Probe
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      data.probes.homepage.httpStatus === 200 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      HTTP {data.probes.homepage.httpStatus ?? 'ERR'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 space-y-1 font-mono">
                    <div>URL: <span className="text-slate-200">{data.probes.homepage.url}</span></div>
                    <div>Body: <span className="text-slate-200">{(data.probes.homepage.bodyLength / 1024).toFixed(1)} KB</span></div>
                    <div>Cloudflare: <span className={data.probes.homepage.challengeDetected ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                      {data.probes.homepage.challengeDetected ? 'Challenge Terdeteksi' : 'Bypass / Bersih'}
                    </span></div>
                    <div>Latency: <span className="text-slate-200">{data.probes.homepage.durationMs} ms</span></div>
                  </div>
                </div>

                {/* Probe 2: Search */}
                <div className="p-3 bg-[#171724] border border-[#27273a] rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-[#ff5b14]" />
                      Search Probe
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      data.probes.search.httpStatus === 200 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      HTTP {data.probes.search.httpStatus ?? 'ERR'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 space-y-1 font-mono">
                    <div>URL: <span className="text-slate-200">{data.probes.search.url}</span></div>
                    <div>Body: <span className="text-slate-200">{(data.probes.search.bodyLength / 1024).toFixed(1)} KB</span></div>
                    <div>Parser Hasil: <span className="text-emerald-400 font-bold">{data.probes.search.parserMatches} item</span></div>
                    <div>Sample: <span className="text-slate-200">{data.probes.search.sampleTitles?.join(', ') || '(kosong)'}</span></div>
                    <div>Latency: <span className="text-slate-200">{data.probes.search.durationMs} ms</span></div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Raw JSON Payload with Copy Button */}
          {data && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px] font-mono flex items-center gap-1">
                  <Terminal className="w-3 h-3 text-slate-400" />
                  JSON Payload Respons Diagnostic (/api/komikindo/diagnostic):
                </span>
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 rounded bg-[#1c1c2b] hover:bg-[#28283e] text-slate-300 text-[11px] flex items-center gap-1 cursor-pointer transition-all"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Tersalin' : 'Salin JSON'}</span>
                </button>
              </div>
              <pre className="p-3 bg-[#0a0a10] border border-[#1e1e2d] rounded-xl text-[10px] font-mono text-slate-300 overflow-x-auto max-h-52 custom-scrollbar">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-[#1c1c2b] bg-[#141422] flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Endpoint: <code className="text-[#ff5b14]">/api/komikindo/diagnostic?q=...</code>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#252538] hover:bg-[#32324a] text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
