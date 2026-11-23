import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { MarkdownContent } from './MarkdownContent';
import type { Chapter, FontSize, ReaderFont } from '../../types/book';

interface SwipeChapterViewProps {
  chapter: Chapter;
  chapterCount: number;
  fontSize: FontSize;
  fontFamily: ReaderFont;
  pageIndex: number;
  isCompleted: boolean;
  onPageCountChange: (count: number) => void;
  onPageChange: (nextPage: number) => void;
  onPrevChapter: (jumpToLastPage: boolean) => void;
  onNextChapter: () => void;
  onToggleHud: () => void;
  onMarkComplete: () => void;
  onBackToLibrary: () => void;
}

const EDGE_GUARD_PX = 20;
const COLUMN_GAP = 40;
const SWIPE_COMMIT_PX = 52;
const SWIPE_VELOCITY_THRESHOLD = 0.3;

export function SwipeChapterView({
  chapter,
  chapterCount,
  fontSize,
  fontFamily,
  pageIndex,
  isCompleted,
  onPageCountChange,
  onPageChange,
  onPrevChapter,
  onNextChapter,
  onToggleHud,
  onMarkComplete,
  onBackToLibrary,
}: SwipeChapterViewProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const [viewportWidth, setViewportWidth] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const gestureRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    startTime: number;
    moved: boolean;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    startTime: 0,
    moved: false,
  });

  const wheelLockRef = useRef<number>(0);

  // Measure viewport & dynamically compute CSS multi-column page count
  const measurePages = useCallback(() => {
    const vp = viewportRef.current;
    const content = contentRef.current;
    if (!vp || !content) return;

    const w = vp.clientWidth;
    const h = vp.clientHeight;
    if (w <= 0 || h <= 0) return;

    setViewportWidth(w);
    setViewportHeight(h);

    // Wait a frame after width/height apply so scrollWidth reflects exact multi-column pagination
    requestAnimationFrame(() => {
      if (!contentRef.current || !viewportRef.current) return;
      const cw = viewportRef.current.clientWidth;
      const sw = contentRef.current.scrollWidth;
      const stride = cw + COLUMN_GAP;
      const computed = Math.max(1, Math.round((sw + COLUMN_GAP) / stride));
      setPageCount(computed);
      onPageCountChange(computed);
    });
  }, [onPageCountChange]);

  useLayoutEffect(() => {
    measurePages();
  }, [measurePages, chapter.index, chapter.title, chapter.contentMarkdown, fontSize, fontFamily]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const observer = new ResizeObserver(() => measurePages());
    observer.observe(vp);
    return () => observer.disconnect();
  }, [measurePages]);

  const clampedPage = Math.max(0, Math.min(pageIndex, pageCount - 1));
  const stride = viewportWidth + COLUMN_GAP;
  const baseTranslate = -(clampedPage * stride);

  const goNext = useCallback(() => {
    if (clampedPage < pageCount - 1) {
      onPageChange(clampedPage + 1);
    } else if (chapter.index < chapterCount - 1) {
      onNextChapter();
    }
  }, [clampedPage, pageCount, onPageChange, chapter.index, chapterCount, onNextChapter]);

  const goPrev = useCallback(() => {
    if (clampedPage > 0) {
      onPageChange(clampedPage - 1);
    } else if (chapter.index > 0) {
      onPrevChapter(true);
    }
  }, [clampedPage, onPageChange, chapter.index, onPrevChapter]);

  const finishSwipe = (dx: number) => {
    const elapsed = Math.max(1, performance.now() - gestureRef.current.startTime);
    const velocity = Math.abs(dx) / elapsed;
    const commit = Math.abs(dx) >= SWIPE_COMMIT_PX || velocity >= SWIPE_VELOCITY_THRESHOLD;

    setIsDragging(false);
    setDragX(0);

    if (commit) {
      if (dx < 0) goNext();
      else if (dx > 0) goPrev();
    }
  };

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    if (touch.clientX < EDGE_GUARD_PX) return;
    gestureRef.current = {
      active: true,
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: performance.now(),
      moved: false,
    };
    setIsDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const g = gestureRef.current;
    if (!g.active || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - g.startX;
    if (Math.abs(dx) > 6) g.moved = true;

    const atBookStart = chapter.index === 0 && clampedPage === 0 && dx > 0;
    const atBookEnd = chapter.index === chapterCount - 1 && clampedPage === pageCount - 1 && dx < 0;
    setDragX(atBookStart || atBookEnd ? dx * 0.25 : dx);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const g = gestureRef.current;
    if (!g.active) return;
    g.active = false;
    const touch = e.changedTouches[0];
    finishSwipe(touch ? touch.clientX - g.startX : dragX);
  };

  // Mouse drag handlers
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, a')) return;
    gestureRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startTime: performance.now(),
      moved: false,
    };
    setIsDragging(true);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const g = gestureRef.current;
    if (!g.active) return;
    const dx = e.clientX - g.startX;
    if (Math.abs(dx) > 8) g.moved = true;

    const atBookStart = chapter.index === 0 && clampedPage === 0 && dx > 0;
    const atBookEnd = chapter.index === chapterCount - 1 && clampedPage === pageCount - 1 && dx < 0;
    setDragX(atBookStart || atBookEnd ? dx * 0.25 : dx);
  };

  const onMouseUp = (e: React.MouseEvent) => {
    const g = gestureRef.current;
    if (!g.active) return;
    g.active = false;
    if (g.moved) {
      finishSwipe(e.clientX - g.startX);
    } else {
      setIsDragging(false);
      setDragX(0);
    }
  };

  // Trackpad horizontal swipe
  const onWheel = (e: React.WheelEvent) => {
    const absX = Math.abs(e.deltaX);
    const absY = Math.abs(e.deltaY);
    if (absX < 30 || absX <= absY * 1.2) return;

    const now = performance.now();
    if (now - wheelLockRef.current < 420) return;
    wheelLockRef.current = now;

    if (e.deltaX > 0) goNext();
    else goPrev();
  };

  // Tap zones: left 20% = prev, right 20% = next, center 60% = toggle HUD
  const onClick = (e: React.MouseEvent) => {
    if (gestureRef.current.moved) return;
    if ((e.target as HTMLElement).closest('button, a')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    if (relX < 0.18) {
      goPrev();
    } else if (relX > 0.82) {
      goNext();
    } else {
      onToggleHud();
    }
  };

  const isLastChapter = chapter.index === chapterCount - 1;

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={() => {
        if (gestureRef.current.active) {
          gestureRef.current.active = false;
          setIsDragging(false);
          setDragX(0);
        }
      }}
      onWheel={onWheel}
      onClick={onClick}
      className="h-full w-full overflow-hidden flex flex-col items-center justify-center px-6 sm:px-10 pt-16 pb-16 select-none touch-pan-y"
    >
      {/* Centered optimal-width book page viewport */}
      <div
        ref={viewportRef}
        className="w-full max-w-[660px] h-full overflow-hidden relative"
      >
        <div
          ref={contentRef}
          style={{
            height: viewportHeight > 0 ? `${viewportHeight}px` : '100%',
            columnWidth: viewportWidth > 0 ? `${viewportWidth}px` : '100%',
            columnGap: `${COLUMN_GAP}px`,
            columnFill: 'auto',
            transform: `translate3d(${baseTranslate + dragX}px, 0, 0)`,
            transition: isDragging
              ? 'none'
              : 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)',
            willChange: 'transform',
          }}
        >
          <header className="mb-5 break-inside-avoid">
            <p
              style={{ color: 'var(--reader-accent)' }}
              className="text-xs font-bold uppercase tracking-widest mb-1.5"
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

          {isLastChapter && (
            <div
              style={{
                backgroundColor: 'var(--reader-surface)',
                borderColor: 'var(--reader-border)',
              }}
              className="mt-6 rounded-2xl border p-5 text-center space-y-2.5 break-inside-avoid"
            >
              <CheckCircle2
                style={{ color: 'var(--reader-accent)' }}
                className="w-8 h-8 mx-auto"
              />
              <h2 className="font-serif-editorial text-lg font-bold">End of Summary</h2>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                {!isCompleted && (
                  <button
                    type="button"
                    onClick={onMarkComplete}
                    style={{ backgroundColor: 'var(--reader-accent)' }}
                    className="min-h-[44px] px-5 rounded-full text-white text-xs font-semibold cursor-pointer"
                  >
                    Mark as Completed
                  </button>
                )}
                <button
                  type="button"
                  onClick={onBackToLibrary}
                  style={{ borderColor: 'var(--reader-border)' }}
                  className="min-h-[44px] px-5 rounded-full border text-xs font-medium cursor-pointer"
                >
                  Back to Library
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
