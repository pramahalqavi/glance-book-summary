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
    <article className="group relative bg-white rounded-2xl border border-stone-200/80 shadow-xs hover:shadow-md hover:border-stone-300 transition-all duration-200 flex flex-col overflow-hidden">
      <Link to={`/book/${book.id}`} className="flex flex-col flex-1 focus:outline-none">
        {/* Cover */}
        <div className="relative aspect-[5/6] bg-stone-100 overflow-hidden">
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
        <div className="p-4 flex flex-col flex-1">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {book.categories.slice(0, 2).map((cat) => (
              <span
                key={cat}
                className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600"
              >
                {cat}
              </span>
            ))}
          </div>

          <h3 className="font-serif-editorial text-lg font-bold text-slate-900 leading-snug group-hover:text-emerald-800 transition-colors line-clamp-2">
            {book.title}
          </h3>
          <p className="text-sm text-stone-500 mt-0.5">{book.author}</p>
          <p className="text-xs text-stone-600 mt-2 line-clamp-2 flex-1">{book.tagline}</p>

          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {book.readTimeMinutes} min
            </span>
            <span className="inline-flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              {book.chapterCount} chapters
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
        className={`absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-sm cursor-pointer ${
          saved
            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
            : 'bg-white/85 text-slate-700 hover:bg-white'
        }`}
      >
        <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
      </button>
    </article>
  );
}
