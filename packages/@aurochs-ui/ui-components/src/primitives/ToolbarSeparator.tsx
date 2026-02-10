/**
 * @file Toolbar separator component
 *
 * Visual divider between groups of toolbar buttons.
 */

import type { CSSProperties } from "react";
import { colorTokens } from "../design-tokens";

export type ToolbarSeparatorProps = {
  /** Separator orientation (default: "horizontal" = vertical line between horizontal items). */
  readonly direction?: "horizontal" | "vertical";
  readonly style?: CSSProperties;
};

const horizontalStyle: CSSProperties = {
  width: "1px",
  height: "20px",
  backgroundColor: `var(--border-strong, ${colorTokens.border.strong})`,
  margin: "0 4px",
  flexShrink: 0,
};

const verticalStyle: CSSProperties = {
  width: "100%",
  height: "1px",
  backgroundColor: `var(--border-strong, ${colorTokens.border.strong})`,
  margin: "4px 0",
  flexShrink: 0,
};

/**
 * Visual separator for toolbar button groups.
 */
export function ToolbarSeparator({ direction = "horizontal", style }: ToolbarSeparatorProps) {
  const baseStyle = direction === "horizontal" ? horizontalStyle : verticalStyle;
  return <div style={style ? { ...baseStyle, ...style } : baseStyle} />;
}
