/**
 * @file Canvas Code Renderer
 *
 * Renders code lines using Canvas 2D API.
 * Suitable for high-performance scenarios with many lines.
 */

import { useRef, useEffect, useMemo, memo, type ReactNode } from "react";
import type { Token } from "../syntax-highlight";
import type { CodeRendererProps } from "./types";
import { getTokenColorCss } from "./token-colors";
import styles from "../VbaCodeEditor.module.css";

// =============================================================================
// Constants
// =============================================================================

const FONT_FAMILY = "'Consolas', 'Monaco', 'Courier New', monospace";
const FONT_SIZE = 13;

// =============================================================================
// Canvas Drawing Utilities
// =============================================================================

type DrawContext = {
  readonly ctx: CanvasRenderingContext2D;
  readonly charWidth: number;
  readonly lineHeight: number;
  readonly padding: number;
};

/**
 * Draw a single token on the canvas.
 */
function drawToken(
  context: DrawContext,
  token: Token,
  lineY: number
): void {
  if (token.type === "whitespace") {
    return; // Skip whitespace
  }

  const { ctx, charWidth, padding } = context;
  const x = padding + token.start * charWidth;
  const color = getTokenColorCss(token.type);

  ctx.fillStyle = color;
  ctx.fillText(token.text, x, lineY);
}

/**
 * Draw a line of tokens on the canvas.
 */
function drawLine(
  context: DrawContext,
  tokens: readonly Token[],
  lineIndex: number
): void {
  const { lineHeight, padding } = context;
  const y = lineIndex * lineHeight + lineHeight * 0.75 + padding;

  for (const token of tokens) {
    drawToken(context, token, y);
  }
}

/**
 * Measure character width for monospace font.
 */
function measureCharWidth(ctx: CanvasRenderingContext2D): number {
  return ctx.measureText("M").width;
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Canvas-based code renderer.
 *
 * Features:
 * - High performance for large files
 * - Direct pixel manipulation
 * - Virtual scrolling via selective rendering
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
}: CodeRendererProps): ReactNode {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const charWidthRef = useRef<number>(0);

  // Extract and tokenize visible lines
  const visibleLines = useMemo(() => {
    return lines.slice(visibleRange.start, visibleRange.end);
  }, [lines, visibleRange.start, visibleRange.end]);

  const tokenizedLines = useMemo(() => {
    return visibleLines.map((line) => tokenCache.getTokens(line));
  }, [visibleLines, tokenCache]);

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
      charWidthRef.current = measureCharWidth(ctx);
    }

    const drawContext: DrawContext = {
      ctx,
      charWidth: charWidthRef.current,
      lineHeight,
      padding,
    };

    // Draw visible lines
    for (let i = 0; i < tokenizedLines.length; i++) {
      drawLine(drawContext, tokenizedLines[i], i);
    }
  }, [tokenizedLines, width, canvasHeight, lineHeight, padding]);

  return (
    <div className={styles.codeDisplay}>
      {/* Top spacer */}
      {topSpacerHeight > 0 && <div style={{ height: topSpacerHeight }} />}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          width,
          height: canvasHeight,
          display: "block",
        }}
      />

      {/* Bottom spacer */}
      {bottomSpacerHeight > 0 && <div style={{ height: bottomSpacerHeight }} />}
    </div>
  );
});
