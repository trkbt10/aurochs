/**
 * @file Document viewport component
 *
 * Scrollable viewport container for DOCX document rendering.
 * Handles vertical scrolling and zoom.
 */

import {
  useCallback,
  useRef,
  useLayoutEffect,
  type ReactNode,
  type CSSProperties,
  type UIEvent,
} from "react";

// =============================================================================
// Types
// =============================================================================

export type DocumentViewportProps = {
  /** Viewport children (document content) */
  readonly children: ReactNode;
  /** Zoom level (1 = 100%) */
  readonly zoom: number;
  /** Scroll position callback */
  readonly onScroll?: (scrollTop: number, scrollLeft: number) => void;
  /** Viewport size change callback */
  readonly onViewportResize?: (width: number, height: number) => void;
  /** Custom class name */
  readonly className?: string;
  /** Custom style */
  readonly style?: CSSProperties;
};

// =============================================================================
// Component
// =============================================================================

/**
 * Scrollable viewport container for document editing.
 *
 * Features:
 * - Vertical scrolling for multi-page documents
 * - Horizontal scrolling when zoomed in
 * - Zoom via CSS transform
 * - Scroll position reporting
 */
export function DocumentViewport({
  children,
  zoom,
  onScroll,
  onViewportResize,
  className,
  style,
}: DocumentViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Track viewport size changes
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !onViewportResize) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        onViewportResize(width, height);
      }
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [onViewportResize]);

  // Handle scroll events
  const handleScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      if (!onScroll) {
        return;
      }
      const target = e.currentTarget;
      onScroll(target.scrollTop, target.scrollLeft);
    },
    [onScroll]
  );

  const containerStyle: CSSProperties = {
    position: "relative",
    width: "100%",
    height: "100%",
    overflow: "auto",
    backgroundColor: "var(--bg-tertiary)",
    ...style,
  };

  const contentWrapperStyle: CSSProperties = {
    transformOrigin: "top center",
    transform: `scale(${zoom})`,
    // Ensure minimum dimensions for scrolling
    minWidth: "fit-content",
  };

  return (
    <div
      ref={containerRef}
      className={className}
      style={containerStyle}
      onScroll={handleScroll}
    >
      <div style={contentWrapperStyle}>{children}</div>
    </div>
  );
}
