/**
 * @file Match Highlight Overlay
 *
 * Renders search match highlights in the code editor.
 */

import { useMemo, type ReactNode, type CSSProperties } from "react";
import type { SearchMatch } from "../../../context/vba-editor/types";
import { calculateSelectionRects } from "./cursor-utils";

// =============================================================================
// Styles
// =============================================================================

const MATCH_STYLE: CSSProperties = {
  position: "absolute",
  backgroundColor: "var(--vba-match-color, rgba(255, 213, 0, 0.4))",
  pointerEvents: "none",
  borderRadius: 2,
};

const CURRENT_MATCH_STYLE: CSSProperties = {
  position: "absolute",
  backgroundColor: "var(--vba-current-match-color, rgba(255, 140, 0, 0.6))",
  pointerEvents: "none",
  borderRadius: 2,
  boxShadow: "0 0 0 1px rgba(255, 140, 0, 0.8)",
};

// =============================================================================
// Types
// =============================================================================

export type MatchHighlightOverlayProps = {
  readonly matches: readonly SearchMatch[];
  readonly currentMatchIndex: number;
  readonly lines: readonly string[];
  readonly lineHeight: number;
  readonly measureText: (text: string) => number;
  readonly visibleRange: { start: number; end: number };
};

// =============================================================================
// Component
// =============================================================================

/**
 * Render search match highlights.
 *
 * Only renders matches within the visible range for performance.
 */
export function MatchHighlightOverlay({
  matches,
  currentMatchIndex,
  lines,
  lineHeight,
  measureText,
  visibleRange,
}: MatchHighlightOverlayProps): ReactNode {
  // Filter to visible matches
  const visibleMatches = useMemo(() => {
    return matches.filter(
      (m) => m.line >= visibleRange.start + 1 && m.line <= visibleRange.end,
    );
  }, [matches, visibleRange]);

  // Calculate rects for all visible matches
  const matchRects = useMemo(() => {
    return visibleMatches.map((match) => {
      const globalIndex = matches.indexOf(match);
      const isCurrent = globalIndex === currentMatchIndex;

      const rects = calculateSelectionRects({
        startLine: match.line,
        startColumn: match.startColumn,
        endLine: match.line, // Single-line match for now
        endColumn: match.endColumn,
        lines,
        lineHeight,
        measureText,
      });

      return { match, rects, isCurrent, globalIndex };
    });
  }, [visibleMatches, matches, currentMatchIndex, lines, lineHeight, measureText]);

  if (matchRects.length === 0) {
    return null;
  }

  return (
    <>
      {matchRects.map(({ rects, isCurrent, globalIndex }) =>
        rects.map((rect, rectIdx) => (
          <div
            key={`${globalIndex}-${rectIdx}`}
            style={{
              ...(isCurrent ? CURRENT_MATCH_STYLE : MATCH_STYLE),
              left: rect.x,
              top: rect.y,
              width: rect.width,
              height: rect.height,
            }}
          />
        )),
      )}
    </>
  );
}
