import { Link } from 'react-router-dom';
import { Bookmark, Clock, Layers, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { BookCatalogItem } from '../types/book';

interface BookCardProps {
  book: BookCatalogItem;
}

export function BookCard({ book }: BookCardProps) {
  const { isBookmarked, toggleBookmark, getProgress } = useApp();
  const saved = isBookmarked(book.id);
  const progress = getProgress(book.id);

  const percent = progress
    ? progress.completed
      ? 100
      : Math.min(95, Math.round(((progress.chapterIndex + 0.5) / Math.max(1, book.chapterCount)) * 100))
    : 0;

  return (
    <article
      style={{
        backgroundColor: 'var(--reader-surface)',
        borderColor: 'var(--reader-border)',
        color: 'var(--reader-text)',
      }}
      className="group relative rounded-2xl border shadow-xs hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden"
    >
      <Link to={`/book/${book.id}`} className="flex flex-col flex-1 focus:outline-none">
        {/* Cover */}
        <div
          style={{ backgroundColor: 'var(--reader-surface-muted)' }}
          className="relative aspect-[5/6] overflow-hidden"
        >
          <img
            src={book.coverUrl}
            alt={`${book.title} cover`}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
          {progress?.completed && (
            <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600/95 text-white text-[11px] font-semibold shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Finished
            </span>
          )}
          {percent > 0 && !progress?.completed && (
            <div className="absolute bottom-0 inset-x-0 h-1.5 bg-black/25">
              <div
                className="h-full bg-emerald-400 transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3 sm:p-4 flex flex-col flex-1">
          <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-1.5 sm:mb-2">
            {book.categories.slice(0, 2).map((cat, idx) => (
              <span
                key={cat}
                style={{
                  backgroundColor: 'var(--reader-surface-muted)',
                  color: 'var(--reader-muted)',
                }}
                className={`text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-full truncate max-w-full ${
                  idx > 0 ? 'hidden sm:inline-block' : ''
                }`}
              >
                {cat}
              </span>
            ))}
          </div>

          <h3 className="font-serif-editorial text-sm sm:text-lg font-bold leading-snug line-clamp-2">
            {book.title}
          </h3>
          <p style={{ color: 'var(--reader-muted)' }} className="text-xs sm:text-sm mt-0.5 truncate">
            {book.author}
          </p>
          <p
            style={{ color: 'var(--reader-muted)' }}
            className="hidden sm:line-clamp-2 text-xs mt-2 flex-1"
          >
            {book.tagline}
          </p>

          <div
            style={{
              borderColor: 'var(--reader-border)',
              color: 'var(--reader-muted)',
            }}
            className="mt-auto pt-2.5 sm:pt-3 border-t flex items-center justify-between text-[11px] sm:text-xs gap-1"
          >
            <span className="inline-flex items-center gap-1 shrink-0">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              {book.readTimeMinutes}m
            </span>
            <span className="inline-flex items-center gap-1 shrink-0">
              <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              {book.chapterCount} ch
            </span>
          </div>
        </div>
      </Link>

      {/* Bookmark Button */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleBookmark(book.id);
        }}
        aria-label={saved ? `Remove ${book.title} from My Library` : `Save ${book.title} to My Library`}
        style={{
          backgroundColor: saved ? 'var(--reader-accent)' : 'rgba(255, 255, 255, 0.88)',
          color: saved ? '#ffffff' : '#1e293b',
        }}
        className="absolute top-2 right-2 sm:top-3 sm:right-3 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-sm cursor-pointer"
      >
        <Bookmark className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${saved ? 'fill-current' : ''}`} />
      </button>
    </article>
  );
}
