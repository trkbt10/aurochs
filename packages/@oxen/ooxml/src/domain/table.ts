/**
 * @file Shared table types for OOXML processing (DOCX/XLSX)
 *
 * These types represent table structure concepts that are common across
 * WordprocessingML and SpreadsheetML.
 *
 * @see ECMA-376 Part 1, Section 17.4 (Tables - WordprocessingML)
 * @see ECMA-376 Part 4, Section 18.3.1 (Worksheet - SpreadsheetML)
 */

import type { Brand, Pixels } from "./units";

// =============================================================================
// Grid Column Types
// =============================================================================

/**
 * Table grid column width.
 *
 * In WordprocessingML, grid columns define the underlying column structure
 * of a table. In SpreadsheetML, column widths are defined differently
 * but serve a similar purpose.
 *
 * @see ECMA-376 Part 1, Section 17.4.16 (gridCol - Table Grid Column)
 */
export type TableGridColumn = {
  /** Column width in pixels (converted from twips/EMU) */
  readonly width: Pixels;
};

/**
 * Table grid definition.
 *
 * Defines the column structure of a table as an array of column widths.
 *
 * @see ECMA-376 Part 1, Section 17.4.49 (tblGrid - Table Grid)
 */
export type TableGrid = {
  /** Array of grid columns */
  readonly columns: readonly TableGridColumn[];
};

// =============================================================================
// Cell Span Types
// =============================================================================

/**
 * Number of columns a cell spans (gridSpan).
 *
 * @see ECMA-376 Part 1, Section 17.4.17 (gridSpan - Grid Columns Spanned)
 */
export type GridSpan = Brand<number, "GridSpan">;

/**
 * Create a GridSpan value from a number.
 */
export const gridSpan = (value: number): GridSpan => value as GridSpan;

/**
 * Vertical merge type for table cells.
 *
 * @see ECMA-376 Part 1, Section 17.4.85 (vMerge - Vertically Merged Cell)
 */
export type VerticalMerge = "restart" | "continue";

// =============================================================================
// Table Width Types
// =============================================================================

/**
 * Table width type enumeration.
 *
 * @see ECMA-376 Part 1, Section 17.18.87 (ST_TblWidth)
 */
export type TableWidthType = "auto" | "dxa" | "nil" | "pct";

/**
 * Table width measurement.
 *
 * Width can be specified as:
 * - auto: Automatic width
 * - dxa: Width in twips (twentieths of a point)
 * - nil: No width
 * - pct: Percentage of container width (in 50ths of a percent)
 *
 * @see ECMA-376 Part 1, Section 17.4.88 (tblW - Table Width)
 */
export type TableWidth = {
  /** Width value */
  readonly value: number;
  /** Width type */
  readonly type: TableWidthType;
};

// =============================================================================
// Cell Margin Types
// =============================================================================

/**
 * Table cell margins (padding).
 *
 * Specifies the spacing between cell border and cell content.
 *
 * @see ECMA-376 Part 1, Section 17.4.42 (tcMar - Table Cell Margins)
 */
export type TableCellMargins = {
  /** Top margin in pixels */
  readonly top?: Pixels;
  /** Right margin in pixels */
  readonly right?: Pixels;
  /** Bottom margin in pixels */
  readonly bottom?: Pixels;
  /** Left margin in pixels */
  readonly left?: Pixels;
};

// =============================================================================
// Table Alignment Types
// =============================================================================

/**
 * Table horizontal alignment.
 *
 * @see ECMA-376 Part 1, Section 17.18.86 (ST_JcTable)
 */
export type TableAlignment = "start" | "center" | "end" | "left" | "right";

/**
 * Vertical alignment within a table cell.
 *
 * @see ECMA-376 Part 1, Section 17.18.101 (ST_VerticalJc)
 */
export type TableCellVerticalAlignment = "top" | "center" | "bottom" | "both";

// =============================================================================
// Table Layout Types
// =============================================================================

/**
 * Table layout algorithm.
 *
 * @see ECMA-376 Part 1, Section 17.18.87 (ST_TblLayoutType)
 */
export type TableLayoutType = "fixed" | "autofit";

/**
 * Table overlap behavior (for floating tables).
 *
 * @see ECMA-376 Part 1, Section 17.18.88 (ST_TblOverlap)
 */
export type TableOverlap = "never" | "overlap";
