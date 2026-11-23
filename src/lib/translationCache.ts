import type { BookLanguage } from '../types/book';

const DB_NAME = 'glance-translations-db';
const DB_VERSION = 2;
const STORE_NAME = 'chapters';

export interface CachedChapterTranslation {
  key: string; // `${bookId}:${targetLang}:${chapterIndex}`
  bookId: string;
  targetLang: BookLanguage;
  chapterIndex: number;
  title: string;
  contentMarkdown: string;
  translatedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      store.createIndex('targetLang', 'targetLang', { unique: false });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function makeTranslationKey(
  bookId: string,
  targetLang: BookLanguage,
  chapterIndex: number
): string {
  return `${bookId}:${targetLang}:${chapterIndex}`;
}

export async function getCachedChapterTranslation(
  bookId: string,
  targetLang: BookLanguage,
  chapterIndex: number
): Promise<CachedChapterTranslation | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(makeTranslationKey(bookId, targetLang, chapterIndex));
      req.onsuccess = () => resolve((req.result as CachedChapterTranslation) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function saveCachedChapterTranslation(
  entry: Omit<CachedChapterTranslation, 'key' | 'translatedAt'>
): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const record: CachedChapterTranslation = {
        ...entry,
        key: makeTranslationKey(entry.bookId, entry.targetLang, entry.chapterIndex),
        translatedAt: Date.now(),
      };
      const req = tx.objectStore(STORE_NAME).put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Ignore IndexedDB quota errors in restricted browsing modes
  }
}

export async function clearTranslationsForLanguage(targetLang: BookLanguage): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('targetLang');
      const cursorReq = index.openCursor(IDBKeyRange.only(targetLang));
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore
  }
}
