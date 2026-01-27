/**
 * @file DOCX Table Serializer
 *
 * Serializes table elements to WordprocessingML XML.
 *
 * @see ECMA-376 Part 1, Section 17.4 (Tables)
 */

import type { XmlElement, XmlNode } from "@oxen/xml";
import { createElement } from "@oxen/xml";
import type {
  DocxTable,
  DocxTableProperties,
  DocxTableGrid,
  DocxTableRow,
  DocxTableRowProperties,
  DocxRowHeight,
  DocxTableCell,
  DocxTableCellProperties,
  DocxTableBorders,
  DocxTableBorderEdge,
  DocxCellBorders,
  DocxTableCellSpacing,
} from "../domain/table";
import type { TableWidth, TableCellMargins } from "@oxen/ooxml/domain/table";
import { serializeParagraph } from "./paragraph";
import { serializeShading } from "./run";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Add a toggle element if the value is true.
 */
function addToggleElement(children: XmlNode[], name: string, value: boolean | undefined): void {
  if (value === true) {
    children.push(createElement(`w:${name}`));
  } else if (value === false) {
    children.push(createElement(`w:${name}`, { "w:val": "0" }));
  }
}

/**
 * Add a val element if the value is defined.
 */
function addValElement(children: XmlNode[], name: string, value: string | number | undefined): void {
  if (value !== undefined) {
    children.push(createElement(`w:${name}`, { "w:val": String(value) }));
  }
}

// =============================================================================
// Width Serialization
// =============================================================================

/**
 * Serialize table width element.
 *
 * @see ECMA-376 Part 1, Section 17.4.88 (tblW)
 */
export function serializeTableWidth(width: TableWidth, elementName: string): XmlElement {
  const attrs: Record<string, string> = {};

  if (width.value !== undefined) {attrs["w:w"] = String(width.value);}
  if (width.type) {attrs["w:type"] = width.type;}

  return createElement(`w:${elementName}`, attrs);
}

/**
 * Serialize table cell spacing element.
 *
 * @see ECMA-376 Part 1, Section 17.4.44 (tblCellSpacing)
 */
export function serializeTableCellSpacing(spacing: DocxTableCellSpacing, elementName: string): XmlElement {
  const attrs: Record<string, string> = {};

  if (spacing.w !== undefined) {attrs["w:w"] = String(spacing.w);}
  if (spacing.type) {attrs["w:type"] = spacing.type;}

  return createElement(`w:${elementName}`, attrs);
}

// =============================================================================
// Border Serialization
// =============================================================================

/**
 * Serialize a table border edge element.
 */
function serializeBorderEdge(border: DocxTableBorderEdge, name: string): XmlElement {
  const attrs: Record<string, string> = {};

  if (border.val) {attrs["w:val"] = border.val;}
  if (border.sz !== undefined) {attrs["w:sz"] = String(border.sz);}
  if (border.space !== undefined) {attrs["w:space"] = String(border.space);}
  if (border.color) {attrs["w:color"] = border.color;}
  if (border.themeColor) {attrs["w:themeColor"] = border.themeColor;}
  if (border.shadow !== undefined) {attrs["w:shadow"] = border.shadow ? "1" : "0";}
  if (border.frame !== undefined) {attrs["w:frame"] = border.frame ? "1" : "0";}

  return createElement(`w:${name}`, attrs);
}

/**
 * Serialize table borders element.
 *
 * @see ECMA-376 Part 1, Section 17.4.39 (tblBorders)
 */
export function serializeTableBorders(borders: DocxTableBorders): XmlElement {
  const children: XmlNode[] = [];

  if (borders.top) {children.push(serializeBorderEdge(borders.top, "top"));}
  if (borders.left) {children.push(serializeBorderEdge(borders.left, "left"));}
  if (borders.bottom) {children.push(serializeBorderEdge(borders.bottom, "bottom"));}
  if (borders.right) {children.push(serializeBorderEdge(borders.right, "right"));}
  if (borders.insideH) {children.push(serializeBorderEdge(borders.insideH, "insideH"));}
  if (borders.insideV) {children.push(serializeBorderEdge(borders.insideV, "insideV"));}

  return createElement("w:tblBorders", {}, children);
}

// =============================================================================
// Cell Margin Serialization
// =============================================================================

/**
 * Serialize table cell margins element.
 *
 * @see ECMA-376 Part 1, Section 17.4.43 (tblCellMar)
 */
export function serializeTableCellMargins(margins: TableCellMargins, elementName: string): XmlElement {
  const children: XmlNode[] = [];

  if (margins.top !== undefined) {
    children.push(createElement("w:top", { "w:w": String(margins.top), "w:type": "dxa" }));
  }
  if (margins.left !== undefined) {
    children.push(createElement("w:left", { "w:w": String(margins.left), "w:type": "dxa" }));
  }
  if (margins.bottom !== undefined) {
    children.push(createElement("w:bottom", { "w:w": String(margins.bottom), "w:type": "dxa" }));
  }
  if (margins.right !== undefined) {
    children.push(createElement("w:right", { "w:w": String(margins.right), "w:type": "dxa" }));
  }

  return createElement(`w:${elementName}`, {}, children);
}

// =============================================================================
// Table Properties Serialization
// =============================================================================

/**
 * Serialize table properties element.
 *
 * @see ECMA-376 Part 1, Section 17.4.60 (tblPr)
 */
export function serializeTableProperties(props: DocxTableProperties | undefined): XmlElement | undefined {
  if (!props) {return undefined;}

  const children: XmlNode[] = [];

  // Table style
  addValElement(children, "tblStyle", props.tblStyle);

  // Table position
  if (props.tblpPr) {
    const tblpPrAttrs: Record<string, string> = {};
    if (props.tblpPr.leftFromText !== undefined) {tblpPrAttrs["w:leftFromText"] = String(props.tblpPr.leftFromText);}
    if (props.tblpPr.rightFromText !== undefined) {tblpPrAttrs["w:rightFromText"] = String(props.tblpPr.rightFromText);}
    if (props.tblpPr.topFromText !== undefined) {tblpPrAttrs["w:topFromText"] = String(props.tblpPr.topFromText);}
    if (props.tblpPr.bottomFromText !== undefined) {tblpPrAttrs["w:bottomFromText"] = String(props.tblpPr.bottomFromText);}
    if (props.tblpPr.vertAnchor) {tblpPrAttrs["w:vertAnchor"] = props.tblpPr.vertAnchor;}
    if (props.tblpPr.horzAnchor) {tblpPrAttrs["w:horzAnchor"] = props.tblpPr.horzAnchor;}
    if (props.tblpPr.tblpX !== undefined) {tblpPrAttrs["w:tblpX"] = String(props.tblpPr.tblpX);}
    if (props.tblpPr.tblpXSpec) {tblpPrAttrs["w:tblpXSpec"] = props.tblpPr.tblpXSpec;}
    if (props.tblpPr.tblpY !== undefined) {tblpPrAttrs["w:tblpY"] = String(props.tblpPr.tblpY);}
    if (props.tblpPr.tblpYSpec) {tblpPrAttrs["w:tblpYSpec"] = props.tblpPr.tblpYSpec;}
    children.push(createElement("w:tblpPr", tblpPrAttrs));
  }

  // Bidi visual
  addToggleElement(children, "bidiVisual", props.bidiVisual);

  // Table overlap
  addValElement(children, "tblOverlap", props.tblOverlap);

  // Table width
  if (props.tblW) {children.push(serializeTableWidth(props.tblW, "tblW"));}

  // Table justification
  addValElement(children, "jc", props.jc);

  // Cell spacing
  if (props.tblCellSpacing) {children.push(serializeTableCellSpacing(props.tblCellSpacing, "tblCellSpacing"));}

  // Table indent
  if (props.tblInd) {children.push(serializeTableWidth(props.tblInd, "tblInd"));}

  // Table borders
  if (props.tblBorders) {children.push(serializeTableBorders(props.tblBorders));}

  // Shading
  if (props.shd) {children.push(serializeShading(props.shd, "w:shd"));}

  // Table layout
  if (props.tblLayout) {
    children.push(createElement("w:tblLayout", { "w:type": props.tblLayout }));
  }

  // Cell margins
  if (props.tblCellMar) {children.push(serializeTableCellMargins(props.tblCellMar, "tblCellMar"));}

  // Table look
  if (props.tblLook) {
    const lookAttrs: Record<string, string> = {};
    if (props.tblLook.firstRow !== undefined) {lookAttrs["w:firstRow"] = props.tblLook.firstRow ? "1" : "0";}
    if (props.tblLook.lastRow !== undefined) {lookAttrs["w:lastRow"] = props.tblLook.lastRow ? "1" : "0";}
    if (props.tblLook.firstColumn !== undefined) {lookAttrs["w:firstColumn"] = props.tblLook.firstColumn ? "1" : "0";}
    if (props.tblLook.lastColumn !== undefined) {lookAttrs["w:lastColumn"] = props.tblLook.lastColumn ? "1" : "0";}
    if (props.tblLook.noHBand !== undefined) {lookAttrs["w:noHBand"] = props.tblLook.noHBand ? "1" : "0";}
    if (props.tblLook.noVBand !== undefined) {lookAttrs["w:noVBand"] = props.tblLook.noVBand ? "1" : "0";}
    children.push(createElement("w:tblLook", lookAttrs));
  }

  // Table caption
  addValElement(children, "tblCaption", props.tblCaption);

  // Table description
  addValElement(children, "tblDescription", props.tblDescription);

  if (children.length === 0) {return undefined;}

  return createElement("w:tblPr", {}, children);
}

// =============================================================================
// Table Grid Serialization
// =============================================================================

/**
 * Serialize table grid element.
 *
 * @see ECMA-376 Part 1, Section 17.4.49 (tblGrid)
 */
export function serializeTableGrid(grid: DocxTableGrid): XmlElement {
  const children = grid.columns.map((col) =>
    createElement("w:gridCol", { "w:w": String(col.width) }),
  );
  return createElement("w:tblGrid", {}, children);
}

// =============================================================================
// Row Properties Serialization
// =============================================================================

/**
 * Serialize row height element.
 */
function serializeRowHeight(height: DocxRowHeight): XmlElement {
  const attrs: Record<string, string> = {};

  if (height.val !== undefined) {attrs["w:val"] = String(height.val);}
  if (height.hRule) {attrs["w:hRule"] = height.hRule;}

  return createElement("w:trHeight", attrs);
}

/**
 * Serialize table row properties element.
 *
 * @see ECMA-376 Part 1, Section 17.4.82 (trPr)
 */
export function serializeTableRowProperties(props: DocxTableRowProperties | undefined): XmlElement | undefined {
  if (!props) {return undefined;}

  const children: XmlNode[] = [];

  // Grid before
  if (props.gridBefore !== undefined) {
    children.push(createElement("w:gridBefore", { "w:val": String(props.gridBefore) }));
  }

  // Grid after
  if (props.gridAfter !== undefined) {
    children.push(createElement("w:gridAfter", { "w:val": String(props.gridAfter) }));
  }

  // Width before
  if (props.wBefore) {children.push(serializeTableWidth(props.wBefore, "wBefore"));}

  // Width after
  if (props.wAfter) {children.push(serializeTableWidth(props.wAfter, "wAfter"));}

  // Row height
  if (props.trHeight) {children.push(serializeRowHeight(props.trHeight));}

  // Table header
  addToggleElement(children, "tblHeader", props.tblHeader);

  // Justification
  addValElement(children, "jc", props.jc);

  // Hidden
  addToggleElement(children, "hidden", props.hidden);

  // Can't split
  addToggleElement(children, "cantSplit", props.cantSplit);

  if (children.length === 0) {return undefined;}

  return createElement("w:trPr", {}, children);
}

// =============================================================================
// Cell Properties Serialization
// =============================================================================

/**
 * Serialize table cell borders element.
 *
 * @see ECMA-376 Part 1, Section 17.4.67 (tcBorders)
 */
export function serializeTableCellBorders(borders: DocxCellBorders): XmlElement {
  const children: XmlNode[] = [];

  if (borders.top) {children.push(serializeBorderEdge(borders.top, "top"));}
  if (borders.left) {children.push(serializeBorderEdge(borders.left, "left"));}
  if (borders.bottom) {children.push(serializeBorderEdge(borders.bottom, "bottom"));}
  if (borders.right) {children.push(serializeBorderEdge(borders.right, "right"));}
  if (borders.insideH) {children.push(serializeBorderEdge(borders.insideH, "insideH"));}
  if (borders.insideV) {children.push(serializeBorderEdge(borders.insideV, "insideV"));}
  if (borders.tl2br) {children.push(serializeBorderEdge(borders.tl2br, "tl2br"));}
  if (borders.tr2bl) {children.push(serializeBorderEdge(borders.tr2bl, "tr2bl"));}

  return createElement("w:tcBorders", {}, children);
}

/**
 * Serialize table cell properties element.
 *
 * @see ECMA-376 Part 1, Section 17.4.70 (tcPr)
 */
export function serializeTableCellProperties(props: DocxTableCellProperties | undefined): XmlElement | undefined {
  if (!props) {return undefined;}

  const children: XmlNode[] = [];

  // Cell width
  if (props.tcW) {
    children.push(createElement("w:tcW", {
      "w:w": String(props.tcW.value),
      "w:type": props.tcW.type,
    }));
  }

  // Grid span
  if (props.gridSpan !== undefined) {
    children.push(createElement("w:gridSpan", { "w:val": String(props.gridSpan) }));
  }

  // Horizontal merge
  addValElement(children, "hMerge", props.hMerge);

  // Vertical merge
  addValElement(children, "vMerge", props.vMerge);

  // Cell borders
  if (props.tcBorders) {children.push(serializeTableCellBorders(props.tcBorders));}

  // Shading
  if (props.shd) {children.push(serializeShading(props.shd, "w:shd"));}

  // No wrap
  addToggleElement(children, "noWrap", props.noWrap);

  // Cell margins
  if (props.tcMar) {children.push(serializeTableCellMargins(props.tcMar, "tcMar"));}

  // Text direction
  addValElement(children, "textDirection", props.textDirection);

  // Fit text
  addToggleElement(children, "tcFitText", props.tcFitText);

  // Vertical alignment
  addValElement(children, "vAlign", props.vAlign);

  // Hide mark
  addToggleElement(children, "hideMark", props.hideMark);

  if (children.length === 0) {return undefined;}

  return createElement("w:tcPr", {}, children);
}

// =============================================================================
// Table Cell Serialization
// =============================================================================

/**
 * Serialize a table cell element.
 *
 * @see ECMA-376 Part 1, Section 17.4.65 (tc)
 */
export function serializeTableCell(cell: DocxTableCell): XmlElement {
  const children: XmlNode[] = [];

  // Cell properties
  const tcPr = serializeTableCellProperties(cell.properties);
  if (tcPr) {children.push(tcPr);}

  // Cell content (paragraphs and nested tables)
  for (const content of cell.content) {
    if (content.type === "paragraph") {
      children.push(serializeParagraph(content));
    } else if (content.type === "table") {
      children.push(serializeTable(content));
    }
  }

  return createElement("w:tc", {}, children);
}

// =============================================================================
// Table Row Serialization
// =============================================================================

/**
 * Serialize a table row element.
 *
 * @see ECMA-376 Part 1, Section 17.4.79 (tr)
 */
export function serializeTableRow(row: DocxTableRow): XmlElement {
  const children: XmlNode[] = [];

  // Row properties
  const trPr = serializeTableRowProperties(row.properties);
  if (trPr) {children.push(trPr);}

  // Row cells
  for (const cell of row.cells) {
    children.push(serializeTableCell(cell));
  }

  return createElement("w:tr", {}, children);
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
  const children: XmlNode[] = [];

  // Table properties
  const tblPr = serializeTableProperties(table.properties);
  if (tblPr) {children.push(tblPr);}

  // Table grid
  if (table.grid) {children.push(serializeTableGrid(table.grid));}

  // Table rows
  for (const row of table.rows) {
    children.push(serializeTableRow(row));
  }

  return createElement("w:tbl", {}, children);
}
