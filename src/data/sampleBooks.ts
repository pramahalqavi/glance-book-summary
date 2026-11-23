import rawBooks from './sampleBooks.json';
import type { BookCatalogDoc, BookCatalogItem, BookSummary } from '../types/book';

interface RawBookEntry extends BookSummary {
  coverUrl: string;
  categories: string[];
  readTimeMinutes: number;
  tagline: string;
}

const entries = rawBooks as RawBookEntry[];

export const SAMPLE_CATALOG: BookCatalogDoc = {
  updatedAt: '2026-11-22T00:00:00Z',
  books: entries.map(
    (b): BookCatalogItem => ({
      id: b.id,
      title: b.title,
      author: b.author,
      language: b.language ?? 'en',
      coverUrl: b.coverUrl,
      categories: b.categories,
      readTimeMinutes: b.readTimeMinutes,
      chapterCount: b.chapters.length,
      tagline: b.tagline,
    })
  ),
};

export const SAMPLE_SUMMARIES: Record<string, BookSummary> = Object.fromEntries(
  entries.map((b) => [
    b.id,
    {
      id: b.id,
      title: b.title,
      author: b.author,
      language: b.language ?? 'en',
      coverUrl: b.coverUrl,
      categories: b.categories,
      readTimeMinutes: b.readTimeMinutes,
      overview: b.overview,
      keyTakeaways: b.keyTakeaways,
      chapters: b.chapters,
    },
  ])
);
