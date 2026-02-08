/**
 * @file Generic text run formatting type
 *
 * Represents the common subset of character-level text formatting
 * across PPTX, DOCX, and XLSX. Each format adapter converts its
 * native type to/from this representation.
 *
 * All numeric values are in points. Adapters handle unit conversion.
 */

export type TextFormatting = {
  /** Primary font family name. */
  readonly fontFamily?: string;
  /** Font size in points. */
  readonly fontSize?: number;
  /** Bold toggle. */
  readonly bold?: boolean;
  /** Italic toggle. */
  readonly italic?: boolean;
  /** Underline toggle (simplified from format-specific styles). */
  readonly underline?: boolean;
  /** Strikethrough toggle (simplified from format-specific styles). */
  readonly strikethrough?: boolean;
  /** Text color as #RRGGBB hex string. */
  readonly textColor?: string;
  /** Highlight/background color as #RRGGBB hex string. */
  readonly highlightColor?: string;
  /** Superscript toggle. */
  readonly superscript?: boolean;
  /** Subscript toggle. */
  readonly subscript?: boolean;
};
