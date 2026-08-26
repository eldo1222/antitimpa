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

// Circuit breaker for Firestore free quota limits
const QUOTA_STORAGE_KEY = 'antitimpa_firestore_quota_exhausted_until';
let memoryQuotaExhausted = false;

export function isFirestoreQuotaExhausted(): boolean {
  if (memoryQuotaExhausted) return true;
  try {
    const stored = sessionStorage.getItem(QUOTA_STORAGE_KEY);
    if (stored) {
      const expiry = parseInt(stored, 10);
      if (Date.now() < expiry) {
        memoryQuotaExhausted = true;
        return true;
      }
    }
  } catch (_) {}
  return false;
}

export function markFirestoreQuotaExhausted(): void {
  memoryQuotaExhausted = true;
  try {
    // Suppress further writes for 30 minutes to allow local/central DB operation
    const expiry = Date.now() + 30 * 60 * 1000;
    sessionStorage.setItem(QUOTA_STORAGE_KEY, expiry.toString());
  } catch (_) {}
}

async function safeFirestoreCall<T>(op: () => Promise<T>, opName = 'operation'): Promise<T | null> {
  if (isFirestoreQuotaExhausted()) {
    return null;
  }
  try {
    return await op();
  } catch (error: any) {
    const errStr = String(error?.message || error?.code || error || '');
    if (
      error?.code === 'resource-exhausted' ||
      errStr.includes('resource-exhausted') ||
      errStr.includes('Quota limit exceeded') ||
      errStr.includes('quota')
    ) {
      markFirestoreQuotaExhausted();
      console.info(`[Firestore] Daily write quota reached. Seamlessly switched to Central Server DB.`);
      return null;
    }
    console.warn(`[Firestore] ${opName} warning:`, error);
    return null;
  }
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
  if (isFirestoreQuotaExhausted()) return;

  await safeFirestoreCall(async () => {
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
  }, 'initializeFirestoreDatabase');
}

// Direct fetch user for 100% reliable login across different browsers / devices
export async function fetchUserFromFirestore(username: string): Promise<User | null> {
  return await safeFirestoreCall(async () => {
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
  }, 'fetchUserFromFirestore') || null;
}

// Direct fetch all comics from Firestore
export async function fetchComicsFromFirestore(): Promise<Comic[]> {
  return await safeFirestoreCall(async () => {
    const snap = await getDocs(collection(db, COMICS_COLLECTION));
    const list: Comic[] = [];
    snap.forEach(docSnap => list.push(docSnap.data() as Comic));
    return list;
  }, 'fetchComicsFromFirestore') || [];
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

  const handleSyncError = (collectionName: string) => (err: any) => {
    const errStr = String(err?.message || err?.code || err || '');
    if (err?.code === 'resource-exhausted' || errStr.includes('resource-exhausted') || errStr.includes('quota')) {
      markFirestoreQuotaExhausted();
    } else {
      console.warn(`Firestore ${collectionName} sync error:`, err);
    }
  };

  try {
    // 1. Comics listener (Always emit current state, even empty array [] when comics are deleted)
    const unsubComics = onSnapshot(collection(db, COMICS_COLLECTION), (snap) => {
      const list: Comic[] = [];
      snap.forEach(docSnap => list.push(docSnap.data() as Comic));
      callbacks.onComics(list);
    }, handleSyncError('comics'));
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
    }, handleSyncError('chapters'));
    unsubscribers.push(unsubChapters);

    // 3. Users listener (Always emit latest users including password updates)
    const unsubUsers = onSnapshot(collection(db, USERS_COLLECTION), (snap) => {
      const list: User[] = [];
      snap.forEach(docSnap => {
        const data = docSnap.data() as User;
        list.push({ ...data, id: docSnap.id });
      });
      callbacks.onUsers(list);
    }, handleSyncError('users'));
    unsubscribers.push(unsubUsers);

    // 4. Drives listener
    const unsubDrives = onSnapshot(collection(db, DRIVES_COLLECTION), (snap) => {
      const list: DriveAccount[] = [];
      snap.forEach(docSnap => list.push(docSnap.data() as DriveAccount));
      callbacks.onDrives(list);
    }, handleSyncError('drives'));
    unsubscribers.push(unsubDrives);

    // 5. Banners listener
    const unsubBanners = onSnapshot(collection(db, BANNERS_COLLECTION), (snap) => {
      const list: Banner[] = [];
      snap.forEach(docSnap => list.push(docSnap.data() as Banner));
      callbacks.onBanners(list);
    }, handleSyncError('banners'));
    unsubscribers.push(unsubBanners);

    // 6. Activity logs listener
    const unsubLogs = onSnapshot(collection(db, LOGS_COLLECTION), (snap) => {
      const list: ActivityLog[] = [];
      snap.forEach(docSnap => list.push(docSnap.data() as ActivityLog));
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      callbacks.onLogs(list);
    }, handleSyncError('logs'));
    unsubscribers.push(unsubLogs);

    // 7. System settings listener
    const unsubSettings = onSnapshot(doc(db, SETTINGS_COLLECTION, 'global'), (docSnap) => {
      if (docSnap.exists()) {
        callbacks.onSettings(docSnap.data() as SystemSettings);
      }
    }, handleSyncError('settings'));
    unsubscribers.push(unsubSettings);

    // 8. Comments listener
    if (callbacks.onComments) {
      const unsubComments = onSnapshot(collection(db, COMMENTS_COLLECTION), (snap) => {
        const list: Comment[] = [];
        snap.forEach(docSnap => list.push(docSnap.data() as Comment));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callbacks.onComments!(list);
      }, handleSyncError('comments'));
      unsubscribers.push(unsubComments);
    }

    // 9. Ads listener
    if (callbacks.onAds) {
      const unsubAds = onSnapshot(collection(db, ADS_COLLECTION), (snap) => {
        const list: AdItem[] = [];
        snap.forEach(docSnap => list.push(docSnap.data() as AdItem));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callbacks.onAds!(list);
      }, handleSyncError('ads'));
      unsubscribers.push(unsubAds);
    }

    // 10. Ad Settings listener
    if (callbacks.onAdSettings) {
      const unsubAdSettings = onSnapshot(doc(db, AD_SETTINGS_COLLECTION, 'global'), (docSnap) => {
        if (docSnap.exists()) {
          callbacks.onAdSettings!(docSnap.data() as AdSettings);
        }
      }, handleSyncError('adSettings'));
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
  await safeFirestoreCall(async () => {
    const cleaned = sanitizeForFirestore(comic);
    await setDoc(doc(db, COMICS_COLLECTION, comic.id), cleaned);
  }, 'saveComicToFirestore');
}

export async function deleteComicFromFirestore(comicId: string): Promise<void> {
  await safeFirestoreCall(async () => {
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
      // ignore
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
      // ignore
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
      // ignore
    }
  }, 'deleteComicFromFirestore');
}

export async function batchDeleteComicsFromFirestore(comicIds: string[]): Promise<void> {
  if (!comicIds || comicIds.length === 0) return;
  const idSet = new Set(comicIds);

  await safeFirestoreCall(async () => {
    const batch = writeBatch(db);
    comicIds.forEach(id => {
      batch.delete(doc(db, COMICS_COLLECTION, id));
    });
    await batch.commit();

    // Cascade delete chapters
    try {
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
    } catch (_) {}

    // Cascade delete comments
    try {
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
    } catch (_) {}

    // Cascade delete banners
    try {
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
    } catch (_) {}
  }, 'batchDeleteComicsFromFirestore');
}

export async function batchSaveComicsToFirestore(comicsList: Comic[]): Promise<void> {
  if (!comicsList || comicsList.length === 0) return;
  await safeFirestoreCall(async () => {
    const CHUNK_SIZE = 400;
    for (let i = 0; i < comicsList.length; i += CHUNK_SIZE) {
      const chunk = comicsList.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(comic => {
        const cleaned = sanitizeForFirestore(comic);
        batch.set(doc(db, COMICS_COLLECTION, comic.id), cleaned);
      });
      await batch.commit();
    }
  }, 'batchSaveComicsToFirestore');
}

export async function batchSaveChaptersToFirestore(chaptersList: Chapter[]): Promise<void> {
  if (!chaptersList || chaptersList.length === 0) return;
  await safeFirestoreCall(async () => {
    const CHUNK_SIZE = 400;
    for (let i = 0; i < chaptersList.length; i += CHUNK_SIZE) {
      const chunk = chaptersList.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(ch => {
        const cleaned = sanitizeForFirestore(ch);
        batch.set(doc(db, CHAPTERS_COLLECTION, ch.id), cleaned);
      });
      await batch.commit();
    }
  }, 'batchSaveChaptersToFirestore');
}

export async function batchDeleteChaptersFromFirestore(chapterIds: string[]): Promise<void> {
  if (!chapterIds || chapterIds.length === 0) return;
  await safeFirestoreCall(async () => {
    const batch = writeBatch(db);
    chapterIds.forEach(id => {
      batch.delete(doc(db, CHAPTERS_COLLECTION, id));
    });
    await batch.commit();
  }, 'batchDeleteChaptersFromFirestore');
}

// Sanity Cleaner: Cleans up any orphan chapters whose comic is no longer in Firestore
export async function cleanOrphanDataFromFirestore(): Promise<{ deletedChapters: number; deletedComments: number; deletedBanners: number }> {
  let deletedChapters = 0;
  let deletedComments = 0;
  let deletedBanners = 0;

  await safeFirestoreCall(async () => {
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
  }, 'cleanOrphanDataFromFirestore');

  return { deletedChapters, deletedComments, deletedBanners };
}

export async function saveChapterToFirestore(chapter: Chapter): Promise<void> {
  await safeFirestoreCall(async () => {
    const cleaned = sanitizeForFirestore(chapter);
    await setDoc(doc(db, CHAPTERS_COLLECTION, chapter.id), cleaned);
  }, 'saveChapterToFirestore');
}

export async function deleteChapterFromFirestore(chapterId: string): Promise<void> {
  await safeFirestoreCall(async () => {
    await deleteDoc(doc(db, CHAPTERS_COLLECTION, chapterId));
  }, 'deleteChapterFromFirestore');
}

export async function saveUserToFirestore(user: User): Promise<void> {
  await safeFirestoreCall(async () => {
    const cleaned = sanitizeForFirestore(user);
    await setDoc(doc(db, USERS_COLLECTION, user.id), cleaned);
  }, 'saveUserToFirestore');
}

export async function deleteUserFromFirestore(userId: string): Promise<void> {
  await safeFirestoreCall(async () => {
    await deleteDoc(doc(db, USERS_COLLECTION, userId));
  }, 'deleteUserFromFirestore');
}

export async function saveDriveAccountToFirestore(account: DriveAccount): Promise<void> {
  await safeFirestoreCall(async () => {
    const cleaned = sanitizeForFirestore(account);
    await setDoc(doc(db, DRIVES_COLLECTION, account.id), cleaned);
  }, 'saveDriveAccountToFirestore');
}

export async function deleteDriveAccountFromFirestore(accountId: string): Promise<void> {
  await safeFirestoreCall(async () => {
    await deleteDoc(doc(db, DRIVES_COLLECTION, accountId));
  }, 'deleteDriveAccountFromFirestore');
}

export async function saveBannerToFirestore(banner: Banner): Promise<void> {
  await safeFirestoreCall(async () => {
    const cleaned = sanitizeForFirestore(banner);
    await setDoc(doc(db, BANNERS_COLLECTION, banner.id), cleaned);
  }, 'saveBannerToFirestore');
}

export async function deleteBannerFromFirestore(bannerId: string): Promise<void> {
  await safeFirestoreCall(async () => {
    await deleteDoc(doc(db, BANNERS_COLLECTION, bannerId));
  }, 'deleteBannerFromFirestore');
}

export async function saveActivityLogToFirestore(log: ActivityLog): Promise<void> {
  await safeFirestoreCall(async () => {
    const cleaned = sanitizeForFirestore(log);
    await setDoc(doc(db, LOGS_COLLECTION, log.id), cleaned);
  }, 'saveActivityLogToFirestore');
}

export async function saveSettingsToFirestore(settings: SystemSettings): Promise<void> {
  await safeFirestoreCall(async () => {
    const cleaned = sanitizeForFirestore(settings);
    await setDoc(doc(db, SETTINGS_COLLECTION, 'global'), cleaned);
  }, 'saveSettingsToFirestore');
}

export async function saveCommentToFirestore(comment: Comment): Promise<void> {
  await safeFirestoreCall(async () => {
    const cleaned = sanitizeForFirestore(comment);
    await setDoc(doc(db, COMMENTS_COLLECTION, comment.id), cleaned);
  }, 'saveCommentToFirestore');
}

export async function deleteCommentFromFirestore(commentId: string): Promise<void> {
  await safeFirestoreCall(async () => {
    await deleteDoc(doc(db, COMMENTS_COLLECTION, commentId));
  }, 'deleteCommentFromFirestore');
}

export async function saveAdToFirestore(ad: AdItem): Promise<void> {
  await safeFirestoreCall(async () => {
    const cleaned = sanitizeForFirestore(ad);
    await setDoc(doc(db, ADS_COLLECTION, ad.id), cleaned);
  }, 'saveAdToFirestore');
}

export async function deleteAdFromFirestore(adId: string): Promise<void> {
  await safeFirestoreCall(async () => {
    await deleteDoc(doc(db, ADS_COLLECTION, adId));
  }, 'deleteAdFromFirestore');
}

export async function saveAdSettingsToFirestore(settings: AdSettings): Promise<void> {
  await safeFirestoreCall(async () => {
    const cleaned = sanitizeForFirestore(settings);
    await setDoc(doc(db, AD_SETTINGS_COLLECTION, 'global'), cleaned);
  }, 'saveAdSettingsToFirestore');
}

