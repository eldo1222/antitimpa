import { ReadingHistory } from '../../features/bookmarks/types/bookmark.types';
import { LocalStorageWrapper } from './localStorageWrapper';

const HISTORY_KEY = 'antitimpa_reading_history';
const LEGACY_HISTORY_KEY = 'komikyuk_reading_history';

export class HistoryStorage {
  public static getHistory(): ReadingHistory[] {
    const modern = LocalStorageWrapper.getItem<ReadingHistory[] | null>(HISTORY_KEY, null);
    if (modern) return modern;
    const legacy = LocalStorageWrapper.getItem<ReadingHistory[]>(LEGACY_HISTORY_KEY, []);
    if (legacy && legacy.length > 0) {
      LocalStorageWrapper.setItem(HISTORY_KEY, legacy);
      return legacy;
    }
    return [];
  }

  public static saveHistory(history: ReadingHistory[]): void {
    LocalStorageWrapper.setItem(HISTORY_KEY, history);
  }

  public static updateProgress(item: ReadingHistory): ReadingHistory[] {
    const list = this.getHistory();
    const filtered = list.filter(h => h.comicId !== item.comicId);
    const updated = [item, ...filtered].slice(0, 100); // Keep latest 100 entries
    this.saveHistory(updated);
    return updated;
  }

  public static clearHistory(): void {
    LocalStorageWrapper.removeItem(HISTORY_KEY);
  }
}
