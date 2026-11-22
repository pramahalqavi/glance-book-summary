import { doc, getDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { SAMPLE_CATALOG, SAMPLE_SUMMARIES } from '../data/sampleBooks';
import type { BookCatalogDoc, BookCatalogItem, BookSummary } from '../types/book';

let cachedCatalog: BookCatalogDoc | null = null;
const summaryCache = new Map<string, BookSummary>();

export type DataSource = 'firestore' | 'local';

export function getDataSource(): DataSource {
  return isFirebaseConfigured && db ? 'firestore' : 'local';
}

export async function fetchCatalog(): Promise<BookCatalogDoc> {
  if (cachedCatalog) return cachedCatalog;

  if (db) {
    try {
      const snap = await getDoc(doc(db, 'catalog', 'books'));
      if (snap.exists()) {
        const data = snap.data() as BookCatalogDoc;
        if (Array.isArray(data.books) && data.books.length > 0) {
          cachedCatalog = data;
          return data;
        }
      }
    } catch (err) {
      console.warn('[Glance] Firestore catalog read failed, using local fallback:', err);
    }
  }

  cachedCatalog = SAMPLE_CATALOG;
  return SAMPLE_CATALOG;
}

export async function fetchBookSummary(bookId: string): Promise<BookSummary | null> {
  const existing = summaryCache.get(bookId);
  if (existing) return existing;

  if (db) {
    try {
      const snap = await getDoc(doc(db, 'summaries', bookId));
      if (snap.exists()) {
        const summary = snap.data() as BookSummary;
        summaryCache.set(bookId, summary);
        return summary;
      }
    } catch (err) {
      console.warn(`[Glance] Firestore summary read failed for "${bookId}", using local fallback:`, err);
    }
  }

  const fallback = SAMPLE_SUMMARIES[bookId] ?? null;
  if (fallback) {
    summaryCache.set(bookId, fallback);
  }
  return fallback;
}

export function getCatalogItemSync(
  books: BookCatalogItem[],
  bookId: string
): BookCatalogItem | undefined {
  return books.find((b) => b.id === bookId);
}
