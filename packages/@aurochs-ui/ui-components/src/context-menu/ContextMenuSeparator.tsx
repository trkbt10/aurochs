/**
 * @file ContextMenuSeparator
 */

import type { CSSProperties } from "react";
import { colorTokens } from "../design-tokens";

const separatorStyle: CSSProperties = {
  height: 1,
  margin: "4px 0",
  backgroundColor: `var(--border-primary, ${colorTokens.border.primary})`,
  opacity: 0.5,
};

/**
 * Render a horizontal separator line between context menu entries.
 */
export function ContextMenuSeparator() {
  return <div style={separatorStyle} />;
}
