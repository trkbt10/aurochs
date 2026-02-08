/**
 * @file Shared types for visual regression tests
 */

/**
 * Result of a visual comparison.
 */
export type CompareResult = {
  readonly match: boolean;
  readonly diffPixels: number;
  readonly diffPercent: number;
  readonly totalPixels: number;
  readonly diffImagePath: string | null;
};

/**
 * Options for visual comparison.
 */
export type CompareOptions = {
  /** Threshold for color difference (0-1, default: 0.1) */
  readonly threshold?: number;
  /** Maximum allowed diff percentage (0-100, default: 0.1) */
  readonly maxDiffPercent?: number;
  /** Include anti-aliased pixels in diff (default: false) */
  readonly includeAA?: boolean;
  /** Extra font files to load into resvg */
  readonly resvgFontFiles?: readonly string[];
  /** Whether to load system fonts (default: true) */
  readonly resvgLoadSystemFonts?: boolean;
};

/**
 * Threshold levels for visual tests based on implementation maturity.
 */
export const VISUAL_THRESHOLDS = {
  /** New/experimental implementations */
  experimental: 25,
  /** Stabilizing implementations */
  stabilizing: 15,
  /** Mature implementations */
  mature: 5,
  /** Pixel-perfect implementations */
  pixelPerfect: 1,
} as const;
