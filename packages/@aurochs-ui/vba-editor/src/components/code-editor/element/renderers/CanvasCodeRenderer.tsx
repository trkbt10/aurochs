/**
 * @file Canvas Code Renderer
 *
 * Unified renderer that handles:
 * - Line numbers
 * - Syntax-highlighted code
 * - Selection highlights
 * - Search match highlights
 * - Cursor
 *
 * Renders using Canvas 2D API for high-performance scenarios.
 */

import { useRef, useEffect, useMemo, memo, type ReactNode } from "react";
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
// Canvas Drawing Context
// =============================================================================

type DrawContext = {
  readonly ctx: CanvasRenderingContext2D;
  readonly charWidth: number;
  readonly lineHeight: number;
  readonly padding: number;
  readonly showLineNumbers: boolean;
  readonly lineNumberWidth: number;
  readonly measureText?: (text: string) => number;
};

// =============================================================================
// Canvas Drawing Utilities
// =============================================================================

/**
 * Get X position for a column, using measureText if available.
 */
function getColumnX(
  context: DrawContext,
  lineText: string,
  column: number,
): number {
  const { padding, charWidth, showLineNumbers, lineNumberWidth, measureText } = context;
  const codeXOffset = showLineNumbers ? padding + lineNumberWidth : padding;

  if (measureText) {
    return codeXOffset + measureText(lineText.slice(0, column - 1));
  }
  return codeXOffset + (column - 1) * charWidth;
}

/**
 * Get X position for a token start, using measureText if available.
 */
function getTokenX(
  context: DrawContext,
  lineText: string,
  tokenStart: number,
): number {
  const { padding, charWidth, showLineNumbers, lineNumberWidth, measureText } = context;
  const codeXOffset = showLineNumbers ? padding + lineNumberWidth : padding;

  if (measureText) {
    return codeXOffset + measureText(lineText.slice(0, tokenStart));
  }
  return codeXOffset + tokenStart * charWidth;
}

/**
 * Draw line number background and text.
 */
function drawLineNumber(
  context: DrawContext,
  lineNumber: number,
  lineIndex: number,
): void {
  const { ctx, padding, lineHeight, lineNumberWidth } = context;
  const y = lineIndex * lineHeight;
  const textY = y + lineHeight * 0.75;

  // Background
  ctx.fillStyle = "#f8f9fa";
  ctx.fillRect(padding, y, lineNumberWidth, lineHeight);

  // Border
  ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
  ctx.beginPath();
  ctx.moveTo(padding + lineNumberWidth, y);
  ctx.lineTo(padding + lineNumberWidth, y + lineHeight);
  ctx.stroke();

  // Number text
  ctx.fillStyle = "#9aa0a6";
  ctx.textAlign = "right";
  ctx.fillText(String(lineNumber), padding + lineNumberWidth - 8, textY);
  ctx.textAlign = "left"; // Reset
}

/**
 * Draw a highlight rect.
 */
function drawHighlight(
  context: DrawContext,
  highlight: LineHighlight,
  lineIndex: number,
  lineText: string,
): void {
  const { ctx, lineHeight, charWidth } = context;
  const y = lineIndex * lineHeight;

  const x = getColumnX(context, lineText, highlight.startColumn);
  const endX = getColumnX(context, lineText, highlight.endColumn);
  const width = Math.max(endX - x, charWidth);

  ctx.fillStyle = HIGHLIGHT_COLORS[highlight.type];

  // Draw rounded rect
  const radius = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, width, lineHeight, radius);
  ctx.fill();
}

/**
 * Draw cursor.
 */
function drawCursor(
  context: DrawContext,
  column: number,
  lineIndex: number,
  lineText: string,
  blinking: boolean,
): void {
  const { ctx, lineHeight } = context;
  const x = getColumnX(context, lineText, column);
  const y = lineIndex * lineHeight;

  // Note: Canvas doesn't support CSS animations, so blinking must be handled
  // via JavaScript intervals. For now, we draw the cursor statically.
  // The blinking parameter is reserved for future animation implementation.
  if (blinking) {
    // Could implement via requestAnimationFrame in the future
  }

  ctx.fillStyle = "var(--vba-cursor-color, #000)";
  ctx.fillRect(x, y, 2, lineHeight);
}

/**
 * Draw a single token on the canvas.
 */
function drawToken(
  context: DrawContext,
  token: Token,
  lineIndex: number,
  lineText: string,
): void {
  if (token.type === "whitespace") {
    return;
  }

  const { ctx, lineHeight } = context;
  const x = getTokenX(context, lineText, token.start);
  const y = lineIndex * lineHeight + lineHeight * 0.75;
  const color = getTokenColorCss(token.type);

  ctx.fillStyle = color;
  ctx.fillText(token.text, x, y);
}

/**
 * Measure character width for monospace font.
 */
function measureCanvasCharWidth(ctx: CanvasRenderingContext2D): number {
  return ctx.measureText("M").width;
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Canvas-based unified code renderer.
 *
 * Features:
 * - Line numbers (optional)
 * - Syntax highlighting
 * - Selection/match highlights
 * - Cursor rendering
 * - High performance for large files
 * - Virtual scrolling support
 */
export const CanvasCodeRenderer = memo(function CanvasCodeRenderer({
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const charWidthRef = useRef<number>(0);

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

  // Calculate canvas dimensions
  const canvasHeight = (visibleRange.end - visibleRange.start) * lineHeight;

  // Draw on canvas when content changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    // Set up high DPI rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = canvasHeight * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, canvasHeight);

    // Set font
    ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
    ctx.textBaseline = "alphabetic";

    // Measure character width once
    if (charWidthRef.current === 0) {
      charWidthRef.current = measureCanvasCharWidth(ctx);
    }

    const drawContext: DrawContext = {
      ctx,
      charWidth: charWidthRef.current,
      lineHeight,
      padding,
      showLineNumbers,
      lineNumberWidth,
      measureText,
    };

    // Draw visible lines
    for (let i = visibleRange.start; i < visibleRange.end; i++) {
      const lineIndex = i - visibleRange.start;
      const lineNumber = i + 1;
      const lineText = lines[i] ?? "";
      const tokens = tokenCache.getTokens(lineText);

      // 1. Draw line number
      if (showLineNumbers) {
        drawLineNumber(drawContext, lineNumber, lineIndex);
      }

      // 2. Draw highlights
      const lineHighlights = lineHighlightsMap.get(lineNumber) ?? [];
      for (const highlight of lineHighlights) {
        drawHighlight(drawContext, highlight, lineIndex, lineText);
      }

      // 3. Draw tokens
      for (const token of tokens) {
        drawToken(drawContext, token, lineIndex, lineText);
      }

      // 4. Draw cursor
      if (cursorOnLine === lineNumber && cursor) {
        drawCursor(drawContext, cursor.column, lineIndex, lineText, cursor.blinking);
      }
    }
  }, [
    lines,
    visibleRange.start,
    visibleRange.end,
    tokenCache,
    width,
    canvasHeight,
    lineHeight,
    padding,
    measureText,
    showLineNumbers,
    lineNumberWidth,
    lineHighlightsMap,
    cursor,
    cursorOnLine,
  ]);

  return (
    <div className={styles.codeDisplay}>
      {topSpacerHeight > 0 && <div style={{ height: topSpacerHeight }} />}

      <canvas
        ref={canvasRef}
        style={{
          width,
          height: canvasHeight,
          display: "block",
        }}
      />

      {bottomSpacerHeight > 0 && <div style={{ height: bottomSpacerHeight }} />}
    </div>
  );
});
