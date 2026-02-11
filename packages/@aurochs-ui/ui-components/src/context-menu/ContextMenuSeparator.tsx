/**
 * @file ContextMenuSeparator
 */

import type { CSSProperties } from "react";
import { colorTokens, spacingTokens } from "../design-tokens";

const separatorStyle: CSSProperties = {
  height: 1,
  margin: `${spacingTokens.xs} 0`,
  backgroundColor: colorTokens.border.primary,
  opacity: 0.5,
};

/**
 * Render a horizontal separator line between context menu entries.
 */
export function ContextMenuSeparator() {
  return <div style={separatorStyle} />;
}
