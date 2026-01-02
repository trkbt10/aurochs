/**
 * @file Render options and dialect configuration
 *
 * PPTX rendering can vary between implementations (PowerPoint, LibreOffice, etc.)
 * This module provides dialect configuration to control rendering behavior.
 *
 * @see ECMA-376 Part 1 for official OOXML specification
 * @see https://bugs.documentfoundation.org/show_bug.cgi?id=103476 - LibreOffice line spacing issues
 * @see https://bugs.documentfoundation.org/show_bug.cgi?id=51340 - LibreOffice master slide line spacing
 */

/**
 * Rendering dialect determines how certain ambiguous or implementation-specific
 * behaviors are handled.
 *
 * - ecma376: Strict ECMA-376 specification compliance
 * - libreoffice: Match LibreOffice rendering behavior
 * - powerpoint: Match Microsoft PowerPoint behavior (future)
 */
export type RenderDialect = "ecma376" | "libreoffice" | "powerpoint";

/**
 * Line spacing interpretation mode
 *
 * OOXML spcPct (e.g., val="110000" = 110%) can be interpreted differently:
 *
 * - fontSizeMultiplier: line-height = fontSize × multiplier (ECMA-376 standard)
 *   For 32pt font with 110%: 32 × 1.1 = 35.2pt line height
 *
 * - libreofficeCompat: LibreOffice's interpretation (empirically ~75% of ECMA-376)
 *   Known issue: LibreOffice has documented bugs in line spacing interpretation
 *   @see https://bugs.documentfoundation.org/show_bug.cgi?id=103476
 */
export type LineSpacingMode = "fontSizeMultiplier" | "libreofficeCompat";

/**
 * Baseline positioning mode
 *
 * - svgBaseline: Standard SVG text baseline (y = baseline position)
 * - ascenderAdjusted: Adjust for font ascender metrics
 */
export type BaselineMode = "svgBaseline" | "ascenderAdjusted";

/**
 * Table scaling mode
 *
 * Controls how tables are sized when their natural dimensions
 * (gridCol widths + row heights) differ from the graphicFrame's xfrm.
 *
 * - natural: Use table's natural size from gridCol/row dimensions (ECMA-376 compliant)
 *   Tables are NOT stretched to fill the xfrm bounding box.
 *   This prevents distortion but may leave empty space or overflow.
 *
 * - stretchToFit: Scale table to fit xfrm dimensions (PowerPoint-like behavior)
 *   Tables are stretched/compressed to exactly fill the xfrm bounding box.
 *   This may cause non-uniform scaling (distortion) if aspect ratios differ.
 *
 * - uniformFit: Scale uniformly to fit within xfrm while preserving aspect ratio
 *   Tables maintain their aspect ratio but may not fill the entire xfrm.
 *
 * @see ECMA-376 Part 1, Section 21.1.3 (DrawingML Tables)
 */
export type TableScalingMode = "natural" | "stretchToFit" | "uniformFit";

/**
 * Render options configuration
 */
export type RenderOptions = {
  /**
   * Rendering dialect to use
   * @default "ecma376"
   */
  readonly dialect: RenderDialect;

  /**
   * Line spacing interpretation mode
   * Derived from dialect if not explicitly set
   */
  readonly lineSpacingMode: LineSpacingMode;

  /**
   * Baseline positioning mode
   * Derived from dialect if not explicitly set
   */
  readonly baselineMode: BaselineMode;

  /**
   * LibreOffice line spacing correction factor
   * Applied when lineSpacingMode is "libreofficeCompat"
   *
   * Empirically determined: LibreOffice adds ~20% to the base line height.
   * This factor adjusts our calculation to match LibreOffice output.
   *
   * @default 1.2
   */
  readonly libreofficeLineSpacingFactor: number;

  /**
   * Ascender ratio override for LibreOffice compatibility
   *
   * LibreOffice positions text baselines at approximately fontSize × 1.0
   * instead of fontSize × ascenderRatio (typically 0.75 for Calibri).
   * Set to undefined to use font-specific ascender ratios.
   *
   * @default undefined (use font-specific ratios)
   */
  readonly libreofficeAscenderOverride?: number;

  /**
   * Table scaling mode
   * Controls how tables are sized relative to their graphicFrame xfrm
   *
   * - natural: ECMA-376 compliant (no scaling, use gridCol/row dimensions)
   * - stretchToFit: Scale to fill xfrm (may distort)
   * - uniformFit: Scale uniformly to fit xfrm (preserves aspect ratio)
   *
   * @default "natural" for ecma376 dialect, "stretchToFit" for powerpoint dialect
   */
  readonly tableScalingMode: TableScalingMode;
};

/**
 * Default render options (ECMA-376 compliant)
 */
export const DEFAULT_RENDER_OPTIONS: RenderOptions = {
  dialect: "ecma376",
  lineSpacingMode: "fontSizeMultiplier",
  baselineMode: "svgBaseline",
  libreofficeLineSpacingFactor: 0.75,
  tableScalingMode: "natural", // ECMA-376: no scaling, use natural dimensions
};

/**
 * LibreOffice compatibility render options
 *
 * Empirically measured against LibreOffice 7.x baseline PNGs:
 *
 * 1. libreofficeLineSpacingFactor = 1.2:
 *    - PPTX: 100% line spacing, 24pt font
 *    - ECMA-376 calculation: 32px line height
 *    - LibreOffice renders: 60px spacing (at 150 DPI)
 *    - Ratio: 60 / (32 × 1.5625) = 1.2
 *
 * 2. libreofficeAscenderOverride = 1.0:
 *    - Standard Calibri ascender ratio: 0.75
 *    - LibreOffice positions baselines at fontSize × 1.0
 *    - This adds ~12px offset for 24pt font at 150 DPI
 */
export const LIBREOFFICE_RENDER_OPTIONS: RenderOptions = {
  dialect: "libreoffice",
  lineSpacingMode: "libreofficeCompat",
  baselineMode: "svgBaseline",
  libreofficeLineSpacingFactor: 1.2,
  libreofficeAscenderOverride: 1.0,
  tableScalingMode: "natural",
};

/**
 * PowerPoint compatibility render options
 * Use this when you want output to match PowerPoint's rendering behavior
 */
export const POWERPOINT_RENDER_OPTIONS: RenderOptions = {
  dialect: "powerpoint",
  lineSpacingMode: "fontSizeMultiplier",
  baselineMode: "svgBaseline",
  libreofficeLineSpacingFactor: 0.75,
  tableScalingMode: "stretchToFit", // PowerPoint stretches tables to fill xfrm
};

/**
 * Create render options from dialect
 */
export function createRenderOptions(
  dialect: RenderDialect = "ecma376",
  overrides?: Partial<RenderOptions>,
): RenderOptions {
  let base: RenderOptions;
  switch (dialect) {
    case "libreoffice":
      base = LIBREOFFICE_RENDER_OPTIONS;
      break;
    case "powerpoint":
      base = POWERPOINT_RENDER_OPTIONS;
      break;
    default:
      base = DEFAULT_RENDER_OPTIONS;
  }

  if (overrides === undefined) {
    return { ...base, dialect };
  }

  return {
    ...base,
    dialect,
    ...overrides,
  };
}

/**
 * Calculate effective line spacing multiplier based on render options
 *
 * @param baseMultiplier - The OOXML line spacing value (e.g., 1.1 for 110%)
 * @param options - Render options
 * @returns Effective multiplier to use for line height calculation
 */
export function getEffectiveLineSpacing(
  baseMultiplier: number,
  options: RenderOptions,
): number {
  if (options.lineSpacingMode === "libreofficeCompat") {
    // Apply LibreOffice correction factor
    // LibreOffice empirically renders line spacing at ~75% of ECMA-376 value
    return baseMultiplier * options.libreofficeLineSpacingFactor;
  }

  // ECMA-376 standard: use multiplier directly
  return baseMultiplier;
}
