/**
 * @file EmbeddableFooter
 *
 * Footer for embeddable viewers.
 */

import type { CSSProperties, ReactNode } from "react";
import { spacingTokens, colorTokens } from "../design-tokens";

export type EmbeddableFooterProps = {
  /** Left slot content */
  readonly left?: ReactNode;
  /** Right slot content */
  readonly right?: ReactNode;
  /** Additional CSS class */
  readonly className?: string;
  /** Additional inline styles */
  readonly style?: CSSProperties;
};

const footerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: `${spacingTokens.sm} ${spacingTokens.md}`,
  backgroundColor: colorTokens.background.secondary,
  borderTop: `1px solid ${colorTokens.border.subtle}`,
};

/**
 * Footer for embeddable viewers.
 */
const leftSlotStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
};

/**
 * Footer for embeddable viewers.
 */
export function EmbeddableFooter({ left, right, className, style }: EmbeddableFooterProps) {
  return (
    <footer style={{ ...footerStyle, ...style }} className={className}>
      <div style={leftSlotStyle}>{left}</div>
      <div>{right}</div>
    </footer>
  );
}
