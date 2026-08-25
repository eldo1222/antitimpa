import React, { useState, useEffect, useCallback } from 'react';
import { WifiOff, RefreshCw, AlertTriangle, Radio, ShieldAlert } from 'lucide-react';

interface OfflineGuardProps {
  children?: React.ReactNode;
}

export const OfflineGuard: React.FC<OfflineGuardProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [showReconnectedBanner, setShowReconnectedBanner] = useState<boolean>(false);

  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    
    // Quick navigator check
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      setIsChecking(false);
      return false;
    }

    // Ping check with cache buster
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      // Ping lightweight endpoint or favicon
      const res = await fetch(`/favicon.ico?_t=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const onlineStatus = res.status >= 200 && res.status < 500;
      setIsOnline(onlineStatus);
      setIsChecking(false);
      return onlineStatus;
    } catch {
      // Fallback check against a public reliable DNS or image ping
      try {
        const pingImg = new Image();
        const imgPromise = new Promise<boolean>((resolve) => {
          pingImg.onload = () => resolve(true);
          pingImg.onerror = () => resolve(false);
          pingImg.src = `https://www.google.com/favicon.ico?_t=${Date.now()}`;
        });
        
        const timeoutPromise = new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(false), 3000);
        });

        const result = await Promise.race([imgPromise, timeoutPromise]);
        setIsOnline(result);
        setIsChecking(false);
        return result;
      } catch {
        setIsOnline(false);
        setIsChecking(false);
        return false;
      }
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      checkConnectivity().then((online) => {
        if (online) {
          setShowReconnectedBanner(true);
          setTimeout(() => setShowReconnectedBanner(false), 3500);
        }
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // When user unlocks phone or tab becomes active again after sleeping
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkConnectivity();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial check on mount
    checkConnectivity();

    // Periodic heartbeat every 20 seconds
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkConnectivity();
      }
    }, 20000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [checkConnectivity]);

  // If offline, block full UI with high-priority offline modal & alert overlay
  if (!isOnline) {
    return (
      <div 
        id="offline-blocking-screen" 
        className="fixed inset-0 z-[999999] bg-[#070709] text-white flex flex-col items-center justify-center p-6 select-none overflow-hidden"
      >
        {/* Ambient background glow */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-950/30 via-slate-950/80 to-[#070709]" />

        <div className="relative z-10 max-w-md w-full bg-[#111116] border border-red-500/30 rounded-3xl p-8 shadow-2xl shadow-red-950/40 text-center flex flex-col items-center">
          
          {/* Animated Offline Icon */}
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <WifiOff className="w-10 h-10 animate-pulse" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-semibold uppercase tracking-wider mb-3">
            <Radio className="w-3.5 h-3.5 text-red-400" />
            Koneksi Internet Terputus
          </div>

          <h2 className="text-2xl font-bold text-white tracking-tight mb-2">
            Aplikasi Dinonaktifkan
          </h2>
          
          <p className="text-sm text-slate-300 leading-relaxed mb-6">
            Data internet seluler atau Wi-Fi Anda sedang mati. AntiTimpa memerlukan koneksi aktif secara <i>real-time</i> untuk memuat gambar komik, validasi akun, dan perlindungan konten.
          </p>

          <div className="w-full bg-[#17171f] border border-slate-800 rounded-xl p-3.5 mb-6 text-left flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed">
              <p className="font-semibold text-slate-200 mb-0.5">Akses Offline Diblokir</p>
              Semua fitur baca komik, autentikasi, dan panel pengguna dinonaktifkan sementara hingga internet tersambung kembali.
            </div>
          </div>

          <button
            id="btn-retry-connection"
            onClick={() => checkConnectivity()}
            disabled={isChecking}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-[0.98] transition font-semibold text-sm text-white flex items-center justify-center gap-2 shadow-lg shadow-red-900/30 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Memeriksa Jaringan...' : 'Periksa & Hubungkan Ulang'}
          </button>

          <p className="text-[11px] text-slate-400 mt-4">
            Nyalakan Data Seluler atau Wi-Fi pada perangkat Anda, lalu klik tombol di atas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Reconnected Toast Notification */}
      {showReconnectedBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 px-4 py-2.5 rounded-full shadow-xl shadow-black/50 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>✅ Koneksi Internet Tersambung Kembali</span>
        </div>
      )}
      {children}
    </>
  );
};
