import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  User as UserIcon, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  ShieldAlert, 
  HelpCircle, 
  MessageCircle, 
  Loader2, 
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Clock
} from 'lucide-react';

export const LoginModal: React.FC = () => {
  const navigate = useNavigate();
  const { 
    isLoginModalOpen, 
    closeLoginModal, 
    openGoogleAuthModal,
    login, 
    loginModalRedirectNotice, 
    systemSettings, 
    setIsAdminView 
  } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Anti-Bot / Human Verification State
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [isVerifyingCaptcha, setIsVerifyingCaptcha] = useState(false);
  const [captchaQuestion, setCaptchaQuestion] = useState<{ num1: number; num2: number; answer: number }>({ num1: 3, num2: 4, answer: 7 });
  const [userCaptchaInput, setUserCaptchaInput] = useState('');
  const [showChallenge, setShowChallenge] = useState(false);
  const [captchaError, setCaptchaError] = useState<string | null>(null);

  // Rate Limiting & Cooldown State (Anti-DDoS & Brute Force)
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [localFailedAttempts, setLocalFailedAttempts] = useState(0);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const cooldownTimerRef = useRef<any>(null);

  // Generate new math security challenge
  const generateNewCaptcha = () => {
    const n1 = Math.floor(Math.random() * 8) + 2; // 2 to 9
    const n2 = Math.floor(Math.random() * 8) + 1; // 1 to 8
    setCaptchaQuestion({ num1: n1, num2: n2, answer: n1 + n2 });
    setUserCaptchaInput('');
    setCaptchaError(null);
  };

  // Reset when modal opens
  useEffect(() => {
    if (isLoginModalOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
      setShowPassword(false);
      setIsLoading(false);
      setCaptchaVerified(false);
      setIsVerifyingCaptcha(false);
      setShowChallenge(false);
      generateNewCaptcha();
    }
  }, [isLoginModalOpen]);

  // Handle Cooldown Countdown Timer
  useEffect(() => {
    if (cooldownSeconds > 0) {
      cooldownTimerRef.current = setInterval(() => {
        setCooldownSeconds(prev => {
          if (prev <= 1) {
            clearInterval(cooldownTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, [cooldownSeconds]);

  // Click on "Saya bukan robot" checkbox
  const handleCaptchaCheckboxClick = () => {
    if (captchaVerified || cooldownSeconds > 0) return;
    setIsVerifyingCaptcha(true);
    setCaptchaError(null);

    // Short security inspection simulation before showing challenge or auto-clearing
    setTimeout(() => {
      setIsVerifyingCaptcha(false);
      setShowChallenge(true);
    }, 450);
  };

  // Submit Answer to Anti-Bot Challenge
  const handleVerifyCaptchaAnswer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = parseInt(userCaptchaInput.trim(), 10);
    if (val === captchaQuestion.answer) {
      setCaptchaVerified(true);
      setShowChallenge(false);
      setCaptchaError(null);
    } else {
      setCaptchaError('Jawaban keamanan tidak cocok. Coba lagi.');
      generateNewCaptcha();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownSeconds > 0) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanUsername = username.trim();
    const cleanPassword = password;

    if (!cleanUsername || !cleanPassword) {
      setErrorMessage('Silakan masukkan username dan password akun Anda.');
      return;
    }

    if (!captchaVerified) {
      setErrorMessage('Harap selesaikan verifikasi "Saya bukan robot" di bawah untuk melanjutkan.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(cleanUsername, cleanPassword);
      setIsLoading(false);

      if (result.success) {
        setSuccessMessage(result.message);
        setLocalFailedAttempts(0);
        closeLoginModal();
        setUsername('');
        setPassword('');
        setCaptchaVerified(false);
        if (cleanUsername.toLowerCase() === 'admin' || result.user?.role === 'admin') {
          setIsAdminView(true);
          navigate('/admin');
        }
      } else {
        const nextFailed = localFailedAttempts + 1;
        setLocalFailedAttempts(nextFailed);
        setErrorMessage(result.message);
        
        // Reset captcha on failed login to prevent script looping
        setCaptchaVerified(false);
        generateNewCaptcha();

        // If failed multiple times, trigger a temporary 45-60s anti-brute force cooldown
        if (nextFailed >= (systemSettings.maxLoginAttempts || 3)) {
          setCooldownSeconds(60);
        }
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'Gagal masuk. Silakan coba lagi.');
      setCaptchaVerified(false);
      generateNewCaptcha();
    }
  };

  if (!isLoginModalOpen) return null;

  const maxAttempts = systemSettings.maxLoginAttempts || 3;
  const remainingAttempts = Math.max(0, maxAttempts - localFailedAttempts);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-[#13131a] border border-[#272736] rounded-3xl shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Top Bar */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#20202c]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#ff5b14] to-[#d84605] flex items-center justify-center text-white shadow-lg shadow-[#ff5b14]/25">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white tracking-tight">
                Masuk ke Akun
              </h3>
              <p className="text-[11px] text-slate-400">
                Akses akun pembaca dan panel admin AntiTimpa
              </p>
            </div>
          </div>

          <button 
            onClick={closeLoginModal}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Redirect Notice */}
        {loginModalRedirectNotice && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>{loginModalRedirectNotice}</p>
          </div>
        )}

        {/* Form Container */}
        <div className="p-6 space-y-4">
          {/* Rate Limiting Active Alert */}
          {cooldownSeconds > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center gap-3 text-xs text-amber-200 animate-in fade-in">
              <Clock className="w-5 h-5 text-amber-400 shrink-0 animate-spin" />
              <div>
                <p className="font-bold text-amber-300">Batas Percobaan Terlampaui</p>
                <p className="mt-0.5">
                  Sistem mendeteksi aktivitas berulang. Harap tunggu <strong className="text-amber-100 font-mono text-sm">{cooldownSeconds} detik</strong> sebelum mencoba lagi.
                </p>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {errorMessage && cooldownSeconds === 0 && (
            <div className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-200 animate-in fade-in">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-red-300">Pemberitahuan Keamanan</p>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-red-500/20 text-red-200">
                    Sisa Percobaan: {remainingAttempts}/{maxAttempts}
                  </span>
                </div>
                <p className="mt-1 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Success Alert */}
          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-200 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="font-semibold">{successMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Username Input */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username akun Anda..."
                  disabled={cooldownSeconds > 0 || isLoading}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full pl-3.5 pr-10 py-3 bg-[#171724] border border-[#27273a] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14] transition-colors disabled:opacity-50"
                  required
                />
                <UserIcon className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
            </div>

            {/* 2. Password Input */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={cooldownSeconds > 0 || isLoading}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full pl-3.5 pr-12 py-3 bg-[#171724] border border-[#27273a] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14] transition-colors disabled:opacity-50"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-3 top-3 p-1 text-slate-400 hover:text-white rounded cursor-pointer transition-colors"
                  title={showPassword ? "Sembunyikan password" : "Lihat password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                </button>
              </div>
            </div>

            {/* 3. VERIFIKASI "SAYA BUKAN ROBOT" (ANTI-BOT & DDoS PROTECTION WIDGET) */}
            <div className="p-3.5 bg-[#161622] rounded-2xl border border-[#27273a] space-y-2.5">
              <div className="flex items-center justify-between">
                <div 
                  onClick={handleCaptchaCheckboxClick}
                  className={`flex items-center gap-3 select-none cursor-pointer transition-all ${
                    cooldownSeconds > 0 ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  {/* Custom Checkbox Box */}
                  <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                    captchaVerified 
                      ? 'bg-emerald-500 border-emerald-400 text-white shadow-md shadow-emerald-500/20'
                      : isVerifyingCaptcha 
                      ? 'bg-[#1e1e2d] border-[#ff5b14]' 
                      : 'bg-[#101018] border-[#36364d] hover:border-[#ff5b14]'
                  }`}>
                    {captchaVerified ? (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    ) : isVerifyingCaptcha ? (
                      <Loader2 className="w-3.5 h-3.5 text-[#ff5b14] animate-spin" />
                    ) : null}
                  </div>

                  <span className="text-xs font-semibold text-slate-200">
                    {captchaVerified ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" />
                        Terverifikasi Manusia
                      </span>
                    ) : (
                      'Saya bukan robot'
                    )}
                  </span>
                </div>

                {/* Anti-Bot Badge */}
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                    <ShieldCheck className="w-3 h-3 text-[#ff5b14]" />
                    <span>Anti-Bot</span>
                  </div>
                  <span className="text-[8px] text-slate-400">Proteksi Server</span>
                </div>
              </div>

              {/* Interactive Security Challenge Box */}
              {showChallenge && !captchaVerified && (
                <div className="pt-2 border-t border-[#252538] animate-in fade-in space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span className="font-semibold">
                      Berapakah hasil: <strong className="text-white text-xs bg-white/10 px-2 py-0.5 rounded font-mono">{captchaQuestion.num1} + {captchaQuestion.num2}</strong> = ?
                    </span>
                    <button
                      type="button"
                      onClick={generateNewCaptcha}
                      className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/5 cursor-pointer"
                      title="Ganti Pertanyaan"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={userCaptchaInput}
                      onChange={(e) => setUserCaptchaInput(e.target.value)}
                      placeholder="Ketik angka..."
                      className="flex-1 px-3 py-1.5 bg-[#0e0e14] border border-[#2d2d42] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleVerifyCaptchaAnswer();
                        }
                      }}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleVerifyCaptchaAnswer}
                      className="px-3 py-1.5 bg-[#ff5b14] hover:bg-[#e04e0e] text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                    >
                      Verifikasi
                    </button>
                  </div>

                  {captchaError && (
                    <p className="text-[10px] text-red-400 font-medium">{captchaError}</p>
                  )}
                </div>
              )}
            </div>

            {/* 4. Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !captchaVerified || cooldownSeconds > 0}
              className="w-full py-3.5 bg-gradient-to-r from-[#ff5b14] to-[#f95700] hover:from-[#e04e0e] hover:to-[#df4a00] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#ff5b14]/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Memverifikasi Akun...</span>
                </div>
              ) : cooldownSeconds > 0 ? (
                <span>Tunggu ({cooldownSeconds}s)</span>
              ) : !captchaVerified ? (
                <span>Centang "Saya bukan robot" untuk Masuk</span>
              ) : (
                <>
                  <span>Masuk Sekarang</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Google Sign In Alternative */}
            <div className="pt-2">
              <div className="relative flex items-center justify-center mb-3">
                <div className="border-t border-[#252536] w-full absolute" />
                <span className="bg-[#13131a] px-3 text-[10px] uppercase tracking-wider text-slate-500 font-bold relative">
                  atau
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  closeLoginModal();
                  openGoogleAuthModal();
                }}
                className="w-full py-3 bg-[#181824] hover:bg-[#202030] border border-[#2d2d40] hover:border-slate-500 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2.5 cursor-pointer transition-all shadow-md"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Masuk dengan Akun Google</span>
              </button>
            </div>
          </form>
        </div>

        {/* Footer Support Info */}
        <div className="px-6 py-3.5 bg-[#0d0d12] border-t border-[#20202c] flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>Belum punya akun / Lupa password?</span>
          </span>
          <a
            href={`https://wa.me/${systemSettings?.adminPhone?.replace(/[^0-9]/g, '') || '6289514441988'}?text=Halo%20Admin%20AntiTimpa,%20saya%20ingin%20mendaftar/bantuan%20akun%20pembaca.`}
            target="_blank"
            rel="noreferrer"
            className="text-emerald-400 hover:underline font-bold flex items-center gap-1"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Hubungi Admin</span>
          </a>
        </div>
      </div>
    </div>
  );
};
