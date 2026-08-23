import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Settings, 
  Shield, 
  Lock, 
  Sliders, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Server, 
  RefreshCw, 
  Phone, 
  MessageSquare, 
  Image, 
  Upload, 
  KeyRound, 
  AlertTriangle 
} from 'lucide-react';

export const AdminSettingsTab: React.FC = () => {
  const { systemSettings, updateSettings, currentUser, changeAdminPassword } = useApp();

  const [siteName, setSiteName] = useState(systemSettings.siteName || 'AntiTimpa');
  const [siteLogo, setSiteLogo] = useState(systemSettings.siteLogo || '');
  const [siteFavicon, setSiteFavicon] = useState(systemSettings.siteFavicon || '');
  const [adminPhone, setAdminPhone] = useState(systemSettings.adminPhone || '089514441988');
  const [tiktokUrl, setTiktokUrl] = useState(systemSettings.tiktokUrl || 'https://www.tiktok.com/@anti.timpa');
  const [tiktokHandle, setTiktokHandle] = useState(systemSettings.tiktokHandle || '@anti.timpa');
  const [maintenanceMode, setMaintenanceMode] = useState(systemSettings.maintenanceMode);
  const [maxFailedAttempts, setMaxFailedAttempts] = useState(systemSettings.maxFailedAttempts || 3);
  const [allowGuestPreview, setAllowGuestPreview] = useState(systemSettings.allowGuestPreview);
  const [guestPreviewPages, setGuestPreviewPages] = useState(systemSettings.guestPreviewPages || 2);
  const [watermarkText, setWatermarkText] = useState(systemSettings.watermarkText || 'AntiTimpa Digital Reader');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Admin Password Change State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (type === 'logo') {
          setSiteLogo(result);
        } else {
          setSiteFavicon(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      siteName,
      siteLogo,
      siteFavicon,
      adminPhone,
      tiktokUrl,
      tiktokHandle,
      maintenanceMode,
      maxFailedAttempts: Number(maxFailedAttempts),
      allowGuestPreview,
      guestPreviewPages: Number(guestPreviewPages),
      watermarkText
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!oldPassword.trim()) {
      setPasswordError('Silakan masukkan password akun Admin saat ini.');
      return;
    }

    if (!newPassword.trim()) {
      setPasswordError('Silakan tentukan password baru.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password baru minimal 6 karakter demi standar keamanan.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi password baru tidak sama! Harap pastikan kedua kolom password baru identik.');
      return;
    }

    setIsChangingPassword(true);

    setTimeout(() => {
      setIsChangingPassword(false);
      const res = changeAdminPassword(oldPassword, newPassword);
      if (res.success) {
        setPasswordSuccess(res.message);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordSuccess(null), 4000);
      } else {
        setPasswordError(res.message);
      }
    }, 400);
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header Bar */}
      <div className="pb-3 border-b border-[#1c1c2a]">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Settings className="w-4 h-4 text-[#ff5b14]" />
          <span>Pengaturan Sistem &amp; Kredensial Platform</span>
        </h2>
        <p className="text-xs text-slate-400">
          Konfigurasi nama situs, logo, parameter keamanan 3-strike, batasan pembaca, dan ganti kata sandi akun Admin
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Pengaturan sistem berhasil diperbarui dan diterapkan ke seluruh platform.</span>
        </div>
      )}

      {/* Main Grid: 2 Columns on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* LEFT COLUMN: Identity & Brand Settings */}
        <form onSubmit={handleSave} className="space-y-5 text-xs">
          <div className="p-5 bg-[#12121a] rounded-2xl border border-[#1f1f2e] space-y-4 shadow-sm">
            <h3 className="font-bold text-white text-xs flex items-center gap-2 pb-2 border-b border-[#1d1d2c]">
              <Sliders className="w-4 h-4 text-[#ff5b14]" />
              <span>Identitas Platform &amp; Kontak Admin</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Nama Situs / Platform</label>
                <input
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="w-full p-2 bg-[#181824] border border-[#27273a] rounded-xl text-white font-bold text-xs focus:border-[#ff5b14] focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">WhatsApp Admin Support</label>
                <div className="relative">
                  <input
                    type="text"
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value)}
                    placeholder="089514441988"
                    className="w-full p-2 pl-8 bg-[#181824] border border-[#27273a] rounded-xl text-white font-mono text-xs focus:border-[#ff5b14] focus:outline-none"
                  />
                  <Phone className="w-3.5 h-3.5 text-emerald-400 absolute left-2.5 top-2.5" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Handle / Username TikTok</label>
                <input
                  type="text"
                  value={tiktokHandle}
                  onChange={(e) => setTiktokHandle(e.target.value)}
                  placeholder="@anti.timpa"
                  className="w-full p-2 bg-[#181824] border border-[#27273a] rounded-xl text-white font-mono text-xs focus:border-[#ff5b14] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">URL Akun TikTok</label>
                <input
                  type="url"
                  value={tiktokUrl}
                  onChange={(e) => setTiktokUrl(e.target.value)}
                  placeholder="https://www.tiktok.com/@anti.timpa"
                  className="w-full p-2 bg-[#181824] border border-[#27273a] rounded-xl text-white font-mono text-xs focus:border-[#ff5b14] focus:outline-none"
                />
              </div>
            </div>

            {/* Logo & Favicon Upload Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {/* Favicon Setting */}
              <div className="p-3.5 bg-[#181824] rounded-xl border border-[#27273a] space-y-2">
                <label className="block text-slate-300 font-semibold flex items-center justify-between">
                  <span>Favicon / Ikon</span>
                  {siteFavicon && (
                    <button 
                      type="button" 
                      onClick={() => setSiteFavicon('')} 
                      className="text-[10px] text-red-400 hover:underline cursor-pointer"
                    >
                      Hapus
                    </button>
                  )}
                </label>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#0e0e16] border border-[#2e2e42] flex items-center justify-center overflow-hidden shrink-0">
                    {siteFavicon ? (
                      <img src={siteFavicon} alt="Favicon Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-extrabold text-[#ff5b14]">AT</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={siteFavicon}
                      onChange={(e) => setSiteFavicon(e.target.value)}
                      placeholder="URL favicon atau upload..."
                      className="w-full p-1.5 bg-[#12121c] border border-[#242436] rounded-lg text-[11px] text-white placeholder-slate-500 mb-1.5 focus:outline-none"
                    />
                    <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#242436] hover:bg-[#2e2e44] text-[10px] text-slate-300 font-semibold transition-colors">
                      <Upload className="w-3 h-3 text-[#ff5b14]" />
                      <span>Upload Favicon</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'favicon')}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Logo Setting */}
              <div className="p-3.5 bg-[#181824] rounded-xl border border-[#27273a] space-y-2">
                <label className="block text-slate-300 font-semibold flex items-center justify-between">
                  <span>Logo Utama Header</span>
                  {siteLogo && (
                    <button 
                      type="button" 
                      onClick={() => setSiteLogo('')} 
                      className="text-[10px] text-red-400 hover:underline cursor-pointer"
                    >
                      Hapus
                    </button>
                  )}
                </label>

                <div className="flex items-center gap-3">
                  <div className="w-14 h-10 rounded-lg bg-[#0e0e16] border border-[#2e2e42] flex items-center justify-center overflow-hidden shrink-0">
                    {siteLogo ? (
                      <img src={siteLogo} alt="Logo Preview" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-[10px] font-bold text-slate-500">Teks Saja</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={siteLogo}
                      onChange={(e) => setSiteLogo(e.target.value)}
                      placeholder="URL gambar logo..."
                      className="w-full p-1.5 bg-[#12121c] border border-[#242436] rounded-lg text-[11px] text-white placeholder-slate-500 mb-1.5 focus:outline-none"
                    />
                    <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#242436] hover:bg-[#2e2e44] text-[10px] text-slate-300 font-semibold transition-colors">
                      <Upload className="w-3 h-3 text-[#ff5b14]" />
                      <span>Upload Logo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'logo')}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Watermark / Hak Cipta Reader</label>
              <input
                type="text"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                className="w-full p-2 bg-[#181824] border border-[#27273a] rounded-xl text-white text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Reader Access & Maintenance Rules */}
          <div className="p-5 bg-[#12121a] rounded-2xl border border-[#1f1f2e] space-y-4 shadow-sm">
            <h3 className="font-bold text-white text-xs flex items-center gap-2 pb-2 border-b border-[#1d1d2c]">
              <Lock className="w-4 h-4 text-purple-400" />
              <span>Proteksi Bab &amp; Mode Server</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Batas Maksimal Gagal Login</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={maxFailedAttempts}
                  onChange={(e) => setMaxFailedAttempts(Number(e.target.value))}
                  className="w-full p-2 bg-[#181824] border border-[#27273a] rounded-xl text-white font-bold text-xs focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Akun terkunci otomatis setelah {maxFailedAttempts}x salah password berturut-turut.
                </p>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Mode Pemeliharaan (Maintenance)</label>
                <button
                  type="button"
                  onClick={() => setMaintenanceMode(prev => !prev)}
                  className={`w-full p-2 rounded-xl font-bold flex items-center justify-between transition-colors cursor-pointer text-xs ${
                    maintenanceMode ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-[#181824] border border-[#27273a] text-slate-400'
                  }`}
                >
                  <span>{maintenanceMode ? '⚠️ Maintenance Aktif' : 'Platform Berjalan Normal'}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-black/40">Ubah</span>
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#ff5b14] hover:bg-[#e04e0e] text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Simpan Seluruh Pengaturan Sistem</span>
          </button>
        </form>

        {/* RIGHT COLUMN: Admin Password Change Card */}
        <div className="p-5 bg-[#12121a] rounded-2xl border border-red-500/20 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1f1f2e]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-white text-xs">Ganti Password Akun Super Admin</h3>
                <p className="text-[11px] text-slate-400">
                  Akun aktif: <strong className="text-red-400 font-mono">{currentUser?.username || 'admin'}</strong>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPasswordText(prev => !prev)}
              className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 px-2.5 py-1 bg-[#1a1a26] border border-[#2c2c40] rounded-lg transition-colors cursor-pointer"
            >
              {showPasswordText ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
              <span>{showPasswordText ? 'Sembunyikan' : 'Lihat Input'}</span>
            </button>
          </div>

          {passwordError && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-200 flex items-start gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Password Saat Ini (Lama)</label>
              <input
                type={showPasswordText ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Ketik password lama akun admin..."
                className="w-full p-2 bg-[#181824] border border-[#27273a] rounded-xl text-white font-mono text-xs focus:border-red-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Password Baru (Min. 6 Karakter)</label>
              <input
                type={showPasswordText ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter..."
                className="w-full p-2 bg-[#181824] border border-[#27273a] rounded-xl text-white font-mono text-xs focus:border-red-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Ulangi Password Baru</label>
              <input
                type={showPasswordText ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Konfirmasi password baru..."
                className="w-full p-2 bg-[#181824] border border-[#27273a] rounded-xl text-white font-mono text-xs focus:border-red-500 focus:outline-none"
                required
              />
            </div>

            <div className="p-3 bg-[#181824] rounded-xl border border-[#242436] text-[11px] text-slate-400 leading-relaxed">
              💡 <strong>Standar Keamanan ISO/IEC 27001</strong>: Setelah kata sandi diperbarui, sesi lama akan otomatis divalidasi dengan kredensial baru. Harap catat atau simpan kata sandi baru Anda di pengelola kata sandi aman.
            </div>

            <button
              type="submit"
              disabled={isChangingPassword}
              className="w-full py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
            >
              {isChangingPassword ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Update Password Admin</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
