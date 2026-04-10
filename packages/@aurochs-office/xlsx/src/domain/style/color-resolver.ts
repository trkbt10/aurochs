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

import type { XlsxColor } from "./color";
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

/**
 * Default theme color scheme per ECMA-376 Part 1, Annex D.
 *
 * These are the colors defined by the standard "Office" theme. Used as a
 * fallback when the document does not include a theme XML (e.g. minimal XLSX
 * files, XLS-to-XLSX conversions, or test fixtures).
 *
 * @see ECMA-376 Part 1, Section 20.1.6.2 (clrScheme) — defines the 12 required slots
 * @see Office Open XML SDK default theme for canonical hex values
 */
const DEFAULT_THEME_COLOR_SCHEME: ColorScheme = {
  lt1: "FFFFFF",
  dk1: "000000",
  lt2: "E7E6E6",
  dk2: "44546A",
  accent1: "4472C4",
  accent2: "ED7D31",
  accent3: "A5A5A5",
  accent4: "FFC000",
  accent5: "5B9BD5",
  accent6: "70AD47",
  hlink: "0563C1",
  folHlink: "954F72",
};

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

/**
 * Resolve an RGB color value to CSS hex.
 *
 * ECMA-376 specifies RGB colors as AARRGGBB (8 hex digits, no `#` prefix).
 * Some implementations may include a `#` prefix or omit the alpha channel.
 *
 * @see ECMA-376 Part 4, Section 18.8.9 (color, rgb attribute)
 */
function resolveRgbColor(value: string): string {
  const hex = value.startsWith("#") ? value.slice(1) : value;
  if (hex.length === 8) {
    // AARRGGBB → #RRGGBB (alpha is applied separately if needed)
    return `#${hex.substring(2)}`;
  }
  if (hex.length === 6) {
    return `#${hex}`;
  }
  // Unexpected length — return as-is with # prefix
  return `#${hex}`;
}

function resolveThemeColor(theme: number, tint: number | undefined, colorScheme?: ColorScheme): string | undefined {
  const themeKey = THEME_INDEX_TO_KEY[theme];
  if (!themeKey) {
    return undefined;
  }

  const scheme = colorScheme ?? DEFAULT_THEME_COLOR_SCHEME;
  const hexColor = scheme[themeKey];
  if (!hexColor) {
    return undefined;
  }

  const normalizedHex = hexColor.startsWith("#") ? hexColor : `#${hexColor}`;

  if (tint !== undefined && tint !== 0) {
    return applyTint(normalizedHex.substring(1), tint);
  }

  return normalizedHex;
}

/**
 * Normalize a palette entry to `#RRGGBB` format.
 *
 * Palette entries from `styles.xml` (`colors/indexedColors`) are stored as
 * ARGB 8-hex strings (e.g. `"00RRGGBB"` or `"FFRRGGBB"`). The alpha channel
 * is stripped — indexed colors in SpreadsheetML do not carry alpha.
 *
 * The default palette (`DEFAULT_INDEXED_COLORS`) uses `#RRGGBB` format.
 */
function normalizePaletteEntry(entry: string): string {
  const hex = entry.startsWith("#") ? entry.slice(1) : entry;
  if (hex.length === 8) {
    return `#${hex.substring(2)}`;
  }
  if (hex.length === 6) {
    return `#${hex}`;
  }
  return `#${hex}`;
}

function resolveIndexedColor(index: number, indexedColors?: readonly string[]): string {
  const palette = indexedColors ?? DEFAULT_INDEXED_COLORS;
  const entry = palette[index];
  if (!entry) {
    return "#000000";
  }
  return normalizePaletteEntry(entry);
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
