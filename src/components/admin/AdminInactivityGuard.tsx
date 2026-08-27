import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldAlert, LogOut, Clock } from 'lucide-react';
import { AdminModalPortal } from '../common/AdminModalPortal';

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 Minutes (1,800,000 ms)
const WARNING_THRESHOLD_MS = 28 * 60 * 1000;  // 28 Minutes (show 2-min warning banner)
const STORAGE_KEY = 'antitimpa_admin_last_activity';

export const AdminInactivityGuard: React.FC = () => {
  const { currentUser, isAdminView, logout, showAdminToast } = useApp();
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(120);
  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<any>(null);

  const isAdmin = currentUser?.role === 'admin' || isAdminView;

  // Record user activity
  const handleUserActivity = useCallback(() => {
    const now = Date.now();
    // Throttle writing to state & storage
    if (now - lastActivityRef.current > 2000) {
      lastActivityRef.current = now;
      try {
        localStorage.setItem(STORAGE_KEY, String(now));
      } catch (_) {}
      if (showWarningModal) {
        setShowWarningModal(false);
      }
    }
  }, [showWarningModal]);

  // Keep session alive on user clicking "Saya Masih Aktif"
  const extendSession = () => {
    lastActivityRef.current = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch (_) {}
    setShowWarningModal(false);
    showAdminToast('Sesi Diperpanjang', 'Sesi Super Admin Anda aktif kembali untuk 30 menit ke depan.', 'success');
  };

  const performAutoLogout = useCallback(() => {
    setShowWarningModal(false);
    showAdminToast(
      'Sesi Admin Berakhir',
      'Akun Super Admin otomatis di-logout karena tidak ada aktivitas selama 30 menit demi keamanan data.',
      'warning'
    );
    logout();
  }, [logout, showAdminToast]);

  useEffect(() => {
    if (!isAdmin) {
      setShowWarningModal(false);
      return;
    }

    // Initialize last activity timestamp
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? parseInt(saved, 10) : NaN;
    lastActivityRef.current = !isNaN(parsed) && parsed > 0 ? parsed : Date.now();

    // Event listeners to capture admin interactions
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    const onEvent = () => handleUserActivity();

    events.forEach(evt => {
      window.addEventListener(evt, onEvent, { passive: true });
    });

    // Check inactivity every 5 seconds
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivityRef.current;

      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        performAutoLogout();
      } else if (elapsed >= WARNING_THRESHOLD_MS) {
        const leftSec = Math.max(0, Math.ceil((INACTIVITY_TIMEOUT_MS - elapsed) / 1000));
        setRemainingSeconds(leftSec);
        setShowWarningModal(true);
      } else {
        if (showWarningModal) {
          setShowWarningModal(false);
        }
      }
    }, 5000);

    return () => {
      events.forEach(evt => {
        window.removeEventListener(evt, onEvent);
      });
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isAdmin, handleUserActivity, performAutoLogout, showWarningModal]);

  if (!isAdmin || !showWarningModal) return null;

  return (
    <AdminModalPortal isOpen={showWarningModal} onClose={extendSession} maxWidth="max-w-md">
      <div 
        id="admin-inactivity-modal"
        className="bg-[#14141e] border-2 border-amber-500/80 rounded-2xl p-6 w-full text-center shadow-2xl shadow-amber-500/20"
      >
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
          <Clock className="w-7 h-7 animate-pulse" />
        </div>

        <h3 className="text-lg font-black text-white mb-2">
          Peringatan Inaktivitas Sesi Admin
        </h3>

        <p className="text-xs text-slate-300 mb-4 leading-relaxed">
          Anda telah tidak aktif selama hampir 30 menit. Demi keamanan sistem, sesi Super Admin Anda akan otomatis di-logout dalam:
        </p>

        <div className="py-3 px-4 bg-[#1b1b2a] border border-amber-500/30 rounded-xl mb-5 inline-block">
          <span className="text-2xl font-black font-mono text-amber-400 tracking-wider">
            {Math.floor(remainingSeconds / 60)}:{(remainingSeconds % 60).toString().padStart(2, '0')}
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">detik tersisa</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={extendSession}
            className="flex-1 py-2.5 px-4 bg-[#ff5b14] hover:bg-[#e04e0e] text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Tetap Masuk (Saya Masih Aktif)</span>
          </button>

          <button
            onClick={performAutoLogout}
            className="py-2.5 px-4 bg-[#1e1e2d] hover:bg-[#28283d] text-slate-300 hover:text-white font-bold text-xs rounded-xl border border-[#303046] transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout Sekarang</span>
          </button>
        </div>
      </div>
    </AdminModalPortal>
  );
};
