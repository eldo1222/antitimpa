import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AdminOverviewTab } from './AdminOverviewTab';
import { AdminComicsTab } from './AdminComicsTab';
import { AdminScraperTab } from './AdminScraperTab';
import { AdminChaptersTab } from './AdminChaptersTab';
import { AdminReadersTab } from './AdminReadersTab';
import { AdminBannersTab } from './AdminBannersTab';
import { AdminDriveCatalogTab } from './AdminDriveCatalogTab';
import { AdminLogsTab } from './AdminLogsTab';
import { AdminDatabaseTab } from './AdminDatabaseTab';
import { AdminSettingsTab } from './AdminSettingsTab';

export const AdminDashboard: React.FC = () => {
  const { adminActiveMenu } = useApp();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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

      {/* Sidebar Navigation */}
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

        {/* Tab Body */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto max-w-7xl w-full mx-auto">
          {renderActiveTab()}
        </main>
      </div>
    </div>
  );
};
export default AdminDashboard;
