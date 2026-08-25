import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  XCircle, 
  X 
} from 'lucide-react';

export const AdminToastContainer: React.FC = () => {
  const { adminToasts, removeAdminToast } = useApp();

  if (!adminToasts || adminToasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {adminToasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isWarning = toast.type === 'warning';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto w-full p-4 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all animate-toast-slide flex items-start gap-3.5 ${
              isSuccess
                ? 'bg-[#121b16]/95 border-emerald-500/40 text-emerald-100 shadow-emerald-950/40'
                : isWarning
                ? 'bg-[#1e170f]/95 border-amber-500/40 text-amber-100 shadow-amber-950/40'
                : isError
                ? 'bg-[#201013]/95 border-red-500/40 text-red-100 shadow-red-950/40'
                : 'bg-[#13131f]/95 border-blue-500/40 text-blue-100 shadow-blue-950/40'
            }`}
          >
            {/* Status Icon */}
            <div className="shrink-0 mt-0.5">
              {isSuccess && (
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
              {isWarning && (
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              )}
              {isError && (
                <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
                  <XCircle className="w-4 h-4" />
                </div>
              )}
              {!isSuccess && !isWarning && !isError && (
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Info className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-extrabold tracking-tight text-white truncate">
                  {toast.title}
                </h4>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-slate-300 font-mono">
                  Sistem
                </span>
              </div>
              {toast.message && (
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed line-clamp-2">
                  {toast.message}
                </p>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={() => removeAdminToast(toast.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
