/**
 * @file ViewerFooter
 *
 * Footer/status bar for viewers.
 */

import type { CSSProperties, ReactNode } from "react";
import { spacingTokens, fontTokens, colorTokens } from "../design-tokens";

export type ViewerFooterProps = {
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
  padding: `${spacingTokens.sm} ${spacingTokens.lg}`,
  backgroundColor: colorTokens.background.secondary,
  borderTop: `1px solid ${colorTokens.border.subtle}`,
  fontSize: fontTokens.size.md,
  color: colorTokens.text.tertiary,
  flexShrink: 0,
};

/**
 * Footer with left/right slots.
 */
export function ViewerFooter({ left, right, className, style }: ViewerFooterProps) {
  return (
    <footer style={{ ...footerStyle, ...style }} className={className}>
      <div>{left}</div>
      <div>{right}</div>
    </footer>
  );
}
