/**
 * @file Shared text types for OOXML processing (DOCX/PPTX)
 *
 * These types represent text formatting concepts that are common across
 * WordprocessingML and DrawingML.
 *
 * @see ECMA-376 Part 1, Section 17.3 (Paragraphs and Rich Formatting - WordprocessingML)
 * @see ECMA-376 Part 1, Section 21.1.2 (Text - DrawingML)
 */

// =============================================================================
// Paragraph Alignment Types
// =============================================================================

/**
 * Paragraph horizontal alignment (justification).
 *
 * @see ECMA-376 Part 1, Section 17.18.44 (ST_Jc - WordprocessingML)
 * @see ECMA-376 Part 1, Section 20.1.10.58 (ST_TextAlignType - DrawingML)
 */
export type ParagraphAlignment =
  | "left"
  | "center"
  | "right"
  | "both"     // Justified (WordprocessingML)
  | "justify"  // Justified (DrawingML)
  | "distribute"
  | "start"    // Language-aware left/right
  | "end"      // Language-aware right/left
  | "numTab"
  | "highKashida"
  | "mediumKashida"
  | "lowKashida"
  | "thaiDistribute";

/**
 * Text vertical alignment (within a text frame or table cell).
 *
 * @see ECMA-376 Part 1, Section 21.1.2.3.10 (a:bodyPr anchor - DrawingML)
 * @see ECMA-376 Part 1, Section 17.18.101 (ST_VerticalJc - WordprocessingML)
 */
export type TextVerticalAlignment = "top" | "middle" | "bottom" | "center" | "both";

// =============================================================================
// Text Direction Types
// =============================================================================

/**
 * Text direction/flow.
 *
 * @see ECMA-376 Part 1, Section 17.18.93 (ST_TextDirection - WordprocessingML)
 * @see ECMA-376 Part 1, Section 21.1.3.6 (vert - DrawingML)
 */
export type TextDirection =
  | "lrTb"       // Left to right, top to bottom (Western)
  | "tbRl"       // Top to bottom, right to left (East Asian)
  | "btLr"       // Bottom to top, left to right
  | "lrTbV"      // Vertical left to right
  | "tbRlV"      // Vertical top to bottom
  | "tbLrV"      // Vertical top to bottom, left to right
  | "horz"       // Horizontal (DrawingML)
  | "vert"       // Vertical (DrawingML)
  | "vert270"    // Vertical 270 degrees (DrawingML)
  | "wordArtVert"
  | "eaVert"     // East Asian vertical
  | "mongolianVert";

// =============================================================================
// Line Spacing Types
// =============================================================================

/**
 * Line spacing rule type.
 *
 * @see ECMA-376 Part 1, Section 17.18.48 (ST_LineSpacingRule)
 */
export type LineSpacingRule = "auto" | "exact" | "atLeast";

/**
 * Line spacing specification.
 *
 * @see ECMA-376 Part 1, Section 17.3.1.33 (spacing - WordprocessingML)
 */
export type LineSpacing = {
  /** Line height value (in twips for exact/atLeast, or 1/240th of a line for auto) */
  readonly value: number;
  /** Line spacing rule */
  readonly rule: LineSpacingRule;
};

// =============================================================================
// Tab Stop Types
// =============================================================================

/**
 * Tab stop alignment.
 *
 * @see ECMA-376 Part 1, Section 17.18.80 (ST_TabJc)
 */
export type TabStopAlignment =
  | "left"
  | "center"
  | "right"
  | "decimal"
  | "bar"
  | "clear"
  | "num"
  | "start"
  | "end";

/**
 * Tab stop leader character.
 *
 * @see ECMA-376 Part 1, Section 17.18.81 (ST_TabTlc)
 */
export type TabStopLeader =
  | "none"
  | "dot"
  | "hyphen"
  | "underscore"
  | "heavy"
  | "middleDot";

// =============================================================================
// Text Emphasis Types
// =============================================================================

/**
 * Text emphasis mark type.
 *
 * @see ECMA-376 Part 1, Section 17.18.24 (ST_Em)
 */
export type TextEmphasisMark =
  | "none"
  | "dot"
  | "comma"
  | "circle"
  | "underDot";

// =============================================================================
// Text Case Types
// =============================================================================

/**
 * Text capitalization.
 *
 * @see ECMA-376 Part 1, Section 17.3.2.5 (caps - WordprocessingML)
 * @see ECMA-376 Part 1, Section 21.1.2.3.1 (cap - DrawingML)
 */
export type TextCapitalization = "none" | "all" | "small";

// =============================================================================
// Underline Types
// =============================================================================

/**
 * Underline style.
 *
 * @see ECMA-376 Part 1, Section 17.18.99 (ST_Underline - WordprocessingML)
 */
export type UnderlineStyle =
  | "none"
  | "single"
  | "words"
  | "double"
  | "thick"
  | "dotted"
  | "dottedHeavy"
  | "dash"
  | "dashedHeavy"
  | "dashLong"
  | "dashLongHeavy"
  | "dotDash"
  | "dashDotHeavy"
  | "dotDotDash"
  | "dashDotDotHeavy"
  | "wave"
  | "wavyHeavy"
  | "wavyDouble";

// =============================================================================
// Break Types
// =============================================================================

/**
 * Break type.
 *
 * @see ECMA-376 Part 1, Section 17.18.3 (ST_BrType)
 */
export type BreakType = "page" | "column" | "textWrapping";

/**
 * Break clear type.
 *
 * @see ECMA-376 Part 1, Section 17.18.4 (ST_BrClear)
 */
export type BreakClear = "none" | "left" | "right" | "all";
