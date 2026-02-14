/**
 * @file Line Numbers Component
 *
 * Displays line numbers in the gutter with virtual scrolling support.
 */

import { useMemo, memo, type CSSProperties, type ReactNode } from "react";
import styles from "../VbaCodeEditor.module.css";

// =============================================================================
// Types
// =============================================================================

export type LineNumbersProps = {
  /** Total number of lines */
  readonly lineCount: number;
  /** Current scroll position (for syncing with code display) */
  readonly scrollTop?: number;
  /** Viewport height for calculating visible range */
  readonly viewportHeight?: number;
  /** Line height in pixels (default: 21) */
  readonly lineHeight?: number;
  /** Number of extra lines to render above/below viewport (default: 5) */
  readonly overscan?: number;
  /** Container style */
  readonly style?: CSSProperties;
};

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_LINE_HEIGHT = 21;
const DEFAULT_OVERSCAN = 5;

// =============================================================================
// Main Component
// =============================================================================

/**
 * Virtualized line numbers gutter component.
 *
 * When scrollTop and viewportHeight are provided, renders only visible
 * line numbers with spacers to maintain scroll position.
 * Falls back to full rendering when virtual props are not provided.
 */
export const LineNumbers = memo(function LineNumbers({
  lineCount,
  scrollTop = 0,
  viewportHeight = 0,
  lineHeight = DEFAULT_LINE_HEIGHT,
  overscan = DEFAULT_OVERSCAN,
  style,
}: LineNumbersProps): ReactNode {
  // Calculate visible range
  const { startLine, endLine, topHeight, bottomHeight } = useMemo(() => {
    // If no viewport info, render all (fallback for non-virtual mode)
    if (viewportHeight === 0) {
      return {
        startLine: 0,
        endLine: lineCount,
        topHeight: 0,
        bottomHeight: 0,
      };
    }

    const start = Math.max(0, Math.floor(scrollTop / lineHeight) - overscan);
    const end = Math.min(
      lineCount,
      Math.ceil((scrollTop + viewportHeight) / lineHeight) + overscan
    );

    return {
      startLine: start,
      endLine: end,
      topHeight: start * lineHeight,
      bottomHeight: (lineCount - end) * lineHeight,
    };
  }, [lineCount, scrollTop, viewportHeight, lineHeight, overscan]);

  // Generate visible line numbers
  const visibleNumbers = useMemo(() => {
    const numbers: number[] = [];
    for (let i = startLine; i < endLine; i++) {
      numbers.push(i + 1); // Line numbers are 1-based
    }
    return numbers;
  }, [startLine, endLine]);

  return (
    <div className={styles.lineNumbers} style={style}>
      {/* Top spacer */}
      {topHeight > 0 && <div style={{ height: topHeight }} />}

      {/* Visible line numbers */}
      {visibleNumbers.map((num) => (
        <div key={num} className={styles.lineNumber}>
          {num}
        </div>
      ))}

      {/* Bottom spacer */}
      {bottomHeight > 0 && <div style={{ height: bottomHeight }} />}
    </div>
  );
});
