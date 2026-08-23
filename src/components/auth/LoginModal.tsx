import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Lock, 
  User as UserIcon, 
  ShieldCheck, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  KeyRound,
  Clock,
  ArrowRight,
  ShieldAlert,
  RefreshCw,
  Send,
  HelpCircle
} from 'lucide-react';

export const LoginModal: React.FC = () => {
  const { 
    isLoginModalOpen, 
    closeLoginModal, 
    login, 
    loginModalRedirectNotice,
    systemSettings,
    setIsAdminView
  } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [codeCountdown, setCodeCountdown] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Timer for verification code expiry (60 seconds countdown)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (codeCountdown > 0) {
      timer = setTimeout(() => setCodeCountdown(prev => prev - 1), 1000);
    } else if (codeCountdown === 0 && generatedCode) {
      setGeneratedCode(null);
    }
    return () => clearTimeout(timer);
  }, [codeCountdown, generatedCode]);

  if (!isLoginModalOpen) return null;

  const handleRequestCode = () => {
    // Generate 4-digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedCode(code);
    setCodeCountdown(60); // 60s validity
    setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setRemainingAttempts(null);

    if (!username.trim() || !password) {
      setErrorMessage('Silakan isi username dan password Anda.');
      return;
    }

    if (!generatedCode) {
      setErrorMessage('Silakan klik tombol "Minta Kode Verifikasi" terlebih dahulu.');
      return;
    }

    if (verificationCode.trim() !== generatedCode) {
      setErrorMessage('Kode verifikasi tidak sesuai atau sudah kadaluarsa. Silakan minta kode baru.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const result = login(username, password);
      setIsLoading(false);

      if (result.success) {
        setSuccessMessage(result.message);
        setTimeout(() => {
          closeLoginModal();
          setUsername('');
          setPassword('');
          setVerificationCode('');
          setGeneratedCode(null);
          setErrorMessage(null);
          setSuccessMessage(null);

          // If role is admin, open admin dashboard automatically
          if (username.trim().toLowerCase() === 'admin') {
            setIsAdminView(true);
          }
        }, 700);
      } else {
        setErrorMessage(result.message);
        if (result.remainingAttempts !== undefined) {
          setRemainingAttempts(result.remainingAttempts);
        }
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-[#131318] border border-[#272732] rounded-2xl shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Strip */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#22222d]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff5b14] to-[#e03d00] flex items-center justify-center text-white shadow-lg shadow-[#ff5b14]/20">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">
                Masuk ke {systemSettings?.siteName || 'AntiTimpa'}
              </h3>
              <p className="text-xs text-slate-400">Gunakan akun Anda untuk membuka akses komik</p>
            </div>
          </div>
          <button 
            onClick={closeLoginModal}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Redirect notice if triggered from locked reader */}
        {loginModalRedirectNotice && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>{loginModalRedirectNotice}</p>
          </div>
        )}

        {/* Single Unified Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-200 animate-in fade-in">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-300">Gagal Masuk</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <p>{successMessage}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username Anda..."
                className="w-full px-3.5 py-2.5 bg-[#191922] border border-[#2b2b3b] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14] transition-colors"
                required
              />
              <UserIcon className="absolute right-3.5 top-3 w-4 h-4 text-slate-500" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300">
                Password
              </label>
              <span className="text-[11px] text-slate-500">Maks. 3x salah</span>
            </div>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-[#191922] border border-[#2b2b3b] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14] transition-colors"
                required
              />
              <Lock className="absolute right-3.5 top-3 w-4 h-4 text-slate-500" />
            </div>
          </div>

          {/* Verification Code / Anti-Bot Security Flow */}
          <div className="p-3.5 bg-[#161622] rounded-xl border border-[#262638] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#ff5b14]" />
                <span>Kode Verifikasi Sesi</span>
              </label>
              {generatedCode && codeCountdown > 0 ? (
                <span className="text-[11px] text-amber-400 font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Berlaku: {codeCountdown}s
                </span>
              ) : (
                <span className="text-[11px] text-slate-500">Wajib minta kode</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                maxLength={4}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder={generatedCode ? `Ketik "${generatedCode}"` : "Minta kode dulu"}
                disabled={!generatedCode}
                className="flex-1 px-3 py-2 bg-[#101018] border border-[#2c2c40] rounded-xl text-sm font-mono text-center tracking-widest text-white placeholder-slate-600 focus:outline-none focus:border-[#ff5b14] disabled:opacity-50"
              />

              <button
                type="button"
                onClick={handleRequestCode}
                className="px-3.5 py-2 bg-[#252538] hover:bg-[#303048] text-slate-200 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
              >
                {generatedCode ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-[#ff5b14]" />
                    <span>Minta Baru</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-[#ff5b14]" />
                    <span>Minta Kode</span>
                  </>
                )}
              </button>
            </div>

            {generatedCode ? (
              <div className="p-2 bg-[#1e1e2e] rounded-lg border border-[#32324a] flex items-center justify-between text-xs">
                <span className="text-slate-400">Kode Keamanan Anda:</span>
                <span className="font-mono font-black text-emerald-400 text-sm tracking-widest px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/30">
                  {generatedCode}
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">
                Tekan tombol <strong className="text-slate-300">Minta Kode</strong> untuk mengambil token sesi aktif agar tidak kadaluarsa.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-lg transition-all bg-gradient-to-r from-[#ff5b14] to-[#f95700] hover:opacity-90 shadow-[#ff5b14]/25"
          >
            {isLoading ? (
              <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Masuk Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Support Info */}
        <div className="px-6 py-3.5 bg-[#0d0d12] border-t border-[#20202c] flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>Butuh bantuan / aktivasi akun pembaca?</span>
          </span>
          <a
            href={`https://wa.me/${systemSettings?.adminPhone?.replace(/[^0-9]/g, '') || '6289514441988'}?text=Halo%20Admin%20AntiTimpa,%20saya%20butuh%20bantuan%20akun%20pembaca.`}
            target="_blank"
            rel="noreferrer"
            className="text-emerald-400 hover:underline font-bold flex items-center gap-1"
          >
            <span>Hubungi WA Admin</span>
          </a>
        </div>
      </div>
    </div>
  );
};
