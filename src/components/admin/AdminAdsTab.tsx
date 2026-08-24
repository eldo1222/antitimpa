import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { AdItem, AdSlotPosition, AdType } from '../../types';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Megaphone, 
  CheckCircle2, 
  XCircle, 
  X, 
  ExternalLink, 
  MousePointerClick, 
  Eye, 
  ShieldCheck, 
  Sliders, 
  Layers, 
  Code, 
  Image as ImageIcon, 
  FileText, 
  Sparkles, 
  Clock, 
  AlertCircle,
  HelpCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

const POSITION_LABELS: Record<string, { label: string; desc: string; icon: string }> = {
  'home_hero_bottom': { label: 'Beranda: Bawah Slider Hero', desc: 'Tampil tepat setelah carousel banner utama di Beranda', icon: '🏠' },
  'home_between_sections': { label: 'Beranda: Antara Bagian', desc: 'Tampil di sela-sela daftar komik populer & update terbaru', icon: '📑' },
  'home_footer': { label: 'Beranda: Bagian Bawah / Footer', desc: 'Tampil di akhir halaman beranda sebelum footer', icon: '🏁' },
  'detail_top': { label: 'Detail Buku: Bagian Atas', desc: 'Tampil di atas sinopsis komik pada halaman detail komik', icon: '📖' },
  'detail_bottom': { label: 'Detail Buku: Bawah Daftar Chapter', desc: 'Tampil di bawah list chapter komik sebelum kolom komentar', icon: '📚' },
  'reader_top_bar': { label: 'Reader Komik: Top Bar', desc: 'Banner ringkas di bagian atas reader saat membaca PDF/Webtoon', icon: '👁️' },
  'reader_bottom_nav': { label: 'Reader Komik: Bawah Tombol Chapter', desc: 'Tampil di navigasi bawah chapter (tidak menutupi halaman gambar)', icon: '🧭' },
  'popunder': { label: 'Popunder / Direct Link On-Click', desc: 'Membuka tab iklan saat pengguna pertama kali berinteraksi (dengan cooldown anti-spam)', icon: '⚡' },
  'home_top': { label: 'Beranda: Atas (Legacy)', desc: 'Slot iklan beranda bagian atas', icon: '🏠' },
  'home_bottom': { label: 'Beranda: Bawah (Legacy)', desc: 'Slot iklan beranda bagian bawah', icon: '🏁' },
  'comic_detail_bottom': { label: 'Detail Komik (Legacy)', desc: 'Slot iklan halaman detail komik', icon: '📚' },
  'reader_end': { label: 'Akhir Reader (Legacy)', desc: 'Slot iklan akhir reader komik', icon: '🧭' },
  'floating_bottom': { label: 'Floating Banner Melayang', desc: 'Banner sticky di bawah layar dengan tombol close', icon: '🎈' },
  'popunder_global': { label: 'Popunder Global', desc: 'Popunder direct URL global', icon: '⚡' },
};

export const AdminAdsTab: React.FC = () => {
  const { 
    ads, 
    adSettings, 
    addAd, 
    updateAd, 
    deleteAd, 
    toggleAd, 
    updateAdSettings 
  } = useApp();

  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingAd, setEditingAd] = useState<AdItem | null>(null);

  // Form State
  const [title, setTitle] = useState<string>('');
  const [position, setPosition] = useState<AdSlotPosition>('home_hero_bottom');
  const [type, setType] = useState<AdType>('banner');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [htmlCode, setHtmlCode] = useState<string>('');
  const [headline, setHeadline] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [ctaText, setCtaText] = useState<string>('Lihat Selengkapnya');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [showForVip, setShowForVip] = useState<boolean>(false);
  const [sponsorName, setSponsorName] = useState<string>('');
  const [imageSourceType, setImageSourceType] = useState<'url' | 'file'>('url');

  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setEditingAd(null);
    setTitle('');
    setPosition('home_hero_bottom');
    setType('banner');
    setImageUrl('');
    setTargetUrl('');
    setHtmlCode('');
    setHeadline('');
    setDescription('');
    setCtaText('Lihat Selengkapnya');
    setIsActive(true);
    setShowForVip(false);
    setSponsorName('');
    setImageSourceType('url');
    setShowModal(true);
  };

  const handleOpenEdit = (ad: AdItem) => {
    setEditingAd(ad);
    setTitle(ad.title);
    setPosition(ad.position);
    setType(ad.type);
    setImageUrl(ad.imageUrl || '');
    setTargetUrl(ad.targetUrl || '');
    setHtmlCode(ad.htmlCode || '');
    setHeadline(ad.headline || '');
    setDescription(ad.description || '');
    setCtaText(ad.ctaText || 'Lihat Selengkapnya');
    setIsActive(ad.isActive);
    setShowForVip(!!ad.showForVip);
    setSponsorName(ad.sponsorName || '');
    setImageSourceType(ad.imageUrl?.startsWith('data:') ? 'file' : 'url');
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingAd) {
      updateAd(editingAd.id, {
        title,
        position,
        type,
        imageUrl: type === 'banner' ? imageUrl : undefined,
        targetUrl: type === 'html_code' ? undefined : targetUrl,
        htmlCode: type === 'html_code' ? htmlCode : undefined,
        headline: type === 'native_text' ? headline : undefined,
        description: type === 'native_text' ? description : undefined,
        ctaText: type === 'native_text' ? ctaText : undefined,
        isActive,
        showForVip,
        sponsorName
      });
    } else {
      addAd({
        title,
        position,
        type,
        imageUrl: type === 'banner' ? imageUrl : undefined,
        targetUrl: type === 'html_code' ? undefined : targetUrl,
        htmlCode: type === 'html_code' ? htmlCode : undefined,
        headline: type === 'native_text' ? headline : undefined,
        description: type === 'native_text' ? description : undefined,
        ctaText: type === 'native_text' ? ctaText : undefined,
        isActive,
        showForVip,
        sponsorName,
        clickCount: 0,
        viewCount: 0
      });
    }

    setShowModal(false);
  };

  const filteredAds = ads.filter(ad => {
    const matchesFilter = selectedFilter === 'all' || ad.position === selectedFilter || ad.type === selectedFilter;
    const matchesSearch = !searchQuery || 
      ad.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (ad.sponsorName && ad.sponsorName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ad.targetUrl && ad.targetUrl.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const totalClicks = ads.reduce((acc, a) => acc + (a.clickCount || 0), 0);
  const totalViews = ads.reduce((acc, a) => acc + (a.viewCount || 0), 0);
  const activeAdsCount = ads.filter(a => a.isActive).length;

  return (
    <div id="admin-ads-tab-container" className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pb-4 border-b border-[#1c1c2a]">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Manajemen Iklan & Pengaturan Monetisasi
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1c1c2b] text-amber-400 font-semibold border border-amber-500/20">
                  {ads.length} Slot Terpasang
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Kontrol penempatan banner sponsor, script AdSense/ad-network, dan direct link tanpa mengganggu kenyamanan pembaca.
              </p>
            </div>
          </div>
        </div>

        <button
          id="btn-add-new-ad"
          onClick={handleOpenAdd}
          className="px-3.5 py-2 bg-[#ff5b14] hover:bg-[#e04e0e] text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Pasang Iklan Baru</span>
        </button>
      </div>

      {/* Global Monetization Controls Card */}
      <div className="p-4 rounded-2xl bg-[#11111a] border border-[#202030] space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#ff5b14]" />
            <h3 className="text-sm font-bold text-white">Saklar & Pengaturan Global Monetisasi</h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Perubahan berlaku instan dan tersinkronisasi ke seluruh pembaca
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Master Switch */}
          <div className="p-3 rounded-xl bg-[#161622] border border-[#242436] flex items-center justify-between">
            <div className="pr-2">
              <div className="text-xs font-bold text-slate-200">Sistem Iklan Global</div>
              <div className="text-[11px] text-slate-400">Aktifkan / nonaktifkan semua iklan</div>
            </div>
            <button
              id="btn-toggle-global-ads"
              onClick={() => updateAdSettings({ adsEnabled: !adSettings.adsEnabled })}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                adSettings.adsEnabled ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 bg-slate-800'
              }`}
              title="Toggle Global Ads"
            >
              {adSettings.adsEnabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
            </button>
          </div>

          {/* Hide for VIP Switch */}
          <div className="p-3 rounded-xl bg-[#161622] border border-[#242436] flex items-center justify-between">
            <div className="pr-2">
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                Bebas Iklan untuk VIP
              </div>
              <div className="text-[11px] text-slate-400">Sembunyikan iklan jika user VIP</div>
            </div>
            <button
              id="btn-toggle-hide-vip"
              onClick={() => updateAdSettings({ hideAdsForVip: !adSettings.hideAdsForVip })}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                adSettings.hideAdsForVip ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 bg-slate-800'
              }`}
              title="Toggle Hide Ads for VIP"
            >
              {adSettings.hideAdsForVip ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
            </button>
          </div>

          {/* Popunder Engine Switch */}
          <div className="p-3 rounded-xl bg-[#161622] border border-[#242436] flex items-center justify-between">
            <div className="pr-2">
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Popunder On-Click
              </div>
              <div className="text-[11px] text-slate-400">Direct link buka tab baru aman</div>
            </div>
            <button
              id="btn-toggle-popunder"
              onClick={() => updateAdSettings({ popunderEnabled: !adSettings.popunderEnabled })}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                adSettings.popunderEnabled ? 'text-purple-400 bg-purple-500/10' : 'text-slate-500 bg-slate-800'
              }`}
              title="Toggle Popunder"
            >
              {adSettings.popunderEnabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
            </button>
          </div>

          {/* Popunder Cooldown Select */}
          <div className="p-3 rounded-xl bg-[#161622] border border-[#242436] flex flex-col justify-between">
            <div className="text-xs font-bold text-slate-200 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              Batas Spam Popunder
            </div>
            <div className="mt-1.5">
              <select
                id="select-popunder-cooldown"
                value={adSettings.popunderCooldownMinutes || 15}
                onChange={(e) => updateAdSettings({ popunderCooldownMinutes: Number(e.target.value) })}
                className="w-full bg-[#0e0e14] border border-[#28283c] rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-hidden focus:border-[#ff5b14]"
              >
                <option value={5}>Setiap 5 Menit (Agresif)</option>
                <option value={15}>Setiap 15 Menit (Optimal)</option>
                <option value={30}>Setiap 30 Menit (Ramah Pembaca)</option>
                <option value={60}>Setiap 1 Jam (Sangat Nyaman)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#12121c] border border-[#1e1e2c]">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Slot Iklan</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-extrabold text-white mt-1">{ads.length}</div>
          <div className="text-[10px] text-emerald-400 font-medium mt-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {activeAdsCount} Aktif Tayang
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#12121c] border border-[#1e1e2c]">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Impresi / Tayang</span>
            <Eye className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-white mt-1">{totalViews.toLocaleString('id-ID')}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Penayangan ke pengunjung</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#12121c] border border-[#1e1e2c]">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Klik Masuk</span>
            <MousePointerClick className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-extrabold text-white mt-1">{totalClicks.toLocaleString('id-ID')}</div>
          <div className="text-[10px] text-amber-400 font-medium mt-0.5">
            CTR: {totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : 0}%
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#12121c] border border-[#1e1e2c]">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Kebijakan Anti-Spam</span>
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-sm font-bold text-white mt-1">Non-Intrusif</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Tidak menutupi gambar PDF</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-[#12121c] p-3 rounded-xl border border-[#1e1e2c]">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedFilter === 'all' ? 'bg-[#ff5b14] text-white' : 'bg-[#181824] text-slate-400 hover:text-slate-200'
            }`}
          >
            Semua Posisi ({ads.length})
          </button>
          <button
            onClick={() => setSelectedFilter('home_hero_bottom')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedFilter === 'home_hero_bottom' ? 'bg-[#ff5b14] text-white' : 'bg-[#181824] text-slate-400 hover:text-slate-200'
            }`}
          >
            Beranda: Hero
          </button>
          <button
            onClick={() => setSelectedFilter('home_between_sections')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedFilter === 'home_between_sections' ? 'bg-[#ff5b14] text-white' : 'bg-[#181824] text-slate-400 hover:text-slate-200'
            }`}
          >
            Beranda: Sela Komik
          </button>
          <button
            onClick={() => setSelectedFilter('detail_top')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedFilter === 'detail_top' ? 'bg-[#ff5b14] text-white' : 'bg-[#181824] text-slate-400 hover:text-slate-200'
            }`}
          >
            Detail Komik
          </button>
          <button
            onClick={() => setSelectedFilter('reader_bottom_nav')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedFilter === 'reader_bottom_nav' ? 'bg-[#ff5b14] text-white' : 'bg-[#181824] text-slate-400 hover:text-slate-200'
            }`}
          >
            Reader Bottom
          </button>
          <button
            onClick={() => setSelectedFilter('popunder')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedFilter === 'popunder' ? 'bg-[#ff5b14] text-white' : 'bg-[#181824] text-slate-400 hover:text-slate-200'
            }`}
          >
            Popunder
          </button>
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Cari judul / sponsor / link..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#181824] border border-[#242436] rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-[#ff5b14]"
          />
        </div>
      </div>

      {/* Ads List Grid / Cards */}
      {filteredAds.length === 0 ? (
        <div className="p-8 text-center bg-[#12121c] rounded-2xl border border-[#1e1e2c] space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
            <Megaphone className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">Belum Ada Iklan Pada Filter Ini</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Klik tombol "Pasang Iklan Baru" di atas untuk menambahkan banner promosi komik, slot sponsor, atau link affiliasi.
          </p>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-[#ff5b14] text-white text-xs font-bold rounded-xl shadow-md hover:bg-[#e04e0e] transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Iklan Sekarang</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAds.map((ad) => {
            const posInfo = POSITION_LABELS[ad.position] || { label: ad.position, desc: '', icon: '📌' };

            return (
              <div 
                key={ad.id} 
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  ad.isActive 
                    ? 'bg-[#12121c] border-[#222234] hover:border-[#ff5b14]/50' 
                    : 'bg-[#0f0f18]/60 border-[#1a1a28] opacity-75'
                }`}
              >
                <div>
                  {/* Top Badges & Toggle */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-md bg-[#1c1c2a] text-slate-300 font-bold border border-[#2a2a3e] flex items-center gap-1">
                        <span>{posInfo.icon}</span>
                        <span>{posInfo.label}</span>
                      </span>

                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                        ad.type === 'banner' ? 'bg-blue-500/20 text-blue-300' :
                        ad.type === 'html_code' ? 'bg-amber-500/20 text-amber-300' :
                        ad.type === 'popunder' ? 'bg-purple-500/20 text-purple-300' :
                        'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {ad.type}
                      </span>

                      {ad.showForVip && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                          Tayang ke VIP
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => toggleAd(ad.id)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                        ad.isActive 
                          ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' 
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                      title="Klik untuk ubah status aktif"
                    >
                      {ad.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      <span>{ad.isActive ? 'Aktif' : 'Nonaktif'}</span>
                    </button>
                  </div>

                  {/* Title and Sponsor */}
                  <div className="mb-3">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      {ad.title}
                      {ad.sponsorName && (
                        <span className="text-[11px] font-normal text-slate-400">
                          (by {ad.sponsorName})
                        </span>
                      )}
                    </h4>
                    {posInfo.desc && (
                      <p className="text-[11px] text-slate-400 mt-0.5">{posInfo.desc}</p>
                    )}
                  </div>

                  {/* Visual Content Preview */}
                  <div className="mb-3 p-2.5 rounded-xl bg-[#09090e] border border-[#1a1a26]">
                    {ad.type === 'banner' && ad.imageUrl && (
                      <div className="space-y-1.5">
                        <div className="relative rounded-lg overflow-hidden max-h-36 bg-black/40 flex items-center justify-center">
                          <img 
                            src={ad.imageUrl} 
                            alt={ad.title} 
                            className="w-full object-cover max-h-36"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                        {ad.targetUrl && (
                          <div className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                            <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                            <a href={ad.targetUrl} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-400 truncate">
                              {ad.targetUrl}
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {ad.type === 'native_text' && (
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-amber-400">{ad.headline || ad.title}</div>
                        <div className="text-[11px] text-slate-300 line-clamp-2">{ad.description || 'Tidak ada deskripsi'}</div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-slate-500 font-semibold">Tombol: {ad.ctaText || 'Buka Link'}</span>
                          {ad.targetUrl && (
                            <a href={ad.targetUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:underline flex items-center gap-1">
                              Buka Link <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {ad.type === 'html_code' && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-[10px] text-amber-400 font-mono">
                          <Code className="w-3 h-3" />
                          <span>Custom Script / Ad Network Snippet:</span>
                        </div>
                        <pre className="text-[10px] text-slate-400 font-mono bg-black/50 p-2 rounded max-h-20 overflow-hidden line-clamp-3">
                          {ad.htmlCode || '<!-- kosong -->'}
                        </pre>
                      </div>
                    )}

                    {ad.type === 'popunder' && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-[10px] text-purple-400 font-semibold">
                          <Sparkles className="w-3 h-3" />
                          <span>Target Popunder URL:</span>
                        </div>
                        <div className="text-xs text-blue-400 font-mono truncate">
                          {ad.targetUrl || '-'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats & Actions Footer */}
                <div className="pt-3 border-t border-[#1c1c28] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3 text-slate-500" />
                      <b>{ad.viewCount || 0}</b> view
                    </span>
                    <span className="flex items-center gap-1">
                      <MousePointerClick className="w-3 h-3 text-slate-500" />
                      <b>{ad.clickCount || 0}</b> klik
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {ad.targetUrl && (
                      <a
                        href={ad.targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                        title="Buka Link Target"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => handleOpenEdit(ad)}
                      className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Edit Iklan"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Yakin ingin menghapus slot iklan "${ad.title}"?`)) {
                          deleteAd(ad.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Hapus Iklan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#12121c] border border-[#26263a] rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-[#1f1f2e] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#ff5b14]/20 text-[#ff5b14] flex items-center justify-center">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {editingAd ? 'Edit Slot Iklan' : 'Pasang Slot Iklan Baru'}
                  </h3>
                  <p className="text-xs text-slate-400">Atur banner, link promosi, atau kode script sponsor</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1f1f2e] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Ad Title & Sponsor Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-300">Judul / Label Iklan *</label>
                  <input
                    type="text"
                    required
                    placeholder="cth: Promo Langganan VIP Manga / Sponsor XYZ"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-[#181824] border border-[#242436] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-[#ff5b14]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-300">Nama Pengiklan / Sponsor (Opsional)</label>
                  <input
                    type="text"
                    placeholder="cth: KomikYuk Official / Game XYZ"
                    value={sponsorName}
                    onChange={(e) => setSponsorName(e.target.value)}
                    className="w-full bg-[#181824] border border-[#242436] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-[#ff5b14]"
                  />
                </div>
              </div>

              {/* Slot Position & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-300">Posisi Penempatan Slot *</label>
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value as AdSlotPosition)}
                    className="w-full bg-[#181824] border border-[#242436] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-[#ff5b14]"
                  >
                    <option value="home_hero_bottom">Beranda: Bawah Slider Hero</option>
                    <option value="home_between_sections">Beranda: Antara Komik Populer & Baru</option>
                    <option value="home_footer">Beranda: Bagian Bawah / Footer</option>
                    <option value="detail_top">Detail Komik: Atas Sinopsis</option>
                    <option value="detail_bottom">Detail Komik: Bawah List Chapter</option>
                    <option value="reader_top_bar">Reader Komik: Top Bar Ringkas</option>
                    <option value="reader_bottom_nav">Reader Komik: Bawah Tombol Chapter</option>
                    <option value="popunder">Popunder: On-Click Tab Baru</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-300">Format Iklan *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as AdType)}
                    className="w-full bg-[#181824] border border-[#242436] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-[#ff5b14]"
                  >
                    <option value="banner">Banner Gambar Interaktif (Gambar + Link)</option>
                    <option value="native_text">Native Card (Judul + Deskripsi + Tombol)</option>
                    <option value="html_code">HTML / JavaScript Snippet (AdSense/Ad-Network)</option>
                    <option value="popunder">Popunder Direct Link</option>
                  </select>
                </div>
              </div>

              {/* Dynamic inputs based on Type */}
              {type === 'banner' && (
                <div className="p-3.5 rounded-xl bg-[#161622] border border-[#242436] space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-[#ff5b14]" />
                      Gambar Banner Iklan
                    </label>
                    <div className="flex items-center gap-1 bg-[#0f0f18] p-0.5 rounded-lg border border-[#202030]">
                      <button
                        type="button"
                        onClick={() => setImageSourceType('url')}
                        className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${
                          imageSourceType === 'url' ? 'bg-[#ff5b14] text-white' : 'text-slate-400'
                        }`}
                      >
                        URL Gambar
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageSourceType('file')}
                        className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${
                          imageSourceType === 'file' ? 'bg-[#ff5b14] text-white' : 'text-slate-400'
                        }`}
                      >
                        Upload File
                      </button>
                    </div>
                  </div>

                  {imageSourceType === 'url' ? (
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/... atau link gambar iklan lainnya"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full bg-[#0e0e14] border border-[#28283c] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-[#ff5b14]"
                    />
                  ) : (
                    <div>
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
                        className="w-full py-3 bg-[#0e0e14] border border-dashed border-[#28283c] hover:border-[#ff5b14] rounded-xl text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <ImageIcon className="w-4 h-4 text-[#ff5b14]" />
                        <span>{imageUrl ? 'Ganti File Gambar' : 'Pilih Gambar dari Perangkat'}</span>
                      </button>
                    </div>
                  )}

                  {imageUrl && (
                    <div className="relative rounded-lg overflow-hidden max-h-32 bg-black/40 border border-[#262638] flex items-center justify-center">
                      <img src={imageUrl} alt="Preview" className="max-h-32 object-contain" />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block font-bold text-slate-300">URL Target Tujuan (Ketika Iklan Diklik) *</label>
                    <input
                      type="url"
                      placeholder="https://example.com/promo-khusus atau link telegram/WA"
                      value={targetUrl}
                      onChange={(e) => setTargetUrl(e.target.value)}
                      className="w-full bg-[#0e0e14] border border-[#28283c] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-[#ff5b14]"
                    />
                  </div>
                </div>
              )}

              {type === 'native_text' && (
                <div className="p-3.5 rounded-xl bg-[#161622] border border-[#242436] space-y-3">
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-300">Headline Promosi *</label>
                    <input
                      type="text"
                      placeholder="cth: Dapatkan Akses VIP Full Chapter Manga Tanpa Batas!"
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      className="w-full bg-[#0e0e14] border border-[#28283c] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-[#ff5b14]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-slate-300">Deskripsi Pendek *</label>
                    <textarea
                      rows={2}
                      placeholder="Tuliskan keunggulan atau ajakan penawaran..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-[#0e0e14] border border-[#28283c] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-[#ff5b14]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-300">Teks Tombol (CTA)</label>
                      <input
                        type="text"
                        placeholder="cth: Beli VIP Sekarang / Main Game"
                        value={ctaText}
                        onChange={(e) => setCtaText(e.target.value)}
                        className="w-full bg-[#0e0e14] border border-[#28283c] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-[#ff5b14]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold text-slate-300">URL Target Tujuan *</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={targetUrl}
                        onChange={(e) => setTargetUrl(e.target.value)}
                        className="w-full bg-[#0e0e14] border border-[#28283c] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-[#ff5b14]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {type === 'html_code' && (
                <div className="p-3.5 rounded-xl bg-[#161622] border border-[#242436] space-y-2">
                  <label className="block font-bold text-slate-300 flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-amber-400" />
                    Kode HTML / Script AdSense / Jaringan Iklan
                  </label>
                  <textarea
                    rows={4}
                    placeholder="<script async src='...'></script><ins class='adsbygoogle' ...></ins>"
                    value={htmlCode}
                    onChange={(e) => setHtmlCode(e.target.value)}
                    className="w-full font-mono bg-[#0e0e14] border border-[#28283c] rounded-xl p-3 text-xs text-slate-200 focus:outline-hidden focus:border-[#ff5b14]"
                  />
                  <p className="text-[11px] text-slate-400">
                    Pastikan script aman dan mendukung responsive container agar pas di smartphone pembaca.
                  </p>
                </div>
              )}

              {type === 'popunder' && (
                <div className="p-3.5 rounded-xl bg-[#161622] border border-[#242436] space-y-2">
                  <label className="block font-bold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    Target Link Popunder / Affiliasi
                  </label>
                  <input
                    type="url"
                    placeholder="https://directlink-adnetwork.com/..."
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    className="w-full bg-[#0e0e14] border border-[#28283c] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-[#ff5b14]"
                  />
                  <p className="text-[11px] text-slate-400">
                    Popunder akan dibuka di tab baru saat pembaca berinteraksi pertama kali, dibatasi oleh cooldown waktu agar tidak spam.
                  </p>
                </div>
              )}

              {/* Status & VIP Exemption Checkbox */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="p-3 rounded-xl bg-[#161622] border border-[#242436] flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-[#ff5b14] rounded border-slate-700 bg-slate-900 focus:ring-0"
                  />
                  <div>
                    <div className="font-bold text-slate-200 text-xs">Aktifkan Penayangan</div>
                    <div className="text-[11px] text-slate-400">Slot iklan akan langsung tampil ke pembaca</div>
                  </div>
                </label>

                <label className="p-3 rounded-xl bg-[#161622] border border-[#242436] flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showForVip}
                    onChange={(e) => setShowForVip(e.target.checked)}
                    className="w-4 h-4 text-amber-500 rounded border-slate-700 bg-slate-900 focus:ring-0"
                  />
                  <div>
                    <div className="font-bold text-slate-200 text-xs">Tetap Tayang untuk VIP</div>
                    <div className="text-[11px] text-slate-400">Abaikan setting sembunyikan iklan untuk VIP</div>
                  </div>
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-[#1f1f2e] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-[#181824] hover:bg-[#202032] text-slate-300 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#ff5b14] hover:bg-[#e04e0e] text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  {editingAd ? 'Simpan Perubahan' : 'Pasang Iklan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminAdsTab;
