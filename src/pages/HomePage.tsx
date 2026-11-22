import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Fuse from 'fuse.js';
import { ArrowRight, BookOpen, Search, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BookCard } from '../components/BookCard';

export function HomePage() {
  const { books, loading, continueReadingBooks } = useApp();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = useMemo(() => {
    const set = new Set<string>();
    books.forEach((b) => b.categories.forEach((c) => set.add(c)));
    return ['All', ...Array.from(set).sort()];
  }, [books]);

  const fuse = useMemo(
    () =>
      new Fuse(books, {
        keys: [
          { name: 'title', weight: 0.45 },
          { name: 'author', weight: 0.3 },
          { name: 'categories', weight: 0.15 },
          { name: 'tagline', weight: 0.1 },
        ],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [books]
  );

  const filteredBooks = useMemo(() => {
    const trimmed = query.trim();
    const base = trimmed ? fuse.search(trimmed).map((r) => r.item) : books;
    if (selectedCategory === 'All') return base;
    return base.filter((b) => b.categories.includes(selectedCategory));
  }, [books, fuse, query, selectedCategory]);

  return (
    <div className="space-y-8">
      {/* Continue Reading Section */}
      {continueReadingBooks.length > 0 && (
        <section aria-labelledby="continue-reading-heading">
          <div className="flex items-center justify-between mb-3">
            <h2
              id="continue-reading-heading"
              className="text-sm font-semibold uppercase tracking-wider text-stone-500"
            >
              Continue Reading
            </h2>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            {continueReadingBooks.map(({ book, progress }) => {
              const pct = Math.min(
                95,
                Math.round(((progress.chapterIndex + 0.5) / Math.max(1, book.chapterCount)) * 100)
              );
              return (
                <Link
                  key={book.id}
                  to={`/read/${book.id}?chapter=${progress.chapterIndex}`}
                  className="shrink-0 w-[290px] sm:w-[340px] bg-white rounded-2xl border border-stone-200/80 p-3.5 flex items-center gap-3.5 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all group"
                >
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    className="w-16 h-22 rounded-xl object-cover shrink-0 shadow-xs"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-emerald-700">
                      Chapter {progress.chapterIndex + 1} of {book.chapterCount}
                    </p>
                    <h3 className="font-serif-editorial font-bold text-slate-900 truncate mt-0.5">
                      {book.title}
                    </h3>
                    <p className="text-xs text-stone-500 truncate">{book.author}</p>
                    <div className="mt-2.5 h-1.5 w-full rounded-full bg-stone-100 overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Search + Category Filters */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="font-serif-editorial text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
              Explore Summaries
            </h1>
            <p className="text-stone-500 text-sm sm:text-base mt-1">
              Key insights from essential books, crafted for Scroll or Swipe reading.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, author, or topic..."
              aria-label="Search book summaries"
              className="w-full h-11 pl-10 pr-10 rounded-full bg-white border border-stone-200 text-sm text-slate-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all shadow-2xs"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-slate-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div
          role="tablist"
          aria-label="Filter by category"
          className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 min-h-[40px] px-4 rounded-full text-sm font-medium transition-all cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-300 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* Catalog Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-96 rounded-2xl bg-stone-200/60 animate-pulse"
            />
          ))}
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-stone-200/80 px-6">
          <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="font-serif-editorial text-xl font-bold text-slate-900">
            No matching summaries
          </h3>
          <p className="text-sm text-stone-500 mt-1 max-w-sm mx-auto">
            Try another keyword or clear your category filter to browse the full catalog.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSelectedCategory('All');
            }}
            className="mt-4 px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredBooks.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}
