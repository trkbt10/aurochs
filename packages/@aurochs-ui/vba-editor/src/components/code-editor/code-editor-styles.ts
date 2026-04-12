/**
 * @file Code Editor Shared Styles
 *
 * Inline style constants for VBA code editor components.
 * Replaces VbaCodeEditor.module.css with design-token-based styles.
 */

import type { CSSProperties } from "react";
import {
  colorTokens,
  fontTokens,
  spacingTokens,
} from "@aurochs-ui/ui-components";

// =============================================================================
// Constants
// =============================================================================

/**
 * Monospace font family for code display.
 */
export const CODE_FONT_FAMILY = `"Consolas", "Monaco", "Courier New", monospace`;

/**
 * Code font size (13px, matches fontTokens.size.lg).
 */
export const CODE_FONT_SIZE = fontTokens.size.lg;

// =============================================================================
// Container Styles
// =============================================================================

/**
 * Main editor container.
 */
export const editorContainerStyle: CSSProperties = {
  display: "flex",
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
  background: `var(--bg-primary, ${colorTokens.background.primary})`,
  fontFamily: CODE_FONT_FAMILY,
  fontSize: CODE_FONT_SIZE,
  lineHeight: "21px",
  cursor: "text",
};

/**
 * Empty state message.
 */
export const emptyMessageStyle: CSSProperties = {
  color: `var(--text-tertiary, ${colorTokens.text.tertiary})`,
  fontStyle: "italic",
  padding: spacingTokens.lg,
};

// =============================================================================
// Code Area Styles
// =============================================================================

/**
 * Scrollable code area containing the renderers.
 */
export const codeAreaStyle: CSSProperties = {
  flex: 1,
  position: "relative",
  overflow: "auto",
  minWidth: 0,
  minHeight: 0,
};

/**
 * Code display container (for virtual scrolling with spacers).
 */
export const codeDisplayStyle: CSSProperties = {
  whiteSpace: "pre",
  pointerEvents: "auto",
  cursor: "text",
  minHeight: "100%",
  userSelect: "none",
};

// =============================================================================
// Line Styles
// =============================================================================

/**
 * Build a line style with the given height.
 */
export function buildLineStyle(lineHeight: number): CSSProperties {
  return {
    display: "flex",
    height: lineHeight,
    lineHeight: `${lineHeight}px`,
  };
}

/**
 * Build a line number style with the given width.
 */
export function buildLineNumberStyle(width: number): CSSProperties {
  return {
    flexShrink: 0,
    paddingRight: spacingTokens.sm,
    paddingLeft: spacingTokens.sm,
    background: `var(--bg-secondary, ${colorTokens.background.secondary})`,
    color: `var(--text-tertiary, ${colorTokens.text.tertiary})`,
    textAlign: "right",
    userSelect: "none",
    borderRight: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
    width,
    minWidth: width,
  };
}

/**
 * Code content area within a line (flex: 1, with left padding).
 */
export const lineContentStyle: CSSProperties = {
  flex: 1,
  paddingLeft: spacingTokens.sm,
};

/**
 * Inner container for text and cursor positioning.
 */
export const lineInnerStyle: CSSProperties = {
  position: "relative",
  display: "inline",
};

/**
 * Cursor style (absolute positioned within lineInner).
 */
export const cursorBaseStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  width: 2,
  height: "100%",
  background: "var(--vba-cursor-color, #000)",
  pointerEvents: "none",
};

// =============================================================================
// Line Numbers Gutter Styles
// =============================================================================

/**
 * Line numbers gutter container.
 */
export const lineNumbersGutterStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  padding: spacingTokens.sm,
  color: `var(--text-tertiary, ${colorTokens.text.tertiary})`,
  textAlign: "right",
  userSelect: "none",
  minHeight: "100%",
};

/**
 * Individual line number in gutter.
 */
export const lineNumberGutterItemStyle: CSSProperties = {
  paddingRight: spacingTokens.xs,
  height: 21,
};

// =============================================================================
// Hidden Textarea Styles
// =============================================================================

/**
 * Hidden textarea for capturing user input.
 */
export const hiddenTextareaStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  margin: 0,
  padding: 0,
  border: "none",
  outline: "none",
  resize: "none",
  opacity: 0,
  cursor: "text",
  overflow: "hidden",
  whiteSpace: "pre",
  zIndex: 1,
  pointerEvents: "none",
};

// =============================================================================
// IME Composition Styles
// =============================================================================

/**
 * IME composition text overlay.
 */
export const imeCompositionStyle: CSSProperties = {
  position: "absolute",
  padding: 0,
  margin: 0,
  background: `var(--bg-primary, ${colorTokens.background.primary})`,
  color: `var(--text-primary, ${colorTokens.text.primary})`,
  font: "inherit",
  lineHeight: "inherit",
  whiteSpace: "pre",
  zIndex: 3,
  pointerEvents: "none",
  borderBottom: "2px solid var(--vba-cursor-color, #000)",
};
