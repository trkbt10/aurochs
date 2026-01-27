/**
 * @file DOCX Table Domain Type Definitions
 *
 * This module defines table-related types for WordprocessingML.
 * Tables in DOCX consist of rows, cells, and table-level properties.
 *
 * @see ECMA-376 Part 1, Section 17.4 (Tables)
 */

import type {
  TableGridColumn,
  TableWidth,
  TableCellMargins,
  TableAlignment,
  TableCellVerticalAlignment,
  TableLayoutType,
  GridSpan,
  VerticalMerge,
} from "@oxen/ooxml/domain/table";
import type { WordBorderStyle, EighthPoints } from "@oxen/ooxml/domain/border";
import type { DocxStyleId, Twips } from "./types";
import type { DocxParagraph } from "./paragraph";
import type { DocxShading, DocxThemeColor } from "./run";

// =============================================================================
// Table Border Types
// =============================================================================

/**
 * Single table border edge.
 *
 * @see ECMA-376 Part 1, Section 17.4.4 (tblBorders)
 */
export type DocxTableBorderEdge = {
  /** Border style */
  readonly val: WordBorderStyle;
  /** Border width in eighths of a point */
  readonly sz?: EighthPoints;
  /** Border spacing in points */
  readonly space?: number;
  /** Border color (RGB hex or "auto") */
  readonly color?: string;
  /** Theme color for border */
  readonly themeColor?: DocxThemeColor;
  /** Shadow effect */
  readonly shadow?: boolean;
  /** Frame border */
  readonly frame?: boolean;
};

/**
 * Table borders collection.
 *
 * @see ECMA-376 Part 1, Section 17.4.4 (tblBorders)
 */
export type DocxTableBorders = {
  /** Top border */
  readonly top?: DocxTableBorderEdge;
  /** Left border */
  readonly left?: DocxTableBorderEdge;
  /** Bottom border */
  readonly bottom?: DocxTableBorderEdge;
  /** Right border */
  readonly right?: DocxTableBorderEdge;
  /** Inside horizontal border */
  readonly insideH?: DocxTableBorderEdge;
  /** Inside vertical border */
  readonly insideV?: DocxTableBorderEdge;
};

/**
 * Cell borders collection.
 *
 * @see ECMA-376 Part 1, Section 17.4.78 (tcBorders)
 */
export type DocxCellBorders = {
  /** Top border */
  readonly top?: DocxTableBorderEdge;
  /** Left border */
  readonly left?: DocxTableBorderEdge;
  /** Bottom border */
  readonly bottom?: DocxTableBorderEdge;
  /** Right border */
  readonly right?: DocxTableBorderEdge;
  /** Inside horizontal border (for merged cells) */
  readonly insideH?: DocxTableBorderEdge;
  /** Inside vertical border (for merged cells) */
  readonly insideV?: DocxTableBorderEdge;
  /** Top-left to bottom-right diagonal */
  readonly tl2br?: DocxTableBorderEdge;
  /** Top-right to bottom-left diagonal */
  readonly tr2bl?: DocxTableBorderEdge;
};

// =============================================================================
// Table Cell Properties
// =============================================================================

/**
 * Table cell width.
 *
 * @see ECMA-376 Part 1, Section 17.4.72 (tcW)
 */
export type DocxCellWidth = TableWidth;

/**
 * Table cell properties.
 *
 * @see ECMA-376 Part 1, Section 17.4.66 (tcPr)
 */
export type DocxTableCellProperties = {
  /** Cell width */
  readonly tcW?: DocxCellWidth;
  /** Grid columns spanned */
  readonly gridSpan?: GridSpan;
  /** Horizontal merge */
  readonly hMerge?: "restart" | "continue";
  /** Vertical merge */
  readonly vMerge?: VerticalMerge;
  /** Cell borders */
  readonly tcBorders?: DocxCellBorders;
  /** Cell shading */
  readonly shd?: DocxShading;
  /** Cell margins */
  readonly tcMar?: TableCellMargins;
  /** Text direction */
  readonly textDirection?: "lrTb" | "tbRl" | "btLr" | "lrTbV" | "tbRlV" | "tbLrV";
  /** Vertical alignment */
  readonly vAlign?: TableCellVerticalAlignment;
  /** No text wrap */
  readonly noWrap?: boolean;
  /** Fit text to cell */
  readonly tcFitText?: boolean;
  /** Hide cell marker */
  readonly hideMark?: boolean;
};

/**
 * Table cell element.
 *
 * @see ECMA-376 Part 1, Section 17.4.65 (tc)
 */
export type DocxTableCell = {
  readonly type: "tableCell";
  /** Cell properties */
  readonly properties?: DocxTableCellProperties;
  /** Cell content (paragraphs, tables, etc.) */
  readonly content: readonly (DocxParagraph | DocxTable)[];
};

// =============================================================================
// Table Row Properties
// =============================================================================

/**
 * Table row height.
 *
 * @see ECMA-376 Part 1, Section 17.4.81 (trHeight)
 */
export type DocxRowHeight = {
  /** Height value in twips */
  readonly val: Twips;
  /** Height rule */
  readonly hRule?: "auto" | "atLeast" | "exact";
};

/**
 * Table row properties.
 *
 * @see ECMA-376 Part 1, Section 17.4.82 (trPr)
 */
export type DocxTableRowProperties = {
  /** Row height */
  readonly trHeight?: DocxRowHeight;
  /** Repeat as header row on each page */
  readonly tblHeader?: boolean;
  /** Table row cannot split across pages */
  readonly cantSplit?: boolean;
  /** Justify all columns using table width */
  readonly jc?: TableAlignment;
  /** Hidden row */
  readonly hidden?: boolean;
  /** Cells before first cell in row (for merged cells) */
  readonly gridBefore?: number;
  /** Width of grid columns before first cell */
  readonly wBefore?: TableWidth;
  /** Cells after last cell in row (for merged cells) */
  readonly gridAfter?: number;
  /** Width of grid columns after last cell */
  readonly wAfter?: TableWidth;
};

/**
 * Table row element.
 *
 * @see ECMA-376 Part 1, Section 17.4.79 (tr)
 */
export type DocxTableRow = {
  readonly type: "tableRow";
  /** Row properties */
  readonly properties?: DocxTableRowProperties;
  /** Row cells */
  readonly cells: readonly DocxTableCell[];
};

// =============================================================================
// Table Properties
// =============================================================================

/**
 * Table positioning for floating tables.
 *
 * @see ECMA-376 Part 1, Section 17.4.51 (tblpPr)
 */
export type DocxTablePositioning = {
  /** Horizontal anchor */
  readonly horzAnchor?: "margin" | "page" | "text";
  /** Vertical anchor */
  readonly vertAnchor?: "margin" | "page" | "text";
  /** Horizontal position */
  readonly tblpX?: Twips;
  /** Horizontal alignment */
  readonly tblpXSpec?: "left" | "center" | "right" | "inside" | "outside";
  /** Vertical position */
  readonly tblpY?: Twips;
  /** Vertical alignment */
  readonly tblpYSpec?: "top" | "center" | "bottom" | "inside" | "outside";
  /** Left distance from text */
  readonly leftFromText?: Twips;
  /** Right distance from text */
  readonly rightFromText?: Twips;
  /** Top distance from text */
  readonly topFromText?: Twips;
  /** Bottom distance from text */
  readonly bottomFromText?: Twips;
};

/**
 * Table cell spacing (margins between cells).
 *
 * @see ECMA-376 Part 1, Section 17.4.44 (tblCellSpacing)
 */
export type DocxTableCellSpacing = {
  /** Spacing width */
  readonly w?: number;
  /** Spacing type */
  readonly type?: "auto" | "dxa" | "nil" | "pct";
};

/**
 * Table properties.
 *
 * @see ECMA-376 Part 1, Section 17.4.60 (tblPr)
 */
export type DocxTableProperties = {
  /** Table style */
  readonly tblStyle?: DocxStyleId;
  /** Table width */
  readonly tblW?: TableWidth;
  /** Table alignment */
  readonly jc?: TableAlignment;
  /** Table indentation */
  readonly tblInd?: TableWidth;
  /** Table borders */
  readonly tblBorders?: DocxTableBorders;
  /** Table shading */
  readonly shd?: DocxShading;
  /** Table cell margins (default for all cells) */
  readonly tblCellMar?: TableCellMargins;
  /** Table cell spacing */
  readonly tblCellSpacing?: DocxTableCellSpacing;
  /** Table layout algorithm */
  readonly tblLayout?: TableLayoutType;
  /** Table positioning (for floating tables) */
  readonly tblpPr?: DocxTablePositioning;
  /** Visual appearance options */
  readonly tblLook?: DocxTableLook;
  /** Table caption */
  readonly tblCaption?: string;
  /** Table description */
  readonly tblDescription?: string;
  /** Overlap behavior */
  readonly tblOverlap?: "never" | "overlap";
  /** Bidirectional table */
  readonly bidiVisual?: boolean;
};

/**
 * Table visual appearance options.
 *
 * @see ECMA-376 Part 1, Section 17.4.55 (tblLook)
 */
export type DocxTableLook = {
  /** Display first row as header */
  readonly firstRow?: boolean;
  /** Display last row differently */
  readonly lastRow?: boolean;
  /** Display first column differently */
  readonly firstColumn?: boolean;
  /** Display last column differently */
  readonly lastColumn?: boolean;
  /** No horizontal banding */
  readonly noHBand?: boolean;
  /** No vertical banding */
  readonly noVBand?: boolean;
};

// =============================================================================
// Table Type
// =============================================================================

/**
 * Table grid definition.
 *
 * @see ECMA-376 Part 1, Section 17.4.49 (tblGrid)
 */
export type DocxTableGrid = {
  /** Grid columns */
  readonly columns: readonly TableGridColumn[];
};

/**
 * Table element.
 *
 * @see ECMA-376 Part 1, Section 17.4.38 (tbl)
 */
export type DocxTable = {
  readonly type: "table";
  /** Table properties */
  readonly properties?: DocxTableProperties;
  /** Table grid definition */
  readonly grid?: DocxTableGrid;
  /** Table rows */
  readonly rows: readonly DocxTableRow[];
};
