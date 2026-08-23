import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  onSnapshot, 
  writeBatch,
  DocumentData,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Comic, 
  Chapter, 
  User, 
  Banner, 
  ActivityLog, 
  SystemSettings, 
  DriveAccount,
  Comment
} from '../types';
import { 
  initialComics, 
  initialChapters, 
  initialUsers, 
  initialBanners, 
  initialActivityLogs, 
  initialSystemSettings, 
  initialDriveAccounts,
  initialComments
} from '../data/initialData';

// Helper to recursively remove all undefined values from objects/arrays so Firestore setDoc / writeBatch never fails
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter(item => item !== undefined)
      .map(item => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

// Collection references
const COMICS_COLLECTION = 'comics';
const CHAPTERS_COLLECTION = 'chapters';
const USERS_COLLECTION = 'users';
const DRIVES_COLLECTION = 'driveAccounts';
const BANNERS_COLLECTION = 'banners';
const LOGS_COLLECTION = 'activityLogs';
const SETTINGS_COLLECTION = 'systemSettings';
const COMMENTS_COLLECTION = 'comments';

// Initialize and seed collections if empty
export async function initializeFirestoreDatabase(): Promise<void> {
  try {
    // Check if comics collection has data
    const comicsSnap = await getDocs(collection(db, COMICS_COLLECTION));
    if (comicsSnap.empty) {
      console.log('Firebase: Seeding initial comics...');
      const batch = writeBatch(db);
      for (const comic of initialComics) {
        batch.set(doc(db, COMICS_COLLECTION, comic.id), sanitizeForFirestore(comic));
      }
      await batch.commit();
    }

    // Check if chapters collection has data
    const chaptersSnap = await getDocs(collection(db, CHAPTERS_COLLECTION));
    if (chaptersSnap.empty) {
      console.log('Firebase: Seeding initial chapters...');
      // Flatten all chapters into array
      const allChapters: Chapter[] = [];
      Object.values(initialChapters).forEach(chList => {
        allChapters.push(...chList);
      });

      // Commit in chunks if necessary
      for (let i = 0; i < allChapters.length; i += 400) {
        const batch = writeBatch(db);
        const chunk = allChapters.slice(i, i + 400);
        chunk.forEach(ch => {
          batch.set(doc(db, CHAPTERS_COLLECTION, ch.id), sanitizeForFirestore(ch));
        });
        await batch.commit();
      }
    }

    // Check users collection
    const usersSnap = await getDocs(collection(db, USERS_COLLECTION));
    if (usersSnap.empty) {
      console.log('Firebase: Seeding initial users...');
      const batch = writeBatch(db);
      for (const u of initialUsers) {
        batch.set(doc(db, USERS_COLLECTION, u.id), sanitizeForFirestore(u));
      }
      await batch.commit();
    }

    // Check drive accounts collection
    const drivesSnap = await getDocs(collection(db, DRIVES_COLLECTION));
    if (drivesSnap.empty) {
      console.log('Firebase: Seeding initial drive accounts...');
      const batch = writeBatch(db);
      for (const d of initialDriveAccounts) {
        batch.set(doc(db, DRIVES_COLLECTION, d.id), sanitizeForFirestore(d));
      }
      await batch.commit();
    }

    // Check banners collection
    const bannersSnap = await getDocs(collection(db, BANNERS_COLLECTION));
    if (bannersSnap.empty) {
      console.log('Firebase: Seeding initial banners...');
      const batch = writeBatch(db);
      for (const b of initialBanners) {
        batch.set(doc(db, BANNERS_COLLECTION, b.id), sanitizeForFirestore(b));
      }
      await batch.commit();
    }

    // Check activity logs
    const logsSnap = await getDocs(collection(db, LOGS_COLLECTION));
    if (logsSnap.empty) {
      const batch = writeBatch(db);
      for (const l of initialActivityLogs) {
        batch.set(doc(db, LOGS_COLLECTION, l.id), sanitizeForFirestore(l));
      }
      await batch.commit();
    }

    // Check system settings
    const settingsDoc = doc(db, SETTINGS_COLLECTION, 'global');
    const settingsSnap = await getDocs(collection(db, SETTINGS_COLLECTION));
    if (settingsSnap.empty) {
      await setDoc(settingsDoc, sanitizeForFirestore(initialSystemSettings));
    }

    // Check comments
    const commentsSnap = await getDocs(collection(db, COMMENTS_COLLECTION));
    if (commentsSnap.empty && initialComments && initialComments.length > 0) {
      console.log('Firebase: Seeding initial comments...');
      const batch = writeBatch(db);
      for (const c of initialComments) {
        batch.set(doc(db, COMMENTS_COLLECTION, c.id), sanitizeForFirestore(c));
      }
      await batch.commit();
    }
  } catch (error) {
    console.warn('Firebase init warning (proceeding with local fallback):', error);
  }
}

// Subscribe to Firestore updates
export function subscribeToFirestore(callbacks: {
  onComics: (comics: Comic[]) => void;
  onChapters: (chapters: Record<string, Chapter[]>) => void;
  onUsers: (users: User[]) => void;
  onDrives: (drives: DriveAccount[]) => void;
  onBanners: (banners: Banner[]) => void;
  onLogs: (logs: ActivityLog[]) => void;
  onSettings: (settings: SystemSettings) => void;
  onComments?: (comments: Comment[]) => void;
}): () => void {
  const unsubscribers: Unsubscribe[] = [];

  try {
    // Comics listener
    const unsubComics = onSnapshot(collection(db, COMICS_COLLECTION), (snap) => {
      if (!snap.empty) {
        const list: Comic[] = [];
        snap.forEach(docSnap => list.push(docSnap.data() as Comic));
        callbacks.onComics(list);
      }
    }, (err) => console.warn('Firestore comics sync error:', err));
    unsubscribers.push(unsubComics);

    // Chapters listener
    const unsubChapters = onSnapshot(collection(db, CHAPTERS_COLLECTION), (snap) => {
      if (!snap.empty) {
        const grouped: Record<string, Chapter[]> = {};
        snap.forEach(docSnap => {
          const ch = docSnap.data() as Chapter;
          if (!grouped[ch.comicId]) {
            grouped[ch.comicId] = [];
          }
          grouped[ch.comicId].push(ch);
        });
        // Sort each comic's chapters by chapterNumber descending
        Object.keys(grouped).forEach(cId => {
          grouped[cId].sort((a, b) => b.chapterNumber - a.chapterNumber);
        });
        callbacks.onChapters(grouped);
      }
    }, (err) => console.warn('Firestore chapters sync error:', err));
    unsubscribers.push(unsubChapters);

    // Users listener
    const unsubUsers = onSnapshot(collection(db, USERS_COLLECTION), (snap) => {
      if (!snap.empty) {
        const list: User[] = [];
        snap.forEach(docSnap => list.push(docSnap.data() as User));
        callbacks.onUsers(list);
      }
    }, (err) => console.warn('Firestore users sync error:', err));
    unsubscribers.push(unsubUsers);

    // Drives listener
    const unsubDrives = onSnapshot(collection(db, DRIVES_COLLECTION), (snap) => {
      if (!snap.empty) {
        const list: DriveAccount[] = [];
        snap.forEach(docSnap => list.push(docSnap.data() as DriveAccount));
        callbacks.onDrives(list);
      }
    }, (err) => console.warn('Firestore drives sync error:', err));
    unsubscribers.push(unsubDrives);

    // Banners listener
    const unsubBanners = onSnapshot(collection(db, BANNERS_COLLECTION), (snap) => {
      if (!snap.empty) {
        const list: Banner[] = [];
        snap.forEach(docSnap => list.push(docSnap.data() as Banner));
        callbacks.onBanners(list);
      }
    }, (err) => console.warn('Firestore banners sync error:', err));
    unsubscribers.push(unsubBanners);

    // Activity logs listener
    const unsubLogs = onSnapshot(collection(db, LOGS_COLLECTION), (snap) => {
      if (!snap.empty) {
        const list: ActivityLog[] = [];
        snap.forEach(docSnap => list.push(docSnap.data() as ActivityLog));
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        callbacks.onLogs(list);
      }
    }, (err) => console.warn('Firestore logs sync error:', err));
    unsubscribers.push(unsubLogs);

    // System settings listener
    const unsubSettings = onSnapshot(doc(db, SETTINGS_COLLECTION, 'global'), (docSnap) => {
      if (docSnap.exists()) {
        callbacks.onSettings(docSnap.data() as SystemSettings);
      }
    }, (err) => console.warn('Firestore settings sync error:', err));
    unsubscribers.push(unsubSettings);

    // Comments listener
    if (callbacks.onComments) {
      const unsubComments = onSnapshot(collection(db, COMMENTS_COLLECTION), (snap) => {
        if (!snap.empty) {
          const list: Comment[] = [];
          snap.forEach(docSnap => list.push(docSnap.data() as Comment));
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          callbacks.onComments!(list);
        }
      }, (err) => console.warn('Firestore comments sync error:', err));
      unsubscribers.push(unsubComments);
    }

  } catch (err) {
    console.warn('Error setting up Firestore subscriptions:', err);
  }

  return () => {
    unsubscribers.forEach(unsub => {
      try {
        unsub();
      } catch (e) {
        // ignore
      }
    });
  };
}

// CRUD Operations in Firestore
export async function saveComicToFirestore(comic: Comic): Promise<void> {
  try {
    const cleaned = sanitizeForFirestore(comic);
    await setDoc(doc(db, COMICS_COLLECTION, comic.id), cleaned);
  } catch (e) {
    console.error('Failed to save comic to Firestore:', e);
  }
}

export async function deleteComicFromFirestore(comicId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COMICS_COLLECTION, comicId));
  } catch (e) {
    console.error('Failed to delete comic from Firestore:', e);
  }
}

export async function saveChapterToFirestore(chapter: Chapter): Promise<void> {
  try {
    const cleaned = sanitizeForFirestore(chapter);
    await setDoc(doc(db, CHAPTERS_COLLECTION, chapter.id), cleaned);
  } catch (e) {
    console.error('Failed to save chapter to Firestore:', e);
  }
}

export async function deleteChapterFromFirestore(chapterId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, CHAPTERS_COLLECTION, chapterId));
  } catch (e) {
    console.error('Failed to delete chapter from Firestore:', e);
  }
}

export async function saveUserToFirestore(user: User): Promise<void> {
  try {
    const cleaned = sanitizeForFirestore(user);
    await setDoc(doc(db, USERS_COLLECTION, user.id), cleaned);
  } catch (e) {
    console.error('Failed to save user to Firestore:', e);
  }
}

export async function deleteUserFromFirestore(userId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, USERS_COLLECTION, userId));
  } catch (e) {
    console.error('Failed to delete user from Firestore:', e);
  }
}

export async function saveDriveAccountToFirestore(account: DriveAccount): Promise<void> {
  try {
    const cleaned = sanitizeForFirestore(account);
    await setDoc(doc(db, DRIVES_COLLECTION, account.id), cleaned);
  } catch (e) {
    console.error('Failed to save drive account to Firestore:', e);
  }
}

export async function deleteDriveAccountFromFirestore(accountId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, DRIVES_COLLECTION, accountId));
  } catch (e) {
    console.error('Failed to delete drive account from Firestore:', e);
  }
}

export async function saveBannerToFirestore(banner: Banner): Promise<void> {
  try {
    const cleaned = sanitizeForFirestore(banner);
    await setDoc(doc(db, BANNERS_COLLECTION, banner.id), cleaned);
  } catch (e) {
    console.error('Failed to save banner to Firestore:', e);
  }
}

export async function deleteBannerFromFirestore(bannerId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, BANNERS_COLLECTION, bannerId));
  } catch (e) {
    console.error('Failed to delete banner from Firestore:', e);
  }
}

export async function saveActivityLogToFirestore(log: ActivityLog): Promise<void> {
  try {
    const cleaned = sanitizeForFirestore(log);
    await setDoc(doc(db, LOGS_COLLECTION, log.id), cleaned);
  } catch (e) {
    console.error('Failed to save log to Firestore:', e);
  }
}

export async function saveSettingsToFirestore(settings: SystemSettings): Promise<void> {
  try {
    const cleaned = sanitizeForFirestore(settings);
    await setDoc(doc(db, SETTINGS_COLLECTION, 'global'), cleaned);
  } catch (e) {
    console.error('Failed to save settings to Firestore:', e);
  }
}

export async function saveCommentToFirestore(comment: Comment): Promise<void> {
  try {
    const cleaned = sanitizeForFirestore(comment);
    await setDoc(doc(db, COMMENTS_COLLECTION, comment.id), cleaned);
  } catch (e) {
    console.error('Failed to save comment to Firestore:', e);
  }
}

export async function deleteCommentFromFirestore(commentId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COMMENTS_COLLECTION, commentId));
  } catch (e) {
    console.error('Failed to delete comment from Firestore:', e);
  }
}
