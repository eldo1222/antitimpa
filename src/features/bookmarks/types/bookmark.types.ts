export interface Bookmark {
  comicId: string;
  addedAt: string;
}

export interface ReadingHistory {
  comicId: string;
  chapterId: string;
  chapterNumber: number;
  pageNumber: number;
  totalPages: number;
  updatedAt: string;
}
