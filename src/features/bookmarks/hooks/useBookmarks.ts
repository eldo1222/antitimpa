import { useState, useCallback } from 'react';
import { Bookmark, ReadingHistory } from '../types/bookmark.types';
import { BookmarkStorage } from '../../../services/storage/bookmarkStorage';
import { HistoryStorage } from '../../../services/storage/historyStorage';

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => BookmarkStorage.getBookmarks());
  const [readingHistory, setReadingHistory] = useState<ReadingHistory[]>(() => HistoryStorage.getHistory());

  const toggleBookmark = useCallback((comicId: string) => {
    BookmarkStorage.toggleBookmark(comicId);
    setBookmarks(BookmarkStorage.getBookmarks());
  }, []);

  const isBookmarked = useCallback((comicId: string): boolean => {
    return bookmarks.some(b => b.comicId === comicId);
  }, [bookmarks]);

  const saveReadingProgress = useCallback((
    comicId: string,
    chapterId: string,
    chapterNumber: number,
    pageNumber: number,
    totalPages: number
  ) => {
    const updated = HistoryStorage.updateProgress({
      comicId,
      chapterId,
      chapterNumber,
      pageNumber,
      totalPages,
      updatedAt: new Date().toISOString(),
    });
    setReadingHistory(updated);
  }, []);

  const getReadingProgress = useCallback((comicId: string): ReadingHistory | undefined => {
    return readingHistory.find(h => h.comicId === comicId);
  }, [readingHistory]);

  return {
    bookmarks,
    setBookmarks,
    readingHistory,
    setReadingHistory,
    toggleBookmark,
    isBookmarked,
    saveReadingProgress,
    getReadingProgress,
  };
}
