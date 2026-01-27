/**
 * @file Worksheet Serializer
 *
 * Serializes XlsxWorksheet to XML elements.
 * Produces ECMA-376 compliant SpreadsheetML worksheet elements.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.99 (worksheet)
 * @see ECMA-376 Part 4, Section 18.3.1.73 (row)
 * @see ECMA-376 Part 4, Section 18.3.1.13 (col)
 * @see ECMA-376 Part 4, Section 18.3.1.55 (mergeCells)
 */

import type { XmlElement, XmlNode } from "@oxen/xml";
import type { XlsxWorksheet, XlsxRow, XlsxColumnDef } from "../domain/workbook";
import type { CellRange } from "../domain/cell/address";
import { serializeCell, type SharedStringTable } from "./cell";
import {
  serializeRef,
  serializeRowIndex,
  serializeColIndex,
  serializeFloat,
  serializeBoolean,
} from "./units";
import { colIdx, rowIdx } from "../domain/types";

// =============================================================================
// Constants
// =============================================================================

/**
 * SpreadsheetML namespace URI
 */
const SPREADSHEETML_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";

// =============================================================================
// Dimension Calculation
// =============================================================================

/**
 * Calculate the used range (dimension) of the worksheet.
 *
 * Scans all cells to determine the minimum bounding rectangle.
 * Returns "A1" for empty worksheets.
 *
 * @param rows - All rows in the worksheet
 * @returns Dimension reference string (e.g., "A1:D10")
 */
function calculateDimension(rows: readonly XlsxRow[]): string {
  if (rows.length === 0) {
    return "A1";
  }

  const bounds = { minCol: Infinity, maxCol: 0, minRow: Infinity, maxRow: 0, hasAnyCells: false };

  for (const row of rows) {
    if (row.cells.length === 0) {
      continue;
    }

    bounds.hasAnyCells = true;
    const rowNum = row.rowNumber as number;
    bounds.minRow = Math.min(bounds.minRow, rowNum);
    bounds.maxRow = Math.max(bounds.maxRow, rowNum);

    for (const cell of row.cells) {
      const col = cell.address.col as number;
      bounds.minCol = Math.min(bounds.minCol, col);
      bounds.maxCol = Math.max(bounds.maxCol, col);
    }
  }

  if (!bounds.hasAnyCells) {
    return "A1";
  }

  const startRange: CellRange = {
    start: {
      col: colIdx(bounds.minCol),
      row: rowIdx(bounds.minRow),
      colAbsolute: false,
      rowAbsolute: false,
    },
    end: {
      col: colIdx(bounds.maxCol),
      row: rowIdx(bounds.maxRow),
      colAbsolute: false,
      rowAbsolute: false,
    },
  };

  return serializeRef(startRange);
}

// =============================================================================
// Dimension Serialization
// =============================================================================

/**
 * Serialize the dimension element.
 *
 * @param rows - All rows in the worksheet
 * @returns XmlElement for the dimension
 *
 * @example
 * <dimension ref="A1:D10"/>
 */
export function serializeDimension(rows: readonly XlsxRow[]): XmlElement {
  return {
    type: "element",
    name: "dimension",
    attrs: {
      ref: calculateDimension(rows),
    },
    children: [],
  };
}

// =============================================================================
// Column Serialization
// =============================================================================

/**
 * Serialize a single column definition to XML element.
 *
 * @param col - Column definition
 * @returns XmlElement for the col element
 *
 * @example
 * <col min="1" max="1" width="12" customWidth="1"/>
 */
function serializeCol(col: XlsxColumnDef): XmlElement {
  const attrs: Record<string, string> = {
    min: serializeColIndex(col.min),
    max: serializeColIndex(col.max),
  };

  if (col.width !== undefined) {
    attrs.width = serializeFloat(col.width);
    attrs.customWidth = "1";
  }

  if (col.hidden) {
    attrs.hidden = serializeBoolean(col.hidden);
  }

  if (col.bestFit) {
    attrs.bestFit = serializeBoolean(col.bestFit);
  }

  if (col.styleId !== undefined && (col.styleId as number) !== 0) {
    attrs.style = String(col.styleId);
  }

  return {
    type: "element",
    name: "col",
    attrs,
    children: [],
  };
}

/**
 * Serialize the cols element containing all column definitions.
 *
 * @param columns - Array of column definitions
 * @returns XmlElement for the cols element
 *
 * @example
 * <cols>
 *   <col min="1" max="1" width="12" customWidth="1"/>
 *   <col min="2" max="2" width="15" customWidth="1"/>
 * </cols>
 */
export function serializeCols(columns: readonly XlsxColumnDef[]): XmlElement {
  const children: XmlNode[] = columns.map(serializeCol);

  return {
    type: "element",
    name: "cols",
    attrs: {},
    children,
  };
}

// =============================================================================
// Row Serialization
// =============================================================================

/**
 * Serialize a single row to XML element.
 *
 * @param row - Row data
 * @param sharedStrings - Shared string table for string values
 * @returns XmlElement for the row element
 *
 * @example
 * <row r="1" ht="15" customHeight="1">
 *   <c r="A1"><v>42</v></c>
 * </row>
 */
export function serializeRow(
  row: XlsxRow,
  sharedStrings: SharedStringTable,
): XmlElement {
  const attrs: Record<string, string> = {
    r: serializeRowIndex(row.rowNumber),
  };

  // Row height (optional)
  if (row.height !== undefined) {
    attrs.ht = serializeFloat(row.height);
  }

  // Custom height flag (set when height is specified)
  if (row.customHeight) {
    attrs.customHeight = serializeBoolean(row.customHeight);
  }

  // Hidden flag
  if (row.hidden) {
    attrs.hidden = serializeBoolean(row.hidden);
  }

  // Row style (omit if 0)
  if (row.styleId !== undefined && (row.styleId as number) !== 0) {
    attrs.s = String(row.styleId);
  }

  // Serialize cells
  const children: XmlNode[] = row.cells.map((cell) =>
    serializeCell(cell, sharedStrings),
  );

  return {
    type: "element",
    name: "row",
    attrs,
    children,
  };
}

// =============================================================================
// SheetData Serialization
// =============================================================================

/**
 * Serialize all rows as the sheetData element.
 *
 * Skips rows with no cells.
 *
 * @param rows - All rows in the worksheet
 * @param sharedStrings - Shared string table for string values
 * @returns XmlElement for the sheetData element
 *
 * @example
 * <sheetData>
 *   <row r="1">...</row>
 *   <row r="2">...</row>
 * </sheetData>
 */
export function serializeSheetData(
  rows: readonly XlsxRow[],
  sharedStrings: SharedStringTable,
): XmlElement {
  // Skip empty rows (rows with no cells)
  const nonEmptyRows = rows.filter((row) => row.cells.length > 0);

  const children: XmlNode[] = nonEmptyRows.map((row) =>
    serializeRow(row, sharedStrings),
  );

  return {
    type: "element",
    name: "sheetData",
    attrs: {},
    children,
  };
}

// =============================================================================
// MergeCells Serialization
// =============================================================================

/**
 * Serialize a single merge cell reference.
 *
 * @param range - Cell range for the merge
 * @returns XmlElement for the mergeCell element
 *
 * @example
 * <mergeCell ref="A1:B2"/>
 */
function serializeMergeCell(range: CellRange): XmlElement {
  return {
    type: "element",
    name: "mergeCell",
    attrs: {
      ref: serializeRef(range),
    },
    children: [],
  };
}

/**
 * Serialize all merge cells as the mergeCells element.
 *
 * @param mergeCells - Array of cell ranges to merge
 * @returns XmlElement for the mergeCells element
 *
 * @example
 * <mergeCells count="2">
 *   <mergeCell ref="A1:B2"/>
 *   <mergeCell ref="D1:E3"/>
 * </mergeCells>
 */
export function serializeMergeCells(
  mergeCells: readonly CellRange[],
): XmlElement {
  const children: XmlNode[] = mergeCells.map(serializeMergeCell);

  return {
    type: "element",
    name: "mergeCells",
    attrs: {
      count: String(mergeCells.length),
    },
    children,
  };
}

// =============================================================================
// sheetFormatPr Serialization
// =============================================================================

function serializeSheetFormatPr(worksheet: XlsxWorksheet): XmlElement | undefined {
  const pr = worksheet.sheetFormatPr;
  if (!pr) {
    return undefined;
  }
  if (pr.defaultRowHeight === undefined && pr.defaultColWidth === undefined && pr.zeroHeight === undefined) {
    return undefined;
  }

  const attrs: Record<string, string> = {};
  if (pr.defaultRowHeight !== undefined) {
    attrs.defaultRowHeight = serializeFloat(pr.defaultRowHeight);
  }
  if (pr.defaultColWidth !== undefined) {
    attrs.defaultColWidth = serializeFloat(pr.defaultColWidth);
  }
  if (pr.zeroHeight !== undefined) {
    attrs.zeroHeight = serializeBoolean(pr.zeroHeight);
  }

  return { type: "element", name: "sheetFormatPr", attrs, children: [] };
}

// =============================================================================
// Worksheet Serialization
// =============================================================================

/**
 * Serialize a complete worksheet to XML element.
 *
 * The child elements are ordered according to ECMA-376:
 * 1. dimension
 * 2. sheetViews (not implemented in this version)
 * 3. sheetFormatPr (optional)
 * 4. cols
 * 5. sheetData
 * ... (other elements)
 * 15. mergeCells
 * ... (other elements)
 * 21. pageMargins
 *
 * @param worksheet - Worksheet to serialize
 * @param sharedStrings - Shared string table for string values
 * @returns XmlElement for the worksheet element
 *
 * @see ECMA-376 Part 4, Section 18.3.1.99 (worksheet)
 */
export function serializeWorksheet(
  worksheet: XlsxWorksheet,
  sharedStrings: SharedStringTable,
): XmlElement {
  const children: XmlNode[] = [];

  // 1. dimension
  children.push(serializeDimension(worksheet.rows));

  // 3. sheetFormatPr (if present)
  const sheetFormatPr = serializeSheetFormatPr(worksheet);
  if (sheetFormatPr) {
    children.push(sheetFormatPr);
  }

  // 4. cols (if present)
  if (worksheet.columns && worksheet.columns.length > 0) {
    children.push(serializeCols(worksheet.columns));
  }

  // 5. sheetData
  children.push(serializeSheetData(worksheet.rows, sharedStrings));

  // 15. mergeCells (if present)
  if (worksheet.mergeCells && worksheet.mergeCells.length > 0) {
    children.push(serializeMergeCells(worksheet.mergeCells));
  }

  // 21. pageMargins (default values)
  children.push({
    type: "element",
    name: "pageMargins",
    attrs: {
      left: "0.7",
      right: "0.7",
      top: "0.75",
      bottom: "0.75",
      header: "0.3",
      footer: "0.3",
    },
    children: [],
  });

  return {
    type: "element",
    name: "worksheet",
    attrs: {
      xmlns: SPREADSHEETML_NS,
    },
    children,
  };
}
