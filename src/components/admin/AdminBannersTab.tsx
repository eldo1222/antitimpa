import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Banner, Comic } from '../../types';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Image as ImageIcon, 
  CheckCircle, 
  XCircle, 
  X, 
  Upload, 
  Search, 
  Sparkles, 
  Flame, 
  Star, 
  BookOpen, 
  Zap, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Play, 
  Sliders, 
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';

const PRESET_BADGES = [
  '🔥 HOT RELEASE',
  '⭐ TRENDING',
  '👑 REKOMENDASI UTAMA',
  '⚡ UPDATE BARU',
  '🔞 18+ VIP SERIES',
  '✨ POPULER MINGGU INI',
  '🏆 PILIHAN EDITOR'
];

export const AdminBannersTab: React.FC = () => {
  const { banners, addBanner, updateBanner, deleteBanner, comics } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  // Creation Mode: 'auto_comic' (Pilih dari pencarian komik - Super Ringan) vs 'manual' (Input teks & upload sendiri)
  const [creationMode, setCreationMode] = useState<'auto_comic' | 'manual'>('auto_comic');

  // Search & Filter state for Comic Selection
  const [comicSearchQuery, setComicSearchQuery] = useState('');
  const [comicTypeFilter, setComicTypeFilter] = useState<'all' | 'manhwa' | 'manga' | 'manhua' | '18plus'>('all');
  const [selectedComicId, setSelectedComicId] = useState<string>('');

  // Banner Content Fields
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageSourceType, setImageSourceType] = useState<'file' | 'url'>('url');
  const [imageUrl, setImageUrl] = useState('');
  const [linkComicId, setLinkComicId] = useState('');
  const [badge, setBadge] = useState('🔥 HOT RELEASE');
  const [isActive, setIsActive] = useState(true);
  const [showCustomDetails, setShowCustomDetails] = useState(false);

  const bannerFileRef = useRef<HTMLInputElement>(null);

  // Find currently selected comic object
  const selectedComicObj = useMemo(() => {
    if (!selectedComicId) return null;
    return comics.find(c => c.id === selectedComicId) || null;
  }, [comics, selectedComicId]);

  // Lazy Filter: Hanya cari & load saat admin mengetik pencarian (Maksimal 10 hasil agar super ringan & tidak lag)
  const searchResults = useMemo(() => {
    const q = comicSearchQuery.trim().toLowerCase();
    if (q.length === 0) {
      return [];
    }

    const matched: Comic[] = [];
    for (let i = 0; i < comics.length; i++) {
      const c = comics[i];
      const matchTitle = c.title && c.title.toLowerCase().includes(q);
      const matchAuthor = c.author && c.author.toLowerCase().includes(q);
      const matchGenre = c.genres && c.genres.some(g => g.toLowerCase().includes(q));

      if (matchTitle || matchAuthor || matchGenre) {
        if (comicTypeFilter === 'all') {
          matched.push(c);
        } else if (comicTypeFilter === '18plus' && c.contentType === '18plus') {
          matched.push(c);
        } else if (comicTypeFilter === 'manhwa' && (c.comicType === 'manhwa' || c.type === 'manhwa')) {
          matched.push(c);
        } else if (comicTypeFilter === 'manga' && (c.comicType === 'manga' || c.type === 'manga')) {
          matched.push(c);
        } else if (comicTypeFilter === 'manhua' && (c.comicType === 'manhua' || c.type === 'manhua')) {
          matched.push(c);
        }
      }

      // Batasi maksimal 10 hasil agar DOM tetap ringan dan instan
      if (matched.length >= 10) {
        break;
      }
    }
    return matched;
  }, [comics, comicSearchQuery, comicTypeFilter]);

  // Handle Instant Comic Selection (1-Click Auto Fill)
  const handleSelectComic = (comic: Comic) => {
    setSelectedComicId(comic.id);
    setLinkComicId(comic.id);
    setTitle(comic.title);

    // Prepare synopsis / subtitle
    let cleanSubtitle = comic.synopsis ? comic.synopsis.replace(/\n+/g, ' ').trim() : 'Baca petualangan serunya sekarang!';
    if (cleanSubtitle.length > 130) {
      cleanSubtitle = cleanSubtitle.slice(0, 130) + '...';
    }
    setSubtitle(cleanSubtitle);

    // Pick best image: bannerImage first, fallback to coverImage
    const bestImg = comic.bannerImage || comic.coverImage || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80';
    setImageUrl(bestImg);
    setImageSourceType('url');

    // Default badge according to comic properties
    if (comic.contentType === '18plus') {
      setBadge('🔞 18+ VIP SERIES');
    } else if (comic.isTrending) {
      setBadge('⭐ TRENDING');
    } else if (comic.isFeatured) {
      setBadge('🔥 HOT RELEASE');
    } else {
      setBadge('👑 REKOMENDASI UTAMA');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran file maksimal 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setImageUrl(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenAdd = (mode: 'auto_comic' | 'manual' = 'auto_comic') => {
    setEditingBanner(null);
    setCreationMode(mode);
    setComicSearchQuery('');
    setComicTypeFilter('all');
    setSelectedComicId('');
    setTitle('');
    setSubtitle('');
    setImageUrl('');
    setImageSourceType('url');
    setLinkComicId('');
    setBadge('🔥 HOT RELEASE');
    setShowCustomDetails(false);
    setIsActive(true);
    setShowModal(true);
  };

  const handleOpenEdit = (b: Banner) => {
    setEditingBanner(b);
    setCreationMode(b.linkComicId || b.targetComicId ? 'auto_comic' : 'manual');
    setTitle(b.title);
    setSubtitle(b.subtitle || '');
    setImageUrl(b.imageUrl);
    setImageSourceType(b.imageUrl?.startsWith('data:') ? 'file' : 'url');
    const targetId = b.linkComicId || b.targetComicId || '';
    setLinkComicId(targetId);
    setSelectedComicId(targetId);
    setBadge(b.badgeText || b.badge || '🔥 HOT RELEASE');
    setIsActive(b.isActive);
    setShowCustomDetails(true);
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const finalTargetId = linkComicId || selectedComicId || '';
    const finalImage = imageUrl || (selectedComicId ? comics.find(c => c.id === selectedComicId)?.coverImage : '') || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80';

    if (editingBanner) {
      updateBanner(editingBanner.id, {
        title: title || 'Banner Promo',
        subtitle: subtitle || '',
        imageUrl: finalImage,
        linkComicId: finalTargetId,
        targetComicId: finalTargetId,
        badgeText: badge,
        badge: badge,
        isActive
      });
    } else {
      addBanner({
        title: title || (selectedComicId ? comics.find(c => c.id === selectedComicId)?.title || 'Banner Promo' : 'Banner Promo'),
        subtitle: subtitle || '',
        imageUrl: finalImage,
        linkComicId: finalTargetId,
        targetComicId: finalTargetId,
        badgeText: badge,
        badge: badge,
        isActive,
        priority: banners.length + 1
      });
    }
    setShowModal(false);
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pb-3 border-b border-[#1c1c2a]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">Manajemen Banner &amp; Slider Beranda</h2>
            <span className="px-2 py-0.5 rounded-full bg-[#ff5b14]/15 border border-[#ff5b14]/30 text-[#ff7a3d] text-[10px] font-black">
              {banners.filter(b => b.isActive).length} Aktif
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Pasang banner promosi komik unggulan dengan 1-klik instan atau kustom manual.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => handleOpenAdd('auto_comic')}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-gradient-to-r from-[#ff5b14] to-[#f97316] hover:opacity-95 text-white text-xs font-black rounded-xl shadow-lg shadow-[#ff5b14]/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>+ Pilih Komik Jadi Banner (Instan)</span>
          </button>

          <button
            onClick={() => handleOpenAdd('manual')}
            className="px-3 py-2.5 bg-[#1a1a28] hover:bg-[#222234] border border-[#27273c] text-slate-300 hover:text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            title="Upload / Custom Manual"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kustom Manual</span>
          </button>
        </div>
      </div>

      {/* Banner Grid List */}
      {banners.length === 0 ? (
        <div className="bg-[#12121a] border border-[#1f1f2e] rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#ff5b14]/15 border border-[#ff5b14]/30 text-[#ff5b14] flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-white">Belum Ada Banner Hero</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Tambahkan banner untuk menampilkan komik rekomendasi utama di slider bagian paling atas beranda pembaca.
            </p>
          </div>
          <button
            onClick={() => handleOpenAdd('auto_comic')}
            className="px-4 py-2 bg-[#ff5b14] text-white text-xs font-bold rounded-xl shadow inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Pilih Komik Jadi Banner Sekarang</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map((b, index) => {
            const targetComic = comics.find(c => c.id === (b.linkComicId || b.targetComicId));
            return (
              <div key={b.id} className="bg-[#12121a] rounded-2xl border border-[#1f1f2e] overflow-hidden flex flex-col justify-between shadow-lg group hover:border-[#ff5b14]/40 transition-colors">
                {/* Visual Banner Preview */}
                <div className="relative aspect-[16/8] bg-[#1a1a26] overflow-hidden">
                  <img 
                    src={b.imageUrl} 
                    alt={b.title} 
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 flex flex-col justify-end">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-md bg-[#ff5b14] text-white text-[10px] font-black shadow-md flex items-center gap-1">
                        <Flame className="w-2.5 h-2.5" />
                        {b.badgeText || b.badge || 'HOT RELEASE'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-300 bg-black/50 px-1.5 py-0.5 rounded">
                        #{index + 1}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-sm text-white line-clamp-1">{b.title}</h3>
                    <p className="text-[11px] text-slate-300 line-clamp-1">{b.subtitle || 'Tidak ada deskripsi'}</p>
                  </div>
                </div>

                {/* Footer Controls & Info */}
                <div className="p-3 bg-[#151520] flex items-center justify-between border-t border-[#1e1e2d] text-xs">
                  <div className="flex items-center gap-2 truncate pr-2">
                    {targetComic ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-300 truncate">
                        <BookOpen className="w-3.5 h-3.5 text-[#ff5b14] shrink-0" />
                        <span className="truncate">Komik: <strong className="text-white">{targetComic.title}</strong></span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400">Tautan: {b.linkComicId || b.targetComicId || 'Tidak ada'}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => updateBanner(b.id, { isActive: !b.isActive })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                        b.isActive 
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25' 
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {b.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      <span>{b.isActive ? 'Aktif' : 'Nonaktif'}</span>
                    </button>

                    <button
                      onClick={() => handleOpenEdit(b)}
                      className="p-1.5 bg-[#1e1e2c] text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                      title="Edit Banner"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Hapus banner "${b.title}"?`)) {
                          deleteBanner(b.id);
                        }
                      }}
                      className="p-1.5 bg-[#1e1e2c] text-slate-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                      title="Hapus Banner"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Tambah / Edit Banner */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[#12121a] border border-[#262638] rounded-2xl p-4 sm:p-6 text-slate-200 space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#202030] shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#ff5b14]/20 border border-[#ff5b14]/30 text-[#ff5b14] flex items-center justify-center font-bold">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white">
                    {editingBanner ? 'Edit Banner Promo' : 'Tambah Banner Promo Slider'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {creationMode === 'auto_comic' 
                      ? 'Ketik judul komik yang dicari — hasil pencarian dimuat instan tanpa berat' 
                      : 'Kustom manual judul, sinopsis, dan upload gambar'}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setShowModal(false)} 
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-[#1f1f2e] cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            {!editingBanner && (
              <div className="grid grid-cols-2 gap-2 p-1 bg-[#161622] rounded-xl border border-[#252538] shrink-0">
                <button
                  type="button"
                  onClick={() => setCreationMode('auto_comic')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    creationMode === 'auto_comic'
                      ? 'bg-[#ff5b14] text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>⚡ Cari Judul Komik (Super Ringan)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCreationMode('manual')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    creationMode === 'manual'
                      ? 'bg-[#ff5b14] text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>✍️ Kustom Manual &amp; Upload</span>
                </button>
              </div>
            )}

            {/* Scrollable Form Content */}
            <form onSubmit={handleSave} className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
              
              {/* OPSI 1: CARI JUDUL KOMIK INSTAN */}
              {creationMode === 'auto_comic' && (
                <div className="space-y-3">
                  <div className="bg-[#161622] border border-[#262638] rounded-xl p-3 space-y-2.5">
                    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
                      <label className="text-slate-300 font-bold flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5 text-[#ff5b14]" />
                        <span>Cari Judul Komik yang Ingin Dijadikan Banner</span>
                      </label>
                      
                      {/* Filter Kategori Cepat */}
                      <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-[10px]">
                        {(['all', 'manhwa', 'manga', 'manhua', '18plus'] as const).map(type => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setComicTypeFilter(type)}
                            className={`px-2 py-0.5 rounded-md font-bold whitespace-nowrap transition-colors ${
                              comicTypeFilter === type
                                ? 'bg-[#ff5b14] text-white'
                                : 'bg-[#1e1e2d] text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {type === 'all' ? 'Semua' : type.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        autoFocus
                        value={comicSearchQuery}
                        onChange={(e) => setComicSearchQuery(e.target.value)}
                        placeholder="Ketik nama judul komik (contoh: Solo, Martial, Magic, dsb)..."
                        className="w-full pl-9 pr-8 py-2.5 bg-[#101018] border border-[#27273a] rounded-xl text-white placeholder-slate-500 focus:border-[#ff5b14] focus:outline-none text-xs"
                      />
                      {comicSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setComicSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Comic Search Results - HANYA DIMUAT SAAT MENGETIK */}
                    {comicSearchQuery.trim().length === 0 ? (
                      <div className="p-4 bg-[#0f0f16] rounded-xl border border-[#222234] text-center space-y-1">
                        <p className="text-slate-400 font-semibold text-[11px] flex items-center justify-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-[#ff5b14]" />
                          Ketik nama judul komik di kolom atas untuk mencari
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Hanya komik yang Anda ketik yang akan dimuat sehingga sistem tetap super cepat dan ringan.
                        </p>
                      </div>
                    ) : (
                      <div className="max-h-52 overflow-y-auto space-y-1.5 border border-[#222234] rounded-xl p-1.5 bg-[#0f0f16]">
                        {searchResults.length === 0 ? (
                          <div className="text-center py-5 space-y-1">
                            <p className="text-slate-400 text-xs font-semibold">Tidak ditemukan komik dengan kata kunci "{comicSearchQuery}"</p>
                            <p className="text-[10px] text-slate-500">Coba gunakan kata kunci atau nama author lain.</p>
                          </div>
                        ) : (
                          <>
                            <div className="px-2 py-1 text-[10px] text-slate-400 font-bold flex items-center justify-between border-b border-[#1c1c28]">
                              <span>Hasil Pencarian: {searchResults.length} komik ditemukan</span>
                              <span className="text-[#ff5b14]">Klik komik untuk memilih</span>
                            </div>

                            {searchResults.map(comic => {
                              const isSelected = selectedComicId === comic.id;
                              return (
                                <div
                                  key={comic.id}
                                  onClick={() => handleSelectComic(comic)}
                                  className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all ${
                                    isSelected
                                      ? 'bg-[#ff5b14]/20 border border-[#ff5b14] text-white shadow-sm'
                                      : 'hover:bg-[#1a1a28] border border-transparent text-slate-300'
                                  }`}
                                >
                                  <img
                                    src={comic.coverImage}
                                    alt={comic.title}
                                    loading="lazy"
                                    className="w-10 h-14 object-cover rounded-lg shrink-0 border border-white/10 bg-[#161622]"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <h4 className="font-extrabold text-xs text-white truncate">{comic.title}</h4>
                                      {comic.contentType === '18plus' && (
                                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-red-600 text-white shrink-0">18+</span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 truncate">
                                      {comic.author || 'Author'} • {comic.totalChapters || 0} Ch • Rating {comic.rating || 4.8}★
                                    </p>
                                    <div className="flex items-center gap-1 mt-0.5 overflow-hidden">
                                      {(comic.genres || []).slice(0, 3).map((g, i) => (
                                        <span key={i} className="text-[9px] text-slate-500 bg-[#12121c] px-1.5 rounded">
                                          {g}
                                        </span>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="shrink-0 pr-1">
                                    {isSelected ? (
                                      <div className="w-6 h-6 rounded-full bg-[#ff5b14] text-white flex items-center justify-center shadow">
                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                      </div>
                                    ) : (
                                      <span className="px-2.5 py-1 rounded-lg bg-[#202030] hover:bg-[#ff5b14] text-slate-300 hover:text-white text-[10px] font-bold transition-colors">
                                        Pilih
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Info Komik Terpilih & Live Banner Preview */}
                  {selectedComicId && (
                    <div className="space-y-3 pt-1">
                      {/* Kartu Komik yang Sedang Terpilih */}
                      {selectedComicObj && (
                        <div className="p-2.5 bg-[#161622] rounded-xl border border-emerald-500/30 flex items-center justify-between">
                          <div className="flex items-center gap-2.5 truncate">
                            <img
                              src={selectedComicObj.coverImage}
                              alt={selectedComicObj.title}
                              className="w-8 h-11 object-cover rounded-lg shrink-0 border border-emerald-500/40"
                            />
                            <div className="truncate">
                              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Komik Terpilih Jadi Banner:
                              </span>
                              <h4 className="font-extrabold text-xs text-white truncate">{selectedComicObj.title}</h4>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedComicId('');
                              setTitle('');
                              setSubtitle('');
                              setImageUrl('');
                            }}
                            className="text-[10px] text-slate-400 hover:text-red-400 px-2 py-1 bg-[#202030] rounded-lg transition-colors cursor-pointer"
                          >
                            Ganti
                          </button>
                        </div>
                      )}

                      {/* Live Banner Preview */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-slate-300 font-bold flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#ff5b14]" />
                            <span>Tampilan Live Preview Banner Slider:</span>
                          </label>
                        </div>

                        <div className="relative aspect-[16/8] sm:aspect-[16/7] rounded-2xl overflow-hidden border-2 border-[#ff5b14]/60 shadow-xl bg-[#101018]">
                          <img
                            src={imageUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80'}
                            alt={title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent p-4 sm:p-6 flex flex-col justify-end">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-gradient-to-r from-[#ff5b14] to-[#f97316] text-white tracking-wider uppercase shadow flex items-center gap-1">
                                <Flame className="w-2.5 h-2.5" />
                                {badge}
                              </span>
                              <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded-full border border-white/10">
                                <Star className="w-2.5 h-2.5 fill-amber-400" />
                                4.9
                              </span>
                            </div>
                            <h2 className="font-black text-sm sm:text-lg text-white leading-snug line-clamp-1">
                              {title}
                            </h2>
                            <p className="text-[10px] sm:text-xs text-slate-300 line-clamp-2 mt-0.5 mb-2 max-w-lg">
                              {subtitle}
                            </p>
                            <div className="flex items-center gap-2">
                              <div className="px-3 py-1.5 rounded-lg bg-[#ff5b14] text-white font-extrabold text-[10px] flex items-center gap-1 shadow">
                                <Play className="w-3 h-3 fill-white" />
                                <span>Baca Sekarang</span>
                              </div>
                              <div className="px-3 py-1.5 rounded-lg bg-white/10 text-slate-200 text-[10px] font-bold border border-white/10">
                                Detail Komik
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Quick Badge Selector */}
                        <div className="space-y-1.5 pt-1">
                          <label className="text-slate-400 font-semibold block text-[11px]">Pilih Label Badge Banner:</label>
                          <div className="flex flex-wrap gap-1.5">
                            {PRESET_BADGES.map(b => (
                              <button
                                key={b}
                                type="button"
                                onClick={() => setBadge(b)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                  badge === b
                                    ? 'bg-[#ff5b14] text-white shadow-sm'
                                    : 'bg-[#181824] text-slate-400 hover:text-slate-200 border border-[#27273a]'
                                }`}
                              >
                                {b}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Toggle Custom Adjustments (Optional) */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => setShowCustomDetails(!showCustomDetails)}
                            className="text-[11px] font-bold text-slate-400 hover:text-[#ff5b14] flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            {showCustomDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            <span>{showCustomDetails ? 'Tutup Kustomisasi Detail' : '✏️ Sesuaikan Judul / Sinopsis / Foto Khusus (Opsional)'}</span>
                          </button>

                          {showCustomDetails && (
                            <div className="mt-2 p-3 bg-[#151520] rounded-xl border border-[#242436] space-y-3 animate-in fade-in duration-200">
                              <div>
                                <label className="block text-slate-400 mb-1 font-semibold">Judul Banner (Teks Kustom)</label>
                                <input
                                  type="text"
                                  value={title}
                                  onChange={(e) => setTitle(e.target.value)}
                                  className="w-full p-2 bg-[#101018] border border-[#27273a] rounded-xl text-white"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-slate-400 mb-1 font-semibold">Deskripsi Singkat / Sinopsis</label>
                                <textarea
                                  value={subtitle}
                                  onChange={(e) => setSubtitle(e.target.value)}
                                  rows={2}
                                  className="w-full p-2 bg-[#101018] border border-[#27273a] rounded-xl text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-slate-400 mb-1 font-semibold">URL Foto Banner Kustom (Opsional)</label>
                                <input
                                  type="url"
                                  value={imageUrl}
                                  onChange={(e) => setImageUrl(e.target.value)}
                                  placeholder="https://..."
                                  className="w-full p-2 bg-[#101018] border border-[#27273a] rounded-xl text-white font-mono text-[11px]"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* OPSI 2: KUSTOM MANUAL */}
              {creationMode === 'manual' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Judul Banner</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Contoh: Season Baru Telah Tiba!"
                      className="w-full p-2 bg-[#181824] border border-[#27273a] rounded-xl text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Subjudul / Deskripsi Singkat</label>
                    <input
                      type="text"
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      placeholder="Contoh: Baca petualangan serunya sekarang"
                      className="w-full p-2 bg-[#181824] border border-[#27273a] rounded-xl text-white"
                    />
                  </div>

                  {/* Banner Image Upload */}
                  <div className="p-3 bg-[#161622] rounded-xl border border-[#262638] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-[#ff5b14]" />
                        <span>Gambar Banner Slider</span>
                      </label>
                      <div className="flex bg-[#101018] p-0.5 rounded-lg border border-[#242434] text-[10px]">
                        <button
                          type="button"
                          onClick={() => setImageSourceType('file')}
                          className={`px-2 py-0.5 rounded-md font-semibold ${
                            imageSourceType === 'file' ? 'bg-[#ff5b14] text-white' : 'text-slate-400'
                          }`}
                        >
                          Upload File
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageSourceType('url')}
                          className={`px-2 py-0.5 rounded-md font-semibold ${
                            imageSourceType === 'url' ? 'bg-[#ff5b14] text-white' : 'text-slate-400'
                          }`}
                        >
                          Link URL
                        </button>
                      </div>
                    </div>

                    {imageSourceType === 'file' ? (
                      <div className="flex flex-col gap-2">
                        <div 
                          onClick={() => bannerFileRef.current?.click()}
                          className="border-2 border-dashed border-[#ff5b14]/40 hover:border-[#ff5b14] rounded-xl p-3 text-center cursor-pointer bg-[#101018] transition-colors"
                        >
                          <input
                            ref={bannerFileRef}
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                          <Upload className="w-5 h-5 text-[#ff5b14] mx-auto mb-1" />
                          <p className="font-semibold text-slate-300 text-[11px]">
                            {imageUrl ? 'Klik untuk mengganti gambar banner' : 'Pilih File Gambar Banner (JPG/PNG)'}
                          </p>
                          <p className="text-[9px] text-slate-500">Rasio 16:8 landscape disarankan</p>
                        </div>

                        {imageUrl && (
                          <div className="relative w-full h-24 rounded-lg overflow-hidden border border-[#ff5b14]">
                            <img src={imageUrl} alt="Banner Preview" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/... or image link"
                        className="w-full p-2 bg-[#101018] border border-[#27273a] rounded-xl text-white font-mono text-[11px]"
                        required={imageSourceType === 'url'}
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Tautkan ke Komik</label>
                      <select
                        value={linkComicId}
                        onChange={(e) => setLinkComicId(e.target.value)}
                        className="w-full p-2 bg-[#181824] border border-[#27273a] rounded-xl text-white"
                      >
                        <option value="">-- Pilih Komik (Opsional) --</option>
                        {comics.map(c => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Badge Label</label>
                      <input
                        type="text"
                        value={badge}
                        onChange={(e) => setBadge(e.target.value)}
                        placeholder="HOT RELEASE"
                        className="w-full p-2 bg-[#181824] border border-[#27273a] rounded-xl text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-[#1f1f2e] shrink-0">
                <button
                  type="submit"
                  disabled={creationMode === 'auto_comic' && !selectedComicId}
                  className={`flex-1 py-3 font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all ${
                    creationMode === 'auto_comic' && !selectedComicId
                      ? 'bg-[#222230] text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#ff5b14] to-[#f97316] hover:opacity-95 text-white shadow-lg shadow-[#ff5b14]/25 cursor-pointer'
                  }`}
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span>
                    {editingBanner 
                      ? 'Simpan Perubahan Banner' 
                      : (selectedComicId ? '🚀 Pasang Sebagai Banner Beranda' : 'Pilih Komik Terlebih Dahulu')}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-3 bg-[#1a1a24] hover:bg-[#222232] text-slate-300 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
