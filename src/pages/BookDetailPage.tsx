import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
  const navigate = useNavigate();
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
        <div className="h-8 w-24 rounded-full bg-stone-200" />
        <div className="grid md:grid-cols-[240px_1fr] gap-8">
          <div className="aspect-[5/7] rounded-2xl bg-stone-200" />
          <div className="space-y-4">
            <div className="h-10 w-3/4 rounded-xl bg-stone-200" />
            <div className="h-5 w-1/3 rounded-lg bg-stone-200" />
            <div className="h-24 w-full rounded-xl bg-stone-200" />
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4">
        <h1 className="font-serif-editorial text-2xl font-bold text-slate-900">
          Book summary not found
        </h1>
        <p className="text-sm text-stone-500">
          We couldn&apos;t load this summary. It may have been removed or you may be offline before
          caching it.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Discover
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
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back Button */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-slate-900 min-h-[44px] pr-3 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Hero Section */}
      <section className="bg-white rounded-3xl border border-stone-200/80 p-6 sm:p-8 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 sm:gap-8 items-start">
          <div className="w-44 sm:w-52 md:w-full mx-auto md:mx-0 aspect-[5/7] rounded-2xl overflow-hidden shadow-md bg-stone-100">
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
                  className="text-xs font-medium px-3 py-1 rounded-full bg-stone-100 text-stone-700"
                >
                  {cat}
                </span>
              ))}
              {progress?.completed && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Completed
                </span>
              )}
            </div>

            <div>
              <h1 className="font-serif-editorial text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
                {summary.title}
              </h1>
              <p className="text-base sm:text-lg text-stone-500 mt-1">{summary.author}</p>
            </div>

            <div className="flex flex-wrap items-center gap-5 text-sm text-stone-600 pt-1">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600" />
                {readTime} min read
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" />
                {summary.chapters.length} chapters
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to={`/read/${summary.id}?chapter=${startChapter}`}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 min-h-[48px] px-7 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm sm:text-base shadow-sm transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                {ctaLabel}
              </Link>

              <button
                type="button"
                onClick={() => toggleBookmark(summary.id)}
                className={`inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-full border text-sm font-medium transition-colors cursor-pointer ${
                  saved
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                    : 'bg-white border-stone-200 text-slate-700 hover:bg-stone-50'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
                {saved ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* What It's About */}
      <section className="bg-white rounded-3xl border border-stone-200/80 p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="font-serif-editorial text-2xl font-bold text-slate-900">
            What it&apos;s about
          </h2>
          <p className="mt-3 text-stone-700 leading-relaxed text-base">
            {summary.overview}
          </p>
        </div>

        {summary.keyTakeaways.length > 0 && (
          <div className="pt-5 border-t border-stone-100">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5 mb-3">
              <Sparkles className="w-4 h-4" />
              Key Takeaways
            </h3>
            <ul className="space-y-2.5">
              {summary.keyTakeaways.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm sm:text-base text-stone-700">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
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
      <section className="bg-white rounded-3xl border border-stone-200/80 p-6 sm:p-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif-editorial text-2xl font-bold text-slate-900">
            Table of Contents
          </h2>
          <span className="text-xs font-medium text-stone-500">
            {summary.chapters.length} chapters
          </span>
        </div>
        <ol className="divide-y divide-stone-100">
          {summary.chapters.map((chapter) => {
            const isCurrent = progress && !progress.completed && progress.chapterIndex === chapter.index;
            const isRead = progress && (progress.completed || progress.chapterIndex > chapter.index);

            return (
              <li key={chapter.index}>
                <Link
                  to={`/read/${summary.id}?chapter=${chapter.index}`}
                  className="flex items-center gap-4 py-4 px-2 -mx-2 rounded-xl hover:bg-stone-50 transition-colors group min-h-[56px]"
                >
                  <span
                    className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                      isCurrent
                        ? 'bg-emerald-600 text-white'
                        : isRead
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {chapter.index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 group-hover:text-emerald-800 transition-colors truncate">
                      {chapter.title}
                    </p>
                    {isCurrent && (
                      <p className="text-xs text-emerald-700 font-medium mt-0.5">
                        Currently reading
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-slate-700 shrink-0" />
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
