import {
  BookOpenCheck,
  CheckCircle2,
  Download,
  Languages,
  Loader2,
  ScrollText,
  Trash2,
  X,
} from 'lucide-react';
import type {
  BookLanguage,
  FontSize,
  ReaderFont,
  ReaderPreferences,
  ReaderTheme,
  ReadingMode,
  TranslationDirection,
} from '../../types/book';
import {
  PACK_INFO,
  getDirectionForSource,
  type DownloadProgress,
} from '../../lib/translator';

interface ReaderSettingsSheetProps {
  open: boolean;
  onClose: () => void;
  preferences: ReaderPreferences;
  onChange: (patch: Partial<ReaderPreferences>) => void;
  sourceLang: BookLanguage;
  translateEnabled: boolean;
  isTranslating: boolean;
  translationError: string | null;
  onToggleTranslate: (enabled: boolean) => void;
  packStatuses: Record<TranslationDirection, boolean>;
  downloadingDirection: TranslationDirection | null;
  downloadProgress: DownloadProgress | null;
  onDownloadPack: (dir: TranslationDirection) => void;
  onDeletePack: (dir: TranslationDirection) => void;
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

function formatMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

export function ReaderSettingsSheet({
  open,
  onClose,
  preferences,
  onChange,
  sourceLang,
  translateEnabled,
  isTranslating,
  translationError,
  onToggleTranslate,
  packStatuses,
  downloadingDirection,
  downloadProgress,
  onDownloadPack,
  onDeletePack,
}: ReaderSettingsSheetProps) {
  if (!open) return null;

  const activeDir = getDirectionForSource(sourceLang);
  const activePackInfo = PACK_INFO[activeDir];
  const isActivePackReady = packStatuses[activeDir];
  const isDownloadingActive = downloadingDirection === activeDir;

  const originalLabel = sourceLang === 'id' ? 'Bahasa Indonesia' : 'English';
  const targetLabel = sourceLang === 'id' ? 'English' : 'Bahasa Indonesia';

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
        className="w-full sm:w-[390px] max-h-[85dvh] overflow-y-auto sm:mt-16 sm:mr-4 rounded-t-3xl sm:rounded-2xl border shadow-2xl px-5 pt-5 pb-[calc(env(safe-area-inset-bottom,0px)+2.25rem)] sm:pb-6 space-y-5"
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

        {/* Offline Translation (Contextual en <-> id) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-65 flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5" />
              Translation (Offline)
            </p>
            {isActivePackReady && (
              <span
                style={{ color: 'var(--reader-accent)' }}
                className="text-[11px] font-semibold inline-flex items-center gap-1"
              >
                <CheckCircle2 className="w-3 h-3" />
                Pack Ready
              </span>
            )}
          </div>

          <div
            style={{
              backgroundColor: 'var(--reader-surface-muted)',
              borderColor: 'var(--reader-border)',
            }}
            className="rounded-xl border p-3 space-y-2.5"
          >
            {/* Original vs Translated Switch */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => onToggleTranslate(false)}
                style={{
                  backgroundColor: !translateEnabled ? 'var(--reader-surface)' : 'transparent',
                  borderColor: !translateEnabled ? 'var(--reader-accent)' : 'transparent',
                  color: !translateEnabled ? 'var(--reader-text)' : 'var(--reader-muted)',
                }}
                className="min-h-[42px] px-2.5 rounded-lg border-2 text-xs font-semibold transition-all cursor-pointer"
              >
                Original ({originalLabel === 'Bahasa Indonesia' ? 'ID' : 'EN'})
              </button>
              <button
                type="button"
                disabled={downloadingDirection !== null}
                onClick={() => onToggleTranslate(true)}
                style={{
                  backgroundColor: translateEnabled ? 'var(--reader-accent)' : 'transparent',
                  borderColor: translateEnabled ? 'var(--reader-accent)' : 'var(--reader-border)',
                  color: translateEnabled ? '#ffffff' : 'var(--reader-text)',
                }}
                className="min-h-[42px] px-2.5 rounded-lg border-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isTranslating || isDownloadingActive ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                ) : !isActivePackReady ? (
                  <Download className="w-3.5 h-3.5 shrink-0" />
                ) : null}
                <span className="truncate">
                  {sourceLang === 'en' ? 'Bahasa Indonesia' : 'English'}
                </span>
              </button>
            </div>

            {!isActivePackReady && !isDownloadingActive && (
              <p className="text-[11px] opacity-70 leading-snug">
                Tap <strong>{targetLabel}</strong> to download the offline language pack (~
                {activePackInfo.approxMB} MB) once—then translate any chapter offline.
              </p>
            )}

            {/* Live Download Progress Bar */}
            {downloadingDirection && downloadProgress && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] font-medium">
                  <span>
                    Downloading {PACK_INFO[downloadingDirection].label}...
                  </span>
                  <span>{downloadProgress.percent}%</span>
                </div>
                <div
                  style={{ backgroundColor: 'var(--reader-border)' }}
                  className="h-2 w-full rounded-full overflow-hidden"
                >
                  <div
                    style={{
                      width: `${downloadProgress.percent}%`,
                      backgroundColor: 'var(--reader-accent)',
                    }}
                    className="h-full rounded-full transition-all duration-150"
                  />
                </div>
                <p className="text-[10px] opacity-65">
                  {formatMB(downloadProgress.receivedBytes)} / {formatMB(downloadProgress.totalBytes)}{' '}
                  MB
                </p>
              </div>
            )}

            {translationError && (
              <p className="text-[11px] text-rose-500 font-medium">{translationError}</p>
            )}
          </div>

          {/* Offline Pack Management */}
          <details className="group">
            <summary className="text-[11px] font-medium opacity-70 hover:opacity-100 cursor-pointer select-none list-none flex items-center justify-between py-0.5">
              <span>Manage offline language packs</span>
              <span className="text-[10px] opacity-60 group-open:hidden">Show</span>
              <span className="text-[10px] opacity-60 hidden group-open:inline">Hide</span>
            </summary>
            <div className="mt-2 space-y-1.5">
              {(['enid', 'iden'] as TranslationDirection[]).map((dir) => {
                const info = PACK_INFO[dir];
                const ready = packStatuses[dir];
                const busy = downloadingDirection === dir;
                return (
                  <div
                    key={dir}
                    style={{ borderColor: 'var(--reader-border)' }}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{info.label}</p>
                      <p className="text-[10px] opacity-65">
                        {ready ? `Downloaded · ~${info.approxMB} MB` : `~${info.approxMB} MB`}
                      </p>
                    </div>
                    {ready ? (
                      <button
                        type="button"
                        onClick={() => onDeletePack(dir)}
                        aria-label={`Delete ${info.label} language pack`}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-500/10 shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={downloadingDirection !== null}
                        onClick={() => onDownloadPack(dir)}
                        style={{
                          borderColor: 'var(--reader-border)',
                          color: 'var(--reader-accent)',
                        }}
                        className="h-8 px-2.5 rounded-full border text-[11px] font-semibold inline-flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        {busy ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Download className="w-3 h-3" />
                        )}
                        {busy ? `${downloadProgress?.percent ?? 0}%` : 'Download'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </details>
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
