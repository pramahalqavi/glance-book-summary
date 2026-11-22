import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, CheckCircle2, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BookCard } from '../components/BookCard';

type LibraryTab = 'saved' | 'in-progress' | 'finished';

export function MyLibraryPage() {
  const { books, bookmarks, progressMap } = useApp();
  const [tab, setTab] = useState<LibraryTab>('saved');

  const savedBooks = useMemo(
    () => books.filter((b) => bookmarks.includes(b.id)),
    [books, bookmarks]
  );

  const inProgressBooks = useMemo(
    () =>
      books.filter((b) => {
        const p = progressMap[b.id];
        return Boolean(p && !p.completed);
      }),
    [books, progressMap]
  );

  const finishedBooks = useMemo(
    () =>
      books.filter((b) => {
        const p = progressMap[b.id];
        return Boolean(p?.completed);
      }),
    [books, progressMap]
  );

  const activeList =
    tab === 'saved'
      ? savedBooks
      : tab === 'in-progress'
      ? inProgressBooks
      : finishedBooks;

  const tabs: Array<{ id: LibraryTab; label: string; count: number; icon: typeof Bookmark }> = [
    { id: 'saved', label: 'Saved', count: savedBooks.length, icon: Bookmark },
    { id: 'in-progress', label: 'Reading', count: inProgressBooks.length, icon: Clock },
    { id: 'finished', label: 'Finished', count: finishedBooks.length, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <div>
        <h1 className="font-serif-editorial text-3xl sm:text-4xl font-bold tracking-tight">
          My Library
        </h1>
        <p style={{ color: 'var(--reader-muted)' }} className="text-sm sm:text-base mt-1">
          Your saved summaries and reading progress, stored locally on this device.
        </p>
      </div>

      {/* Responsive Tabs that fit 100% of mobile screen width */}
      <div
        style={{
          backgroundColor: 'var(--reader-surface-muted)',
          borderColor: 'var(--reader-border)',
        }}
        className="grid grid-cols-3 sm:inline-flex w-full sm:w-auto p-1 rounded-2xl sm:rounded-full border gap-1"
      >
        {tabs.map(({ id, label, count, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              style={{
                backgroundColor: active ? 'var(--reader-surface)' : 'transparent',
                color: active ? 'var(--reader-text)' : 'var(--reader-muted)',
              }}
              className={`min-h-[42px] px-2.5 sm:px-4 rounded-xl sm:rounded-full text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
                active ? 'shadow-2xs font-semibold' : ''
              }`}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">{label}</span>
              <span
                style={{
                  backgroundColor: active ? 'var(--reader-accent)' : 'var(--reader-border)',
                  color: active ? '#ffffff' : 'var(--reader-text)',
                }}
                className="text-[11px] px-1.5 py-0.5 rounded-full font-semibold shrink-0"
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {activeList.length === 0 ? (
        <div
          style={{
            backgroundColor: 'var(--reader-surface)',
            borderColor: 'var(--reader-border)',
          }}
          className="py-16 px-6 text-center rounded-3xl border"
        >
          <div
            style={{
              backgroundColor: 'var(--reader-surface-muted)',
              color: 'var(--reader-muted)',
            }}
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
          >
            <Bookmark className="w-6 h-6" />
          </div>
          <h2 className="font-serif-editorial text-xl font-bold">
            {tab === 'saved'
              ? 'No saved books yet'
              : tab === 'in-progress'
              ? 'No books currently in progress'
              : 'No finished summaries yet'}
          </h2>
          <p style={{ color: 'var(--reader-muted)' }} className="text-sm mt-1 max-w-sm mx-auto">
            {tab === 'saved'
              ? 'Tap the bookmark icon on any book to build your personal reading list.'
              : 'Open a summary from Discover to start reading.'}
          </p>
          <Link
            to="/"
            style={{ backgroundColor: 'var(--reader-accent)' }}
            className="inline-flex items-center justify-center mt-5 px-5 py-2.5 rounded-full text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Browse Catalog
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {activeList.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}
