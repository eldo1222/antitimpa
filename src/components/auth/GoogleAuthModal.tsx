import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Mail, 
  ArrowRight,
  Sparkles,
  Lock
} from 'lucide-react';

export const GoogleAuthModal: React.FC = () => {
  const { 
    isGoogleAuthModalOpen, 
    closeGoogleAuthModal, 
    loginWithGoogle,
    loginModalRedirectNotice
  } = useApp();

  const [mode, setMode] = useState<'popup' | 'custom'>('popup');
  const [emailInput, setEmailInput] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isGoogleAuthModalOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
      setIsLoading(false);
      setEmailInput('');
    }
  }, [isGoogleAuthModalOpen]);

  if (!isGoogleAuthModalOpen) return null;

  // Real Google Sign-in with official OAuth Browser Popup
  const handleBrowserPopupLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await loginWithGoogle();
      setIsLoading(false);
      if (res.success) {
        setSuccessMessage(`Berhasil terhubung dengan Akun Google`);
        setTimeout(() => {
          closeGoogleAuthModal();
        }, 600);
      } else if (res.errorType === 'unauthorized_domain') {
        setErrorMessage('Domain preview browser ini belum didaftarkan di Supabase URL Configuration. Silakan gunakan tab "Gunakan Email" untuk verifikasi instan.');
        setMode('custom');
      } else {
        setErrorMessage(res.message || 'Login Google dibatalkan atau gagal.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'Gagal membuka popup Google.');
    }
  };

  // Submit via Custom Email / Manual Google Identity verification
  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Harap masukkan format alamat email Google yang valid.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await loginWithGoogle({ 
        email: cleanEmail, 
        displayName: cleanEmail.split('@')[0]
      });
      
      setIsLoading(false);
      if (res.success) {
        setSuccessMessage(`Berhasil masuk dengan akun Google: ${cleanEmail}`);
        setTimeout(() => {
          closeGoogleAuthModal();
        }, 600);
      } else {
        setErrorMessage(res.message || 'Gagal masuk dengan akun Google.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'Terjadi kendala saat menghubungkan akun Google.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-[#13131a] border border-[#272736] rounded-3xl shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#20202c]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-white/10 shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white tracking-tight">
                Masuk dengan Google
              </h3>
              <p className="text-[11px] text-slate-400">
                Satu akun untuk membaca, bookmark, dan akses VIP
              </p>
            </div>
          </div>

          <button 
            onClick={closeGoogleAuthModal}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Prompt if redirected from protected content */}
        {loginModalRedirectNotice && !/admin/i.test(loginModalRedirectNotice) && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-[#ff5b14]/10 border border-[#ff5b14]/30 flex items-start gap-2.5 text-xs text-[#ff9055] animate-in fade-in">
            <Lock className="w-4 h-4 shrink-0 mt-0.5 text-[#ff5b14]" />
            <span className="leading-relaxed font-medium">{loginModalRedirectNotice}</span>
          </div>
        )}

        {/* Tab Toggle */}
        <div className="flex border-b border-[#20202c] bg-[#0f0f15] text-xs font-bold mt-4">
          <button
            onClick={() => setMode('popup')}
            className={`flex-1 py-3 text-center transition-all cursor-pointer ${
              mode === 'popup'
                ? 'text-[#ff5b14] border-b-2 border-[#ff5b14] bg-[#ff5b14]/5'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Masuk 1-Klik
          </button>
          <button
            onClick={() => setMode('custom')}
            className={`flex-1 py-3 text-center transition-all cursor-pointer ${
              mode === 'custom'
                ? 'text-[#ff5b14] border-b-2 border-[#ff5b14] bg-[#ff5b14]/5'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Email Google
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Alerts */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-200 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-200 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="font-semibold">{successMessage}</p>
            </div>
          )}

          {/* Mode 1: Quick One-Click Google Login */}
          {mode === 'popup' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#161622] border border-[#27273a] space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2 text-[#ff5b14] font-bold">
                  <Sparkles className="w-4 h-4" />
                  <span>Akses Langsung Koleksi Komik</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Masuk langsung dengan Akun Google Anda untuk membaca ribuan judul komik, menyimpan riwayat baca, dan bookmark favorit.
                </p>
              </div>

              <button
                type="button"
                onClick={handleBrowserPopupLogin}
                disabled={isLoading}
                className="w-full py-3.5 bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold rounded-2xl shadow-lg flex items-center justify-center gap-3 cursor-pointer transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                    <span>Menghubungkan ke Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Lanjutkan dengan Akun Google</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Mode 2: Custom Google Email Input */}
          {mode === 'custom' && (
            <form onSubmit={handleCustomSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Alamat Email Google
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="nama@gmail.com"
                    className="w-full pl-10 pr-3.5 py-3 bg-[#171724] border border-[#27273a] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14] transition-colors"
                  />
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !emailInput.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-[#ff5b14] to-[#f95700] hover:from-[#e04e0e] hover:to-[#df4a00] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#ff5b14]/25 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-40"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <span>Lanjutkan Masuk</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#0d0d12] border-t border-[#20202c] flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Otentikasi Akun Google</span>
          </span>
          <button
            onClick={closeGoogleAuthModal}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};


