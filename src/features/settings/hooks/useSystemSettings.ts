import { useState, useCallback } from 'react';
import { SystemSettings, ActivityLog, AdminToastItem } from '../types/settings.types';
import { initialSystemSettings, initialActivityLogs } from '../../../data/initialData';
import { SettingsRepository } from '../services/settingsRepository';
import { LocalStorageWrapper } from '../../../services/storage/localStorageWrapper';
import { updateFavicon } from '../../../utils/favicon';

const STORAGE_KEYS = {
  SETTINGS: 'antitimpa_settings_v1',
  LOGS: 'antitimpa_logs_v1',
};

export function useSystemSettings() {
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() =>
    LocalStorageWrapper.getItem<SystemSettings>(STORAGE_KEYS.SETTINGS, initialSystemSettings)
  );
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() =>
    LocalStorageWrapper.getItem<ActivityLog[]>(STORAGE_KEYS.LOGS, initialActivityLogs)
  );
  const [adminToasts, setAdminToasts] = useState<AdminToastItem[]>([]);

  const showAdminToast = useCallback((
    title: string, 
    message?: string, 
    type: 'success' | 'info' | 'warning' | 'error' = 'info'
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: AdminToastItem = {
      id,
      title,
      message,
      type,
      timestamp: Date.now()
    };
    setAdminToasts(prev => [newToast, ...prev].slice(0, 5));
    setTimeout(() => {
      setAdminToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const removeAdminToast = useCallback((id: string) => {
    setAdminToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addActivityLog = useCallback((type: string, message: string) => {
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      username: 'Admin',
      action: message,
      type: (type as any) || 'system_settings',
      status: 'info',
      details: message,
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString()
    };
    setActivityLogs(prev => {
      const updated = [newLog, ...prev].slice(0, 2000);
      LocalStorageWrapper.setItem(STORAGE_KEYS.LOGS, updated);
      return updated;
    });
    SettingsRepository.addLog(newLog).catch(console.warn);
  }, []);

  const clearActivityLogs = useCallback((reason?: string) => {
    setActivityLogs([]);
    LocalStorageWrapper.setItem(STORAGE_KEYS.LOGS, []);
    addActivityLog('system_settings', reason || 'Log aktivitas dibersihkan oleh Admin');
  }, [addActivityLog]);

  const updateSettings = useCallback((settings: Partial<SystemSettings>) => {
    setSystemSettings(prev => {
      const merged = { ...prev, ...settings };
      LocalStorageWrapper.setItem(STORAGE_KEYS.SETTINGS, merged);
      
      if (settings.siteName) {
        document.title = `${settings.siteName} - Baca Komik Online Terlengkap`;
      }
      if (settings.siteFavicon) {
        updateFavicon(settings.siteFavicon);
      }
      
      SettingsRepository.saveSettings(merged).catch(console.warn);
      return merged;
    });
  }, []);

  return {
    systemSettings,
    setSystemSettings,
    activityLogs,
    setActivityLogs,
    adminToasts,
    showAdminToast,
    removeAdminToast,
    addActivityLog,
    clearActivityLogs,
    updateSettings,
  };
}
