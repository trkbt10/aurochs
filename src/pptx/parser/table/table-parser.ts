/**
 * @file Table parser
 *
 * Parses DrawingML table elements to Table domain objects.
 *
 * @see ECMA-376 Part 1, Section 21.1.3 - DrawingML Tables
 */

import type {
  CellAnchor,
  CellBorders,
  CellHorzOverflow,
  CellMargin,
  CellVerticalType,
  Table,
  TableCell,
  TableCellProperties,
  TableColumn,
  TableGrid,
  TableProperties,
  TableRow,
} from "../../domain/table";
import { px } from "../../domain/types";
import {
  getAttr,
  getChild,
  getChildren,
  getXmlText,
  type XmlElement,
} from "../../../xml/index";
import { parseFillFromParent } from "../graphics/fill-parser";
import { parseLine } from "../graphics/line-parser";
import { parseEffects } from "../graphics/effects-parser";
import { parseTextBody } from "../text/text-parser";
import { getBoolAttr, getEmuAttr, getIntAttr } from "../primitive";
import { parseCell3d } from "../cell3d-parser";

// =============================================================================
// Table Properties Parsing
// =============================================================================

/**
 * Parse table properties (a:tblPr)
 * @see ECMA-376 Part 1, Section 21.1.3.15
 *
 * ```xml
 * <a:tblPr rtl="0" firstRow="1" bandRow="1">
 *   <a:tableStyleId>{style-guid}</a:tableStyleId>
 * </a:tblPr>
 * ```
 */
function parseTableProperties(tblPr: XmlElement | undefined): TableProperties {
  if (!tblPr) {
    return {};
  }

  // Get table style ID (child element, not attribute)
  const tableStyleIdEl = getChild(tblPr, "a:tableStyleId");
  const tableStyleId = tableStyleIdEl ? getXmlText(tableStyleIdEl) : undefined;

  return {
    rtl: getBoolAttr(tblPr, "rtl"),
    firstRow: getBoolAttr(tblPr, "firstRow"),
    firstCol: getBoolAttr(tblPr, "firstCol"),
    lastRow: getBoolAttr(tblPr, "lastRow"),
    lastCol: getBoolAttr(tblPr, "lastCol"),
    bandRow: getBoolAttr(tblPr, "bandRow"),
    bandCol: getBoolAttr(tblPr, "bandCol"),
    fill: parseFillFromParent(tblPr),
    effects: parseEffects(tblPr),
    tableStyleId,
  };
}

// =============================================================================
// Table Grid Parsing
// =============================================================================

/**
 * Parse table column (a:gridCol)
 * @see ECMA-376 Part 1, Section 21.1.3.5
 *
 * ```xml
 * <a:gridCol w="914400"/>
 * ```
 */
function parseTableColumn(gridCol: XmlElement): TableColumn {
  return {
    width: getEmuAttr(gridCol, "w") ?? px(0),
  };
}

/**
 * Parse table grid (a:tblGrid)
 * @see ECMA-376 Part 1, Section 21.1.3.14
 *
 * ```xml
 * <a:tblGrid>
 *   <a:gridCol w="914400"/>
 *   <a:gridCol w="914400"/>
 * </a:tblGrid>
 * ```
 */
function parseTableGrid(tblGrid: XmlElement | undefined): TableGrid {
  if (!tblGrid) {
    return { columns: [] };
  }

  const columns: TableColumn[] = [];
  for (const gridCol of getChildren(tblGrid, "a:gridCol")) {
    columns.push(parseTableColumn(gridCol));
  }

  return { columns };
}

// =============================================================================
// Table Cell Properties Parsing
// =============================================================================

/**
 * Parse cell margins from a:tcPr
 * @see ECMA-376 Part 1, Section 21.1.3.17
 */
function parseCellMargins(tcPr: XmlElement): CellMargin | undefined {
  const left = getEmuAttr(tcPr, "marL");
  const right = getEmuAttr(tcPr, "marR");
  const top = getEmuAttr(tcPr, "marT");
  const bottom = getEmuAttr(tcPr, "marB");

  // Return undefined if no margins specified
  if (left === undefined && right === undefined && top === undefined && bottom === undefined) {
    return undefined;
  }

  // Default margins as per ECMA-376 (91440 EMU = 0.1 inch = 7.2pt ≈ 9.6px)
  const defaultMargin = px(9.6);

  return {
    left: left ?? defaultMargin,
    right: right ?? defaultMargin,
    top: top ?? defaultMargin,
    bottom: bottom ?? defaultMargin,
  };
}

/**
 * Parse cell borders from a:tcPr
 * @see ECMA-376 Part 1, Section 21.1.3.4-8
 */
function parseCellBorders(tcPr: XmlElement): CellBorders | undefined {
  const lnL = getChild(tcPr, "a:lnL");
  const lnR = getChild(tcPr, "a:lnR");
  const lnT = getChild(tcPr, "a:lnT");
  const lnB = getChild(tcPr, "a:lnB");
  const lnTlToBr = getChild(tcPr, "a:lnTlToBr");
  const lnBlToTr = getChild(tcPr, "a:lnBlToTr");

  // Return undefined if no borders specified
  if (!lnL && !lnR && !lnT && !lnB && !lnTlToBr && !lnBlToTr) {
    return undefined;
  }

  return {
    left: parseLine(lnL),
    right: parseLine(lnR),
    top: parseLine(lnT),
    bottom: parseLine(lnB),
    tlToBr: parseLine(lnTlToBr),
    blToTr: parseLine(lnBlToTr),
  };
}

function parseCellHeaders(tcPr: XmlElement): string[] | undefined {
  const headersEl = getChild(tcPr, "a:headers");
  if (!headersEl) {
    return undefined;
  }

  const headers: string[] = [];
  for (const header of getChildren(headersEl, "a:header")) {
    const valAttr = getAttr(header, "val");
    if (valAttr) {
      headers.push(valAttr);
      continue;
    }
    const textValue = getXmlText(header);
    if (textValue !== undefined && textValue.length > 0) {
      headers.push(textValue);
    }
  }

  return headers.length > 0 ? headers : undefined;
}

/**
 * Parse table cell properties (a:tcPr)
 * @see ECMA-376 Part 1, Section 21.1.3.17
 *
 * ```xml
 * <a:tcPr marL="91440" marR="91440" marT="45720" marB="45720" anchor="ctr">
 *   <a:lnL w="12700"><a:solidFill><a:srgbClr val="000000"/></a:solidFill></a:lnL>
 *   <a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>
 * </a:tcPr>
 * ```
 */
function parseTableCellProperties(tcPr: XmlElement | undefined): TableCellProperties {
  if (!tcPr) {
    return {};
  }

  // Parse anchor (vertical alignment)
  const anchor = resolveCellAnchor(getAttr(tcPr, "anchor"));

  // Parse vertical type
  const verticalType = resolveCellVerticalType(getAttr(tcPr, "vert"));

  // Parse horizontal overflow
  const horzOverflow = resolveCellHorzOverflow(getAttr(tcPr, "horzOverflow"));

  return {
    margins: parseCellMargins(tcPr),
    anchor,
    anchorCenter: getBoolAttr(tcPr, "anchorCtr"),
    horzOverflow,
    verticalType,
    fill: parseFillFromParent(tcPr),
    borders: parseCellBorders(tcPr),
    cell3d: parseCell3d(getChild(tcPr, "a:cell3D")),
    headers: parseCellHeaders(tcPr),
    rowSpan: getIntAttr(tcPr, "rowSpan"),
    colSpan: getIntAttr(tcPr, "gridSpan"), // Note: OOXML uses gridSpan for columns
    horizontalMerge: getBoolAttr(tcPr, "hMerge"),
    verticalMerge: getBoolAttr(tcPr, "vMerge"),
  };
}

function resolveCellAnchor(value: string | undefined): CellAnchor | undefined {
  if (value === "t") {return "top";}
  if (value === "ctr") {return "center";}
  if (value === "b") {return "bottom";}
  return undefined;
}

function resolveCellVerticalType(value: string | undefined): CellVerticalType | undefined {
  if (!value) {return undefined;}
  return value as CellVerticalType;
}

function resolveCellHorzOverflow(value: string | undefined): CellHorzOverflow | undefined {
  if (value === "clip") {return "clip";}
  if (value === "overflow") {return "overflow";}
  return undefined;
}

// =============================================================================
// Table Cell Parsing
// =============================================================================

/**
 * Parse table cell (a:tc)
 * @see ECMA-376 Part 1, Section 21.1.3.16
 *
 * ```xml
 * <a:tc>
 *   <a:txBody>
 *     <a:bodyPr/>
 *     <a:lstStyle/>
 *     <a:p>
 *       <a:r><a:t>Cell text</a:t></a:r>
 *     </a:p>
 *   </a:txBody>
 *   <a:tcPr/>
 * </a:tc>
 * ```
 */
function parseTableCell(tc: XmlElement): TableCell {
  const txBody = getChild(tc, "a:txBody");
  const tcPr = getChild(tc, "a:tcPr");

  return {
    id: getAttr(tc, "id"),
    properties: parseTableCellProperties(tcPr),
    textBody: parseTextBody(txBody),
  };
}

// =============================================================================
// Table Row Parsing
// =============================================================================

/**
 * Parse table row (a:tr)
 * @see ECMA-376 Part 1, Section 21.1.3.16
 *
 * ```xml
 * <a:tr h="370840">
 *   <a:tc>...</a:tc>
 *   <a:tc>...</a:tc>
 * </a:tr>
 * ```
 */
function parseTableRow(tr: XmlElement): TableRow {
  const cells: TableCell[] = [];
  for (const tc of getChildren(tr, "a:tc")) {
    cells.push(parseTableCell(tc));
  }

  return {
    height: getEmuAttr(tr, "h") ?? px(0),
    cells,
  };
}

// =============================================================================
// Main Table Parsing
// =============================================================================

/**
 * Parse table element (a:tbl) to Table domain object
 * @see ECMA-376 Part 1, Section 21.1.3.13
 *
 * ```xml
 * <a:tbl>
 *   <a:tblPr firstRow="1" bandRow="1">
 *     <a:tableStyleId>{guid}</a:tableStyleId>
 *   </a:tblPr>
 *   <a:tblGrid>
 *     <a:gridCol w="914400"/>
 *   </a:tblGrid>
 *   <a:tr h="370840">
 *     <a:tc>...</a:tc>
 *   </a:tr>
 * </a:tbl>
 * ```
 */
export function parseTable(tbl: XmlElement | undefined): Table | undefined {
  if (!tbl) {
    return undefined;
  }

  const tblPr = getChild(tbl, "a:tblPr");
  const tblGrid = getChild(tbl, "a:tblGrid");

  const rows: TableRow[] = [];
  for (const tr of getChildren(tbl, "a:tr")) {
    rows.push(parseTableRow(tr));
  }

  return {
    properties: parseTableProperties(tblPr),
    grid: parseTableGrid(tblGrid),
    rows,
  };
}
