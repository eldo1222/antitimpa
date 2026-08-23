import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  private handleClearStorageAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error(e);
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div 
          id="error-boundary-screen" 
          className="min-h-screen w-full bg-[#07070a] text-slate-100 flex flex-col items-center justify-center p-6 text-center"
        >
          <div className="w-full max-w-md bg-[#12121a] border border-[#27273a] rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">Terjadi Kendala Tampilan</h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Sistem mendeteksi kendala pada halaman ini. Anda dapat menyegarkan halaman atau kembali ke beranda.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-[#181824] rounded-xl text-left border border-[#242436] overflow-x-auto max-h-28">
                <p className="text-[11px] font-mono text-rose-300">
                  {this.state.error.message || 'Unknown render error'}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={this.handleReset}
                className="w-full py-2.5 bg-[#ff5b14] hover:bg-[#e04e0e] text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Muat Ulang Halaman</span>
              </button>

              <button
                onClick={this.handleClearStorageAndReload}
                className="w-full py-2 bg-[#181826] hover:bg-[#222234] border border-[#2b2b3e] text-slate-300 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Reset Cache &amp; Buka Beranda</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
