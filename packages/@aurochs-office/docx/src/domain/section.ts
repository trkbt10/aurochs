/**
 * @file DOCX Section Properties Type Definitions
 *
 * This module defines section-level properties for WordprocessingML.
 * Sections define page layout, headers/footers, and other document-level settings.
 *
 * @see ECMA-376 Part 1, Section 17.6 (Sections)
 */

import type { DocxRelId, Twips, SectionBreakType, HeaderFooterType } from "./types";

// =============================================================================
// Page Size
// =============================================================================

/**
 * Page size and orientation.
 *
 * @see ECMA-376 Part 1, Section 17.6.13 (pgSz)
 */
export type DocxPageSize = {
  /** Page width in twips */
  readonly w: Twips;
  /** Page height in twips */
  readonly h: Twips;
  /** Page orientation */
  readonly orient?: "portrait" | "landscape";
  /** Paper source code (printer-specific) */
  readonly code?: number;
};

// =============================================================================
// Page Margins
// =============================================================================

/**
 * Page margins.
 *
 * @see ECMA-376 Part 1, Section 17.6.11 (pgMar)
 */
export type DocxPageMargins = {
  /** Top margin in twips */
  readonly top: Twips;
  /** Right margin in twips */
  readonly right: Twips;
  /** Bottom margin in twips */
  readonly bottom: Twips;
  /** Left margin in twips */
  readonly left: Twips;
  /** Header distance from top edge in twips */
  readonly header?: Twips;
  /** Footer distance from bottom edge in twips */
  readonly footer?: Twips;
  /** Gutter margin in twips */
  readonly gutter?: Twips;
};

// =============================================================================
// Page Borders
// =============================================================================

/**
 * Page border edge.
 *
 * @see ECMA-376 Part 1, Section 17.6.8 (pgBorders children)
 */
export type DocxPageBorderEdge = {
  /** Border style */
  readonly val: string;
  /** Border width in eighths of a point */
  readonly sz?: number;
  /** Border spacing in points */
  readonly space?: number;
  /** Border color */
  readonly color?: string;
  /** Theme color */
  readonly themeColor?: string;
  /** Shadow effect */
  readonly shadow?: boolean;
  /** Frame border */
  readonly frame?: boolean;
};

/**
 * Page borders.
 *
 * @see ECMA-376 Part 1, Section 17.6.10 (pgBorders)
 */
export type DocxPageBorders = {
  /** Display option */
  readonly display?: "allPages" | "firstPage" | "notFirstPage";
  /** Offset from (page edge or text) */
  readonly offsetFrom?: "page" | "text";
  /** Z-order relative to text */
  readonly zOrder?: "front" | "back";
  /** Top border */
  readonly top?: DocxPageBorderEdge;
  /** Left border */
  readonly left?: DocxPageBorderEdge;
  /** Bottom border */
  readonly bottom?: DocxPageBorderEdge;
  /** Right border */
  readonly right?: DocxPageBorderEdge;
};

// =============================================================================
// Columns
// =============================================================================

/**
 * Individual column definition.
 *
 * @see ECMA-376 Part 1, Section 17.6.3 (col)
 */
export type DocxColumn = {
  /** Column width in twips */
  readonly w?: Twips;
  /** Space after column in twips */
  readonly space?: Twips;
};

/**
 * Column layout settings.
 *
 * @see ECMA-376 Part 1, Section 17.6.4 (cols)
 */
export type DocxColumns = {
  /** Number of columns */
  readonly num?: number;
  /** Equal column widths */
  readonly equalWidth?: boolean;
  /** Space between columns in twips */
  readonly space?: Twips;
  /** Separator line between columns */
  readonly sep?: boolean;
  /** Individual column definitions */
  readonly col?: readonly DocxColumn[];
};

// =============================================================================
// Header/Footer References
// =============================================================================

/**
 * Header/Footer reference.
 *
 * @see ECMA-376 Part 1, Section 17.10.5 (hdrFtrRef)
 */
export type DocxHeaderFooterRef = {
  /** Reference type (default, first, even) */
  readonly type: HeaderFooterType;
  /** Relationship ID */
  readonly rId: DocxRelId;
};

// =============================================================================
// Line Numbering
// =============================================================================

/**
 * Line numbering settings.
 *
 * @see ECMA-376 Part 1, Section 17.6.8 (lnNumType)
 */
export type DocxLineNumbering = {
  /** Count by (increment) */
  readonly countBy?: number;
  /** Starting value */
  readonly start?: number;
  /** Restart mode */
  readonly restart?: "continuous" | "newPage" | "newSection";
  /** Distance from text in twips */
  readonly distance?: Twips;
};

// =============================================================================
// Page Numbering
// =============================================================================

/**
 * Page number format type.
 *
 * @see ECMA-376 Part 1, Section 17.18.59 (ST_NumberFormat)
 */
export type DocxPageNumberFormat =
  | "decimal"
  | "upperRoman"
  | "lowerRoman"
  | "upperLetter"
  | "lowerLetter"
  | "ordinal"
  | "cardinalText"
  | "ordinalText"
  | "none";

/**
 * Page numbering settings.
 *
 * @see ECMA-376 Part 1, Section 17.6.12 (pgNumType)
 */
export type DocxPageNumberType = {
  /** Page number format */
  readonly fmt?: DocxPageNumberFormat;
  /** Starting page number */
  readonly start?: number;
  /** Chapter style */
  readonly chapStyle?: number;
  /** Chapter separator */
  readonly chapSep?: "colon" | "period" | "hyphen" | "emDash" | "enDash";
};

// =============================================================================
// Document Grid
// =============================================================================

/**
 * Document grid type.
 *
 * @see ECMA-376 Part 1, Section 17.18.14 (ST_DocGrid)
 */
export type DocxDocGridType =
  | "default"
  | "lines"
  | "linesAndChars"
  | "snapToChars";

/**
 * Document grid settings.
 *
 * @see ECMA-376 Part 1, Section 17.6.5 (docGrid)
 */
export type DocxDocGrid = {
  /** Grid type */
  readonly type?: DocxDocGridType;
  /** Line pitch in twips */
  readonly linePitch?: Twips;
  /** Character pitch in twips */
  readonly charSpace?: number;
};

// =============================================================================
// Vertical Alignment
// =============================================================================

/**
 * Vertical alignment of section content.
 *
 * @see ECMA-376 Part 1, Section 17.18.99 (ST_VerticalJc)
 */
export type DocxVerticalJc = "top" | "center" | "both" | "bottom";

// =============================================================================
// Form Protection
// =============================================================================

/**
 * Form protection type.
 *
 * @see ECMA-376 Part 1, Section 17.6.7 (formProt)
 */
export type DocxFormProt = {
  /** Protection enabled */
  readonly val?: boolean;
};

// =============================================================================
// Section Properties
// =============================================================================

/**
 * Section properties.
 *
 * @see ECMA-376 Part 1, Section 17.6.17 (sectPr)
 */
export type DocxSectionProperties = {
  /** Section break type */
  readonly type?: SectionBreakType;

  // --- Page Settings ---
  /** Page size and orientation */
  readonly pgSz?: DocxPageSize;
  /** Page margins */
  readonly pgMar?: DocxPageMargins;
  /** Page borders */
  readonly pgBorders?: DocxPageBorders;
  /** Paper source (first page) */
  readonly paperSrc?: { first?: number; other?: number };

  // --- Columns ---
  /** Column layout */
  readonly cols?: DocxColumns;

  // --- Headers and Footers ---
  /** Header references */
  readonly headerReference?: readonly DocxHeaderFooterRef[];
  /** Footer references */
  readonly footerReference?: readonly DocxHeaderFooterRef[];
  /** Different first page header/footer */
  readonly titlePg?: boolean;

  // --- Line and Page Numbering ---
  /** Line numbering */
  readonly lnNumType?: DocxLineNumbering;
  /** Page numbering */
  readonly pgNumType?: DocxPageNumberType;

  // --- Document Grid ---
  /** Document grid */
  readonly docGrid?: DocxDocGrid;

  // --- Text Direction ---
  /** Bidirectional section */
  readonly bidi?: boolean;
  /** Right-to-left gutter */
  readonly rtlGutter?: boolean;
  /**
   * Text direction for the section.
   * Controls how text flows and how lines are stacked.
   *
   * Values: lrTb, tbRl, btLr, lrTbV, tbRlV, tbLrV
   * @see ECMA-376-1:2016 Section 17.6.23 (textDirection)
   * @see ECMA-376-1:2016 Section 17.18.93 (ST_TextDirection)
   */
  readonly textDirection?: "lrTb" | "tbRl" | "btLr" | "lrTbV" | "tbRlV" | "tbLrV";

  // --- Vertical Alignment ---
  /** Vertical alignment of section content */
  readonly vAlign?: DocxVerticalJc;

  // --- Form Protection ---
  /** Form protection */
  readonly formProt?: DocxFormProt;

  // --- Footnote/Endnote Settings ---
  /** Footnote properties for this section */
  readonly footnotePr?: DocxNotePr;
  /** Endnote properties for this section */
  readonly endnotePr?: DocxNotePr;

  // --- Text Flow ---
  /** No endnote in this section */
  readonly noEndnote?: boolean;
};

/**
 * Footnote/Endnote section properties.
 *
 * @see ECMA-376 Part 1, Section 17.11.20 (footnotePr/endnotePr in sectPr)
 */
export type DocxNotePr = {
  /** Note position */
  readonly pos?: "pageBottom" | "beneathText" | "sectEnd" | "docEnd";
  /** Number format */
  readonly numFmt?: DocxPageNumberFormat;
  /** Starting number */
  readonly numStart?: number;
  /** Number restart mode */
  readonly numRestart?: "continuous" | "eachSect" | "eachPage";
};
