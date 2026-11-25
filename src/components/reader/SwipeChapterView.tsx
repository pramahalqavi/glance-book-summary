import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { MarkdownContent } from './MarkdownContent';
import {
  applyTouchDragSelection,
  getCaretFromPoint,
  hasNonEmptySelection,
  selectWordAtCaret,
  type CaretPoint,
} from '../../lib/touchSelection';
import type { Chapter, FontSize, ReaderFont } from '../../types/book';

interface SwipeChapterViewProps {
  chapter: Chapter;
  chapterCount: number;
  fontSize: FontSize;
  fontFamily: ReaderFont;
  hudVisible: boolean;
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
const DEADZONE_PX = 14;
const MOUSE_DEADZONE_PX = 12;
const LONG_PRESS_MS = 260;
const HORIZONTAL_LOCK_RATIO = 1.2;
const SWIPE_COMMIT_PX = 52;
const SWIPE_VELOCITY_THRESHOLD = 0.3;

export function SwipeChapterView({
  chapter,
  chapterCount,
  fontSize,
  fontFamily,
  hudVisible,
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
  const outerRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const [viewportWidth, setViewportWidth] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  // Rubber-band offset ONLY at start/end of book; keeping `transform: none` when idle
  // avoids WebKit/Blink multi-column + CSS transform text-selection bugs on mobile.
  const [overscrollX, setOverscrollX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSelectingText, setIsSelectingText] = useState(false);

  const gestureRef = useRef<{
    active: boolean;
    pointer: 'none' | 'touch' | 'mouse';
    startX: number;
    startY: number;
    lastX: number;
    startTime: number;
    axis: 'none' | 'horizontal' | 'vertical' | 'select';
    moved: boolean;
    anchorCaret: CaretPoint | null;
  }>({
    active: false,
    pointer: 'none',
    startX: 0,
    startY: 0,
    lastX: 0,
    startTime: 0,
    axis: 'none',
    moved: false,
    anchorCaret: null,
  });

  const longPressTimerRef = useRef<number | null>(null);
  const scrollAnimRafRef = useRef<number | null>(null);
  const prevChapterIndexRef = useRef<number>(chapter.index);
  const hadSelectionAtStartRef = useRef(false);
  const wheelLockRef = useRef<number>(0);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const cancelScrollAnim = useCallback(() => {
    if (scrollAnimRafRef.current !== null) {
      cancelAnimationFrame(scrollAnimRafRef.current);
      scrollAnimRafRef.current = null;
    }
  }, []);

  const animateViewportScrollTo = useCallback(
    (targetLeft: number, immediate = false) => {
      const vp = viewportRef.current;
      if (!vp) return;
      cancelScrollAnim();

      if (immediate || Math.abs(vp.scrollLeft - targetLeft) < 1) {
        vp.scrollLeft = targetLeft;
        return;
      }

      const startLeft = vp.scrollLeft;
      const delta = targetLeft - startLeft;
      const duration = 250;
      const startTs = performance.now();

      const tick = (now: number) => {
        const currentVp = viewportRef.current;
        if (!currentVp) return;
        const t = Math.min(1, (now - startTs) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        currentVp.scrollLeft = startLeft + delta * eased;
        if (t < 1) {
          scrollAnimRafRef.current = requestAnimationFrame(tick);
        } else {
          currentVp.scrollLeft = targetLeft;
          scrollAnimRafRef.current = null;
        }
      };

      scrollAnimRafRef.current = requestAnimationFrame(tick);
    },
    [cancelScrollAnim]
  );

  const clampedPage = Math.max(0, Math.min(pageIndex, pageCount - 1));
  const stride = viewportWidth + COLUMN_GAP;
  const trackWidth =
    viewportWidth > 0 ? pageCount * viewportWidth + Math.max(0, pageCount - 1) * COLUMN_GAP : 0;

  // Measure viewport & dynamically compute CSS multi-column page count
  const measurePages = useCallback(() => {
    const vp = viewportRef.current;
    const content = contentRef.current;
    if (!vp || !content) return;

    const w = vp.clientWidth;
    const h = vp.clientHeight;
    if (w <= 0 || h <= 0) return;

    // Reset explicit width before measuring natural multi-column scrollWidth
    content.style.width = `${w}px`;
    setViewportWidth(w);
    setViewportHeight(h);

    requestAnimationFrame(() => {
      const vpNow = viewportRef.current;
      const contentNow = contentRef.current;
      if (!contentNow || !vpNow) return;
      const cw = vpNow.clientWidth;
      contentNow.style.width = `${cw}px`;
      const sw = contentNow.scrollWidth;
      const nextStride = cw + COLUMN_GAP;
      const computed = Math.max(1, Math.round((sw + COLUMN_GAP) / nextStride));
      // Expand contentRef's layout box to cover all columns so mobile hit-testing & selection handles work on Page 2+
      contentNow.style.width = `${computed * cw + Math.max(0, computed - 1) * COLUMN_GAP}px`;
      setPageCount(computed);
      onPageCountChange(computed);
    });
  }, [onPageCountChange]);

  useLayoutEffect(() => {
    measurePages();
  }, [
    measurePages,
    hudVisible,
    chapter.index,
    chapter.title,
    chapter.contentMarkdown,
    fontSize,
    fontFamily,
  ]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const observer = new ResizeObserver(() => measurePages());
    observer.observe(vp);
    return () => observer.disconnect();
  }, [measurePages]);

  // Align `viewportRef.scrollLeft` to `clampedPage * stride` (zero CSS transform when idle)
  useLayoutEffect(() => {
    if (viewportWidth <= 0 || isDragging) return;
    const chapterChanged = prevChapterIndexRef.current !== chapter.index;
    prevChapterIndexRef.current = chapter.index;
    animateViewportScrollTo(clampedPage * stride, chapterChanged);
  }, [clampedPage, stride, viewportWidth, isDragging, chapter.index, animateViewportScrollTo]);

  useEffect(() => {
    return () => {
      clearLongPressTimer();
      cancelScrollAnim();
    };
  }, [clearLongPressTimer, cancelScrollAnim]);

  // Immediately yield touch swipe tracking if native mobile selection activates
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

  const stateRef = useRef({
    clampedPage,
    pageCount,
    stride,
    chapterIndex: chapter.index,
    chapterCount,
    goNext,
    goPrev,
    animateViewportScrollTo,
  });
  stateRef.current = {
    clampedPage,
    pageCount,
    stride,
    chapterIndex: chapter.index,
    chapterCount,
    goNext,
    goPrev,
    animateViewportScrollTo,
  };

  const applyHorizontalDrag = useCallback((dx: number) => {
    const {
      clampedPage: curPage,
      pageCount: totalPages,
      stride: curStride,
      chapterIndex: chIdx,
      chapterCount: chTotal,
    } = stateRef.current;

    const atBookStart = chIdx === 0 && curPage === 0 && dx > 0;
    const atBookEnd = chIdx === chTotal - 1 && curPage === totalPages - 1 && dx < 0;
    const vp = viewportRef.current;

    if (atBookStart || atBookEnd) {
      if (vp) vp.scrollLeft = curPage * curStride;
      setOverscrollX(dx * 0.25);
    } else {
      setOverscrollX(0);
      if (vp) {
        const baseLeft = curPage * curStride;
        const maxLeft = Math.max(0, (totalPages - 1) * curStride);
        const targetLeft = baseLeft - dx;
        if (targetLeft < 0) {
          vp.scrollLeft = 0;
          setOverscrollX(-targetLeft * 0.35);
        } else if (targetLeft > maxLeft) {
          vp.scrollLeft = maxLeft;
          setOverscrollX((maxLeft - targetLeft) * 0.35);
        } else {
          vp.scrollLeft = targetLeft;
        }
      }
    }
  }, []);

  const finishSwipe = useCallback((dx: number, startTime: number) => {
    const {
      clampedPage: curPage,
      pageCount: totalPages,
      stride: curStride,
      chapterIndex: chIdx,
      chapterCount: chTotal,
      goNext: nextFn,
      goPrev: prevFn,
      animateViewportScrollTo: animScroll,
    } = stateRef.current;

    const elapsed = Math.max(1, performance.now() - startTime);
    const velocity = Math.abs(dx) / elapsed;
    const commit = Math.abs(dx) >= SWIPE_COMMIT_PX || velocity >= SWIPE_VELOCITY_THRESHOLD;

    setIsDragging(false);
    setOverscrollX(0);

    if (commit) {
      if (dx < 0 && (curPage < totalPages - 1 || chIdx < chTotal - 1)) {
        nextFn();
        return;
      }
      if (dx > 0 && (curPage > 0 || chIdx > 0)) {
        prevFn();
        return;
      }
    }

    animScroll(curPage * curStride, false);
  }, []);

  // Mobile touch listeners:
  // Never call preventDefault() or mutate Selection on long-press / active selection so
  // Android Chrome & iOS Safari native teardrop handles, magnifier, and Copy bar work 100% natively.
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      hadSelectionAtStartRef.current = hasNonEmptySelection();

      // If text is already selected, stay completely out of the way so native teardrop handles drag freely
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
        anchorCaret: null,
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
        // User held still long enough for a long-press or native selection started -> yield 100% to OS
        if (hasNonEmptySelection() || heldMs >= LONG_PRESS_MS) {
          g.axis = 'select';
          g.active = false;
          return;
        }
        if (absX < DEADZONE_PX && absY < DEADZONE_PX) return;

        if (absX > absY * HORIZONTAL_LOCK_RATIO) {
          g.axis = 'horizontal';
          cancelScrollAnim();
          setIsDragging(true);
        } else {
          g.axis = 'vertical';
          g.active = false;
          return;
        }
      }

      if (g.axis === 'horizontal') {
        if (e.cancelable) e.preventDefault();
        applyHorizontalDrag(dx);
      }
    };

    const handleTouchEnd = () => {
      const g = gestureRef.current;
      if (!g.active || g.pointer !== 'touch') return;
      g.active = false;

      if (g.axis === 'horizontal') {
        finishSwipe(g.lastX - g.startX, g.startTime);
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
  }, [cancelScrollAnim, applyHorizontalDrag, finishSwipe]);

  // Desktop mouse gesture:
  // Quick click-and-drag (< 260ms) anywhere swipes the page;
  // Long-press hold (>= 260ms) + drag on text selects words/lines smoothly.
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, a')) return;

    clearLongPressTimer();
    const existingSelText = window.getSelection()?.toString() ?? '';
    hadSelectionAtStartRef.current = existingSelText.trim().length > 0;

    // Prevent immediate native drag-selection so quick mouse drags swipe the page cleanly
    e.preventDefault();

    if (hadSelectionAtStartRef.current) {
      window.getSelection()?.removeAllRanges();
    }

    const startX = e.clientX;
    const startY = e.clientY;
    const anchorCaret = getCaretFromPoint(startX, startY, contentRef.current, true);

    // Support quick double-click to select a single word
    if (e.detail >= 2 && anchorCaret) {
      selectWordAtCaret(anchorCaret);
      hadSelectionAtStartRef.current = true;
      gestureRef.current.active = false;
      return;
    }

    gestureRef.current = {
      active: true,
      pointer: 'mouse',
      startX,
      startY,
      lastX: startX,
      startTime: performance.now(),
      axis: 'none',
      moved: false,
      anchorCaret,
    };

    if (anchorCaret) {
      longPressTimerRef.current = window.setTimeout(() => {
        longPressTimerRef.current = null;
        const g = gestureRef.current;
        if (g.active && g.pointer === 'mouse' && g.axis === 'none') {
          g.axis = 'select';
          setIsSelectingText(true);
          selectWordAtCaret(anchorCaret);
        }
      }, LONG_PRESS_MS);
    }
  };

  // Window-level mousemove / mouseup so dragging outside the column bounds still tracks smoothly
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      const g = gestureRef.current;
      if (!g.active || g.pointer !== 'mouse') return;

      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      g.lastX = e.clientX;

      if (absX > 6 || absY > 6) {
        g.moved = true;
      }

      if (g.axis === 'none') {
        const heldMs = performance.now() - g.startTime;
        if (heldMs >= LONG_PRESS_MS && g.anchorCaret) {
          clearLongPressTimer();
          g.axis = 'select';
          setIsSelectingText(true);
          if (!hasNonEmptySelection()) {
            selectWordAtCaret(g.anchorCaret);
          }
        } else {
          if (absX < MOUSE_DEADZONE_PX && absY < MOUSE_DEADZONE_PX) return;
          clearLongPressTimer();
          if (absX > absY * HORIZONTAL_LOCK_RATIO) {
            g.axis = 'horizontal';
            cancelScrollAnim();
            window.getSelection()?.removeAllRanges();
            setIsDragging(true);
          } else {
            g.axis = 'vertical';
            return;
          }
        }
      }

      if (g.axis === 'select') {
        if (!g.anchorCaret) return;
        if (Math.hypot(dx, dy) >= 6) {
          applyTouchDragSelection(g.anchorCaret, e.clientX, e.clientY, contentRef.current);
        }
        return;
      }

      if (g.axis === 'horizontal') {
        applyHorizontalDrag(dx);
      }
    };

    const handleWindowMouseUp = (e: MouseEvent) => {
      const g = gestureRef.current;
      if (!g.active || g.pointer !== 'mouse') return;
      clearLongPressTimer();
      g.active = false;
      setIsSelectingText(false);

      if (g.axis === 'horizontal') {
        finishSwipe(e.clientX - g.startX, g.startTime);
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [clearLongPressTimer, cancelScrollAnim, applyHorizontalDrag, finishSwipe]);

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

  // Tap/click toggles HUD (ignored when dragging, selecting, or dismissing a text selection)
  const onClick = (e: React.MouseEvent) => {
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

  const isLastChapter = chapter.index === chapterCount - 1;

  return (
    <div
      ref={outerRef}
      onMouseDown={onMouseDown}
      onWheel={onWheel}
      onClick={onClick}
      style={{
        paddingTop: hudVisible
          ? 'calc(4rem + env(safe-area-inset-top, 0px))'
          : 'calc(1.25rem + env(safe-area-inset-top, 0px))',
        paddingBottom: hudVisible
          ? 'calc(4rem + env(safe-area-inset-bottom, 0px))'
          : 'calc(1.25rem + env(safe-area-inset-bottom, 0px))',
      }}
      className={`h-full w-full overflow-hidden flex flex-col items-center justify-center px-6 sm:px-10 ${
        isSelectingText ? 'cursor-text' : isDragging ? 'cursor-grabbing' : ''
      }`}
    >
      {/* Centered optimal-width book page viewport — paginated via scrollLeft so text has zero CSS transform when idle */}
      <div
        ref={viewportRef}
        onScroll={(e) => {
          if (!isDragging && scrollAnimRafRef.current === null && viewportWidth > 0) {
            const expected = clampedPage * stride;
            if (Math.abs(e.currentTarget.scrollLeft - expected) > 2) {
              e.currentTarget.scrollLeft = expected;
            }
          }
        }}
        className="w-full max-w-[660px] h-full overflow-x-hidden overflow-y-hidden relative no-scrollbar"
      >
        <div
          ref={contentRef}
          className="select-text"
          style={{
            width: trackWidth > 0 ? `${trackWidth}px` : '100%',
            height: viewportHeight > 0 ? `${viewportHeight}px` : '100%',
            columnWidth: viewportWidth > 0 ? `${viewportWidth}px` : '100%',
            columnGap: `${COLUMN_GAP}px`,
            columnFill: 'auto',
            transform: overscrollX !== 0 ? `translate3d(${overscrollX}px, 0, 0)` : undefined,
            transition: isDragging ? 'none' : 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
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
              className="mt-6 rounded-2xl border p-5 text-center space-y-2.5 break-inside-avoid select-none"
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
