import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  User, 
  Upload, 
  Image as ImageIcon, 
  Check, 
  X, 
  Sparkles, 
  Camera,
  Link as LinkIcon
} from 'lucide-react';

interface AvatarEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: {
    id: string;
    username: string;
    avatar?: string;
    bio?: string;
    role?: string;
  } | null;
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

export const AvatarEditModal: React.FC<AvatarEditModalProps> = ({ isOpen, onClose, targetUser }) => {
  const { currentUser, updateUserProfile } = useApp();
  const user = targetUser || currentUser;

  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || PRESET_AVATARS[0]);
  const [bioText, setBioText] = useState(user?.bio || '');
  const [mode, setMode] = useState<'upload' | 'url' | 'presets'>('upload');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (user) {
      setAvatarUrl(user.avatar || PRESET_AVATARS[0]);
      setBioText(user.bio || '');
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert('Ukuran file maksimal 3 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAvatarUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (customUrlInput.trim()) {
      setAvatarUrl(customUrlInput.trim());
      setCustomUrlInput('');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile(user.id, {
      avatar: avatarUrl,
      bio: bioText
    });
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-[#12121a] border border-[#242436] rounded-2xl p-5 text-slate-200 space-y-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1f1f2e]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#ff5b14]/10 border border-[#ff5b14]/30 flex items-center justify-center text-[#ff5b14]">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Ganti Foto Profil &amp; Bio</h3>
              <p className="text-[11px] text-slate-400">
                Akun: <strong className="text-white">{user.username}</strong> {user.role === 'admin' && '(Super Admin)'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Avatar Preview */}
        <div className="flex flex-col items-center justify-center py-2 space-y-2">
          <div className="relative group">
            <img
              src={avatarUrl}
              alt="Avatar Preview"
              className="w-24 h-24 rounded-full object-cover ring-4 ring-[#ff5b14]/40 shadow-xl"
              onError={(e) => {
                (e.target as HTMLImageElement).src = PRESET_AVATARS[0];
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold cursor-pointer"
            >
              <Upload className="w-5 h-5" />
            </button>
          </div>
          <p className="text-[11px] text-slate-400">Pratinjau Foto Profil</p>
        </div>

        {/* Option Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-[#181824] p-1 rounded-xl border border-[#242436] text-xs">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'upload' ? 'bg-[#ff5b14] text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('presets')}
            className={`py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'presets' ? 'bg-[#ff5b14] text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pilih Avatar</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'url' ? 'bg-[#ff5b14] text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Link URL</span>
          </button>
        </div>

        {/* Tab Content */}
        {mode === 'upload' && (
          <div className="p-4 bg-[#181824] rounded-xl border border-[#28283c] text-center space-y-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-[#252538] hover:bg-[#2f2f45] text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-colors border border-[#35354e]"
            >
              <Upload className="w-4 h-4 text-[#ff5b14]" />
              <span>Pilih Gambar dari Perangkat</span>
            </button>
            <p className="text-[10px] text-slate-500">Mendukung format JPG, PNG, WEBP, GIF (Maks. 3 MB)</p>
          </div>
        )}

        {mode === 'presets' && (
          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-400 font-semibold">Pilih Avatar Karakter:</label>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_AVATARS.map((url, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setAvatarUrl(url)}
                  className={`p-1 rounded-xl border transition-all cursor-pointer ${
                    avatarUrl === url ? 'border-[#ff5b14] ring-2 ring-[#ff5b14]/50 bg-[#ff5b14]/10' : 'border-[#28283a] hover:border-slate-500'
                  }`}
                >
                  <img src={url} alt={`Preset ${idx + 1}`} className="w-full aspect-square rounded-lg object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'url' && (
          <form onSubmit={handleApplyCustomUrl} className="space-y-2 text-xs">
            <label className="block text-slate-400 font-semibold">Masukkan Link Gambar Langsung:</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={customUrlInput}
                onChange={(e) => setCustomUrlInput(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="flex-1 p-2 bg-[#181824] border border-[#27273a] rounded-xl text-white text-xs focus:outline-none focus:border-[#ff5b14]"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-[#ff5b14] hover:bg-[#e04e0e] text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Terapkan
              </button>
            </div>
          </form>
        )}

        {/* Bio input */}
        <div className="space-y-1 text-xs">
          <label className="block text-slate-400 font-semibold">Bio Singkat Akun</label>
          <input
            type="text"
            value={bioText}
            onChange={(e) => setBioText(e.target.value)}
            placeholder="Tulis status atau hobi komik Anda..."
            className="w-full p-2 bg-[#181824] border border-[#27273a] rounded-xl text-white text-xs focus:outline-none focus:border-[#ff5b14]"
          />
        </div>

        {/* Actions */}
        <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#1f1f2e]">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white bg-[#181824] hover:bg-[#202030] cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#ff5b14] hover:bg-[#e04e0e] flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
          >
            {isSaved ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Tersimpan!</span>
              </>
            ) : (
              <span>Simpan Profil</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
