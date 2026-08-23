import { Comic, UserAccount, CommentItem, GoogleUser, Chapter } from '../types';
import { INITIAL_COMICS, INITIAL_USERS, INITIAL_COMMENTS } from './initialData';

const COMICS_STORAGE_KEY = 'komikyuk_comics_v1';
const USERS_STORAGE_KEY = 'komikyuk_users_v1';
const COMMENTS_STORAGE_KEY = 'komikyuk_comments_v1';
const CURRENT_READER_KEY = 'komikyuk_current_reader_v1';
const CURRENT_GOOGLE_USER_KEY = 'komikyuk_current_google_user_v1';

export class Store {
  private static instance: Store;

  private comics: Comic[] = [];
  private users: UserAccount[] = [];
  private comments: CommentItem[] = [];
  private currentReader: UserAccount | null = null;
  private currentGoogleUser: GoogleUser | null = null;

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): Store {
    if (!Store.instance) {
      Store.instance = new Store();
    }
    return Store.instance;
  }

  private loadFromStorage() {
    try {
      const storedComics = localStorage.getItem(COMICS_STORAGE_KEY);
      this.comics = storedComics ? JSON.parse(storedComics) : INITIAL_COMICS;

      const storedUsers = localStorage.getItem(USERS_STORAGE_KEY);
      this.users = storedUsers ? JSON.parse(storedUsers) : INITIAL_USERS;

      const storedComments = localStorage.getItem(COMMENTS_STORAGE_KEY);
      this.comments = storedComments ? JSON.parse(storedComments) : INITIAL_COMMENTS;

      const storedReader = localStorage.getItem(CURRENT_READER_KEY);
      this.currentReader = storedReader ? JSON.parse(storedReader) : null;

      const storedGoogle = localStorage.getItem(CURRENT_GOOGLE_USER_KEY);
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
    this.comics.unshift(comic);
    this.saveComics();
  }

  public updateComic(comic: Comic): void {
    const idx = this.comics.findIndex((c) => c.id === comic.id);
    if (idx !== -1) {
      this.comics[idx] = comic;
      this.saveComics();
    }
  }

  public deleteComic(id: string): void {
    this.comics = this.comics.filter((c) => c.id !== id);
    this.saveComics();
  }

  public toggleComicHomeVisibility(id: string): boolean {
    const comic = this.comics.find((c) => c.id === id);
    if (comic) {
      comic.showOnHome = !comic.showOnHome;
      this.saveComics();
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
          'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=900&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=900&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?q=80&w=900&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=900&auto=format&fit=crop'
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
  }

  public updateUser(user: UserAccount): void {
    const idx = this.users.findIndex((u) => u.id === user.id);
    if (idx !== -1) {
      this.users[idx] = user;
      this.saveUsers();
    }
  }

  public deleteUser(id: string): void {
    this.users = this.users.filter((u) => u.id !== id);
    this.saveUsers();
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

  // Check if current user has access to a specific 18+ comic
  public canAccess18PlusComic(comicId: string): { allowed: boolean; reason?: string } {
    const comic = this.getComicById(comicId);
    if (!comic) return { allowed: false, reason: 'Komik tidak ditemukan' };

    // Komik normal bebas dibaca semua orang tanpa login
    if (comic.contentRating === 'normal') {
      return { allowed: true };
    }

    // Komik 18+ wajib login
    if (!this.currentReader) {
      return { 
        allowed: false, 
        reason: 'Komik ini bergenre 18+ Dewasa. Wajib login dengan akun berbayar yang telah didaftarkan Admin.' 
      };
    }

    // Admin selalu punya akses
    if (this.currentReader.role === 'admin' || this.currentReader.planType === 'plan_15k_all') {
      return { allowed: true };
    }

    // Paket 5k (Single Comic / Selected)
    if (this.currentReader.planType === 'plan_5k_single') {
      const isAllowed = this.currentReader.allowedComicIds?.includes(comic.id);
      if (isAllowed) {
        return { allowed: true };
      } else {
        return { 
          allowed: false, 
          reason: 'Akun Anda menggunakan Paket 5K (1 Komik Pilihan). Komik 18+ ini tidak termasuk dalam daftar komik pilihan Anda. Hubungi admin untuk upgrade atau ganti komik.' 
        };
      }
    }

    return { allowed: false, reason: 'Paket langganan Anda tidak aktif.' };
  }

  // --- GOOGLE USER (For Comments) ---
  public loginGoogle(customUser?: Partial<GoogleUser>): GoogleUser {
    const mockUser: GoogleUser = {
      uid: customUser?.uid || 'google-' + Math.random().toString(36).substring(2, 9),
      displayName: customUser?.displayName || 'Pembaca Komik #' + Math.floor(1000 + Math.random() * 9000),
      email: customUser?.email || 'user' + Math.floor(Math.random() * 100) + '@gmail.com',
      photoURL: customUser?.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${Date.now()}`
    };
    this.currentGoogleUser = mockUser;
    localStorage.setItem(CURRENT_GOOGLE_USER_KEY, JSON.stringify(mockUser));
    return mockUser;
  }

  public logoutGoogle(): void {
    this.currentGoogleUser = null;
    localStorage.removeItem(CURRENT_GOOGLE_USER_KEY);
  }

  public getCurrentGoogleUser(): GoogleUser | null {
    return this.currentGoogleUser;
  }

  // --- COMMENT METHODS ---
  public getCommentsByComic(comicId: string): CommentItem[] {
    return this.comments.filter((c) => c.comicId === comicId);
  }

  public addComment(comment: Omit<CommentItem, 'id' | 'createdAt' | 'likes' | 'likedBy'>): CommentItem {
    const newComment: CommentItem = {
      ...comment,
      id: 'comment-' + Date.now(),
      likes: 0,
      likedBy: [],
      createdAt: new Date().toISOString(),
    };
    this.comments.unshift(newComment);
    this.saveComments();
    return newComment;
  }

  public toggleLikeComment(commentId: string, userId: string): void {
    const comment = this.comments.find((c) => c.id === commentId);
    if (comment) {
      if (comment.likedBy.includes(userId)) {
        comment.likedBy = comment.likedBy.filter((id) => id !== userId);
        comment.likes = Math.max(0, comment.likes - 1);
      } else {
        comment.likedBy.push(userId);
        comment.likes += 1;
      }
      this.saveComments();
    }
  }

  public deleteComment(commentId: string): void {
    this.comments = this.comments.filter((c) => c.id !== commentId);
    this.saveComments();
  }
}

export const store = Store.getInstance();
