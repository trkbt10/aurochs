/**
 * @file Editor shell CSS style constants
 *
 * Shared layout styles for EditorShell and standalone usage (e.g. theme mode).
 */

import type { CSSProperties } from "react";

export const editorContainerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  height: "100%",
  backgroundColor: "var(--bg-primary, #0a0a0a)",
  color: "var(--text-primary, #fff)",
  overflow: "hidden",
};

export const toolbarStyle: CSSProperties = {
  padding: "8px 16px",
  backgroundColor: "var(--bg-secondary, #1a1a1a)",
  borderBottom: "1px solid var(--border-subtle, #333)",
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
