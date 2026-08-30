export type AdSlotPosition = 
  | 'home_hero_bottom'
  | 'home_between_sections'
  | 'home_footer'
  | 'welcome_popup'
  | 'mitra_interstitial'
  | 'chapter_top_a'
  | 'chapter_top_b'
  | 'detail_top'
  | 'detail_bottom'
  | 'reader_top_bar'
  | 'reader_bottom_nav'
  | 'popunder'
  | 'home_top'
  | 'home_bottom'
  | 'comic_detail_bottom'
  | 'reader_end'
  | 'floating_bottom'
  | 'popunder_global';

export type AdType = 
  | 'banner'
  | 'native_text'
  | 'html_code'
  | 'popunder'
  | 'banner_image'
  | 'html_script'
  | 'popunder_direct';

export interface AdItem {
  id: string;
  title: string;
  type: AdType;
  position: AdSlotPosition;
  isActive: boolean;
  
  // Banner / Native fields
  imageUrl?: string;
  targetUrl?: string;
  altText?: string;
  badgeLabel?: string;
  sponsorName?: string;
  headline?: string;
  description?: string;
  ctaText?: string;
  
  // Script / HTML embed fields
  htmlCode?: string;
  scriptCode?: string;
  
  // Popunder fields
  popunderUrl?: string;
  frequencyHours?: number;
  
  // Proteksi & Pengaturan
  showForVip?: boolean;
  maxClicksPerDay?: number;
  clickCount?: number;
  viewCount?: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AdSettings {
  adsEnabled: boolean;
  hideAdsForVip: boolean;
  popunderEnabled: boolean;
  popunderCooldownMinutes?: number;
  popunderCooldownHours?: number;
  welcomePopupEnabled?: boolean;
  mitraInterstitialEnabled?: boolean;
  dualChapterAdsEnabled?: boolean;
  floatingBottomEnabled?: boolean;
  showAdLabel?: boolean;
}
