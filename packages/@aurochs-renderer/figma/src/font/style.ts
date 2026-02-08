/**
 * @file Font style (italic/oblique) detection
 */

/**
 * CSS font-style values
 */
export type FontStyle = "normal" | "italic" | "oblique";

/**
 * Patterns that indicate italic style
 */
const ITALIC_PATTERNS = ["italic", "ital", "it"] as const;

/**
 * Patterns that indicate oblique style
 */
const OBLIQUE_PATTERNS = ["oblique", "slant", "slanted", "inclined"] as const;

/**
 * Detect font style from style string
 *
 * @param style - Font style string (e.g., "Bold Italic", "Oblique")
 * @returns Detected font style
 *
 * @example
 * detectStyle("Regular") // "normal"
 * detectStyle("Bold Italic") // "italic"
 * detectStyle("Oblique") // "oblique"
 */
export function detectStyle(style: string | undefined): FontStyle {
  if (!style) {
    return "normal";
  }

  const styleLower = style.toLowerCase();

  // Check oblique first (more specific)
  if (OBLIQUE_PATTERNS.some((p) => styleLower.includes(p))) {
    return "oblique";
  }

  // Check italic
  if (ITALIC_PATTERNS.some((p) => styleLower.includes(p))) {
    return "italic";
  }

  return "normal";
}

/**
 * Check if style string indicates italic
 *
 * @param style - Font style string
 * @returns true if italic
 */
export function isItalic(style: string | undefined): boolean {
  return detectStyle(style) === "italic";
}

/**
 * Check if style string indicates oblique
 *
 * @param style - Font style string
 * @returns true if oblique
 */
export function isOblique(style: string | undefined): boolean {
  return detectStyle(style) === "oblique";
}

/**
 * Check if style is slanted (italic or oblique)
 *
 * @param style - Font style string
 * @returns true if italic or oblique
 */
export function isSlanted(style: string | undefined): boolean {
  const s = detectStyle(style);
  return s === "italic" || s === "oblique";
}
