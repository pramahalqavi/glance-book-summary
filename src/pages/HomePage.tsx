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
              style={{ color: 'var(--reader-muted)' }}
              className="text-sm font-semibold uppercase tracking-wider"
            >
              Continue Reading
            </h2>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {continueReadingBooks.map(({ book, progress }) => {
              const pct = Math.min(
                95,
                Math.round(((progress.chapterIndex + 0.5) / Math.max(1, book.chapterCount)) * 100)
              );
              return (
                <Link
                  key={book.id}
                  to={`/read/${book.id}?chapter=${progress.chapterIndex}`}
                  style={{
                    backgroundColor: 'var(--reader-surface)',
                    borderColor: 'var(--reader-border)',
                  }}
                  className="shrink-0 w-[280px] sm:w-[340px] rounded-2xl border p-3.5 flex items-center gap-3.5 shadow-xs hover:shadow-md transition-all group"
                >
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    className="w-16 h-22 rounded-xl object-cover shrink-0 shadow-xs"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      style={{ color: 'var(--reader-accent)' }}
                      className="text-[11px] font-semibold"
                    >
                      Chapter {progress.chapterIndex + 1} of {book.chapterCount}
                    </p>
                    <h3 className="font-serif-editorial font-bold truncate mt-0.5">
                      {book.title}
                    </h3>
                    <p style={{ color: 'var(--reader-muted)' }} className="text-xs truncate">
                      {book.author}
                    </p>
                    <div
                      style={{ backgroundColor: 'var(--reader-surface-muted)' }}
                      className="mt-2.5 h-1.5 w-full rounded-full overflow-hidden"
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          backgroundColor: 'var(--reader-accent)',
                        }}
                        className="h-full rounded-full"
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      backgroundColor: 'var(--reader-surface-muted)',
                      color: 'var(--reader-accent)',
                    }}
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:translate-x-0.5"
                  >
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
            <h1 className="font-serif-editorial text-3xl sm:text-4xl font-bold tracking-tight">
              Explore Summaries
            </h1>
            <p style={{ color: 'var(--reader-muted)' }} className="text-sm sm:text-base mt-1">
              Key insights from essential books, crafted for Scroll or Swipe reading.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search
              style={{ color: 'var(--reader-muted)' }}
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, author, or topic..."
              aria-label="Search book summaries"
              style={{
                backgroundColor: 'var(--reader-surface)',
                borderColor: 'var(--reader-border)',
                color: 'var(--reader-text)',
              }}
              className="w-full h-11 pl-10 pr-10 rounded-full border text-sm placeholder:opacity-60 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all shadow-2xs"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                style={{ color: 'var(--reader-muted)' }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center hover:opacity-100 cursor-pointer"
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
          className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1"
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
                style={{
                  backgroundColor: active ? 'var(--reader-accent)' : 'var(--reader-surface)',
                  borderColor: active ? 'var(--reader-accent)' : 'var(--reader-border)',
                  color: active ? '#ffffff' : 'var(--reader-muted)',
                }}
                className="shrink-0 min-h-[40px] px-4 rounded-full border text-sm font-medium transition-all cursor-pointer"
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
              style={{ backgroundColor: 'var(--reader-surface-muted)' }}
              className="h-96 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : filteredBooks.length === 0 ? (
        <div
          style={{
            backgroundColor: 'var(--reader-surface)',
            borderColor: 'var(--reader-border)',
          }}
          className="py-16 text-center rounded-3xl border px-6"
        >
          <div
            style={{
              backgroundColor: 'var(--reader-surface-muted)',
              color: 'var(--reader-muted)',
            }}
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
          >
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="font-serif-editorial text-xl font-bold">No matching summaries</h3>
          <p style={{ color: 'var(--reader-muted)' }} className="text-sm mt-1 max-w-sm mx-auto">
            Try another keyword or clear your category filter to browse the full catalog.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSelectedCategory('All');
            }}
            style={{ backgroundColor: 'var(--reader-accent)' }}
            className="mt-4 px-5 py-2.5 rounded-full text-white text-sm font-medium transition-opacity hover:opacity-90 cursor-pointer"
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
