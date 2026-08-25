import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  Upload, 
  Image as ImageIcon, 
  Camera, 
  Check, 
  ShieldCheck, 
  KeyRound, 
  Mail, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  FileText,
  Clock,
  LogOut,
  HelpCircle
} from 'lucide-react';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: any;
  defaultTab?: 'profile' | 'password' | 'account';
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
];

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  targetUser,
  defaultTab = 'profile'
}) => {
  const { 
    currentUser, 
    updateUserProfile, 
    changeUserPassword, 
    logout,
    googleUser 
  } = useApp();

  const user = targetUser || currentUser;

  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'account'>(defaultTab);

  // Profile Fields State
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || PRESET_AVATARS[0]);
  const [displayName, setDisplayName] = useState(user?.displayName || user?.username || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');

  // Password Fields State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Avatar Upload / Source State
  const [avatarSourceMode, setAvatarSourceMode] = useState<'presets' | 'upload' | 'url'>('presets');
  const [customUrlInput, setCustomUrlInput] = useState('');

  // Status & Feedback State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && user) {
      setAvatarUrl(user.avatar || PRESET_AVATARS[0]);
      setDisplayName(user.displayName || user.username || '');
      setUsername(user.username || '');
      setBio(user.bio || '');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setErrorMessage(null);
      setSuccessMessage(null);
      setIsLoading(false);
      setActiveTab(defaultTab);
    }
  }, [isOpen, user, defaultTab]);

  if (!isOpen || !user) return null;

  // Handle image file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        setErrorMessage('Ukuran gambar maksimal 3 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAvatarUrl(event.target.result as string);
          setErrorMessage(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Save Profile Info
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const res = await updateUserProfile(user.id, {
        avatar: avatarUrl,
        displayName: displayName.trim() || username,
        username: username.trim().toLowerCase(),
        bio: bio.trim()
      });

      setIsLoading(false);
      if (res && !res.success) {
        setErrorMessage(res.message);
      } else {
        setSuccessMessage('Profil berhasil diperbarui!');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'Gagal menyimpan profil.');
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!newPassword || newPassword.length < 4) {
      setErrorMessage('Password baru minimal 4 karakter.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('Konfirmasi password tidak cocok dengan password baru.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await changeUserPassword(user.id, currentPassword, newPassword);
      setIsLoading(false);

      if (res.success) {
        setSuccessMessage('Password berhasil diubah!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'Gagal mengubah password.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-[#13131a] border border-[#2d2d40] rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#20202c] bg-[#161622]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#ff5b14] to-amber-500 flex items-center justify-center text-white shadow-lg shadow-[#ff5b14]/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white tracking-tight">
                Pengaturan Akun & Profil
              </h3>
              <p className="text-[11px] text-slate-400">
                Kelola foto avatar, identitas, dan keamanan akun Anda
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#20202c] bg-[#0f0f15] text-xs font-bold">
          <button
            type="button"
            onClick={() => { setActiveTab('profile'); setErrorMessage(null); setSuccessMessage(null); }}
            className={`flex-1 py-3 text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'profile'
                ? 'text-[#ff5b14] border-b-2 border-[#ff5b14] bg-[#ff5b14]/5'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Foto & Profil</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('password'); setErrorMessage(null); setSuccessMessage(null); }}
            className={`flex-1 py-3 text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'password'
                ? 'text-[#ff5b14] border-b-2 border-[#ff5b14] bg-[#ff5b14]/5'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Ganti Password</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('account'); setErrorMessage(null); setSuccessMessage(null); }}
            className={`flex-1 py-3 text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'account'
                ? 'text-[#ff5b14] border-b-2 border-[#ff5b14] bg-[#ff5b14]/5'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Info Akun</span>
          </button>
        </div>

        {/* Alerts */}
        {(errorMessage || successMessage) && (
          <div className="px-6 pt-4 pb-0">
            {errorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 text-xs text-red-300 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2 text-xs text-emerald-300 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}
          </div>
        )}

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: PROFILE & AVATAR */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Avatar Preview & Source Selector */}
              <div className="p-4 bg-[#0e0e14] border border-[#252538] rounded-2xl space-y-3">
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <img 
                      src={avatarUrl} 
                      alt="Avatar Preview" 
                      className="w-16 h-16 rounded-full object-cover border-2 border-[#ff5b14] ring-2 ring-[#ff5b14]/20 shadow-md"
                      referrerPolicy="no-referrer"
                    />
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                      title="Unggah Foto Baru"
                    >
                      <Camera className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white">Foto Profil Avatar</h4>
                    <p className="text-[11px] text-slate-400">Pilih dari preset galeri atau upload dari perangkat Anda</p>
                    
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1 bg-[#1c1c2b] hover:bg-[#252538] text-slate-200 text-[10px] font-bold rounded-lg border border-[#2e2e42] flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Upload Foto</span>
                      </button>
                      
                      <input 
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Preset Avatar Selection Grid */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Galeri Karakter Manga & Anime
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {PRESET_AVATARS.map((url, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setAvatarUrl(url)}
                        className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all cursor-pointer ${
                          avatarUrl === url 
                            ? 'border-[#ff5b14] scale-95 shadow-md shadow-[#ff5b14]/30' 
                            : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img 
                          src={url} 
                          alt={`Preset ${idx + 1}`} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        {avatarUrl === url && (
                          <div className="absolute inset-0 bg-[#ff5b14]/30 flex items-center justify-center text-white">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Username Input */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Username Aplikasi
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-sm text-[#ff5b14]">
                    @
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                    placeholder="username"
                    className="w-full pl-9 pr-4 py-2.5 bg-[#0e0e14] border border-[#2d2d40] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14] font-mono"
                  />
                </div>
              </div>

              {/* Display Name Input */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Nama Tampilan (Display Name)
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Nama panggilan atau alias"
                  className="w-full px-4 py-2.5 bg-[#0e0e14] border border-[#2d2d40] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14]"
                />
              </div>

              {/* Bio Input */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Bio Singkat
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Ceritakan tentang komik favorit Anda..."
                  className="w-full px-4 py-2.5 bg-[#0e0e14] border border-[#2d2d40] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14] resize-none"
                />
              </div>

              {/* Submit Profile */}
              <button
                type="submit"
                disabled={isLoading || !username}
                className="w-full py-3 bg-gradient-to-r from-[#ff5b14] to-[#f95700] hover:from-[#e04e0e] hover:to-[#df4a00] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#ff5b14]/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] disabled:opacity-40"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan Perubahan...</span>
                  </div>
                ) : (
                  <span>Simpan Perubahan Profil</span>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: GANTI PASSWORD */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-[11px] text-amber-200/90 leading-relaxed flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Password baru akan dienkripsi dengan <strong>bcrypt</strong> dan tersimpan aman di Firestore database.
                </span>
              </div>

              {/* Current Password */}
              {user.passwordHash && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Password Saat Ini / Lama <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Masukkan password lama"
                      className="w-full pl-10 pr-10 py-2.5 bg-[#0e0e14] border border-[#2d2d40] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Password Baru <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 4 karakter"
                    className="w-full pl-10 pr-10 py-2.5 bg-[#0e0e14] border border-[#2d2d40] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Konfirmasi Password Baru <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Ketik ulang password baru"
                    className="w-full pl-10 pr-10 py-2.5 bg-[#0e0e14] border border-[#2d2d40] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Password */}
              <button
                type="submit"
                disabled={isLoading || !newPassword || newPassword !== confirmNewPassword}
                className="w-full py-3 bg-gradient-to-r from-[#ff5b14] to-[#f95700] hover:from-[#e04e0e] hover:to-[#df4a00] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#ff5b14]/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] disabled:opacity-40"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mengubah Password...</span>
                  </div>
                ) : (
                  <span>Simpan Password Baru</span>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: INFO AKUN */}
          {activeTab === 'account' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-[#0e0e14] border border-[#252538] rounded-2xl space-y-3">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#1f1f2e]">
                  <span className="text-slate-400">Status Keanggotaan</span>
                  <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {user.status === 'active' ? 'Aktif' : user.status}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2.5 border-b border-[#1f1f2e]">
                  <span className="text-slate-400">Role Pengguna</span>
                  <span className="font-bold text-white uppercase">
                    {user.role === 'admin' ? 'Super Admin' : user.tier || 'Reader Member'}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2.5 border-b border-[#1f1f2e]">
                  <span className="text-slate-400">Akun Google Terhubung</span>
                  <span className="font-mono text-slate-200 truncate max-w-[200px]">
                    {user.email || googleUser?.email || 'Belum terhubung email'}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2.5 border-b border-[#1f1f2e]">
                  <span className="text-slate-400">UID Database</span>
                  <span className="font-mono text-[10px] text-slate-400 truncate max-w-[180px]">
                    {user.uid || user.id}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Terdaftar Sejak</span>
                  <span className="text-slate-300">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Hari ini'}
                  </span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  logout();
                }}
                className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar dari Akun ({user.username})</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
