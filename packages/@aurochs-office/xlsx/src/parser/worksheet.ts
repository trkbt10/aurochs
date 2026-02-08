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

import type { XlsxWorksheet, XlsxRow, XlsxColumnDef, XlsxSheetView, XlsxPane, XlsxSelection } from "../domain/workbook";
import type { XlsxPageBreaks, XlsxPageBreak } from "../domain/page-breaks";
import type { XlsxSparklineGroup, XlsxSparkline, XlsxSparklineType } from "../domain/sparkline";
import type {
  XlsxConditionalFormatting,
  XlsxConditionalFormattingRule,
  XlsxCfvo,
  XlsxCfvoType,
  XlsxColorScaleRule,
  XlsxDataBarRule,
  XlsxIconSetRule,
  XlsxIconSetName,
  XlsxStandardRule,
  XlsxCustomIcon,
} from "../domain/conditional-formatting";
import type { XlsxHyperlink } from "../domain/hyperlink";
import type { CellRange } from "../domain/cell/address";
import { parseCellRef, parseRange } from "../domain/cell/address";
import type { Cell } from "../domain/cell/types";
import type { XlsxColor } from "../domain/style/font";
import type { XlsxDataValidation } from "../domain/data-validation";
import type {
  XlsxAutoFilter,
  XlsxFilterColumn,
  XlsxFilters,
  XlsxCustomFilters,
  XlsxCustomFilter,
  XlsxFilterOperator,
  XlsxTop10Filter,
  XlsxDynamicFilter,
  XlsxDynamicFilterType,
} from "../domain/auto-filter";
import { rowIdx, colIdx, styleId } from "../domain/types";
import type { XlsxParseContext } from "./context";
import type { XlsxParseOptions } from "./options";
import { parseCellWithAddress } from "./cell";
import { expandSharedFormulas } from "./shared-formulas";
import { parseBooleanAttr, parseFloatAttr, parseIntAttr } from "./primitive";
import { parsePageSetup, parsePageMargins, parseHeaderFooter, parsePrintOptions } from "./page-setup";
import { parseSheetProtection } from "./protection";
import type { XmlElement } from "@aurochs/xml";
import { getAttr, getChild, getChildren, getTextContent } from "@aurochs/xml";

// =============================================================================
// Page Breaks Parsing
// =============================================================================

/**
 * Parse a single page break element.
 *
 * @param brkElement - The <brk> element
 * @returns Parsed page break
 *
 * @see ECMA-376 Part 4, Section 18.3.1.9 (brk)
 */
function parseBreak(brkElement: XmlElement): XlsxPageBreak {
  return {
    id: parseIntAttr(getAttr(brkElement, "id")) ?? 0,
    max: parseIntAttr(getAttr(brkElement, "max")),
    min: parseIntAttr(getAttr(brkElement, "min")),
    manual: parseBooleanAttr(getAttr(brkElement, "man")),
    pt: parseBooleanAttr(getAttr(brkElement, "pt")),
  };
}

/**
 * Parse page breaks from a worksheet element.
 *
 * @param worksheetElement - The worksheet element
 * @returns Parsed page breaks, or undefined if none
 *
 * @see ECMA-376 Part 4, Section 18.3.1.72 (rowBreaks)
 * @see ECMA-376 Part 4, Section 18.3.1.14 (colBreaks)
 */
function parsePageBreaks(worksheetElement: XmlElement): XlsxPageBreaks | undefined {
  const rowBreaksEl = getChild(worksheetElement, "rowBreaks");
  const colBreaksEl = getChild(worksheetElement, "colBreaks");

  if (!rowBreaksEl && !colBreaksEl) {
    return undefined;
  }

  const rowBreaks = rowBreaksEl ? getChildren(rowBreaksEl, "brk").map(parseBreak) : [];
  const colBreaks = colBreaksEl ? getChildren(colBreaksEl, "brk").map(parseBreak) : [];

  if (rowBreaks.length === 0 && colBreaks.length === 0) {
    return undefined;
  }

  return { rowBreaks, colBreaks };
}

// =============================================================================
// Sparkline Parsing
// =============================================================================

/**
 * Parse sparkline groups from worksheet extLst.
 *
 * Sparklines are stored in x14:sparklineGroups within extLst/ext elements.
 *
 * @param worksheetElement - The worksheet element
 * @returns Parsed sparkline groups, or undefined if none
 */
function parseSparklineGroups(worksheetElement: XmlElement): readonly XlsxSparklineGroup[] | undefined {
  const extLstEl = getChild(worksheetElement, "extLst");
  if (!extLstEl) {
    return undefined;
  }

  // Find the extension element containing sparklineGroups
  const extElements = getChildren(extLstEl, "ext");
  for (const extEl of extElements) {
    // Look for sparklineGroups element (x14 namespace)
    const sparklineGroupsEl = extEl.children.find(
      (child) => child.type === "element" && child.name.endsWith(":sparklineGroups"),
    ) as XmlElement | undefined;

    if (!sparklineGroupsEl) {
      // Also try without namespace prefix
      const altSparklineGroupsEl = getChild(extEl, "sparklineGroups");
      if (altSparklineGroupsEl) {
        return parseSparklineGroupsElement(altSparklineGroupsEl);
      }
      continue;
    }

    return parseSparklineGroupsElement(sparklineGroupsEl);
  }

  return undefined;
}

function parseSparklineGroupsElement(sparklineGroupsEl: XmlElement): readonly XlsxSparklineGroup[] {
  const groups: XlsxSparklineGroup[] = [];

  // Find all sparklineGroup elements (may have x14 prefix)
  const groupElements = sparklineGroupsEl.children.filter(
    (child) => child.type === "element" && (child.name === "sparklineGroup" || child.name.endsWith(":sparklineGroup")),
  ) as XmlElement[];

  for (const groupEl of groupElements) {
    const group = parseSparklineGroup(groupEl);
    if (group) {
      groups.push(group);
    }
  }

  return groups.length > 0 ? groups : [];
}

function parseSparklineGroup(groupEl: XmlElement): XlsxSparklineGroup | undefined {
  const typeAttr = getAttr(groupEl, "type");
  const type: XlsxSparklineType = typeAttr === "column" ? "column" : typeAttr === "stacked" ? "stacked" : "line";

  // Find sparklines container
  const sparklinesEl = groupEl.children.find(
    (child) => child.type === "element" && (child.name === "sparklines" || child.name.endsWith(":sparklines")),
  ) as XmlElement | undefined;

  if (!sparklinesEl) {
    return undefined;
  }

  const sparklines: XlsxSparkline[] = [];
  const sparklineElements = sparklinesEl.children.filter(
    (child) => child.type === "element" && (child.name === "sparkline" || child.name.endsWith(":sparkline")),
  ) as XmlElement[];

  for (const sparklineEl of sparklineElements) {
    // Get formula (f) and cell reference (sqref) elements
    const fEl = sparklineEl.children.find(
      (child) => child.type === "element" && (child.name === "f" || child.name.endsWith(":f")),
    ) as XmlElement | undefined;
    const sqrefEl = sparklineEl.children.find(
      (child) => child.type === "element" && (child.name === "sqref" || child.name.endsWith(":sqref")),
    ) as XmlElement | undefined;

    const f = fEl ? getTextContent(fEl) : undefined;
    const sqref = sqrefEl ? getTextContent(sqrefEl) : undefined;

    if (f && sqref) {
      sparklines.push({ f, sqref });
    }
  }

  if (sparklines.length === 0) {
    return undefined;
  }

  // Parse color elements
  const colorSeries = parseSparklineColor(groupEl, "colorSeries");
  const colorNegative = parseSparklineColor(groupEl, "colorNegative");
  const colorAxis = parseSparklineColor(groupEl, "colorAxis");
  const colorMarkers = parseSparklineColor(groupEl, "colorMarkers");
  const colorFirst = parseSparklineColor(groupEl, "colorFirst");
  const colorLast = parseSparklineColor(groupEl, "colorLast");
  const colorHigh = parseSparklineColor(groupEl, "colorHigh");
  const colorLow = parseSparklineColor(groupEl, "colorLow");

  return {
    type,
    sparklines,
    colorSeries,
    colorNegative,
    colorAxis,
    colorMarkers,
    colorFirst,
    colorLast,
    colorHigh,
    colorLow,
    first: parseBooleanAttr(getAttr(groupEl, "first")),
    last: parseBooleanAttr(getAttr(groupEl, "last")),
    high: parseBooleanAttr(getAttr(groupEl, "high")),
    low: parseBooleanAttr(getAttr(groupEl, "low")),
    negative: parseBooleanAttr(getAttr(groupEl, "negative")),
    markers: parseBooleanAttr(getAttr(groupEl, "markers")),
    lineWeight: parseFloatAttr(getAttr(groupEl, "lineWeight")),
    displayEmptyCellsAs: getAttr(groupEl, "displayEmptyCellsAs") as "gap" | "zero" | "span" | undefined,
    displayHidden: parseBooleanAttr(getAttr(groupEl, "displayHidden")),
    dateAxis: getAttr(groupEl, "dateAxis") ?? undefined,
  };
}

function parseSparklineColor(groupEl: XmlElement, colorName: string): XlsxColor | undefined {
  const colorEl = groupEl.children.find(
    (child) => child.type === "element" && (child.name === colorName || child.name.endsWith(`:${colorName}`)),
  ) as XmlElement | undefined;

  if (!colorEl) {
    return undefined;
  }

  return parseColorElement(colorEl);
}

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
    outlineLevel: parseIntAttr(getAttr(colElement, "outlineLevel")),
    collapsed: parseBooleanAttr(getAttr(colElement, "collapsed")),
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
export function parseCols(colsElement: XmlElement | undefined): readonly XlsxColumnDef[] {
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
export function parseRow(params: {
  readonly rowElement: XmlElement;
  readonly context: XlsxParseContext;
  readonly options: XlsxParseOptions | undefined;
  readonly fallbackRowNumber?: number;
}): XlsxRow {
  const { rowElement, context, options, fallbackRowNumber } = params;
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
    outlineLevel: parseIntAttr(getAttr(rowElement, "outlineLevel")),
    collapsed: parseBooleanAttr(getAttr(rowElement, "collapsed")),
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
    const row = parseRow({ rowElement, context, options, fallbackRowNumber });
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
export function parseMergeCells(mergeCellsElement: XmlElement | undefined): readonly CellRange[] {
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
  const tokens = sqref
    .trim()
    .split(/\s+/u)
    .filter((token) => token.length > 0);
  return tokens.map(parseRange);
}

/**
 * Parse a cfvo (conditional formatting value object) element.
 */
function parseCfvo(cfvoElement: XmlElement): XlsxCfvo {
  return {
    type: (getAttr(cfvoElement, "type") ?? "num") as XlsxCfvoType,
    val: getAttr(cfvoElement, "val") ?? undefined,
    gte: parseBooleanAttr(getAttr(cfvoElement, "gte")),
  };
}

/**
 * Parse a colorScale rule.
 */
function parseColorScaleRule(ruleElement: XmlElement): XlsxColorScaleRule | undefined {
  const colorScaleEl = getChild(ruleElement, "colorScale");
  if (!colorScaleEl) {
    return undefined;
  }

  const cfvoElements = getChildren(colorScaleEl, "cfvo");
  const colorElements = getChildren(colorScaleEl, "color");

  if (cfvoElements.length < 2 || colorElements.length < 2) {
    return undefined;
  }

  return {
    type: "colorScale",
    priority: parseIntAttr(getAttr(ruleElement, "priority")),
    stopIfTrue: parseBooleanAttr(getAttr(ruleElement, "stopIfTrue")),
    cfvo: cfvoElements.map(parseCfvo),
    colors: colorElements.map(parseColorElement).filter((c): c is XlsxColor => c !== undefined),
  };
}

/**
 * Parse a dataBar rule.
 */
function parseDataBarRule(ruleElement: XmlElement): XlsxDataBarRule | undefined {
  const dataBarEl = getChild(ruleElement, "dataBar");
  if (!dataBarEl) {
    return undefined;
  }

  const cfvoElements = getChildren(dataBarEl, "cfvo");
  const colorEl = getChild(dataBarEl, "color");
  const fillColorEl = getChild(dataBarEl, "fillColor");
  const borderColorEl = getChild(dataBarEl, "borderColor");
  const negativeFillColorEl = getChild(dataBarEl, "negativeFillColor");
  const negativeBorderColorEl = getChild(dataBarEl, "negativeBorderColor");
  const axisColorEl = getChild(dataBarEl, "axisColor");

  return {
    type: "dataBar",
    priority: parseIntAttr(getAttr(ruleElement, "priority")),
    stopIfTrue: parseBooleanAttr(getAttr(ruleElement, "stopIfTrue")),
    cfvo: cfvoElements.map(parseCfvo),
    color: colorEl ? parseColorElement(colorEl) : fillColorEl ? parseColorElement(fillColorEl) : undefined,
    showValue: parseBooleanAttr(getAttr(dataBarEl, "showValue")) ?? true,
    minLength: parseIntAttr(getAttr(dataBarEl, "minLength")),
    maxLength: parseIntAttr(getAttr(dataBarEl, "maxLength")),
    gradient: parseBooleanAttr(getAttr(dataBarEl, "gradient")),
    borderColor: borderColorEl ? parseColorElement(borderColorEl) : undefined,
    negativeFillColor: negativeFillColorEl ? parseColorElement(negativeFillColorEl) : undefined,
    negativeBorderColor: negativeBorderColorEl ? parseColorElement(negativeBorderColorEl) : undefined,
    axisColor: axisColorEl ? parseColorElement(axisColorEl) : undefined,
    axisPosition: getAttr(dataBarEl, "axisPosition") as "automatic" | "middle" | "none" | undefined,
    direction: getAttr(dataBarEl, "direction") as "context" | "leftToRight" | "rightToLeft" | undefined,
  };
}

/**
 * Parse an iconSet rule.
 */
function parseIconSetRule(ruleElement: XmlElement): XlsxIconSetRule | undefined {
  const iconSetEl = getChild(ruleElement, "iconSet");
  if (!iconSetEl) {
    return undefined;
  }

  const cfvoElements = getChildren(iconSetEl, "cfvo");
  const iconSetName = (getAttr(iconSetEl, "iconSet") ?? "3TrafficLights1") as XlsxIconSetName;

  // Parse custom icons if present
  const cfIconElements = getChildren(iconSetEl, "cfIcon");
  const customIcons: XlsxCustomIcon[] = cfIconElements.map((iconEl) => ({
    iconSet: (getAttr(iconEl, "iconSet") ?? iconSetName) as XlsxIconSetName,
    iconId: parseIntAttr(getAttr(iconEl, "iconId")) ?? 0,
  }));

  return {
    type: "iconSet",
    priority: parseIntAttr(getAttr(ruleElement, "priority")),
    stopIfTrue: parseBooleanAttr(getAttr(ruleElement, "stopIfTrue")),
    iconSet: iconSetName,
    cfvo: cfvoElements.map(parseCfvo),
    showValue: parseBooleanAttr(getAttr(iconSetEl, "showValue")),
    reverse: parseBooleanAttr(getAttr(iconSetEl, "reverse")),
    iconOnly: parseBooleanAttr(getAttr(iconSetEl, "iconOnly")),
    customIcons: customIcons.length > 0 ? customIcons : undefined,
  };
}

/**
 * Parse a standard conditional formatting rule (cellIs, expression, etc.).
 */
function parseStandardRule(ruleElement: XmlElement): XlsxStandardRule {
  return {
    type: (getAttr(ruleElement, "type") ?? "expression") as XlsxStandardRule["type"],
    dxfId: parseIntAttr(getAttr(ruleElement, "dxfId")),
    priority: parseIntAttr(getAttr(ruleElement, "priority")),
    operator: getAttr(ruleElement, "operator") ?? undefined,
    stopIfTrue: parseBooleanAttr(getAttr(ruleElement, "stopIfTrue")),
    formulas: getChildren(ruleElement, "formula").map((el) => getTextContent(el)),
    text: getAttr(ruleElement, "text") ?? undefined,
    timePeriod: getAttr(ruleElement, "timePeriod") ?? undefined,
    rank: parseIntAttr(getAttr(ruleElement, "rank")),
    percent: parseBooleanAttr(getAttr(ruleElement, "percent")),
    bottom: parseBooleanAttr(getAttr(ruleElement, "bottom")),
    stdDev: parseIntAttr(getAttr(ruleElement, "stdDev")),
    equalAverage: parseBooleanAttr(getAttr(ruleElement, "equalAverage")),
    aboveAverage: parseBooleanAttr(getAttr(ruleElement, "aboveAverage")),
  };
}

function parseConditionalFormattingRule(ruleElement: XmlElement): XlsxConditionalFormattingRule {
  const type = getAttr(ruleElement, "type");

  // Check for colorScale, dataBar, or iconSet rules
  if (type === "colorScale") {
    const colorScaleRule = parseColorScaleRule(ruleElement);
    if (colorScaleRule) {
      return colorScaleRule;
    }
  }

  if (type === "dataBar") {
    const dataBarRule = parseDataBarRule(ruleElement);
    if (dataBarRule) {
      return dataBarRule;
    }
  }

  if (type === "iconSet") {
    const iconSetRule = parseIconSetRule(ruleElement);
    if (iconSetRule) {
      return iconSetRule;
    }
  }

  // Fall back to standard rule parsing
  return parseStandardRule(ruleElement);
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
export function parseSelection(selectionElement: XmlElement | undefined): XlsxSelection | undefined {
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
    showRowColHeaders: parseBooleanAttr(getAttr(sheetViewElement, "showRowColHeaders")),
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
// Auto Filter Parsing
// =============================================================================

/**
 * Parse filter operator.
 */
function parseFilterOperator(value: string | undefined): XlsxFilterOperator | undefined {
  switch (value) {
    case "equal":
    case "lessThan":
    case "lessThanOrEqual":
    case "notEqual":
    case "greaterThanOrEqual":
    case "greaterThan":
      return value;
    default:
      return undefined;
  }
}

/**
 * Parse dynamic filter type.
 */
function parseDynamicFilterType(value: string | undefined): XlsxDynamicFilterType | undefined {
  const validTypes = [
    "null",
    "aboveAverage",
    "belowAverage",
    "tomorrow",
    "today",
    "yesterday",
    "nextWeek",
    "thisWeek",
    "lastWeek",
    "nextMonth",
    "thisMonth",
    "lastMonth",
    "nextQuarter",
    "thisQuarter",
    "lastQuarter",
    "nextYear",
    "thisYear",
    "lastYear",
    "yearToDate",
    "Q1",
    "Q2",
    "Q3",
    "Q4",
    "M1",
    "M2",
    "M3",
    "M4",
    "M5",
    "M6",
    "M7",
    "M8",
    "M9",
    "M10",
    "M11",
    "M12",
  ];
  if (value && validTypes.includes(value)) {
    return value as XlsxDynamicFilterType;
  }
  return undefined;
}

/**
 * Parse filters element (list of specific values).
 *
 * @see ECMA-376 Part 4, Section 18.3.2.8 (filters)
 */
function parseFilters(filtersElement: XmlElement): XlsxFilters {
  const blank = parseBooleanAttr(getAttr(filtersElement, "blank"));
  const filterElements = getChildren(filtersElement, "filter");
  const values = filterElements
    .map((el) => getAttr(el, "val"))
    .filter((val): val is string => val !== undefined)
    .map((val) => ({ val }));

  return {
    type: "filters",
    ...(blank !== undefined && { blank }),
    ...(values.length > 0 && { values }),
  };
}

/**
 * Parse custom filters element.
 *
 * @see ECMA-376 Part 4, Section 18.3.2.2 (customFilters)
 */
function parseCustomFilters(customFiltersElement: XmlElement): XlsxCustomFilters {
  const and = parseBooleanAttr(getAttr(customFiltersElement, "and"));
  const customFilterElements = getChildren(customFiltersElement, "customFilter");
  const conditions: XlsxCustomFilter[] = customFilterElements.map((el) => ({
    operator: parseFilterOperator(getAttr(el, "operator")),
    val: getAttr(el, "val") ?? undefined,
  }));

  return {
    type: "customFilters",
    ...(and !== undefined && { and }),
    conditions,
  };
}

/**
 * Parse top10 filter element.
 *
 * @see ECMA-376 Part 4, Section 18.3.2.10 (top10)
 */
function parseTop10Filter(top10Element: XmlElement): XlsxTop10Filter {
  return {
    type: "top10",
    top: parseBooleanAttr(getAttr(top10Element, "top")),
    percent: parseBooleanAttr(getAttr(top10Element, "percent")),
    val: parseFloatAttr(getAttr(top10Element, "val")),
    filterVal: parseFloatAttr(getAttr(top10Element, "filterVal")),
  };
}

/**
 * Parse dynamic filter element.
 *
 * @see ECMA-376 Part 4, Section 18.3.2.3 (dynamicFilter)
 */
function parseDynamicFilter(dynamicFilterElement: XmlElement): XlsxDynamicFilter | undefined {
  const filterType = parseDynamicFilterType(getAttr(dynamicFilterElement, "type"));
  if (!filterType) return undefined;

  return {
    type: "dynamicFilter",
    filterType,
    val: parseFloatAttr(getAttr(dynamicFilterElement, "val")),
    maxVal: parseFloatAttr(getAttr(dynamicFilterElement, "maxVal")),
  };
}

/**
 * Parse a filter column element.
 *
 * @see ECMA-376 Part 4, Section 18.3.2.5 (filterColumn)
 */
function parseFilterColumn(filterColumnElement: XmlElement): XlsxFilterColumn {
  const colIdAttr = parseIntAttr(getAttr(filterColumnElement, "colId"));
  const colId = colIdx(colIdAttr ?? 0);
  const hiddenButton = parseBooleanAttr(getAttr(filterColumnElement, "hiddenButton"));
  const showButton = parseBooleanAttr(getAttr(filterColumnElement, "showButton"));

  // Parse filter type - only one should be present
  const filtersEl = getChild(filterColumnElement, "filters");
  const customFiltersEl = getChild(filterColumnElement, "customFilters");
  const top10El = getChild(filterColumnElement, "top10");
  const dynamicFilterEl = getChild(filterColumnElement, "dynamicFilter");

  let filter: XlsxFilterColumn["filter"];
  if (filtersEl) {
    filter = parseFilters(filtersEl);
  } else if (customFiltersEl) {
    filter = parseCustomFilters(customFiltersEl);
  } else if (top10El) {
    filter = parseTop10Filter(top10El);
  } else if (dynamicFilterEl) {
    filter = parseDynamicFilter(dynamicFilterEl);
  }

  return {
    colId,
    ...(hiddenButton !== undefined && { hiddenButton }),
    ...(showButton !== undefined && { showButton }),
    ...(filter && { filter }),
  };
}

/**
 * Parse auto filter element.
 *
 * @param autoFilterElement - The <autoFilter> element
 * @returns Parsed auto filter or undefined
 *
 * @see ECMA-376 Part 4, Section 18.3.1.2 (autoFilter)
 */
function parseAutoFilter(autoFilterElement: XmlElement | undefined): XlsxAutoFilter | undefined {
  if (!autoFilterElement) {
    return undefined;
  }

  const refAttr = getAttr(autoFilterElement, "ref");
  if (!refAttr) {
    return undefined;
  }

  const ref = parseRange(refAttr);
  const filterColumnElements = getChildren(autoFilterElement, "filterColumn");
  const filterColumns = filterColumnElements.map(parseFilterColumn);

  return {
    ref,
    ...(filterColumns.length > 0 && { filterColumns }),
  };
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
export function parseWorksheet(params: {
  readonly worksheetElement: XmlElement;
  readonly context: XlsxParseContext;
  readonly options: XlsxParseOptions | undefined;
  readonly sheetInfo: {
    readonly name: string;
    readonly sheetId: number;
    readonly state: "visible" | "hidden" | "veryHidden";
    readonly xmlPath: string;
  };
}): XlsxWorksheet {
  const { worksheetElement, context, options, sheetInfo } = params;
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
  const autoFilterEl = getChild(worksheetElement, "autoFilter");
  const autoFilter = parseAutoFilter(autoFilterEl);

  // Parse page setup elements
  const pageSetupEl = getChild(worksheetElement, "pageSetup");
  const pageMarginsEl = getChild(worksheetElement, "pageMargins");
  const headerFooterEl = getChild(worksheetElement, "headerFooter");
  const printOptionsEl = getChild(worksheetElement, "printOptions");

  const pageSetup = parsePageSetup(pageSetupEl);
  const pageMargins = parsePageMargins(pageMarginsEl);
  const headerFooter = parseHeaderFooter(headerFooterEl);
  const printOptions = parsePrintOptions(printOptionsEl);

  // Parse page breaks
  const pageBreaks = parsePageBreaks(worksheetElement);

  // Parse sparklines from extLst
  const sparklineGroups = parseSparklineGroups(worksheetElement);

  // Parse sheet protection
  const sheetProtectionEl = getChild(worksheetElement, "sheetProtection");
  const sheetProtection = parseSheetProtection(sheetProtectionEl);

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
    autoFilter,
    pageSetup,
    pageMargins,
    headerFooter,
    printOptions,
    pageBreaks,
    sparklineGroups,
    sheetProtection,
    xmlPath: sheetInfo.xmlPath,
  };
}
