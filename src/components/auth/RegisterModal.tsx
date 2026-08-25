import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Lock, 
  Eye, 
  EyeOff, 
  User, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  Sparkles,
  KeyRound,
  FileText
} from 'lucide-react';

export const RegisterModal: React.FC = () => {
  const { 
    isRegisterModalOpen, 
    closeRegisterModal, 
    pendingGoogleUser, 
    registerWithGoogle,
    openGoogleAuthModal
  } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize form when modal opens
  useEffect(() => {
    if (isRegisterModalOpen && pendingGoogleUser) {
      // Suggest clean username from email prefix
      const emailPrefix = (pendingGoogleUser.email.split('@')[0] || '')
        .toLowerCase()
        .replace(/[^a-z0-9_.-]/g, '');
      setUsername(emailPrefix);
      setDisplayName(pendingGoogleUser.displayName || emailPrefix);
      setPassword('');
      setConfirmPassword('');
      setBio('Penggemar Komik AntiTimpa');
      setErrorMessage(null);
      setIsLoading(false);
    }
  }, [isRegisterModalOpen, pendingGoogleUser]);

  if (!isRegisterModalOpen || !pendingGoogleUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      setErrorMessage('Username minimal 3 karakter.');
      return;
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      setErrorMessage('Username hanya boleh huruf, angka, titik (.), dan garis bawah (_).');
      return;
    }

    if (!password || password.length < 4) {
      setErrorMessage('Password minimal 4 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Konfirmasi password tidak cocok dengan password yang dimasukkan.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await registerWithGoogle(cleanUsername, password, {
        displayName: displayName.trim() || cleanUsername,
        avatar: pendingGoogleUser.photoURL,
        bio: bio.trim()
      });

      setIsLoading(false);
      if (!res.success) {
        setErrorMessage(res.message || 'Gagal mendaftarkan akun. Silakan coba lagi.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'Terjadi kesalahan sistem saat mendaftarkan akun.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-[#13131a] border border-[#2d2d40] rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#20202c] bg-[#161622]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#ff5b14] to-amber-500 flex items-center justify-center text-white shadow-lg shadow-[#ff5b14]/20">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white tracking-tight flex items-center gap-1.5">
                  <span>Registrasi Akun Aplikasi</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ff5b14]/20 text-[#ff5b14] font-bold">
                    Langkah Terakhir
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Lengkapi username & password untuk akses aplikasi
                </p>
              </div>
            </div>

            <button 
              onClick={closeRegisterModal}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Connected Google Account Badge */}
          <div className="mt-4 p-3 rounded-2xl bg-[#0f0f15] border border-[#252538] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <img 
                src={pendingGoogleUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(pendingGoogleUser.displayName)}&background=ff5b14&color=fff`} 
                alt={pendingGoogleUser.displayName} 
                className="w-9 h-9 rounded-full object-cover border border-emerald-500/40 shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-white truncate">
                    {pendingGoogleUser.displayName}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded shrink-0">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Google Terhubung
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  {pendingGoogleUser.email}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                closeRegisterModal();
                openGoogleAuthModal();
              }}
              className="text-[10px] text-slate-400 hover:text-white underline shrink-0 cursor-pointer font-medium"
            >
              Ganti
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-xs text-red-300 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Username Input */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Username Aplikasi <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <span className="font-bold text-sm text-[#ff5b14]">@</span>
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                placeholder="misal: eldorivaldo"
                className="w-full pl-9 pr-4 py-2.5 bg-[#0e0e14] border border-[#2d2d40] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14] focus:ring-1 focus:ring-[#ff5b14] transition-all font-mono"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Digunakan untuk login manual dan identitas komentar Anda di komik.
            </p>
          </div>

          {/* 2. Password Input */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Password Aplikasi <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 4 karakter"
                className="w-full pl-10 pr-10 py-2.5 bg-[#0e0e14] border border-[#2d2d40] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14] focus:ring-1 focus:ring-[#ff5b14] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 3. Confirm Password Input */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Konfirmasi Password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ketik ulang password"
                className={`w-full pl-10 pr-10 py-2.5 bg-[#0e0e14] border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition-all ${
                  confirmPassword && confirmPassword !== password 
                    ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500' 
                    : 'border-[#2d2d40] focus:border-[#ff5b14] focus:ring-[#ff5b14]'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && confirmPassword === password && (
              <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3 h-3" /> Password cocok
              </p>
            )}
          </div>

          {/* Optional Profile Customization Toggle */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowOptionalFields(!showOptionalFields)}
              className="text-[11px] text-[#ff5b14] hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>{showOptionalFields ? '▲ Sembunyikan Opsi Profil' : '▼ Sesuaikan Nama Tampilan & Bio'}</span>
            </button>

            {showOptionalFields && (
              <div className="mt-3 p-3.5 bg-[#0e0e14] border border-[#252538] rounded-2xl space-y-3 animate-in fade-in">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Nama Tampilan (Display Name)
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Nama lengkap atau panggilan"
                    className="w-full px-3 py-2 bg-[#161622] border border-[#2d2d40] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Bio Singkat
                  </label>
                  <input
                    type="text"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tulis status atau hobi komik Anda"
                    className="w-full px-3 py-2 bg-[#161622] border border-[#2d2d40] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 leading-relaxed flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Otomatis Tersimpan:</strong> Akun akan disimpan di database. Login berikutnya cukup 1-klik tombol <strong>Google</strong> atau login manual dengan <strong>Username & Password</strong> ini.
            </span>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || !username || !password || password !== confirmPassword}
              className="w-full py-3.5 bg-gradient-to-r from-[#ff5b14] to-[#f95700] hover:from-[#e04e0e] hover:to-[#df4a00] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#ff5b14]/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Mendaftarkan Akun ke Database...</span>
                </div>
              ) : (
                <>
                  <span>Simpan & Masuk ke Aplikasi</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
