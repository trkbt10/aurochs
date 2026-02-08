/**
 * @file Pivot Table Parser
 *
 * Parses pivot table definition XML files.
 *
 * @see ECMA-376 Part 4, Section 18.10 (Pivot Tables)
 */

import type { XmlElement } from "@aurochs/xml";
import { getAttr, getChild, getChildren } from "@aurochs/xml";
import { parseRange } from "../../domain/cell/address";
import { parseBooleanAttr, parseIntAttr } from "../primitive";
import type {
  XlsxPivotTable,
  XlsxPivotField,
  XlsxPivotItem,
  XlsxPivotLocation,
  XlsxPivotTableStyleInfo,
  XlsxFieldReference,
  XlsxDataField,
} from "../../domain/pivot/types";

// =============================================================================
// Field Parsing
// =============================================================================

function parsePivotItem(itemElement: XmlElement): XlsxPivotItem {
  return {
    t: getAttr(itemElement, "t") as XlsxPivotItem["t"],
    h: parseBooleanAttr(getAttr(itemElement, "h")),
    s: parseBooleanAttr(getAttr(itemElement, "s")),
    x: parseIntAttr(getAttr(itemElement, "x")),
  };
}

function parsePivotField(fieldElement: XmlElement): XlsxPivotField {
  const itemsEl = getChild(fieldElement, "items");
  const items = itemsEl ? getChildren(itemsEl, "item").map(parsePivotItem) : undefined;

  return {
    name: getAttr(fieldElement, "name") ?? undefined,
    axis: getAttr(fieldElement, "axis") as XlsxPivotField["axis"],
    showAll: parseBooleanAttr(getAttr(fieldElement, "showAll")),
    sortType: getAttr(fieldElement, "sortType") as XlsxPivotField["sortType"],
    includeNewItemsInFilter: parseBooleanAttr(getAttr(fieldElement, "includeNewItemsInFilter")),
    showDropDowns: parseBooleanAttr(getAttr(fieldElement, "showDropDowns")),
    compact: parseBooleanAttr(getAttr(fieldElement, "compact")),
    outline: parseBooleanAttr(getAttr(fieldElement, "outline")),
    subtotalTop: parseBooleanAttr(getAttr(fieldElement, "subtotalTop")),
    insertBlankRow: parseBooleanAttr(getAttr(fieldElement, "insertBlankRow")),
    insertPageBreak: parseBooleanAttr(getAttr(fieldElement, "insertPageBreak")),
    numFmtId: parseIntAttr(getAttr(fieldElement, "numFmtId")),
    ...(items && items.length > 0 && { items }),
  };
}

function parseFieldReference(fieldElement: XmlElement): XlsxFieldReference {
  return {
    x: parseIntAttr(getAttr(fieldElement, "x")) ?? 0,
  };
}

function parseDataField(dataFieldElement: XmlElement): XlsxDataField {
  return {
    name: getAttr(dataFieldElement, "name") ?? undefined,
    fld: parseIntAttr(getAttr(dataFieldElement, "fld")) ?? 0,
    subtotal: getAttr(dataFieldElement, "subtotal") as XlsxDataField["subtotal"],
    showDataAs: getAttr(dataFieldElement, "showDataAs") as XlsxDataField["showDataAs"],
    numFmtId: parseIntAttr(getAttr(dataFieldElement, "numFmtId")),
  };
}

// =============================================================================
// Location Parsing
// =============================================================================

function parseLocation(locationElement: XmlElement | undefined): XlsxPivotLocation | undefined {
  if (!locationElement) {
    return undefined;
  }

  const ref = getAttr(locationElement, "ref");
  if (!ref) {
    return undefined;
  }

  return {
    ref: parseRange(ref),
    firstHeaderRow: parseIntAttr(getAttr(locationElement, "firstHeaderRow")),
    firstDataRow: parseIntAttr(getAttr(locationElement, "firstDataRow")),
    firstDataCol: parseIntAttr(getAttr(locationElement, "firstDataCol")),
    rowPageCount: parseIntAttr(getAttr(locationElement, "rowPageCount")),
    colPageCount: parseIntAttr(getAttr(locationElement, "colPageCount")),
  };
}

// =============================================================================
// Style Info Parsing
// =============================================================================

function parsePivotTableStyleInfo(styleInfoElement: XmlElement | undefined): XlsxPivotTableStyleInfo | undefined {
  if (!styleInfoElement) {
    return undefined;
  }

  return {
    name: getAttr(styleInfoElement, "name") ?? undefined,
    showRowHeaders: parseBooleanAttr(getAttr(styleInfoElement, "showRowHeaders")),
    showColHeaders: parseBooleanAttr(getAttr(styleInfoElement, "showColHeaders")),
    showRowStripes: parseBooleanAttr(getAttr(styleInfoElement, "showRowStripes")),
    showColStripes: parseBooleanAttr(getAttr(styleInfoElement, "showColStripes")),
    showLastColumn: parseBooleanAttr(getAttr(styleInfoElement, "showLastColumn")),
  };
}

// =============================================================================
// Main Parser
// =============================================================================

/**
 * Parse a pivot table definition XML element.
 *
 * @param pivotTableElement - The root pivotTableDefinition element
 * @param xmlPath - Path to the pivot table XML
 * @returns Parsed pivot table definition
 *
 * @see ECMA-376 Part 4, Section 18.10.1.73 (pivotTableDefinition)
 */
export function parsePivotTable(pivotTableElement: XmlElement, xmlPath: string): XlsxPivotTable {
  const locationEl = getChild(pivotTableElement, "location");
  const location = parseLocation(locationEl);
  if (!location) {
    throw new Error("Pivot table location is required");
  }

  // Parse pivot fields
  const pivotFieldsEl = getChild(pivotTableElement, "pivotFields");
  const pivotFields = pivotFieldsEl ? getChildren(pivotFieldsEl, "pivotField").map(parsePivotField) : undefined;

  // Parse row fields
  const rowFieldsEl = getChild(pivotTableElement, "rowFields");
  const rowFields = rowFieldsEl ? getChildren(rowFieldsEl, "field").map(parseFieldReference) : undefined;

  // Parse column fields
  const colFieldsEl = getChild(pivotTableElement, "colFields");
  const colFields = colFieldsEl ? getChildren(colFieldsEl, "field").map(parseFieldReference) : undefined;

  // Parse page fields
  const pageFieldsEl = getChild(pivotTableElement, "pageFields");
  const pageFields = pageFieldsEl ? getChildren(pageFieldsEl, "pageField").map(parseFieldReference) : undefined;

  // Parse data fields
  const dataFieldsEl = getChild(pivotTableElement, "dataFields");
  const dataFields = dataFieldsEl ? getChildren(dataFieldsEl, "dataField").map(parseDataField) : undefined;

  // Parse style info
  const styleInfoEl = getChild(pivotTableElement, "pivotTableStyleInfo");
  const pivotTableStyleInfo = parsePivotTableStyleInfo(styleInfoEl);

  return {
    name: getAttr(pivotTableElement, "name") ?? "PivotTable",
    cacheId: parseIntAttr(getAttr(pivotTableElement, "cacheId")) ?? 0,
    location,
    dataOnRows: parseBooleanAttr(getAttr(pivotTableElement, "dataOnRows")),
    dataPosition: parseIntAttr(getAttr(pivotTableElement, "dataPosition")),
    applyNumberFormats: parseBooleanAttr(getAttr(pivotTableElement, "applyNumberFormats")),
    applyBorderFormats: parseBooleanAttr(getAttr(pivotTableElement, "applyBorderFormats")),
    applyFontFormats: parseBooleanAttr(getAttr(pivotTableElement, "applyFontFormats")),
    applyPatternFormats: parseBooleanAttr(getAttr(pivotTableElement, "applyPatternFormats")),
    applyAlignmentFormats: parseBooleanAttr(getAttr(pivotTableElement, "applyAlignmentFormats")),
    applyWidthHeightFormats: parseBooleanAttr(getAttr(pivotTableElement, "applyWidthHeightFormats")),
    rowGrandTotals: parseBooleanAttr(getAttr(pivotTableElement, "rowGrandTotals")),
    colGrandTotals: parseBooleanAttr(getAttr(pivotTableElement, "colGrandTotals")),
    showError: parseBooleanAttr(getAttr(pivotTableElement, "showError")),
    errorCaption: getAttr(pivotTableElement, "errorCaption") ?? undefined,
    showDrill: parseBooleanAttr(getAttr(pivotTableElement, "showDrill")),
    showHeaders: parseBooleanAttr(getAttr(pivotTableElement, "showHeaders")),
    compact: parseBooleanAttr(getAttr(pivotTableElement, "compact")),
    outline: parseBooleanAttr(getAttr(pivotTableElement, "outline")),
    rowHeaderCaption: getAttr(pivotTableElement, "rowHeaderCaption") ?? undefined,
    colHeaderCaption: getAttr(pivotTableElement, "colHeaderCaption") ?? undefined,
    pivotTableStyleInfo,
    ...(pivotFields && pivotFields.length > 0 && { pivotFields }),
    ...(rowFields && rowFields.length > 0 && { rowFields }),
    ...(colFields && colFields.length > 0 && { colFields }),
    ...(pageFields && pageFields.length > 0 && { pageFields }),
    ...(dataFields && dataFields.length > 0 && { dataFields }),
    xmlPath,
  };
}
