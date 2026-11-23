import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db, isFirebaseConfigured } from '../lib/firebase';
import { fetchCatalog, getDataSource, type DataSource } from '../lib/repository';
import {
  loadBookmarks,
  loadPreferences,
  loadProgressMap,
  saveBookmarks,
  savePreferences,
  saveProgressMap,
} from '../lib/storage';
import {
  areUserDataEqual,
  formatAuthError,
  getLastSyncedUid,
  loadCloudUserData,
  mergeUserData,
  saveCloudUserData,
  setLastSyncedUid,
  signInWithGooglePopup,
  signOutGoogle,
  subscribeToCloudUserData,
  type UserSyncData,
} from '../lib/userSync';
import type { BookCatalogItem, BookProgress, ReaderPreferences } from '../types/book';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

interface AppContextValue {
  books: BookCatalogItem[];
  loading: boolean;
  dataSource: DataSource;
  preferences: ReaderPreferences;
  updatePreferences: (patch: Partial<ReaderPreferences>) => void;
  bookmarks: string[];
  isBookmarked: (bookId: string) => boolean;
  toggleBookmark: (bookId: string) => void;
  progressMap: Record<string, BookProgress>;
  getProgress: (bookId: string) => BookProgress | undefined;
  updateProgress: (
    bookId: string,
    patch: Partial<Omit<BookProgress, 'bookId' | 'lastReadAt'>>
  ) => void;
  removeProgress: (bookId: string) => void;
  continueReadingBooks: Array<{ book: BookCatalogItem; progress: BookProgress }>;
  // Optional Google OAuth & Cloud Library Sync
  isAuthAvailable: boolean;
  user: User | null;
  authLoading: boolean;
  authBusy: boolean;
  authError: string | null;
  clearAuthError: () => void;
  syncStatus: SyncStatus;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [books, setBooks] = useState<BookCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<ReaderPreferences>(() => loadPreferences());
  const [bookmarks, setBookmarks] = useState<string[]>(() => loadBookmarks());
  const [progressMap, setProgressMap] = useState<Record<string, BookProgress>>(() =>
    loadProgressMap()
  );

  const isAuthAvailable = Boolean(isFirebaseConfigured && auth && db);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(isAuthAvailable);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  const dataSource = getDataSource();

  // Refs for latest local state & sync lifecycle coordination
  const preferencesRef = useRef<ReaderPreferences>(preferences);
  const bookmarksRef = useRef<string[]>(bookmarks);
  const progressMapRef = useRef<Record<string, BookProgress>>(progressMap);
  const userRef = useRef<User | null>(null);
  const syncReadyRef = useRef(false);
  const hasPendingWriteRef = useRef(false);
  const writeTimerRef = useRef<number | null>(null);
  const sessionTokenRef = useRef(0);

  preferencesRef.current = preferences;
  bookmarksRef.current = bookmarks;
  progressMapRef.current = progressMap;

  const getCurrentLocalData = useCallback(
    (): UserSyncData => ({
      preferences: preferencesRef.current,
      bookmarks: bookmarksRef.current,
      progress: progressMapRef.current,
    }),
    []
  );

  const applySyncedData = useCallback((data: UserSyncData) => {
    preferencesRef.current = data.preferences;
    bookmarksRef.current = data.bookmarks;
    progressMapRef.current = data.progress;
    savePreferences(data.preferences);
    saveBookmarks(data.bookmarks);
    saveProgressMap(data.progress);
    setPreferences(data.preferences);
    setBookmarks(data.bookmarks);
    setProgressMap(data.progress);
  }, []);

  const flushCloudSave = useCallback(async () => {
    if (writeTimerRef.current !== null) {
      window.clearTimeout(writeTimerRef.current);
      writeTimerRef.current = null;
    }
    const activeUser = userRef.current;
    if (!activeUser || !syncReadyRef.current || !hasPendingWriteRef.current) {
      return;
    }
    hasPendingWriteRef.current = false;
    setSyncStatus('syncing');
    try {
      await saveCloudUserData(activeUser.uid, getCurrentLocalData());
      if (userRef.current?.uid === activeUser.uid) {
        setSyncStatus('synced');
      }
    } catch (err) {
      console.warn('[Glance] Cloud sync write failed:', err);
      if (userRef.current?.uid === activeUser.uid) {
        setSyncStatus('error');
      }
    }
  }, [getCurrentLocalData]);

  const scheduleCloudSave = useCallback(
    (delayMs = 350) => {
      if (!userRef.current || !syncReadyRef.current) return;
      hasPendingWriteRef.current = true;
      setSyncStatus('syncing');
      if (writeTimerRef.current !== null) {
        window.clearTimeout(writeTimerRef.current);
      }
      writeTimerRef.current = window.setTimeout(() => {
        void flushCloudSave();
      }, delayMs);
    },
    [flushCloudSave]
  );

  // Flush pending cloud writes when leaving/hiding the tab
  useEffect(() => {
    const handleVisibilityOrHide = () => {
      if (document.visibilityState === 'hidden' && hasPendingWriteRef.current) {
        void flushCloudSave();
      }
    };
    const handlePageHide = () => {
      if (hasPendingWriteRef.current) {
        void flushCloudSave();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityOrHide);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrHide);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [flushCloudSave]);

  // Observe Firebase Auth state & sync `users/{uid}`
  useEffect(() => {
    if (!auth || !db) {
      setAuthLoading(false);
      return;
    }

    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (nextUser) => {
      const token = ++sessionTokenRef.current;

      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }
      if (writeTimerRef.current !== null) {
        window.clearTimeout(writeTimerRef.current);
        writeTimerRef.current = null;
      }
      hasPendingWriteRef.current = false;
      syncReadyRef.current = false;
      userRef.current = nextUser;
      setUser(nextUser);
      setAuthLoading(false);

      if (!nextUser) {
        setSyncStatus('idle');
        return;
      }

      setSyncStatus('syncing');
      try {
        const cloudData = await loadCloudUserData(nextUser.uid);
        if (sessionTokenRef.current !== token) return;

        const localData = getCurrentLocalData();
        const isFreshSignIn = getLastSyncedUid() !== nextUser.uid;

        let resolved: UserSyncData;
        let shouldPushToCloud = false;

        if (isFreshSignIn) {
          resolved = mergeUserData(localData, cloudData);
          shouldPushToCloud = !cloudData || !areUserDataEqual(resolved, cloudData);
        } else if (cloudData) {
          resolved = cloudData;
          shouldPushToCloud = false;
        } else {
          resolved = mergeUserData(localData, null);
          shouldPushToCloud = true;
        }

        if (!areUserDataEqual(localData, resolved)) {
          applySyncedData(resolved);
        }
        setLastSyncedUid(nextUser.uid);

        if (shouldPushToCloud) {
          await saveCloudUserData(nextUser.uid, resolved);
          if (sessionTokenRef.current !== token) return;
        }

        syncReadyRef.current = true;
        setSyncStatus('synced');

        unsubscribeSnapshot = subscribeToCloudUserData(
          nextUser.uid,
          (remoteData) => {
            if (sessionTokenRef.current !== token || hasPendingWriteRef.current) return;
            if (!areUserDataEqual(getCurrentLocalData(), remoteData)) {
              applySyncedData(remoteData);
            }
            setSyncStatus('synced');
          },
          (err) => {
            console.warn('[Glance] Live cloud sync listener error:', err);
            if (sessionTokenRef.current === token) {
              setSyncStatus('error');
            }
          }
        );
      } catch (err) {
        console.warn('[Glance] Initial cloud sync failed:', err);
        if (sessionTokenRef.current === token) {
          syncReadyRef.current = true;
          setSyncStatus('error');
        }
      }
    });

    return () => {
      sessionTokenRef.current += 1;
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      if (writeTimerRef.current !== null) {
        window.clearTimeout(writeTimerRef.current);
        writeTimerRef.current = null;
      }
    };
  }, [applySyncedData, getCurrentLocalData]);

  // Fetch catalog
  useEffect(() => {
    let active = true;
    fetchCatalog()
      .then((catalog) => {
        if (active) {
          setBooks(catalog.books);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Apply active theme class + PWA status bar color
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('reader-theme-light', 'reader-theme-sepia', 'reader-theme-dark');
    root.classList.add(`reader-theme-${preferences.theme}`);

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      const color =
        preferences.theme === 'dark'
          ? '#0a0c10'
          : preferences.theme === 'sepia'
          ? '#f4ecd8'
          : '#fafaf9';
      metaTheme.setAttribute('content', color);
    }
  }, [preferences.theme]);

  const updatePreferences = useCallback(
    (patch: Partial<ReaderPreferences>) => {
      setPreferences((prev) => {
        const next = { ...prev, ...patch };
        preferencesRef.current = next;
        savePreferences(next);
        return next;
      });
      scheduleCloudSave(350);
    },
    [scheduleCloudSave]
  );

  const isBookmarked = useCallback(
    (bookId: string) => bookmarks.includes(bookId),
    [bookmarks]
  );

  const toggleBookmark = useCallback(
    (bookId: string) => {
      setBookmarks((prev) => {
        const next = prev.includes(bookId)
          ? prev.filter((id) => id !== bookId)
          : [bookId, ...prev];
        bookmarksRef.current = next;
        saveBookmarks(next);
        return next;
      });
      scheduleCloudSave(300);
    },
    [scheduleCloudSave]
  );

  const getProgress = useCallback(
    (bookId: string) => progressMap[bookId],
    [progressMap]
  );

  const updateProgress = useCallback(
    (bookId: string, patch: Partial<Omit<BookProgress, 'bookId' | 'lastReadAt'>>) => {
      let isHighPriorityChange = Boolean(patch.completed);
      setProgressMap((prev) => {
        const existing = prev[bookId] ?? {
          bookId,
          chapterIndex: 0,
          pageIndex: 0,
          scrollRatio: 0,
          completed: false,
          lastReadAt: Date.now(),
        };
        if (
          patch.chapterIndex !== undefined &&
          patch.chapterIndex !== existing.chapterIndex
        ) {
          isHighPriorityChange = true;
        }
        const nextEntry: BookProgress = {
          ...existing,
          ...patch,
          bookId,
          lastReadAt: Date.now(),
        };
        const next = { ...prev, [bookId]: nextEntry };
        progressMapRef.current = next;
        saveProgressMap(next);
        return next;
      });
      scheduleCloudSave(isHighPriorityChange ? 450 : 1800);
    },
    [scheduleCloudSave]
  );

  const removeProgress = useCallback(
    (bookId: string) => {
      setProgressMap((prev) => {
        if (!(bookId in prev)) return prev;
        const next = { ...prev };
        delete next[bookId];
        progressMapRef.current = next;
        saveProgressMap(next);
        return next;
      });
      scheduleCloudSave(300);
    },
    [scheduleCloudSave]
  );

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    setAuthBusy(true);
    try {
      await signInWithGooglePopup();
    } catch (err) {
      const msg = formatAuthError(err);
      if (msg) setAuthError(msg);
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthError(null);
    setAuthBusy(true);
    try {
      await flushCloudSave();
      setLastSyncedUid(null);
      await signOutGoogle();
    } catch (err) {
      const msg = formatAuthError(err);
      if (msg) setAuthError(msg);
    } finally {
      setAuthBusy(false);
    }
  }, [flushCloudSave]);

  const continueReadingBooks = useMemo(() => {
    return Object.values(progressMap)
      .filter((p) => !p.completed)
      .sort((a, b) => b.lastReadAt - a.lastReadAt)
      .map((progress) => {
        const book = books.find((b) => b.id === progress.bookId);
        return book ? { book, progress } : null;
      })
      .filter((entry): entry is { book: BookCatalogItem; progress: BookProgress } => entry !== null);
  }, [books, progressMap]);

  const value = useMemo<AppContextValue>(
    () => ({
      books,
      loading,
      dataSource,
      preferences,
      updatePreferences,
      bookmarks,
      isBookmarked,
      toggleBookmark,
      progressMap,
      getProgress,
      updateProgress,
      removeProgress,
      continueReadingBooks,
      isAuthAvailable,
      user,
      authLoading,
      authBusy,
      authError,
      clearAuthError,
      syncStatus,
      signInWithGoogle,
      signOutUser,
    }),
    [
      books,
      loading,
      dataSource,
      preferences,
      updatePreferences,
      bookmarks,
      isBookmarked,
      toggleBookmark,
      progressMap,
      getProgress,
      updateProgress,
      removeProgress,
      continueReadingBooks,
      isAuthAvailable,
      user,
      authLoading,
      authBusy,
      authError,
      clearAuthError,
      syncStatus,
      signInWithGoogle,
      signOutUser,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside <AppProvider>');
  }
  return ctx;
}
