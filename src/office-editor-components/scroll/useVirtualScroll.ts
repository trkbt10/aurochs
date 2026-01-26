/**
 * @file useVirtualScroll hook
 *
 * A small virtual scroll state manager (scrollTop/Left + viewport size).
 * Intended to power custom grid renderers (e.g. XLSX sheet) where the DOM
 * does not use native scroll containers.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type ViewportRect = {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
};

export type UseVirtualScrollOptions = {
  readonly contentWidth: number;
  readonly contentHeight: number;
};

export type UseVirtualScrollReturn = {
  readonly scrollTop: number;
  readonly scrollLeft: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly contentWidth: number;
  readonly contentHeight: number;
  readonly maxScrollTop: number;
  readonly maxScrollLeft: number;
  readonly viewportRect: ViewportRect;
  readonly containerRef: (node: HTMLElement | null) => void;
  readonly setScrollTop: (value: number | ((prev: number) => number)) => void;
  readonly setScrollLeft: (value: number | ((prev: number) => number)) => void;
  readonly handleKeyDown: (event: React.KeyboardEvent) => void;
};

function isWheelEvent(event: Event): event is globalThis.WheelEvent {
  return event instanceof globalThis.WheelEvent;
}

/**
 * Hook that manages scroll position and viewport size for custom virtual scrollers.
 */
export function useVirtualScroll({
  contentWidth,
  contentHeight,
}: UseVirtualScrollOptions): UseVirtualScrollReturn {
  const elementRef = useRef<HTMLElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  const maxScrollTop = Math.max(0, contentHeight - viewportHeight);
  const maxScrollLeft = Math.max(0, contentWidth - viewportWidth);

  // If content/viewport sizes change, ensure current scroll positions remain within bounds.
  // This prevents "over-scrolling" into blank space when limits shrink.
  useEffect(() => {
    setScrollTop((prev) => Math.max(0, Math.min(maxScrollTop, prev)));
  }, [maxScrollTop]);

  useEffect(() => {
    setScrollLeft((prev) => Math.max(0, Math.min(maxScrollLeft, prev)));
  }, [maxScrollLeft]);

  const setScrollTopClamped = useCallback(
    (value: number | ((prev: number) => number)): void => {
      setScrollTop((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        return Math.max(0, Math.min(maxScrollTop, next));
      });
    },
    [maxScrollTop],
  );

  const setScrollLeftClamped = useCallback(
    (value: number | ((prev: number) => number)): void => {
      setScrollLeft((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        return Math.max(0, Math.min(maxScrollLeft, next));
      });
    },
    [maxScrollLeft],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent): void => {
      const scrollAmount = 100;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setScrollTopClamped((prev) => prev + scrollAmount);
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setScrollTopClamped((prev) => prev - scrollAmount);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setScrollLeftClamped((prev) => prev + scrollAmount);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setScrollLeftClamped((prev) => prev - scrollAmount);
      }
      if (event.key === "PageDown") {
        event.preventDefault();
        setScrollTopClamped((prev) => prev + viewportHeight);
      }
      if (event.key === "PageUp") {
        event.preventDefault();
        setScrollTopClamped((prev) => prev - viewportHeight);
      }
      if (event.key === "Home") {
        event.preventDefault();
        setScrollTopClamped(0);
        setScrollLeftClamped(0);
      }
      if (event.key === "End") {
        event.preventDefault();
        setScrollTopClamped(maxScrollTop);
      }
    },
    [maxScrollTop, viewportHeight, setScrollLeftClamped, setScrollTopClamped],
  );

  useEffect(() => {
    const element = elementRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewportWidth(entry.contentRect.width);
        setViewportHeight(entry.contentRect.height);
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) {
      return;
    }

    const onWheel = (event: Event): void => {
      if (!isWheelEvent(event)) {
        return;
      }
      event.preventDefault();
      setScrollLeftClamped((prev) => prev + event.deltaX);
      setScrollTopClamped((prev) => prev + event.deltaY);
    };

    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [setScrollLeftClamped, setScrollTopClamped]);

  const containerRef = useCallback((node: HTMLElement | null): void => {
    elementRef.current = node;
  }, []);

  return {
    scrollTop,
    scrollLeft,
    viewportWidth,
    viewportHeight,
    contentWidth,
    contentHeight,
    maxScrollTop,
    maxScrollLeft,
    viewportRect: {
      top: scrollTop,
      left: scrollLeft,
      width: viewportWidth,
      height: viewportHeight,
    },
    containerRef,
    setScrollTop: setScrollTopClamped,
    setScrollLeft: setScrollLeftClamped,
    handleKeyDown,
  };
}
