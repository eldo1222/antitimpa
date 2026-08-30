import { Bookmark } from '../../features/bookmarks/types/bookmark.types';
import { LocalStorageWrapper } from './localStorageWrapper';

const BOOKMARKS_KEY = 'komikyuk_bookmarks';

export class BookmarkStorage {
  public static getBookmarks(): Bookmark[] {
    return LocalStorageWrapper.getItem<Bookmark[]>(BOOKMARKS_KEY, []);
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
