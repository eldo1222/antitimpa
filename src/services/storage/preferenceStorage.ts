import { LocalStorageWrapper } from './localStorageWrapper';

export interface UIPreferences {
  readerMode: 'vertical' | 'single';
  ageGatingAgreed: boolean;
  theme: 'dark' | 'light';
  savedAdminView?: string;
}

const PREFERENCES_KEY = 'antitimpa_ui_preferences';
const LEGACY_PREFERENCES_KEY = 'komikyuk_ui_preferences';

export class PreferenceStorage {
  public static getPreferences(): UIPreferences {
    const defaultVal: UIPreferences = {
      readerMode: 'vertical',
      ageGatingAgreed: false,
      theme: 'dark',
    };
    const modern = LocalStorageWrapper.getItem<UIPreferences | null>(PREFERENCES_KEY, null);
    if (modern) return modern;
    const legacy = LocalStorageWrapper.getItem<UIPreferences | null>(LEGACY_PREFERENCES_KEY, null);
    if (legacy) {
      LocalStorageWrapper.setItem(PREFERENCES_KEY, legacy);
      return legacy;
    }
    return defaultVal;
  }

  public static savePreferences(prefs: Partial<UIPreferences>): UIPreferences {
    const current = this.getPreferences();
    const updated = { ...current, ...prefs };
    LocalStorageWrapper.setItem(PREFERENCES_KEY, updated);
    return updated;
  }
}
