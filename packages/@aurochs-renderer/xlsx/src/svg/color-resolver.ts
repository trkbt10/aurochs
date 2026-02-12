/**
 * @file Color resolution for XLSX styles
 *
 * Resolves XlsxColor to CSS hex values, handling:
 * - RGB colors (direct hex)
 * - Theme colors (resolved via color scheme)
 * - Indexed colors (legacy palette)
 * - Auto colors (defaults to black/white)
 * - Tint adjustments
 *
 * @see ECMA-376 Part 4, Section 18.8.9 (color)
 */

import type { XlsxColor } from "@aurochs-office/xlsx/domain/style/font";
import type { ColorScheme } from "@aurochs-office/drawing-ml/domain/color-context";
import { hexToRgb, rgbToHsl, hslToRgb, toHex } from "@aurochs/color";

// =============================================================================
// Default Indexed Color Palette
// =============================================================================

/**
 * Default indexed color palette (ECMA-376 Part 4, Section 18.8.27)
 */
const DEFAULT_INDEXED_COLORS: readonly string[] = [
  "#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF",
  "#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF",
  "#800000", "#008000", "#000080", "#808000", "#800080", "#008080", "#C0C0C0", "#808080",
  "#9999FF", "#993366", "#FFFFCC", "#CCFFFF", "#660066", "#FF8080", "#0066CC", "#CCCCFF",
  "#000080", "#FF00FF", "#FFFF00", "#00FFFF", "#800080", "#800000", "#008080", "#0000FF",
  "#00CCFF", "#CCFFFF", "#CCFFCC", "#FFFF99", "#99CCFF", "#FF99CC", "#CC99FF", "#FFCC99",
  "#3366FF", "#33CCCC", "#99CC00", "#FFCC00", "#FF9900", "#FF6600", "#666699", "#969696",
  "#003366", "#339966", "#003300", "#333300", "#993300", "#993366", "#333399", "#333333",
];

// =============================================================================
// Theme Color Index Mapping
// =============================================================================

/**
 * SpreadsheetML theme color index to DrawingML scheme color key mapping.
 * @see ECMA-376 Part 4, Section 18.8.9.1 (theme attribute)
 */
const THEME_INDEX_TO_KEY: readonly string[] = [
  "lt1", "dk1", "lt2", "dk2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink",
];

// =============================================================================
// Tint Calculation
// =============================================================================

/**
 * Apply tint to a hex color.
 * Uses the canonical color conversion from @aurochs/color.
 *
 * @see ECMA-376 Part 4, Section 18.8.9.2 (tint attribute)
 */
function applyTint(hex: string, tint: number): string {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);

  // Tint formula per ECMA-376:
  // If tint < 0: newL = L * (1 + tint)
  // If tint > 0: newL = L + (1 - L) * tint
  const newL = tint < 0 ? l * (1 + tint) : l + (1 - l) * tint;
  const clampedL = Math.max(0, Math.min(1, newL));
  const { r: newR, g: newG, b: newB } = hslToRgb(h, s, clampedL);

  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

// =============================================================================
// Color Resolution
// =============================================================================

/**
 * Resolve an XlsxColor to a CSS hex color.
 */
export function resolveXlsxColor(
  color: XlsxColor | undefined,
  colorScheme?: ColorScheme,
  indexedColors?: readonly string[],
): string | undefined {
  if (!color) {
    return undefined;
  }

  switch (color.type) {
    case "rgb":
      return resolveRgbColor(color.value);

    case "theme":
      return resolveThemeColor(color.theme, color.tint, colorScheme);

    case "indexed":
      return resolveIndexedColor(color.index, indexedColors);

    case "auto":
      return "#000000";

    default:
      return undefined;
  }
}

function resolveRgbColor(value: string): string {
  if (value.length === 8) {
    return `#${value.substring(2)}`;
  }
  return value.startsWith("#") ? value : `#${value}`;
}

function resolveThemeColor(theme: number, tint: number | undefined, colorScheme?: ColorScheme): string {
  const themeKey = THEME_INDEX_TO_KEY[theme];
  if (!themeKey || !colorScheme) {
    return "#000000";
  }

  const hexColor = colorScheme[themeKey];
  if (!hexColor) {
    return "#000000";
  }

  const normalizedHex = hexColor.startsWith("#") ? hexColor : `#${hexColor}`;

  if (tint !== undefined && tint !== 0) {
    return applyTint(normalizedHex.substring(1), tint);
  }

  return normalizedHex;
}

function resolveIndexedColor(index: number, indexedColors?: readonly string[]): string {
  const palette = indexedColors ?? DEFAULT_INDEXED_COLORS;
  return palette[index] ?? "#000000";
}

/**
 * Get the default font color (black).
 */
export function getDefaultFontColor(): string {
  return "#000000";
}

/**
 * Get the default background color (white).
 */
export function getDefaultBackgroundColor(): string {
  return "#FFFFFF";
}

/**
 * Get the default border color (black).
 */
export function getDefaultBorderColor(): string {
  return "#000000";
}
