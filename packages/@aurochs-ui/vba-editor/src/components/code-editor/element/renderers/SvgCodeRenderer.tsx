/**
 * @file SVG Code Renderer
 *
 * Unified renderer that handles:
 * - Line numbers
 * - Syntax-highlighted code
 * - Selection highlights
 * - Search match highlights
 * - Cursor
 *
 * Renders as SVG for high-quality export and print scenarios.
 */

import { useMemo, memo, type ReactNode } from "react";
import type { Token } from "../../code/syntax-highlight";
import type { CodeRendererProps, HighlightRange, HighlightType } from "./types";
import { getTokenColorCss } from "./token-colors";
import styles from "../../VbaCodeEditor.module.css";

// =============================================================================
// Constants
// =============================================================================

const FONT_FAMILY = "'Consolas', 'Monaco', 'Courier New', monospace";
const FONT_SIZE = 13;
const DEFAULT_LINE_NUMBER_WIDTH = 48;

// =============================================================================
// Highlight Colors
// =============================================================================

const HIGHLIGHT_COLORS: Record<HighlightType, string> = {
  selection: "rgba(51, 144, 255, 0.3)",
  match: "rgba(255, 213, 0, 0.4)",
  currentMatch: "rgba(255, 140, 0, 0.6)",
};

// =============================================================================
// Highlight Utilities
// =============================================================================

type LineHighlight = {
  readonly startColumn: number;
  readonly endColumn: number;
  readonly type: HighlightType;
};

function getLineHighlights(
  lineNumber: number,
  lineLength: number,
  highlights: readonly HighlightRange[],
): readonly LineHighlight[] {
  const result: LineHighlight[] = [];

  for (const h of highlights) {
    if (lineNumber < h.startLine || lineNumber > h.endLine) {
      continue;
    }

    let startCol: number;
    let endCol: number;

    if (lineNumber === h.startLine && lineNumber === h.endLine) {
      startCol = h.startColumn;
      endCol = h.endColumn;
    } else if (lineNumber === h.startLine) {
      startCol = h.startColumn;
      endCol = lineLength + 1;
    } else if (lineNumber === h.endLine) {
      startCol = 1;
      endCol = h.endColumn;
    } else {
      startCol = 1;
      endCol = lineLength + 1;
    }

    result.push({ startColumn: startCol, endColumn: endCol, type: h.type });
  }

  const priority: Record<HighlightType, number> = {
    selection: 0,
    match: 1,
    currentMatch: 2,
  };
  result.sort((a, b) => priority[a.type] - priority[b.type]);

  return result;
}

// =============================================================================
// SVG Components
// =============================================================================

type SvgHighlightProps = {
  readonly highlight: LineHighlight;
  readonly y: number;
  readonly lineHeight: number;
  readonly lineText: string;
  readonly xOffset: number;
  readonly charWidth: number;
  readonly measureText?: (text: string) => number;
};

function SvgHighlight({
  highlight,
  y,
  lineHeight,
  lineText,
  xOffset,
  charWidth,
  measureText,
}: SvgHighlightProps): ReactNode {
  const getX = (col: number): number => {
    if (measureText) {
      return xOffset + measureText(lineText.slice(0, col - 1));
    }
    return xOffset + (col - 1) * charWidth;
  };

  const x = getX(highlight.startColumn);
  const width = getX(highlight.endColumn) - x;

  return (
    <rect
      x={x}
      y={y}
      width={Math.max(width, charWidth)}
      height={lineHeight}
      fill={HIGHLIGHT_COLORS[highlight.type]}
      rx={2}
    />
  );
}

type SvgCursorProps = {
  readonly x: number;
  readonly y: number;
  readonly height: number;
  readonly blinking: boolean;
};

function SvgCursor({ x, y, height, blinking }: SvgCursorProps): ReactNode {
  return (
    <rect
      x={x}
      y={y}
      width={2}
      height={height}
      fill="var(--vba-cursor-color, #000)"
      style={{
        animation: blinking ? "vba-cursor-blink 1s step-end infinite" : "none",
      }}
    />
  );
}

type SvgLineNumberProps = {
  readonly lineNumber: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
};

function SvgLineNumber({ lineNumber, x, y, width }: SvgLineNumberProps): ReactNode {
  return (
    <>
      <rect x={x} y={y - FONT_SIZE * 0.75} width={width} height={FONT_SIZE + 8} fill="#f8f9fa" />
      <text
        x={x + width - 8}
        y={y}
        fontFamily={FONT_FAMILY}
        fontSize={FONT_SIZE}
        fill="#9aa0a6"
        textAnchor="end"
      >
        {lineNumber}
      </text>
      <line x1={x + width} y1={y - FONT_SIZE * 0.75} x2={x + width} y2={y + 8} stroke="rgba(0,0,0,0.08)" />
    </>
  );
}

type SvgTokenProps = {
  readonly token: Token;
  readonly xOffset: number;
  readonly charWidth: number;
  readonly lineText: string;
  readonly measureText?: (text: string) => number;
};

function SvgToken({ token, xOffset, charWidth, lineText, measureText }: SvgTokenProps): ReactNode {
  if (token.type === "whitespace") {
    return null;
  }

  const getX = (start: number): number => {
    if (measureText) {
      return xOffset + measureText(lineText.slice(0, start));
    }
    return xOffset + start * charWidth;
  };

  const x = getX(token.start);
  const color = getTokenColorCss(token.type);

  return (
    <tspan x={x} fill={color}>
      {token.text}
    </tspan>
  );
}

type SvgLineProps = {
  readonly lineIndex: number;
  readonly lineNumber: number;
  readonly tokens: readonly Token[];
  readonly highlights: readonly LineHighlight[];
  readonly y: number;
  readonly xOffset: number;
  readonly charWidth: number;
  readonly lineText: string;
  readonly lineHeight: number;
  readonly showLineNumbers: boolean;
  readonly lineNumberWidth: number;
  readonly cursor?: { column: number; blinking: boolean };
  readonly measureText?: (text: string) => number;
};

const SvgLine = memo(function SvgLine({
  lineNumber,
  tokens,
  highlights,
  y,
  xOffset,
  charWidth,
  lineText,
  lineHeight,
  showLineNumbers,
  lineNumberWidth,
  cursor,
  measureText,
}: SvgLineProps): ReactNode {
  const codeXOffset = showLineNumbers ? xOffset + lineNumberWidth : xOffset;
  const textY = y + lineHeight * 0.75;

  const getCursorX = (col: number): number => {
    if (measureText) {
      return codeXOffset + measureText(lineText.slice(0, col - 1));
    }
    return codeXOffset + (col - 1) * charWidth;
  };

  return (
    <g>
      {/* Line number */}
      {showLineNumbers && (
        <SvgLineNumber lineNumber={lineNumber} x={xOffset} y={textY} width={lineNumberWidth} />
      )}

      {/* Highlights */}
      {highlights.map((h, i) => (
        <SvgHighlight
          key={i}
          highlight={h}
          y={y}
          lineHeight={lineHeight}
          lineText={lineText}
          xOffset={codeXOffset}
          charWidth={charWidth}
          measureText={measureText}
        />
      ))}

      {/* Code tokens */}
      <text x={codeXOffset} y={textY} fontFamily={FONT_FAMILY} fontSize={FONT_SIZE}>
        {tokens.length === 0 ? (
          <tspan fill="transparent">{"\u00A0"}</tspan>
        ) : (
          tokens.map((token, i) => (
            <SvgToken
              key={i}
              token={token}
              xOffset={codeXOffset}
              charWidth={charWidth}
              lineText={lineText}
              measureText={measureText}
            />
          ))
        )}
      </text>

      {/* Cursor */}
      {cursor && (
        <SvgCursor
          x={getCursorX(cursor.column)}
          y={y}
          height={lineHeight}
          blinking={cursor.blinking}
        />
      )}
    </g>
  );
});

// =============================================================================
// Main Component
// =============================================================================

/**
 * SVG-based unified code renderer.
 *
 * Features:
 * - Line numbers (optional)
 * - Syntax highlighting
 * - Selection/match highlights
 * - Cursor rendering
 * - Vector-based for crisp text at any scale
 * - Virtual scrolling support
 */
export const SvgCodeRenderer = memo(function SvgCodeRenderer({
  lines,
  visibleRange,
  topSpacerHeight,
  bottomSpacerHeight,
  tokenCache,
  lineHeight,
  padding,
  width = 800,
  measureText,
  showLineNumbers = false,
  lineNumberWidth = DEFAULT_LINE_NUMBER_WIDTH,
  highlights = [],
  cursor,
}: CodeRendererProps): ReactNode {
  const charWidth = FONT_SIZE * 0.6;

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

  const svgHeight = (visibleRange.end - visibleRange.start) * lineHeight;

  return (
    <div className={styles.codeDisplay}>
      {topSpacerHeight > 0 && <div style={{ height: topSpacerHeight }} />}

      <svg
        width={width}
        height={svgHeight}
        style={{ display: "block", overflow: "visible" }}
      >
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
            <SvgLine
              key={lineIndex}
              lineIndex={lineIndex}
              lineNumber={lineNumber}
              tokens={tokens}
              highlights={lineHighlights}
              y={i * lineHeight}
              xOffset={padding}
              charWidth={charWidth}
              lineText={lineText}
              lineHeight={lineHeight}
              showLineNumbers={showLineNumbers}
              lineNumberWidth={lineNumberWidth}
              cursor={lineCursor}
              measureText={measureText}
            />
          );
        })}
      </svg>

      {bottomSpacerHeight > 0 && <div style={{ height: bottomSpacerHeight }} />}
    </div>
  );
});
