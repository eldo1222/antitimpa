import { Comic, UserAccount, CommentItem, GoogleUser, Chapter } from '../types';
import { INITIAL_COMICS, INITIAL_USERS, INITIAL_COMMENTS } from './initialData';
import { centralSync } from './centralSyncService';

const COMICS_STORAGE_KEY = 'antitimpa_comics_v1';
const USERS_STORAGE_KEY = 'antitimpa_users_v1';
const COMMENTS_STORAGE_KEY = 'antitimpa_comments_v1';
const CURRENT_READER_KEY = 'antitimpa_current_reader_v1';
const CURRENT_GOOGLE_USER_KEY = 'antitimpa_current_google_user_v1';

export class Store {
  private static instance: Store;

  private comics: Comic[] = [];
  private users: UserAccount[] = [];
  private comments: CommentItem[] = [];
  private currentReader: UserAccount | null = null;
  private currentGoogleUser: GoogleUser | null = null;

  private constructor() {
    this.loadFromStorage();
    // Connect to central sync service
    if (typeof window !== 'undefined') {
      centralSync.startSync((remoteData) => {
        if (remoteData.comics && Array.isArray(remoteData.comics)) {
          this.comics = remoteData.comics;
          this.saveComics();
        }
        if (remoteData.users && Array.isArray(remoteData.users)) {
          this.users = remoteData.users as any;
          this.saveUsers();
        }
        if (remoteData.comments && Array.isArray(remoteData.comments)) {
          this.comments = remoteData.comments as any;
          this.saveComments();
        }
      });
    }
  }

  public static getInstance(): Store {
    if (!Store.instance) {
      Store.instance = new Store();
    }
    return Store.instance;
  }

  private getItemWithLegacy(key: string): string | null {
    let item = localStorage.getItem(key);
    if (!item && key.startsWith('antitimpa_')) {
      const legacyKey = key.replace('antitimpa_', 'komikyuk_');
      item = localStorage.getItem(legacyKey);
    }
    return item;
  }

  private loadFromStorage() {
    try {
      const storedComics = this.getItemWithLegacy(COMICS_STORAGE_KEY);
      this.comics = storedComics ? JSON.parse(storedComics) : INITIAL_COMICS;

      const storedUsers = this.getItemWithLegacy(USERS_STORAGE_KEY);
      this.users = storedUsers ? JSON.parse(storedUsers) : INITIAL_USERS;

      const storedComments = this.getItemWithLegacy(COMMENTS_STORAGE_KEY);
      this.comments = storedComments ? JSON.parse(storedComments) : INITIAL_COMMENTS;

      const storedReader = this.getItemWithLegacy(CURRENT_READER_KEY);
      this.currentReader = storedReader ? JSON.parse(storedReader) : null;

      const storedGoogle = this.getItemWithLegacy(CURRENT_GOOGLE_USER_KEY);
      this.currentGoogleUser = storedGoogle ? JSON.parse(storedGoogle) : null;
    } catch (e) {
      console.error('Failed to load local storage data, using fallback:', e);
      this.comics = INITIAL_COMICS;
      this.users = INITIAL_USERS;
      this.comments = INITIAL_COMMENTS;
    }
  }

  private saveComics() {
    try {
      localStorage.setItem(COMICS_STORAGE_KEY, JSON.stringify(this.comics));
    } catch (e) {
      console.warn('Storage quota exceeded or error saving comics to localStorage:', e);
    }
  }

  private saveUsers() {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(this.users));
    } catch (e) {
      console.warn('Storage quota exceeded or error saving users to localStorage:', e);
    }
  }

  private saveComments() {
    try {
      localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(this.comments));
    } catch (e) {
      console.warn('Storage quota exceeded or error saving comments to localStorage:', e);
    }
  }

  // --- COMIC METHODS ---
  public getComics(): Comic[] {
    return [...this.comics];
  }

  public getComicById(id: string): Comic | undefined {
    return this.comics.find((c) => c.id === id || c.slug === id);
  }

  public addComic(comic: Comic): void {
    this.comics = [comic, ...this.comics.filter(c => c.id !== comic.id && c.title.toLowerCase() !== comic.title.toLowerCase())];
    this.saveComics();
    centralSync.saveComic(comic);
  }

  public updateComic(comic: Comic): void {
    const idx = this.comics.findIndex((c) => c.id === comic.id);
    if (idx !== -1) {
      this.comics[idx] = comic;
      this.saveComics();
      centralSync.saveComic(comic);
    }
  }

  public deleteComic(id: string): void {
    this.comics = this.comics.filter((c) => c.id !== id);
    this.saveComics();
    centralSync.deleteComic(id);
  }

  public toggleComicHomeVisibility(id: string): boolean {
    const comic = this.comics.find((c) => c.id === id);
    if (comic) {
      comic.showOnHome = !comic.showOnHome;
      comic.isVisibleOnHome = comic.showOnHome;
      this.saveComics();
      centralSync.saveComic(comic);
      return comic.showOnHome;
    }
    return false;
  }

  public getAllGenres(): string[] {
    const genreSet = new Set<string>();
    this.comics.forEach((c) => {
      c.genres?.forEach((g) => genreSet.add(g.trim()));
    });
    return Array.from(genreSet).sort();
  }

  // Chapters Mock Generator / Store
  public getComicChapters(comicId: string): Chapter[] {
    const comic = this.getComicById(comicId);
    const count = comic?.totalChapters || 15;
    const chapters: Chapter[] = [];
    
    for (let i = count; i >= 1; i--) {
      chapters.push({
        id: `ch-${comicId}-${i}`,
        comicId,
        chapterNumber: i,
        title: `Chapter ${i}: ${i === 1 ? 'Pertemuan Pertama' : i === count ? 'Update Terbaru' : 'Ketegangan Memuncak'}`,
        releaseDate: new Date(Date.now() - (count - i) * 86400000 * 3).toISOString().split('T')[0],
        sourceType: 'images',
        viewsCount: Math.floor(1000 + Math.random() * 5000),
        pages: [
          {
            id: `p-1`,
            pageNumber: 1,
            imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=900&auto=format&fit=crop'
          },
          {
            id: `p-2`,
            pageNumber: 2,
            imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=900&auto=format&fit=crop'
          }
        ]
      });
    }
    return chapters;
  }

  // --- USER & AUTH METHODS ---
  public getUsers(): UserAccount[] {
    return [...this.users];
  }

  public addUser(user: UserAccount): void {
    this.users.unshift(user);
    this.saveUsers();
    centralSync.saveUser(user as any);
  }

  public updateUser(user: UserAccount): void {
    const idx = this.users.findIndex((u) => u.id === user.id);
    if (idx !== -1) {
      this.users[idx] = user;
      this.saveUsers();
      centralSync.saveUser(user as any);
    }
  }

  public deleteUser(id: string): void {
    this.users = this.users.filter((u) => u.id !== id);
    this.saveUsers();
    centralSync.deleteUser(id);
  }

  public loginReader(username: string, password?: string): { success: boolean; message: string; user?: UserAccount } {
    const user = this.users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase().trim()
    );

    if (!user) {
      return { success: false, message: 'Username tidak ditemukan. Silakan hubungi admin untuk pembuatan akun.' };
    }

    if (password && user.password && user.password !== password.trim()) {
      return { success: false, message: 'Password salah.' };
    }

    if (user.status === 'locked') {
      return { success: false, message: 'Akun Anda sedang dikunci/ditangguhkan oleh admin.' };
    }

    this.currentReader = user;
    localStorage.setItem(CURRENT_READER_KEY, JSON.stringify(user));
    return { success: true, message: 'Login berhasil!', user };
  }

  public logoutReader(): void {
    this.currentReader = null;
    localStorage.removeItem(CURRENT_READER_KEY);
  }

  public getCurrentReader(): UserAccount | null {
    return this.currentReader;
  }

  public canAccess18PlusComic(comicId: string): { allowed: boolean; reason?: string } {
    const comic = this.getComicById(comicId);
    if (!comic) return { allowed: false, reason: 'Komik tidak ditemukan' };

    if (comic.contentRating === 'normal' || comic.contentType === 'normal' || comic.isFree === true) {
      return { allowed: true };
    }

    if (!this.currentReader) {
      return { 
        allowed: false, 
        reason: 'Komik ini bergenre 18+ Dewasa. Wajib login dengan akun berbayar yang telah didaftarkan Admin.' 
      };
    }

    const reader = this.currentReader;

    if (reader.role === 'admin') {
      return { allowed: true };
    }

    if (reader.planType === 'plan_15k_all' || reader.accessType === 'all') {
      return { allowed: true };
    }

    if (reader.planType === 'plan_5k_single' || reader.accessType === 'specific') {
      const allowed = reader.allowedComicIds || [];
      if (allowed.includes(comic.id)) {
        return { allowed: true };
      }
      return { 
        allowed: false, 
        reason: `Akun Anda adalah Paket Rp 5.000 (${allowed.length} Judul). Komik ini tidak termasuk dalam daftar judul yang diizinkan.` 
      };
    }

    return { allowed: true };
  }

  // --- COMMENT METHODS ---
  public getComments(comicId: string): CommentItem[] {
    return this.comments.filter((c) => c.comicId === comicId);
  }

  public addComment(comment: CommentItem): void {
    this.comments.unshift(comment);
    this.saveComments();
    centralSync.saveComment(comment as any);
  }

  public toggleCommentLike(commentId: string): void {
    const comment = this.comments.find((c) => c.id === commentId);
    if (comment) {
      comment.isLiked = !comment.isLiked;
      comment.likes = comment.isLiked ? comment.likes + 1 : Math.max(0, comment.likes - 1);
      this.saveComments();
      centralSync.saveComment(comment as any);
    }
  }

  // --- GOOGLE AUTH ---
  public setGoogleUser(user: GoogleUser | null): void {
    this.currentGoogleUser = user;
    if (user) {
      localStorage.setItem(CURRENT_GOOGLE_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_GOOGLE_USER_KEY);
    }
  }

  public getGoogleUser(): GoogleUser | null {
    return this.currentGoogleUser;
  }
}

export const store = Store.getInstance();
