import React, { useState, useEffect } from 'react';
import { 
  X, 
  DownloadCloud, 
  Layers, 
  Users, 
  Plus, 
  Search, 
  Star, 
  Lock, 
  Check, 
  Trash2, 
  Edit3, 
  Eye, 
  EyeOff, 
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  BookOpen
} from 'lucide-react';
import { Comic, UserAccount, ComicType, ContentRating } from '../types';
import { store } from '../services/store';
import { searchMangaDexApi, FetchedComicPreview } from '../services/apiFetcher';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onComicsUpdated: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  onComicsUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'api_fetcher' | 'home_visibility' | 'user_management'>('api_fetcher');

  // --- API FETCHER STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [apiRatingFilter, setApiRatingFilter] = useState<'all' | 'normal' | '18plus'>('18plus');
  const [apiLangFilter, setApiLangFilter] = useState('ko'); // default manhwa 'ko'
  const [apiResults, setApiResults] = useState<FetchedComicPreview[]>([]);
  const [isFetchingApi, setIsFetchingApi] = useState(false);
  const [importedApiIds, setImportedApiIds] = useState<Record<string, boolean>>({});
  const [apiMessage, setApiMessage] = useState<string | null>(null);

  // --- COMIC MANAGEMENT STATE ---
  const [allComics, setAllComics] = useState<Comic[]>([]);
  const [comicFilter, setComicFilter] = useState('');
  const [editingComic, setEditingComic] = useState<Comic | null>(null);
  const [isCreatingComic, setIsCreatingComic] = useState(false);

  // --- USER MANAGEMENT STATE ---
  const [allUsers, setAllUsers] = useState<UserAccount[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPlanType, setNewPlanType] = useState<'plan_5k_single' | 'plan_15k_all' | 'custom'>('plan_5k_single');
  const [newSelectedComicId, setNewSelectedComicId] = useState<string>('');
  const [newNotes, setNewNotes] = useState('');
  const [userActionMessage, setUserActionMessage] = useState<string | null>(null);

  // Load data on open
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = () => {
    setAllComics(store.getComics());
    setAllUsers(store.getUsers());
  };

  // Perform MangaDex live API Search
  const handleSearchApi = async () => {
    setIsFetchingApi(true);
    setApiMessage(null);
    try {
      const results = await searchMangaDexApi(searchQuery, apiRatingFilter, apiLangFilter);
      setApiResults(results);
      if (results.length === 0) {
        setApiMessage('Tidak ditemukan hasil dari API untuk kriteria tersebut. Coba kata kunci lain atau ubah filter.');
      }
    } catch (err: any) {
      setApiMessage('Gagal menghubungi server API: ' + err.message);
    } finally {
      setIsFetchingApi(false);
    }
  };

  // Import fetched comic into catalog
  const handleImportComic = (preview: FetchedComicPreview) => {
    const newComic: Comic = {
      id: 'comic-' + (preview.apiId || Date.now()),
      title: preview.title,
      slug: preview.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      coverImage: preview.coverImage,
      synopsis: preview.synopsis,
      storyWriter: preview.storyWriter || 'Unknown',
      artist: preview.artist || 'Unknown',
      rating: preview.rating || 4.8,
      ratingCount: preview.ratingCount || 12000,
      genres: preview.genres,
      type: preview.type,
      contentRating: preview.contentRating,
      status: preview.status,
      totalChapters: preview.totalChapters || 10,
      totalViews: Math.floor(10000 + Math.random() * 50000),
      showOnHome: true, // Default tampil di beranda
      isTrending: true,
      sourceApi: preview.apiId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.addComic(newComic);
    setImportedApiIds((prev) => ({ ...prev, [preview.apiId]: true }));
    loadData();
    onComicsUpdated();
  };

  // Toggle showOnHome
  const handleToggleHome = (id: string) => {
    store.toggleComicHomeVisibility(id);
    loadData();
    onComicsUpdated();
  };

  // Delete comic
  const handleDeleteComic = (id: string) => {
    if (confirm('Yakin ingin menghapus komik ini dari katalog?')) {
      store.deleteComic(id);
      loadData();
      onComicsUpdated();
    }
  };

  // Save edited comic
  const handleSaveComic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingComic) return;

    store.updateComic(editingComic);
    setEditingComic(null);
    loadData();
    onComicsUpdated();
  };

  // Create new reader user
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      setUserActionMessage('Username dan Password wajib diisi.');
      return;
    }

    if (newPlanType === 'plan_5k_single' && !newSelectedComicId) {
      setUserActionMessage('Untuk Paket 5K, Anda wajib memilih 1 komik 18+ yang diizinkan untuk akun ini.');
      return;
    }

    const newUser: UserAccount = {
      id: 'user-' + Date.now(),
      username: newUsername.trim(),
      password: newPassword.trim(),
      role: 'reader',
      status: 'active',
      planType: newPlanType,
      accessType: newPlanType === 'plan_5k_single' ? 'specific' : 'all',
      allowedComicIds: newPlanType === 'plan_5k_single' ? [newSelectedComicId] : [],
      createdAt: new Date().toISOString(),
      expiresAt: '2026-12-31T23:59:59Z',
      notes: newNotes.trim() || (newPlanType === 'plan_5k_single' ? 'Paket 5K' : 'Paket VIP 15K'),
    };

    store.addUser(newUser);
    loadData();
    setNewUsername('');
    setNewPassword('');
    setNewNotes('');
    setNewSelectedComicId('');
    setUserActionMessage('Akun pembaca berhasil dibuat!');
    setTimeout(() => setUserActionMessage(null), 3000);
  };

  // Update selected comic for 5k user
  const handleChange5kComic = (userId: string, comicId: string) => {
    const user = allUsers.find((u) => u.id === userId);
    if (user) {
      user.allowedComicIds = [comicId];
      store.updateUser(user);
      loadData();
    }
  };

  // Delete user
  const handleDeleteUser = (id: string) => {
    if (confirm('Hapus akun pengguna ini?')) {
      store.deleteUser(id);
      loadData();
    }
  };

  if (!isOpen) return null;

  // Filtered 18+ comics list for 5k dropdown selector
  const adultComics = allComics.filter((c) => c.contentRating === '18plus');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#10131d] border border-slate-700/80 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#141824]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Panel Kontrol Admin &amp; Penarik API</h2>
              <p className="text-xs text-slate-400">Atur Komik, Beranda, Tarik API, dan Akun Berbayar (Paket 5K/15K)</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-[#0d1017] px-6 gap-2 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('api_fetcher')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'api_fetcher'
                ? 'border-rose-500 text-rose-400 bg-rose-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <DownloadCloud className="w-4 h-4" />
            <span>1. Tarik Data API Komik (Normal &amp; 18+)</span>
          </button>

          <button
            onClick={() => setActiveTab('home_visibility')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'home_visibility'
                ? 'border-rose-500 text-rose-400 bg-rose-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>2. Atur Tampilan Beranda ({allComics.length} Komik)</span>
          </button>

          <button
            onClick={() => setActiveTab('user_management')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'user_management'
                ? 'border-rose-500 text-rose-400 bg-rose-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>3. Akun Berbayar (Paket 5K &amp; 15K)</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          
          {/* TAB 1: TARIK DATA API */}
          {activeTab === 'api_fetcher' && (
            <div className="space-y-6">
              <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                  <DownloadCloud className="w-4 h-4" />
                  <span>Cari &amp; Tarik Data Langsung dari API MangaDex (Manga, Manhwa, 18+ Series)</span>
                </div>
                <p className="text-xs text-slate-400">
                  Data judul, story writer, artist penggambar, rating, cover, dan genre akan terisi secara otomatis. Anda bisa langsung mengimpornya ke katalog.
                </p>

                {/* API Search Form */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2">
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      placeholder="Ketik judul komik (contoh: Stepmother, Solo, Revenge, etc)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchApi()}
                      className="w-full bg-[#181c28] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <select
                      value={apiRatingFilter}
                      onChange={(e) => setApiRatingFilter(e.target.value as any)}
                      className="w-full bg-[#181c28] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="18plus">Konten 18+ (Erotica / Dewasa)</option>
                      <option value="normal">Konten Normal (Safe / Umum)</option>
                      <option value="all">Semua Konten (Campur)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <select
                      value={apiLangFilter}
                      onChange={(e) => setApiLangFilter(e.target.value)}
                      className="w-full bg-[#181c28] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="ko">Manhwa (Korea)</option>
                      <option value="ja">Manga (Jepang)</option>
                      <option value="zh">Manhua (China)</option>
                      <option value="">Semua Negara</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      onClick={handleSearchApi}
                      disabled={isFetchingApi}
                      className="w-full h-full min-h-[36px] bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-rose-950/30"
                    >
                      {isFetchingApi ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Search className="w-3.5 h-3.5" />
                      )}
                      <span>{isFetchingApi ? 'Menarik...' : 'Tarik API'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {apiMessage && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{apiMessage}</span>
                </div>
              )}

              {/* API Fetch Results Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider">
                    Hasil Penarikan API ({apiResults.length} Komik)
                  </h4>
                  {apiResults.length > 0 && (
                    <span className="text-[11px] text-emerald-400">Klik "Import ke Katalog" untuk menyimpan komik</span>
                  )}
                </div>

                {apiResults.length === 0 && !isFetchingApi && (
                  <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-8 text-center space-y-2">
                    <DownloadCloud className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400 font-medium">Belum ada hasil pencarian API.</p>
                    <p className="text-[11px] text-slate-500">
                      Klik tombol <strong>"Tarik API"</strong> di atas untuk memuat daftar rekomendasi manhwa / manga langsung dari jaringan MangaDex.
                    </p>
                    <button
                      onClick={handleSearchApi}
                      className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-rose-400 rounded-xl transition-all"
                    >
                      Tarik Contoh Komik Sekarang
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {apiResults.map((item) => {
                    const isImported = importedApiIds[item.apiId] || allComics.some((c) => c.title === item.title);

                    return (
                      <div
                        key={item.apiId}
                        className="bg-[#141826] border border-slate-800 rounded-2xl p-3.5 flex gap-3.5 hover:border-slate-700 transition-all"
                      >
                        <div className="w-20 shrink-0 aspect-[3/4] rounded-xl overflow-hidden bg-slate-900 border border-slate-700">
                          <img
                            src={item.coverImage}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=800&auto=format&fit=crop';
                            }}
                          />
                        </div>

                        <div className="flex-1 flex flex-col justify-between space-y-1.5">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-bold uppercase bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                                {item.type}
                              </span>
                              {item.contentRating === '18plus' ? (
                                <span className="text-[9px] font-bold bg-red-600/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30">
                                  18+ VIP
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold bg-emerald-600/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                  NORMAL
                                </span>
                              )}
                            </div>

                            <h5 className="font-bold text-xs text-white line-clamp-1 mt-1">{item.title}</h5>
                            
                            <p className="text-[10px] text-slate-400">
                              Story: <strong className="text-slate-200">{item.storyWriter}</strong> | Art: <strong className="text-slate-200">{item.artist}</strong>
                            </p>

                            <div className="flex items-center gap-2 mt-1 text-[10px]">
                              <span className="text-amber-400 font-bold flex items-center gap-0.5">
                                <Star className="w-2.5 h-2.5 fill-amber-400" /> {item.rating}
                              </span>
                              <span className="text-slate-500">({item.ratingCount.toLocaleString()} rating)</span>
                            </div>

                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {item.genres.slice(0, 3).map((g, idx) => (
                                <span key={idx} className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded">
                                  {g}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="pt-2">
                            {isImported ? (
                              <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Sudah Masuk Katalog</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleImportComic(item)}
                                className="w-full py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Import ke Katalog</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ATUR TAMPILAN BERANDA & KATALOG */}
          {activeTab === 'home_visibility' && (
            <div className="space-y-6">
              <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-rose-500" />
                    <span>Kelola Visibilitas Beranda &amp; Konten Komik</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Nyalakan atau matikan tombol switch untuk menentukan komik apa saja yang muncul di Beranda (Homepage).
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter daftar komik..."
                    value={comicFilter}
                    onChange={(e) => setComicFilter(e.target.value)}
                    className="w-full bg-[#181c28] border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              {/* Comic List Table */}
              <div className="bg-[#141826] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0e111a] text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Komik</th>
                        <th className="py-3 px-3">Story &amp; Art</th>
                        <th className="py-3 px-3">Tipe / Rating</th>
                        <th className="py-3 px-3">Status Akses</th>
                        <th className="py-3 px-3 text-center">Tampil di Beranda</th>
                        <th className="py-3 px-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {allComics
                        .filter((c) =>
                          c.title.toLowerCase().includes(comicFilter.toLowerCase()) ||
                          c.storyWriter?.toLowerCase().includes(comicFilter.toLowerCase())
                        )
                        .map((comic) => (
                          <tr key={comic.id} className="hover:bg-slate-900/60 transition-colors">
                            {/* Comic Title & Cover */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={comic.coverImage}
                                  alt={comic.title}
                                  className="w-10 h-14 object-cover rounded-lg bg-slate-800 shrink-0"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=800&auto=format&fit=crop';
                                  }}
                                />
                                <div>
                                  <p className="font-bold text-slate-100 line-clamp-1 max-w-[200px]">{comic.title}</p>
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                                    <span>{comic.totalChapters} Ch</span>
                                    <span>•</span>
                                    <span className="text-amber-400 flex items-center">
                                      <Star className="w-2.5 h-2.5 fill-amber-400 mr-0.5" /> {comic.rating}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Story & Art */}
                            <td className="py-3 px-3 text-slate-300">
                              <div className="text-[11px]">
                                <p className="truncate max-w-[130px]">Story: <strong>{comic.storyWriter}</strong></p>
                                <p className="truncate max-w-[130px] text-slate-400">Art: <strong>{comic.artist}</strong></p>
                              </div>
                            </td>

                            {/* Type */}
                            <td className="py-3 px-3">
                              <span className="uppercase text-[10px] font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                                {comic.type}
                              </span>
                            </td>

                            {/* Access Type: Normal vs 18+ */}
                            <td className="py-3 px-3">
                              {comic.contentRating === '18plus' ? (
                                <span className="text-[10px] font-bold bg-red-950 text-red-300 border border-red-800/60 px-2 py-0.5 rounded-full flex items-center gap-1 w-max">
                                  <Lock className="w-2.5 h-2.5" /> 18+ VIP
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded-full w-max">
                                  GRATIS
                                </span>
                              )}
                            </td>

                            {/* Show On Home Toggle */}
                            <td className="py-3 px-3 text-center">
                              <button
                                onClick={() => handleToggleHome(comic.id)}
                                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                                  comic.showOnHome
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-slate-800 text-slate-500 border border-slate-700'
                                }`}
                              >
                                {comic.showOnHome ? 'Tampil (Aktif)' : 'Disembunyikan'}
                              </button>
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setEditingComic(comic)}
                                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg"
                                  title="Edit Komik"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteComic(comic.id)}
                                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg"
                                  title="Hapus Komik"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MANAJEMEN AKUN PEMBACA BERBAYAR (PAKET 5K & 15K) */}
          {activeTab === 'user_management' && (
            <div className="space-y-6">
              {/* Form Tambah Akun */}
              <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <Users className="w-4 h-4" />
                  <span>Daftarkan Akun Pembaca Berbayar (Paket 5K &amp; 15K VIP)</span>
                </div>
                <p className="text-xs text-slate-400">
                  Buat akun untuk pembeli. Untuk <strong>Paket Rp 5.000</strong>, tentukan 1 komik 18+ pilihan yang diizinkan untuk akun tersebut. Untuk <strong>Paket 15K</strong>, user dapat membuka semua komik 18+.
                </p>

                {userActionMessage && (
                  <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{userActionMessage}</span>
                  </div>
                )}

                <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Username Reader</label>
                    <input
                      type="text"
                      placeholder="contoh: budi_reader"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="w-full bg-[#181c28] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Password</label>
                    <input
                      type="text"
                      placeholder="contoh: reader123"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-[#181c28] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Pilih Paket Langganan</label>
                    <select
                      value={newPlanType}
                      onChange={(e) => setNewPlanType(e.target.value as any)}
                      className="w-full bg-[#181c28] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
                    >
                      <option value="plan_5k_single">Paket Rp 5.000 (1 Komik Terpilih)</option>
                      <option value="plan_15k_all">Paket Rp 15.000 (VIP Semua Komik 18+)</option>
                    </select>
                  </div>

                  {newPlanType === 'plan_5k_single' && (
                    <div>
                      <label className="block text-[11px] text-amber-400 mb-1 font-semibold">
                        Komik 18+ Pilihan (Paket 5K)
                      </label>
                      <select
                        value={newSelectedComicId}
                        onChange={(e) => setNewSelectedComicId(e.target.value)}
                        className="w-full bg-[#181c28] border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-amber-300 focus:outline-none"
                      >
                        <option value="">-- Pilih 1 Komik 18+ --</option>
                        {adultComics.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Catatan Transaksi / Pembeli (Opsional)</label>
                    <input
                      type="text"
                      placeholder="contoh: Pembayaran via Dana / WA 0812xxxx"
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      className="w-full bg-[#181c28] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                    >
                      + Daftarkan Akun
                    </button>
                  </div>
                </form>
              </div>

              {/* User List Table */}
              <div className="bg-[#141826] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-200 uppercase tracking-wider">
                    Daftar Akun Pengguna ({allUsers.length} Akun)
                  </h4>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0e111a] text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Username</th>
                        <th className="py-3 px-3">Password</th>
                        <th className="py-3 px-3">Paket Langganan</th>
                        <th className="py-3 px-3">Komik 18+ Terpilih</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {allUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-900/60 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-200">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${user.role === 'admin' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                              <span>{user.username}</span>
                              {user.role === 'admin' && (
                                <span className="bg-amber-500/20 text-amber-400 text-[9px] font-bold px-1.5 py-0.2 rounded border border-amber-500/30">
                                  ADMIN
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                            {user.password || '••••••••'}
                          </td>

                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              user.planType === 'plan_5k_single'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            }`}>
                              {user.planType === 'plan_5k_single' ? 'Paket 5K (1 Komik)' : 'VIP 15K (All Series)'}
                            </span>
                          </td>

                          {/* 18+ Selected Comic for 5K user */}
                          <td className="py-3 px-3">
                            {user.planType === 'plan_5k_single' ? (
                              <select
                                value={user.allowedComicIds?.[0] || ''}
                                onChange={(e) => handleChange5kComic(user.id, e.target.value)}
                                className="bg-slate-900 border border-slate-700 text-amber-300 text-[11px] rounded-lg px-2 py-1 focus:outline-none"
                              >
                                <option value="">Pilih Komik...</option>
                                {adultComics.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.title}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-[11px] text-emerald-400 font-medium">Semua Komik 18+</span>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-semibold">
                              {user.status}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right">
                            {user.role !== 'admin' && (
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg"
                                title="Hapus Akun"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-[#0d1017] border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Semua perubahan tersimpan secara otomatis.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all"
          >
            Tutup Panel
          </button>
        </div>
      </div>
    </div>
  );
};
