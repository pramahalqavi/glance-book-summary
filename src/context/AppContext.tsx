import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchCatalog, getDataSource, type DataSource } from '../lib/repository';
import {
  loadBookmarks,
  loadPreferences,
  loadProgressMap,
  saveBookmarks,
  savePreferences,
  saveProgressMap,
} from '../lib/storage';
import type { BookCatalogItem, BookProgress, ReaderPreferences } from '../types/book';

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
  const dataSource = getDataSource();

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

  const updatePreferences = useCallback((patch: Partial<ReaderPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...patch };
      savePreferences(next);
      return next;
    });
  }, []);

  const isBookmarked = useCallback(
    (bookId: string) => bookmarks.includes(bookId),
    [bookmarks]
  );

  const toggleBookmark = useCallback((bookId: string) => {
    setBookmarks((prev) => {
      const next = prev.includes(bookId)
        ? prev.filter((id) => id !== bookId)
        : [bookId, ...prev];
      saveBookmarks(next);
      return next;
    });
  }, []);

  const getProgress = useCallback(
    (bookId: string) => progressMap[bookId],
    [progressMap]
  );

  const updateProgress = useCallback(
    (bookId: string, patch: Partial<Omit<BookProgress, 'bookId' | 'lastReadAt'>>) => {
      setProgressMap((prev) => {
        const existing = prev[bookId] ?? {
          bookId,
          chapterIndex: 0,
          pageIndex: 0,
          scrollRatio: 0,
          completed: false,
          lastReadAt: Date.now(),
        };
        const nextEntry: BookProgress = {
          ...existing,
          ...patch,
          bookId,
          lastReadAt: Date.now(),
        };
        const next = { ...prev, [bookId]: nextEntry };
        saveProgressMap(next);
        return next;
      });
    },
    []
  );

  const removeProgress = useCallback((bookId: string) => {
    setProgressMap((prev) => {
      if (!(bookId in prev)) return prev;
      const next = { ...prev };
      delete next[bookId];
      saveProgressMap(next);
      return next;
    });
  }, []);

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
