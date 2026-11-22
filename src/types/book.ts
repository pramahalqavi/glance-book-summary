export interface BookCatalogItem {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  categories: string[];
  readTimeMinutes: number;
  chapterCount: number;
  tagline: string;
}

export interface BookCatalogDoc {
  updatedAt: string;
  books: BookCatalogItem[];
}

export interface Chapter {
  index: number;
  title: string;
  contentMarkdown: string;
}

export interface BookSummary {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  categories?: string[];
  readTimeMinutes?: number;
  overview: string;
  keyTakeaways: string[];
  chapters: Chapter[];
}

export type ReadingMode = 'scroll' | 'swipe';
export type ReaderTheme = 'light' | 'sepia' | 'dark';
export type FontSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ReaderPreferences {
  readingMode: ReadingMode;
  theme: ReaderTheme;
  fontSize: FontSize;
}

export interface BookProgress {
  bookId: string;
  chapterIndex: number;
  pageIndex: number;
  scrollRatio: number;
  completed: boolean;
  lastReadAt: number;
}
