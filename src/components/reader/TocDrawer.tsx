import { X } from 'lucide-react';
import type { Chapter } from '../../types/book';

interface TocDrawerProps {
  open: boolean;
  onClose: () => void;
  bookTitle: string;
  bookAuthor: string;
  chapters: Chapter[];
  currentChapterIndex: number;
  onSelectChapter: (index: number) => void;
}

export function TocDrawer({
  open,
  onClose,
  bookTitle,
  bookAuthor,
  chapters,
  currentChapterIndex,
  onSelectChapter,
}: TocDrawerProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Table of Contents"
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--reader-surface)',
          color: 'var(--reader-text)',
          borderColor: 'var(--reader-border)',
        }}
        className="w-[86vw] max-w-[340px] h-full border-r shadow-2xl flex flex-col pt-safe pb-safe"
      >
        <div
          style={{ borderColor: 'var(--reader-border)' }}
          className="px-5 py-4 border-b flex items-start justify-between gap-3"
        >
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider opacity-60">
              Contents
            </p>
            <h2 className="font-serif-editorial text-lg font-bold truncate mt-0.5">{bookTitle}</h2>
            <p className="text-xs opacity-65 truncate">{bookAuthor}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close table of contents"
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/10 shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {chapters.map((chapter) => {
            const active = chapter.index === currentChapterIndex;
            return (
              <button
                key={chapter.index}
                type="button"
                onClick={() => {
                  onSelectChapter(chapter.index);
                  onClose();
                }}
                style={{
                  backgroundColor: active ? 'var(--reader-quote-bg)' : 'transparent',
                  borderColor: active ? 'var(--reader-accent)' : 'transparent',
                }}
                className="w-full text-left px-3.5 py-3 rounded-xl border flex items-start gap-3 transition-colors min-h-[48px] hover:bg-black/5 cursor-pointer"
              >
                <span
                  style={{
                    backgroundColor: active ? 'var(--reader-accent)' : 'var(--reader-border)',
                    color: active ? '#ffffff' : 'var(--reader-text)',
                  }}
                  className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5"
                >
                  {chapter.index + 1}
                </span>
                <span className={`text-sm leading-snug ${active ? 'font-semibold' : 'opacity-85'}`}>
                  {chapter.title}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
