/**
 * @file Editor shell CSS style constants
 *
 * Shared layout styles for EditorShell and standalone usage (e.g. theme mode).
 */

import type { CSSProperties } from "react";
import { colorTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";

export const editorContainerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  height: "100%",
  backgroundColor: `var(--bg-primary, ${colorTokens.background.primary})`,
  color: `var(--text-primary, ${colorTokens.text.primary})`,
  overflow: "hidden",
};

export const toolbarStyle: CSSProperties = {
  padding: `${spacingTokens.sm} ${spacingTokens.lg}`,
  backgroundColor: `var(--bg-secondary, ${colorTokens.background.secondary})`,
  borderBottom: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
  flexShrink: 0,
};

export const gridContainerStyle: CSSProperties = {
  flex: 1,
  overflow: "hidden",
  position: "relative",
};

export const bottomBarStyle: CSSProperties = {
  flexShrink: 0,
};
