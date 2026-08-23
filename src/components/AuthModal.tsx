import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  User, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  ShieldCheck,
  Zap,
  PhoneCall
} from 'lucide-react';
import { store } from '../services/store';
import { UserAccount } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserAccount) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'pricing'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = store.loginReader(username, password);
    if (res.success && res.user) {
      setSuccessMsg(`Berhasil login sebagai ${res.user.username}`);
      setTimeout(() => {
        onLoginSuccess(res.user!);
        onClose();
      }, 600);
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleQuickLogin = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    const res = store.loginReader(u, p);
    if (res.success && res.user) {
      onLoginSuccess(res.user);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121520] border border-slate-700/80 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="relative p-6 bg-gradient-to-br from-red-950/60 via-[#181c2b] to-[#121520] border-b border-slate-800">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center shadow-lg shadow-red-900/30 text-white">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">Akses Pembaca 18+</h3>
              <p className="text-xs text-slate-400">Masuk dengan Akun yang Didaftarkan Admin</p>
            </div>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-slate-800 bg-[#0d1017] text-xs font-bold">
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-3 text-center transition-all ${
              activeTab === 'login'
                ? 'text-rose-400 border-b-2 border-rose-500 bg-rose-500/5'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Form Login Reader
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`flex-1 py-3 text-center transition-all ${
              activeTab === 'pricing'
                ? 'text-rose-400 border-b-2 border-rose-500 bg-rose-500/5'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Info Paket (5K &amp; 15K)
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 space-y-5">
          {activeTab === 'login' ? (
            <>
              {errorMsg && (
                <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Username Akun</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Masukkan username akun Anda"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-[#191d2c] border border-slate-700/80 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="Masukkan password akun Anda"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#191d2c] border border-slate-700/80 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-950/40 transition-all flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Masuk ke Akun Pembaca</span>
                </button>
              </form>

              {/* Demo Accounts Quick Click for Testing */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Uji Coba Akun Demo Cepat:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleQuickLogin('andi_5k', 'reader123')}
                    className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-left transition-all"
                  >
                    <p className="text-xs font-bold text-amber-300">Akun Paket 5K</p>
                    <p className="text-[10px] text-slate-400">andi_5k (Khusus 1 Komik)</p>
                  </button>

                  <button
                    onClick={() => handleQuickLogin('budi_vip', 'reader123')}
                    className="p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-left transition-all"
                  >
                    <p className="text-xs font-bold text-purple-300">Akun VIP 15K</p>
                    <p className="text-[10px] text-slate-400">budi_vip (Semua 18+)</p>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-950/20 border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-amber-300">Paket Hemat Rp 5.000</span>
                  <span className="text-xs font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
                    1 Komik Terpilih
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Dapat mengakses penuh 1 judul komik 18+ pilihan yang Anda tentukan saat memesan ke admin, plus semua komik normal gratis selamanya.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500/10 to-purple-950/20 border border-rose-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-rose-300">Paket VIP Rp 15.000</span>
                  <span className="text-xs font-bold bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full">
                    ALL ACCESS
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Bebas membaca seluruh judul komik 18+ yang tersedia di katalog tanpa batas + update chapter tercepat.
                </p>
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center space-y-1">
                <p className="text-xs text-slate-300 font-semibold">Hubungi Admin untuk Pembuatan Akun:</p>
                <p className="text-xs text-emerald-400 font-mono font-bold">WhatsApp: 0812-3456-7890</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
