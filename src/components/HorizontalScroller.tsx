import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HorizontalScrollerProps {
  children: React.ReactNode;
  ariaLabel?: string;
  role?: React.AriaRole;
  className?: string;
  scrollStep?: number;
  deps?: ReadonlyArray<unknown>;
}

export function HorizontalScroller({
  children,
  ariaLabel,
  role,
  className = '',
  scrollStep = 260,
  deps = [],
}: HorizontalScrollerProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollButtons();

    const observer = new ResizeObserver(() => updateScrollButtons());
    observer.observe(el);

    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      observer.disconnect();
      el.removeEventListener('wheel', onWheel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateScrollButtons, ...deps]);

  const scrollByDirection = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction === 'left' ? -scrollStep : scrollStep,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative">
      {canScrollLeft && (
        <div
          style={{
            background: 'linear-gradient(to right, var(--reader-bg) 55%, transparent)',
          }}
          className="hidden sm:flex items-center absolute left-0 top-0 bottom-1 pr-6 z-10 pointer-events-none"
        >
          <button
            type="button"
            onClick={() => scrollByDirection('left')}
            aria-label={ariaLabel ? `Scroll ${ariaLabel} left` : 'Scroll left'}
            style={{
              backgroundColor: 'var(--reader-surface)',
              borderColor: 'var(--reader-border)',
              color: 'var(--reader-text)',
            }}
            className="pointer-events-auto w-9 h-9 rounded-full border shadow-sm flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={updateScrollButtons}
        role={role}
        aria-label={ariaLabel}
        className={`flex overflow-x-auto no-scrollbar scroll-smooth ${className}`}
      >
        {children}
      </div>

      {canScrollRight && (
        <div
          style={{
            background: 'linear-gradient(to left, var(--reader-bg) 55%, transparent)',
          }}
          className="hidden sm:flex items-center justify-end absolute right-0 top-0 bottom-1 pl-6 z-10 pointer-events-none"
        >
          <button
            type="button"
            onClick={() => scrollByDirection('right')}
            aria-label={ariaLabel ? `Scroll ${ariaLabel} right` : 'Scroll right'}
            style={{
              backgroundColor: 'var(--reader-surface)',
              borderColor: 'var(--reader-border)',
              color: 'var(--reader-text)',
            }}
            className="pointer-events-auto w-9 h-9 rounded-full border shadow-sm flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
