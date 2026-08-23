import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Menu, 
  ExternalLink, 
  Plus, 
  ChevronRight 
} from 'lucide-react';

interface AdminHeaderProps {
  onToggleMobileSidebar: () => void;
  onQuickAction?: () => void;
  quickActionLabel?: string;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ 
  onToggleMobileSidebar,
  onQuickAction,
  quickActionLabel
}) => {
  const { adminActiveMenu, setIsAdminView } = useApp();

  const getMenuTitle = () => {
    switch (adminActiveMenu) {
      case 'dashboard': return 'Ringkasan Dashboard';
      case 'comics': return 'Manajemen Komik';
      case 'chapters': return 'Manajemen Chapter';
      case 'readers': return 'Akun Pembaca';
      case 'banners': return 'Banner & Promo';
      case 'database': return 'Database Explorer & Firestore Viewer';
      case 'logs': return 'Log Aktivitas Sistem';
      case 'settings': return 'Pengaturan Sistem';
      default: return 'Admin Panel';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#0e0e14]/95 backdrop-blur-md px-4 sm:px-6 py-3 border-b border-[#1c1c2a] flex items-center justify-between">
      {/* Left: Mobile toggle + Breadcrumb Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="p-1.5 rounded-lg bg-[#161622] text-slate-300 hover:text-white border border-[#27273a] md:hidden"
          title="Buka Navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-semibold hidden sm:inline">Admin</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600 hidden sm:inline" />
          <h1 className="font-bold text-sm text-white tracking-tight">
            {getMenuTitle()}
          </h1>
        </div>
      </div>

      {/* Right: Quick Action Buttons */}
      <div className="flex items-center gap-2">
        {onQuickAction && quickActionLabel && (
          <button
            onClick={onQuickAction}
            className="px-3 py-1.5 bg-[#ff5b14] hover:bg-[#e04e0e] text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{quickActionLabel}</span>
          </button>
        )}

        <button
          onClick={() => setIsAdminView(false)}
          className="px-3 py-1.5 bg-[#161622] hover:bg-[#202030] text-slate-300 hover:text-white border border-[#27273a] text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Pratinjau antarmuka pembaca mobile"
        >
          <ExternalLink className="w-3.5 h-3.5 text-[#ff5b14]" />
          <span className="hidden sm:inline">Buka Reader</span>
        </button>
      </div>
    </header>
  );
};
