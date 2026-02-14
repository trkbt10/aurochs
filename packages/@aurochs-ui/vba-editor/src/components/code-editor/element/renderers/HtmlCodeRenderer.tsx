/**
 * @file HTML Code Renderer
 *
 * Unified renderer that handles:
 * - Line numbers
 * - Syntax-highlighted code
 * - Selection highlights
 * - Search match highlights
 * - Cursor
 *
 * All in a single coordinate system for perfect alignment.
 */

import { useMemo, memo, type ReactNode, type CSSProperties } from "react";
import type { Token } from "../../code/syntax-highlight";
import type { CodeRendererProps, HighlightRange, HighlightType } from "./types";
import { getTokenStyleCss } from "./token-colors";
import styles from "../../VbaCodeEditor.module.css";

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_LINE_NUMBER_WIDTH = 48;

// =============================================================================
// Highlight Styles
// =============================================================================

const HIGHLIGHT_STYLES: Record<HighlightType, CSSProperties> = {
  selection: {
    backgroundColor: "var(--vba-selection-color, rgba(51, 144, 255, 0.3))",
  },
  match: {
    backgroundColor: "var(--vba-match-color, rgba(255, 213, 0, 0.4))",
    borderRadius: 2,
  },
  currentMatch: {
    backgroundColor: "var(--vba-current-match-color, rgba(255, 140, 0, 0.6))",
    borderRadius: 2,
    boxShadow: "0 0 0 1px rgba(255, 140, 0, 0.8)",
  },
};

// =============================================================================
// Highlight Utilities
// =============================================================================

type LineHighlight = {
  readonly startColumn: number;
  readonly endColumn: number;
  readonly type: HighlightType;
};

/**
 * Get highlights for a specific line.
 */
function getLineHighlights(
  lineNumber: number, // 1-based
  lineLength: number,
  highlights: readonly HighlightRange[],
): readonly LineHighlight[] {
  const result: LineHighlight[] = [];

  for (const h of highlights) {
    // Check if this highlight intersects with this line
    if (lineNumber < h.startLine || lineNumber > h.endLine) {
      continue;
    }

    let startCol: number;
    let endCol: number;

    if (lineNumber === h.startLine && lineNumber === h.endLine) {
      // Single line highlight
      startCol = h.startColumn;
      endCol = h.endColumn;
    } else if (lineNumber === h.startLine) {
      // Start of multi-line
      startCol = h.startColumn;
      endCol = lineLength + 1;
    } else if (lineNumber === h.endLine) {
      // End of multi-line
      startCol = 1;
      endCol = h.endColumn;
    } else {
      // Middle of multi-line
      startCol = 1;
      endCol = lineLength + 1;
    }

    result.push({
      startColumn: startCol,
      endColumn: endCol,
      type: h.type,
    });
  }

  // Sort by type priority (selection < match < currentMatch)
  const priority: Record<HighlightType, number> = {
    selection: 0,
    match: 1,
    currentMatch: 2,
  };
  result.sort((a, b) => priority[a.type] - priority[b.type]);

  return result;
}

// =============================================================================
// Token with Highlight Rendering
// =============================================================================

type TokenSegment = {
  readonly text: string;
  readonly tokenType: Token["type"];
  readonly highlightType?: HighlightType;
};

/**
 * Split tokens by highlight boundaries.
 */
function splitTokensByHighlights(
  tokens: readonly Token[],
  highlights: readonly LineHighlight[],
): readonly TokenSegment[] {
  if (highlights.length === 0) {
    return tokens.map((t) => ({
      text: t.text,
      tokenType: t.type,
    }));
  }

  const segments: TokenSegment[] = [];
  let currentCol = 1; // 1-based column position

  for (const token of tokens) {
    const tokenStart = currentCol;
    const tokenEnd = currentCol + token.text.length;
    let pos = 0;

    while (pos < token.text.length) {
      const col = tokenStart + pos;

      // Find highest priority highlight at this position
      let activeHighlight: HighlightType | undefined;
      for (const h of highlights) {
        if (col >= h.startColumn && col < h.endColumn) {
          activeHighlight = h.type;
        }
      }

      // Find how far this segment extends
      let segmentEnd = token.text.length;
      for (const h of highlights) {
        if (h.startColumn > col && h.startColumn < tokenStart + segmentEnd) {
          segmentEnd = h.startColumn - tokenStart;
        }
        if (h.endColumn > col && h.endColumn < tokenStart + segmentEnd) {
          segmentEnd = h.endColumn - tokenStart;
        }
      }

      segments.push({
        text: token.text.slice(pos, segmentEnd),
        tokenType: token.type,
        highlightType: activeHighlight,
      });

      pos = segmentEnd;
    }

    currentCol = tokenEnd;
  }

  return segments;
}

/**
 * Render a token segment.
 */
function renderSegment(segment: TokenSegment, key: number): ReactNode {
  const tokenStyle = segment.tokenType === "whitespace"
    ? undefined
    : getTokenStyleCss(segment.tokenType);

  const highlightStyle = segment.highlightType
    ? HIGHLIGHT_STYLES[segment.highlightType]
    : undefined;

  const style = tokenStyle || highlightStyle
    ? { ...tokenStyle, ...highlightStyle }
    : undefined;

  return (
    <span key={key} style={style}>
      {segment.text}
    </span>
  );
}

// =============================================================================
// Line Component
// =============================================================================

type LineProps = {
  readonly lineIndex: number; // 0-based
  readonly lineNumber: number; // 1-based
  readonly tokens: readonly Token[];
  readonly highlights: readonly LineHighlight[];
  readonly showLineNumbers: boolean;
  readonly lineNumberWidth: number;
  readonly cursor?: { column: number; blinking: boolean };
  readonly lineHeight: number;
};

const Line = memo(function Line({
  lineNumber,
  tokens,
  highlights,
  showLineNumbers,
  lineNumberWidth,
  cursor,
  lineHeight,
}: LineProps): ReactNode {
  // Split tokens by highlight boundaries
  const segments = useMemo(
    () => splitTokensByHighlights(tokens, highlights),
    [tokens, highlights],
  );

  return (
    <div className={styles.line} style={{ height: lineHeight, lineHeight: `${lineHeight}px` }}>
      {/* Line number */}
      {showLineNumbers && (
        <span
          className={styles.lineNumber}
          style={{ width: lineNumberWidth, minWidth: lineNumberWidth }}
        >
          {lineNumber}
        </span>
      )}

      {/* Code content */}
      <span className={styles.lineContent}>
        {segments.length === 0 ? "\u00A0" : segments.map(renderSegment)}

        {/* Cursor */}
        {cursor && (
          <span
            className={styles.cursor}
            style={{
              left: `calc(${cursor.column - 1}ch)`,
              animation: cursor.blinking ? "vba-cursor-blink 1s step-end infinite" : "none",
            }}
          />
        )}
      </span>
    </div>
  );
});

// =============================================================================
// Main Component
// =============================================================================

/**
 * HTML-based unified code renderer.
 *
 * Features:
 * - Line numbers (optional)
 * - Syntax highlighting
 * - Selection/match highlights integrated into tokens
 * - Cursor rendering
 * - Virtual scrolling
 */
export const HtmlCodeRenderer = memo(function HtmlCodeRenderer({
  lines,
  visibleRange,
  topSpacerHeight,
  bottomSpacerHeight,
  tokenCache,
  lineHeight,
  showLineNumbers = false,
  lineNumberWidth = DEFAULT_LINE_NUMBER_WIDTH,
  highlights = [],
  cursor,
  measureText,
}: CodeRendererProps): ReactNode {
  // Pre-compute line highlights for visible range
  const lineHighlightsMap = useMemo(() => {
    const map = new Map<number, readonly LineHighlight[]>();
    for (let i = visibleRange.start; i < visibleRange.end; i++) {
      const lineNumber = i + 1;
      const lineText = lines[i] ?? "";
      const lineHighlights = getLineHighlights(lineNumber, lineText.length, highlights);
      if (lineHighlights.length > 0) {
        map.set(lineNumber, lineHighlights);
      }
    }
    return map;
  }, [visibleRange.start, visibleRange.end, lines, highlights]);

  // Check if cursor is on a visible line
  const cursorOnLine = useMemo(() => {
    if (!cursor?.visible) return undefined;
    if (cursor.line < visibleRange.start + 1 || cursor.line > visibleRange.end) {
      return undefined;
    }
    return cursor.line;
  }, [cursor, visibleRange]);

  return (
    <div className={styles.codeDisplay}>
      {/* Top spacer */}
      {topSpacerHeight > 0 && <div style={{ height: topSpacerHeight }} />}

      {/* Visible lines */}
      {Array.from({ length: visibleRange.end - visibleRange.start }, (_, i) => {
        const lineIndex = visibleRange.start + i;
        const lineNumber = lineIndex + 1;
        const lineText = lines[lineIndex] ?? "";
        const tokens = tokenCache.getTokens(lineText);
        const lineHighlights = lineHighlightsMap.get(lineNumber) ?? [];
        const lineCursor = cursorOnLine === lineNumber
          ? { column: cursor!.column, blinking: cursor!.blinking }
          : undefined;

        return (
          <Line
            key={lineIndex}
            lineIndex={lineIndex}
            lineNumber={lineNumber}
            tokens={tokens}
            highlights={lineHighlights}
            showLineNumbers={showLineNumbers}
            lineNumberWidth={lineNumberWidth}
            cursor={lineCursor}
            lineHeight={lineHeight}
          />
        );
      })}

      {/* Bottom spacer */}
      {bottomSpacerHeight > 0 && <div style={{ height: bottomSpacerHeight }} />}
    </div>
  );
});
