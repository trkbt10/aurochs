/**
 * @file FormulaBarSyntaxOverlay
 *
 * A pointer-events:none overlay that renders colored formula text on top of the
 * formula bar input (whose own text is made transparent).
 *
 * Color scheme:
 * - reference tokens → getReferenceColor(colorIndex)
 * - function tokens  → #4EC9B0 (teal)
 * - string tokens    → #CE9178 (orange)
 * - others           → default text color
 */

import { useMemo, type CSSProperties } from "react";
import { colorTokens, fontTokens } from "@aurochs-ui/ui-components";
import type { FormulaTextToken, FormulaReferenceToken } from "../../formula-edit/types";
import { getReferenceColor } from "../../formula-edit/formula-reference-colors";

export type FormulaBarSyntaxOverlayProps = {
  readonly text: string;
  readonly tokens: readonly FormulaTextToken[];
  readonly references: readonly FormulaReferenceToken[];
};

const FUNCTION_COLOR = "#4EC9B0";
const STRING_COLOR = "#CE9178";

/** Resolve syntax highlight color for a formula token. */
function resolveTokenColor(
  token: FormulaTextToken,
  refColorMap: Map<number, number>,
): string | undefined {
  if (token.type === "reference") {
    const refColor = refColorMap.get(token.startOffset);
    return refColor !== undefined ? getReferenceColor(refColor) : undefined;
  }
  if (token.type === "function") {
    return FUNCTION_COLOR;
  }
  if (token.type === "string") {
    return STRING_COLOR;
  }
  return undefined;
}

const overlayContainerStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  display: "flex",
  alignItems: "center",
  padding: "5px 8px",
  fontSize: fontTokens.size.md,
  fontFamily: "inherit",
  overflow: "hidden",
  whiteSpace: "pre",
};

/**
 * Syntax-colored overlay for the formula bar.
 *
 * Renders each token as a `<span>` with appropriate coloring.
 */
export function FormulaBarSyntaxOverlay({ text, tokens, references }: FormulaBarSyntaxOverlayProps) {
  const spans = useMemo(() => {
    if (tokens.length === 0) {
      return [{ text, color: undefined as string | undefined, key: "all" }];
    }

    // Build a lookup map: startOffset → reference colorIndex
    const refColorMap = new Map<number, number>();
    for (const ref of references) {
      refColorMap.set(ref.startOffset, ref.colorIndex);
    }

    const result: { text: string; color: string | undefined; key: string }[] = [];

    // Fill gaps between tokens (leading "=" etc.)
    // eslint-disable-next-line no-restricted-syntax -- incremented in loop
    let lastEnd = 0;
    for (const token of tokens) {
      if (token.startOffset > lastEnd) {
        result.push({
          text: text.slice(lastEnd, token.startOffset),
          color: undefined,
          key: `gap-${lastEnd}`,
        });
      }

      const color = resolveTokenColor(token, refColorMap);

      result.push({
        text: token.text,
        color,
        key: `t-${token.startOffset}`,
      });

      lastEnd = token.endOffset;
    }

    // Trailing text
    if (lastEnd < text.length) {
      result.push({
        text: text.slice(lastEnd),
        color: undefined,
        key: `tail-${lastEnd}`,
      });
    }

    return result;
  }, [text, tokens, references]);

  return (
    <div style={overlayContainerStyle}>
      {spans.map((span) => (
        <span
          key={span.key}
          style={{
            color: span.color ?? `var(--text-primary, ${colorTokens.text.primary})`,
          }}
        >
          {span.text}
        </span>
      ))}
    </div>
  );
}
