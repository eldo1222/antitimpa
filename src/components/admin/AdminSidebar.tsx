import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Megaphone,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  LucideIcon
} from 'lucide-react';
import { AdminPasswordModal } from './AdminPasswordModal';
import { AvatarEditModal } from '../common/AvatarEditModal';

interface AdminSidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

interface MenuItem {
  id: 'dashboard' | 'comics' | 'scraper' | 'chapters' | 'drives' | 'readers' | 'banners' | 'ads' | 'database' | 'logs' | 'settings';
  label: string;
  icon: LucideIcon;
  count?: number;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpenMobile, onCloseMobile }) => {
  const navigate = useNavigate();
  const { 
    currentUser, 
    comics, 
    chapters, 
    users, 
    banners, 
    ads,
    driveAccounts,
    activityLogs, 
    adminActiveMenu, 
    setAdminActiveMenu, 
    setIsAdminView, 
    selectComic,
    setActiveTab,
    logout 
  } = useApp();

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  // Desktop Collapsible Sidebar State (Persisted)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('antitimpa_sidebar_collapsed') === 'true';
    }
    return false;
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('antitimpa_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

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
    { id: 'ads', label: 'Manajemen Iklan', icon: Megaphone, count: ads.length },
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
      bg-[#0e0e14] border-r border-[#1e1e2c] flex flex-col justify-between shrink-0 h-screen sticky top-0 transition-all duration-300 ease-in-out z-30
      ${isOpenMobile ? 'fixed inset-y-0 left-0 z-50 shadow-2xl flex w-64' : 'hidden md:flex'}
      ${!isOpenMobile ? (isCollapsed ? 'w-20' : 'w-64') : ''}
    `}>
      {/* Top Section */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Brand Header */}
        <div className={`py-4 border-b border-[#1c1c2b] flex items-center transition-all duration-300 ${
          isCollapsed && !isOpenMobile ? 'px-2 justify-center' : 'px-5 justify-between'
        }`}>
          {/* Logo and App Title (Smoothly hidden when collapsed) */}
          {(!isCollapsed || isOpenMobile) && (
            <div className="flex items-center gap-3 overflow-hidden animate-slide-fade-left">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#ff5b14] to-[#d84605] flex items-center justify-center text-white font-black text-sm shadow-md shadow-[#ff5b14]/20 shrink-0">
                AT
              </div>
              <div className="overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm text-white tracking-tight">AntiTimpa</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 bg-[#202030] text-slate-300 rounded border border-[#2e2e42]">
                    Admin
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">Panel Kontrol Utama</p>
              </div>
            </div>
          )}

          {/* Desktop Collapse / Expand Toggle Button */}
          {!isOpenMobile && (
            <button
              onClick={toggleCollapse}
              className={`rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-[#27273a] transition-all cursor-pointer hidden md:flex items-center justify-center shrink-0 ${
                isCollapsed ? 'w-10 h-10 bg-[#161622] hover:bg-[#ff5b14]/15 hover:text-[#ff5b14] border-[#252538]' : 'p-1.5'
              }`}
              title={isCollapsed ? 'Perluas Sidebar' : 'Kecilkan Sidebar (Slide + Fade)'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-5 h-5 text-[#ff5b14]" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1 overflow-y-auto custom-scrollbar flex-1 text-xs">
          {(!isCollapsed || isOpenMobile) && (
            <div className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider animate-slide-fade-left">
              Menu Administrasi
            </div>
          )}

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = adminActiveMenu === item.id;

            return (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => handleSelect(item.id)}
                  className={`w-full py-2.5 rounded-xl flex items-center font-medium transition-all duration-200 cursor-pointer ${
                    isCollapsed && !isOpenMobile ? 'px-2 justify-center' : 'px-3 justify-between'
                  } ${
                    isActive 
                      ? 'bg-[#ff5b14] text-white font-bold shadow-md shadow-[#ff5b14]/20' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#161622]'
                  }`}
                  title={isCollapsed && !isOpenMobile ? item.label : undefined}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    {(!isCollapsed || isOpenMobile) && (
                      <span className="truncate animate-slide-fade-left">{item.label}</span>
                    )}
                  </div>

                  {(!isCollapsed || isOpenMobile) && item.count !== undefined && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ml-1.5 shrink-0 animate-slide-fade-left ${
                      isActive ? 'bg-black/20 text-white' : 'bg-[#1a1a28] text-slate-400'
                    }`}>
                      {item.count}
                    </span>
                  )}
                </button>

                {/* Floating Tooltip in Collapsed Mode */}
                {isCollapsed && !isOpenMobile && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-[#171724] border border-[#2c2c40] text-slate-100 text-xs font-semibold rounded-xl shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 flex items-center gap-2">
                    <span>{item.label}</span>
                    {item.count !== undefined && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#ff5b14] text-white font-bold">
                        {item.count}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="p-3 border-t border-[#1c1c2b] space-y-2.5 bg-[#0a0a0f]">
        {/* Switch to Mobile Reader button */}
        <button
          onClick={() => {
            setIsAdminView(false);
            selectComic(null);
            setActiveTab('home');
            navigate('/');
            if (onCloseMobile) onCloseMobile();
          }}
          className={`w-full py-2 rounded-xl bg-[#181824] hover:bg-[#202032] border border-[#27273a] text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
            isCollapsed && !isOpenMobile ? 'px-2 justify-center' : 'px-3 justify-center'
          }`}
          title="Buka Tampilan Pembaca Mobile"
        >
          <Smartphone className="w-4 h-4 text-[#ff5b14] shrink-0" />
          {(!isCollapsed || isOpenMobile) && (
            <span className="truncate animate-slide-fade-left">Tampilan Pembaca</span>
          )}
        </button>

        {/* Admin Profile & Logout */}
        <div className={`p-2 rounded-xl bg-[#12121c] border border-[#1f1f2e] flex items-center transition-all ${
          isCollapsed && !isOpenMobile ? 'justify-center flex-col gap-2' : 'justify-between'
        }`}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="relative group cursor-pointer shrink-0" onClick={() => setIsAvatarModalOpen(true)}>
              <img 
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'} 
                alt={currentUser?.username || 'Admin'} 
                className="w-8 h-8 rounded-lg object-cover ring-1 ring-white/10 shrink-0" 
              />
              <div className="absolute inset-0 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                <Camera className="w-3.5 h-3.5" />
              </div>
            </div>
            {(!isCollapsed || isOpenMobile) && (
              <div className="overflow-hidden animate-slide-fade-left">
                <p className="font-bold text-xs text-slate-200 truncate">{currentUser?.username || 'admin'}</p>
                <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Super Admin
                </p>
              </div>
            )}
          </div>

          <div className={`flex items-center gap-1 ${isCollapsed && !isOpenMobile ? 'flex-col pt-1' : ''}`}>
            {(!isCollapsed || isOpenMobile) && (
              <>
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
              </>
            )}
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

