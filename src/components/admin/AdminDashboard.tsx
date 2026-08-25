import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AdminOverviewTab } from './AdminOverviewTab';
import { AdminComicsTab } from './AdminComicsTab';
import { AdminScraperTab } from './AdminScraperTab';
import { AdminChaptersTab } from './AdminChaptersTab';
import { AdminReadersTab } from './AdminReadersTab';
import { AdminBannersTab } from './AdminBannersTab';
import { AdminAdsTab } from './AdminAdsTab';
import { AdminDriveCatalogTab } from './AdminDriveCatalogTab';
import { AdminLogsTab } from './AdminLogsTab';
import { AdminDatabaseTab } from './AdminDatabaseTab';
import { AdminSettingsTab } from './AdminSettingsTab';
import { AdminToastContainer } from '../common/AdminToast';

export const AdminDashboard: React.FC = () => {
  const { adminActiveMenu, setAdminActiveMenu } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Sync tab from URL query param on mount or URL change
  useEffect(() => {
    const tabParam = searchParams.get('tab') as any;
    const validTabs = ['dashboard', 'comics', 'scraper', 'chapters', 'drives', 'readers', 'banners', 'ads', 'genres', 'database', 'logs', 'settings'];
    if (tabParam && validTabs.includes(tabParam)) {
      if (adminActiveMenu !== tabParam) {
        setAdminActiveMenu(tabParam);
      }
    } else {
      setSearchParams({ tab: adminActiveMenu }, { replace: true });
    }
  }, [searchParams]);

  const renderActiveTab = () => {
    switch (adminActiveMenu) {
      case 'dashboard':
        return <AdminOverviewTab />;
      case 'comics':
        return <AdminComicsTab />;
      case 'scraper':
        return <AdminScraperTab />;
      case 'chapters':
        return <AdminChaptersTab />;
      case 'drives':
        return <AdminDriveCatalogTab />;
      case 'readers':
        return <AdminReadersTab />;
      case 'banners':
        return <AdminBannersTab />;
      case 'ads':
        return <AdminAdsTab />;
      case 'database':
        return <AdminDatabaseTab />;
      case 'logs':
        return <AdminLogsTab />;
      case 'settings':
        return <AdminSettingsTab />;
      default:
        return <AdminOverviewTab />;
    }
  };

  return (
    <div className="min-h-screen bg-[#09090d] text-slate-100 flex">
      {/* Backdrop for mobile drawer */}
      {mobileSidebarOpen && (
        <div 
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Navigation (Collapsible on Desktop with Slide + Fade) */}
      <AdminSidebar 
        isOpenMobile={mobileSidebarOpen} 
        onCloseMobile={() => setMobileSidebarOpen(false)} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Minimalist Top Header */}
        <AdminHeader 
          onToggleMobileSidebar={() => setMobileSidebarOpen(prev => !prev)} 
        />

        {/* Tab Body with Smooth Slide + Fade Transitions (No White Screen / Flickering) */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar max-w-7xl w-full mx-auto">
          <div key={adminActiveMenu} className="animate-slide-fade">
            {renderActiveTab()}
          </div>
        </main>
      </div>

      {/* Admin Action Success & Progress Toast Notifications */}
      <AdminToastContainer />
    </div>
  );
};
export default AdminDashboard;

