/**
 * @file DOCX Table Serializer
 *
 * Serializes table elements to WordprocessingML XML.
 *
 * @see ECMA-376 Part 1, Section 17.4 (Tables)
 */

import type { XmlElement, XmlNode } from "@aurochs/xml";
import type {
  DocxTable,
  DocxTableProperties,
  DocxTableGrid,
  DocxTableRow,
  DocxTableRowProperties,
  DocxTableCell,
  DocxTableCellProperties,
  DocxTableBorders,
  DocxTableBorderEdge,
  DocxCellBorders,
  DocxTableCellSpacing,
} from "../domain/table";
import type { TableWidth, TableCellMargins } from "@aurochs-office/ooxml/domain/table";
import { wEl, optAttr, toggleEl, optValEl, children } from "./primitive";
import { serializeParagraph } from "./paragraph";
import { serializeShading } from "./run";

// =============================================================================
// Width Serialization
// =============================================================================

function serializeTableWidth(width: TableWidth, elementName: string): XmlElement {
  const attrs: Record<string, string> = {};
  optAttr(attrs, "w", width.value);
  optAttr(attrs, "type", width.type);
  return wEl(elementName, attrs);
}

// =============================================================================
// Border Serialization
// =============================================================================

function serializeBorderEdge(border: DocxTableBorderEdge, name: string): XmlElement {
  const attrs: Record<string, string> = {};
  optAttr(attrs, "val", border.val);
  optAttr(attrs, "sz", border.sz);
  optAttr(attrs, "space", border.space);
  optAttr(attrs, "color", border.color);
  optAttr(attrs, "themeColor", border.themeColor);
  optAttr(attrs, "shadow", border.shadow);
  optAttr(attrs, "frame", border.frame);
  return wEl(name, attrs);
}

function serializeTableBorders(borders: DocxTableBorders): XmlElement {
  return wEl(
    "tblBorders",
    {},
    children(
      borders.top ? serializeBorderEdge(borders.top, "top") : undefined,
      borders.left ? serializeBorderEdge(borders.left, "left") : undefined,
      borders.bottom ? serializeBorderEdge(borders.bottom, "bottom") : undefined,
      borders.right ? serializeBorderEdge(borders.right, "right") : undefined,
      borders.insideH ? serializeBorderEdge(borders.insideH, "insideH") : undefined,
      borders.insideV ? serializeBorderEdge(borders.insideV, "insideV") : undefined,
    ),
  );
}

function serializeCellBorders(borders: DocxCellBorders): XmlElement {
  return wEl(
    "tcBorders",
    {},
    children(
      borders.top ? serializeBorderEdge(borders.top, "top") : undefined,
      borders.left ? serializeBorderEdge(borders.left, "left") : undefined,
      borders.bottom ? serializeBorderEdge(borders.bottom, "bottom") : undefined,
      borders.right ? serializeBorderEdge(borders.right, "right") : undefined,
      borders.insideH ? serializeBorderEdge(borders.insideH, "insideH") : undefined,
      borders.insideV ? serializeBorderEdge(borders.insideV, "insideV") : undefined,
      borders.tl2br ? serializeBorderEdge(borders.tl2br, "tl2br") : undefined,
      borders.tr2bl ? serializeBorderEdge(borders.tr2bl, "tr2bl") : undefined,
    ),
  );
}

// =============================================================================
// Cell Margin Serialization
// =============================================================================

function serializeCellMargins(margins: TableCellMargins, elementName: string): XmlElement {
  return wEl(
    elementName,
    {},
    children(
      margins.top !== undefined ? wEl("top", { w: String(margins.top), type: "dxa" }) : undefined,
      margins.left !== undefined ? wEl("left", { w: String(margins.left), type: "dxa" }) : undefined,
      margins.bottom !== undefined ? wEl("bottom", { w: String(margins.bottom), type: "dxa" }) : undefined,
      margins.right !== undefined ? wEl("right", { w: String(margins.right), type: "dxa" }) : undefined,
    ),
  );
}

// =============================================================================
// Table Properties Serialization
// =============================================================================

function serializeTableProperties(props: DocxTableProperties | undefined): XmlElement | undefined {
  if (!props) {return undefined;}

  const ch: XmlNode[] = [];

  if (props.tblStyle) {ch.push(wEl("tblStyle", { val: String(props.tblStyle) }));}

  if (props.tblpPr) {
    const attrs: Record<string, string> = {};
    optAttr(attrs, "leftFromText", props.tblpPr.leftFromText);
    optAttr(attrs, "rightFromText", props.tblpPr.rightFromText);
    optAttr(attrs, "topFromText", props.tblpPr.topFromText);
    optAttr(attrs, "bottomFromText", props.tblpPr.bottomFromText);
    optAttr(attrs, "vertAnchor", props.tblpPr.vertAnchor);
    optAttr(attrs, "horzAnchor", props.tblpPr.horzAnchor);
    optAttr(attrs, "tblpX", props.tblpPr.tblpX);
    optAttr(attrs, "tblpXSpec", props.tblpPr.tblpXSpec);
    optAttr(attrs, "tblpY", props.tblpPr.tblpY);
    optAttr(attrs, "tblpYSpec", props.tblpPr.tblpYSpec);
    ch.push(wEl("tblpPr", attrs));
  }

  const bidiVisual = toggleEl("bidiVisual", props.bidiVisual);
  if (bidiVisual) {ch.push(bidiVisual);}

  const tblOverlap = optValEl("tblOverlap", props.tblOverlap);
  if (tblOverlap) {ch.push(tblOverlap);}

  if (props.tblW) {ch.push(serializeTableWidth(props.tblW, "tblW"));}

  const jc = optValEl("jc", props.jc);
  if (jc) {ch.push(jc);}

  if (props.tblCellSpacing) {ch.push(serializeCellSpacing(props.tblCellSpacing, "tblCellSpacing"));}
  if (props.tblInd) {ch.push(serializeTableWidth(props.tblInd, "tblInd"));}
  if (props.tblBorders) {ch.push(serializeTableBorders(props.tblBorders));}

  const shd = serializeShading(props.shd);
  if (shd) {ch.push(shd);}

  if (props.tblLayout) {ch.push(wEl("tblLayout", { type: props.tblLayout }));}
  if (props.tblCellMar) {ch.push(serializeCellMargins(props.tblCellMar, "tblCellMar"));}

  if (props.tblLook) {
    const lookAttrs: Record<string, string> = {};
    optAttr(lookAttrs, "firstRow", props.tblLook.firstRow);
    optAttr(lookAttrs, "lastRow", props.tblLook.lastRow);
    optAttr(lookAttrs, "firstColumn", props.tblLook.firstColumn);
    optAttr(lookAttrs, "lastColumn", props.tblLook.lastColumn);
    optAttr(lookAttrs, "noHBand", props.tblLook.noHBand);
    optAttr(lookAttrs, "noVBand", props.tblLook.noVBand);
    ch.push(wEl("tblLook", lookAttrs));
  }

  const tblCaption = optValEl("tblCaption", props.tblCaption);
  if (tblCaption) {ch.push(tblCaption);}
  const tblDescription = optValEl("tblDescription", props.tblDescription);
  if (tblDescription) {ch.push(tblDescription);}

  return ch.length > 0 ? wEl("tblPr", {}, ch) : undefined;
}

// =============================================================================
// Cell Spacing Serialization
// =============================================================================

function serializeCellSpacing(spacing: DocxTableCellSpacing, elementName: string): XmlElement {
  const attrs: Record<string, string> = {};
  optAttr(attrs, "w", spacing.w);
  optAttr(attrs, "type", spacing.type);
  return wEl(elementName, attrs);
}

// =============================================================================
// Table Grid Serialization
// =============================================================================

function serializeTableGrid(grid: DocxTableGrid): XmlElement {
  const cols = grid.columns.map((col) => wEl("gridCol", { w: String(col.width) }));
  return wEl("tblGrid", {}, cols);
}

// =============================================================================
// Row Properties Serialization
// =============================================================================

function serializeTableRowProperties(props: DocxTableRowProperties | undefined): XmlElement | undefined {
  if (!props) {return undefined;}

  const ch: XmlNode[] = [];

  if (props.gridBefore !== undefined) {ch.push(wEl("gridBefore", { val: String(props.gridBefore) }));}
  if (props.gridAfter !== undefined) {ch.push(wEl("gridAfter", { val: String(props.gridAfter) }));}
  if (props.wBefore) {ch.push(serializeTableWidth(props.wBefore, "wBefore"));}
  if (props.wAfter) {ch.push(serializeTableWidth(props.wAfter, "wAfter"));}
  if (props.trHeight) {
    const attrs: Record<string, string> = {};
    optAttr(attrs, "val", props.trHeight.val);
    optAttr(attrs, "hRule", props.trHeight.hRule);
    ch.push(wEl("trHeight", attrs));
  }

  const tblHeader = toggleEl("tblHeader", props.tblHeader);
  if (tblHeader) {ch.push(tblHeader);}
  const jc = optValEl("jc", props.jc);
  if (jc) {ch.push(jc);}
  const hidden = toggleEl("hidden", props.hidden);
  if (hidden) {ch.push(hidden);}
  const cantSplit = toggleEl("cantSplit", props.cantSplit);
  if (cantSplit) {ch.push(cantSplit);}

  return ch.length > 0 ? wEl("trPr", {}, ch) : undefined;
}

// =============================================================================
// Cell Properties Serialization
// =============================================================================

function serializeTableCellProperties(props: DocxTableCellProperties | undefined): XmlElement | undefined {
  if (!props) {return undefined;}

  const ch: XmlNode[] = [];

  if (props.tcW) {
    const attrs: Record<string, string> = {};
    optAttr(attrs, "w", props.tcW.value);
    optAttr(attrs, "type", props.tcW.type);
    ch.push(wEl("tcW", attrs));
  }

  if (props.gridSpan !== undefined) {ch.push(wEl("gridSpan", { val: String(props.gridSpan) }));}
  const hMerge = optValEl("hMerge", props.hMerge);
  if (hMerge) {ch.push(hMerge);}
  const vMerge = optValEl("vMerge", props.vMerge);
  if (vMerge) {ch.push(vMerge);}
  if (props.tcBorders) {ch.push(serializeCellBorders(props.tcBorders));}

  const shd = serializeShading(props.shd);
  if (shd) {ch.push(shd);}

  const noWrap = toggleEl("noWrap", props.noWrap);
  if (noWrap) {ch.push(noWrap);}
  if (props.tcMar) {ch.push(serializeCellMargins(props.tcMar, "tcMar"));}
  const textDirection = optValEl("textDirection", props.textDirection);
  if (textDirection) {ch.push(textDirection);}
  const tcFitText = toggleEl("tcFitText", props.tcFitText);
  if (tcFitText) {ch.push(tcFitText);}
  const vAlign = optValEl("vAlign", props.vAlign);
  if (vAlign) {ch.push(vAlign);}
  const hideMark = toggleEl("hideMark", props.hideMark);
  if (hideMark) {ch.push(hideMark);}

  return ch.length > 0 ? wEl("tcPr", {}, ch) : undefined;
}

// =============================================================================
// Table Cell Serialization
// =============================================================================

function serializeTableCell(cell: DocxTableCell): XmlElement {
  const ch: XmlNode[] = [];

  const tcPr = serializeTableCellProperties(cell.properties);
  if (tcPr) {ch.push(tcPr);}

  for (const content of cell.content) {
    if (content.type === "paragraph") {
      ch.push(serializeParagraph(content));
    } else if (content.type === "table") {
      ch.push(serializeTable(content));
    }
  }

  return wEl("tc", {}, ch);
}

// =============================================================================
// Table Row Serialization
// =============================================================================

function serializeTableRow(row: DocxTableRow): XmlElement {
  const ch: XmlNode[] = [];

  const trPr = serializeTableRowProperties(row.properties);
  if (trPr) {ch.push(trPr);}

  for (const cell of row.cells) {
    ch.push(serializeTableCell(cell));
  }

  return wEl("tr", {}, ch);
}

// =============================================================================
// Table Serialization
// =============================================================================

/**
 * Serialize a table element.
 *
 * @see ECMA-376 Part 1, Section 17.4.37 (tbl)
 */
export function serializeTable(table: DocxTable): XmlElement {
  const ch: XmlNode[] = [];

  const tblPr = serializeTableProperties(table.properties);
  if (tblPr) {ch.push(tblPr);}

  if (table.grid) {ch.push(serializeTableGrid(table.grid));}

  for (const row of table.rows) {
    ch.push(serializeTableRow(row));
  }

  return wEl("tbl", {}, ch);
}
