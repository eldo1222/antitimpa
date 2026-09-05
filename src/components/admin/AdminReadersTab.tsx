import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { User, DurationType, PlanType, AccessType } from '../../types';
import { UserRepository, UserDetailStats } from '../../features/users/services/userRepository';
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
  Shield,
  Phone,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  Activity,
  Bookmark,
  RefreshCw,
  UserCheck,
  UserX,
  FileText
} from 'lucide-react';

export const AdminReadersTab: React.FC = () => {
  const { users: localUsers, comics, addUser, updateUser, unlockUser, unlockAllUsers, toggleUserStatus, deleteUser } = useApp();

  // Pagination & Server Query State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'inactive' | 'locked' | 'expired' | 'admin' | 'reader' | '15k' | '5k'>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'oldest' | 'last_active' | 'name_asc' | 'name_desc'>('created_at');
  
  // Data results
  const [paginatedUsers, setPaginatedUsers] = useState<User[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // User Detail Modal State
  const [selectedDetailUser, setSelectedDetailUser] = useState<User | null>(null);
  const [userDetailStats, setUserDetailStats] = useState<UserDetailStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(false);

  // Existing Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPermissionsUser, setEditingPermissionsUser] = useState<User | null>(null);
  const [editingPasswordUser, setEditingPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [bulkUnlockMessage, setBulkUnlockMessage] = useState<string | null>(null);

  // New User Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
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
  const [editPhone, setEditPhone] = useState('');

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to page 1 on search change
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset to page 1 when filter, sort, or page size changes
  const handleFilterChange = (f: typeof filterType) => {
    setFilterType(f);
    setCurrentPage(1);
  };

  const handleSortChange = (s: typeof sortBy) => {
    setSortBy(s);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // Fetch paginated users from Supabase or Fallback
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiSortBy = (sortBy === 'name_asc' || sortBy === 'name_desc') ? 'username' : (sortBy === 'last_active' ? 'last_active' : 'created_at');
      const apiSortOrder = (sortBy === 'oldest' || sortBy === 'name_asc') ? 'asc' : 'desc';

      const res = await UserRepository.getPaginated({
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch,
        filter: filterType,
        sortBy: apiSortBy,
        sortOrder: apiSortOrder
      });

      if (res.data && res.data.length > 0) {
        setPaginatedUsers(res.data);
        setTotalCount(res.total);
        setTotalPages(res.totalPages || Math.ceil(res.total / pageSize) || 1);
      } else {
        // Fallback to local memory filter
        let filtered = [...localUsers];

        // Search
        if (debouncedSearch.trim()) {
          const q = debouncedSearch.toLowerCase().trim();
          filtered = filtered.filter(u => 
            u.username.toLowerCase().includes(q) || 
            (u.email && u.email.toLowerCase().includes(q)) ||
            (u.phone && u.phone.includes(q))
          );
        }

        // Filter
        if (filterType === 'active') filtered = filtered.filter(u => u.status === 'active');
        else if (filterType === 'inactive') filtered = filtered.filter(u => u.status === 'inactive');
        else if (filterType === 'locked') filtered = filtered.filter(u => u.status === 'locked');
        else if (filterType === 'expired') filtered = filtered.filter(u => u.status === 'expired');
        else if (filterType === 'admin') filtered = filtered.filter(u => u.role === 'admin');
        else if (filterType === 'reader') filtered = filtered.filter(u => u.role !== 'admin');
        else if (filterType === '15k') filtered = filtered.filter(u => u.planType === 'plan_15k_all' || u.accessType === 'all');
        else if (filterType === '5k') filtered = filtered.filter(u => u.planType === 'plan_5k_single' || u.accessType === 'specific');

        // Sort
        filtered.sort((a, b) => {
          if (sortBy === 'oldest') {
            return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
          } else if (sortBy === 'last_active') {
            const timeA = new Date(a.lastActive || a.firstLoginAt || a.createdAt || 0).getTime();
            const timeB = new Date(b.lastActive || b.firstLoginAt || b.createdAt || 0).getTime();
            return timeB - timeA;
          } else if (sortBy === 'name_asc') {
            return a.username.localeCompare(b.username);
          } else if (sortBy === 'name_desc') {
            return b.username.localeCompare(a.username);
          }
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });

        const total = filtered.length;
        const totalP = Math.ceil(total / pageSize) || 1;
        const from = (currentPage - 1) * pageSize;
        const slice = filtered.slice(from, from + pageSize).map(u => {
          const safeU = { ...u };
          delete safeU.password;
          delete safeU.passwordHash;
          return safeU;
        });

        setPaginatedUsers(slice);
        setTotalCount(total);
        setTotalPages(totalP);
      }
    } catch (_) {
      // Fallback gracefully
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, filterType, sortBy, localUsers]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, refreshTrigger]);

  // Load User Detail Stats safely
  const handleOpenDetail = async (user: User) => {
    // Sanitize user clone (Strict security: never display password or credentials)
    const safeUser = { ...user };
    delete safeUser.password;
    delete safeUser.passwordHash;

    setSelectedDetailUser(safeUser);
    setIsLoadingStats(true);
    setUserDetailStats(null);
    try {
      const stats = await UserRepository.getUserStats(safeUser.id, safeUser.username);
      setUserDetailStats(stats);
    } catch (_) {
      setUserDetailStats({
        chaptersRead: safeUser.stats?.chaptersRead || 0,
        comicsRead: safeUser.stats?.comicsRead || 0,
        bookmarksCount: Array.isArray(safeUser.bookmarks) ? safeUser.bookmarks.length : 0,
        recentActivity: []
      });
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Quick stats calculation from all users
  const totalReadersCount = useMemo(() => localUsers.filter(u => u.role !== 'admin').length, [localUsers]);
  const total15kCount = useMemo(() => localUsers.filter(u => u.planType === 'plan_15k_all' || u.accessType === 'all').length, [localUsers]);
  const total5kCount = useMemo(() => localUsers.filter(u => u.planType === 'plan_5k_single' || u.accessType === 'specific').length, [localUsers]);
  const totalLockedCount = useMemo(() => localUsers.filter(u => u.status === 'locked').length, [localUsers]);

  const openAddModal = () => {
    setUsername('');
    setPassword('');
    setPhone('');
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
      phone: phone.trim(),
      phoneNumber: phone.trim(),
      durationType,
      tier: planType === 'plan_15k_all' ? 'Premium' : 'Pro Member',
      planType,
      accessType,
      allowedComicIds,
      priceNote
    });

    if (res.success) {
      setCreateSuccess(res.message);
      setRefreshTrigger(prev => prev + 1);
      setTimeout(() => {
        setShowAddModal(false);
        setUsername('');
        setPassword('');
        setPhone('');
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
    setEditPhone(user.phone || user.phoneNumber || '');
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
      phone: editPhone.trim(),
      phoneNumber: editPhone.trim(),
      priceNote: editPriceNote || (editPlanType === 'plan_15k_all' ? 'Rp 15.000 / All Access' : 'Rp 5.000 / 1 Judul')
    });

    setEditingPermissionsUser(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPasswordUser || !newPassword) return;

    updateUser(editingPasswordUser.id, { passwordHash: newPassword });
    setEditingPasswordUser(null);
    setNewPassword('');
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pb-3 border-b border-[#1c1c2a]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">Manajemen Akun Pembaca & Hak Akses Paket</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Supabase PostgreSQL Single Source of Truth
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Kelola akun pembaca, hak akses paket (15k All Access / 5k 1 Judul), statistik membaca, riwayat, dan keamanan akun
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            disabled={isLoading}
            className="p-2 bg-[#181824] hover:bg-[#202030] text-slate-300 border border-[#27273a] rounded-xl text-xs flex items-center gap-1.5 transition-all active:scale-95"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#ff5b14]' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-gradient-to-r from-[#ff5b14] to-[#f97316] hover:opacity-90 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-[#ff5b14]/25 flex items-center gap-2 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Akun Pembaca Baru</span>
          </button>
        </div>
      </div>

      {/* Plan Stat Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div 
          onClick={() => handleFilterChange('15k')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            filterType === '15k' 
              ? 'bg-[#ff5b14]/15 border-[#ff5b14]/50 shadow-md' 
              : 'bg-[#12121a] hover:bg-[#181824] border-[#222232]'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-400 font-bold mb-1">
            <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-amber-400" /> Paket 15k</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">All Access</span>
          </div>
          <p className="text-xl font-extrabold text-white">{total15kCount}</p>
          <p className="text-[10px] text-slate-400">Bisa baca seluruh komik</p>
        </div>

        <div 
          onClick={() => handleFilterChange('5k')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            filterType === '5k' 
              ? 'bg-blue-500/15 border-blue-500/50 shadow-md' 
              : 'bg-[#12121a] hover:bg-[#181824] border-[#222232]'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-blue-400 font-bold mb-1">
            <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-blue-400" /> Paket 5k</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">1 Judul</span>
          </div>
          <p className="text-xl font-extrabold text-white">{total5kCount}</p>
          <p className="text-[10px] text-slate-400">Hanya 1 judul terdaftar</p>
        </div>

        <div 
          onClick={() => handleFilterChange('locked')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            filterType === 'locked' 
              ? 'bg-red-500/15 border-red-500/50 shadow-md' 
              : 'bg-[#12121a] hover:bg-[#181824] border-[#222232]'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-red-400 font-bold mb-1">
            <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-red-400" /> Terkunci</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">3x Gagal</span>
          </div>
          <p className="text-xl font-extrabold text-white">{totalLockedCount}</p>
          <p className="text-[10px] text-slate-400">Butuh buka kunci</p>
        </div>

        <div 
          onClick={() => handleFilterChange('all')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            filterType === 'all' 
              ? 'bg-purple-500/15 border-purple-500/50 shadow-md' 
              : 'bg-[#12121a] hover:bg-[#181824] border-[#222232]'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-purple-400 font-bold mb-1">
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-purple-400" /> Total Pembaca</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">{totalReadersCount}</span>
          </div>
          <p className="text-xl font-extrabold text-white">{totalReadersCount}</p>
          <p className="text-[10px] text-slate-400">Semua pembaca aktif</p>
        </div>
      </div>

      {/* Bulk Unlock Alert Banner if any users are locked */}
      {totalLockedCount > 0 && (
        <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-red-200">
            <Lock className="w-4 h-4 text-red-400 shrink-0" />
            <div>
              <span className="font-bold text-red-300">Peringatan: Terdapat {totalLockedCount} akun pembaca yang terkunci!</span>
              <p className="text-[11px] text-red-300/80">Akun terkunci otomatis setelah 3x salah memasukkan password.</p>
            </div>
          </div>
          <button
            onClick={() => {
              const res = unlockAllUsers();
              setBulkUnlockMessage(`Berhasil membuka kunci untuk ${res.count} akun pembaca!`);
              setRefreshTrigger(prev => prev + 1);
              setTimeout(() => setBulkUnlockMessage(null), 4000);
            }}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto shrink-0 shadow-md shadow-red-600/30"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Buka Kunci Semua ({totalLockedCount})</span>
          </button>
        </div>
      )}

      {bulkUnlockMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-200 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <p>{bulkUnlockMessage}</p>
        </div>
      )}

      {/* Search, Filter & Sort Controls */}
      <div className="space-y-2 bg-[#12121a] p-3 rounded-xl border border-[#1f1f2e]">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Server Search by Name or Email */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari pembaca berdasarkan username atau email..."
              className="w-full pl-9 pr-3 py-2 bg-[#181824] border border-[#262638] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14]"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sorting Dropdown */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden md:inline">Urutan:</span>
            </div>
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as any)}
              className="px-2.5 py-2 bg-[#181824] border border-[#27273a] rounded-xl text-xs text-white focus:outline-none focus:border-[#ff5b14]"
            >
              <option value="created_at">Terbaru Mendaftar</option>
              <option value="oldest">Terlama Mendaftar</option>
              <option value="last_active">Terakhir Aktif</option>
              <option value="name_asc">Nama (A - Z)</option>
              <option value="name_desc">Nama (Z - A)</option>
            </select>

            {/* Page Size Dropdown */}
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="px-2.5 py-2 bg-[#181824] border border-[#27273a] rounded-xl text-xs text-white focus:outline-none focus:border-[#ff5b14]"
            >
              <option value={10}>10 / hal</option>
              <option value={20}>20 / hal</option>
              <option value={50}>50 / hal</option>
              <option value={100}>100 / hal</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => handleFilterChange('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              filterType === 'all' ? 'bg-[#ff5b14] text-white' : 'bg-[#181824] text-slate-400 hover:text-white'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => handleFilterChange('active')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              filterType === 'active' ? 'bg-emerald-600 text-white' : 'bg-[#181824] text-slate-400 hover:text-white'
            }`}
          >
            Aktif
          </button>
          <button
            onClick={() => handleFilterChange('inactive')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              filterType === 'inactive' ? 'bg-slate-600 text-white' : 'bg-[#181824] text-slate-400 hover:text-white'
            }`}
          >
            Nonaktif
          </button>
          <button
            onClick={() => handleFilterChange('locked')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              filterType === 'locked' ? 'bg-red-600 text-white' : 'bg-[#181824] text-slate-400 hover:text-white'
            }`}
          >
            Terkunci
          </button>
          <button
            onClick={() => handleFilterChange('expired')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              filterType === 'expired' ? 'bg-amber-600 text-white' : 'bg-[#181824] text-slate-400 hover:text-white'
            }`}
          >
            Kedaluwarsa
          </button>
          <button
            onClick={() => handleFilterChange('reader')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              filterType === 'reader' ? 'bg-purple-600 text-white' : 'bg-[#181824] text-slate-400 hover:text-white'
            }`}
          >
            Pembaca Saja
          </button>
          <button
            onClick={() => handleFilterChange('admin')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              filterType === 'admin' ? 'bg-indigo-600 text-white' : 'bg-[#181824] text-slate-400 hover:text-white'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => handleFilterChange('15k')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              filterType === '15k' ? 'bg-amber-500 text-black font-bold' : 'bg-[#181824] text-slate-400 hover:text-white'
            }`}
          >
            15k All Access
          </button>
          <button
            onClick={() => handleFilterChange('5k')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              filterType === '5k' ? 'bg-blue-600 text-white' : 'bg-[#181824] text-slate-400 hover:text-white'
            }`}
          >
            5k 1 Judul
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
                <th className="p-3">Email & Kontak</th>
                <th className="p-3">Paket Langganan</th>
                <th className="p-3">Mendaftar</th>
                <th className="p-3">Terakhir Aktif</th>
                <th className="p-3">Status & Keamanan</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b1b28]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#ff5b14]" />
                      <span>Memuat data pembaca dari database...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Tidak ada akun pembaca yang sesuai dengan filter atau pencarian.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map(u => {
                  const is15k = u.planType === 'plan_15k_all' || u.accessType === 'all' || (!u.planType && !u.allowedComicIds);
                  const allowedTitles = comics.filter(c => (u.allowedComicIds || []).includes(c.id)).map(c => c.title);

                  let formattedCreated = '-';
                  if (u.createdAt) {
                    try {
                      formattedCreated = new Date(u.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                    } catch (_) {}
                  }

                  let formattedActive = '-';
                  const activeTime = u.lastActive || u.firstLoginAt;
                  if (activeTime) {
                    try {
                      formattedActive = new Date(activeTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                    } catch (_) {}
                  }

                  return (
                    <tr key={u.id} className="hover:bg-[#161624] transition-colors">
                      {/* User Info */}
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <img 
                            src={u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`} 
                            alt={u.username} 
                            className="w-8 h-8 rounded-xl object-cover ring-1 ring-white/10" 
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white text-xs block">{u.username}</span>
                              {u.role === 'admin' && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-red-500/20 text-red-300 border border-red-500/30">
                                  ADMIN
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block">{u.displayName || u.bio || 'Reader'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Email & Contact */}
                      <td className="p-3">
                        <span className="text-slate-300 block text-[11px] truncate max-w-[150px]" title={u.email || ''}>
                          {u.email || '-'}
                        </span>
                        {(u.phone || u.phoneNumber) ? (
                          <a
                            href={`https://wa.me/${(u.phone || u.phoneNumber || '').replace(/^0/, '62').replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 hover:underline mt-0.5"
                            title="Buka Chat WhatsApp"
                          >
                            <Phone className="w-2.5 h-2.5" />
                            <span>{u.phone || u.phoneNumber}</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-500">No HP (-)</span>
                        )}
                      </td>

                      {/* Subscription Plan & Access */}
                      <td className="p-3">
                        {u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                            Super Admin
                          </span>
                        ) : is15k ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              <Sparkles className="w-3 h-3 text-amber-400" />
                              Paket 15k (All Access)
                            </span>
                            <p className="text-[10px] text-slate-400">Semua judul komik</p>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                              <BookOpen className="w-3 h-3 text-blue-400" />
                              Paket 5k (1 Judul)
                            </span>
                            <p className="text-[10px] text-blue-200 line-clamp-1 max-w-[140px]" title={allowedTitles.join(', ')}>
                              {allowedTitles.length > 0 ? allowedTitles.join(', ') : 'Belum ditentukan'}
                            </p>
                          </div>
                        )}
                      </td>

                      {/* Registration Date */}
                      <td className="p-3 text-slate-300">
                        <span className="block text-[11px]">{formattedCreated}</span>
                      </td>

                      {/* Last Active */}
                      <td className="p-3">
                        <span className="text-slate-300 block text-[11px]">{formattedActive}</span>
                      </td>

                      {/* Status & Security */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            u.status === 'active' 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                              : u.status === 'locked' 
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {u.status}
                          </span>

                          {(u.failedAttempts ?? 0) >= 3 && (
                            <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] font-bold border border-red-500/30">
                              3x Gagal
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right space-x-1 whitespace-nowrap">
                        {/* View Detail Modal Button */}
                        <button
                          onClick={() => handleOpenDetail(u)}
                          className="p-1.5 bg-[#181824] hover:bg-[#222234] border border-[#27273a] text-slate-300 hover:text-white rounded-lg transition-colors inline-flex items-center gap-1 text-[11px]"
                          title="Lihat Detail Profil & Statistik"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-400" />
                          <span className="hidden md:inline">Detail</span>
                        </button>

                        {u.status === 'locked' && (
                          <button
                            onClick={() => {
                              unlockUser(u.id);
                              setRefreshTrigger(prev => prev + 1);
                            }}
                            className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
                            title="Buka Kunci Akun 3x Gagal"
                          >
                            <Unlock className="w-3 h-3" />
                            <span>Buka Kunci</span>
                          </button>
                        )}

                        {/* Edit Permissions / Plan Modal Button */}
                        <button
                          onClick={() => openEditPermissionsModal(u)}
                          className="px-2 py-1 bg-[#ff5b14]/15 hover:bg-[#ff5b14]/25 text-[#ff5b14] border border-[#ff5b14]/30 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
                          title="Atur Hak Akses Komik & Paket Pembaca"
                        >
                          <Sliders className="w-3 h-3" />
                          <span className="hidden sm:inline">Paket</span>
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
                          onClick={() => {
                            toggleUserStatus(u.id);
                            setRefreshTrigger(prev => prev + 1);
                          }}
                          className="px-2 py-1 bg-[#181824] border border-[#27273a] text-slate-300 hover:text-white rounded-lg text-[11px]"
                          title={u.status === 'active' ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                        >
                          {u.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`Hapus akun pembaca "${u.username}" secara permanen?`)) {
                              deleteUser(u.id);
                              setRefreshTrigger(prev => prev + 1);
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

        {/* Server-Side Pagination Bar */}
        <div className="p-3 bg-[#161622] border-t border-[#222234] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            Menampilkan <strong className="text-white">{(currentPage - 1) * pageSize + (totalCount > 0 ? 1 : 0)}</strong> - <strong className="text-white">{Math.min(currentPage * pageSize, totalCount)}</strong> dari <strong className="text-white">{totalCount.toLocaleString('id-ID')}</strong> pembaca
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage <= 1 || isLoading}
              className="p-1.5 bg-[#1a1a28] hover:bg-[#252538] disabled:opacity-40 disabled:pointer-events-none text-white rounded-lg border border-[#2a2a3e] transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Sebelumnya</span>
            </button>

            {/* Page numbers preview */}
            <div className="flex items-center gap-1 px-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  p = currentPage - 2 + i;
                  if (p > totalPages) p = totalPages - 4 + i;
                }
                return (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                      currentPage === p 
                        ? 'bg-[#ff5b14] text-white shadow-md' 
                        : 'bg-[#1a1a28] hover:bg-[#252538] text-slate-300 border border-[#2a2a3e]'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages || isLoading}
              className="p-1.5 bg-[#1a1a28] hover:bg-[#252538] disabled:opacity-40 disabled:pointer-events-none text-white rounded-lg border border-[#2a2a3e] transition-colors flex items-center gap-1"
            >
              <span className="hidden sm:inline">Berikutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* USER DETAIL MODAL (SAFE, ZERO PASSWORDS/TOKENS EXPOSED) */}
      {selectedDetailUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#12121a] border border-[#262638] rounded-2xl p-5 text-slate-200 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#202030]">
              <div className="flex items-center gap-3">
                <img 
                  src={selectedDetailUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedDetailUser.username}`} 
                  alt={selectedDetailUser.username}
                  className="w-12 h-12 rounded-2xl object-cover ring-2 ring-[#ff5b14]/40"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-white">{selectedDetailUser.username}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      selectedDetailUser.status === 'active' 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : selectedDetailUser.status === 'locked' 
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {selectedDetailUser.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{selectedDetailUser.displayName || selectedDetailUser.email || 'Akun Pembaca'}</p>
                </div>
              </div>
              <button onClick={() => setSelectedDetailUser(null)} className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Overview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-[#181824] rounded-xl border border-[#27273a]">
                <span className="text-[10px] text-slate-400 block mb-1">Peran Akun</span>
                <span className="font-bold text-white uppercase">{selectedDetailUser.role}</span>
              </div>
              <div className="p-3 bg-[#181824] rounded-xl border border-[#27273a]">
                <span className="text-[10px] text-slate-400 block mb-1">Paket Akses</span>
                <span className="font-bold text-amber-400">
                  {selectedDetailUser.planType === 'plan_15k_all' ? '15k All Access' : '5k Single'}
                </span>
              </div>
              <div className="p-3 bg-[#181824] rounded-xl border border-[#27273a]">
                <span className="text-[10px] text-slate-400 block mb-1">Durasi Paket</span>
                <span className="font-bold text-white capitalize">{selectedDetailUser.durationType?.replace('_', ' ') || '1 Day'}</span>
              </div>
              <div className="p-3 bg-[#181824] rounded-xl border border-[#27273a]">
                <span className="text-[10px] text-slate-400 block mb-1">Tanggal Mendaftar</span>
                <span className="font-semibold text-white">
                  {selectedDetailUser.createdAt ? new Date(selectedDetailUser.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                </span>
              </div>
              <div className="p-3 bg-[#181824] rounded-xl border border-[#27273a]">
                <span className="text-[10px] text-slate-400 block mb-1">Terakhir Aktif</span>
                <span className="font-semibold text-white">
                  {selectedDetailUser.lastActive ? new Date(selectedDetailUser.lastActive).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : (selectedDetailUser.firstLoginAt ? new Date(selectedDetailUser.firstLoginAt).toLocaleDateString('id-ID') : 'Belum Ada')}
                </span>
              </div>
              <div className="p-3 bg-[#181824] rounded-xl border border-[#27273a]">
                <span className="text-[10px] text-slate-400 block mb-1">Kontak WhatsApp</span>
                <span className="font-semibold text-emerald-400">{selectedDetailUser.phone || selectedDetailUser.phoneNumber || '-'}</span>
              </div>
            </div>

            {/* Reading Statistics Cards */}
            <div>
              <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#ff5b14]" />
                <span>Statistik Membaca & Aktivitas</span>
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-[#181824] rounded-xl border border-[#27273a] text-center">
                  <span className="text-[10px] text-slate-400 block">Total Chapter Dibaca</span>
                  <p className="text-lg font-extrabold text-[#ff5b14] mt-0.5">
                    {userDetailStats?.chaptersRead ?? selectedDetailUser.stats?.chaptersRead ?? 0}
                  </p>
                </div>
                <div className="p-3 bg-[#181824] rounded-xl border border-[#27273a] text-center">
                  <span className="text-[10px] text-slate-400 block">Total Komik Dilihat</span>
                  <p className="text-lg font-extrabold text-blue-400 mt-0.5">
                    {userDetailStats?.comicsRead ?? selectedDetailUser.stats?.comicsRead ?? 0}
                  </p>
                </div>
                <div className="p-3 bg-[#181824] rounded-xl border border-[#27273a] text-center">
                  <span className="text-[10px] text-slate-400 block">Komik Disimpan</span>
                  <p className="text-lg font-extrabold text-purple-400 mt-0.5">
                    {userDetailStats?.bookmarksCount ?? (Array.isArray(selectedDetailUser.bookmarks) ? selectedDetailUser.bookmarks.length : 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Reading Events */}
            <div>
              <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>Aktivitas Membaca Terkini</span>
              </h4>
              {isLoadingStats ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto text-[#ff5b14] mb-1" />
                  <span>Memuat riwayat aktivitas...</span>
                </div>
              ) : (userDetailStats?.recentActivity && userDetailStats.recentActivity.length > 0) ? (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {userDetailStats.recentActivity.map(act => (
                    <div key={act.id} className="p-2 bg-[#181824] rounded-xl border border-[#27273a] flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-white">{act.comicTitle}</span>
                        {act.chapterNumber && <span className="text-slate-400 ml-1.5">Chapter {act.chapterNumber}</span>}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {new Date(act.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-[#181824] rounded-xl border border-[#27273a] text-center text-xs text-slate-500">
                  Belum ada catatan aktivitas membaca yang terekam.
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-2 border-t border-[#202030]">
              <button
                type="button"
                onClick={() => {
                  setSelectedDetailUser(null);
                  openEditPermissionsModal(selectedDetailUser);
                }}
                className="flex-1 py-2 bg-[#ff5b14] hover:bg-[#e04e0e] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Atur Paket & Hak Akses</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedDetailUser(null)}
                className="px-4 py-2 bg-[#1a1a24] text-slate-300 text-xs rounded-xl hover:text-white"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

                <div>
                  <label className="block text-slate-300 mb-1 font-bold">No. WhatsApp / HP</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="misal: 081234567890"
                    className="w-full p-2.5 bg-[#181824] border border-[#27273a] rounded-xl text-white focus:outline-none focus:border-[#ff5b14]"
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

              {/* Reader Phone Number */}
              <div>
                <label className="block text-slate-300 mb-1 font-bold">Nomor Telepon / WhatsApp Pembaca</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="misal: 081234567890"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#181824] border border-[#27273a] rounded-xl text-white focus:outline-none focus:border-[#ff5b14]"
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
