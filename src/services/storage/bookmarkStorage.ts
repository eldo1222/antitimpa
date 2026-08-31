import { Bookmark } from '../../features/bookmarks/types/bookmark.types';
import { LocalStorageWrapper } from './localStorageWrapper';

const BOOKMARKS_KEY = 'antitimpa_bookmarks';
const LEGACY_BOOKMARKS_KEY = 'komikyuk_bookmarks';

export class BookmarkStorage {
  public static getBookmarks(): Bookmark[] {
    const modern = LocalStorageWrapper.getItem<Bookmark[] | null>(BOOKMARKS_KEY, null);
    if (modern) return modern;
    const legacy = LocalStorageWrapper.getItem<Bookmark[]>(LEGACY_BOOKMARKS_KEY, []);
    if (legacy && legacy.length > 0) {
      LocalStorageWrapper.setItem(BOOKMARKS_KEY, legacy);
      return legacy;
    }
    return [];
  }

  public static saveBookmarks(bookmarks: Bookmark[]): void {
    LocalStorageWrapper.setItem(BOOKMARKS_KEY, bookmarks);
  }

  public static isBookmarked(comicId: string): boolean {
    const list = this.getBookmarks();
    return list.some(b => b.comicId === comicId);
  }

  public static toggleBookmark(comicId: string): boolean {
    const list = this.getBookmarks();
    const exists = list.some(b => b.comicId === comicId);
    let updated: Bookmark[];
    if (exists) {
      updated = list.filter(b => b.comicId !== comicId);
    } else {
      updated = [{ comicId, addedAt: new Date().toISOString() }, ...list];
    }
    this.saveBookmarks(updated);
    return !exists;
  }
}
