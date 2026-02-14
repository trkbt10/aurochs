/**
 * @file Virtual Lines Hook
 *
 * Manages virtual scroll state for rendering only visible lines.
 */

import { useCallback, useEffect, useRef, useState } from "react";

// =============================================================================
// Types
// =============================================================================

export type VirtualLinesState = {
  /** Current scroll position from top */
  readonly scrollTop: number;
  /** Viewport height in pixels */
  readonly viewportHeight: number;
  /** Range of visible line indices (0-based, end is exclusive) */
  readonly visibleRange: { start: number; end: number };
  /** Height of spacer above visible lines */
  readonly topSpacerHeight: number;
  /** Height of spacer below visible lines */
  readonly bottomSpacerHeight: number;
  /** Total content height */
  readonly totalHeight: number;
};

export type VirtualLinesConfig = {
  /** Height of each line in pixels */
  readonly lineHeight: number;
  /** Number of extra lines to render above/below viewport */
  readonly overscan: number;
};

export type UseVirtualLinesResult = {
  /** Current virtual scroll state */
  readonly state: VirtualLinesState;
  /** Update scroll position */
  readonly setScrollTop: (value: number) => void;
  /** Ref callback to attach to container element */
  readonly containerRef: (node: HTMLElement | null) => void;
};

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_LINE_HEIGHT = 21;
const DEFAULT_OVERSCAN = 5;

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for managing virtual scroll state for code lines.
 *
 * @param lineCount - Total number of lines
 * @param config - Configuration for line height and overscan
 * @returns Virtual scroll state and control functions
 *
 * @example
 * ```tsx
 * const { state, setScrollTop, containerRef } = useVirtualLines(
 *   lines.length,
 *   { lineHeight: 21, overscan: 5 }
 * );
 *
 * // In render:
 * <div ref={containerRef} onScroll={e => setScrollTop(e.currentTarget.scrollTop)}>
 *   <div style={{ height: state.topSpacerHeight }} />
 *   {lines.slice(state.visibleRange.start, state.visibleRange.end).map(...)}
 *   <div style={{ height: state.bottomSpacerHeight }} />
 * </div>
 * ```
 */
export function useVirtualLines(
  lineCount: number,
  config?: Partial<VirtualLinesConfig>
): UseVirtualLinesResult {
  const lineHeight = config?.lineHeight ?? DEFAULT_LINE_HEIGHT;
  const overscan = config?.overscan ?? DEFAULT_OVERSCAN;

  const containerRef = useRef<HTMLElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  // Calculate total content height
  const totalHeight = lineCount * lineHeight;

  // Calculate visible range
  const startLine = Math.max(0, Math.floor(scrollTop / lineHeight) - overscan);
  const endLine = Math.min(
    lineCount,
    Math.ceil((scrollTop + viewportHeight) / lineHeight) + overscan
  );

  // Calculate spacer heights
  const topSpacerHeight = startLine * lineHeight;
  const bottomSpacerHeight = (lineCount - endLine) * lineHeight;

  // Handle container ref
  const setContainer = useCallback((node: HTMLElement | null) => {
    containerRef.current = node;
    if (node) {
      setViewportHeight(node.clientHeight);
    }
  }, []);

  // Observe container resize
  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewportHeight(entry.contentRect.height);
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const state: VirtualLinesState = {
    scrollTop,
    viewportHeight,
    visibleRange: { start: startLine, end: endLine },
    topSpacerHeight,
    bottomSpacerHeight,
    totalHeight,
  };

  return {
    state,
    setScrollTop,
    containerRef: setContainer,
  };
}
