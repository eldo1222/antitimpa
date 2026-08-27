import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AdminModalPortal } from '../common/AdminModalPortal';
import { 
  KeyRound, 
  X, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck 
} from 'lucide-react';

interface AdminPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPasswordModal: React.FC<AdminPasswordModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, changeAdminPassword } = useApp();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!oldPassword.trim()) {
      setErrorMessage('Silakan masukkan password Admin saat ini.');
      return;
    }

    if (!newPassword.trim()) {
      setErrorMessage('Silakan tentukan password baru.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Password baru minimal 6 karakter demi keamanan akun.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi password tidak cocok! Pastikan kedua kolom password baru sama.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      const res = changeAdminPassword(oldPassword, newPassword);
      if (res.success) {
        setSuccessMessage(res.message);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setErrorMessage(res.message);
      }
    }, 400);
  };

  return (
    <AdminModalPortal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="w-full bg-[#12121a] border border-[#28283c] rounded-2xl p-5 text-slate-200 space-y-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1f1f2e]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white shadow-md shadow-red-500/20">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Ganti Password Admin</h3>
              <p className="text-[11px] text-slate-400">
                Akun: <span className="font-mono text-red-400 font-bold">{currentUser?.username || 'admin'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-200 flex items-start gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-300 font-semibold">Password Saat Ini (Lama)</label>
              <button
                type="button"
                onClick={() => setShowPasswordText(!showPasswordText)}
                className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                {showPasswordText ? <EyeOff className="w-3 h-3 text-amber-400" /> : <Eye className="w-3 h-3" />}
                <span>{showPasswordText ? 'Tutup' : 'Lihat'}</span>
              </button>
            </div>
            <input
              type={showPasswordText ? 'text' : 'password'}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Masukkan password admin lama..."
              className="w-full p-2.5 bg-[#181824] border border-[#27273a] rounded-xl text-white font-mono text-xs focus:border-red-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-semibold">Password Baru (Min. 6 Karakter)</label>
            <input
              type={showPasswordText ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Ketik password baru..."
              className="w-full p-2.5 bg-[#181824] border border-[#27273a] rounded-xl text-white font-mono text-xs focus:border-red-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-semibold">Konfirmasi Password Baru</label>
            <input
              type={showPasswordText ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ketik ulang password baru..."
              className="w-full p-2.5 bg-[#181824] border border-[#27273a] rounded-xl text-white font-mono text-xs focus:border-red-500 focus:outline-none"
              required
            />
          </div>

          <div className="p-2.5 bg-[#171724] border border-[#232336] rounded-xl text-[11px] text-slate-400 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Perubahan password langsung disinkronkan ke cloud database Firestore. Harap simpan password baru dengan aman.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1f1f2e]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#191926] hover:bg-[#222234] text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Simpan Password Baru</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AdminModalPortal>
  );
};
