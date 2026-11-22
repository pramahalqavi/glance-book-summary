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
    <div className="space-y-6">
      <div>
        <h1 className="font-serif-editorial text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          My Library
        </h1>
        <p className="text-stone-500 text-sm sm:text-base mt-1">
          Your saved summaries and reading progress, stored locally on this device.
        </p>
      </div>

      {/* Tabs */}
      <div className="inline-flex p-1 rounded-full bg-stone-200/70 gap-1">
        {tabs.map(({ id, label, count, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`min-h-[40px] px-4 rounded-full text-sm font-medium flex items-center gap-2 transition-all cursor-pointer ${
                active
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-stone-600 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-300/60 text-stone-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {activeList.length === 0 ? (
        <div className="py-16 px-6 text-center bg-white rounded-3xl border border-stone-200/80">
          <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
            <Bookmark className="w-6 h-6" />
          </div>
          <h2 className="font-serif-editorial text-xl font-bold text-slate-900">
            {tab === 'saved'
              ? 'No saved books yet'
              : tab === 'in-progress'
              ? 'No books currently in progress'
              : 'No finished summaries yet'}
          </h2>
          <p className="text-sm text-stone-500 mt-1 max-w-sm mx-auto">
            {tab === 'saved'
              ? 'Tap the bookmark icon on any book to build your personal reading list.'
              : 'Open a summary from Discover to start reading.'}
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center mt-5 px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
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
