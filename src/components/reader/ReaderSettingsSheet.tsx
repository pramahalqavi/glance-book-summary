import { BookOpenCheck, ScrollText, X } from 'lucide-react';
import type {
  FontSize,
  ReaderFont,
  ReaderPreferences,
  ReaderTheme,
  ReadingMode,
} from '../../types/book';

interface ReaderSettingsSheetProps {
  open: boolean;
  onClose: () => void;
  preferences: ReaderPreferences;
  onChange: (patch: Partial<ReaderPreferences>) => void;
}

const FONT_SIZES: Array<{ value: FontSize; label: string }> = [
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'XL' },
];

const FONT_FAMILIES: Array<{
  value: ReaderFont;
  label: string;
  category: string;
  fontCss: string;
}> = [
  {
    value: 'newsreader',
    label: 'Newsreader',
    category: 'Editorial Serif',
    fontCss: '"Newsreader", Georgia, serif',
  },
  {
    value: 'literata',
    label: 'Literata',
    category: 'Book Serif',
    fontCss: '"Literata", Georgia, serif',
  },
  {
    value: 'lora',
    label: 'Lora',
    category: 'Warm Serif',
    fontCss: '"Lora", Georgia, serif',
  },
  {
    value: 'merriweather',
    label: 'Merriweather',
    category: 'Classic Serif',
    fontCss: '"Merriweather", Georgia, serif',
  },
  {
    value: 'inter',
    label: 'Inter',
    category: 'Clean Sans',
    fontCss: '"Inter", system-ui, sans-serif',
  },
  {
    value: 'jakarta',
    label: 'Jakarta Sans',
    category: 'Modern Sans',
    fontCss: '"Plus Jakarta Sans", system-ui, sans-serif',
  },
];

const THEMES: Array<{
  value: ReaderTheme;
  label: string;
  bg: string;
  fg: string;
  ring: string;
}> = [
  { value: 'light', label: 'Light', bg: '#fafaf9', fg: '#1c1917', ring: '#d6d3d1' },
  { value: 'sepia', label: 'Sepia', bg: '#f4ecd8', fg: '#3d2e1e', ring: '#d6c49f' },
  { value: 'dark', label: 'Dark', bg: '#0a0c10', fg: '#e5e7eb', ring: '#374151' },
];

const MODES: Array<{
  value: ReadingMode;
  label: string;
  desc: string;
  icon: typeof ScrollText;
}> = [
  {
    value: 'scroll',
    label: 'Scroll Mode',
    desc: 'Scroll vertically; swipe left/right for chapters',
    icon: ScrollText,
  },
  {
    value: 'swipe',
    label: 'Swipe Mode',
    desc: 'Book-like horizontal pages, no vertical scroll',
    icon: BookOpenCheck,
  },
];

export function ReaderSettingsSheet({
  open,
  onClose,
  preferences,
  onChange,
}: ReaderSettingsSheetProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-start sm:justify-end bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Reader settings"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--reader-surface)',
          color: 'var(--reader-text)',
          borderColor: 'var(--reader-border)',
        }}
        className="w-full sm:w-[380px] max-h-[85dvh] overflow-y-auto sm:mt-16 sm:mr-4 rounded-t-3xl sm:rounded-2xl border shadow-2xl px-5 pt-5 pb-[calc(env(safe-area-inset-bottom,0px)+2.25rem)] sm:pb-6 space-y-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider opacity-75">
            Reading Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reading Mode */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-65">Reading Mode</p>
          <div className="grid grid-cols-2 gap-2.5">
            {MODES.map(({ value, label, desc, icon: Icon }) => {
              const active = preferences.readingMode === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onChange({ readingMode: value })}
                  style={{
                    borderColor: active ? 'var(--reader-accent)' : 'var(--reader-border)',
                  }}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    active ? 'ring-2 ring-emerald-500/20' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <Icon
                      className="w-4 h-4"
                      style={{ color: active ? 'var(--reader-accent)' : undefined }}
                    />
                    <span>{label}</span>
                  </div>
                  <p className="text-[11px] opacity-70 mt-1 leading-snug">{desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Font Family (6 Options in 2-col grid) */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-65">Font</p>
          <div className="grid grid-cols-2 gap-2">
            {FONT_FAMILIES.map((f) => {
              const active = preferences.fontFamily === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => onChange({ fontFamily: f.value })}
                  style={{
                    fontFamily: f.fontCss,
                    borderColor: active ? 'var(--reader-accent)' : 'var(--reader-border)',
                    backgroundColor: active ? 'var(--reader-surface-muted)' : 'transparent',
                  }}
                  className={`px-3.5 py-2.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    active ? 'ring-2 ring-emerald-500/20' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  <p className="text-sm font-semibold leading-tight">{f.label}</p>
                  <p className="text-[11px] font-sans opacity-65 mt-0.5">{f.category}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Font Size */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-65">Font Size</p>
          <div
            style={{ borderColor: 'var(--reader-border)' }}
            className="grid grid-cols-4 gap-1.5 p-1 rounded-xl border"
          >
            {FONT_SIZES.map(({ value, label }, idx) => {
              const active = preferences.fontSize === value;
              const sizeClass =
                idx === 0
                  ? 'text-xs'
                  : idx === 1
                  ? 'text-sm'
                  : idx === 2
                  ? 'text-base'
                  : 'text-lg';
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onChange({ fontSize: value })}
                  style={{
                    backgroundColor: active ? 'var(--reader-accent)' : 'transparent',
                    color: active ? '#ffffff' : 'var(--reader-text)',
                  }}
                  className="min-h-[44px] rounded-lg font-serif-editorial font-bold flex flex-col items-center justify-center transition-colors cursor-pointer"
                  aria-label={`Font size ${label}`}
                >
                  <span className={sizeClass}>Aa</span>
                  <span className="text-[10px] font-sans font-medium opacity-80">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Theme */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-65">Theme</p>
          <div className="grid grid-cols-3 gap-2.5">
            {THEMES.map((t) => {
              const active = preferences.theme === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => onChange({ theme: t.value })}
                  style={{
                    backgroundColor: t.bg,
                    color: t.fg,
                    borderColor: active ? 'var(--reader-accent)' : t.ring,
                  }}
                  className="min-h-[48px] rounded-xl border-2 text-sm font-semibold flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
