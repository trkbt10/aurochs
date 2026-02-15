/**
 * @file VBA Editor Toolbar
 *
 * Simple toolbar with procedure dropdown for navigation.
 * Mirrors VBA IDE's procedure selector behavior.
 */

import type { CSSProperties, ReactNode } from "react";
import { colorTokens, spacingTokens } from "@aurochs-ui/ui-components";
import { VbaProcedureDropdown } from "../procedure-dropdown";

export type VbaEditorToolbarProps = {
  readonly style?: CSSProperties;
};

// =============================================================================
// Styles
// =============================================================================

const toolbarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: `${spacingTokens.xs} ${spacingTokens.sm}`,
  backgroundColor: colorTokens.background.secondary,
  borderBottom: `1px solid ${colorTokens.border.subtle}`,
  gap: spacingTokens.sm,
};

// =============================================================================
// Component
// =============================================================================

export function VbaEditorToolbar({ style }: VbaEditorToolbarProps): ReactNode {
  return (
    <div style={{ ...toolbarStyle, ...style }}>
      <VbaProcedureDropdown style={{ flex: 1, maxWidth: 300 }} />
    </div>
  );
}
