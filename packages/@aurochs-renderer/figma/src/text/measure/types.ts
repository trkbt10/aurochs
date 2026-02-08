/**
 * @file Text measurement type definitions
 */

import type { FontMetrics } from "../../font/index";

/**
 * Text measurement result
 */
export type TextMeasurement = {
  /** Total width of the measured text */
  readonly width: number;
  /** Total height of the measured text */
  readonly height: number;
  /** Ascender (above baseline) */
  readonly ascent: number;
  /** Descender (below baseline, positive value) */
  readonly descent: number;
  /** Height of capital letters */
  readonly capHeight?: number;
  /** Individual character widths (if requested) */
  readonly charWidths?: readonly number[];
};

/**
 * Line measurement result
 */
export type LineMeasurement = {
  /** Text content of the line */
  readonly text: string;
  /** Width of the line */
  readonly width: number;
  /** Start index in original text */
  readonly startIndex: number;
  /** End index in original text */
  readonly endIndex: number;
};

/**
 * Multi-line text measurement result
 */
export type MultiLineMeasurement = {
  /** Individual line measurements */
  readonly lines: readonly LineMeasurement[];
  /** Maximum line width */
  readonly maxWidth: number;
  /** Total height including line spacing */
  readonly totalHeight: number;
  /** Line height used */
  readonly lineHeight: number;
};

/**
 * Font specification for measurement
 */
export type FontSpec = {
  /** Font family (CSS font-family string) */
  readonly fontFamily: string;
  /** Font size in pixels */
  readonly fontSize: number;
  /** Font weight (100-900) */
  readonly fontWeight?: number;
  /** Font style (normal, italic, oblique) */
  readonly fontStyle?: "normal" | "italic" | "oblique";
  /** Letter spacing in pixels */
  readonly letterSpacing?: number;
};

/**
 * Line break mode
 */
export type LineBreakMode =
  | "none" // No line breaking
  | "word" // Break at word boundaries
  | "char" // Break at character boundaries
  | "auto"; // Word break first, then char break if word doesn't fit

/**
 * Line break options
 */
export type LineBreakOptions = {
  /** Maximum width for each line (in pixels) */
  readonly maxWidth: number;
  /** Line break mode */
  readonly mode?: LineBreakMode;
  /** Maximum number of lines (optional, 0 = unlimited) */
  readonly maxLines?: number;
  /** Truncation indicator when max lines exceeded */
  readonly ellipsis?: string;
};

/**
 * Measurement provider interface
 *
 * Abstraction over different measurement implementations
 * (Canvas API, opentype.js, etc.)
 */
export type MeasurementProvider = {
  /**
   * Measure text with given font specification
   */
  measureText(text: string, font: FontSpec): TextMeasurement;

  /**
   * Get font metrics for a font specification
   */
  getFontMetrics?(font: FontSpec): FontMetrics;

  /**
   * Measure individual character widths
   */
  measureCharWidths?(text: string, font: FontSpec): readonly number[];
};

/**
 * Text measurer configuration
 */
export type TextMeasurerConfig = {
  /** Measurement provider */
  readonly provider: MeasurementProvider;
  /** Default line break mode */
  readonly defaultLineBreakMode?: LineBreakMode;
};

/**
 * Word segment for line breaking
 */
export type WordSegment = {
  /** The word text */
  readonly text: string;
  /** Width of the word */
  readonly width: number;
  /** Start index in original text */
  readonly startIndex: number;
  /** End index in original text */
  readonly endIndex: number;
  /** Whether this is a whitespace segment */
  readonly isWhitespace: boolean;
};
