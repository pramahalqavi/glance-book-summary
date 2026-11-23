import { signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { DEFAULT_PREFERENCES } from './storage';
import type { BookProgress, ReaderPreferences } from '../types/book';

export interface UserSyncData {
  preferences: ReaderPreferences;
  bookmarks: string[];
  progress: Record<string, BookProgress>;
}

const LAST_SYNCED_UID_KEY = 'glance:last-synced-uid:v1';
const MAX_SYNC_ENTRIES = 500;

export function getLastSyncedUid(): string | null {
  try {
    return localStorage.getItem(LAST_SYNCED_UID_KEY);
  } catch {
    return null;
  }
}

export function setLastSyncedUid(uid: string | null): void {
  try {
    if (uid) {
      localStorage.setItem(LAST_SYNCED_UID_KEY, uid);
    } else {
      localStorage.removeItem(LAST_SYNCED_UID_KEY);
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function sanitizePreferences(
  raw: unknown,
  fallback: ReaderPreferences = DEFAULT_PREFERENCES
): ReaderPreferences {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...fallback };
  }
  const obj = raw as Partial<ReaderPreferences>;
  return {
    readingMode:
      obj.readingMode === 'scroll' || obj.readingMode === 'swipe'
        ? obj.readingMode
        : fallback.readingMode,
    theme:
      obj.theme === 'light' || obj.theme === 'sepia' || obj.theme === 'dark'
        ? obj.theme
        : fallback.theme,
    fontSize:
      obj.fontSize === 'sm' ||
      obj.fontSize === 'md' ||
      obj.fontSize === 'lg' ||
      obj.fontSize === 'xl'
        ? obj.fontSize
        : fallback.fontSize,
    fontFamily:
      obj.fontFamily === 'newsreader' ||
      obj.fontFamily === 'literata' ||
      obj.fontFamily === 'lora' ||
      obj.fontFamily === 'merriweather' ||
      obj.fontFamily === 'inter' ||
      obj.fontFamily === 'jakarta'
        ? obj.fontFamily
        : fallback.fontFamily,
  };
}

export function sanitizeBookmarks(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const clean: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (trimmed.length < 1 || trimmed.length > 128 || seen.has(trimmed)) continue;
    seen.add(trimmed);
    clean.push(trimmed);
    if (clean.length >= MAX_SYNC_ENTRIES) break;
  }
  return clean;
}

export function sanitizeProgressMap(raw: unknown): Record<string, BookProgress> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const entries: Array<[string, BookProgress]> = [];
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!key || key.length > 128 || !val || typeof val !== 'object' || Array.isArray(val)) {
      continue;
    }
    const p = val as Partial<BookProgress>;
    entries.push([
      key,
      {
        bookId: typeof p.bookId === 'string' && p.bookId.length > 0 ? p.bookId : key,
        chapterIndex:
          typeof p.chapterIndex === 'number' && Number.isFinite(p.chapterIndex) && p.chapterIndex >= 0
            ? Math.floor(p.chapterIndex)
            : 0,
        pageIndex:
          typeof p.pageIndex === 'number' && Number.isFinite(p.pageIndex) && p.pageIndex >= 0
            ? Math.floor(p.pageIndex)
            : 0,
        scrollRatio:
          typeof p.scrollRatio === 'number' && Number.isFinite(p.scrollRatio)
            ? Math.max(0, Math.min(1, p.scrollRatio))
            : 0,
        completed: Boolean(p.completed),
        lastReadAt:
          typeof p.lastReadAt === 'number' && Number.isFinite(p.lastReadAt) && p.lastReadAt > 0
            ? Math.floor(p.lastReadAt)
            : Date.now(),
      },
    ]);
  }

  // Keep the most recently read entries within Firestore rules cap
  entries.sort((a, b) => b[1].lastReadAt - a[1].lastReadAt);
  const bounded = entries.slice(0, MAX_SYNC_ENTRIES);
  return Object.fromEntries(bounded);
}

/**
 * Merges guest local data with existing cloud data on first sign-in so nothing is lost:
 * - Bookmarks: deduplicated union (local additions + cloud bookmarks)
 * - Progress: per book, keeps the entry with the newer `lastReadAt` timestamp
 * - Preferences: prefers cloud preferences when a cloud profile exists
 */
export function mergeUserData(
  local: UserSyncData,
  cloud: UserSyncData | null
): UserSyncData {
  if (!cloud) {
    return {
      preferences: sanitizePreferences(local.preferences),
      bookmarks: sanitizeBookmarks(local.bookmarks),
      progress: sanitizeProgressMap(local.progress),
    };
  }

  const bookmarks = sanitizeBookmarks([...local.bookmarks, ...cloud.bookmarks]);

  const mergedProgress: Record<string, BookProgress> = { ...cloud.progress };
  for (const [bookId, localEntry] of Object.entries(local.progress)) {
    const cloudEntry = mergedProgress[bookId];
    if (!cloudEntry) {
      mergedProgress[bookId] = localEntry;
    } else if (localEntry.lastReadAt > cloudEntry.lastReadAt) {
      mergedProgress[bookId] = localEntry;
    } else if (localEntry.lastReadAt === cloudEntry.lastReadAt) {
      mergedProgress[bookId] = {
        ...cloudEntry,
        completed: cloudEntry.completed || localEntry.completed,
        chapterIndex: Math.max(cloudEntry.chapterIndex, localEntry.chapterIndex),
      };
    }
  }

  return {
    preferences: sanitizePreferences(cloud.preferences, local.preferences),
    bookmarks,
    progress: sanitizeProgressMap(mergedProgress),
  };
}

export function areUserDataEqual(a: UserSyncData, b: UserSyncData): boolean {
  if (
    a.preferences.readingMode !== b.preferences.readingMode ||
    a.preferences.theme !== b.preferences.theme ||
    a.preferences.fontSize !== b.preferences.fontSize ||
    a.preferences.fontFamily !== b.preferences.fontFamily
  ) {
    return false;
  }

  if (a.bookmarks.length !== b.bookmarks.length) return false;
  for (let i = 0; i < a.bookmarks.length; i++) {
    if (a.bookmarks[i] !== b.bookmarks[i]) return false;
  }

  const aKeys = Object.keys(a.progress);
  const bKeys = Object.keys(b.progress);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    const ap = a.progress[key];
    const bp = b.progress[key];
    if (
      !bp ||
      ap.chapterIndex !== bp.chapterIndex ||
      ap.pageIndex !== bp.pageIndex ||
      ap.completed !== bp.completed ||
      ap.lastReadAt !== bp.lastReadAt ||
      Math.abs(ap.scrollRatio - bp.scrollRatio) > 0.001
    ) {
      return false;
    }
  }
  return true;
}

export async function loadCloudUserData(uid: string): Promise<UserSyncData | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    preferences: sanitizePreferences(data.preferences),
    bookmarks: sanitizeBookmarks(data.bookmarks),
    progress: sanitizeProgressMap(data.progress),
  };
}

export async function saveCloudUserData(uid: string, data: UserSyncData): Promise<void> {
  if (!db) return;
  const payload = {
    preferences: sanitizePreferences(data.preferences),
    bookmarks: sanitizeBookmarks(data.bookmarks),
    progress: sanitizeProgressMap(data.progress),
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, 'users', uid), payload);
}

export function subscribeToCloudUserData(
  uid: string,
  onRemoteData: (data: UserSyncData) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db) return () => {};
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      // Skip local optimistic echoes so we never overwrite in-flight UI state
      if (snap.metadata.hasPendingWrites || !snap.exists()) return;
      const data = snap.data();
      onRemoteData({
        preferences: sanitizePreferences(data.preferences),
        bookmarks: sanitizeBookmarks(data.bookmarks),
        progress: sanitizeProgressMap(data.progress),
      });
    },
    (err) => {
      onError?.(err);
    }
  );
}

export async function signInWithGooglePopup(): Promise<User> {
  if (!auth || !googleProvider) {
    throw new Error('Firebase Authentication is not configured.');
  }
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutGoogle(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

/**
 * Translates Firebase Auth error codes into user-friendly strings.
 * Returns `null` when the user intentionally closed the popup.
 */
export function formatAuthError(err: unknown): string | null {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code)
      : '';

  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return null;
  }
  if (code === 'auth/popup-blocked') {
    return 'Sign-in pop-up was blocked by your browser. Please allow pop-ups and try again.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'This domain is not yet authorized for Google Sign-In in Firebase Console.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network error while connecting to Google Sign-In. Check your connection and try again.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Google Sign-In is not enabled on this Firebase project yet.';
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return 'Could not complete Google Sign-In. Please try again.';
}
