import { BookOpenCheck, ScrollText, X } from 'lucide-react';
import type { FontSize, ReaderPreferences, ReaderTheme, ReadingMode } from '../../types/book';

interface ReaderSettingsSheetProps {
  open: boolean;
  onClose: () => void;
  preferences: ReaderPreferences;
  onChange: (patch: Partial<ReaderPreferences>) => void;
}

const FONT_SIZES: Array<{ value: FontSize; label: string; sample: string }> = [
  { value: 'sm', label: 'Small', sample: 'A' },
  { value: 'md', label: 'Medium', sample: 'A' },
  { value: 'lg', label: 'Large', sample: 'A' },
  { value: 'xl', label: 'XL', sample: 'A' },
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
  { value: 'dark', label: 'Dark', bg: '#000000', fg: '#e5e7eb', ring: '#374151' },
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
        className="w-full sm:w-[360px] sm:mt-16 sm:mr-4 rounded-t-3xl sm:rounded-2xl border shadow-2xl p-5 pb-safe space-y-5"
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
