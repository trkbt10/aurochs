/**
 * @file Font metrics type definitions
 *
 * These types are duplicated from ../types.ts to avoid deep re-export issues.
 * Keep in sync with the parent module.
 */

/**
 * Character width map for individual characters.
 * Key: character, Value: width ratio relative to font size (em units)
 */
export type CharWidthMap = Record<string, number>;

/**
 * Kerning pair adjustment map.
 * Key: two-character pair, Value: adjustment in em units (negative = tighter)
 */
export type KerningPairMap = Record<string, number>;

/**
 * Font metrics for a specific font.
 */
export type FontMetrics = {
  /** Average width ratio for Latin characters (em units) */
  readonly latinAverage: number;
  /** Average width ratio for CJK characters (em units) */
  readonly cjkAverage: number;
  /** Individual character width overrides */
  readonly charWidths: CharWidthMap;
  /** Kerning pair adjustments */
  readonly kerning: KerningPairMap;
  /** Font ascender ratio (baseline position) */
  readonly ascenderRatio?: number;
  /**
   * Width scaling factor for calibration (default: 1.0).
   * All character widths are multiplied by this factor.
   * Use this to fine-tune overall text width matching.
   */
  readonly widthScale?: number;
  /**
   * Width scaling factor for bold text (default: 1.05).
   * Applied when fontWeight >= 700.
   * Bold text is typically 5-10% wider than regular text.
   */
  readonly boldWidthScale?: number;
};

/**
 * Font category for fallback metrics.
 */
export type FontCategory = "serif" | "sans-serif" | "monospace" | "cjk";
