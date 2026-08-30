import { useState, useCallback } from 'react';
import { AdItem, AdSettings, AdSlotPosition } from '../types/ad.types';
import { initialAds, initialAdSettings } from '../../../data/initialData';
import { AdRepository } from '../services/adRepository';
import { LocalStorageWrapper } from '../../../services/storage/localStorageWrapper';

const STORAGE_KEYS = {
  ADS: 'antitimpa_ads_v1',
  AD_SETTINGS: 'antitimpa_ad_settings_v1',
};

export function useAds(currentUserRole?: string, isVip?: boolean) {
  const [ads, setAds] = useState<AdItem[]>(() => 
    LocalStorageWrapper.getItem<AdItem[]>(STORAGE_KEYS.ADS, initialAds)
  );
  const [adSettings, setAdSettings] = useState<AdSettings>(() =>
    LocalStorageWrapper.getItem<AdSettings>(STORAGE_KEYS.AD_SETTINGS, initialAdSettings)
  );

  const saveAdsState = useCallback((newAds: AdItem[]) => {
    setAds(newAds);
    LocalStorageWrapper.setItem(STORAGE_KEYS.ADS, newAds);
  }, []);

  const saveSettingsState = useCallback((newSettings: AdSettings) => {
    setAdSettings(newSettings);
    LocalStorageWrapper.setItem(STORAGE_KEYS.AD_SETTINGS, newSettings);
  }, []);

  const addAd = useCallback((adData: Omit<AdItem, 'id' | 'createdAt'>) => {
    const newAd: AdItem = {
      ...adData,
      id: `ad-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      clickCount: 0,
      viewCount: 0,
    };
    const updated = [newAd, ...ads];
    saveAdsState(updated);
    AdRepository.saveAd(newAd).catch(console.warn);
  }, [ads, saveAdsState]);

  const updateAd = useCallback((id: string, updates: Partial<AdItem>) => {
    const updated = ads.map(a => a.id === id ? { ...a, ...updates } : a);
    saveAdsState(updated);
    const target = updated.find(a => a.id === id);
    if (target) AdRepository.saveAd(target).catch(console.warn);
  }, [ads, saveAdsState]);

  const deleteAd = useCallback((id: string) => {
    const updated = ads.filter(a => a.id !== id);
    saveAdsState(updated);
    AdRepository.deleteAd(id).catch(console.warn);
  }, [ads, saveAdsState]);

  const toggleAd = useCallback((id: string) => {
    const target = ads.find(a => a.id === id);
    if (target) {
      updateAd(id, { isActive: !target.isActive });
    }
  }, [ads, updateAd]);

  const updateAdSettings = useCallback((settings: Partial<AdSettings>) => {
    const merged = { ...adSettings, ...settings };
    saveSettingsState(merged);
    AdRepository.saveSettings(merged).catch(console.warn);
  }, [adSettings, saveSettingsState]);

  const trackAdClick = useCallback((id: string) => {
    setAds(prev => {
      const updated = prev.map(a => a.id === id ? { ...a, clickCount: (a.clickCount || 0) + 1 } : a);
      LocalStorageWrapper.setItem(STORAGE_KEYS.ADS, updated);
      const item = updated.find(a => a.id === id);
      if (item) AdRepository.saveAd(item).catch(() => {});
      return updated;
    });
  }, []);

  const trackAdView = useCallback((id: string) => {
    setAds(prev => {
      const updated = prev.map(a => a.id === id ? { ...a, viewCount: (a.viewCount || 0) + 1 } : a);
      LocalStorageWrapper.setItem(STORAGE_KEYS.ADS, updated);
      return updated;
    });
  }, []);

  const canShowAd = useCallback((ad: AdItem): boolean => {
    if (!adSettings.adsEnabled) return false;
    if (!ad.isActive) return false;
    if (isVip && adSettings.hideAdsForVip && !ad.showForVip) return false;
    return true;
  }, [adSettings, isVip]);

  const getAdsByPosition = useCallback((position: AdSlotPosition): AdItem[] => {
    return ads.filter(a => a.position === position && canShowAd(a));
  }, [ads, canShowAd]);

  const triggerPopunder = useCallback((customUrl?: string): boolean => {
    if (!adSettings.adsEnabled || !adSettings.popunderEnabled) return false;
    if (isVip && adSettings.hideAdsForVip) return false;

    const lastTrigger = LocalStorageWrapper.getItem<number>('antitimpa_popunder_last_trigger', 0);
    const cooldownMs = (adSettings.popunderCooldownMinutes || 15) * 60 * 1000;
    const now = Date.now();

    if (now - lastTrigger < cooldownMs) return false;

    let targetUrl = customUrl;
    if (!targetUrl) {
      const popAd = ads.find(a => (a.type === 'popunder' || a.position === 'popunder') && a.isActive);
      targetUrl = popAd?.popunderUrl || popAd?.targetUrl;
    }

    if (targetUrl) {
      LocalStorageWrapper.setItem('antitimpa_popunder_last_trigger', now);
      return true;
    }
    return false;
  }, [adSettings, ads, isVip]);

  return {
    ads,
    setAds,
    adSettings,
    setAdSettings,
    addAd,
    updateAd,
    deleteAd,
    toggleAd,
    updateAdSettings,
    trackAdClick,
    trackAdView,
    canShowAd,
    getAdsByPosition,
    triggerPopunder,
  };
}
