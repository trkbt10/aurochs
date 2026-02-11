/**
 * @file ViewerToolbar
 *
 * Toolbar with left/center/right slots for viewer controls.
 */

import type { CSSProperties, ReactNode } from "react";
import { spacingTokens, colorTokens } from "../design-tokens";

export type ViewerToolbarProps = {
  /** Left slot content (e.g., navigation controls) */
  readonly left?: ReactNode;
  /** Center slot content (e.g., position indicator) */
  readonly center?: ReactNode;
  /** Right slot content (e.g., zoom controls) */
  readonly right?: ReactNode;
  /** Additional CSS class */
  readonly className?: string;
  /** Additional inline styles */
  readonly style?: CSSProperties;
};

const toolbarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: `${spacingTokens.sm} ${spacingTokens.lg}`,
  backgroundColor: colorTokens.background.secondary,
  borderBottom: `1px solid ${colorTokens.border.subtle}`,
  flexShrink: 0,
};

const slotStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.lg,
};

const centerSlotStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
};

/**
 * Toolbar with left/center/right slots.
 */
export function ViewerToolbar({ left, center, right, className, style }: ViewerToolbarProps) {
  return (
    <div style={{ ...toolbarStyle, ...style }} className={className}>
      <div style={slotStyle}>{left}</div>
      <div style={centerSlotStyle}>{center}</div>
      <div style={slotStyle}>{right}</div>
    </div>
  );
}
