import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react';
import { fetchBookSummary } from '../lib/repository';
import { useApp } from '../context/AppContext';
import type { BookSummary } from '../types/book';

export function BookDetailPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const { books, isBookmarked, toggleBookmark, getProgress } = useApp();

  const [summary, setSummary] = useState<BookSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const catalogItem = books.find((b) => b.id === bookId);
  const saved = bookId ? isBookmarked(bookId) : false;
  const progress = bookId ? getProgress(bookId) : undefined;

  useEffect(() => {
    if (!bookId) return;
    let active = true;
    setLoading(true);
    fetchBookSummary(bookId)
      .then((data) => {
        if (active) {
          setSummary(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bookId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div
          style={{ backgroundColor: 'var(--reader-surface-muted)' }}
          className="h-8 w-24 rounded-full hidden md:block"
        />
        <div className="grid md:grid-cols-[240px_1fr] gap-8">
          <div
            style={{ backgroundColor: 'var(--reader-surface-muted)' }}
            className="aspect-[5/7] rounded-2xl"
          />
          <div className="space-y-4">
            <div
              style={{ backgroundColor: 'var(--reader-surface-muted)' }}
              className="h-10 w-3/4 rounded-xl"
            />
            <div
              style={{ backgroundColor: 'var(--reader-surface-muted)' }}
              className="h-5 w-1/3 rounded-lg"
            />
            <div
              style={{ backgroundColor: 'var(--reader-surface-muted)' }}
              className="h-24 w-full rounded-xl"
            />
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4">
        <h1 className="font-serif-editorial text-2xl font-bold">Book summary not found</h1>
        <p style={{ color: 'var(--reader-muted)' }} className="text-sm">
          We couldn&apos;t load this summary. It may have been removed or you may be offline before
          caching it.
        </p>
        <Link
          to="/"
          style={{ backgroundColor: 'var(--reader-accent)' }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    );
  }

  const coverUrl = summary.coverUrl ?? catalogItem?.coverUrl ?? '/covers/atomic-habits.svg';
  const categories = summary.categories ?? catalogItem?.categories ?? [];
  const readTime = summary.readTimeMinutes ?? catalogItem?.readTimeMinutes ?? 12;

  const ctaLabel = progress?.completed
    ? 'Read Again'
    : progress && progress.chapterIndex > 0
    ? `Continue Chapter ${progress.chapterIndex + 1}`
    : progress
    ? 'Continue Reading'
    : 'Start Reading';

  const startChapter = progress && !progress.completed ? progress.chapterIndex : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
      {/* Desktop Back Button (Mobile uses the Back button in the top navbar left of the Glance logo) */}
      <Link
        to="/"
        style={{ color: 'var(--reader-muted)' }}
        className="hidden md:inline-flex items-center gap-1.5 text-sm font-medium hover:opacity-100 min-h-[44px] pr-3"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      {/* Hero Section */}
      <section
        style={{
          backgroundColor: 'var(--reader-surface)',
          borderColor: 'var(--reader-border)',
        }}
        className="rounded-3xl border p-6 sm:p-8 shadow-xs"
      >
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 sm:gap-8 items-start">
          <div
            style={{ backgroundColor: 'var(--reader-surface-muted)' }}
            className="w-44 sm:w-52 md:w-full mx-auto md:mx-0 aspect-[5/7] rounded-2xl overflow-hidden shadow-md"
          >
            <img
              src={coverUrl}
              alt={`${summary.title} cover`}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <span
                  key={cat}
                  style={{
                    backgroundColor: 'var(--reader-surface-muted)',
                    color: 'var(--reader-muted)',
                  }}
                  className="text-xs font-medium px-3 py-1 rounded-full"
                >
                  {cat}
                </span>
              ))}
              {progress?.completed && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-500">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Completed
                </span>
              )}
            </div>

            <div>
              <h1 className="font-serif-editorial text-3xl sm:text-4xl font-bold leading-tight">
                {summary.title}
              </h1>
              <p style={{ color: 'var(--reader-muted)' }} className="text-base sm:text-lg mt-1">
                {summary.author}
              </p>
            </div>

            <div
              style={{ color: 'var(--reader-muted)' }}
              className="flex flex-wrap items-center gap-5 text-sm pt-1"
            >
              <span className="inline-flex items-center gap-1.5">
                <Clock style={{ color: 'var(--reader-accent)' }} className="w-4 h-4" />
                {readTime} min read
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Layers style={{ color: 'var(--reader-accent)' }} className="w-4 h-4" />
                {summary.chapters.length} chapters
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to={`/read/${summary.id}?chapter=${startChapter}`}
                style={{ backgroundColor: 'var(--reader-accent)' }}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 min-h-[48px] px-7 rounded-full text-white font-semibold text-sm sm:text-base shadow-sm hover:opacity-90 transition-opacity"
              >
                <BookOpen className="w-4 h-4" />
                {ctaLabel}
              </Link>

              <button
                type="button"
                onClick={() => toggleBookmark(summary.id)}
                style={{
                  backgroundColor: saved ? 'var(--reader-quote-bg)' : 'var(--reader-surface)',
                  borderColor: saved ? 'var(--reader-accent)' : 'var(--reader-border)',
                  color: saved ? 'var(--reader-accent)' : 'var(--reader-text)',
                }}
                className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-full border text-sm font-medium transition-colors cursor-pointer"
              >
                <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
                {saved ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* What It's About */}
      <section
        style={{
          backgroundColor: 'var(--reader-surface)',
          borderColor: 'var(--reader-border)',
        }}
        className="rounded-3xl border p-6 sm:p-8 space-y-6"
      >
        <div>
          <h2 className="font-serif-editorial text-2xl font-bold">What it&apos;s about</h2>
          <p className="mt-3 opacity-85 leading-relaxed text-base">{summary.overview}</p>
        </div>

        {summary.keyTakeaways.length > 0 && (
          <div style={{ borderColor: 'var(--reader-border)' }} className="pt-5 border-t">
            <h3
              style={{ color: 'var(--reader-accent)' }}
              className="text-sm font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-3"
            >
              <Sparkles className="w-4 h-4" />
              Key Takeaways
            </h3>
            <ul className="space-y-2.5">
              {summary.keyTakeaways.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm sm:text-base opacity-90">
                  <span
                    style={{
                      backgroundColor: 'var(--reader-accent)',
                      color: '#ffffff',
                    }}
                    className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5"
                  >
                    {idx + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Table of Contents */}
      <section
        style={{
          backgroundColor: 'var(--reader-surface)',
          borderColor: 'var(--reader-border)',
        }}
        className="rounded-3xl border p-6 sm:p-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif-editorial text-2xl font-bold">Table of Contents</h2>
          <span style={{ color: 'var(--reader-muted)' }} className="text-xs font-medium">
            {summary.chapters.length} chapters
          </span>
        </div>
        <ol style={{ borderColor: 'var(--reader-border)' }} className="divide-y">
          {summary.chapters.map((chapter) => {
            const isCurrent =
              progress && !progress.completed && progress.chapterIndex === chapter.index;
            const isRead =
              progress && (progress.completed || progress.chapterIndex > chapter.index);

            return (
              <li key={chapter.index} style={{ borderColor: 'var(--reader-border)' }}>
                <Link
                  to={`/read/${summary.id}?chapter=${chapter.index}`}
                  className="flex items-center gap-4 py-4 px-2 -mx-2 rounded-xl hover:bg-black/5 transition-colors group min-h-[56px]"
                >
                  <span
                    style={{
                      backgroundColor:
                        isCurrent || isRead
                          ? 'var(--reader-accent)'
                          : 'var(--reader-surface-muted)',
                      color: isCurrent || isRead ? '#ffffff' : 'var(--reader-muted)',
                    }}
                    className="w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center shrink-0"
                  >
                    {chapter.index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{chapter.title}</p>
                    {isCurrent && (
                      <p
                        style={{ color: 'var(--reader-accent)' }}
                        className="text-xs font-medium mt-0.5"
                      >
                        Currently reading
                      </p>
                    )}
                  </div>
                  <ChevronRight
                    style={{ color: 'var(--reader-muted)' }}
                    className="w-4 h-4 shrink-0"
                  />
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
