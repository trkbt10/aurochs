/**
 * @file Text grouping strategy types for PDF to PPTX conversion.
 *
 * These types enable pluggable text grouping strategies to control
 * how individual PDF text elements are combined into PPTX TextBoxes.
 */

import type { PdfText } from "@oxen/pdf/domain";

/**
 * Bounding box for blocking zones (shapes/images that interrupt text flow).
 */
export type BlockingZone = {
  /** Left edge X coordinate in PDF points */
  readonly x: number;
  /** Bottom edge Y coordinate in PDF points */
  readonly y: number;
  /** Width in PDF points */
  readonly width: number;
  /** Height in PDF points */
  readonly height: number;
};

/**
 * Options for text grouping.
 */
export type GroupingContext = {
  /**
   * Zones that should block text grouping (shapes, images between texts).
   * Texts should not be grouped if a blocking zone is between them.
   */
  readonly blockingZones?: readonly BlockingZone[];

  /**
   * Page width in PDF points.
   * Used for column separation calculations.
   */
  readonly pageWidth?: number;

  /**
   * Page height in PDF points.
   */
  readonly pageHeight?: number;
};

/**
 * Function type for grouping PDF text elements.
 *
 * Implementations control how individual PdfText elements are
 * combined into logical groups (TextBoxes in PPTX).
 *
 * @param texts - Array of PdfText elements to group
 * @param context - Optional context with blocking zones
 * @returns Array of grouped text blocks
 */
export type TextGroupingFn = (
  texts: readonly PdfText[],
  context?: GroupingContext
) => readonly GroupedText[];

/**
 * Bounding box for a text group.
 */
export type TextBounds = {
  /** Left edge X coordinate in PDF points */
  readonly x: number;
  /** Bottom edge Y coordinate in PDF points */
  readonly y: number;
  /** Width in PDF points */
  readonly width: number;
  /** Height in PDF points */
  readonly height: number;
};

/**
 * A logical group of text elements that will become a single TextBox.
 */
export type GroupedText = {
  /** Bounding box encompassing all text in this group */
  readonly bounds: TextBounds;
  /** Paragraphs within this group (each becomes a <a:p> in PPTX) */
  readonly paragraphs: readonly GroupedParagraph[];
};

/**
 * Line spacing information with the reference font size used in calculation.
 */
export type LineSpacingInfo = {
  /** Baseline distance to next line in PDF points */
  readonly baselineDistance: number;
  /** Font size of this line used to calculate the spacing */
  readonly fontSize: number;
};

/**
 * A paragraph within a text group (typically a single line).
 */
export type GroupedParagraph = {
  /** Text runs in this paragraph */
  readonly runs: readonly PdfText[];
  /** Baseline Y coordinate in PDF points */
  readonly baselineY: number;
  /**
   * Line spacing to next paragraph.
   * Contains baseline distance and the font size of this line.
   * Undefined for the last paragraph.
   */
  readonly lineSpacing?: LineSpacingInfo;
};
