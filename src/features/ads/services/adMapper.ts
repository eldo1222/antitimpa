import { AdItem, AdSettings } from '../types/ad.types';

export function mapAdToDb(a: Partial<AdItem>): Record<string, any> {
  const row: Record<string, any> = {};
  if (a.id !== undefined) row.id = a.id;
  if (a.title !== undefined) row.title = a.title;
  if (a.type !== undefined) row.type = a.type;
  if (a.position !== undefined) row.position = a.position;
  if (a.isActive !== undefined) row.is_active = a.isActive;
  if (a.imageUrl !== undefined) row.image_url = a.imageUrl;
  if (a.targetUrl !== undefined) row.target_url = a.targetUrl;
  if (a.altText !== undefined) row.alt_text = a.altText;
  if (a.badgeLabel !== undefined) row.badge_label = a.badgeLabel;
  if (a.sponsorName !== undefined) row.sponsor_name = a.sponsorName;
  if (a.headline !== undefined) row.headline = a.headline;
  if (a.description !== undefined) row.description = a.description;
  if (a.ctaText !== undefined) row.cta_text = a.ctaText;
  if (a.htmlCode !== undefined) row.html_code = a.htmlCode;
  if (a.scriptCode !== undefined) row.script_code = a.scriptCode;
  if (a.popunderUrl !== undefined) row.popunder_url = a.popunderUrl;
  if (a.frequencyHours !== undefined) row.frequency_hours = a.frequencyHours;
  if (a.showForVip !== undefined) row.show_for_vip = a.showForVip;
  if (a.maxClicksPerDay !== undefined) row.max_clicks_per_day = a.maxClicksPerDay;
  if (a.clickCount !== undefined) row.click_count = a.clickCount;
  if (a.viewCount !== undefined) row.view_count = a.viewCount;
  if (a.notes !== undefined) row.notes = a.notes;
  row.created_at = a.createdAt || new Date().toISOString();
  return row;
}

export function mapDbToAd(a: Record<string, any>): AdItem {
  return {
    id: a.id,
    title: a.title || 'Sponsor Ad',
    type: a.type || (a.html_code ? 'html_code' : a.popunder_url ? 'popunder' : 'banner'),
    position: a.position || 'home_hero_bottom',
    isActive: a.is_active !== false,
    imageUrl: a.image_url || undefined,
    targetUrl: a.target_url || undefined,
    altText: a.alt_text || undefined,
    badgeLabel: a.badge_label || undefined,
    sponsorName: a.sponsor_name || undefined,
    headline: a.headline || undefined,
    description: a.description || undefined,
    ctaText: a.cta_text || undefined,
    htmlCode: a.html_code || undefined,
    scriptCode: a.script_code || undefined,
    popunderUrl: a.popunder_url || undefined,
    frequencyHours: a.frequency_hours ? Number(a.frequency_hours) : undefined,
    showForVip: a.show_for_vip !== undefined ? Boolean(a.show_for_vip) : false,
    maxClicksPerDay: a.max_clicks_per_day ? Number(a.max_clicks_per_day) : undefined,
    clickCount: Number(a.click_count) || 0,
    viewCount: Number(a.view_count) || 0,
    notes: a.notes || undefined,
    createdAt: a.created_at || new Date().toISOString(),
  };
}

export function mapAdSettingsToDb(s: Partial<AdSettings>): Record<string, any> {
  const row: Record<string, any> = {
    id: 'global_ad_config',
    updated_at: new Date().toISOString(),
  };
  if (s.adsEnabled !== undefined) row.ads_enabled = s.adsEnabled;
  if (s.hideAdsForVip !== undefined) row.hide_ads_for_vip = s.hideAdsForVip;
  if (s.popunderEnabled !== undefined) row.popunder_enabled = s.popunderEnabled;
  if (s.popunderCooldownMinutes !== undefined) row.popunder_cooldown_minutes = s.popunderCooldownMinutes;
  if (s.popunderCooldownHours !== undefined) row.popunder_cooldown_hours = s.popunderCooldownHours;
  if (s.welcomePopupEnabled !== undefined) row.welcome_popup_enabled = s.welcomePopupEnabled;
  if (s.mitraInterstitialEnabled !== undefined) row.mitra_interstitial_enabled = s.mitraInterstitialEnabled;
  if (s.dualChapterAdsEnabled !== undefined) row.dual_chapter_ads_enabled = s.dualChapterAdsEnabled;
  if (s.floatingBottomEnabled !== undefined) row.floating_bottom_enabled = s.floatingBottomEnabled;
  if (s.showAdLabel !== undefined) row.show_ad_label = s.showAdLabel;
  return row;
}

export function mapDbToAdSettings(s: Record<string, any>): AdSettings {
  return {
    adsEnabled: s.ads_enabled !== false,
    hideAdsForVip: s.hide_ads_for_vip !== false,
    popunderEnabled: s.popunder_enabled !== false,
    popunderCooldownMinutes: s.popunder_cooldown_minutes ? Number(s.popunder_cooldown_minutes) : 15,
    welcomePopupEnabled: Boolean(s.welcome_popup_enabled),
    mitraInterstitialEnabled: Boolean(s.mitra_interstitial_enabled),
    dualChapterAdsEnabled: Boolean(s.dual_chapter_ads_enabled),
    floatingBottomEnabled: Boolean(s.floating_bottom_enabled),
    showAdLabel: s.show_ad_label !== false,
  };
}
