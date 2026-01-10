/**
 * @file Worksheet Parser
 *
 * Parses worksheet XML files from XLSX packages.
 * Handles rows, columns, cells, merged cells, and sheet views.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.99 (worksheet)
 * @see ECMA-376 Part 4, Section 18.3.1.73 (row)
 * @see ECMA-376 Part 4, Section 18.3.1.13 (col)
 */

import type {
  XlsxWorksheet,
  XlsxRow,
  XlsxColumnDef,
  XlsxSheetView,
  XlsxPane,
  XlsxSelection,
} from "../domain/workbook";
import type { CellRange } from "../domain/cell/address";
import { parseRange } from "../domain/cell/address";
import type { Cell } from "../domain/cell/types";
import { rowIdx, colIdx, styleId } from "../domain/types";
import type { XlsxParseContext } from "./context";
import { parseCell } from "./cell";
import { parseBooleanAttr, parseFloatAttr, parseIntAttr } from "./primitive";
import type { XmlElement } from "../../xml";
import { getAttr, getChild, getChildren } from "../../xml";

// =============================================================================
// Column Parsing
// =============================================================================

/**
 * Parse a column definition element.
 *
 * @param colElement - The <col> element
 * @returns Parsed column definition
 *
 * @see ECMA-376 Part 4, Section 18.3.1.13 (col)
 */
export function parseColumn(colElement: XmlElement): XlsxColumnDef {
  const styleAttr = parseIntAttr(getAttr(colElement, "style"));
  return {
    min: colIdx(parseIntAttr(getAttr(colElement, "min")) ?? 1),
    max: colIdx(parseIntAttr(getAttr(colElement, "max")) ?? 1),
    width: parseFloatAttr(getAttr(colElement, "width")),
    hidden: parseBooleanAttr(getAttr(colElement, "hidden")),
    bestFit: parseBooleanAttr(getAttr(colElement, "bestFit")),
    styleId: styleAttr !== undefined ? styleId(styleAttr) : undefined,
  };
}

/**
 * Parse the cols element containing column definitions.
 *
 * @param colsElement - The <cols> element or undefined
 * @returns Array of column definitions
 *
 * @see ECMA-376 Part 4, Section 18.3.1.17 (cols)
 */
export function parseCols(
  colsElement: XmlElement | undefined,
): readonly XlsxColumnDef[] {
  if (!colsElement) {
    return [];
  }
  return getChildren(colsElement, "col").map(parseColumn);
}

// =============================================================================
// Row Parsing
// =============================================================================

/**
 * Parse a row element with its cells.
 *
 * @param rowElement - The <row> element
 * @param context - The parse context containing shared strings
 * @returns Parsed row with cells
 *
 * @see ECMA-376 Part 4, Section 18.3.1.73 (row)
 */
export function parseRow(
  rowElement: XmlElement,
  context: XlsxParseContext,
): XlsxRow {
  const r = parseIntAttr(getAttr(rowElement, "r")) ?? 1;
  const cells: Cell[] = getChildren(rowElement, "c").map((c) =>
    parseCell(c, context),
  );
  const styleAttr = parseIntAttr(getAttr(rowElement, "s"));

  return {
    rowNumber: rowIdx(r),
    cells,
    height: parseFloatAttr(getAttr(rowElement, "ht")),
    hidden: parseBooleanAttr(getAttr(rowElement, "hidden")),
    customHeight: parseBooleanAttr(getAttr(rowElement, "customHeight")),
    styleId: styleAttr !== undefined ? styleId(styleAttr) : undefined,
  };
}

/**
 * Parse the sheetData element containing all rows.
 *
 * @param sheetDataElement - The <sheetData> element
 * @param context - The parse context containing shared strings
 * @returns Array of parsed rows
 *
 * @see ECMA-376 Part 4, Section 18.3.1.80 (sheetData)
 */
export function parseSheetData(
  sheetDataElement: XmlElement,
  context: XlsxParseContext,
): readonly XlsxRow[] {
  return getChildren(sheetDataElement, "row").map((r) => parseRow(r, context));
}

// =============================================================================
// Merged Cells Parsing
// =============================================================================

/**
 * Parse the mergeCells element containing merged cell ranges.
 *
 * @param mergeCellsElement - The <mergeCells> element or undefined
 * @returns Array of merged cell ranges
 *
 * @see ECMA-376 Part 4, Section 18.3.1.55 (mergeCells)
 */
export function parseMergeCells(
  mergeCellsElement: XmlElement | undefined,
): readonly CellRange[] {
  if (!mergeCellsElement) {
    return [];
  }
  return getChildren(mergeCellsElement, "mergeCell")
    .map((mc) => getAttr(mc, "ref"))
    .filter((ref): ref is string => ref !== undefined)
    .map(parseRange);
}

// =============================================================================
// Sheet View Parsing
// =============================================================================

/**
 * Parse a pane element for split/frozen views.
 *
 * @param paneElement - The <pane> element or undefined
 * @returns Parsed pane configuration or undefined
 *
 * @see ECMA-376 Part 4, Section 18.3.1.66 (pane)
 */
export function parsePane(paneElement: XmlElement | undefined): XlsxPane | undefined {
  if (!paneElement) {
    return undefined;
  }
  return {
    xSplit: parseIntAttr(getAttr(paneElement, "xSplit")),
    ySplit: parseIntAttr(getAttr(paneElement, "ySplit")),
    topLeftCell: getAttr(paneElement, "topLeftCell"),
    activePane: getAttr(paneElement, "activePane") as XlsxPane["activePane"],
    state: getAttr(paneElement, "state") as XlsxPane["state"],
  };
}

/**
 * Parse a selection element for current cell selection.
 *
 * @param selectionElement - The <selection> element or undefined
 * @returns Parsed selection state or undefined
 *
 * @see ECMA-376 Part 4, Section 18.3.1.78 (selection)
 */
export function parseSelection(
  selectionElement: XmlElement | undefined,
): XlsxSelection | undefined {
  if (!selectionElement) {
    return undefined;
  }
  return {
    pane: getAttr(selectionElement, "pane") as XlsxSelection["pane"],
    activeCell: getAttr(selectionElement, "activeCell"),
    sqref: getAttr(selectionElement, "sqref"),
  };
}

/**
 * Parse a sheetView element for view configuration.
 *
 * @param sheetViewElement - The <sheetView> element
 * @returns Parsed sheet view configuration
 *
 * @see ECMA-376 Part 4, Section 18.3.1.87 (sheetView)
 */
export function parseSheetView(sheetViewElement: XmlElement): XlsxSheetView {
  return {
    tabSelected: parseBooleanAttr(getAttr(sheetViewElement, "tabSelected")),
    showGridLines: parseBooleanAttr(getAttr(sheetViewElement, "showGridLines")),
    showRowColHeaders: parseBooleanAttr(
      getAttr(sheetViewElement, "showRowColHeaders"),
    ),
    zoomScale: parseIntAttr(getAttr(sheetViewElement, "zoomScale")),
    pane: parsePane(getChild(sheetViewElement, "pane")),
    selection: parseSelection(getChild(sheetViewElement, "selection")),
  };
}

// =============================================================================
// Worksheet Parsing Helpers
// =============================================================================

/**
 * Parse dimension from dimension element.
 */
function parseDimension(dimensionEl: XmlElement | undefined): CellRange | undefined {
  if (!dimensionEl) {
    return undefined;
  }
  return parseRange(getAttr(dimensionEl, "ref") ?? "A1");
}

/**
 * Get the first sheetView element from sheetViews.
 */
function getFirstSheetView(sheetViewsEl: XmlElement | undefined): XmlElement | undefined {
  if (!sheetViewsEl) {
    return undefined;
  }
  return getChild(sheetViewsEl, "sheetView");
}

/**
 * Parse sheet view from element if present.
 */
function parseOptionalSheetView(sheetViewEl: XmlElement | undefined): XlsxSheetView | undefined {
  if (!sheetViewEl) {
    return undefined;
  }
  return parseSheetView(sheetViewEl);
}

/**
 * Parse sheet data from element or return empty array.
 */
function parseOptionalSheetData(
  sheetDataEl: XmlElement | undefined,
  context: XlsxParseContext,
): readonly XlsxRow[] {
  if (!sheetDataEl) {
    return [];
  }
  return parseSheetData(sheetDataEl, context);
}

// =============================================================================
// Worksheet Parsing
// =============================================================================

/**
 * Parse a complete worksheet element.
 *
 * @param worksheetElement - The root <worksheet> element
 * @param context - The parse context containing shared strings and styles
 * @param sheetInfo - Sheet metadata from workbook.xml
 * @returns Parsed worksheet
 *
 * @see ECMA-376 Part 4, Section 18.3.1.99 (worksheet)
 */
export function parseWorksheet(
  worksheetElement: XmlElement,
  context: XlsxParseContext,
  sheetInfo: {
    name: string;
    sheetId: number;
    state: "visible" | "hidden" | "veryHidden";
    xmlPath: string;
  },
): XlsxWorksheet {
  const dimensionEl = getChild(worksheetElement, "dimension");
  const sheetViewsEl = getChild(worksheetElement, "sheetViews");
  const colsEl = getChild(worksheetElement, "cols");
  const sheetDataEl = getChild(worksheetElement, "sheetData");
  const mergeCellsEl = getChild(worksheetElement, "mergeCells");

  const sheetViewEl = getFirstSheetView(sheetViewsEl);

  return {
    name: sheetInfo.name,
    sheetId: sheetInfo.sheetId,
    state: sheetInfo.state,
    dimension: parseDimension(dimensionEl),
    sheetView: parseOptionalSheetView(sheetViewEl),
    columns: parseCols(colsEl),
    rows: parseOptionalSheetData(sheetDataEl, context),
    mergeCells: parseMergeCells(mergeCellsEl),
    xmlPath: sheetInfo.xmlPath,
  };
}
