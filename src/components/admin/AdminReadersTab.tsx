import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User, DurationType, PlanType, AccessType } from '../../types';
import { 
  Plus, 
  Trash2, 
  Unlock, 
  Search, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  X,
  Lock,
  KeyRound,
  Sparkles,
  BookOpen,
  Sliders,
  Check,
  Zap,
  Tag,
  Flame,
  Shield,
  Edit3
} from 'lucide-react';

export const AdminReadersTab: React.FC = () => {
  const { users, comics, addUser, updateUser, unlockUser, unlockAllUsers, toggleUserStatus, deleteUser } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState<'all' | '15k' | '5k' | 'locked' | 'expired'>('all');
  const [bulkUnlockMessage, setBulkUnlockMessage] = useState<string | null>(null);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPermissionsUser, setEditingPermissionsUser] = useState<User | null>(null);
  const [editingPasswordUser, setEditingPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // New User Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPlanPreset, setSelectedPlanPreset] = useState<'15k' | '5k' | 'custom'>('15k');
  const [durationType, setDurationType] = useState<DurationType>('1_day');
  const [selectedSingleComicId, setSelectedSingleComicId] = useState<string>(comics[0]?.id || '');
  const [selectedCustomComicIds, setSelectedCustomComicIds] = useState<string[]>([]);
  const [customPriceNote, setCustomPriceNote] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // Edit User Permissions State
  const [editPlanType, setEditPlanType] = useState<PlanType>('plan_15k_all');
  const [editAccessType, setEditAccessType] = useState<AccessType>('all');
  const [editDurationType, setEditDurationType] = useState<DurationType>('1_day');
  const [editAllowedComicIds, setEditAllowedComicIds] = useState<string[]>([]);
  const [editPriceNote, setEditPriceNote] = useState('');

  const readerUsers = users.filter(u => u.role !== 'admin');

  // Stats calculation
  const total15k = readerUsers.filter(u => u.planType === 'plan_15k_all' || u.accessType === 'all' || (!u.planType && !u.allowedComicIds)).length;
  const total5k = readerUsers.filter(u => u.planType === 'plan_5k_single' || u.accessType === 'specific').length;
  const totalLocked = readerUsers.filter(u => u.status === 'locked').length;
  const totalExpired = readerUsers.filter(u => u.status === 'expired').length;

  const filteredUsers = readerUsers.filter(u => {
    const matchesSearch = u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.priceNote && u.priceNote.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterPlan === '15k') {
      return u.planType === 'plan_15k_all' || u.accessType === 'all' || (!u.planType && !u.allowedComicIds);
    }
    if (filterPlan === '5k') {
      return u.planType === 'plan_5k_single' || u.accessType === 'specific';
    }
    if (filterPlan === 'locked') {
      return u.status === 'locked';
    }
    if (filterPlan === 'expired') {
      return u.status === 'expired';
    }

    return true;
  });

  const openAddModal = () => {
    setUsername('');
    setPassword('');
    setSelectedPlanPreset('15k');
    setDurationType('1_day');
    setSelectedSingleComicId(comics[0]?.id || '');
    setSelectedCustomComicIds([]);
    setCustomPriceNote('Rp 15.000 / 1 Hari (Semua Komik)');
    setCreateError(null);
    setCreateSuccess(null);
    setShowAddModal(true);
  };

  const handlePlanPresetChange = (preset: '15k' | '5k' | 'custom') => {
    setSelectedPlanPreset(preset);
    if (preset === '15k') {
      setDurationType('1_day');
      setCustomPriceNote('Rp 15.000 / 1 Hari (Semua Komik)');
    } else if (preset === '5k') {
      setDurationType('1_day');
      const target = comics.find(c => c.id === selectedSingleComicId) || comics[0];
      setCustomPriceNote(`Rp 5.000 / 1 Hari (${target?.title || '1 Judul'})`);
    } else {
      setCustomPriceNote('Custom Tier');
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    let planType: PlanType = 'plan_15k_all';
    let accessType: AccessType = 'all';
    let allowedComicIds: string[] = [];
    let priceNote = customPriceNote;

    if (selectedPlanPreset === '15k') {
      planType = 'plan_15k_all';
      accessType = 'all';
      allowedComicIds = [];
      priceNote = priceNote || 'Rp 15.000 / 1 Hari (Semua Komik)';
    } else if (selectedPlanPreset === '5k') {
      if (!selectedSingleComicId) {
        setCreateError('Silakan pilih judul komik untuk Paket 5k!');
        return;
      }
      planType = 'plan_5k_single';
      accessType = 'specific';
      allowedComicIds = [selectedSingleComicId];
      const targetComic = comics.find(c => c.id === selectedSingleComicId);
      priceNote = priceNote || `Rp 5.000 / 1 Hari (${targetComic?.title || '1 Judul'})`;
    } else {
      planType = 'custom';
      accessType = selectedCustomComicIds.length > 0 ? 'specific' : 'all';
      allowedComicIds = selectedCustomComicIds;
      priceNote = priceNote || 'Paket Custom';
    }

    const res = addUser({
      username,
      password,
      durationType,
      tier: planType === 'plan_15k_all' ? 'Premium' : 'Pro Member',
      planType,
      accessType,
      allowedComicIds,
      priceNote
    });

    if (res.success) {
      setCreateSuccess(res.message);
      setTimeout(() => {
        setShowAddModal(false);
        setUsername('');
        setPassword('');
        setCreateSuccess(null);
      }, 700);
    } else {
      setCreateError(res.message);
    }
  };

  const openEditPermissionsModal = (user: User) => {
    setEditingPermissionsUser(user);
    setEditPlanType(user.planType || (user.accessType === 'specific' ? 'plan_5k_single' : 'plan_15k_all'));
    setEditAccessType(user.accessType || (user.allowedComicIds && user.allowedComicIds.length > 0 ? 'specific' : 'all'));
    setEditDurationType(user.durationType || '1_day');
    setEditAllowedComicIds(user.allowedComicIds || []);
    setEditPriceNote(user.priceNote || '');
  };

  const handleSavePermissions = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPermissionsUser) return;

    let finalAccessType: AccessType = editAccessType;
    let finalAllowedIds = editAllowedComicIds;

    if (editPlanType === 'plan_15k_all') {
      finalAccessType = 'all';
      finalAllowedIds = [];
    } else if (editPlanType === 'plan_5k_single') {
      finalAccessType = 'specific';
      if (finalAllowedIds.length === 0 && comics.length > 0) {
        finalAllowedIds = [comics[0].id];
      }
    }

    updateUser(editingPermissionsUser.id, {
      planType: editPlanType,
      accessType: finalAccessType,
      durationType: editDurationType,
      allowedComicIds: finalAllowedIds,
      priceNote: editPriceNote || (editPlanType === 'plan_15k_all' ? 'Rp 15.000 / All Access' : 'Rp 5.000 / 1 Judul')
    });

    setEditingPermissionsUser(null);
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPasswordUser || !newPassword) return;

    updateUser(editingPasswordUser.id, { passwordHash: newPassword });
    setEditingPasswordUser(null);
    setNewPassword('');
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pb-3 border-b border-[#1c1c2a]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">Manajemen Akun Pembaca & Hak Akses Paket</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Firebase Firestore Active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Atur paket langganan pembaca: <strong>Paket 15k (All Access Semua Komik)</strong> vs <strong>Paket 5k (1 Judul Tertentu)</strong>, durasi, reset password, dan status akun
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-gradient-to-r from-[#ff5b14] to-[#f97316] hover:opacity-90 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-[#ff5b14]/25 flex items-center gap-2 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Akun Pembaca Baru</span>
        </button>
      </div>

      {/* Plan Stat Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div 
          onClick={() => setFilterPlan('15k')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            filterPlan === '15k' 
              ? 'bg-[#ff5b14]/15 border-[#ff5b14]/50 shadow-md' 
              : 'bg-[#12121a] hover:bg-[#181824] border-[#222232]'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-400 font-bold mb-1">
            <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-amber-400" /> Paket 15k</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">All Access</span>
          </div>
          <p className="text-xl font-extrabold text-white">{total15k}</p>
          <p className="text-[10px] text-slate-400">Bisa baca seluruh komik</p>
        </div>

        <div 
          onClick={() => setFilterPlan('5k')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            filterPlan === '5k' 
              ? 'bg-blue-500/15 border-blue-500/50 shadow-md' 
              : 'bg-[#12121a] hover:bg-[#181824] border-[#222232]'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-blue-400 font-bold mb-1">
            <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-blue-400" /> Paket 5k</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">1 Judul</span>
          </div>
          <p className="text-xl font-extrabold text-white">{total5k}</p>
          <p className="text-[10px] text-slate-400">Hanya 1 judul terdaftar</p>
        </div>

        <div 
          onClick={() => setFilterPlan('locked')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            filterPlan === 'locked' 
              ? 'bg-red-500/15 border-red-500/50 shadow-md' 
              : 'bg-[#12121a] hover:bg-[#181824] border-[#222232]'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-red-400 font-bold mb-1">
            <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-red-400" /> 3x Gagal</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">Terkunci</span>
          </div>
          <p className="text-xl font-extrabold text-white">{totalLocked}</p>
          <p className="text-[10px] text-slate-400">Butuh buka kunci</p>
        </div>

        <div 
          onClick={() => setFilterPlan('all')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            filterPlan === 'all' 
              ? 'bg-purple-500/15 border-purple-500/50 shadow-md' 
              : 'bg-[#12121a] hover:bg-[#181824] border-[#222232]'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-purple-400 font-bold mb-1">
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-purple-400" /> Total Akun</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">{readerUsers.length}</span>
          </div>
          <p className="text-xl font-extrabold text-white">{readerUsers.length}</p>
          <p className="text-[10px] text-slate-400">Semua pembaca terdaftar</p>
        </div>
      </div>

      {/* Bulk Unlock Alert Banner if any users are locked */}
      {totalLocked > 0 && (
        <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-red-200">
            <Lock className="w-4 h-4 text-red-400 shrink-0" />
            <div>
              <span className="font-bold text-red-300">Peringatan: Terdapat {totalLocked} akun pembaca yang terkunci!</span>
              <p className="text-[11px] text-red-300/80">Akun terkunci otomatis setelah 3x salah memasukkan password.</p>
            </div>
          </div>
          <button
            onClick={() => {
              const res = unlockAllUsers();
              setBulkUnlockMessage(`Berhasil membuka kunci untuk ${res.count} akun pembaca!`);
              setTimeout(() => setBulkUnlockMessage(null), 4000);
            }}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto shrink-0 shadow-md shadow-red-600/30"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Buka Kunci Semua ({totalLocked})</span>
          </button>
        </div>
      )}

      {bulkUnlockMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-200 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <p>{bulkUnlockMessage}</p>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-[#12121a] p-3 rounded-xl border border-[#1f1f2e]">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari username pembaca atau catatan paket..."
            className="w-full pl-9 pr-3 py-2 bg-[#181824] border border-[#262638] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterPlan('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              filterPlan === 'all' ? 'bg-[#ff5b14] text-white' : 'bg-[#181824] text-slate-400 hover:text-white'
            }`}
          >
            Semua ({readerUsers.length})
          </button>
          <button
            onClick={() => setFilterPlan('15k')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              filterPlan === '15k' ? 'bg-amber-500 text-black font-bold' : 'bg-[#181824] text-slate-400 hover:text-white'
            }`}
          >
            15k All Access ({total15k})
          </button>
          <button
            onClick={() => setFilterPlan('5k')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              filterPlan === '5k' ? 'bg-blue-600 text-white' : 'bg-[#181824] text-slate-400 hover:text-white'
            }`}
          >
            5k 1 Judul ({total5k})
          </button>
          <button
            onClick={() => setFilterPlan('locked')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              filterPlan === 'locked' ? 'bg-red-600 text-white' : 'bg-[#181824] text-slate-400 hover:text-white'
            }`}
          >
            Terkunci ({totalLocked})
          </button>
        </div>
      </div>

      {/* Readers Table */}
      <div className="bg-[#12121a] rounded-xl border border-[#1f1f2e] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#161622] text-slate-400 font-semibold border-b border-[#222234]">
              <tr>
                <th className="p-3">Username & Profil</th>
                <th className="p-3">Paket Langganan & Akses</th>
                <th className="p-3">Durasi</th>
                <th className="p-3">Masa Berlaku (Expired)</th>
                <th className="p-3">Gagal Login</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Aksi & Hak Akses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b1b28]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Tidak ada akun pembaca yang sesuai filter atau pencarian.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => {
                  let expiresLabel = 'Menunggu Login Pertama';
                  if (u.firstLoginAt && u.expiresAt) {
                    const d = new Date(u.expiresAt);
                    expiresLabel = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                  }

                  const is15k = u.planType === 'plan_15k_all' || u.accessType === 'all' || (!u.planType && !u.allowedComicIds);
                  const allowedTitles = comics.filter(c => (u.allowedComicIds || []).includes(c.id)).map(c => c.title);

                  return (
                    <tr key={u.id} className="hover:bg-[#161624] transition-colors">
                      {/* User Info */}
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <img src={u.avatar} alt={u.username} className="w-8 h-8 rounded-xl object-cover ring-1 ring-white/10" />
                          <div>
                            <span className="font-bold text-white text-xs block">{u.username}</span>
                            <span className="text-[10px] text-slate-400">{u.bio || 'Reader Member'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Subscription Plan & Access */}
                      <td className="p-3">
                        {is15k ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              <Sparkles className="w-3 h-3 text-amber-400" />
                              Paket 15k (All Access)
                            </span>
                            <p className="text-[10px] text-slate-400 font-medium">Semua komik di katalog</p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                              <BookOpen className="w-3 h-3 text-blue-400" />
                              Paket 5k ({u.allowedComicIds?.length || 1} Judul)
                            </span>
                            <p className="text-[10px] text-blue-200 line-clamp-1 max-w-[170px]" title={allowedTitles.join(', ')}>
                              {allowedTitles.length > 0 ? allowedTitles.join(', ') : 'Belum ditentukan'}
                            </p>
                          </div>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="p-3 font-semibold text-slate-300 capitalize">
                        {u.durationType.replace('_', ' ')}
                      </td>

                      {/* Expiration */}
                      <td className="p-3">
                        <span className={`text-[11px] font-medium block ${u.status === 'expired' ? 'text-red-400' : 'text-slate-300'}`}>
                          {expiresLabel}
                        </span>
                        {u.firstLoginAt && (
                          <span className="text-[9px] text-slate-500">
                            Mulai: {new Date(u.firstLoginAt).toLocaleDateString('id-ID')}
                          </span>
                        )}
                      </td>

                      {/* Failed attempts */}
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.failedAttempts >= 3 
                            ? 'bg-red-500/20 text-red-300 border border-red-500/40 font-extrabold' 
                            : 'text-slate-400'
                        }`}>
                          {u.failedAttempts} / 3
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          u.status === 'active' 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : u.status === 'locked' 
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {u.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                        {u.status === 'locked' && (
                          <button
                            onClick={() => unlockUser(u.id)}
                            className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
                            title="Buka Kunci Akun 3x Gagal"
                          >
                            <Unlock className="w-3 h-3" />
                            Buka Kunci
                          </button>
                        )}

                        {/* Atur Hak Akses / Paket Modal Button */}
                        <button
                          onClick={() => openEditPermissionsModal(u)}
                          className="px-2.5 py-1 bg-[#ff5b14]/15 hover:bg-[#ff5b14]/25 text-[#ff5b14] border border-[#ff5b14]/30 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
                          title="Atur Hak Akses Komik & Paket Pembaca"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>Atur Paket</span>
                        </button>

                        <button
                          onClick={() => {
                            setEditingPasswordUser(u);
                            setNewPassword('');
                          }}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                          title="Ganti Password"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => toggleUserStatus(u.id)}
                          className="px-2 py-1 bg-[#181824] border border-[#27273a] text-slate-300 hover:text-white rounded-lg text-[11px]"
                        >
                          {u.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`Hapus akun pembaca "${u.username}" dari Firestore?`)) {
                              deleteUser(u.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Hapus Akun"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE READER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#12121a] border border-[#262638] rounded-2xl p-5 text-slate-200 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#202030]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#ff5b14]/20 border border-[#ff5b14]/40 flex items-center justify-center text-[#ff5b14]">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Buat Akun Pembaca Baru</h3>
                  <p className="text-[11px] text-slate-400">Pilih paket langganan (15k All Access / 5k 1 Judul) & durasi</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{createError}</span>
              </div>
            )}
            {createSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{createSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              {/* Account Credentials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">Username Pembaca</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="misal: pembaca_01"
                    className="w-full p-2.5 bg-[#181824] border border-[#27273a] rounded-xl text-white focus:outline-none focus:border-[#ff5b14]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-bold">Kata Sandi (Password)</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full p-2.5 bg-[#181824] border border-[#27273a] rounded-xl text-white focus:outline-none focus:border-[#ff5b14]"
                    required
                  />
                </div>
              </div>

              {/* Subscription Plan Tier Selector */}
              <div className="space-y-2">
                <label className="block text-slate-300 font-bold">Pilih Jenis Paket Akun:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 15k Option */}
                  <div
                    onClick={() => handlePlanPresetChange('15k')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selectedPlanPreset === '15k'
                        ? 'bg-amber-500/15 border-amber-500/60 ring-2 ring-amber-500/20'
                        : 'bg-[#181824] border-[#29293c] hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-amber-400 text-xs flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        Paket Rp 15.000
                      </span>
                      {selectedPlanPreset === '15k' && <Check className="w-4 h-4 text-amber-400" />}
                    </div>
                    <p className="text-[11px] font-bold text-white">VIP All Access (Semua Komik)</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Bisa baca seluruh judul komik tanpa batas.</p>
                  </div>

                  {/* 5k Option */}
                  <div
                    onClick={() => handlePlanPresetChange('5k')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selectedPlanPreset === '5k'
                        ? 'bg-blue-500/15 border-blue-500/60 ring-2 ring-blue-500/20'
                        : 'bg-[#181824] border-[#29293c] hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-blue-400 text-xs flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-blue-400" />
                        Paket Rp 5.000
                      </span>
                      {selectedPlanPreset === '5k' && <Check className="w-4 h-4 text-blue-400" />}
                    </div>
                    <p className="text-[11px] font-bold text-white">1 Judul Tertentu</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Hanya bisa baca 1 judul komik yang dipilih.</p>
                  </div>
                </div>
              </div>

              {/* Single Comic Picker (For 5k Plan) */}
              {selectedPlanPreset === '5k' && (
                <div className="p-3 bg-[#171724] border border-[#2b2b3e] rounded-xl space-y-2">
                  <label className="block text-slate-200 font-bold">
                    Pilih Judul Komik yang Diizinkan (Paket 5k):
                  </label>
                  <select
                    value={selectedSingleComicId}
                    onChange={(e) => {
                      setSelectedSingleComicId(e.target.value);
                      const target = comics.find(c => c.id === e.target.value);
                      setCustomPriceNote(`Rp 5.000 / 1 Hari (${target?.title || '1 Judul'})`);
                    }}
                    className="w-full p-2.5 bg-[#12121a] border border-[#303046] rounded-xl text-white focus:outline-none focus:border-blue-400 font-medium"
                  >
                    {comics.map(c => (
                      <option key={c.id} value={c.id}>
                        📖 {c.title} ({c.status === 'ongoing' ? 'Ongoing' : 'Completed'}) - {c.totalChapters} Ch.
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400">
                    Akun pembaca ini hanya dapat membuka dan membaca chapter dari judul komik di atas.
                  </p>
                </div>
              )}

              {/* Duration Type & Price Note */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">Masa Aktif Paket</label>
                  <select
                    value={durationType}
                    onChange={(e) => setDurationType(e.target.value as DurationType)}
                    className="w-full p-2.5 bg-[#181824] border border-[#27273a] rounded-xl text-white"
                  >
                    <option value="1_day">1 Hari (24 Jam sejak login)</option>
                    <option value="3_days">3 Hari</option>
                    <option value="30_days">30 Hari (1 Bulan)</option>
                    <option value="1_year">1 Tahun</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-bold">Catatan Harga / Keterangan</label>
                  <input
                    type="text"
                    value={customPriceNote}
                    onChange={(e) => setCustomPriceNote(e.target.value)}
                    placeholder="misal: Rp 15.000 / 1 Hari"
                    className="w-full p-2.5 bg-[#181824] border border-[#27273a] rounded-xl text-white focus:outline-none focus:border-[#ff5b14]"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-[#1f1f2e]">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-[#ff5b14] to-[#f97316] hover:opacity-90 text-white font-extrabold rounded-xl shadow-lg shadow-[#ff5b14]/25"
                >
                  Simpan & Daftarkan Akun
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-3 bg-[#1a1a24] text-slate-300 rounded-xl"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT READER PERMISSIONS & PLAN MODAL */}
      {editingPermissionsUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#12121a] border border-[#262638] rounded-2xl p-5 text-slate-200 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#202030]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">
                    Atur Hak Akses: {editingPermissionsUser.username}
                  </h3>
                  <p className="text-[11px] text-slate-400">Ubah paket langganan (15k vs 5k) dan judul komik yang diizinkan</p>
                </div>
              </div>
              <button onClick={() => setEditingPermissionsUser(null)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePermissions} className="space-y-4 text-xs">
              {/* Plan Type Selector */}
              <div className="space-y-2">
                <label className="block text-slate-300 font-bold">Jenis Paket Langganan:</label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => {
                      setEditPlanType('plan_15k_all');
                      setEditAccessType('all');
                      setEditAllowedComicIds([]);
                      setEditPriceNote('Rp 15.000 / All Access');
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      editPlanType === 'plan_15k_all'
                        ? 'bg-amber-500/15 border-amber-500/60 ring-2 ring-amber-500/20'
                        : 'bg-[#181824] border-[#29293c]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-amber-400 text-xs">Paket 15k</span>
                      {editPlanType === 'plan_15k_all' && <Check className="w-4 h-4 text-amber-400" />}
                    </div>
                    <p className="text-[10px] text-slate-300">Akses SEMUA Komik</p>
                  </div>

                  <div
                    onClick={() => {
                      setEditPlanType('plan_5k_single');
                      setEditAccessType('specific');
                      if (editAllowedComicIds.length === 0 && comics.length > 0) {
                        setEditAllowedComicIds([comics[0].id]);
                      }
                      setEditPriceNote('Rp 5.000 / 1 Judul');
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      editPlanType === 'plan_5k_single'
                        ? 'bg-blue-500/15 border-blue-500/60 ring-2 ring-blue-500/20'
                        : 'bg-[#181824] border-[#29293c]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-blue-400 text-xs">Paket 5k</span>
                      {editPlanType === 'plan_5k_single' && <Check className="w-4 h-4 text-blue-400" />}
                    </div>
                    <p className="text-[10px] text-slate-300">1 Judul Tertentu</p>
                  </div>
                </div>
              </div>

              {/* Single / Specific Comic Selector */}
              {editPlanType === 'plan_5k_single' && (
                <div className="p-3.5 bg-[#171724] border border-[#2b2b3e] rounded-xl space-y-2">
                  <label className="block text-slate-200 font-bold">
                    Pilih Judul Komik yang Boleh Dibaca:
                  </label>
                  <select
                    value={editAllowedComicIds[0] || comics[0]?.id || ''}
                    onChange={(e) => setEditAllowedComicIds([e.target.value])}
                    className="w-full p-2.5 bg-[#12121a] border border-[#303046] rounded-xl text-white font-medium"
                  >
                    {comics.map(c => (
                      <option key={c.id} value={c.id}>
                        📖 {c.title} ({c.genres.slice(0, 2).join(', ')})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Duration Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">Durasi Masa Aktif</label>
                  <select
                    value={editDurationType}
                    onChange={(e) => setEditDurationType(e.target.value as DurationType)}
                    className="w-full p-2.5 bg-[#181824] border border-[#27273a] rounded-xl text-white"
                  >
                    <option value="1_day">1 Hari</option>
                    <option value="3_days">3 Hari</option>
                    <option value="30_days">30 Hari</option>
                    <option value="1_year">1 Tahun</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-bold">Keterangan / Harga</label>
                  <input
                    type="text"
                    value={editPriceNote}
                    onChange={(e) => setEditPriceNote(e.target.value)}
                    placeholder="misal: Rp 15.000 / 1 Hari"
                    className="w-full p-2.5 bg-[#181824] border border-[#27273a] rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-[#1f1f2e]">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#ff5b14] hover:bg-[#e04e0e] text-white font-extrabold rounded-xl shadow-lg"
                >
                  Simpan Perubahan Paket
                </button>
                <button
                  type="button"
                  onClick={() => setEditingPermissionsUser(null)}
                  className="px-4 py-3 bg-[#1a1a24] text-slate-300 rounded-xl"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PASSWORD MODAL */}
      {editingPasswordUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#12121a] border border-[#262638] rounded-2xl p-5 text-slate-200 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#202030]">
              <h3 className="font-extrabold text-sm text-white">
                Ganti Password: {editingPasswordUser.username}
              </h3>
              <button onClick={() => setEditingPasswordUser(null)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Password Baru</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter..."
                  className="w-full p-2.5 bg-[#181824] border border-[#27273a] rounded-xl text-white focus:outline-none focus:border-[#ff5b14]"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#ff5b14] hover:bg-[#e04e0e] text-white font-bold rounded-xl"
                >
                  Simpan Password
                </button>
                <button
                  type="button"
                  onClick={() => setEditingPasswordUser(null)}
                  className="px-3 py-2.5 bg-[#1a1a24] text-slate-300 rounded-xl"
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
