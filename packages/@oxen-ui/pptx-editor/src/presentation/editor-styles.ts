/**
 * @file Presentation editor styles
 *
 * CSS style constants for the presentation editor layout.
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

export const thumbnailPanelStyle: CSSProperties = {
  height: "100%",
  borderRight: "1px solid var(--border-subtle, #333)",
  overflow: "hidden",
};

export const inspectorPanelStyle: CSSProperties = {
  height: "100%",
  borderLeft: "1px solid var(--border-subtle, #333)",
  overflow: "hidden",
};

export const noSlideStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: "100%",
  color: "#666",
};

export const RULER_THICKNESS = 24;
