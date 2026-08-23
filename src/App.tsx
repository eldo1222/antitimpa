/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { BottomNav } from './components/common/BottomNav';
import { HomeView } from './components/frontend/HomeView';
import { DiscoverView } from './components/frontend/DiscoverView';
import { LibraryView } from './components/frontend/LibraryView';
import { ProfileView } from './components/frontend/ProfileView';
import { ComicDetailView } from './components/frontend/ComicDetailView';
import { ComicReaderView } from './components/frontend/ComicReaderView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { LoginModal } from './components/auth/LoginModal';
import { Smartphone } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { 
    currentUser,
    isAdminView, 
    setIsAdminView,
    activeTab, 
    selectedComicId, 
    readingChapterId, 
    isMobileDeviceFrame,
    toggleMobileDeviceFrame 
  } = useApp();

  // If Admin View is active, verify Super Admin permission
  if (isAdminView) {
    if (currentUser?.role === 'admin') {
      return (
        <div id="antitimpa-admin-root" className="min-h-screen bg-[#0b0b0e]">
          <ErrorBoundary>
            <AdminDashboard />
            <LoginModal />
          </ErrorBoundary>
        </div>
      );
    } else {
      // Reader or unauthenticated user trying to access admin view: kick back
      setIsAdminView(false);
    }
  }

  // Mobile Content Switcher with fallback protection
  const renderMobileContent = () => {
    try {
      if (readingChapterId) {
        return <ComicReaderView />;
      }
      if (selectedComicId) {
        return <ComicDetailView />;
      }
      switch (activeTab) {
        case 'home':
          return <HomeView />;
        case 'discover':
          return <DiscoverView />;
        case 'library':
          return <LibraryView />;
        case 'profile':
          return <ProfileView />;
        default:
          return <HomeView />;
      }
    } catch (err) {
      console.error('Error rendering view, falling back to HomeView:', err);
      return <HomeView />;
    }
  };

  return (
    <div id="komikyuk-app-root" className="min-h-screen bg-[#07070a] text-slate-100 flex flex-col items-center justify-start">
      {isMobileDeviceFrame ? (
        /* Realistic Mobile Phone Frame Mockup on Desktop */
        <div className="py-6 px-4 w-full flex flex-col items-center">
          <div className="mb-3 flex items-center gap-2 text-xs text-slate-400 bg-[#161622] px-3 py-1.5 rounded-full border border-[#27273a]">
            <Smartphone className="w-3.5 h-3.5 text-[#ff5b14]" />
            <span>Mode Simulasi Layar Handphone Mobile</span>
            <button
              onClick={toggleMobileDeviceFrame}
              className="text-[#ff5b14] hover:underline font-bold ml-2 cursor-pointer"
            >
              Mode Penuh
            </button>
          </div>

          <div className="w-full max-w-[420px] min-h-[850px] bg-[#0c0c10] border-[10px] border-[#222230] rounded-[48px] shadow-2xl overflow-hidden relative flex flex-col ring-1 ring-white/10">
            {/* Phone Top Speaker Notch */}
            <div className="w-full bg-[#12121a] pt-3 pb-1 flex justify-center items-center relative z-40 border-b border-[#1f1f2d]">
              <div className="w-24 h-4 bg-black rounded-full flex items-center justify-end px-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[#1a1a24] border border-[#333]" />
              </div>
            </div>

            {/* Mobile Inner Viewport */}
            <div className="flex-1 overflow-y-auto relative flex flex-col bg-[#0c0c10]">
              <ErrorBoundary>
                <Header />
                <main className="flex-1">
                  {renderMobileContent()}
                </main>
                {!readingChapterId && <Footer />}
                <BottomNav />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      ) : (
        /* Standard Responsive View: Full-width on Desktop, optimized on Mobile */
        <div className="w-full min-h-screen flex flex-col bg-[#09090d] text-slate-100 relative">
          <ErrorBoundary>
            <Header />
            <main className="flex-1 w-full">
              {renderMobileContent()}
            </main>
            {!readingChapterId && <Footer />}
            <BottomNav />
          </ErrorBoundary>
        </div>
      )}

      {/* Global Login & Auth Modal */}
      <LoginModal />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainAppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}
