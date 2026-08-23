import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Banner } from '../../types';
import { Plus, Trash2, Edit, Image as ImageIcon, CheckCircle, XCircle, X, Upload } from 'lucide-react';

export const AdminBannersTab: React.FC = () => {
  const { banners, addBanner, updateBanner, deleteBanner, comics } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageSourceType, setImageSourceType] = useState<'file' | 'url'>('file');
  const [imageUrl, setImageUrl] = useState('');
  const [linkComicId, setLinkComicId] = useState('');
  const [badge, setBadge] = useState('HOT RELEASE');
  const [isActive, setIsActive] = useState(true);

  const bannerFileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setImageUrl(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenAdd = () => {
    setEditingBanner(null);
    setTitle('');
    setSubtitle('');
    setImageUrl('');
    setImageSourceType('file');
    setLinkComicId(comics[0]?.id || '');
    setBadge('TRENDING');
    setIsActive(true);
    setShowModal(true);
  };

  const handleOpenEdit = (b: Banner) => {
    setEditingBanner(b);
    setTitle(b.title);
    setSubtitle(b.subtitle);
    setImageUrl(b.imageUrl);
    setImageSourceType(b.imageUrl?.startsWith('data:') ? 'file' : 'url');
    setLinkComicId(b.linkComicId);
    setBadge(b.badge || 'HOT RELEASE');
    setIsActive(b.isActive);
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBanner) {
      updateBanner(editingBanner.id, {
        title,
        subtitle,
        imageUrl: imageUrl || editingBanner.imageUrl,
        linkComicId,
        badge,
        isActive
      });
    } else {
      addBanner({
        title,
        subtitle,
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80',
        linkComicId: linkComicId || comics[0]?.id || 'comic-1',
        badge,
        isActive,
        priority: banners.length + 1
      });
    }
    setShowModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pb-2 border-b border-[#1c1c2a]">
        <div>
          <h2 className="text-base font-bold text-white">Manajemen Banner & Slider Promo</h2>
          <p className="text-xs text-slate-400">Atur banner promosi komik unggulan yang tampil di beranda aplikasi pembaca</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-3.5 py-2 bg-[#ff5b14] hover:bg-[#e04e0e] text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Banner Baru</span>
        </button>
      </div>

      {/* Banner Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {banners.map(b => (
          <div key={b.id} className="bg-[#12121a] rounded-xl border border-[#1f1f2e] overflow-hidden flex flex-col justify-between">
            <div className="relative aspect-[16/8] bg-[#1a1a26]">
              <img src={b.imageUrl} alt={b.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 flex flex-col justify-end">
                {b.badge && (
                  <span className="px-2 py-0.5 rounded bg-[#ff5b14] text-white text-[10px] font-extrabold w-fit mb-1">
                    {b.badge}
                  </span>
                )}
                <h3 className="font-extrabold text-sm text-white">{b.title}</h3>
                <p className="text-xs text-slate-300 line-clamp-1">{b.subtitle}</p>
              </div>
            </div>

            <div className="p-3 bg-[#151520] flex items-center justify-between border-t border-[#1e1e2d] text-xs">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                  b.isActive ? 'text-emerald-400' : 'text-slate-500'
                }`}>
                  {b.isActive ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  {b.isActive ? 'Aktif Tayang' : 'Nonaktif'}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => updateBanner(b.id, { isActive: !b.isActive })}
                  className="px-2 py-1 bg-[#1a1a26] text-slate-300 hover:text-white rounded-lg text-[11px]"
                >
                  {b.isActive ? 'Matikan' : 'Aktifkan'}
                </button>
                <button
                  onClick={() => handleOpenEdit(b)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg"
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
                  className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg"
                  title="Hapus Banner"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#12121a] border border-[#262638] rounded-2xl p-5 text-slate-200 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#202030]">
              <h3 className="font-extrabold text-sm text-white">
                {editingBanner ? 'Edit Banner' : 'Tambah Banner Promo Baru'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
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
                      Upload JPG/PNG
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

              <div className="flex gap-2 pt-2 border-t border-[#1f1f2e]">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#ff5b14] hover:bg-[#e04e0e] text-white font-bold rounded-xl shadow"
                >
                  Simpan Banner
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-[#1a1a24] text-slate-300 rounded-xl"
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
