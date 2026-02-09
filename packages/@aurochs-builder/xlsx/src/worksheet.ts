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

import type { XmlElement, XmlNode } from "@aurochs/xml";
import type { XlsxWorksheet, XlsxRow, XlsxColumnDef, XlsxSheetView, XlsxPane, XlsxSelection } from "@aurochs-office/xlsx/domain/workbook";
import type { CellRange } from "@aurochs-office/xlsx/domain/cell/address";
import type { XlsxColor } from "@aurochs-office/xlsx/domain/style/font";
import type { XlsxSheetProtection } from "@aurochs-office/xlsx/domain/protection";
import type { XlsxAutoFilter, XlsxFilterColumn, XlsxFilterType, XlsxSortState } from "@aurochs-office/xlsx/domain/auto-filter";
import type {
  XlsxConditionalFormatting,
  XlsxConditionalFormattingRule,
  XlsxCfvo,
  XlsxStandardRule,
  XlsxColorScaleRule,
  XlsxDataBarRule,
  XlsxIconSetRule,
} from "@aurochs-office/xlsx/domain/conditional-formatting";
import type { XlsxDataValidation } from "@aurochs-office/xlsx/domain/data-validation";
import type { XlsxHyperlink } from "@aurochs-office/xlsx/domain/hyperlink";
import type { XlsxPageSetup, XlsxPageMargins, XlsxHeaderFooter, XlsxPrintOptions } from "@aurochs-office/xlsx/domain/page-setup";
import type { XlsxPageBreak } from "@aurochs-office/xlsx/domain/page-breaks";
import { serializeCell, type SharedStringTable } from "./cell";
import { serializeRef, serializeRowIndex, serializeColIndex, serializeFloat, serializeBoolean } from "./units";
import { colIdx, rowIdx } from "@aurochs-office/xlsx/domain/types";

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
export function serializeRow(row: XlsxRow, sharedStrings: SharedStringTable): XmlElement {
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
  const children: XmlNode[] = row.cells.map((cell) => serializeCell(cell, sharedStrings));

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
export function serializeSheetData(rows: readonly XlsxRow[], sharedStrings: SharedStringTable): XmlElement {
  // Skip empty rows (rows with no cells)
  const nonEmptyRows = rows.filter((row) => row.cells.length > 0);

  const children: XmlNode[] = nonEmptyRows.map((row) => serializeRow(row, sharedStrings));

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
export function serializeMergeCells(mergeCells: readonly CellRange[]): XmlElement {
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
// Color Serialization (for tabColor and conditional formatting)
// =============================================================================

function serializeColorElement(elementName: string, color: XlsxColor): XmlElement {
  const attrs: Record<string, string> = {};
  switch (color.type) {
    case "rgb":
      attrs.rgb = color.value;
      break;
    case "theme":
      attrs.theme = String(color.theme);
      if (color.tint !== undefined) {
        attrs.tint = String(color.tint);
      }
      break;
    case "indexed":
      attrs.indexed = String(color.index);
      break;
    case "auto":
      attrs.auto = "1";
      break;
  }
  return { type: "element", name: elementName, attrs, children: [] };
}

// =============================================================================
// sheetPr Serialization (tabColor)
// =============================================================================

/**
 * Serialize the sheetPr element (contains tabColor).
 *
 * @see ECMA-376 Part 4, Section 18.3.1.82 (sheetPr)
 */
export function serializeSheetPr(worksheet: XlsxWorksheet): XmlElement | undefined {
  if (!worksheet.tabColor) {
    return undefined;
  }
  const children: XmlNode[] = [serializeColorElement("tabColor", worksheet.tabColor)];
  return { type: "element", name: "sheetPr", attrs: {}, children };
}

// =============================================================================
// sheetViews Serialization
// =============================================================================

function serializePane(pane: XlsxPane): XmlElement {
  const attrs: Record<string, string> = {};
  if (pane.xSplit !== undefined) {attrs.xSplit = String(pane.xSplit);}
  if (pane.ySplit !== undefined) {attrs.ySplit = String(pane.ySplit);}
  if (pane.topLeftCell) {attrs.topLeftCell = pane.topLeftCell;}
  if (pane.activePane) {attrs.activePane = pane.activePane;}
  if (pane.state) {attrs.state = pane.state;}
  return { type: "element", name: "pane", attrs, children: [] };
}

function serializeSelection(selection: XlsxSelection): XmlElement {
  const attrs: Record<string, string> = {};
  if (selection.pane) {attrs.pane = selection.pane;}
  if (selection.activeCell) {attrs.activeCell = selection.activeCell;}
  if (selection.sqref) {attrs.sqref = selection.sqref;}
  return { type: "element", name: "selection", attrs, children: [] };
}

/**
 * Serialize the sheetViews element.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.88 (sheetViews)
 */
export function serializeSheetViews(sheetView: XlsxSheetView): XmlElement {
  const attrs: Record<string, string> = {};
  if (sheetView.tabSelected) {attrs.tabSelected = serializeBoolean(sheetView.tabSelected);}
  if (sheetView.showGridLines !== undefined) {attrs.showGridLines = serializeBoolean(sheetView.showGridLines);}
  if (sheetView.showRowColHeaders !== undefined) {attrs.showRowColHeaders = serializeBoolean(sheetView.showRowColHeaders);}
  if (sheetView.zoomScale !== undefined) {attrs.zoomScale = String(sheetView.zoomScale);}
  attrs.workbookViewId = "0";

  const children: XmlNode[] = [];
  if (sheetView.pane) {children.push(serializePane(sheetView.pane));}
  if (sheetView.selection) {children.push(serializeSelection(sheetView.selection));}

  const sheetViewEl: XmlElement = { type: "element", name: "sheetView", attrs, children };
  return { type: "element", name: "sheetViews", attrs: {}, children: [sheetViewEl] };
}

// =============================================================================
// sheetProtection Serialization
// =============================================================================

/**
 * Serialize the sheetProtection element.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.85 (sheetProtection)
 */
export function serializeSheetProtection(protection: XlsxSheetProtection): XmlElement {
  const attrs: Record<string, string> = {};
  const boolFields: (keyof XlsxSheetProtection)[] = [
    "sheet", "objects", "scenarios", "formatCells", "formatColumns", "formatRows",
    "insertColumns", "insertRows", "insertHyperlinks", "deleteColumns", "deleteRows",
    "selectLockedCells", "sort", "autoFilter", "pivotTables", "selectUnlockedCells",
  ];
  for (const field of boolFields) {
    const val = protection[field];
    if (typeof val === "boolean") {
      attrs[field] = serializeBoolean(val);
    }
  }
  if (protection.password) {attrs.password = protection.password;}
  if (protection.algorithmName) {attrs.algorithmName = protection.algorithmName;}
  if (protection.hashValue) {attrs.hashValue = protection.hashValue;}
  if (protection.saltValue) {attrs.saltValue = protection.saltValue;}
  if (protection.spinCount !== undefined) {attrs.spinCount = String(protection.spinCount);}

  return { type: "element", name: "sheetProtection", attrs, children: [] };
}

// =============================================================================
// autoFilter Serialization
// =============================================================================

function serializeFilterType(filter: XlsxFilterType): XmlElement {
  switch (filter.type) {
    case "filters": {
      const children: XmlNode[] = [];
      if (filter.values) {
        for (const v of filter.values) {
          children.push({ type: "element", name: "filter", attrs: { val: v.val }, children: [] });
        }
      }
      const attrs: Record<string, string> = {};
      if (filter.blank) {attrs.blank = serializeBoolean(filter.blank);}
      return { type: "element", name: "filters", attrs, children };
    }
    case "customFilters": {
      const children: XmlNode[] = filter.conditions.map((c) => {
        const a: Record<string, string> = {};
        if (c.operator) {a.operator = c.operator;}
        if (c.val !== undefined) {a.val = c.val;}
        return { type: "element", name: "customFilter", attrs: a, children: [] } as XmlElement;
      });
      const attrs: Record<string, string> = {};
      if (filter.and) {attrs.and = serializeBoolean(filter.and);}
      return { type: "element", name: "customFilters", attrs, children };
    }
    case "top10": {
      const attrs: Record<string, string> = {};
      if (filter.top !== undefined) {attrs.top = serializeBoolean(filter.top);}
      if (filter.percent !== undefined) {attrs.percent = serializeBoolean(filter.percent);}
      if (filter.val !== undefined) {attrs.val = serializeFloat(filter.val);}
      if (filter.filterVal !== undefined) {attrs.filterVal = serializeFloat(filter.filterVal);}
      return { type: "element", name: "top10", attrs, children: [] };
    }
    case "dynamicFilter": {
      const attrs: Record<string, string> = { type: filter.filterType };
      if (filter.val !== undefined) {attrs.val = serializeFloat(filter.val);}
      if (filter.maxVal !== undefined) {attrs.maxVal = serializeFloat(filter.maxVal);}
      return { type: "element", name: "dynamicFilter", attrs, children: [] };
    }
    case "colorFilter": {
      const attrs: Record<string, string> = {};
      if (filter.cellColor !== undefined) {attrs.cellColor = serializeBoolean(filter.cellColor);}
      if (filter.dxfId !== undefined) {attrs.dxfId = String(filter.dxfId);}
      return { type: "element", name: "colorFilter", attrs, children: [] };
    }
    case "iconFilter": {
      const attrs: Record<string, string> = {};
      if (filter.iconSet) {attrs.iconSet = filter.iconSet;}
      if (filter.iconId !== undefined) {attrs.iconId = String(filter.iconId);}
      return { type: "element", name: "iconFilter", attrs, children: [] };
    }
  }
}

function serializeFilterColumn(col: XlsxFilterColumn): XmlElement {
  const attrs: Record<string, string> = { colId: String(col.colId) };
  if (col.hiddenButton !== undefined) {attrs.hiddenButton = serializeBoolean(col.hiddenButton);}
  if (col.showButton !== undefined) {attrs.showButton = serializeBoolean(col.showButton);}
  const children: XmlNode[] = [];
  if (col.filter) {children.push(serializeFilterType(col.filter));}
  return { type: "element", name: "filterColumn", attrs, children };
}

function serializeSortState(sortState: XlsxSortState): XmlElement {
  const attrs: Record<string, string> = { ref: sortState.ref };
  if (sortState.caseSensitive) {attrs.caseSensitive = serializeBoolean(sortState.caseSensitive);}
  const children: XmlNode[] = [];
  if (sortState.sortConditions) {
    for (const cond of sortState.sortConditions) {
      const a: Record<string, string> = { ref: cond.ref };
      if (cond.descending) {a.descending = serializeBoolean(cond.descending);}
      children.push({ type: "element", name: "sortCondition", attrs: a, children: [] });
    }
  }
  return { type: "element", name: "sortState", attrs, children };
}

/**
 * Serialize the autoFilter element.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.2 (autoFilter)
 */
export function serializeAutoFilter(autoFilter: XlsxAutoFilter): XmlElement {
  const attrs: Record<string, string> = { ref: serializeRef(autoFilter.ref) };
  const children: XmlNode[] = [];
  if (autoFilter.filterColumns) {
    for (const col of autoFilter.filterColumns) {
      children.push(serializeFilterColumn(col));
    }
  }
  if (autoFilter.sortState) {
    children.push(serializeSortState(autoFilter.sortState));
  }
  return { type: "element", name: "autoFilter", attrs, children };
}

// =============================================================================
// conditionalFormatting Serialization
// =============================================================================

function serializeCfvo(cfvo: XlsxCfvo): XmlElement {
  const attrs: Record<string, string> = { type: cfvo.type };
  if (cfvo.val !== undefined) {attrs.val = cfvo.val;}
  if (cfvo.gte !== undefined) {attrs.gte = serializeBoolean(cfvo.gte);}
  return { type: "element", name: "cfvo", attrs, children: [] };
}

function serializeStandardRule(rule: XlsxStandardRule): XmlElement {
  const attrs: Record<string, string> = { type: rule.type };
  if (rule.dxfId !== undefined) {attrs.dxfId = String(rule.dxfId);}
  if (rule.priority !== undefined) {attrs.priority = String(rule.priority);}
  if (rule.operator) {attrs.operator = rule.operator;}
  if (rule.stopIfTrue) {attrs.stopIfTrue = serializeBoolean(rule.stopIfTrue);}
  if (rule.text) {attrs.text = rule.text;}
  if (rule.timePeriod) {attrs.timePeriod = rule.timePeriod;}
  if (rule.rank !== undefined) {attrs.rank = String(rule.rank);}
  if (rule.percent !== undefined) {attrs.percent = serializeBoolean(rule.percent);}
  if (rule.bottom !== undefined) {attrs.bottom = serializeBoolean(rule.bottom);}
  if (rule.stdDev !== undefined) {attrs.stdDev = String(rule.stdDev);}
  if (rule.equalAverage !== undefined) {attrs.equalAverage = serializeBoolean(rule.equalAverage);}
  if (rule.aboveAverage !== undefined) {attrs.aboveAverage = serializeBoolean(rule.aboveAverage);}

  const children: XmlNode[] = rule.formulas.map((f) => ({
    type: "element" as const,
    name: "formula",
    attrs: {},
    children: [{ type: "text" as const, value: f }],
  }));

  return { type: "element", name: "cfRule", attrs, children };
}

function serializeColorScaleRule(rule: XlsxColorScaleRule): XmlElement {
  const attrs: Record<string, string> = { type: "colorScale" };
  if (rule.priority !== undefined) {attrs.priority = String(rule.priority);}
  if (rule.stopIfTrue) {attrs.stopIfTrue = serializeBoolean(rule.stopIfTrue);}

  const scaleChildren: XmlNode[] = [
    ...rule.cfvo.map(serializeCfvo),
    ...rule.colors.map((c) => serializeColorElement("color", c)),
  ];
  const colorScale: XmlElement = { type: "element", name: "colorScale", attrs: {}, children: scaleChildren };

  return { type: "element", name: "cfRule", attrs, children: [colorScale] };
}

function serializeDataBarRule(rule: XlsxDataBarRule): XmlElement {
  const attrs: Record<string, string> = { type: "dataBar" };
  if (rule.priority !== undefined) {attrs.priority = String(rule.priority);}
  if (rule.stopIfTrue) {attrs.stopIfTrue = serializeBoolean(rule.stopIfTrue);}

  const barAttrs: Record<string, string> = {};
  if (rule.showValue !== undefined) {barAttrs.showValue = serializeBoolean(rule.showValue);}
  if (rule.minLength !== undefined) {barAttrs.minLength = String(rule.minLength);}
  if (rule.maxLength !== undefined) {barAttrs.maxLength = String(rule.maxLength);}
  if (rule.gradient !== undefined) {barAttrs.gradient = serializeBoolean(rule.gradient);}
  if (rule.axisPosition) {barAttrs.axisPosition = rule.axisPosition;}
  if (rule.direction) {barAttrs.direction = rule.direction;}

  const barChildren: XmlNode[] = rule.cfvo.map(serializeCfvo);
  if (rule.color) {barChildren.push(serializeColorElement("color", rule.color));}
  if (rule.negativeFillColor) {barChildren.push(serializeColorElement("negativeFillColor", rule.negativeFillColor));}
  if (rule.negativeBorderColor) {barChildren.push(serializeColorElement("negativeBorderColor", rule.negativeBorderColor));}
  if (rule.borderColor) {barChildren.push(serializeColorElement("borderColor", rule.borderColor));}
  if (rule.axisColor) {barChildren.push(serializeColorElement("axisColor", rule.axisColor));}

  const dataBar: XmlElement = { type: "element", name: "dataBar", attrs: barAttrs, children: barChildren };
  return { type: "element", name: "cfRule", attrs, children: [dataBar] };
}

function serializeIconSetRule(rule: XlsxIconSetRule): XmlElement {
  const attrs: Record<string, string> = { type: "iconSet" };
  if (rule.priority !== undefined) {attrs.priority = String(rule.priority);}
  if (rule.stopIfTrue) {attrs.stopIfTrue = serializeBoolean(rule.stopIfTrue);}

  const iconAttrs: Record<string, string> = { iconSet: rule.iconSet };
  if (rule.showValue !== undefined) {iconAttrs.showValue = serializeBoolean(rule.showValue);}
  if (rule.reverse !== undefined) {iconAttrs.reverse = serializeBoolean(rule.reverse);}
  if (rule.iconOnly !== undefined) {iconAttrs.iconOnly = serializeBoolean(rule.iconOnly);}

  const iconChildren: XmlNode[] = rule.cfvo.map(serializeCfvo);
  if (rule.customIcons) {
    for (const ci of rule.customIcons) {
      iconChildren.push({
        type: "element",
        name: "cfIcon",
        attrs: { iconSet: ci.iconSet, iconId: String(ci.iconId) },
        children: [],
      });
    }
  }

  const iconSet: XmlElement = { type: "element", name: "iconSet", attrs: iconAttrs, children: iconChildren };
  return { type: "element", name: "cfRule", attrs, children: [iconSet] };
}

function serializeCfRule(rule: XlsxConditionalFormattingRule): XmlElement {
  switch (rule.type) {
    case "colorScale":
      return serializeColorScaleRule(rule);
    case "dataBar":
      return serializeDataBarRule(rule);
    case "iconSet":
      return serializeIconSetRule(rule);
    default:
      return serializeStandardRule(rule);
  }
}

/**
 * Serialize a conditionalFormatting element.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.18 (conditionalFormatting)
 */
export function serializeConditionalFormatting(cf: XlsxConditionalFormatting): XmlElement {
  const children: XmlNode[] = cf.rules.map(serializeCfRule);
  return {
    type: "element",
    name: "conditionalFormatting",
    attrs: { sqref: cf.sqref },
    children,
  };
}

// =============================================================================
// dataValidations Serialization
// =============================================================================

function serializeDataValidation(dv: XlsxDataValidation): XmlElement {
  const attrs: Record<string, string> = {};
  if (dv.type) {attrs.type = dv.type;}
  if (dv.operator) {attrs.operator = dv.operator;}
  if (dv.allowBlank !== undefined) {attrs.allowBlank = serializeBoolean(dv.allowBlank);}
  if (dv.showInputMessage !== undefined) {attrs.showInputMessage = serializeBoolean(dv.showInputMessage);}
  if (dv.showErrorMessage !== undefined) {attrs.showErrorMessage = serializeBoolean(dv.showErrorMessage);}
  if (dv.showDropDown !== undefined) {attrs.showDropDown = serializeBoolean(dv.showDropDown);}
  if (dv.errorStyle) {attrs.errorStyle = dv.errorStyle;}
  if (dv.promptTitle) {attrs.promptTitle = dv.promptTitle;}
  if (dv.prompt) {attrs.prompt = dv.prompt;}
  if (dv.errorTitle) {attrs.errorTitle = dv.errorTitle;}
  if (dv.error) {attrs.error = dv.error;}
  attrs.sqref = dv.sqref;

  const children: XmlNode[] = [];
  if (dv.formula1 !== undefined) {
    children.push({ type: "element", name: "formula1", attrs: {}, children: [{ type: "text", value: dv.formula1 }] });
  }
  if (dv.formula2 !== undefined) {
    children.push({ type: "element", name: "formula2", attrs: {}, children: [{ type: "text", value: dv.formula2 }] });
  }

  return { type: "element", name: "dataValidation", attrs, children };
}

/**
 * Serialize the dataValidations element.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.33 (dataValidations)
 */
export function serializeDataValidations(validations: readonly XlsxDataValidation[]): XmlElement {
  const children: XmlNode[] = validations.map(serializeDataValidation);
  return {
    type: "element",
    name: "dataValidations",
    attrs: { count: String(validations.length) },
    children,
  };
}

// =============================================================================
// hyperlinks Serialization
// =============================================================================

/**
 * Serialize the hyperlinks element.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.48 (hyperlinks)
 */
export function serializeHyperlinks(hyperlinks: readonly XlsxHyperlink[]): XmlElement {
  const children: XmlNode[] = hyperlinks.map((h) => {
    const attrs: Record<string, string> = { ref: serializeRef(h.ref) };
    if (h.relationshipId) {attrs["r:id"] = h.relationshipId;}
    if (h.display) {attrs.display = h.display;}
    if (h.location) {attrs.location = h.location;}
    if (h.tooltip) {attrs.tooltip = h.tooltip;}
    return { type: "element", name: "hyperlink", attrs, children: [] } as XmlElement;
  });
  return { type: "element", name: "hyperlinks", attrs: {}, children };
}

// =============================================================================
// printOptions Serialization
// =============================================================================

/**
 * Serialize the printOptions element.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.70 (printOptions)
 */
export function serializePrintOptions(options: XlsxPrintOptions): XmlElement {
  const attrs: Record<string, string> = {};
  if (options.gridLines !== undefined) {attrs.gridLines = serializeBoolean(options.gridLines);}
  if (options.headings !== undefined) {attrs.headings = serializeBoolean(options.headings);}
  if (options.gridLinesSet !== undefined) {attrs.gridLinesSet = serializeBoolean(options.gridLinesSet);}
  if (options.horizontalCentered !== undefined) {attrs.horizontalCentered = serializeBoolean(options.horizontalCentered);}
  if (options.verticalCentered !== undefined) {attrs.verticalCentered = serializeBoolean(options.verticalCentered);}
  return { type: "element", name: "printOptions", attrs, children: [] };
}

// =============================================================================
// pageMargins Serialization
// =============================================================================

/**
 * Serialize the pageMargins element.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.62 (pageMargins)
 */
export function serializePageMargins(margins: XlsxPageMargins): XmlElement {
  const attrs: Record<string, string> = {
    left: serializeFloat(margins.left ?? 0.7),
    right: serializeFloat(margins.right ?? 0.7),
    top: serializeFloat(margins.top ?? 0.75),
    bottom: serializeFloat(margins.bottom ?? 0.75),
    header: serializeFloat(margins.header ?? 0.3),
    footer: serializeFloat(margins.footer ?? 0.3),
  };
  return { type: "element", name: "pageMargins", attrs, children: [] };
}

// =============================================================================
// pageSetup Serialization
// =============================================================================

/**
 * Serialize the pageSetup element.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.63 (pageSetup)
 */
export function serializePageSetup(setup: XlsxPageSetup): XmlElement {
  const attrs: Record<string, string> = {};
  if (setup.paperSize !== undefined) {attrs.paperSize = String(setup.paperSize);}
  if (setup.orientation) {attrs.orientation = setup.orientation;}
  if (setup.scale !== undefined) {attrs.scale = String(setup.scale);}
  if (setup.fitToWidth !== undefined) {attrs.fitToWidth = String(setup.fitToWidth);}
  if (setup.fitToHeight !== undefined) {attrs.fitToHeight = String(setup.fitToHeight);}
  if (setup.firstPageNumber !== undefined) {attrs.firstPageNumber = String(setup.firstPageNumber);}
  if (setup.useFirstPageNumber !== undefined) {attrs.useFirstPageNumber = serializeBoolean(setup.useFirstPageNumber);}
  if (setup.blackAndWhite !== undefined) {attrs.blackAndWhite = serializeBoolean(setup.blackAndWhite);}
  if (setup.draft !== undefined) {attrs.draft = serializeBoolean(setup.draft);}
  if (setup.cellComments) {attrs.cellComments = setup.cellComments;}
  if (setup.pageOrder) {attrs.pageOrder = setup.pageOrder;}
  if (setup.horizontalDpi !== undefined) {attrs.horizontalDpi = String(setup.horizontalDpi);}
  if (setup.verticalDpi !== undefined) {attrs.verticalDpi = String(setup.verticalDpi);}
  if (setup.copies !== undefined) {attrs.copies = String(setup.copies);}
  return { type: "element", name: "pageSetup", attrs, children: [] };
}

// =============================================================================
// headerFooter Serialization
// =============================================================================

/**
 * Serialize the headerFooter element.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.46 (headerFooter)
 */
export function serializeHeaderFooter(hf: XlsxHeaderFooter): XmlElement {
  const attrs: Record<string, string> = {};
  if (hf.differentOddEven !== undefined) {attrs.differentOddEven = serializeBoolean(hf.differentOddEven);}
  if (hf.differentFirst !== undefined) {attrs.differentFirst = serializeBoolean(hf.differentFirst);}
  if (hf.scaleWithDoc !== undefined) {attrs.scaleWithDoc = serializeBoolean(hf.scaleWithDoc);}
  if (hf.alignWithMargins !== undefined) {attrs.alignWithMargins = serializeBoolean(hf.alignWithMargins);}

  const children: XmlNode[] = [];
  const addTextEl = (name: string, text?: string) => {
    if (text !== undefined) {
      children.push({ type: "element", name, attrs: {}, children: [{ type: "text", value: text }] });
    }
  };
  addTextEl("oddHeader", hf.oddHeader);
  addTextEl("oddFooter", hf.oddFooter);
  addTextEl("evenHeader", hf.evenHeader);
  addTextEl("evenFooter", hf.evenFooter);
  addTextEl("firstHeader", hf.firstHeader);
  addTextEl("firstFooter", hf.firstFooter);

  return { type: "element", name: "headerFooter", attrs, children };
}

// =============================================================================
// pageBreaks Serialization
// =============================================================================

function serializeBreaks(elementName: string, breaks: readonly XlsxPageBreak[]): XmlElement {
  const children: XmlNode[] = breaks.map((brk) => {
    const attrs: Record<string, string> = { id: String(brk.id) };
    if (brk.max !== undefined) {attrs.max = String(brk.max);}
    if (brk.min !== undefined) {attrs.min = String(brk.min);}
    if (brk.manual !== undefined) {attrs.man = serializeBoolean(brk.manual);}
    if (brk.pt !== undefined) {attrs.pt = serializeBoolean(brk.pt);}
    return { type: "element", name: "brk", attrs, children: [] } as XmlElement;
  });

  return {
    type: "element",
    name: elementName,
    attrs: { count: String(breaks.length), manualBreakCount: String(breaks.filter((b) => b.manual).length) },
    children,
  };
}

/**
 * Serialize the rowBreaks element.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.74 (rowBreaks)
 */
export function serializeRowBreaks(breaks: readonly XlsxPageBreak[]): XmlElement {
  return serializeBreaks("rowBreaks", breaks);
}

/**
 * Serialize the colBreaks element.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.14 (colBreaks)
 */
export function serializeColBreaks(breaks: readonly XlsxPageBreak[]): XmlElement {
  return serializeBreaks("colBreaks", breaks);
}

// =============================================================================
// Worksheet Serialization
// =============================================================================

/**
 * Serialize a complete worksheet to XML element.
 *
 * The child elements are ordered according to ECMA-376 §18.3.1.99:
 * 1. sheetPr (tabColor)
 * 2. dimension
 * 3. sheetViews
 * 4. sheetFormatPr
 * 5. cols
 * 6. sheetData
 * 7. sheetProtection
 * 8. autoFilter
 * 9. mergeCells
 * 10. conditionalFormatting
 * 11. dataValidations
 * 12. hyperlinks
 * 13. printOptions
 * 14. pageMargins
 * 15. pageSetup
 * 16. headerFooter
 * 17. rowBreaks / colBreaks
 *
 * @param worksheet - Worksheet to serialize
 * @param sharedStrings - Shared string table for string values
 * @returns XmlElement for the worksheet element
 *
 * @see ECMA-376 Part 4, Section 18.3.1.99 (worksheet)
 */
export function serializeWorksheet(worksheet: XlsxWorksheet, sharedStrings: SharedStringTable): XmlElement {
  const children: XmlNode[] = [];
  const wsAttrs: Record<string, string> = {
    xmlns: SPREADSHEETML_NS,
  };

  // Add r namespace if hyperlinks with relationship IDs exist
  const hasRelHyperlinks = worksheet.hyperlinks?.some((h) => h.relationshipId);
  if (hasRelHyperlinks) {
    wsAttrs["xmlns:r"] = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  }

  // 1. sheetPr (tabColor)
  const sheetPr = serializeSheetPr(worksheet);
  if (sheetPr) {children.push(sheetPr);}

  // 2. dimension
  children.push(serializeDimension(worksheet.rows));

  // 3. sheetViews
  if (worksheet.sheetView) {
    children.push(serializeSheetViews(worksheet.sheetView));
  }

  // 4. sheetFormatPr
  const sheetFormatPr = serializeSheetFormatPr(worksheet);
  if (sheetFormatPr) {children.push(sheetFormatPr);}

  // 5. cols
  if (worksheet.columns && worksheet.columns.length > 0) {
    children.push(serializeCols(worksheet.columns));
  }

  // 6. sheetData
  children.push(serializeSheetData(worksheet.rows, sharedStrings));

  // 7. sheetProtection
  if (worksheet.sheetProtection) {
    children.push(serializeSheetProtection(worksheet.sheetProtection));
  }

  // 8. autoFilter
  if (worksheet.autoFilter) {
    children.push(serializeAutoFilter(worksheet.autoFilter));
  }

  // 9. mergeCells
  if (worksheet.mergeCells && worksheet.mergeCells.length > 0) {
    children.push(serializeMergeCells(worksheet.mergeCells));
  }

  // 10. conditionalFormatting (can appear multiple times)
  if (worksheet.conditionalFormattings && worksheet.conditionalFormattings.length > 0) {
    for (const cf of worksheet.conditionalFormattings) {
      children.push(serializeConditionalFormatting(cf));
    }
  }

  // 11. dataValidations
  if (worksheet.dataValidations && worksheet.dataValidations.length > 0) {
    children.push(serializeDataValidations(worksheet.dataValidations));
  }

  // 12. hyperlinks
  if (worksheet.hyperlinks && worksheet.hyperlinks.length > 0) {
    children.push(serializeHyperlinks(worksheet.hyperlinks));
  }

  // 13. printOptions
  if (worksheet.printOptions) {
    children.push(serializePrintOptions(worksheet.printOptions));
  }

  // 14. pageMargins
  if (worksheet.pageMargins) {
    children.push(serializePageMargins(worksheet.pageMargins));
  } else {
    // Default page margins
    children.push(serializePageMargins({
      left: 0.7,
      right: 0.7,
      top: 0.75,
      bottom: 0.75,
      header: 0.3,
      footer: 0.3,
    }));
  }

  // 15. pageSetup
  if (worksheet.pageSetup) {
    children.push(serializePageSetup(worksheet.pageSetup));
  }

  // 16. headerFooter
  if (worksheet.headerFooter) {
    children.push(serializeHeaderFooter(worksheet.headerFooter));
  }

  // 17. rowBreaks / colBreaks
  if (worksheet.pageBreaks) {
    if (worksheet.pageBreaks.rowBreaks.length > 0) {
      children.push(serializeRowBreaks(worksheet.pageBreaks.rowBreaks));
    }
    if (worksheet.pageBreaks.colBreaks.length > 0) {
      children.push(serializeColBreaks(worksheet.pageBreaks.colBreaks));
    }
  }

  return {
    type: "element",
    name: "worksheet",
    attrs: wsAttrs,
    children,
  };
}
