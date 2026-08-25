import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { AvatarEditModal } from '../common/AvatarEditModal';
import { 
  User, 
  Crown, 
  Clock, 
  BookOpen, 
  Bookmark, 
  History, 
  Settings, 
  HelpCircle, 
  LogOut, 
  Edit3, 
  ShieldCheck, 
  Calendar, 
  CheckCircle2, 
  ChevronRight, 
  CreditCard,
  Sparkles,
  AlertTriangle,
  Camera
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const navigate = useNavigate();
  const { 
    currentUser, 
    logout, 
    setActiveTab, 
    selectComic, 
    startReading, 
    readingHistory, 
    comics, 
    chapters,
    setIsAdminView 
  } = useApp();

  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  if (!currentUser) {
    return (
      <div className="p-8 text-center text-slate-100 space-y-4">
        <p>Silakan login untuk melihat profil akun Anda.</p>
      </div>
    );
  }

  // Calculate Expiration display
  let expiresFormatted = 'Seumur Hidup / Tidak Terbatas';
  let isExpired = false;
  if (currentUser.expiresAt && currentUser.role !== 'admin') {
    const expDate = new Date(currentUser.expiresAt);
    expiresFormatted = expDate.toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
    isExpired = Date.now() > expDate.getTime();
  }

  // First reading history item
  const latestHistory = readingHistory[0];
  const historyComic = latestHistory ? comics.find(c => c.id === latestHistory.comicId) : null;
  const historyComicChapters = historyComic ? (chapters[historyComic.id] || []) : [];

  // Real-time calculated user reading statistics
  const uniqueComicsRead = new Set(readingHistory.map(h => h.comicId)).size;
  const totalChaptersRead = readingHistory.length;
  const createdAtTime = currentUser.createdAt ? new Date(currentUser.createdAt).getTime() : Date.now();
  const daysActive = Math.max(1, Math.floor((Date.now() - createdAtTime) / (1000 * 60 * 60 * 24)) + 1);

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
      {/* 1. Header Profile Card */}
      <div className="flex items-center gap-4 bg-[#14141d] p-4 rounded-2xl border border-[#222232] shadow-sm relative">
        <div className="relative group">
          <img
            src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
            alt={currentUser.username}
            className="w-16 h-16 rounded-full object-cover border-2 border-[#ff5b14] ring-2 ring-[#ff5b14]/20 shadow"
          />
          <button
            onClick={() => setShowAvatarModal(true)}
            className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold"
            title="Ganti Foto Profil"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-[#ff5b14]/15 text-[#ff7a3d] border border-[#ff5b14]/30">
              {currentUser.role === 'admin' ? 'SUPER ADMIN' : currentUser.tier || 'PRO MEMBER'}
            </span>
            {currentUser.role === 'admin' && (
              <button
                onClick={() => {
                  setIsAdminView(true);
                  navigate('/admin');
                }}
                className="text-[10px] font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/30 hover:bg-emerald-900/50"
              >
                Panel Admin →
              </button>
            )}
          </div>

          <h2 className="font-extrabold text-xl text-white tracking-tight">
            {currentUser.username}
          </h2>

          <p className="text-xs text-slate-400">
            {currentUser.bio || `Bergabung sejak ${new Date(currentUser.createdAt || Date.now()).getFullYear()} • Komik Enthusiast`}
          </p>
        </div>
      </div>

      {/* 2. 3-Stat Metric Boxes (Real-Time Genuine Data) */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-3 bg-[#14141d] rounded-2xl border border-[#222232] shadow">
          <span className="block font-extrabold text-lg text-white">
            {uniqueComicsRead}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">Komik Dibaca</span>
        </div>

        <div className="p-3 bg-[#14141d] rounded-2xl border border-[#222232] shadow">
          <span className="block font-extrabold text-lg text-[#ff5b14]">
            {totalChaptersRead}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">Chapters</span>
        </div>

        <div className="p-3 bg-[#14141d] rounded-2xl border border-[#222232] shadow">
          <span className="block font-extrabold text-lg text-white">
            {daysActive}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">Hari Aktif</span>
        </div>
      </div>

      {/* 3. Subscription Status Card (Image 25.png) */}
      <div className="p-4 bg-gradient-to-br from-[#181826] to-[#12121c] rounded-2xl border border-[#2c2c40] space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#ff5b14]" />
            <span className="font-bold text-sm text-white">
              Status Masa Aktif Akun
            </span>
          </div>

          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
            isExpired 
              ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
          }`}>
            {isExpired ? 'EXPIRED' : 'AKTIF'}
          </span>
        </div>

        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span>Paket Durasi:</span>
            <span className="font-bold text-slate-200 capitalize">
              {currentUser.durationType.replace('_', ' ')}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-400">
            <span>Berlaku Hingga:</span>
            <span className="font-bold text-white flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#ff5b14]" />
              {expiresFormatted}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-[#242436] flex items-center justify-between">
          <span className="text-[11px] text-slate-400">Kelola atau perpanjang akses:</span>
          <button
            onClick={() => setShowHelpModal(true)}
            className="text-xs font-bold text-[#ff5b14] hover:underline"
          >
            Hubungi Admin →
          </button>
        </div>
      </div>

      {/* 4. Currently Reading Card (Image 25.png) */}
      {historyComic && latestHistory && (
        <div className="p-4 bg-[#14141d] rounded-2xl border border-[#242436] space-y-2.5 shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#ff5b14]" />
              Sedang Dibaca
            </span>
            <button
              onClick={() => startReading(latestHistory.chapterId)}
              className="text-xs font-bold text-[#ff5b14] hover:underline"
            >
              Lanjutkan →
            </button>
          </div>

          <div className="flex items-center gap-3">
            <img 
              src={historyComic.coverImage} 
              alt={historyComic.title} 
              className="w-12 h-16 rounded-xl object-cover ring-1 ring-white/10 shrink-0" 
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-xs sm:text-sm text-white truncate">
                {historyComic.title}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Chapter {latestHistory.chapterNumber} • Hal. {latestHistory.pageNumber} / {latestHistory.totalPages}
              </p>

              {/* Progress bar */}
              <div className="w-full bg-[#20202e] h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-[#ff5b14] h-full rounded-full"
                  style={{ width: `${(latestHistory.pageNumber / latestHistory.totalPages) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Menu List Items (Image 25.png) */}
      <div className="bg-[#14141d] rounded-2xl border border-[#222232] divide-y divide-[#1f1f2e] text-xs font-semibold overflow-hidden shadow">
        <button
          onClick={() => navigate('/library')}
          className="w-full p-3.5 flex items-center justify-between text-slate-200 hover:bg-[#1b1b26] transition-colors"
        >
          <div className="flex items-center gap-3">
            <Bookmark className="w-4 h-4 text-[#ff5b14]" />
            <span>Koleksi Disimpan</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        <button
          onClick={() => navigate('/library')}
          className="w-full p-3.5 flex items-center justify-between text-slate-200 hover:bg-[#1b1b26] transition-colors"
        >
          <div className="flex items-center gap-3">
            <History className="w-4 h-4 text-purple-400" />
            <span>Riwayat Membaca</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        {currentUser.role === 'admin' && (
          <button
            onClick={() => {
              setIsAdminView(true);
              navigate('/admin');
            }}
            className="w-full p-3.5 flex items-center justify-between text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>Admin Console & Manajemen</span>
            </div>
            <ChevronRight className="w-4 h-4 text-purple-400" />
          </button>
        )}

        <button
          onClick={() => setShowSettingsModal(true)}
          className="w-full p-3.5 flex items-center justify-between text-slate-200 hover:bg-[#1b1b26] transition-colors"
        >
          <div className="flex items-center gap-3">
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Pengaturan Akun & Tampilan</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        <button
          onClick={() => setShowHelpModal(true)}
          className="w-full p-3.5 flex items-center justify-between text-slate-200 hover:bg-[#1b1b26] transition-colors"
        >
          <div className="flex items-center gap-3">
            <HelpCircle className="w-4 h-4 text-blue-400" />
            <span>Pusat Bantuan & Admin Support</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* 6. Logout Button Card */}
      <button
        onClick={logout}
        className="w-full p-3.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-2xl text-red-400 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-98 shadow"
      >
        <LogOut className="w-4 h-4" />
        <span>Keluar dari Akun ({currentUser.username})</span>
      </button>

      {/* Help / Contact Admin Modal */}
      {showHelpModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowHelpModal(false)}
        >
          <div 
            className="w-full max-w-sm bg-[#15151e] border border-[#2b2b3e] rounded-2xl p-5 space-y-4 text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#242434]">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#ff5b14]" />
                Bantuan & Perpanjangan
              </h3>
              <button 
                onClick={() => setShowHelpModal(false)} 
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Untuk perpanjangan masa aktif akun pembaca, reset password, atau aktivasi paket durasi, silakan hubungi Administrator:
            </p>

            <div className="p-3.5 bg-[#1d1d2b] rounded-xl border border-[#2a2a3e] space-y-2 text-xs">
              <p><strong className="text-white">Admin Support:</strong> admin@antitimpa.id</p>
              <p><strong className="text-white">WhatsApp Admin:</strong> <span className="font-mono text-emerald-400 font-bold">089514441988</span></p>
              <p><strong className="text-white">Jam Operasional:</strong> 24/7 Fast Response</p>
              
              <a
                href="https://wa.me/6289514441988?text=Halo%20Admin%20AntiTimpa,%20saya%20ingin%20konsultasi%20akun%20pembaca%20atau%20perpanjang%20durasi."
                target="_blank"
                rel="noreferrer"
                className="mt-2 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>💬 Chat WhatsApp Admin</span>
              </a>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 bg-[#ff5b14] text-white text-xs font-bold rounded-xl shadow"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowSettingsModal(false)}
        >
          <div 
            className="w-full max-w-sm bg-[#15151e] border border-[#2b2b3e] rounded-2xl p-5 space-y-4 text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#242434]">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#ff5b14]" />
                Pengaturan Tampilan
              </h3>
              <button 
                onClick={() => setShowSettingsModal(false)} 
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-[#1a1a26] rounded-xl border border-[#28283a]">
                <span>Mode Gelap (OLED Black)</span>
                <span className="text-emerald-400 font-bold">Aktif</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-[#1a1a26] rounded-xl border border-[#28283a]">
                <span>Kualitas Gambar Reader</span>
                <span className="text-[#ff5b14] font-bold">HD High-Res</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-[#1a1a26] rounded-xl border border-[#28283a]">
                <span>Simpan Progres Otomatis</span>
                <span className="text-emerald-400 font-bold">Aktif</span>
              </div>
            </div>

            <button
              onClick={() => setShowSettingsModal(false)}
              className="w-full py-2.5 bg-[#ff5b14] text-white text-xs font-bold rounded-xl shadow cursor-pointer"
            >
              Simpan &amp; Tutup
            </button>
          </div>
        </div>
      )}

      {/* Avatar & Profile Edit Modal */}
      <AvatarEditModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        targetUser={currentUser}
      />
    </div>
  );
};
