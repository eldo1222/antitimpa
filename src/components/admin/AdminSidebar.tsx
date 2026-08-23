import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Chapter } from '../../types';
import { 
  LayoutDashboard, 
  BookOpen, 
  FileText, 
  Users, 
  Image as ImageIcon, 
  Activity, 
  Settings, 
  LogOut, 
  Smartphone,
  HardDrive,
  Database,
  KeyRound,
  Download,
  Camera,
  LucideIcon
} from 'lucide-react';
import { AdminPasswordModal } from './AdminPasswordModal';
import { AvatarEditModal } from '../common/AvatarEditModal';

interface AdminSidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

interface MenuItem {
  id: 'dashboard' | 'comics' | 'scraper' | 'chapters' | 'drives' | 'readers' | 'banners' | 'database' | 'logs' | 'settings';
  label: string;
  icon: LucideIcon;
  count?: number;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpenMobile, onCloseMobile }) => {
  const { 
    currentUser, 
    comics, 
    chapters, 
    users, 
    banners, 
    driveAccounts,
    activityLogs, 
    adminActiveMenu, 
    setAdminActiveMenu, 
    setIsAdminView, 
    logout 
  } = useApp();

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const totalChapters = (Object.values(chapters) as Chapter[][]).reduce((acc, list) => acc + (list?.length || 0), 0);
  const readerCount = users.filter(u => u.role !== 'admin').length;

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'comics', label: 'Manajemen Komik', icon: BookOpen, count: comics.length },
    { id: 'scraper', label: 'Tarik Data API / Scraper', icon: Download },
    { id: 'chapters', label: 'Manajemen Chapter', icon: FileText, count: totalChapters },
    { id: 'drives', label: 'Katalog Google Drive', icon: HardDrive, count: driveAccounts.length },
    { id: 'readers', label: 'Akun Pembaca', icon: Users, count: readerCount },
    { id: 'banners', label: 'Banner & Promo', icon: ImageIcon, count: banners.length },
    { id: 'database', label: 'Database Explorer', icon: Database },
    { id: 'logs', label: 'Log Aktivitas', icon: Activity, count: activityLogs.length },
    { id: 'settings', label: 'Pengaturan Sistem', icon: Settings }
  ];

  const handleSelect = (id: MenuItem['id']) => {
    setAdminActiveMenu(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <aside className={`
      w-64 bg-[#0e0e14] border-r border-[#1e1e2c] flex flex-col justify-between shrink-0 h-screen sticky top-0
      ${isOpenMobile ? 'fixed inset-y-0 left-0 z-50 shadow-2xl flex' : 'hidden md:flex'}
    `}>
      {/* Top Section */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Brand Header */}
        <div className="px-5 py-4 border-b border-[#1c1c2b] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#ff5b14] flex items-center justify-center text-white font-black text-sm shadow-md shadow-[#ff5b14]/20">
              AT
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-white tracking-tight">AntiTimpa</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-[#202030] text-slate-300 rounded border border-[#2e2e42]">
                  Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Panel Kontrol Utama</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1 overflow-y-auto flex-1 text-xs">
          <div className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Menu Administrasi
          </div>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = adminActiveMenu === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between font-medium transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-[#ff5b14] text-white font-bold shadow-md shadow-[#ff5b14]/20' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#161622]'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.count !== undefined && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ml-1.5 shrink-0 ${
                    isActive ? 'bg-black/20 text-white' : 'bg-[#1a1a28] text-slate-400'
                  }`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="p-3 border-t border-[#1c1c2b] space-y-2.5 bg-[#0a0a0f]">
        {/* Switch to Mobile Reader button */}
        <button
          onClick={() => setIsAdminView(false)}
          className="w-full py-2 px-3 rounded-xl bg-[#181824] hover:bg-[#202032] border border-[#27273a] text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Smartphone className="w-4 h-4 text-[#ff5b14]" />
          <span>Buka Tampilan Pembaca</span>
        </button>

        {/* Admin Profile & Logout */}
        <div className="p-2 rounded-xl bg-[#12121c] border border-[#1f1f2e] flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="relative group cursor-pointer" onClick={() => setIsAvatarModalOpen(true)}>
              <img 
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'} 
                alt={currentUser?.username || 'Admin'} 
                className="w-8 h-8 rounded-lg object-cover ring-1 ring-white/10 shrink-0" 
              />
              <div className="absolute inset-0 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                <Camera className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-xs text-slate-200 truncate">{currentUser?.username || 'admin'}</p>
              <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Super Admin
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsAvatarModalOpen(true)}
              className="p-1.5 text-slate-400 hover:text-[#ff5b14] hover:bg-[#ff5b14]/10 rounded-lg transition-colors cursor-pointer"
              title="Ganti Foto Profil Super Admin"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsPasswordModalOpen(true)}
              className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
              title="Ganti Password Super Admin"
            >
              <KeyRound className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
              title="Keluar / Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Admin Password Change Modal */}
      <AdminPasswordModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
      />

      {/* Admin Avatar Change Modal */}
      <AvatarEditModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        targetUser={currentUser}
      />
    </aside>
  );
};
