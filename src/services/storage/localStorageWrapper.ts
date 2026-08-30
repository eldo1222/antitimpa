/**
 * Type-safe localStorage wrapper with try-catch guards & fallback
 */

export class LocalStorageWrapper {
  public static getItem<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item) as T;
    } catch (err) {
      console.warn(`[LocalStorage] Error reading key "${key}":`, err);
      return defaultValue;
    }
  }

  public static setItem<T>(key: string, value: T): boolean {
    if (typeof window === 'undefined') return false;
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn(`[LocalStorage] Error writing key "${key}":`, err);
      return false;
    }
  }

  public static removeItem(key: string): boolean {
    if (typeof window === 'undefined') return false;
    try {
      localStorage.removeItem(key);
      return true;
    } catch (err) {
      console.warn(`[LocalStorage] Error removing key "${key}":`, err);
      return false;
    }
  }

  public static getString(key: string, defaultValue: string = ''): string {
    if (typeof window === 'undefined') return defaultValue;
    try {
      return localStorage.getItem(key) ?? defaultValue;
    } catch {
      return defaultValue;
    }
  }

  public static setString(key: string, value: string): boolean {
    if (typeof window === 'undefined') return false;
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
}
