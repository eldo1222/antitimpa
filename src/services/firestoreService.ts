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
  Comment,
  AdItem,
  AdSettings
} from '../types';
import { 
  initialComics, 
  initialChapters, 
  initialUsers, 
  initialBanners, 
  initialActivityLogs, 
  initialSystemSettings, 
  initialDriveAccounts,
  initialComments,
  initialAds,
  initialAdSettings
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
const ADS_COLLECTION = 'ads';
const AD_SETTINGS_COLLECTION = 'adSettings';
const SYSTEM_METADATA_COLLECTION = 'systemMetadata';

// Initialize and seed collections ONLY ONCE on project creation
// NEVER re-seed if the admin intentionally deleted mock/junk data!
export async function initializeFirestoreDatabase(): Promise<void> {
  try {
    const initDocRef = doc(db, SYSTEM_METADATA_COLLECTION, 'init_status');
    const initSnap = await getDocs(collection(db, SYSTEM_METADATA_COLLECTION));
    
    const alreadyInitialized = !initSnap.empty;

    if (!alreadyInitialized) {
      console.log('Firebase: First-time database initialization...');
      
      // 1. Seed initial admin user if no users exist
      const usersSnap = await getDocs(collection(db, USERS_COLLECTION));
      if (usersSnap.empty) {
        const batch = writeBatch(db);
        for (const u of initialUsers) {
          batch.set(doc(db, USERS_COLLECTION, u.id), sanitizeForFirestore(u));
        }
        await batch.commit();
      }

      // 2. Seed initial system settings
      const settingsSnap = await getDocs(collection(db, SETTINGS_COLLECTION));
      if (settingsSnap.empty) {
        await setDoc(doc(db, SETTINGS_COLLECTION, 'global'), sanitizeForFirestore(initialSystemSettings));
      }

      // 3. Seed initial drives
      const drivesSnap = await getDocs(collection(db, DRIVES_COLLECTION));
      if (drivesSnap.empty) {
        const batch = writeBatch(db);
        for (const d of initialDriveAccounts) {
          batch.set(doc(db, DRIVES_COLLECTION, d.id), sanitizeForFirestore(d));
        }
        await batch.commit();
      }

      // 4. Seed initial ads & adSettings
      const adsSnap = await getDocs(collection(db, ADS_COLLECTION));
      if (adsSnap.empty) {
        const batch = writeBatch(db);
        for (const ad of initialAds) {
          batch.set(doc(db, ADS_COLLECTION, ad.id), sanitizeForFirestore(ad));
        }
        await batch.commit();
      }
      const adSettingsSnap = await getDocs(collection(db, AD_SETTINGS_COLLECTION));
      if (adSettingsSnap.empty) {
        await setDoc(doc(db, AD_SETTINGS_COLLECTION, 'global'), sanitizeForFirestore(initialAdSettings));
      }

      // 5. Mark database as permanently initialized so deletions are never undone by other devices
      await setDoc(initDocRef, {
        isInitialized: true,
        initializedAt: new Date().toISOString(),
        version: '2.0.0'
      });
      console.log('Firebase: Initial setup completed.');
    }
  } catch (error) {
    console.warn('Firebase init warning (proceeding with realtime sync):', error);
  }
}

// Direct fetch user for 100% reliable login across different browsers / devices
export async function fetchUserFromFirestore(username: string): Promise<User | null> {
  try {
    const cleanName = username.trim().toLowerCase();
    const usersSnap = await getDocs(collection(db, USERS_COLLECTION));
    const matchedUsers: User[] = [];
    usersSnap.forEach(docSnap => {
      const u = docSnap.data() as User;
      const uName = (u.username || '').trim().toLowerCase();
      if (uName === cleanName) {
        matchedUsers.push({ ...u, id: docSnap.id });
      }
    });

    if (matchedUsers.length > 0) {
      if (cleanName === 'admin') {
        const adminDoc = matchedUsers.find(u => u.id === 'user-admin') || matchedUsers.find(u => u.role === 'admin') || matchedUsers[0];
        return adminDoc;
      }
      return matchedUsers[0];
    }
    return null;
  } catch (err) {
    console.warn('Direct Firestore user fetch error:', err);
    return null;
  }
}

// Direct fetch all comics from Firestore
export async function fetchComicsFromFirestore(): Promise<Comic[]> {
  try {
    const snap = await getDocs(collection(db, COMICS_COLLECTION));
    const list: Comic[] = [];
    snap.forEach(docSnap => list.push(docSnap.data() as Comic));
    return list;
  } catch (err) {
    console.warn('Direct Firestore comics fetch error:', err);
    return [];
  }
}

// Subscribe to Firestore updates (Realtime Single Source of Truth)
export function subscribeToFirestore(callbacks: {
  onComics: (comics: Comic[]) => void;
  onChapters: (chapters: Record<string, Chapter[]>) => void;
  onUsers: (users: User[]) => void;
  onDrives: (drives: DriveAccount[]) => void;
  onBanners: (banners: Banner[]) => void;
  onLogs: (logs: ActivityLog[]) => void;
  onSettings: (settings: SystemSettings) => void;
  onComments?: (comments: Comment[]) => void;
  onAds?: (ads: AdItem[]) => void;
  onAdSettings?: (settings: AdSettings) => void;
}): () => void {
  const unsubscribers: Unsubscribe[] = [];

  try {
    // 1. Comics listener (Always emit current state, even empty array [] when comics are deleted)
    const unsubComics = onSnapshot(collection(db, COMICS_COLLECTION), (snap) => {
      const list: Comic[] = [];
      snap.forEach(docSnap => list.push(docSnap.data() as Comic));
      callbacks.onComics(list);
    }, (err) => console.warn('Firestore comics sync error:', err));
    unsubscribers.push(unsubComics);

    // 2. Chapters listener (Always emit current state grouped by comicId)
    const unsubChapters = onSnapshot(collection(db, CHAPTERS_COLLECTION), (snap) => {
      const grouped: Record<string, Chapter[]> = {};
      snap.forEach(docSnap => {
        const ch = docSnap.data() as Chapter;
        if (ch && ch.comicId) {
          if (!grouped[ch.comicId]) {
            grouped[ch.comicId] = [];
          }
          grouped[ch.comicId].push(ch);
        }
      });
      // Sort each comic's chapters by chapterNumber descending
      Object.keys(grouped).forEach(cId => {
        grouped[cId].sort((a, b) => b.chapterNumber - a.chapterNumber);
      });
      callbacks.onChapters(grouped);
    }, (err) => console.warn('Firestore chapters sync error:', err));
    unsubscribers.push(unsubChapters);

    // 3. Users listener (Always emit latest users including password updates)
    const unsubUsers = onSnapshot(collection(db, USERS_COLLECTION), (snap) => {
      const list: User[] = [];
      snap.forEach(docSnap => {
        const data = docSnap.data() as User;
        list.push({ ...data, id: docSnap.id });
      });
      callbacks.onUsers(list);
    }, (err) => console.warn('Firestore users sync error:', err));
    unsubscribers.push(unsubUsers);

    // 4. Drives listener
    const unsubDrives = onSnapshot(collection(db, DRIVES_COLLECTION), (snap) => {
      const list: DriveAccount[] = [];
      snap.forEach(docSnap => list.push(docSnap.data() as DriveAccount));
      callbacks.onDrives(list);
    }, (err) => console.warn('Firestore drives sync error:', err));
    unsubscribers.push(unsubDrives);

    // 5. Banners listener
    const unsubBanners = onSnapshot(collection(db, BANNERS_COLLECTION), (snap) => {
      const list: Banner[] = [];
      snap.forEach(docSnap => list.push(docSnap.data() as Banner));
      callbacks.onBanners(list);
    }, (err) => console.warn('Firestore banners sync error:', err));
    unsubscribers.push(unsubBanners);

    // 6. Activity logs listener
    const unsubLogs = onSnapshot(collection(db, LOGS_COLLECTION), (snap) => {
      const list: ActivityLog[] = [];
      snap.forEach(docSnap => list.push(docSnap.data() as ActivityLog));
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      callbacks.onLogs(list);
    }, (err) => console.warn('Firestore logs sync error:', err));
    unsubscribers.push(unsubLogs);

    // 7. System settings listener
    const unsubSettings = onSnapshot(doc(db, SETTINGS_COLLECTION, 'global'), (docSnap) => {
      if (docSnap.exists()) {
        callbacks.onSettings(docSnap.data() as SystemSettings);
      }
    }, (err) => console.warn('Firestore settings sync error:', err));
    unsubscribers.push(unsubSettings);

    // 8. Comments listener
    if (callbacks.onComments) {
      const unsubComments = onSnapshot(collection(db, COMMENTS_COLLECTION), (snap) => {
        const list: Comment[] = [];
        snap.forEach(docSnap => list.push(docSnap.data() as Comment));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callbacks.onComments!(list);
      }, (err) => console.warn('Firestore comments sync error:', err));
      unsubscribers.push(unsubComments);
    }

    // 9. Ads listener
    if (callbacks.onAds) {
      const unsubAds = onSnapshot(collection(db, ADS_COLLECTION), (snap) => {
        const list: AdItem[] = [];
        snap.forEach(docSnap => list.push(docSnap.data() as AdItem));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callbacks.onAds!(list);
      }, (err) => console.warn('Firestore ads sync error:', err));
      unsubscribers.push(unsubAds);
    }

    // 10. Ad Settings listener
    if (callbacks.onAdSettings) {
      const unsubAdSettings = onSnapshot(doc(db, AD_SETTINGS_COLLECTION, 'global'), (docSnap) => {
        if (docSnap.exists()) {
          callbacks.onAdSettings!(docSnap.data() as AdSettings);
        }
      }, (err) => console.warn('Firestore ad settings sync error:', err));
      unsubscribers.push(unsubAdSettings);
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

    // Cascade delete all chapters belonging to this comic in Firestore
    try {
      const chSnap = await getDocs(collection(db, CHAPTERS_COLLECTION));
      const batch = writeBatch(db);
      let count = 0;
      chSnap.forEach(docSnap => {
        const ch = docSnap.data() as Chapter;
        if (ch && ch.comicId === comicId) {
          batch.delete(docSnap.ref);
          count++;
        }
      });
      if (count > 0) {
        await batch.commit();
      }
    } catch (chErr) {
      console.warn('Error deleting cascade chapters from Firestore:', chErr);
    }

    // Cascade delete comments for this comic
    try {
      const comSnap = await getDocs(collection(db, COMMENTS_COLLECTION));
      const batch = writeBatch(db);
      let count = 0;
      comSnap.forEach(docSnap => {
        const com = docSnap.data() as Comment;
        if (com && com.comicId === comicId) {
          batch.delete(docSnap.ref);
          count++;
        }
      });
      if (count > 0) {
        await batch.commit();
      }
    } catch (comErr) {
      console.warn('Error deleting cascade comments from Firestore:', comErr);
    }

    // Cascade delete banners targeting this comic
    try {
      const banSnap = await getDocs(collection(db, BANNERS_COLLECTION));
      const batch = writeBatch(db);
      let count = 0;
      banSnap.forEach(docSnap => {
        const ban = docSnap.data() as Banner;
        if (ban && ban.targetComicId === comicId) {
          batch.delete(docSnap.ref);
          count++;
        }
      });
      if (count > 0) {
        await batch.commit();
      }
    } catch (banErr) {
      console.warn('Error deleting cascade banners from Firestore:', banErr);
    }

  } catch (e) {
    console.error('Failed to delete comic from Firestore:', e);
  }
}

export async function batchDeleteComicsFromFirestore(comicIds: string[]): Promise<void> {
  if (!comicIds || comicIds.length === 0) return;
  const idSet = new Set(comicIds);

  try {
    const batch = writeBatch(db);
    comicIds.forEach(id => {
      batch.delete(doc(db, COMICS_COLLECTION, id));
    });
    await batch.commit();

    // Cascade delete chapters
    const chSnap = await getDocs(collection(db, CHAPTERS_COLLECTION));
    const chBatch = writeBatch(db);
    let chCount = 0;
    chSnap.forEach(docSnap => {
      const ch = docSnap.data() as Chapter;
      if (ch && idSet.has(ch.comicId)) {
        chBatch.delete(docSnap.ref);
        chCount++;
      }
    });
    if (chCount > 0) {
      await chBatch.commit();
    }

    // Cascade delete comments
    const comSnap = await getDocs(collection(db, COMMENTS_COLLECTION));
    const comBatch = writeBatch(db);
    let comCount = 0;
    comSnap.forEach(docSnap => {
      const com = docSnap.data() as Comment;
      if (com && idSet.has(com.comicId)) {
        comBatch.delete(docSnap.ref);
        comCount++;
      }
    });
    if (comCount > 0) {
      await comBatch.commit();
    }

    // Cascade delete banners
    const banSnap = await getDocs(collection(db, BANNERS_COLLECTION));
    const banBatch = writeBatch(db);
    let banCount = 0;
    banSnap.forEach(docSnap => {
      const ban = docSnap.data() as Banner;
      if (ban && idSet.has(ban.targetComicId)) {
        banBatch.delete(docSnap.ref);
        banCount++;
      }
    });
    if (banCount > 0) {
      await banBatch.commit();
    }

  } catch (e) {
    console.error('Failed to batch delete comics from Firestore:', e);
  }
}

export async function batchDeleteChaptersFromFirestore(chapterIds: string[]): Promise<void> {
  if (!chapterIds || chapterIds.length === 0) return;
  try {
    const batch = writeBatch(db);
    chapterIds.forEach(id => {
      batch.delete(doc(db, CHAPTERS_COLLECTION, id));
    });
    await batch.commit();
  } catch (e) {
    console.error('Failed to batch delete chapters from Firestore:', e);
  }
}

// Sanity Cleaner: Cleans up any orphan chapters whose comic is no longer in Firestore
export async function cleanOrphanDataFromFirestore(): Promise<{ deletedChapters: number; deletedComments: number; deletedBanners: number }> {
  let deletedChapters = 0;
  let deletedComments = 0;
  let deletedBanners = 0;

  try {
    const comicsSnap = await getDocs(collection(db, COMICS_COLLECTION));
    const validComicIds = new Set<string>();
    comicsSnap.forEach(d => validComicIds.add(d.id));

    // 1. Orphan Chapters
    const chSnap = await getDocs(collection(db, CHAPTERS_COLLECTION));
    const chBatch = writeBatch(db);
    chSnap.forEach(docSnap => {
      const ch = docSnap.data() as Chapter;
      if (!ch || !ch.comicId || !validComicIds.has(ch.comicId)) {
        chBatch.delete(docSnap.ref);
        deletedChapters++;
      }
    });
    if (deletedChapters > 0) {
      await chBatch.commit();
    }

    // 2. Orphan Comments
    const comSnap = await getDocs(collection(db, COMMENTS_COLLECTION));
    const comBatch = writeBatch(db);
    comSnap.forEach(docSnap => {
      const com = docSnap.data() as Comment;
      if (!com || !com.comicId || !validComicIds.has(com.comicId)) {
        comBatch.delete(docSnap.ref);
        deletedComments++;
      }
    });
    if (deletedComments > 0) {
      await comBatch.commit();
    }

    // 3. Orphan Banners
    const banSnap = await getDocs(collection(db, BANNERS_COLLECTION));
    const banBatch = writeBatch(db);
    banSnap.forEach(docSnap => {
      const ban = docSnap.data() as Banner;
      if (ban && ban.targetComicId && !validComicIds.has(ban.targetComicId)) {
        banBatch.delete(docSnap.ref);
        deletedBanners++;
      }
    });
    if (deletedBanners > 0) {
      await banBatch.commit();
    }

  } catch (e) {
    console.error('Error cleaning orphan data from Firestore:', e);
  }

  return { deletedChapters, deletedComments, deletedBanners };
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

export async function saveAdToFirestore(ad: AdItem): Promise<void> {
  try {
    const cleaned = sanitizeForFirestore(ad);
    await setDoc(doc(db, ADS_COLLECTION, ad.id), cleaned);
  } catch (e) {
    console.error('Failed to save ad to Firestore:', e);
  }
}

export async function deleteAdFromFirestore(adId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, ADS_COLLECTION, adId));
  } catch (e) {
    console.error('Failed to delete ad from Firestore:', e);
  }
}

export async function saveAdSettingsToFirestore(settings: AdSettings): Promise<void> {
  try {
    const cleaned = sanitizeForFirestore(settings);
    await setDoc(doc(db, AD_SETTINGS_COLLECTION, 'global'), cleaned);
  } catch (e) {
    console.error('Failed to save ad settings to Firestore:', e);
  }
}

