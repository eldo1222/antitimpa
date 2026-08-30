import { LocalStorageWrapper } from './localStorageWrapper';

export interface UIPreferences {
  readerMode: 'vertical' | 'single';
  ageGatingAgreed: boolean;
  theme: 'dark' | 'light';
  savedAdminView?: string;
}

const PREFERENCES_KEY = 'komikyuk_ui_preferences';

export class PreferenceStorage {
  public static getPreferences(): UIPreferences {
    return LocalStorageWrapper.getItem<UIPreferences>(PREFERENCES_KEY, {
      readerMode: 'vertical',
      ageGatingAgreed: false,
      theme: 'dark',
    });
  }

  public static savePreferences(prefs: Partial<UIPreferences>): UIPreferences {
    const current = this.getPreferences();
    const updated = { ...current, ...prefs };
    LocalStorageWrapper.setItem(PREFERENCES_KEY, updated);
    return updated;
  }
}
