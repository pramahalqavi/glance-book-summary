import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  List,
  PanelLeft,
  ScrollText,
  Settings2,
} from 'lucide-react';
import { fetchBookSummary } from '../lib/repository';
import { useApp } from '../context/AppContext';
import { ScrollChapterView } from '../components/reader/ScrollChapterView';
import { SwipeChapterView } from '../components/reader/SwipeChapterView';
import { ReaderSettingsSheet } from '../components/reader/ReaderSettingsSheet';
import { TocDrawer } from '../components/reader/TocDrawer';
import type { BookSummary } from '../types/book';

export function ReaderPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const {
    preferences,
    updatePreferences,
    isBookmarked,
    toggleBookmark,
    getProgress,
    updateProgress,
  } = useApp();

  const [summary, setSummary] = useState<BookSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const initialChapterParam = Number(searchParams.get('chapter'));
  const savedProgress = bookId ? getProgress(bookId) : undefined;

  const [chapterIndex, setChapterIndex] = useState<number>(() => {
    if (!Number.isNaN(initialChapterParam) && searchParams.has('chapter')) {
      return Math.max(0, initialChapterParam);
    }
    return savedProgress?.chapterIndex ?? 0;
  });

  const [pageIndex, setPageIndex] = useState<number>(savedProgress?.pageIndex ?? 0);
  const [pageCount, setPageCount] = useState<number>(1);
  const [scrollRatio, setScrollRatio] = useState<number>(savedProgress?.scrollRatio ?? 0);
  const [slideDir, setSlideDir] = useState<'none' | 'next' | 'prev'>('none');

  const [hudVisible, setHudVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [desktopTocPinned, setDesktopTocPinned] = useState(false);

  const jumpToLastPageRef = useRef(false);

  useEffect(() => {
    if (!bookId) return;
    let active = true;
    setLoading(true);
    fetchBookSummary(bookId)
      .then((data) => {
        if (active) {
          setSummary(data);
          if (data && chapterIndex >= data.chapters.length) {
            setChapterIndex(0);
          }
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

  // Sync URL query param & persist reading progress
  useEffect(() => {
    if (!bookId || !summary) return;
    setSearchParams({ chapter: String(chapterIndex) }, { replace: true });
    updateProgress(bookId, {
      chapterIndex,
      pageIndex,
      scrollRatio,
    });
  }, [bookId, summary, chapterIndex, pageIndex, scrollRatio, setSearchParams, updateProgress]);

  const chapterCount = summary?.chapters.length ?? 0;
  const currentChapter = summary?.chapters[chapterIndex] ?? null;

  const goToChapter = useCallback(
    (nextIndex: number, dir: 'none' | 'next' | 'prev' = 'none', jumpToLast = false) => {
      if (!summary) return;
      const clamped = Math.max(0, Math.min(nextIndex, summary.chapters.length - 1));
      if (clamped === chapterIndex) return;
      jumpToLastPageRef.current = jumpToLast;
      setSlideDir(dir);
      setChapterIndex(clamped);
      setPageIndex(0);
      setScrollRatio(0);
    },
    [summary, chapterIndex]
  );

  const handleNextChapter = useCallback(() => {
    if (chapterIndex < chapterCount - 1) {
      goToChapter(chapterIndex + 1, 'next', false);
    }
  }, [chapterIndex, chapterCount, goToChapter]);

  const handlePrevChapter = useCallback(
    (jumpToLast = false) => {
      if (chapterIndex > 0) {
        goToChapter(chapterIndex - 1, 'prev', jumpToLast);
      }
    },
    [chapterIndex, goToChapter]
  );

  const handlePageCountChange = useCallback((count: number) => {
    setPageCount(count);
    if (jumpToLastPageRef.current) {
      jumpToLastPageRef.current = false;
      setPageIndex(Math.max(0, count - 1));
    } else {
      setPageIndex((prev) => Math.max(0, Math.min(prev, count - 1)));
    }
  }, []);

  // Unified Prev/Next step for keyboard & side margin buttons
  const handleStepNext = useCallback(() => {
    if (preferences.readingMode === 'swipe') {
      if (pageIndex < pageCount - 1) {
        setPageIndex((p) => p + 1);
      } else {
        handleNextChapter();
      }
    } else {
      handleNextChapter();
    }
  }, [preferences.readingMode, pageIndex, pageCount, handleNextChapter]);

  const handleStepPrev = useCallback(() => {
    if (preferences.readingMode === 'swipe') {
      if (pageIndex > 0) {
        setPageIndex((p) => p - 1);
      } else {
        handlePrevChapter(true);
      }
    } else {
      handlePrevChapter(false);
    }
  }, [preferences.readingMode, pageIndex, handlePrevChapter]);

  // Keyboard navigation (ArrowLeft / ArrowRight / Escape)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (settingsOpen || tocOpen) {
        if (e.key === 'Escape') {
          setSettingsOpen(false);
          setTocOpen(false);
        }
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleStepNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleStepPrev();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleStepNext, handleStepPrev, settingsOpen, tocOpen]);

  const overallProgress = useMemo(() => {
    if (chapterCount === 0) return 0;
    const withinChapter =
      preferences.readingMode === 'swipe'
        ? (pageIndex + 1) / Math.max(1, pageCount)
        : Math.max(0.08, scrollRatio);
    return Math.min(100, Math.round(((chapterIndex + withinChapter) / chapterCount) * 100));
  }, [chapterCount, chapterIndex, pageIndex, pageCount, preferences.readingMode, scrollRatio]);

  const canGoPrev =
    preferences.readingMode === 'swipe' ? chapterIndex > 0 || pageIndex > 0 : chapterIndex > 0;
  const canGoNext =
    preferences.readingMode === 'swipe'
      ? chapterIndex < chapterCount - 1 || pageIndex < pageCount - 1
      : chapterIndex < chapterCount - 1;

  const themeClass = `reader-theme-${preferences.theme}`;
  const slideClass =
    slideDir === 'next'
      ? 'animate-chapter-next'
      : slideDir === 'prev'
      ? 'animate-chapter-prev'
      : '';

  if (loading) {
    return (
      <div
        className={`h-[100dvh] w-full flex items-center justify-center ${themeClass}`}
        style={{ backgroundColor: 'var(--reader-bg)', color: 'var(--reader-text)' }}
      >
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm opacity-70">Opening summary...</p>
        </div>
      </div>
    );
  }

  if (!summary || !currentChapter || !bookId) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center p-6 text-center bg-[#fafaf9]">
        <h1 className="font-serif-editorial text-2xl font-bold text-slate-900">
          Summary unavailable
        </h1>
        <p className="text-sm text-stone-500 mt-1">Return to your library to choose another book.</p>
        <Link
          to="/"
          className="mt-5 px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-medium"
        >
          Back to Discover
        </Link>
      </div>
    );
  }

  const saved = isBookmarked(bookId);
  const isCompleted = Boolean(savedProgress?.completed);

  return (
    <div
      className={`h-[100dvh] w-full overflow-hidden flex flex-col relative ${themeClass}`}
      style={{
        backgroundColor: 'var(--reader-bg)',
        color: 'var(--reader-text)',
      }}
    >
      {/* Always-visible ultra-thin top progress bar */}
      <div
        className="fixed top-0 inset-x-0 h-[3px] z-40 pointer-events-none"
        style={{ backgroundColor: 'var(--reader-border)' }}
      >
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${overallProgress}%`,
            backgroundColor: 'var(--reader-accent)',
          }}
        />
      </div>

      {/* Top HUD Bar */}
      <header
        style={{
          backgroundColor: 'var(--reader-surface)',
          borderColor: 'var(--reader-border)',
        }}
        className={`fixed top-0 inset-x-0 z-30 border-b pt-safe transition-transform duration-250 ${
          hudVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="h-14 px-3 sm:px-5 flex items-center justify-between gap-2 max-w-6xl mx-auto">
          <div className="flex items-center gap-1 min-w-0">
            <Link
              to={`/book/${bookId}`}
              aria-label="Back to book details"
              className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-black/5 shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{summary.title}</p>
              <p className="text-[11px] opacity-60 truncate">{currentChapter.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Quick Mode Pill */}
            <button
              type="button"
              onClick={() =>
                updatePreferences({
                  readingMode: preferences.readingMode === 'scroll' ? 'swipe' : 'scroll',
                })
              }
              title="Switch reading mode (Scroll / Swipe)"
              style={{ borderColor: 'var(--reader-border)' }}
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-full border text-xs font-medium hover:bg-black/5 cursor-pointer"
            >
              {preferences.readingMode === 'scroll' ? (
                <>
                  <ScrollText className="w-3.5 h-3.5" />
                  Scroll
                </>
              ) : (
                <>
                  <BookOpenCheck className="w-3.5 h-3.5" />
                  Swipe
                </>
              )}
            </button>

            {/* Desktop Pinned TOC Sidebar Toggle */}
            <button
              type="button"
              onClick={() => setDesktopTocPinned((v) => !v)}
              aria-label="Toggle Table of Contents sidebar"
              title="Toggle Table of Contents sidebar"
              className="hidden lg:flex w-11 h-11 rounded-full items-center justify-center hover:bg-black/5 cursor-pointer"
            >
              <PanelLeft
                className="w-5 h-5"
                style={{ color: desktopTocPinned ? 'var(--reader-accent)' : undefined }}
              />
            </button>

            {/* Mobile/Tablet TOC Drawer Toggle */}
            <button
              type="button"
              onClick={() => setTocOpen(true)}
              aria-label="Open Table of Contents"
              className="lg:hidden w-11 h-11 rounded-full flex items-center justify-center hover:bg-black/5 cursor-pointer"
            >
              <List className="w-5 h-5" />
            </button>

            {/* Bookmark */}
            <button
              type="button"
              onClick={() => toggleBookmark(bookId)}
              aria-label={saved ? 'Remove bookmark' : 'Bookmark book'}
              className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-black/5 cursor-pointer"
            >
              <Bookmark
                className={`w-5 h-5 ${saved ? 'fill-current' : ''}`}
                style={{ color: saved ? 'var(--reader-accent)' : undefined }}
              />
            </button>

            {/* Typography & Mode Settings */}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Reader settings"
              className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-black/5 cursor-pointer"
            >
              <Settings2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Reader Area (+ Optional Collapsible Desktop Sidebar) */}
      <div className="flex-1 h-full flex overflow-hidden relative">
        {desktopTocPinned && (
          <aside
            style={{
              backgroundColor: 'var(--reader-surface)',
              borderColor: 'var(--reader-border)',
            }}
            className="hidden lg:flex flex-col w-72 border-r pt-16 pb-16 shrink-0 overflow-y-auto"
          >
            <div className="px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider opacity-60">
                Table of Contents
              </p>
            </div>
            <nav className="px-2 space-y-1">
              {summary.chapters.map((ch) => {
                const active = ch.index === chapterIndex;
                return (
                  <button
                    key={ch.index}
                    type="button"
                    onClick={() =>
                      goToChapter(ch.index, ch.index > chapterIndex ? 'next' : 'prev', false)
                    }
                    style={{
                      backgroundColor: active ? 'var(--reader-quote-bg)' : 'transparent',
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl flex items-start gap-2.5 text-sm hover:bg-black/5 transition-colors cursor-pointer"
                  >
                    <span
                      style={{
                        backgroundColor: active ? 'var(--reader-accent)' : 'var(--reader-border)',
                        color: active ? '#ffffff' : 'var(--reader-text)',
                      }}
                      className="w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5"
                    >
                      {ch.index + 1}
                    </span>
                    <span className={active ? 'font-semibold' : 'opacity-80'}>{ch.title}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        )}

        {/* Active Chapter Surface */}
        <div className="flex-1 h-full relative overflow-hidden">
          {/* Desktop Subtle Hoverable Side Margin Arrows */}
          <button
            type="button"
            disabled={!canGoPrev}
            onClick={handleStepPrev}
            aria-label={preferences.readingMode === 'swipe' ? 'Previous page' : 'Previous chapter'}
            style={{
              backgroundColor: 'var(--reader-surface)',
              borderColor: 'var(--reader-border)',
            }}
            className="hidden md:flex fixed left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full border shadow-sm items-center justify-center opacity-35 hover:opacity-100 disabled:opacity-0 transition-opacity cursor-pointer disabled:pointer-events-none"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            disabled={!canGoNext}
            onClick={handleStepNext}
            aria-label={preferences.readingMode === 'swipe' ? 'Next page' : 'Next chapter'}
            style={{
              backgroundColor: 'var(--reader-surface)',
              borderColor: 'var(--reader-border)',
            }}
            className="hidden md:flex fixed right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full border shadow-sm items-center justify-center opacity-35 hover:opacity-100 disabled:opacity-0 transition-opacity cursor-pointer disabled:pointer-events-none"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div key={`${preferences.readingMode}-${chapterIndex}`} className={`h-full w-full ${slideClass}`}>
            {preferences.readingMode === 'scroll' ? (
              <ScrollChapterView
                chapter={currentChapter}
                chapterCount={chapterCount}
                fontSize={preferences.fontSize}
                initialScrollRatio={
                  savedProgress?.chapterIndex === chapterIndex ? savedProgress.scrollRatio : 0
                }
                isCompleted={isCompleted}
                onScrollRatioChange={setScrollRatio}
                onPrevChapter={() => handlePrevChapter(false)}
                onNextChapter={handleNextChapter}
                onToggleHud={() => setHudVisible((v) => !v)}
                onMarkComplete={() => updateProgress(bookId, { completed: true })}
                onBackToLibrary={() => navigate('/')}
              />
            ) : (
              <SwipeChapterView
                chapter={currentChapter}
                chapterCount={chapterCount}
                fontSize={preferences.fontSize}
                pageIndex={pageIndex}
                isCompleted={isCompleted}
                onPageCountChange={handlePageCountChange}
                onPageChange={setPageIndex}
                onPrevChapter={(jumpToLast) => handlePrevChapter(jumpToLast)}
                onNextChapter={handleNextChapter}
                onToggleHud={() => setHudVisible((v) => !v)}
                onMarkComplete={() => updateProgress(bookId, { completed: true })}
                onBackToLibrary={() => navigate('/')}
              />
            )}
          </div>
        </div>
      </div>

      {/* Bottom HUD Bar */}
      <footer
        style={{
          backgroundColor: 'var(--reader-surface)',
          borderColor: 'var(--reader-border)',
        }}
        className={`fixed bottom-0 inset-x-0 z-30 border-t pb-safe transition-transform duration-250 ${
          hudVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="h-14 px-3 sm:px-6 max-w-3xl mx-auto flex items-center justify-between gap-4">
          <button
            type="button"
            disabled={!canGoPrev}
            onClick={handleStepPrev}
            aria-label="Previous"
            className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-black/5 disabled:opacity-30 cursor-pointer disabled:cursor-default"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 text-center min-w-0">
            <p className="text-xs font-semibold truncate">
              Chapter {chapterIndex + 1} of {chapterCount}
              {preferences.readingMode === 'swipe' && (
                <span className="opacity-65 font-normal">
                  {' '}
                  · Page {Math.min(pageIndex + 1, pageCount)} of {pageCount}
                </span>
              )}
            </p>
            <div className="mt-1.5 flex items-center justify-center gap-1.5">
              {summary.chapters.map((ch) => (
                <button
                  key={ch.index}
                  type="button"
                  onClick={() =>
                    goToChapter(ch.index, ch.index > chapterIndex ? 'next' : 'prev', false)
                  }
                  aria-label={`Jump to chapter ${ch.index + 1}`}
                  style={{
                    backgroundColor:
                      ch.index <= chapterIndex ? 'var(--reader-accent)' : 'var(--reader-border)',
                  }}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    ch.index === chapterIndex ? 'w-6' : 'w-2 opacity-60 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={!canGoNext}
            onClick={handleStepNext}
            aria-label="Next"
            className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-black/5 disabled:opacity-30 cursor-pointer disabled:cursor-default"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </footer>

      {/* Reader Settings Popover / Bottom Sheet */}
      <ReaderSettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        preferences={preferences}
        onChange={updatePreferences}
      />

      {/* Mobile / Tablet TOC Drawer */}
      <TocDrawer
        open={tocOpen}
        onClose={() => setTocOpen(false)}
        bookTitle={summary.title}
        bookAuthor={summary.author}
        chapters={summary.chapters}
        currentChapterIndex={chapterIndex}
        onSelectChapter={(idx) =>
          goToChapter(idx, idx > chapterIndex ? 'next' : 'prev', false)
        }
      />
    </div>
  );
}
