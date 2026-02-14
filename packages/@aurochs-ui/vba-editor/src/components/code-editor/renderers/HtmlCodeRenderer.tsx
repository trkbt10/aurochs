/**
 * @file HTML Code Renderer
 *
 * Renders code lines as HTML spans with CSS styling.
 * This is the default renderer with full CSS variable support.
 */

import { useMemo, memo, type ReactNode } from "react";
import type { Token } from "../syntax-highlight";
import type { CodeRendererProps } from "./types";
import { getTokenStyleCss } from "./token-colors";
import styles from "../VbaCodeEditor.module.css";

// =============================================================================
// Token Rendering
// =============================================================================

/**
 * Render a single token as a span element.
 */
function renderToken(token: Token, key: number): ReactNode {
  if (token.type === "whitespace") {
    return <span key={key}>{token.text}</span>;
  }
  const style = getTokenStyleCss(token.type);
  return (
    <span key={key} style={style}>
      {token.text}
    </span>
  );
}

// =============================================================================
// Line Component
// =============================================================================

type LineProps = {
  readonly lineIndex: number;
  readonly tokens: readonly Token[];
};

const Line = memo(function Line({ tokens }: LineProps): ReactNode {
  return (
    <div className={styles.line}>
      {tokens.length === 0 ? "\u00A0" : tokens.map(renderToken)}
    </div>
  );
});

// =============================================================================
// Main Component
// =============================================================================

/**
 * HTML-based code renderer.
 *
 * Features:
 * - CSS variable support for theming
 * - Virtual scrolling with spacers
 * - Memoized line components
 */
export const HtmlCodeRenderer = memo(function HtmlCodeRenderer({
  lines,
  visibleRange,
  topSpacerHeight,
  bottomSpacerHeight,
  tokenCache,
}: CodeRendererProps): ReactNode {
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
      {/* Top spacer */}
      {topSpacerHeight > 0 && <div style={{ height: topSpacerHeight }} />}

      {/* Visible lines */}
      {tokenizedLines.map((tokens, i) => (
        <Line
          key={visibleRange.start + i}
          lineIndex={visibleRange.start + i}
          tokens={tokens}
        />
      ))}

      {/* Bottom spacer */}
      {bottomSpacerHeight > 0 && <div style={{ height: bottomSpacerHeight }} />}
    </div>
  );
});
