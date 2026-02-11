/**
 * @file Render options and dialect configuration for DOCX
 *
 * DOCX rendering can vary between implementations (Word, LibreOffice, etc.)
 * This module provides dialect configuration to control rendering behavior.
 *
 * @see ECMA-376 Part 1 for official OOXML specification
 */

/**
 * Rendering dialect determines how certain ambiguous or implementation-specific
 * behaviors are handled.
 *
 * - ecma376: Strict ECMA-376 specification compliance
 * - libreoffice: Match LibreOffice rendering behavior
 * - word: Match Microsoft Word behavior
 */
export type DocxRenderDialect = "ecma376" | "libreoffice" | "word";

/**
 * Line spacing interpretation mode
 *
 * OOXML spacing values can be interpreted differently:
 *
 * - fontSizeMultiplier: line-height = fontSize × multiplier (ECMA-376 standard)
 * - libreofficeCompat: LibreOffice's interpretation (empirically adjusted)
 */
export type DocxLineSpacingMode = "fontSizeMultiplier" | "libreofficeCompat";

/**
 * Baseline positioning mode
 *
 * - svgBaseline: Standard SVG text baseline (y = baseline position)
 * - ascenderAdjusted: Adjust for font ascender metrics
 */
export type DocxBaselineMode = "svgBaseline" | "ascenderAdjusted";

/**
 * Render options configuration for DOCX
 */
export type DocxRenderOptions = {
  /**
   * Rendering dialect to use
   * @default "ecma376"
   */
  readonly dialect: DocxRenderDialect;

  /**
   * Line spacing interpretation mode
   * Derived from dialect if not explicitly set
   */
  readonly lineSpacingMode: DocxLineSpacingMode;

  /**
   * Baseline positioning mode
   * Derived from dialect if not explicitly set
   */
  readonly baselineMode: DocxBaselineMode;

  /**
   * LibreOffice line spacing correction factor
   * Applied when lineSpacingMode is "libreofficeCompat"
   *
   * @default 1.2
   */
  readonly libreofficeLineSpacingFactor: number;

  /**
   * Ascender ratio override for LibreOffice compatibility
   *
   * LibreOffice positions text baselines at approximately fontSize × 1.0
   * instead of fontSize × ascenderRatio.
   * Set to undefined to use font-specific ascender ratios.
   *
   * @default undefined (use font-specific ratios)
   */
  readonly libreofficeAscenderOverride?: number;
};

/**
 * Default render options (ECMA-376 compliant)
 */
export const DEFAULT_DOCX_RENDER_OPTIONS: DocxRenderOptions = {
  dialect: "ecma376",
  lineSpacingMode: "fontSizeMultiplier",
  baselineMode: "svgBaseline",
  libreofficeLineSpacingFactor: 0.75,
};

/**
 * LibreOffice compatibility render options
 *
 * Empirically measured against LibreOffice baseline PNGs.
 * These values need calibration via visual regression tests.
 */
export const LIBREOFFICE_DOCX_RENDER_OPTIONS: DocxRenderOptions = {
  dialect: "libreoffice",
  lineSpacingMode: "libreofficeCompat",
  baselineMode: "svgBaseline",
  libreofficeLineSpacingFactor: 1.2,
  libreofficeAscenderOverride: 1.0,
};

/**
 * Microsoft Word compatibility render options
 */
export const WORD_DOCX_RENDER_OPTIONS: DocxRenderOptions = {
  dialect: "word",
  lineSpacingMode: "fontSizeMultiplier",
  baselineMode: "svgBaseline",
  libreofficeLineSpacingFactor: 0.75,
};

/**
 * Create render options from dialect
 */
export function createDocxRenderOptions(
  dialect: DocxRenderDialect = "ecma376",
  overrides?: Partial<DocxRenderOptions>,
): DocxRenderOptions {
  const resolveBase = (): DocxRenderOptions => {
    switch (dialect) {
      case "libreoffice":
        return LIBREOFFICE_DOCX_RENDER_OPTIONS;
      case "word":
        return WORD_DOCX_RENDER_OPTIONS;
      default:
        return DEFAULT_DOCX_RENDER_OPTIONS;
    }
  };
  const base = resolveBase();

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
  options: DocxRenderOptions,
): number {
  if (options.lineSpacingMode === "libreofficeCompat") {
    return baseMultiplier * options.libreofficeLineSpacingFactor;
  }
  return baseMultiplier;
}
