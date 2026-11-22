import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { MarkdownContent } from './MarkdownContent';
import type { Chapter, FontSize } from '../../types/book';

interface ScrollChapterViewProps {
  chapter: Chapter;
  chapterCount: number;
  fontSize: FontSize;
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
const HORIZONTAL_LOCK_RATIO = 1.35;
const SWIPE_COMMIT_PX = 64;
const SWIPE_VELOCITY_THRESHOLD = 0.35;

export function ScrollChapterView({
  chapter,
  chapterCount,
  fontSize,
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
    startX: number;
    startY: number;
    startTime: number;
    axis: 'none' | 'horizontal' | 'vertical';
    moved: boolean;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    startTime: 0,
    axis: 'none',
    moved: false,
  });

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

  const handleScroll = () => {
    if (scrollRafRef.current !== null) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const el = scrollRef.current;
      if (!el) return;
      const maxScroll = el.scrollHeight - el.clientHeight;
      const ratio = maxScroll <= 0 ? 1 : Math.max(0, Math.min(1, el.scrollTop / maxScroll));
      // Only notify parent when progress moves noticeably (>= 1%)
      if (Math.abs(ratio - lastReportedRatioRef.current) >= 0.01 || ratio === 0 || ratio === 1) {
        lastReportedRatioRef.current = ratio;
        onScrollRatioChange(ratio);
      }
    });
  };

  // Touch handlers with gesture disambiguation (PRD §6)
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    // Respect iOS Safari left-edge back swipe gesture
    if (touch.clientX < EDGE_GUARD_PX) return;

    gestureRef.current = {
      active: true,
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: performance.now(),
      axis: 'none',
      moved: false,
    };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const g = gestureRef.current;
    if (!g.active || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - g.startX;
    const dy = touch.clientY - g.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absX > 6 || absY > 6) {
      g.moved = true;
    }

    if (g.axis === 'none') {
      if (absX < 10 && absY < 10) return;
      if (absX > absY * HORIZONTAL_LOCK_RATIO) {
        g.axis = 'horizontal';
        setIsDragging(true);
      } else {
        g.axis = 'vertical';
        return;
      }
    }

    if (g.axis === 'horizontal') {
      // Dampen edge overscroll on first/last chapter
      const atStart = chapter.index === 0 && dx > 0;
      const atEnd = chapter.index === chapterCount - 1 && dx < 0;
      const dampened = atStart || atEnd ? dx * 0.25 : dx;
      setDragX(dampened);
    }
  };

  const finishHorizontalGesture = (finalDx: number) => {
    const g = gestureRef.current;
    const elapsed = Math.max(1, performance.now() - g.startTime);
    const velocity = Math.abs(finalDx) / elapsed;
    const shouldCommit = Math.abs(finalDx) >= SWIPE_COMMIT_PX || velocity >= SWIPE_VELOCITY_THRESHOLD;

    setIsDragging(false);
    setDragX(0);

    if (shouldCommit) {
      if (finalDx < 0 && chapter.index < chapterCount - 1) {
        onNextChapter();
      } else if (finalDx > 0 && chapter.index > 0) {
        onPrevChapter();
      }
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const g = gestureRef.current;
    if (!g.active) return;
    g.active = false;

    if (g.axis === 'horizontal') {
      const touch = e.changedTouches[0];
      const dx = touch ? touch.clientX - g.startX : dragX;
      finishHorizontalGesture(dx);
    }
  };

  // Mouse drag support for desktop horizontal chapter swipe
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    // Do not hijack button/link clicks
    if ((e.target as HTMLElement).closest('button, a')) return;
    gestureRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startTime: performance.now(),
      axis: 'none',
      moved: false,
    };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const g = gestureRef.current;
    if (!g.active) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

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
    if (!g.active) return;
    g.active = false;
    if (g.axis === 'horizontal') {
      finishHorizontalGesture(e.clientX - g.startX);
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
    if (gestureRef.current.moved) return;
    if ((e.target as HTMLElement).closest('button, a')) return;
    const selection = window.getSelection()?.toString();
    if (selection) return;
    onToggleHud();
  };

  const isFirst = chapter.index === 0;
  const isLast = chapter.index === chapterCount - 1;

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
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
      className="h-full w-full overflow-y-auto overscroll-x-none"
    >
      <article
        style={{
          transform: dragX !== 0 ? `translate3d(${dragX}px, 0, 0)` : undefined,
          transition: isDragging ? 'none' : 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        className="max-w-[680px] mx-auto px-6 sm:px-10 pt-20 pb-28 select-text"
      >
        <header className="mb-7">
          <p
            style={{ color: 'var(--reader-accent)' }}
            className="text-xs font-bold uppercase tracking-widest mb-2"
          >
            Chapter {chapter.index + 1} of {chapterCount}
          </p>
          <h1 className="font-serif-editorial text-2xl sm:text-3xl font-bold leading-tight">
            {chapter.title}
          </h1>
        </header>

        <MarkdownContent markdown={chapter.contentMarkdown} fontSize={fontSize} />

        {/* End-of-chapter / End-of-book footer */}
        <footer
          style={{ borderColor: 'var(--reader-border)' }}
          className="mt-12 pt-8 border-t space-y-4"
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

          <p className="text-center text-xs opacity-50 pt-1">
            Tip: Swipe horizontally or use ← / → keys to switch chapters
          </p>
        </footer>
      </article>
    </div>
  );
}
