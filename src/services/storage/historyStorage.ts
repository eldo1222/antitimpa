import { ReadingHistory } from '../../features/bookmarks/types/bookmark.types';
import { LocalStorageWrapper } from './localStorageWrapper';

const HISTORY_KEY = 'komikyuk_reading_history';

export class HistoryStorage {
  public static getHistory(): ReadingHistory[] {
    return LocalStorageWrapper.getItem<ReadingHistory[]>(HISTORY_KEY, []);
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
