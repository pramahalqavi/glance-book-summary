import type { BookProgress, ReaderPreferences } from '../types/book';

const PREFS_KEY = 'glance:preferences:v1';
const BOOKMARKS_KEY = 'glance:bookmarks:v1';
const PROGRESS_KEY = 'glance:progress:v1';

export const DEFAULT_PREFERENCES: ReaderPreferences = {
  readingMode: 'scroll',
  theme: 'light',
  fontSize: 'md',
  fontFamily: 'newsreader',
};

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors in restricted browsing modes
  }
}

export function loadPreferences(): ReaderPreferences {
  const stored = safeRead<Partial<ReaderPreferences>>(PREFS_KEY, {});
  return {
    readingMode: stored.readingMode === 'swipe' ? 'swipe' : 'scroll',
    theme:
      stored.theme === 'sepia' || stored.theme === 'dark' ? stored.theme : 'light',
    fontSize:
      stored.fontSize === 'sm' ||
      stored.fontSize === 'lg' ||
      stored.fontSize === 'xl'
        ? stored.fontSize
        : 'md',
    fontFamily:
      stored.fontFamily === 'literata' ||
      stored.fontFamily === 'lora' ||
      stored.fontFamily === 'merriweather' ||
      stored.fontFamily === 'inter' ||
      stored.fontFamily === 'jakarta'
        ? stored.fontFamily
        : 'newsreader',
  };
}

export function savePreferences(prefs: ReaderPreferences): void {
  safeWrite(PREFS_KEY, prefs);
}

export function loadBookmarks(): string[] {
  const list = safeRead<unknown>(BOOKMARKS_KEY, []);
  return Array.isArray(list) ? list.filter((id): id is string => typeof id === 'string') : [];
}

export function saveBookmarks(ids: string[]): void {
  safeWrite(BOOKMARKS_KEY, ids);
}

export function loadProgressMap(): Record<string, BookProgress> {
  const map = safeRead<unknown>(PROGRESS_KEY, {});
  if (!map || typeof map !== 'object' || Array.isArray(map)) return {};
  return map as Record<string, BookProgress>;
}

export function saveProgressMap(map: Record<string, BookProgress>): void {
  safeWrite(PROGRESS_KEY, map);
}
