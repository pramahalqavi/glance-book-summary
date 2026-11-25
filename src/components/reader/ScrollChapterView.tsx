import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { MarkdownContent } from './MarkdownContent';
import { hasNonEmptySelection } from '../../lib/touchSelection';
import type { Chapter, FontSize, ReaderFont } from '../../types/book';

interface ScrollChapterViewProps {
  chapter: Chapter;
  chapterCount: number;
  fontSize: FontSize;
  fontFamily: ReaderFont;
  hudVisible: boolean;
  initialScrollRatio?: number;
  isCompleted: boolean;
  onScrollRatioChange: (ratio: number) => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  onToggleHud: () => void;
  onMarkComplete: () => void;
  onBackToLibrary: () => void;
}

const EDGE_GUARD_PX = 24;
const DEADZONE_PX = 14;
const LONG_PRESS_MS = 260;
const HORIZONTAL_LOCK_RATIO = 1.35;
const SWIPE_COMMIT_PX = 64;
const SWIPE_VELOCITY_THRESHOLD = 0.35;

export function ScrollChapterView({
  chapter,
  chapterCount,
  fontSize,
  fontFamily,
  hudVisible,
  initialScrollRatio = 0,
  isCompleted,
  onScrollRatioChange,
  onPrevChapter,
  onNextChapter,
  onToggleHud,
  onMarkComplete,
  onBackToLibrary,
}: ScrollChapterViewProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const gestureRef = useRef<{
    active: boolean;
    pointer: 'none' | 'touch' | 'mouse';
    startX: number;
    startY: number;
    lastX: number;
    startTime: number;
    axis: 'none' | 'horizontal' | 'vertical' | 'select';
    moved: boolean;
  }>({
    active: false,
    pointer: 'none',
    startX: 0,
    startY: 0,
    lastX: 0,
    startTime: 0,
    axis: 'none',
    moved: false,
  });

  const hadSelectionAtStartRef = useRef(false);
  const wheelLockRef = useRef<number>(0);
  const initialScrollRatioRef = useRef(initialScrollRatio);
  const lastReportedRatioRef = useRef(-1);
  const scrollRafRef = useRef<number | null>(null);

  // Restore scroll position ONLY when switching chapters (never fight active user scrolling)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const targetRatio = initialScrollRatioRef.current;
    if (targetRatio > 0.02) {
      const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
      el.scrollTop = maxScroll * targetRatio;
    } else {
      el.scrollTop = 0;
    }
  }, [chapter.index]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  // Immediately yield touch tracking if native mobile selection activates
  useEffect(() => {
    const handleSelectionChange = () => {
      const g = gestureRef.current;
      if (g.active && g.pointer === 'touch' && g.axis === 'none' && hasNonEmptySelection()) {
        g.active = false;
        g.axis = 'select';
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const handleScroll = () => {
    if (scrollRafRef.current !== null) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const el = scrollRef.current;
      if (!el) return;
      const maxScroll = el.scrollHeight - el.clientHeight;
      const ratio = maxScroll <= 0 ? 1 : Math.max(0, Math.min(1, el.scrollTop / maxScroll));
      if (Math.abs(ratio - lastReportedRatioRef.current) >= 0.01 || ratio === 0 || ratio === 1) {
        lastReportedRatioRef.current = ratio;
        onScrollRatioChange(ratio);
      }
    });
  };

  const stateRef = useRef({
    chapterIndex: chapter.index,
    chapterCount,
    onNextChapter,
    onPrevChapter,
  });
  stateRef.current = {
    chapterIndex: chapter.index,
    chapterCount,
    onNextChapter,
    onPrevChapter,
  };

  const finishHorizontalGesture = useCallback((finalDx: number, startTime: number) => {
    const {
      chapterIndex: chIdx,
      chapterCount: chTotal,
      onNextChapter: nextFn,
      onPrevChapter: prevFn,
    } = stateRef.current;

    const elapsed = Math.max(1, performance.now() - startTime);
    const velocity = Math.abs(finalDx) / elapsed;
    const shouldCommit =
      Math.abs(finalDx) >= SWIPE_COMMIT_PX || velocity >= SWIPE_VELOCITY_THRESHOLD;

    setIsDragging(false);
    setDragX(0);

    if (shouldCommit) {
      if (finalDx < 0 && chIdx < chTotal - 1) {
        nextFn();
      } else if (finalDx > 0 && chIdx > 0) {
        prevFn();
      }
    }
  }, []);

  // Native touch listeners: yield 100% to mobile OS text selection & teardrop handles
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      hadSelectionAtStartRef.current = hasNonEmptySelection();

      if (hadSelectionAtStartRef.current) {
        gestureRef.current.active = false;
        return;
      }
      if (e.touches.length !== 1) return;

      const touch = e.touches[0];
      if (touch.clientX < EDGE_GUARD_PX) return;
      if ((e.target as HTMLElement | null)?.closest('button, a')) return;

      gestureRef.current = {
        active: true,
        pointer: 'touch',
        startX: touch.clientX,
        startY: touch.clientY,
        lastX: touch.clientX,
        startTime: performance.now(),
        axis: 'none',
        moved: false,
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      const g = gestureRef.current;
      if (!g.active || g.pointer !== 'touch' || e.touches.length !== 1) return;

      const touch = e.touches[0];
      const dx = touch.clientX - g.startX;
      const dy = touch.clientY - g.startY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      g.lastX = touch.clientX;

      if (absX > 6 || absY > 6) {
        g.moved = true;
      }

      if (g.axis === 'none') {
        const heldMs = performance.now() - g.startTime;
        if (hasNonEmptySelection() || heldMs >= LONG_PRESS_MS) {
          g.axis = 'select';
          g.active = false;
          return;
        }
        if (absX < DEADZONE_PX && absY < DEADZONE_PX) return;

        if (absX > absY * HORIZONTAL_LOCK_RATIO) {
          g.axis = 'horizontal';
          setIsDragging(true);
        } else {
          g.axis = 'vertical';
          g.active = false;
          return;
        }
      }

      if (g.axis === 'horizontal') {
        if (e.cancelable) e.preventDefault();
        const { chapterIndex: chIdx, chapterCount: chTotal } = stateRef.current;
        const atStart = chIdx === 0 && dx > 0;
        const atEnd = chIdx === chTotal - 1 && dx < 0;
        setDragX(atStart || atEnd ? dx * 0.25 : dx);
      }
    };

    const handleTouchEnd = () => {
      const g = gestureRef.current;
      if (!g.active || g.pointer !== 'touch') return;
      g.active = false;

      if (g.axis === 'horizontal') {
        finishHorizontalGesture(g.lastX - g.startX, g.startTime);
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    el.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [finishHorizontalGesture]);

  // Mouse drag support for desktop horizontal chapter swipe (outside selectable prose)
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    hadSelectionAtStartRef.current = hasNonEmptySelection();
    const target = e.target as HTMLElement;
    if (target.closest('button, a, .reader-prose, header')) return;
    gestureRef.current = {
      active: true,
      pointer: 'mouse',
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      startTime: performance.now(),
      axis: 'none',
      moved: false,
    };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const g = gestureRef.current;
    if (!g.active || g.pointer !== 'mouse') return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    g.lastX = e.clientX;

    if (absX > 8 || absY > 8) g.moved = true;

    if (g.axis === 'none') {
      if (absX < 14 && absY < 14) return;
      if (absX > absY * HORIZONTAL_LOCK_RATIO) {
        g.axis = 'horizontal';
        setIsDragging(true);
      } else {
        g.axis = 'vertical';
      }
    }

    if (g.axis === 'horizontal') {
      const atStart = chapter.index === 0 && dx > 0;
      const atEnd = chapter.index === chapterCount - 1 && dx < 0;
      setDragX(atStart || atEnd ? dx * 0.25 : dx);
    }
  };

  const onMouseUp = (e: React.MouseEvent) => {
    const g = gestureRef.current;
    if (!g.active || g.pointer !== 'mouse') return;
    g.active = false;
    if (g.axis === 'horizontal') {
      finishHorizontalGesture(e.clientX - g.startX, g.startTime);
    }
  };

  // Trackpad horizontal swipe support
  const onWheel = (e: React.WheelEvent) => {
    const absX = Math.abs(e.deltaX);
    const absY = Math.abs(e.deltaY);
    if (absX < 36 || absX <= absY * 1.5) return;

    const now = performance.now();
    if (now - wheelLockRef.current < 550) return;
    wheelLockRef.current = now;

    if (e.deltaX > 0 && chapter.index < chapterCount - 1) {
      onNextChapter();
    } else if (e.deltaX < 0 && chapter.index > 0) {
      onPrevChapter();
    }
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (gestureRef.current.moved || gestureRef.current.axis === 'select') {
      gestureRef.current.moved = false;
      gestureRef.current.axis = 'none';
      return;
    }
    if ((e.target as HTMLElement).closest('button, a')) return;
    if (hadSelectionAtStartRef.current || hasNonEmptySelection()) {
      hadSelectionAtStartRef.current = false;
      return;
    }
    onToggleHud();
  };

  const isFirst = chapter.index === 0;
  const isLast = chapter.index === chapterCount - 1;

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={() => {
        if (gestureRef.current.active && gestureRef.current.axis === 'horizontal') {
          gestureRef.current.active = false;
          setIsDragging(false);
          setDragX(0);
        }
      }}
      onWheel={onWheel}
      onClick={handleContainerClick}
      className="h-full w-full overflow-y-auto overscroll-x-none touch-pan-y"
    >
      <article
        style={{
          paddingTop: hudVisible
            ? 'calc(4.5rem + env(safe-area-inset-top, 0px))'
            : 'calc(1.25rem + env(safe-area-inset-top, 0px))',
          paddingBottom: hudVisible
            ? 'calc(4.5rem + env(safe-area-inset-bottom, 0px))'
            : 'calc(1.25rem + env(safe-area-inset-bottom, 0px))',
          transform: dragX !== 0 ? `translate3d(${dragX}px, 0, 0)` : undefined,
          transition: isDragging
            ? 'padding 250ms ease-out'
            : 'padding 250ms ease-out, transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        className="max-w-[680px] mx-auto px-6 sm:px-10 select-text"
      >
        <header className="mb-7">
          <p
            style={{ color: 'var(--reader-accent)' }}
            className="text-xs font-bold uppercase tracking-widest mb-2"
          >
            Chapter {chapter.index + 1} of {chapterCount}
          </p>
          <h1
            className={`reader-font-${fontFamily} text-2xl sm:text-3xl font-bold leading-tight`}
            style={{ fontFamily: 'var(--reader-font-family, var(--font-serif))' }}
          >
            {chapter.title}
          </h1>
        </header>

        <MarkdownContent
          markdown={chapter.contentMarkdown}
          fontSize={fontSize}
          fontFamily={fontFamily}
        />

        {/* End-of-chapter / End-of-book footer */}
        <footer
          style={{ borderColor: 'var(--reader-border)' }}
          className="mt-8 pt-6 border-t select-none"
        >
          {isLast ? (
            <div
              style={{
                backgroundColor: 'var(--reader-surface)',
                borderColor: 'var(--reader-border)',
              }}
              className="rounded-2xl border p-6 text-center space-y-3"
            >
              <CheckCircle2
                style={{ color: 'var(--reader-accent)' }}
                className="w-10 h-10 mx-auto"
              />
              <h2 className="font-serif-editorial text-xl font-bold">
                You&apos;ve reached the end!
              </h2>
              <p className="text-sm opacity-75">
                {isCompleted
                  ? 'This summary is marked as finished in your library.'
                  : 'Great job finishing this summary.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {!isCompleted && (
                  <button
                    type="button"
                    onClick={onMarkComplete}
                    style={{ backgroundColor: 'var(--reader-accent)' }}
                    className="min-h-[44px] px-6 rounded-full text-white text-sm font-semibold cursor-pointer"
                  >
                    Mark as Completed
                  </button>
                )}
                <button
                  type="button"
                  onClick={onBackToLibrary}
                  style={{ borderColor: 'var(--reader-border)' }}
                  className="min-h-[44px] px-6 rounded-full border text-sm font-medium cursor-pointer"
                >
                  Back to Library
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={isFirst}
                onClick={onPrevChapter}
                style={{ borderColor: 'var(--reader-border)' }}
                className="min-h-[44px] px-4 rounded-full border text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-35 cursor-pointer disabled:cursor-default"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </button>
              <button
                type="button"
                onClick={onNextChapter}
                style={{ backgroundColor: 'var(--reader-accent)' }}
                className="min-h-[44px] px-5 rounded-full text-white text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                Next Chapter
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </footer>
      </article>
    </div>
  );
}
