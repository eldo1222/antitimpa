import { useState, useCallback } from 'react';
import { Banner } from '../types/banner.types';
import { initialBanners } from '../../../data/initialData';
import { BannerRepository } from '../services/bannerRepository';
import { LocalStorageWrapper } from '../../../services/storage/localStorageWrapper';

const STORAGE_KEY = 'antitimpa_banners_v1';

export function useBanners() {
  const [banners, setBanners] = useState<Banner[]>(() =>
    LocalStorageWrapper.getItem<Banner[]>(STORAGE_KEY, initialBanners)
  );

  const saveBannersState = useCallback((newBanners: Banner[]) => {
    setBanners(newBanners);
    LocalStorageWrapper.setItem(STORAGE_KEY, newBanners);
  }, []);

  const addBanner = useCallback((bannerData: Omit<Banner, 'id'>) => {
    const newBanner: Banner = {
      ...bannerData,
      id: `banner-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    const updated = [...banners, newBanner];
    saveBannersState(updated);
    BannerRepository.save(newBanner).catch(console.warn);
  }, [banners, saveBannersState]);

  const updateBanner = useCallback((id: string, updates: Partial<Banner>) => {
    const updated = banners.map(b => b.id === id ? { ...b, ...updates } : b);
    saveBannersState(updated);
    const target = updated.find(b => b.id === id);
    if (target) BannerRepository.save(target).catch(console.warn);
  }, [banners, saveBannersState]);

  const deleteBanner = useCallback((id: string) => {
    const updated = banners.filter(b => b.id !== id);
    saveBannersState(updated);
    BannerRepository.delete(id).catch(console.warn);
  }, [banners, saveBannersState]);

  return {
    banners,
    setBanners,
    addBanner,
    updateBanner,
    deleteBanner,
  };
}
