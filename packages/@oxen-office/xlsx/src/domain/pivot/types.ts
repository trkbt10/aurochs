/**
 * @file Pivot Table Type Definitions
 *
 * Defines types for pivot tables in SpreadsheetML.
 *
 * @see ECMA-376 Part 4, Section 18.10 (Pivot Tables)
 */

import type { CellRange } from "../cell/address";

// =============================================================================
// Pivot Table Field Types
// =============================================================================

/**
 * Pivot field item.
 *
 * @see ECMA-376 Part 4, Section 18.10.1.45 (item)
 */
export type XlsxPivotItem = {
  /** Item type (data, default, sum, countA, etc.) */
  readonly t?: "data" | "default" | "sum" | "countA" | "count" | "avg" | "max" | "min" | "product" | "stdDev" | "stdDevP" | "var" | "varP" | "grand" | "blank";
  /** Whether this item is hidden */
  readonly h?: boolean;
  /** Whether subtotal is hidden */
  readonly s?: boolean;
  /** Shared item index in the pivot cache */
  readonly x?: number;
};

/**
 * Pivot field.
 *
 * @see ECMA-376 Part 4, Section 18.10.1.69 (pivotField)
 */
export type XlsxPivotField = {
  /** Name of the field */
  readonly name?: string;
  /** Field axis (row, column, page, values) */
  readonly axis?: "axisRow" | "axisCol" | "axisPage" | "axisValues";
  /** Whether to show all items */
  readonly showAll?: boolean;
  /** Whether to sort manually */
  readonly sortType?: "manual" | "ascending" | "descending";
  /** Whether to include new items in filter */
  readonly includeNewItemsInFilter?: boolean;
  /** Whether to show items with no data */
  readonly showDropDowns?: boolean;
  /** Whether the field has compact form */
  readonly compact?: boolean;
  /** Whether the field has outline form */
  readonly outline?: boolean;
  /** Whether to show subtotals at top */
  readonly subtotalTop?: boolean;
  /** Whether to insert blank row after each item */
  readonly insertBlankRow?: boolean;
  /** Whether to insert page break after each item */
  readonly insertPageBreak?: boolean;
  /** Number format ID */
  readonly numFmtId?: number;
  /** Items in this field */
  readonly items?: readonly XlsxPivotItem[];
};

/**
 * Row or column field reference.
 *
 * @see ECMA-376 Part 4, Section 18.10.1.35 (field)
 */
export type XlsxFieldReference = {
  /** Index of the field in the pivot table fields array */
  readonly x: number;
};

// =============================================================================
// Pivot Table Data Field Types
// =============================================================================

/**
 * Data field (values area).
 *
 * @see ECMA-376 Part 4, Section 18.10.1.18 (dataField)
 */
export type XlsxDataField = {
  /** Name to display */
  readonly name?: string;
  /** Index of the field in the pivot cache */
  readonly fld: number;
  /** Aggregation function */
  readonly subtotal?: "sum" | "count" | "average" | "max" | "min" | "product" | "countNums" | "stdDev" | "stdDevp" | "var" | "varp";
  /** Show data as */
  readonly showDataAs?: "normal" | "difference" | "percent" | "percentDiff" | "runTotal" | "percentOfRow" | "percentOfCol" | "percentOfTotal" | "index";
  /** Number format ID */
  readonly numFmtId?: number;
};

// =============================================================================
// Pivot Table Location Types
// =============================================================================

/**
 * Pivot table location.
 *
 * @see ECMA-376 Part 4, Section 18.10.1.51 (location)
 */
export type XlsxPivotLocation = {
  /** Reference to the pivot table range */
  readonly ref: CellRange;
  /** First header row */
  readonly firstHeaderRow?: number;
  /** First data row */
  readonly firstDataRow?: number;
  /** First data column */
  readonly firstDataCol?: number;
  /** Number of rows per page for page fields */
  readonly rowPageCount?: number;
  /** Number of columns per page for page fields */
  readonly colPageCount?: number;
};

// =============================================================================
// Pivot Table Style Types
// =============================================================================

/**
 * Pivot table style info.
 *
 * @see ECMA-376 Part 4, Section 18.10.1.86 (pivotTableStyleInfo)
 */
export type XlsxPivotTableStyleInfo = {
  /** Style name */
  readonly name?: string;
  /** Show row headers */
  readonly showRowHeaders?: boolean;
  /** Show column headers */
  readonly showColHeaders?: boolean;
  /** Show row stripes */
  readonly showRowStripes?: boolean;
  /** Show column stripes */
  readonly showColStripes?: boolean;
  /** Show last column */
  readonly showLastColumn?: boolean;
};

// =============================================================================
// Pivot Table Definition
// =============================================================================

/**
 * Complete pivot table definition.
 *
 * @see ECMA-376 Part 4, Section 18.10.1.73 (pivotTableDefinition)
 */
export type XlsxPivotTable = {
  /** Name of the pivot table */
  readonly name: string;
  /** ID of the cache definition */
  readonly cacheId: number;
  /** Location of the pivot table */
  readonly location: XlsxPivotLocation;
  /** Whether data is on rows (false = columns) */
  readonly dataOnRows?: boolean;
  /** Data field position (0-based) */
  readonly dataPosition?: number;
  /** Whether to apply number formats from cache */
  readonly applyNumberFormats?: boolean;
  /** Whether to apply border formats */
  readonly applyBorderFormats?: boolean;
  /** Whether to apply font formats */
  readonly applyFontFormats?: boolean;
  /** Whether to apply pattern formats */
  readonly applyPatternFormats?: boolean;
  /** Whether to apply alignment formats */
  readonly applyAlignmentFormats?: boolean;
  /** Whether to apply width/height from cache */
  readonly applyWidthHeightFormats?: boolean;
  /** Row grand totals */
  readonly rowGrandTotals?: boolean;
  /** Column grand totals */
  readonly colGrandTotals?: boolean;
  /** Show error message */
  readonly showError?: boolean;
  /** Error message to display */
  readonly errorCaption?: string;
  /** Show drill indicators */
  readonly showDrill?: boolean;
  /** Whether to show field headers */
  readonly showHeaders?: boolean;
  /** Whether compact form */
  readonly compact?: boolean;
  /** Whether outline form */
  readonly outline?: boolean;
  /** Row header caption */
  readonly rowHeaderCaption?: string;
  /** Column header caption */
  readonly colHeaderCaption?: string;
  /** Style info */
  readonly pivotTableStyleInfo?: XlsxPivotTableStyleInfo;
  /** All pivot fields */
  readonly pivotFields?: readonly XlsxPivotField[];
  /** Row fields */
  readonly rowFields?: readonly XlsxFieldReference[];
  /** Column fields */
  readonly colFields?: readonly XlsxFieldReference[];
  /** Page fields */
  readonly pageFields?: readonly XlsxFieldReference[];
  /** Data fields (values) */
  readonly dataFields?: readonly XlsxDataField[];
  /** Path to the pivot table XML */
  readonly xmlPath: string;
};
