import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Comic, ComicCategoryType, ComicContentType } from '../../types';
import { PRESET_GENRES } from '../../data/genres';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Search, 
  BookOpen, 
  Star, 
  Layers, 
  X,
  Eye,
  EyeOff,
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  Tag,
  Zap,
  Globe,
  CheckSquare,
  Square,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Lock
} from 'lucide-react';

export const AdminComicsTab: React.FC = () => {
  const { 
    comics, 
    chapters, 
    addComic, 
    updateComic, 
    deleteComic, 
    batchDeleteComics,
    batchToggleComicHomeVisibility,
    toggleComicHomeVisibility,
    selectComic, 
    setIsAdminView,
    currentUser 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'manga' | 'manhwa' | 'manhua' | '18plus' | 'home' | 'hidden'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingComic, setEditingComic] = useState<Comic | null>(null);

  // Multi-Select & Batch Action States
  const [selectedComicIds, setSelectedComicIds] = useState<string[]>([]);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [comicsToDelete, setComicsToDelete] = useState<Comic[]>([]);
  const [deleteReason, setDeleteReason] = useState('');
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [storyWriter, setStoryWriter] = useState('');
  const [artist, setArtist] = useState('');
  const [status, setStatus] = useState<'ongoing' | 'completed'>('ongoing');
  const [contentType, setContentType] = useState<ComicContentType>('18plus');
  const [comicType, setComicType] = useState<ComicCategoryType>('manga');
  const [isFree, setIsFree] = useState(false);
  const [isVisibleOnHome, setIsVisibleOnHome] = useState(true);
  const [genresText, setGenresText] = useState('');
  const [synopsis, setSynopsis] = useState('');
  
  // External Gateway & Where to Read (MAL style)
  const [hasExternalGateway, setHasExternalGateway] = useState(false);
  const [externalUrl, setExternalUrl] = useState('');
  const [whereToReadText, setWhereToReadText] = useState('');

  // Image Upload States
  const [coverSourceType, setCoverSourceType] = useState<'file' | 'url'>('file');
  const [coverImage, setCoverImage] = useState('');
  const [bannerSourceType, setBannerSourceType] = useState<'file' | 'url'>('file');
  const [bannerImage, setBannerImage] = useState('');

  const coverInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleCoverFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setCoverImage(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setBannerImage(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleGenreTag = (genreName: string) => {
    const currentList = genresText.split(',').map(s => s.trim()).filter(Boolean);
    const exists = currentList.some(g => g.toLowerCase() === genreName.toLowerCase());
    let updated: string[];
    if (exists) {
      updated = currentList.filter(g => g.toLowerCase() !== genreName.toLowerCase());
    } else {
      updated = [...currentList, genreName];
    }
    setGenresText(updated.join(', '));
  };

  const handleOpenAdd = () => {
    setEditingComic(null);
    setTitle('');
    setSlug('');
    setStoryWriter('');
    setArtist('');
    setStatus('ongoing');
    setContentType('18plus');
    setComicType('manhwa');
    setIsFree(false);
    setIsVisibleOnHome(true);
    setGenresText('Romance 18+, Drama Dewasa');
    setSynopsis('');
    setCoverImage('');
    setBannerImage('');
    setCoverSourceType('file');
    setBannerSourceType('file');
    setHasExternalGateway(false);
    setExternalUrl('');
    setWhereToReadText('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (comic: Comic) => {
    setEditingComic(comic);
    setTitle(comic.title);
    setSlug(comic.slug);
    setStoryWriter(comic.storyWriter);
    setArtist(comic.artist);
    setStatus(comic.status?.toLowerCase() === 'completed' ? 'completed' : 'ongoing');
    setContentType(comic.contentType || (comic.genres.some(g => g.includes('18+') || g.includes('Dewasa')) ? '18plus' : 'normal'));
    setComicType(comic.comicType || (comic.type as ComicCategoryType) || 'manga');
    setIsFree(comic.isFree ?? (comic.contentType === 'normal'));
    setIsVisibleOnHome(comic.isVisibleOnHome !== false && comic.showOnHome !== false);
    setGenresText(comic.genres.join(', '));
    setSynopsis(comic.synopsis);
    setCoverImage(comic.coverImage);
    setBannerImage(comic.bannerImage);
    setCoverSourceType(comic.coverImage?.startsWith('data:') ? 'file' : 'url');
    setBannerSourceType(comic.bannerImage?.startsWith('data:') ? 'file' : 'url');
    setHasExternalGateway(comic.hasExternalGateway || !!comic.externalUrl || !!(comic.whereToRead && comic.whereToRead.length > 0));
    setExternalUrl(comic.externalUrl || '');
    
    // Format whereToRead to textarea string
    if (comic.whereToRead && comic.whereToRead.length > 0) {
      setWhereToReadText(
        comic.whereToRead.map(s => {
          if (typeof s === 'string') return s;
          return `${s.platform}: ${s.url}${s.language ? ` | ${s.language}` : ''}`;
        }).join('\n')
      );
    } else {
      setWhereToReadText('');
    }

    setShowAddModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const genresArray = genresText.split(',').map(s => s.trim()).filter(Boolean);

    // Parse whereToReadText into structured items
    const parsedSources = whereToReadText
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map((line, idx) => {
        if (line.includes('|')) {
          const parts = line.split('|').map(s => s.trim());
          const [platUrl, lang] = parts;
          const [platform, url] = platUrl.includes(':') ? [platUrl.split(':')[0].trim(), platUrl.split(':').slice(1).join(':').trim()] : ['Platform', platUrl];
          return {
            id: `ext-${idx + 1}`,
            platform: platform || 'Mitra',
            url: url || platUrl,
            language: lang || 'All',
            isOfficial: true
          };
        }
        if (line.includes(':') && !line.startsWith('http://') && !line.startsWith('https://')) {
          const colonIdx = line.indexOf(':');
          const platform = line.substring(0, colonIdx).trim();
          const url = line.substring(colonIdx + 1).trim();
          return {
            id: `ext-${idx + 1}`,
            platform: platform || 'Mitra',
            url: url,
            language: 'All',
            isOfficial: true
          };
        }
        return {
          id: `ext-${idx + 1}`,
          platform: 'Penyedia',
          url: line,
          language: 'All',
          isOfficial: true
        };
      });

    if (editingComic) {
      updateComic(editingComic.id, {
        title,
        slug: slug || title.toLowerCase().replace(/\s+/g, '-'),
        storyWriter,
        artist,
        status,
        contentType,
        comicType,
        type: comicType,
        isFree: contentType === 'normal' ? true : isFree,
        isVisibleOnHome,
        showOnHome: isVisibleOnHome,
        genres: genresArray,
        synopsis,
        coverImage,
        bannerImage,
        hasExternalGateway,
        externalUrl: externalUrl || undefined,
        whereToRead: parsedSources.length > 0 ? parsedSources : undefined
      });
    } else {
      addComic({
        title,
        slug: slug || title.toLowerCase().replace(/\s+/g, '-'),
        storyWriter: storyWriter || 'Author Studio',
        artist: artist || 'Artist Studio',
        status,
        contentType,
        comicType,
        type: comicType,
        isFree: contentType === 'normal' ? true : isFree,
        isVisibleOnHome,
        showOnHome: isVisibleOnHome,
        genres: genresArray.length > 0 ? genresArray : ['Romance 18+'],
        synopsis: synopsis || 'Sinopsis petualangan komik terbaru.',
        coverImage: coverImage || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
        bannerImage: bannerImage || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80',
        isTrending: true,
        hasExternalGateway,
        externalUrl: externalUrl || undefined,
        whereToRead: parsedSources.length > 0 ? parsedSources : undefined
      });
    }
    setShowAddModal(false);
  };

  const handleToggleHomeVisibility = (comic: Comic) => {
    toggleComicHomeVisibility(comic.id);
  };

  const filteredComics = comics.filter(c => {
    const matchSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        c.genres.some(g => g.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (filterType === 'manga') {
      return matchSearch && (c.comicType === 'manga' || c.type === 'manga');
    }
    if (filterType === 'manhwa') {
      return matchSearch && (c.comicType === 'manhwa' || c.type === 'manhwa');
    }
    if (filterType === 'manhua') {
      return matchSearch && (c.comicType === 'manhua' || c.type === 'manhua');
    }
    if (filterType === '18plus') {
      return matchSearch && (c.contentType === '18plus' || !c.contentType);
    }
    if (filterType === 'home') {
      return matchSearch && (c.isVisibleOnHome !== false && c.showOnHome !== false);
    }
    if (filterType === 'hidden') {
      return matchSearch && (c.isVisibleOnHome === false || c.showOnHome === false);
    }
    return matchSearch;
  });

  const isAllSelected = filteredComics.length > 0 && filteredComics.every(c => selectedComicIds.includes(c.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedComicIds([]);
    } else {
      setSelectedComicIds(filteredComics.map(c => c.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedComicIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBatchHideFromHome = () => {
    if (selectedComicIds.length === 0) return;
    batchToggleComicHomeVisibility(selectedComicIds, false);
    setSelectedComicIds([]);
  };

  const handleBatchShowOnHome = () => {
    if (selectedComicIds.length === 0) return;
    batchToggleComicHomeVisibility(selectedComicIds, true);
    setSelectedComicIds([]);
  };

  const handleRequestSingleDelete = (comic: Comic) => {
    setComicsToDelete([comic]);
    setDeleteReason('');
    setAdminPasswordConfirm('');
    setDeleteError(null);
    setShowDeleteConfirmModal(true);
  };

  const handleRequestBatchDelete = () => {
    const targets = comics.filter(c => selectedComicIds.includes(c.id));
    if (targets.length === 0) return;
    setComicsToDelete(targets);
    setDeleteReason('');
    setAdminPasswordConfirm('');
    setDeleteError(null);
    setShowDeleteConfirmModal(true);
  };

  const handleConfirmDelete = (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);

    const ids = comicsToDelete.map(c => c.id);
    const reasonText = deleteReason.trim() || 'Penghapusan data komik oleh Administrator';

    batchDeleteComics(ids, reasonText);
    setShowDeleteConfirmModal(false);
    setSelectedComicIds(prev => prev.filter(id => !ids.includes(id)));
  };

  const handleViewFrontend = (comicId: string) => {
    selectComic(comicId);
    setIsAdminView(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pb-2 border-b border-[#1c1c2a]">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#ff5b14]" />
            <span>Katalog &amp; Manajemen Komik</span>
          </h2>
          <p className="text-xs text-slate-400">
            Total {comics.length} judul komik • Kelola visibilitas beranda, status, kategori 18+, dan operasi batch
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-3.5 py-2 bg-[#ff5b14] hover:bg-[#e04e0e] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Komik Manual</span>
        </button>
      </div>

      {selectedComicIds.length > 0 && (
        <div className="p-3 bg-[#171724] border border-[#ff5b14]/40 rounded-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in shadow-lg">
          <div className="flex items-center gap-2 text-xs text-white">
            <span className="px-2.5 py-1 rounded-lg bg-[#ff5b14] font-extrabold text-white">
              {selectedComicIds.length} Komik Terpilih
            </span>
            <span className="text-slate-400 hidden sm:inline">Pilih tindakan massal:</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchHideFromHome}
              className="px-3 py-1.5 bg-[#1f1f30] hover:bg-[#282840] text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Tarik dan sembunyikan komik terpilih dari halaman beranda pembaca"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Tarik / Sembunyikan dari Beranda</span>
            </button>

            <button
              onClick={handleBatchShowOnHome}
              className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Tampilkan komik terpilih ke halaman beranda"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Tampilkan di Beranda</span>
            </button>

            <button
              onClick={handleRequestBatchDelete}
              className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Hapus komik terpilih beserta chapternya"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Banyak ({selectedComicIds.length})</span>
            </button>

            <button
              onClick={() => setSelectedComicIds([])}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              title="Batalkan Pilihan"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#12121a] p-3 rounded-xl border border-[#1f1f2e]">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan judul atau genre..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#181824] border border-[#262638] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none text-xs">
          {(['all', 'manga', 'manhwa', 'manhua', '18plus', 'home', 'hidden'] as const).map(ft => (
            <button
              key={ft}
              onClick={() => setFilterType(ft)}
              className={`px-3 py-1.5 rounded-lg font-bold capitalize whitespace-nowrap transition-colors cursor-pointer ${
                filterType === ft
                  ? 'bg-[#ff5b14] text-white shadow-xs'
                  : 'bg-[#181824] text-slate-400 hover:text-slate-200 hover:bg-[#202030]'
              }`}
            >
              {ft === 'all' && `Semua (${comics.length})`}
              {ft === 'manga' && '🇯🇵 Manga'}
              {ft === 'manhwa' && '🇰🇷 Manhwa'}
              {ft === 'manhua' && '🇨🇳 Manhua'}
              {ft === '18plus' && '🔞 18+ VIP'}
              {ft === 'home' && '👁️ Tampil Beranda'}
              {ft === 'hidden' && '🚫 Disembunyikan'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#12121a] rounded-xl border border-[#1f1f2e] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#161622] text-slate-400 font-semibold border-b border-[#222234]">
              <tr>
                <th className="p-3 w-10 text-center">
                  <button 
                    onClick={handleToggleSelectAll}
                    className="text-slate-400 hover:text-white cursor-pointer"
                    title={isAllSelected ? 'Batalkan Pilih Semua' : 'Pilih Semua'}
                  >
                    {isAllSelected ? <CheckSquare className="w-4 h-4 text-[#ff5b14]" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="p-3">Cover &amp; Judul</th>
                <th className="p-3">Jenis Komik</th>
                <th className="p-3">Akses Konten</th>
                <th className="p-3">Tampil di Beranda</th>
                <th className="p-3">Genre</th>
                <th className="p-3">Status</th>
                <th className="p-3">Chapter</th>
                <th className="p-3">Rating</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b1b28]">
              {filteredComics.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    Tidak ada komik yang sesuai dengan filter atau pencarian.
                  </td>
                </tr>
              ) : (
                filteredComics.map(comic => {
                  const isSelected = selectedComicIds.includes(comic.id);
                  const chCount = (chapters[comic.id] || []).length;
                  const isNormal = comic.contentType === 'normal' || comic.isFree === true;
                  const isHome = comic.isVisibleOnHome !== false && comic.showOnHome !== false;
                  const cType = comic.comicType || (comic.type as ComicCategoryType) || 'manga';

                  return (
                    <tr key={comic.id} className={`hover:bg-[#161624] transition-colors ${isSelected ? 'bg-[#ff5b14]/5' : ''}`}>
                      <td className="p-3 text-center">
                        <button 
                          onClick={() => handleToggleSelectOne(comic.id)}
                          className="cursor-pointer text-slate-400 hover:text-white"
                        >
                          {isSelected ? <CheckSquare className="w-4 h-4 text-[#ff5b14]" /> : <Square className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="p-3 flex items-center gap-3">
                        <img 
                          src={comic.coverImage} 
                          alt={comic.title} 
                          className="w-9 h-12 rounded-lg object-cover shrink-0 border border-[#27273a]" 
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-white text-xs block truncate">{comic.title}</span>
                          <span className="text-[10px] text-slate-400">{comic.storyWriter} / {comic.artist}</span>
                        </div>
                      </td>

                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border whitespace-nowrap ${
                          cType === 'manga'
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                            : cType === 'manhwa'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : cType === 'manhua'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        }`}>
                          {cType === 'manga' && '🇯🇵 Manga'}
                          {cType === 'manhwa' && '🇰🇷 Manhwa'}
                          {cType === 'manhua' && '🇨🇳 Manhua'}
                          {cType === 'webtoon' && '🔞 18+ Webtoon'}
                        </span>
                      </td>

                      <td className="p-3">
                        {isNormal ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                            🟢 Normal (Bebas)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30 whitespace-nowrap">
                            🔞 18+ VIP
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        <button
                          onClick={() => handleToggleHomeVisibility(comic)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isHome
                              ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30'
                          }`}
                          title={isHome ? 'Klik untuk menarik/sembunyikan dari beranda' : 'Klik untuk menampilkan ke beranda'}
                        >
                          {isHome ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-rose-400" />}
                          <span>{isHome ? 'Tampil di Beranda' : 'Disembunyikan'}</span>
                        </button>
                      </td>

                      <td className="p-3 max-w-[140px] truncate text-slate-400 text-[11px]">
                        {comic.genres.slice(0, 2).join(', ')}
                        {comic.genres.length > 2 && '...'}
                      </td>

                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          comic.status === 'completed'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {comic.status || 'ongoing'}
                        </span>
                      </td>

                      <td className="p-3 font-semibold text-slate-300">
                        {chCount} Bab
                      </td>

                      <td className="p-3 font-bold text-amber-400 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{comic.rating || '4.8'}</span>
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewFrontend(comic.id)}
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Pratinjau di Reader"
                          >
                            <Globe className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(comic)}
                            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Edit Komik"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRequestSingleDelete(comic)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Komik"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#12121a] border border-[#262638] rounded-2xl p-5 text-slate-200 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#202030]">
              <h3 className="font-extrabold text-sm text-white">
                {editingComic ? 'Edit Data Komik' : 'Tambah Komik Baru'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Judul Komik</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Solo Leveling Ragnarok"
                  className="w-full p-2 bg-[#181824] border border-[#27273a] rounded-xl text-white focus:outline-none focus:border-[#ff5b14]"
                  required
                />
              </div>

              {/* Jenis Komik (Manga, Manhwa, Manhua, Webtoon) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Jenis Komik (Kategori Asal)</label>
                  <select
                    value={comicType}
                    onChange={(e) => setComicType(e.target.value as ComicCategoryType)}
                    className="w-full p-2 bg-[#181824] border border-[#27273a] rounded-xl text-white font-bold"
                  >
                    <option value="manga">🇯🇵 Manga (Jepang)</option>
                    <option value="manhwa">🇰🇷 Manhwa (Korea)</option>
                    <option value="manhua">🇨🇳 Manhua (China)</option>
                    <option value="webtoon">🔞 18+ Webtoon</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Status Publikasi</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full p-2 bg-[#181824] border border-[#27273a] rounded-xl text-white"
                  >
                    <option value="ongoing">Ongoing (Sedang Berjalan)</option>
                    <option value="completed">Completed (Tamat)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Penulis Cerita (Story)</label>
                  <input
                    type="text"
                    value={storyWriter}
                    onChange={(e) => setStoryWriter(e.target.value)}
                    placeholder="Contoh: Chugong"
                    className="w-full p-2 bg-[#181824] border border-[#27273a] rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Ilustrator (Art)</label>
                  <input
                    type="text"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    placeholder="Contoh: REDICE Studio"
                    className="w-full p-2 bg-[#181824] border border-[#27273a] rounded-xl text-white"
                  />
                </div>
              </div>

              {/* Content Category & Home Visibility Settings */}
              <div className="p-3 bg-[#161622] rounded-xl border border-[#27273a] space-y-3">
                <span className="text-slate-300 font-bold text-xs block">
                  ⚙️ Kategori Konten & Visibilitas Beranda
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Tipe Akses Konten</label>
                    <select
                      value={contentType}
                      onChange={(e) => {
                        const val = e.target.value as 'normal' | '18plus';
                        setContentType(val);
                        if (val === 'normal') setIsFree(true);
                      }}
                      className="w-full p-2 bg-[#101018] border border-[#2c2c3e] rounded-xl text-white font-semibold"
                    >
                      <option value="normal">🟢 Komik Normal (Bebas Baca Gratis)</option>
                      <option value="18plus">🔞 Komik Dewasa (18+ VIP - Wajib Akun & Koin)</option>
                    </select>
                  </div>

                  <div className="flex flex-col justify-center gap-2">
                    <label className="flex items-center gap-2 text-slate-300 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isVisibleOnHome}
                        onChange={(e) => setIsVisibleOnHome(e.target.checked)}
                        className="rounded border-[#3a3a4e] text-[#ff5b14] focus:ring-[#ff5b14] w-4 h-4 cursor-pointer"
                      />
                      <span>Tampilkan di Halaman Beranda (Home)</span>
                    </label>

                    {contentType === '18plus' && (
                      <label className="flex items-center gap-2 text-slate-400 text-[11px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isFree}
                          onChange={(e) => setIsFree(e.target.checked)}
                          className="rounded border-[#3a3a4e] text-emerald-500 w-3.5 h-3.5"
                        />
                        <span>Jadikan komik 18+ ini bebas baca (Promosi)</span>
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Genre Selector */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold flex items-center gap-1">
                  <Tag className="w-3 h-3 text-[#ff5b14]" />
                  <span>Genre Komik (Pilih Tag / Ketik)</span>
                </label>
                <input
                  type="text"
                  value={genresText}
                  onChange={(e) => setGenresText(e.target.value)}
                  placeholder="Contoh: Action, Fantasy, Leveling"
                  className="w-full p-2 bg-[#181824] border border-[#27273a] rounded-xl text-white font-mono text-xs focus:border-[#ff5b14] focus:outline-none"
                />
                
                {/* Preset Genre Quick Tag Pills */}
                <div className="p-2 bg-[#101018] rounded-xl border border-[#222232] space-y-1.5">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">
                    Klik Tag Cepat Genre:
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                    {PRESET_GENRES.map((g) => {
                      const currentList = genresText.split(',').map(s => s.trim().toLowerCase());
                      const isSelected = currentList.includes(g.toLowerCase());
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => toggleGenreTag(g)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#ff5b14] text-white shadow-xs'
                              : 'bg-[#181824] hover:bg-[#252538] text-slate-400 hover:text-slate-200 border border-[#262638]'
                          }`}
                        >
                          {isSelected ? `✓ ${g}` : `+ ${g}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Sinopsis</label>
                <textarea
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  placeholder="Ringkasan cerita komik..."
                  rows={3}
                  className="w-full p-2 bg-[#181824] border border-[#27273a] rounded-xl text-white"
                />
              </div>

              {/* Cover Image Upload (Portrait) */}
              <div className="p-3 bg-[#161622] rounded-xl border border-[#262638] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-[#ff5b14]" />
                    <span>Cover Komik (Portrait)</span>
                  </label>
                  <div className="flex bg-[#101018] p-0.5 rounded-lg border border-[#242434] text-[10px]">
                    <button
                      type="button"
                      onClick={() => setCoverSourceType('file')}
                      className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer ${
                        coverSourceType === 'file' ? 'bg-[#ff5b14] text-white' : 'text-slate-400'
                      }`}
                    >
                      Upload JPG/PNG
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverSourceType('url')}
                      className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer ${
                        coverSourceType === 'url' ? 'bg-[#ff5b14] text-white' : 'text-slate-400'
                      }`}
                    >
                      Link URL
                    </button>
                  </div>
                </div>

                {coverSourceType === 'file' ? (
                  <div className="flex items-center gap-3">
                    <div 
                      onClick={() => coverInputRef.current?.click()}
                      className="flex-1 border-2 border-dashed border-[#ff5b14]/40 hover:border-[#ff5b14] rounded-xl p-3 text-center cursor-pointer bg-[#101018] transition-colors"
                    >
                      <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handleCoverFileUpload}
                        className="hidden"
                      />
                      <Upload className="w-5 h-5 text-[#ff5b14] mx-auto mb-1" />
                      <p className="font-semibold text-slate-300 text-[11px]">
                        {coverImage ? 'Klik untuk mengganti file JPG/PNG' : 'Pilih File Gambar Cover (JPG/PNG)'}
                      </p>
                      <p className="text-[9px] text-slate-500">Rasio portrait 3:4 disarankan</p>
                    </div>

                    {coverImage && (
                      <div className="relative w-14 h-18 rounded-lg overflow-hidden border border-[#ff5b14] shrink-0">
                        <img src={coverImage} alt="Cover Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type="url"
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    placeholder="https://images.unsplash.com/... or image link"
                    className="w-full p-2 bg-[#101018] border border-[#27273a] rounded-xl text-white font-mono text-[11px]"
                  />
                )}
              </div>

              {/* Banner Image Upload (Landscape) */}
              <div className="p-3 bg-[#161622] rounded-xl border border-[#262638] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                    <span>Banner Header (Landscape)</span>
                  </label>
                  <div className="flex bg-[#101018] p-0.5 rounded-lg border border-[#242434] text-[10px]">
                    <button
                      type="button"
                      onClick={() => setBannerSourceType('file')}
                      className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer ${
                        bannerSourceType === 'file' ? 'bg-blue-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Upload JPG/PNG
                    </button>
                    <button
                      type="button"
                      onClick={() => setBannerSourceType('url')}
                      className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer ${
                        bannerSourceType === 'url' ? 'bg-blue-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Link URL
                    </button>
                  </div>
                </div>

                {bannerSourceType === 'file' ? (
                  <div className="flex flex-col gap-2">
                    <div 
                      onClick={() => bannerInputRef.current?.click()}
                      className="border-2 border-dashed border-blue-500/40 hover:border-blue-500 rounded-xl p-3 text-center cursor-pointer bg-[#101018] transition-colors"
                    >
                      <input
                        ref={bannerInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handleBannerFileUpload}
                        className="hidden"
                      />
                      <Upload className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                      <p className="font-semibold text-slate-300 text-[11px]">
                        {bannerImage ? 'Klik untuk mengganti banner' : 'Pilih File Gambar Banner (JPG/PNG)'}
                      </p>
                      <p className="text-[9px] text-slate-500">Rasio landscape 16:9 disarankan</p>
                    </div>

                    {bannerImage && (
                      <div className="relative w-full h-20 rounded-lg overflow-hidden border border-blue-500 shrink-0">
                        <img src={bannerImage} alt="Banner Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type="url"
                    value={bannerImage}
                    onChange={(e) => setBannerImage(e.target.value)}
                    placeholder="https://images.unsplash.com/... or banner link"
                    className="w-full p-2 bg-[#101018] border border-[#27273a] rounded-xl text-white font-mono text-[11px]"
                  />
                )}
              </div>

              {/* Where to Read / External Gateway Section (MAL Style) */}
              <div className="p-3.5 bg-[#161622] rounded-xl border border-purple-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                    <Globe className="w-4 h-4" />
                    <span>Gateway "Where to Read / Watch" & Mitra (MAL Style)</span>
                  </div>

                  <label className="flex items-center gap-1.5 text-xs text-purple-300 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasExternalGateway}
                      onChange={(e) => setHasExternalGateway(e.target.checked)}
                      className="rounded border-[#3a3a4e] text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Aktifkan Gateway</span>
                  </label>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Fitur ini memungkinkan judul anime/komik (termasuk hasil scraping Jikan/MAL tanpa chapter lokal) menyediakan tombol pop-up rujukan mitra resmi/scanlation (seperti Crunchyroll, NHentai, MangaDex, Muse Asia, dll).
                </p>

                {hasExternalGateway && (
                  <div className="space-y-3 pt-1 border-t border-[#252538]">
                    <div>
                      <label className="block text-slate-300 mb-1 font-semibold text-xs">
                        Daftar Tautan Platform Penyedia (Format: <code className="text-purple-300">Platform: URL | Bahasa</code>):
                      </label>
                      <textarea
                        value={whereToReadText}
                        onChange={(e) => setWhereToReadText(e.target.value)}
                        placeholder="NHentai: https://nhentai.net/g/123456 | Raw&#10;MangaDex: https://mangadex.org/title/123456 | EN&#10;Crunchyroll: https://crunchyroll.com/series/123456 | Sub ID"
                        rows={3}
                        className="w-full p-2.5 bg-[#101018] border border-[#2c2c3e] rounded-xl text-white font-mono text-xs focus:border-purple-500"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        Satu platform per baris. Contoh: <code className="text-slate-400">NHentai: https://nhentai.net/g/123456 | Bahasa Indonesia</code>
                      </p>
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1 font-semibold text-xs">
                        Tautan Utama / Default External URL (Opsional):
                      </label>
                      <input
                        type="url"
                        value={externalUrl}
                        onChange={(e) => setExternalUrl(e.target.value)}
                        placeholder="https://nhentai.net/g/123456/"
                        className="w-full p-2 bg-[#101018] border border-[#2c2c3e] rounded-xl text-white font-mono text-xs focus:border-purple-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-[#1f1f2e]">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#ff5b14] hover:bg-[#e04e0e] text-white font-bold rounded-xl shadow cursor-pointer"
                >
                  {editingComic ? 'Simpan Perubahan' : 'Tambah Komik'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-[#1a1a24] text-slate-300 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Custom Delete Confirmation Modal with Audit Reason (ISO/IEC 27001) */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-[#12121a] border border-red-500/30 rounded-2xl p-5 text-slate-200 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#202030]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Konfirmasi Hapus Komik (Audit Trail)</h3>
                  <p className="text-[10px] text-slate-400">Pencatatan Alasan &amp; Verifikasi Super Admin</p>
                </div>
              </div>
              <button 
                onClick={() => setShowDeleteConfirmModal(false)} 
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/25 text-xs text-red-200 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5 text-red-400">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {comicsToDelete.length === 1 ? 'Hapus 1 Judul Komik' : `Hapus Massal ${comicsToDelete.length} Judul Komik`}
              </p>
              <div className="max-h-24 overflow-y-auto space-y-0.5 text-[11px] text-red-200/90 pl-1 font-mono">
                {comicsToDelete.map(c => (
                  <p key={c.id} className="truncate">• {c.title}</p>
                ))}
              </div>
              <p className="text-[10px] text-red-300/80 pt-1">
                ⚠️ Seluruh data bab / chapter yang terhubung dengan komik ini juga akan dihapus permanen dari sistem.
              </p>
            </div>

            {deleteError && (
              <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-xs text-red-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmDelete} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  Alasan Penghapusan (Masuk ke Log Aktivitas):
                </label>
                <input
                  type="text"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Contoh: Pembersihan komik duplikat / permintaan DMCA..."
                  className="w-full p-2 bg-[#181824] border border-[#27273a] rounded-xl text-white text-xs focus:outline-none focus:border-[#ff5b14]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#1f1f2e]">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirmModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white bg-[#181824] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Konfirmasi Hapus ({comicsToDelete.length})</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminComicsTab;
