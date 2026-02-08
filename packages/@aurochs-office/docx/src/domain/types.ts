/**
 * @file DOCX-specific branded types
 *
 * These types represent ECMA-376 WordprocessingML concepts with type safety.
 * Uses branded types to prevent mixing semantically different values.
 *
 * @see ECMA-376 Part 1, Section 17 (WordprocessingML)
 */

import type { Brand, Pixels, Points } from "@aurochs-office/drawing-ml/domain/units";

// =============================================================================
// Style Identifier Types
// =============================================================================

/**
 * Style ID - unique identifier for a style definition.
 *
 * @see ECMA-376 Part 1, Section 17.7.4.17 (styleId)
 */
export type DocxStyleId = Brand<string, "DocxStyleId">;

/**
 * Create a DocxStyleId from a string.
 */
export const docxStyleId = (v: string): DocxStyleId => v as DocxStyleId;

// =============================================================================
// Numbering Identifier Types
// =============================================================================

/**
 * Abstract numbering ID - references an abstract numbering definition.
 *
 * @see ECMA-376 Part 1, Section 17.9.1 (abstractNumId)
 */
export type DocxAbstractNumId = Brand<number, "DocxAbstractNumId">;

/**
 * Create a DocxAbstractNumId from a number.
 */
export const docxAbstractNumId = (v: number): DocxAbstractNumId => v as DocxAbstractNumId;

/**
 * Numbering instance ID - references a numbering instance.
 *
 * @see ECMA-376 Part 1, Section 17.9.15 (numId)
 */
export type DocxNumId = Brand<number, "DocxNumId">;

/**
 * Create a DocxNumId from a number.
 */
export const docxNumId = (v: number): DocxNumId => v as DocxNumId;

/**
 * Numbering level index (0-8).
 *
 * @see ECMA-376 Part 1, Section 17.9.6 (ilvl)
 */
export type DocxIlvl = Brand<number, "DocxIlvl">;

/**
 * Create a DocxIlvl from a number.
 */
export const docxIlvl = (v: number): DocxIlvl => v as DocxIlvl;

// =============================================================================
// Document Structure Identifier Types
// =============================================================================

/**
 * Bookmark ID.
 *
 * @see ECMA-376 Part 1, Section 17.13.6.2 (bookmarkStart)
 */
export type BookmarkId = Brand<number, "BookmarkId">;

/**
 * Create a BookmarkId from a number.
 */
export const bookmarkId = (v: number): BookmarkId => v as BookmarkId;

/**
 * Comment ID.
 *
 * @see ECMA-376 Part 1, Section 17.13.4.2 (commentReference)
 */
export type CommentId = Brand<number, "CommentId">;

/**
 * Create a CommentId from a number.
 */
export const commentId = (v: number): CommentId => v as CommentId;

/**
 * Footnote/Endnote ID.
 *
 * @see ECMA-376 Part 1, Section 17.11.7 (footnoteReference)
 */
export type NoteId = Brand<number, "NoteId">;

/**
 * Create a NoteId from a number.
 */
export const noteId = (v: number): NoteId => v as NoteId;

// =============================================================================
// Relationship Identifier Types
// =============================================================================

/**
 * Relationship ID - references a relationship in .rels file.
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 */
export type DocxRelId = Brand<string, "DocxRelId">;

/**
 * Create a DocxRelId from a string.
 */
export const docxRelId = (v: string): DocxRelId => v as DocxRelId;

// =============================================================================
// Measurement Types
// =============================================================================

/**
 * Twips (twentieths of a point).
 *
 * 1 twip = 1/20 pt = 1/1440 inch
 *
 * @see ECMA-376 Part 1, Section 17.18.23 (ST_TwipsMeasure)
 */
export type Twips = Brand<number, "Twips">;

/**
 * Create a Twips value from a number.
 */
export const twips = (v: number): Twips => v as Twips;

/**
 * Convert twips to pixels.
 *
 * 1 inch = 1440 twips = 96 pixels
 * Therefore: 1 twip = 96/1440 = 1/15 pixels
 */
export function twipsToPixels(value: Twips): Pixels {
  return (value / 15) as Pixels;
}

/**
 * Convert twips to points.
 *
 * 1 point = 20 twips
 */
export function twipsToPoints(value: Twips): Points {
  return (value / 20) as Points;
}

/**
 * Half-points (for font sizes).
 *
 * Font sizes in WordprocessingML are specified in half-points.
 * 1 half-point = 0.5 pt
 *
 * @see ECMA-376 Part 1, Section 17.18.42 (ST_HpsMeasure)
 */
export type HalfPoints = Brand<number, "HalfPoints">;

/**
 * Create a HalfPoints value from a number.
 */
export const halfPoints = (v: number): HalfPoints => v as HalfPoints;

/**
 * Convert half-points to points.
 */
export function halfPointsToPoints(value: HalfPoints): Points {
  return (value / 2) as Points;
}

/**
 * Signed twips measure (for relative positioning).
 *
 * @see ECMA-376 Part 1, Section 17.18.84 (ST_SignedTwipsMeasure)
 */
export type SignedTwips = Brand<number, "SignedTwips">;

/**
 * Create a SignedTwips value from a number.
 */
export const signedTwips = (v: number): SignedTwips => v as SignedTwips;

// =============================================================================
// Table Position Types
// =============================================================================

/**
 * Table row index (0-based).
 */
export type DocxRowIndex = Brand<number, "DocxRowIndex">;

/**
 * Create a DocxRowIndex from a number.
 */
export const docxRowIndex = (v: number): DocxRowIndex => v as DocxRowIndex;

/**
 * Table cell index within a row (0-based).
 */
export type DocxCellIndex = Brand<number, "DocxCellIndex">;

/**
 * Create a DocxCellIndex from a number.
 */
export const docxCellIndex = (v: number): DocxCellIndex => v as DocxCellIndex;

// =============================================================================
// Header/Footer Types
// =============================================================================

/**
 * Header/Footer type.
 *
 * @see ECMA-376 Part 1, Section 17.10.5 (hdrFtrRef)
 */
export type HeaderFooterType = "default" | "first" | "even";

// =============================================================================
// Section Break Types
// =============================================================================

/**
 * Section break type.
 *
 * @see ECMA-376 Part 1, Section 17.18.77 (ST_SectionMark)
 */
export type SectionBreakType =
  | "continuous" // Continuous section break
  | "evenPage" // Even page section break
  | "nextColumn" // Next column section break
  | "nextPage" // Next page section break
  | "oddPage"; // Odd page section break
