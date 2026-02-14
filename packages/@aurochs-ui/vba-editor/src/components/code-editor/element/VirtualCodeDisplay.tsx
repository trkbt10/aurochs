/**
 * @file Virtual Code Display Component
 *
 * Renders only visible lines with syntax highlighting.
 */

import { useMemo, type ReactNode, type CSSProperties, memo } from "react";
import { getTokenColor, type Token } from "../code/syntax-highlight";
import type { LineTokenCache } from "../line/use-line-token-cache";
import styles from "../VbaCodeEditor.module.css";

// =============================================================================
// Types
// =============================================================================

export type VirtualCodeDisplayProps = {
  /** All lines of code */
  readonly lines: readonly string[];
  /** Range of lines to render (0-based, end is exclusive) */
  readonly visibleRange: { start: number; end: number };
  /** Height of spacer above visible lines */
  readonly topSpacerHeight: number;
  /** Height of spacer below visible lines */
  readonly bottomSpacerHeight: number;
  /** Token cache for efficient tokenization */
  readonly tokenCache: LineTokenCache;
};

// =============================================================================
// Memoized Style Objects
// =============================================================================

// Pre-defined token color styles to avoid creating objects on each render
const TOKEN_STYLES: Record<string, CSSProperties> = {
  keyword: { color: "var(--vba-keyword-color, #0000ff)" },
  type: { color: "var(--vba-type-color, #2b91af)" },
  builtin: { color: "var(--vba-builtin-color, #795e26)" },
  string: { color: "var(--vba-string-color, #a31515)" },
  comment: { color: "var(--vba-comment-color, #008000)" },
  number: { color: "var(--vba-number-color, #098658)" },
  operator: { color: "var(--vba-operator-color, #000000)" },
  identifier: { color: "var(--vba-identifier-color, #000000)" },
  punctuation: { color: "var(--vba-punctuation-color, #000000)" },
  whitespace: {},
};

// =============================================================================
// Rendering Helpers
// =============================================================================

/**
 * Render a single token with appropriate styling.
 */
function renderToken(token: Token, key: number): ReactNode {
  if (token.type === "whitespace") {
    return <span key={key}>{token.text}</span>;
  }
  const style = TOKEN_STYLES[token.type] ?? { color: getTokenColor(token.type) };
  return (
    <span key={key} style={style}>
      {token.text}
    </span>
  );
}

// =============================================================================
// Line Component (Memoized)
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
 * Virtual code display that renders only visible lines.
 *
 * Uses spacer divs to maintain scroll position and content height.
 */
export const VirtualCodeDisplay = memo(function VirtualCodeDisplay({
  lines,
  visibleRange,
  topSpacerHeight,
  bottomSpacerHeight,
  tokenCache,
}: VirtualCodeDisplayProps): ReactNode {
  // Memoize visible lines extraction
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
