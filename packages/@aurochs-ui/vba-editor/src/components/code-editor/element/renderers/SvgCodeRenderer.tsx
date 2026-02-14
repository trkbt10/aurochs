/**
 * @file SVG Code Renderer
 *
 * Renders code lines as SVG text elements.
 * Suitable for high-quality export and print scenarios.
 */

import { useMemo, memo, type ReactNode } from "react";
import type { Token } from "../../code/syntax-highlight";
import type { CodeRendererProps } from "./types";
import { getTokenColorCss } from "./token-colors";
import styles from "../../VbaCodeEditor.module.css";

// =============================================================================
// Constants
// =============================================================================

const FONT_FAMILY = "'Consolas', 'Monaco', 'Courier New', monospace";
const FONT_SIZE = 13;

// =============================================================================
// SVG Token Rendering
// =============================================================================

type SvgTokenProps = {
  readonly token: Token;
  readonly x: number;
  readonly charWidth: number;
};

/**
 * Render a token as SVG tspan.
 */
function SvgToken({ token, x, charWidth }: SvgTokenProps): ReactNode {
  if (token.type === "whitespace") {
    // Whitespace doesn't need rendering, just advances position
    return null;
  }

  const color = getTokenColorCss(token.type);
  const textX = x + token.start * charWidth;

  return (
    <tspan x={textX} fill={color}>
      {token.text}
    </tspan>
  );
}

// =============================================================================
// SVG Line Component
// =============================================================================

type SvgLineProps = {
  readonly tokens: readonly Token[];
  readonly y: number;
  readonly padding: number;
  readonly charWidth: number;
};

const SvgLine = memo(function SvgLine({
  tokens,
  y,
  padding,
  charWidth,
}: SvgLineProps): ReactNode {
  if (tokens.length === 0) {
    // Empty line - render non-breaking space for consistent height
    return (
      <text
        x={padding}
        y={y}
        fontFamily={FONT_FAMILY}
        fontSize={FONT_SIZE}
        fill="transparent"
      >
        {"\u00A0"}
      </text>
    );
  }

  return (
    <text x={padding} y={y} fontFamily={FONT_FAMILY} fontSize={FONT_SIZE}>
      {tokens.map((token, i) => (
        <SvgToken
          key={i}
          token={token}
          x={padding}
          charWidth={charWidth}
        />
      ))}
    </text>
  );
});

// =============================================================================
// Main Component
// =============================================================================

/**
 * SVG-based code renderer.
 *
 * Features:
 * - Vector-based rendering for crisp text at any scale
 * - Suitable for export/print
 * - Virtual scrolling support via viewBox
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
  height: _height = 600,
}: CodeRendererProps): ReactNode {
  // Calculate approximate character width (monospace)
  const charWidth = FONT_SIZE * 0.6;

  // Extract visible lines
  const visibleLines = useMemo(() => {
    return lines.slice(visibleRange.start, visibleRange.end);
  }, [lines, visibleRange.start, visibleRange.end]);

  // Tokenize visible lines
  const tokenizedLines = useMemo(() => {
    return visibleLines.map((line) => tokenCache.getTokens(line));
  }, [visibleLines, tokenCache]);

  return (
    <div className={styles.codeDisplay}>
      {/* Top spacer for scroll position */}
      {topSpacerHeight > 0 && <div style={{ height: topSpacerHeight }} />}

      <svg
        width={width}
        height={(visibleRange.end - visibleRange.start) * lineHeight}
        style={{ display: "block", overflow: "visible" }}
      >
        {/* Background */}
        <rect
          x={0}
          y={0}
          width={width}
          height={(visibleRange.end - visibleRange.start) * lineHeight}
          fill="transparent"
        />

        {/* Visible lines */}
        {tokenizedLines.map((tokens, i) => {
          const lineIndex = visibleRange.start + i;
          // Y position relative to visible area (not absolute)
          const y = i * lineHeight + lineHeight * 0.75 + padding;

          return (
            <SvgLine
              key={lineIndex}
              tokens={tokens}
              y={y}
              padding={padding}
              charWidth={charWidth}
            />
          );
        })}
      </svg>

      {/* Bottom spacer */}
      {bottomSpacerHeight > 0 && <div style={{ height: bottomSpacerHeight }} />}
    </div>
  );
});
