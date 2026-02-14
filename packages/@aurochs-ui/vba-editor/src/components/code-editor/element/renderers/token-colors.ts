/**
 * @file Token Colors
 *
 * Shared token color definitions for all renderers.
 * Provides both CSS variable references and raw RGB values.
 */

import type { TokenType } from "../../code/syntax-highlight";
import type { RgbColor, TokenColorMap } from "./types";

// =============================================================================
// Raw RGB Colors (for Canvas/SVG)
// =============================================================================

/**
 * Raw RGB token colors for non-CSS contexts.
 */
export const TOKEN_COLORS_RGB: TokenColorMap = {
  keyword: [0, 0, 255],           // #0000ff
  type: [43, 145, 175],           // #2b91af
  builtin: [121, 94, 38],         // #795e26
  string: [163, 21, 21],          // #a31515
  comment: [0, 128, 0],           // #008000
  number: [9, 134, 88],           // #098658
  operator: [0, 0, 0],            // #000000
  identifier: [0, 0, 0],          // #000000
  punctuation: [0, 0, 0],         // #000000
  whitespace: [0, 0, 0],          // transparent (not used)
};

/**
 * Convert RGB to CSS color string.
 */
export function rgbToCss(rgb: RgbColor): string {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

/**
 * Convert RGB to hex color string.
 */
export function rgbToHex(rgb: RgbColor): string {
  return `#${rgb.map(c => c.toString(16).padStart(2, "0")).join("")}`;
}

// =============================================================================
// CSS Variable Colors (for HTML)
// =============================================================================

/**
 * CSS token color styles for HTML rendering.
 * Pre-defined style objects to avoid allocation on each render.
 */
export const TOKEN_STYLES_CSS: { readonly [K in TokenType]?: React.CSSProperties } = {
  keyword: { color: "var(--vba-keyword-color, #0000ff)" },
  type: { color: "var(--vba-type-color, #2b91af)" },
  builtin: { color: "var(--vba-builtin-color, #795e26)" },
  string: { color: "var(--vba-string-color, #a31515)" },
  comment: { color: "var(--vba-comment-color, #008000)" },
  number: { color: "var(--vba-number-color, #098658)" },
  operator: { color: "var(--vba-operator-color, #000000)" },
  identifier: { color: "var(--vba-identifier-color, #000000)" },
  punctuation: { color: "var(--vba-punctuation-color, #000000)" },
  // whitespace has no style
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get raw RGB color for a token type.
 */
export function getTokenColorRgb(type: TokenType): RgbColor {
  return TOKEN_COLORS_RGB[type] ?? TOKEN_COLORS_RGB.identifier;
}

/**
 * Get CSS color string for a token type (for Canvas/SVG fillStyle).
 */
export function getTokenColorCss(type: TokenType): string {
  if (type === "whitespace") {
    return "transparent";
  }
  return rgbToCss(getTokenColorRgb(type));
}

/**
 * Get CSS style object for a token type (for HTML).
 */
export function getTokenStyleCss(type: TokenType): React.CSSProperties | undefined {
  return TOKEN_STYLES_CSS[type];
}
