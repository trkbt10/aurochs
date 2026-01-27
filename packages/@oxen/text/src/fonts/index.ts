/**
 * @file Font metrics registry
 *
 * Central registry for font-specific metrics.
 * Add new fonts by:
 * 1. Create a new file in this folder (e.g., arial.ts)
 * 2. Define the FontMetrics object
 * 3. Import and register in FONT_REGISTRY below
 */

import type { FontMetrics, FontCategory } from "./types";
import { DEFAULT_CHAR_WIDTHS, SANS_SERIF_KERNING, SERIF_KERNING, COMMON_KERNING_PAIRS } from "./common";
import { CALIBRI_METRICS } from "./calibri";

// =============================================================================
// Category Fallback Metrics
// =============================================================================

/**
 * Sans-serif fallback metrics (Arial, Helvetica, etc.)
 */
const SANS_SERIF_METRICS: FontMetrics = {
  latinAverage: 0.52,
  cjkAverage: 1.0,
  charWidths: {
    ...DEFAULT_CHAR_WIDTHS,
    i: 0.22,
    l: 0.22,
    I: 0.28,
  },
  kerning: SANS_SERIF_KERNING,
};

/**
 * Serif fallback metrics (Times New Roman, Georgia, etc.)
 */
const SERIF_METRICS: FontMetrics = {
  latinAverage: 0.5,
  cjkAverage: 1.0,
  charWidths: {
    ...DEFAULT_CHAR_WIDTHS,
    i: 0.28,
    l: 0.28,
  },
  kerning: SERIF_KERNING,
};

/**
 * Monospace fallback metrics (Consolas, Courier, etc.)
 */
const MONOSPACE_METRICS: FontMetrics = {
  latinAverage: 0.6,
  cjkAverage: 1.0,
  charWidths: {}, // All characters use fixed width
  kerning: {}, // No kerning in monospace
};

/**
 * CJK fallback metrics (MS Gothic, Yu Gothic, etc.)
 */
const CJK_METRICS: FontMetrics = {
  latinAverage: 0.5,
  cjkAverage: 1.0,
  charWidths: DEFAULT_CHAR_WIDTHS,
  kerning: COMMON_KERNING_PAIRS,
};

/**
 * Category to fallback metrics mapping
 */
const CATEGORY_METRICS: Record<FontCategory, FontMetrics> = {
  "sans-serif": SANS_SERIF_METRICS,
  serif: SERIF_METRICS,
  monospace: MONOSPACE_METRICS,
  cjk: CJK_METRICS,
};

// =============================================================================
// Font Registry
// =============================================================================

/**
 * Font-specific metrics registry.
 *
 * To add a new font:
 * 1. Create a file (e.g., src/text/fonts/arial.ts)
 * 2. Export the metrics: export const ARIAL_METRICS: FontMetrics = { ... }
 * 3. Import and add to this registry: import { ARIAL_METRICS } from "./arial";
 * 4. Add entry: arial: ARIAL_METRICS
 */
const FONT_REGISTRY: Record<string, FontMetrics> = {
  calibri: CALIBRI_METRICS,
  // Add more fonts here as they are measured:
  // arial: ARIAL_METRICS,
  // "times new roman": TIMES_NEW_ROMAN_METRICS,
};

/**
 * Font family to category mapping for fallback
 */
const FONT_CATEGORY_MAP: Record<string, FontCategory> = {
  // Sans-serif fonts
  arial: "sans-serif",
  helvetica: "sans-serif",
  "segoe ui": "sans-serif",
  "san francisco": "sans-serif",
  roboto: "sans-serif",
  "open sans": "sans-serif",
  lato: "sans-serif",
  verdana: "sans-serif",
  tahoma: "sans-serif",
  trebuchet: "sans-serif",
  "trebuchet ms": "sans-serif",
  "century gothic": "sans-serif",
  "gill sans": "sans-serif",

  // Serif fonts
  "times new roman": "serif",
  times: "serif",
  georgia: "serif",
  garamond: "serif",
  palatino: "serif",
  "book antiqua": "serif",
  cambria: "serif",
  "century schoolbook": "serif",

  // Monospace fonts
  consolas: "monospace",
  "courier new": "monospace",
  courier: "monospace",
  monaco: "monospace",
  menlo: "monospace",
  "lucida console": "monospace",
  "dejavu sans mono": "monospace",
  "source code pro": "monospace",

  // CJK fonts
  "ms gothic": "cjk",
  "ms-pgothic": "cjk",
  "ms mincho": "cjk",
  "yu gothic": "cjk",
  "yu mincho": "cjk",
  meiryo: "cjk",
  hgmarugothicmpro: "cjk",
  "hiragino kaku gothic": "cjk",
  "hiragino mincho": "cjk",
  "noto sans cjk": "cjk",
  "noto serif cjk": "cjk",
  "source han sans": "cjk",
  "source han serif": "cjk",
  simsun: "cjk",
  simhei: "cjk",
  "microsoft yahei": "cjk",
  malgun: "cjk",
  "malgun gothic": "cjk",
};

// =============================================================================
// Public API
// =============================================================================

/**
 * Normalize font family name for lookup
 */
function normalizeFontName(fontFamily: string): string {
  const primary = fontFamily.split(",")[0]?.trim() ?? fontFamily;
  return primary.toLowerCase().replace(/["']/g, "").trim();
}

/**
 * Get font category for a given font family.
 */
export function getFontCategory(fontFamily: string | undefined): FontCategory {
  if (fontFamily === undefined || fontFamily === "") {
    return "sans-serif";
  }

  const normalized = normalizeFontName(fontFamily);

  // Exact match
  if (normalized in FONT_CATEGORY_MAP) {
    return FONT_CATEGORY_MAP[normalized];
  }

  // Partial match
  for (const [key, category] of Object.entries(FONT_CATEGORY_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return category;
    }
  }

  return "sans-serif";
}

/**
 * Get font metrics for a given font family.
 *
 * Checks font-specific registry first, then falls back to category metrics.
 */
export function getFontMetrics(fontFamily: string | undefined): FontMetrics {
  if (fontFamily !== undefined) {
    const normalized = normalizeFontName(fontFamily);

    // Check font-specific metrics
    if (normalized in FONT_REGISTRY) {
      return FONT_REGISTRY[normalized];
    }
  }

  // Fall back to category metrics
  const category = getFontCategory(fontFamily);
  return CATEGORY_METRICS[category];
}

/**
 * Check if a font is monospace.
 */
export function isMonospace(fontFamily: string | undefined): boolean {
  return getFontCategory(fontFamily) === "monospace";
}
