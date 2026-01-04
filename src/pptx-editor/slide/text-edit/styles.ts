/**
 * @file Text Edit Styles
 *
 * Style constants and functions for text editing components.
 */

import type { CSSProperties } from "react";
import type { ColorContext } from "../../../pptx/domain/resolution";
import type { TextEditBounds } from "./state";
import { colorTokens } from "../../ui/design-tokens";

// =============================================================================
// Constants
// =============================================================================

/**
 * Empty color context for fallback when none provided.
 */
export const EMPTY_COLOR_CONTEXT: ColorContext = {
  colorScheme: {},
  colorMap: {},
};

// =============================================================================
// Textarea Styles
// =============================================================================

/**
 * Hidden textarea style for input capture.
 * The textarea captures keyboard input and IME composition while remaining invisible.
 */
export const HIDDEN_TEXTAREA_STYLE: CSSProperties = {
  position: "absolute",
  left: 0,
  top: 0,
  width: "100%",
  height: "100%",
  opacity: 0,
  cursor: "text",
  resize: "none",
  border: "none",
  outline: "none",
  padding: 0,
  margin: 0,
  overflow: "hidden",
  whiteSpace: "pre-wrap",
  wordWrap: "break-word",
  pointerEvents: "auto",
  caretColor: "transparent",
};

// =============================================================================
// Container Styles
// =============================================================================

/**
 * Build container style for the text edit overlay.
 * Positions the editing area over the shape being edited.
 */
export function buildContainerStyle(
  bounds: TextEditBounds,
  slideWidth: number,
  slideHeight: number,
): CSSProperties {
  const left = ((bounds.x as number) / slideWidth) * 100;
  const top = ((bounds.y as number) / slideHeight) * 100;
  const width = ((bounds.width as number) / slideWidth) * 100;
  const height = ((bounds.height as number) / slideHeight) * 100;

  return {
    position: "absolute",
    left: `${left}%`,
    top: `${top}%`,
    width: `${width}%`,
    height: `${height}%`,
    transform: bounds.rotation !== 0 ? `rotate(${bounds.rotation}deg)` : undefined,
    transformOrigin: "center center",
    boxSizing: "border-box",
    border: `2px solid ${colorTokens.selection.primary}`,
    borderRadius: "2px",
    backgroundColor: "transparent",
    zIndex: 1000,
    overflow: "visible",
  };
}
