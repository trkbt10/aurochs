/**
 * @file Context menu separator component
 * Uses design tokens for consistent styling.
 */

import type { CSSProperties } from "react";
import { colorTokens, spacingTokens } from "../design-tokens";

const separatorStyle: CSSProperties = {
  height: "1px",
  backgroundColor: `var(--border-subtle, ${colorTokens.border.subtle})`,
  margin: `${spacingTokens.xs} 0`,
};

/**
 * Visual separator between context menu items.
 */
export function ContextMenuSeparator() {
  return <div style={separatorStyle} />;
}
