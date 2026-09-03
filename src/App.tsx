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
import { PrivacyPolicyView } from './components/legal/PrivacyPolicyView';
import { TermsOfServiceView } from './components/legal/TermsOfServiceView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { LoginModal } from './components/auth/LoginModal';
import { GoogleAuthModal } from './components/auth/GoogleAuthModal';
import { RegisterModal } from './components/auth/RegisterModal';
import { ProfileSettingsModal } from './components/common/ProfileSettingsModal';
import { WelcomePopUpModal } from './components/frontend/WelcomePopUpModal';
import { OfflineGuard } from './components/common/OfflineGuard';
import { AdminInactivityGuard } from './components/admin/AdminInactivityGuard';

// Sync current URL path with AppContext activeTab and clean up OAuth cancel hashes
const RouteSynchronizer: React.FC = () => {
  const location = useLocation();
  const { setActiveTab } = useApp();

  useEffect(() => {
    // 1. Clean up OAuth error or cancel query/hash params (e.g. #error=access_denied)
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash.includes('error=') || search.includes('error=')) {
        console.info('[Auth] OAuth error or cancellation parameter detected and cleaned.');
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }

    // 2. Sync tab state with current route
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
  }, [location.pathname, location.hash, location.search]);

  return null;
};

// Protected Admin View wrapper - silently redirect non-admins without exposing sensitive messages
const AdminRouteWrapper: React.FC = () => {
  const { currentUser } = useApp();

  if (currentUser?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <AdminDashboard />;
};

const MainAppContent: React.FC = () => {
  const location = useLocation();
  const { 
    isProfileSettingsModalOpen, 
    closeProfileSettingsModal 
  } = useApp();

  const isReadingRoute = location.pathname.startsWith('/read/');
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div id="antitimpa-app-root" className="min-h-screen bg-[#07070a] text-slate-100 flex flex-col items-center justify-start">
      <RouteLoadingBar />
      <RouteSynchronizer />

      {/* Standard Responsive Layout: Optimized across Desktop, Tablet, and Mobile */}
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
              <Route path="/privacy" element={<PrivacyPolicyView />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyView />} />
              <Route path="/terms" element={<TermsOfServiceView />} />
              <Route path="/terms-of-service" element={<TermsOfServiceView />} />
              <Route path="/disclaimer" element={<TermsOfServiceView />} />
              <Route path="/admin" element={<AdminRouteWrapper />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          {!isReadingRoute && !isAdminRoute && <Footer />}
          {!isReadingRoute && !isAdminRoute && <BottomNav />}
        </ErrorBoundary>
      </div>

      {/* Global Login & Auth Modals */}
      <AdminInactivityGuard />
      <LoginModal />
      <GoogleAuthModal />
      <RegisterModal />
      <ProfileSettingsModal 
        isOpen={isProfileSettingsModalOpen} 
        onClose={closeProfileSettingsModal} 
      />
      <WelcomePopUpModal />
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
