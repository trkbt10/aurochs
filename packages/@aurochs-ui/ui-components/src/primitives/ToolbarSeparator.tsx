/**
 * @file Toolbar separator component
 *
 * Visual divider between groups of toolbar buttons.
 */

import type { CSSProperties } from "react";
import { colorTokens, spacingTokens } from "../design-tokens";

export type ToolbarSeparatorProps = {
  /** Separator orientation (default: "horizontal" = vertical line between horizontal items). */
  readonly direction?: "horizontal" | "vertical";
  readonly style?: CSSProperties;
};

/** Separator height for horizontal orientation (20px) */
const SEPARATOR_HEIGHT = 20;

const horizontalStyle: CSSProperties = {
  width: "1px",
  height: SEPARATOR_HEIGHT,
  backgroundColor: colorTokens.border.strong,
  margin: `0 ${spacingTokens.xs}`,
  flexShrink: 0,
};

const verticalStyle: CSSProperties = {
  width: "100%",
  height: "1px",
  backgroundColor: colorTokens.border.strong,
  margin: `${spacingTokens.xs} 0`,
  flexShrink: 0,
};

/**
 * Visual separator for toolbar button groups.
 */
export function ToolbarSeparator({ direction = "horizontal", style }: ToolbarSeparatorProps) {
  const baseStyle = direction === "horizontal" ? horizontalStyle : verticalStyle;
  return <div style={style ? { ...baseStyle, ...style } : baseStyle} />;
}
