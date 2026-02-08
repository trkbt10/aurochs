/**
 * @file Generic paragraph formatting type
 *
 * Represents the common subset of paragraph-level formatting
 * across PPTX, DOCX, and XLSX. All spacing/indent values are in points.
 */

export type HorizontalAlignment = "left" | "center" | "right" | "justify";

export type ParagraphFormatting = {
  /** Horizontal text alignment. */
  readonly alignment?: HorizontalAlignment;
  /** Left indentation in points. */
  readonly indentLeft?: number;
  /** Right indentation in points. */
  readonly indentRight?: number;
  /** First line indent in points. */
  readonly firstLineIndent?: number;
  /** Space before paragraph in points. */
  readonly spaceBefore?: number;
  /** Space after paragraph in points. */
  readonly spaceAfter?: number;
  /** Line spacing as multiplier (1.0 = single, 1.5 = 1.5x, 2.0 = double). */
  readonly lineSpacing?: number;
};
