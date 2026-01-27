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
import type { XlsxConditionalFormatting, XlsxConditionalFormattingRule } from "../domain/conditional-formatting";
import type { XlsxHyperlink } from "../domain/hyperlink";
import type { CellRange } from "../domain/cell/address";
import { parseCellRef, parseRange } from "../domain/cell/address";
import type { Cell } from "../domain/cell/types";
import type { XlsxColor } from "../domain/style/font";
import type { XlsxDataValidation } from "../domain/data-validation";
import { rowIdx, colIdx, styleId } from "../domain/types";
import type { XlsxParseContext } from "./context";
import type { XlsxParseOptions } from "./options";
import { parseCellWithAddress } from "./cell";
import { expandSharedFormulas } from "./shared-formulas";
import { parseBooleanAttr, parseFloatAttr, parseIntAttr } from "./primitive";
import type { XmlElement } from "@oxen/xml";
import { getAttr, getChild, getChildren, getTextContent } from "@oxen/xml";

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
 * @param options - Parser options
 * @returns Parsed row with cells
 *
 * @see ECMA-376 Part 4, Section 18.3.1.73 (row)
 */
export function parseRow(
  rowElement: XmlElement,
  context: XlsxParseContext,
  options: XlsxParseOptions | undefined,
  fallbackRowNumber?: number,
): XlsxRow {
  const rowNumberAttr = parseIntAttr(getAttr(rowElement, "r"));
  const cellElements = getChildren(rowElement, "c");
  const firstCell = cellElements[0];
  const firstCellRef = firstCell ? getAttr(firstCell, "r") : undefined;
  const rowNumberFromCellRef = firstCellRef ? (parseCellRef(firstCellRef).row as number) : undefined;
  const r = rowNumberAttr ?? rowNumberFromCellRef ?? fallbackRowNumber ?? 1;
  const allowMissingCellRef = options?.compatibility?.allowMissingCellRef === true;
  const cells: Cell[] = [];
  for (let nextCol = 1, idx = 0; idx < cellElements.length; idx += 1) {
    const cellElement = cellElements[idx];
    if (!cellElement) {
      continue;
    }
    const explicitRef = getAttr(cellElement, "r");
    if (explicitRef) {
      const address = parseCellRef(explicitRef);
      cells.push(parseCellWithAddress(cellElement, context, address));
      nextCol = (address.col as number) + 1;
      continue;
    }

    if (!allowMissingCellRef) {
      throw new Error("Cell element missing 'r' attribute");
    }
    const address = { col: colIdx(nextCol), row: rowIdx(r), colAbsolute: false, rowAbsolute: false };
    cells.push(parseCellWithAddress(cellElement, context, address));
    nextCol += 1;
  }
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
 * @param options - Parser options
 * @returns Array of parsed rows
 *
 * @see ECMA-376 Part 4, Section 18.3.1.80 (sheetData)
 */
export function parseSheetData(
  sheetDataElement: XmlElement,
  context: XlsxParseContext,
  options: XlsxParseOptions | undefined,
): readonly XlsxRow[] {
  const rowElements = getChildren(sheetDataElement, "row");
  const rows: XlsxRow[] = [];
  for (let idx = 0, nextRowNumber = 1; idx < rowElements.length; idx += 1) {
    const rowElement = rowElements[idx];
    if (!rowElement) {
      continue;
    }
    const explicitRowNumber = parseIntAttr(getAttr(rowElement, "r"));
    const fallbackRowNumber = explicitRowNumber ?? nextRowNumber;
    const row = parseRow(rowElement, context, options, fallbackRowNumber);
    rows.push(row);
    nextRowNumber = (row.rowNumber as number) + 1;
  }
  return rows;
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
// Conditional Formatting Parsing
// =============================================================================

function parseSqrefRanges(sqref: string): readonly CellRange[] {
  const tokens = sqref.trim().split(/\s+/u).filter((token) => token.length > 0);
  return tokens.map(parseRange);
}

function parseConditionalFormattingRule(ruleElement: XmlElement): XlsxConditionalFormattingRule {
  return {
    type: getAttr(ruleElement, "type") ?? "",
    dxfId: parseIntAttr(getAttr(ruleElement, "dxfId")),
    priority: parseIntAttr(getAttr(ruleElement, "priority")),
    operator: getAttr(ruleElement, "operator") ?? undefined,
    stopIfTrue: parseBooleanAttr(getAttr(ruleElement, "stopIfTrue")),
    formulas: getChildren(ruleElement, "formula").map((el) => getTextContent(el)),
  };
}

function parseConditionalFormatting(element: XmlElement): XlsxConditionalFormatting {
  const sqref = getAttr(element, "sqref") ?? "";
  const ranges = sqref.length > 0 ? parseSqrefRanges(sqref) : [];
  const rules = getChildren(element, "cfRule").map(parseConditionalFormattingRule);
  return { sqref, ranges, rules };
}

/**
 * Parse all conditional formatting definitions from a worksheet root element.
 *
 * @param worksheetElement - The worksheet root element (`<worksheet>`)
 * @returns Conditional formatting definitions (may be empty)
 *
 * @see ECMA-376 Part 4, Section 18.3.1.18 (conditionalFormatting)
 */
export function parseConditionalFormattings(worksheetElement: XmlElement): readonly XlsxConditionalFormatting[] {
  return getChildren(worksheetElement, "conditionalFormatting").map(parseConditionalFormatting);
}

// =============================================================================
// Data Validations Parsing
// =============================================================================

function parseDataValidation(dataValidationElement: XmlElement): XlsxDataValidation {
  const sqref = getAttr(dataValidationElement, "sqref") ?? "";
  const ranges = sqref.length > 0 ? parseSqrefRanges(sqref) : [];

  const formula1El = getChild(dataValidationElement, "formula1");
  const formula2El = getChild(dataValidationElement, "formula2");
  const formula1 = formula1El ? getTextContent(formula1El) : undefined;
  const formula2 = formula2El ? getTextContent(formula2El) : undefined;

  return {
    type: (getAttr(dataValidationElement, "type") ?? undefined) as XlsxDataValidation["type"],
    operator: (getAttr(dataValidationElement, "operator") ?? undefined) as XlsxDataValidation["operator"],
    allowBlank: parseBooleanAttr(getAttr(dataValidationElement, "allowBlank")),
    showInputMessage: parseBooleanAttr(getAttr(dataValidationElement, "showInputMessage")),
    showErrorMessage: parseBooleanAttr(getAttr(dataValidationElement, "showErrorMessage")),
    showDropDown: parseBooleanAttr(getAttr(dataValidationElement, "showDropDown")),
    errorStyle: (getAttr(dataValidationElement, "errorStyle") ?? undefined) as XlsxDataValidation["errorStyle"],
    promptTitle: getAttr(dataValidationElement, "promptTitle") ?? undefined,
    prompt: getAttr(dataValidationElement, "prompt") ?? undefined,
    errorTitle: getAttr(dataValidationElement, "errorTitle") ?? undefined,
    error: getAttr(dataValidationElement, "error") ?? undefined,
    sqref,
    ranges,
    formula1: formula1 && formula1.length > 0 ? formula1 : undefined,
    formula2: formula2 && formula2.length > 0 ? formula2 : undefined,
  };
}

/**
 * Parse all data validations declared in a worksheet.
 *
 * @param worksheetElement - Worksheet root element (`<worksheet>`)
 * @returns Data validations (may be empty)
 *
 * @see ECMA-376 Part 4, Section 18.3.1.32 (dataValidations)
 */
export function parseDataValidations(worksheetElement: XmlElement): readonly XlsxDataValidation[] {
  const dataValidationsEl = getChild(worksheetElement, "dataValidations");
  if (!dataValidationsEl) {
    return [];
  }
  return getChildren(dataValidationsEl, "dataValidation").map(parseDataValidation);
}

// =============================================================================
// Hyperlinks Parsing
// =============================================================================

function parseHyperlink(hyperlinkElement: XmlElement): XlsxHyperlink {
  const ref = parseRange(getAttr(hyperlinkElement, "ref") ?? "A1");
  return {
    ref,
    relationshipId: getAttr(hyperlinkElement, "r:id") ?? getAttr(hyperlinkElement, "rId") ?? undefined,
    display: getAttr(hyperlinkElement, "display") ?? undefined,
    location: getAttr(hyperlinkElement, "location") ?? undefined,
    tooltip: getAttr(hyperlinkElement, "tooltip") ?? undefined,
  };
}

/**
 * Parse hyperlinks defined in a worksheet.
 *
 * @param worksheetElement - The worksheet root element (`<worksheet>`)
 * @returns Hyperlink definitions (may be empty)
 *
 * @see ECMA-376 Part 4, Section 18.3.1.49 (hyperlinks)
 */
export function parseHyperlinks(worksheetElement: XmlElement): readonly XlsxHyperlink[] {
  const hyperlinksEl = getChild(worksheetElement, "hyperlinks");
  if (!hyperlinksEl) {
    return [];
  }
  return getChildren(hyperlinksEl, "hyperlink").map(parseHyperlink);
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
  options: XlsxParseOptions | undefined,
): readonly XlsxRow[] {
  if (!sheetDataEl) {
    return [];
  }
  return parseSheetData(sheetDataEl, context, options);
}

function parseColorElement(colorElement: XmlElement | undefined): XlsxColor | undefined {
  if (!colorElement) {
    return undefined;
  }

  const rgb = getAttr(colorElement, "rgb");
  if (rgb) {
    return { type: "rgb", value: rgb };
  }

  const theme = getAttr(colorElement, "theme");
  if (theme !== undefined) {
    return {
      type: "theme",
      theme: parseIntAttr(theme) ?? 0,
      tint: parseFloatAttr(getAttr(colorElement, "tint")),
    };
  }

  const indexed = getAttr(colorElement, "indexed");
  if (indexed !== undefined) {
    return { type: "indexed", index: parseIntAttr(indexed) ?? 0 };
  }

  const auto = getAttr(colorElement, "auto");
  if (auto !== undefined) {
    const parsed = parseBooleanAttr(auto);
    if (parsed !== false) {
      return { type: "auto" };
    }
  }

  return undefined;
}

// =============================================================================
// Worksheet Parsing
// =============================================================================

/**
 * Parse a complete worksheet element.
 *
 * @param worksheetElement - The root <worksheet> element
 * @param context - The parse context containing shared strings and styles
 * @param options - Parser options
 * @param sheetInfo - Sheet metadata from workbook.xml
 * @returns Parsed worksheet
 *
 * @see ECMA-376 Part 4, Section 18.3.1.99 (worksheet)
 */
export function parseWorksheet(
  worksheetElement: XmlElement,
  context: XlsxParseContext,
  options: XlsxParseOptions | undefined,
  sheetInfo: {
    name: string;
    sheetId: number;
    state: "visible" | "hidden" | "veryHidden";
    xmlPath: string;
  },
): XlsxWorksheet {
  const sheetPrEl = getChild(worksheetElement, "sheetPr");
  const tabColor = parseColorElement(sheetPrEl ? getChild(sheetPrEl, "tabColor") : undefined);
  const dimensionEl = getChild(worksheetElement, "dimension");
  const sheetViewsEl = getChild(worksheetElement, "sheetViews");
  const colsEl = getChild(worksheetElement, "cols");
  const sheetDataEl = getChild(worksheetElement, "sheetData");
  const mergeCellsEl = getChild(worksheetElement, "mergeCells");

  const sheetViewEl = getFirstSheetView(sheetViewsEl);

  const rows = expandSharedFormulas(parseOptionalSheetData(sheetDataEl, context, options));
  const conditionalFormattings = parseConditionalFormattings(worksheetElement);
  const dataValidations = parseDataValidations(worksheetElement);
  const hyperlinks = parseHyperlinks(worksheetElement);

  return {
    dateSystem: context.workbookInfo.dateSystem,
    name: sheetInfo.name,
    sheetId: sheetInfo.sheetId,
    state: sheetInfo.state,
    dimension: parseDimension(dimensionEl),
    sheetView: parseOptionalSheetView(sheetViewEl),
    tabColor,
    columns: parseCols(colsEl),
    rows,
    mergeCells: parseMergeCells(mergeCellsEl),
    conditionalFormattings: conditionalFormattings.length > 0 ? conditionalFormattings : undefined,
    dataValidations: dataValidations.length > 0 ? dataValidations : undefined,
    hyperlinks: hyperlinks.length > 0 ? hyperlinks : undefined,
    xmlPath: sheetInfo.xmlPath,
  };
}
