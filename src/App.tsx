/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { BottomNav } from './components/common/BottomNav';
import { RouteLoadingBar } from './components/common/RouteLoadingBar';
import { HomeView } from './components/frontend/HomeView';
import { DiscoverView } from './components/frontend/DiscoverView';
import { GenreView } from './components/frontend/GenreView';
import { LibraryView } from './components/frontend/LibraryView';
import { ProfileView } from './components/frontend/ProfileView';
import { ComicDetailView } from './components/frontend/ComicDetailView';
import { ComicReaderView } from './components/frontend/ComicReaderView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { LoginModal } from './components/auth/LoginModal';
import { OfflineGuard } from './components/common/OfflineGuard';
import { Smartphone } from 'lucide-react';

// Sync current URL path with AppContext activeTab and selected items
const RouteSynchronizer: React.FC = () => {
  const location = useLocation();
  const { setActiveTab } = useApp();

  useEffect(() => {
    const path = location.pathname;
    if (path === '/') {
      setActiveTab('home');
    } else if (path.startsWith('/discover') || path.startsWith('/genre')) {
      setActiveTab('discover');
    } else if (path.startsWith('/library')) {
      setActiveTab('library');
    } else if (path.startsWith('/profile')) {
      setActiveTab('profile');
    }
  }, [location.pathname]);

  return null;
};

// Protected Admin View wrapper
const AdminRouteWrapper: React.FC = () => {
  const { currentUser, openLoginModal } = useApp();

  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
          <span className="text-2xl font-black">🔒</span>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Akses Khusus Super Admin</h2>
        <p className="text-xs text-slate-400 max-w-sm mb-6">
          Halaman Admin Console memerlukan otentikasi akun Super Admin AntiTimpa.
        </p>
        <button
          onClick={() => openLoginModal('Silakan login dengan akun Super Admin.')}
          className="px-5 py-2.5 bg-[#ff5b14] hover:bg-[#e04e0e] text-white font-bold text-xs rounded-xl shadow-lg transition-all"
        >
          Login Super Admin
        </button>
      </div>
    );
  }

  return <AdminDashboard />;
};

const MainAppContent: React.FC = () => {
  const location = useLocation();
  const { isMobileDeviceFrame, toggleMobileDeviceFrame } = useApp();

  const isReadingRoute = location.pathname.startsWith('/read/');
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div id="antitimpa-app-root" className="min-h-screen bg-[#07070a] text-slate-100 flex flex-col items-center justify-start">
      <RouteLoadingBar />
      <RouteSynchronizer />

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

          <div className="w-full max-w-[420px] min-h-[850px] bg-[#0c0c10] border-[10px] border-[#222232] rounded-[48px] shadow-2xl overflow-hidden relative flex flex-col ring-1 ring-white/10">
            {/* Phone Top Speaker Notch */}
            <div className="w-full bg-[#12121a] pt-3 pb-1 flex justify-center items-center relative z-40 border-b border-[#1f1f2d]">
              <div className="w-24 h-4 bg-black rounded-full flex items-center justify-end px-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[#1a1a24] border border-[#333]" />
              </div>
            </div>

            {/* Mobile Inner Viewport */}
            <div className="flex-1 overflow-y-auto relative flex flex-col bg-[#0c0c10]">
              <ErrorBoundary>
                {!isReadingRoute && !isAdminRoute && <Header />}
                <main className="flex-1">
                  <Routes>
                    <Route path="/" element={<HomeView />} />
                    <Route path="/discover" element={<DiscoverView />} />
                    <Route path="/genre" element={<GenreView />} />
                    <Route path="/genre/:genreName" element={<GenreView />} />
                    <Route path="/genres" element={<GenreView />} />
                    <Route path="/library" element={<LibraryView />} />
                    <Route path="/profile" element={<ProfileView />} />
                    <Route path="/comic/:comicId" element={<ComicDetailView />} />
                    <Route path="/read/:comicId/:chapterId" element={<ComicReaderView />} />
                    <Route path="/admin" element={<AdminRouteWrapper />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
                {!isReadingRoute && !isAdminRoute && <Footer />}
                {!isReadingRoute && !isAdminRoute && <BottomNav />}
              </ErrorBoundary>
            </div>
          </div>
        </div>
      ) : (
        /* Standard Responsive View: Full-width on Desktop, optimized on Mobile */
        <div className="w-full min-h-screen flex flex-col bg-[#09090d] text-slate-100 relative">
          <ErrorBoundary>
            {!isReadingRoute && !isAdminRoute && <Header />}
            <main className="flex-1 w-full">
              <Routes>
                <Route path="/" element={<HomeView />} />
                <Route path="/discover" element={<DiscoverView />} />
                <Route path="/genre" element={<GenreView />} />
                <Route path="/genre/:genreName" element={<GenreView />} />
                <Route path="/genres" element={<GenreView />} />
                <Route path="/library" element={<LibraryView />} />
                <Route path="/profile" element={<ProfileView />} />
                <Route path="/comic/:comicId" element={<ComicDetailView />} />
                <Route path="/read/:comicId/:chapterId" element={<ComicReaderView />} />
                <Route path="/admin" element={<AdminRouteWrapper />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            {!isReadingRoute && !isAdminRoute && <Footer />}
            {!isReadingRoute && !isAdminRoute && <BottomNav />}
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
      <OfflineGuard>
        <AppProvider>
          <BrowserRouter>
            <MainAppContent />
          </BrowserRouter>
        </AppProvider>
      </OfflineGuard>
    </ErrorBoundary>
  );
}
