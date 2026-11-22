import { useEffect, useRef, useState } from 'react';
import { ArrowUpDown, Check, ChevronDown } from 'lucide-react';
import type { BookCatalogItem } from '../types/book';

export type BookSortOption =
  | 'default'
  | 'title-asc'
  | 'title-desc'
  | 'author-asc'
  | 'read-asc'
  | 'read-desc';

const SORT_OPTIONS: Array<{ value: BookSortOption; label: string }> = [
  { value: 'default', label: 'Default' },
  { value: 'title-asc', label: 'Title (A–Z)' },
  { value: 'title-desc', label: 'Title (Z–A)' },
  { value: 'author-asc', label: 'Author (A–Z)' },
  { value: 'read-asc', label: 'Shortest Read' },
  { value: 'read-desc', label: 'Longest Read' },
];

export function sortBooks(books: BookCatalogItem[], sortBy: BookSortOption): BookCatalogItem[] {
  if (sortBy === 'default') return books;
  const copy = [...books];
  switch (sortBy) {
    case 'title-asc':
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    case 'title-desc':
      return copy.sort((a, b) => b.title.localeCompare(a.title));
    case 'author-asc':
      return copy.sort((a, b) => a.author.localeCompare(b.author));
    case 'read-asc':
      return copy.sort((a, b) => a.readTimeMinutes - b.readTimeMinutes || a.title.localeCompare(b.title));
    case 'read-desc':
      return copy.sort((a, b) => b.readTimeMinutes - a.readTimeMinutes || a.title.localeCompare(b.title));
    default:
      return copy;
  }
}

interface SortDropdownProps {
  value: BookSortOption;
  onChange: (next: BookSortOption) => void;
}

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const current = SORT_OPTIONS.find((o) => o.value === value) ?? SORT_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Sort by: ${current.label}`}
        style={{
          backgroundColor: 'var(--reader-surface)',
          borderColor: 'var(--reader-border)',
          color: 'var(--reader-text)',
        }}
        className="h-11 px-4 rounded-full border text-sm font-medium inline-flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
      >
        <ArrowUpDown style={{ color: 'var(--reader-accent)' }} className="w-4 h-4 shrink-0" />
        <span className="whitespace-nowrap">{current.label}</span>
        <ChevronDown
          style={{ color: 'var(--reader-muted)' }}
          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Sort summaries"
          style={{
            backgroundColor: 'var(--reader-surface)',
            borderColor: 'var(--reader-border)',
            color: 'var(--reader-text)',
          }}
          className="absolute right-0 mt-2 w-48 rounded-2xl border shadow-xl p-1.5 z-40"
        >
          {SORT_OPTIONS.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                style={{
                  backgroundColor: active ? 'var(--reader-surface-muted)' : 'transparent',
                  color: active ? 'var(--reader-accent)' : 'var(--reader-text)',
                }}
                className="w-full px-3 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between gap-2 hover:opacity-90 transition-colors cursor-pointer"
              >
                <span>{opt.label}</span>
                {active && <Check className="w-4 h-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
