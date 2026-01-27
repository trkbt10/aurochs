/**
 * @file DOCX Table Parser
 *
 * Parses table elements from WordprocessingML.
 *
 * @see ECMA-376 Part 1, Section 17.4 (Tables)
 */

import { getAttr, getChild, getChildren, isXmlElement, type XmlElement } from "@oxen/xml";
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
  DocxTablePositioning,
  DocxTableCellSpacing,
  DocxTableLook,
} from "../domain/table";
import type {
  TableWidth,
  TableCellMargins,
  TableAlignment,
  TableCellVerticalAlignment,
  TableLayoutType,
  GridSpan,
  VerticalMerge,
  TableGridColumn,
} from "@oxen/ooxml";
import type { WordBorderStyle } from "@oxen/ooxml/domain/border";
import { gridSpan, px } from "@oxen/ooxml";
import type { DocxThemeColor } from "../domain/run";
import {
  parseTwips,
  parseStyleId,
  parseEighthPoints,
  parseInt32,
  parseBoolean,
  parseToggleChild,
  getChildVal,
} from "./primitive";
import { parseShading } from "./run";
import { parseParagraph } from "./paragraph";
import type { DocxParseContext } from "./context";
import type { DocxParagraph } from "../domain/paragraph";

// =============================================================================
// Constants
// =============================================================================

const TWIPS_TO_PX = 96 / 1440;

// =============================================================================
// Width Parsing
// =============================================================================

/**
 * Parse table width element.
 */
function parseTableWidth(element: XmlElement | undefined): TableWidth | undefined {
  if (!element) {return undefined;}

  const w = parseInt32(getAttr(element, "w"));
  const type = parseWidthType(getAttr(element, "type"));

  if (w === undefined) {return undefined;}

  return {
    value: w,
    type: type ?? "dxa",
  };
}

function parseWidthType(value: string | undefined): "auto" | "dxa" | "nil" | "pct" | undefined {
  switch (value) {
    case "auto":
    case "dxa":
    case "nil":
    case "pct":
      return value;
    default:
      return undefined;
  }
}

// =============================================================================
// Border Parsing
// =============================================================================

function parseBorderStyle(value: string | undefined): WordBorderStyle | undefined {
  switch (value) {
    case "nil":
    case "none":
    case "single":
    case "thick":
    case "double":
    case "dotted":
    case "dashed":
    case "dotDash":
    case "dotDotDash":
    case "triple":
    case "thinThickSmallGap":
    case "thickThinSmallGap":
    case "thinThickThinSmallGap":
    case "thinThickMediumGap":
    case "thickThinMediumGap":
    case "thinThickThinMediumGap":
    case "thinThickLargeGap":
    case "thickThinLargeGap":
    case "thinThickThinLargeGap":
    case "wave":
    case "doubleWave":
    case "dashSmallGap":
    case "dashDotStroked":
    case "threeDEmboss":
    case "threeDEngrave":
    case "outset":
    case "inset":
      return value;
    default:
      return undefined;
  }
}

function parseThemeColor(value: string | undefined): DocxThemeColor | undefined {
  switch (value) {
    case "dark1":
    case "light1":
    case "dark2":
    case "light2":
    case "accent1":
    case "accent2":
    case "accent3":
    case "accent4":
    case "accent5":
    case "accent6":
    case "hyperlink":
    case "followedHyperlink":
    case "background1":
    case "background2":
    case "text1":
    case "text2":
      return value;
    default:
      return undefined;
  }
}

function parseTableBorderEdge(element: XmlElement | undefined): DocxTableBorderEdge | undefined {
  if (!element) {return undefined;}

  const val = parseBorderStyle(getAttr(element, "val"));
  if (!val) {return undefined;}

  return {
    val,
    sz: parseEighthPoints(getAttr(element, "sz")),
    space: parseInt32(getAttr(element, "space")),
    color: getAttr(element, "color") ?? undefined,
    themeColor: parseThemeColor(getAttr(element, "themeColor")),
    shadow: parseBoolean(getAttr(element, "shadow")),
    frame: parseBoolean(getAttr(element, "frame")),
  };
}

function parseTableBorders(element: XmlElement | undefined): DocxTableBorders | undefined {
  if (!element) {return undefined;}

  return {
    top: parseTableBorderEdge(getChild(element, "top")),
    left: parseTableBorderEdge(getChild(element, "left")),
    bottom: parseTableBorderEdge(getChild(element, "bottom")),
    right: parseTableBorderEdge(getChild(element, "right")),
    insideH: parseTableBorderEdge(getChild(element, "insideH")),
    insideV: parseTableBorderEdge(getChild(element, "insideV")),
  };
}

function parseCellBorders(element: XmlElement | undefined): DocxCellBorders | undefined {
  if (!element) {return undefined;}

  return {
    top: parseTableBorderEdge(getChild(element, "top")),
    left: parseTableBorderEdge(getChild(element, "left")),
    bottom: parseTableBorderEdge(getChild(element, "bottom")),
    right: parseTableBorderEdge(getChild(element, "right")),
    insideH: parseTableBorderEdge(getChild(element, "insideH")),
    insideV: parseTableBorderEdge(getChild(element, "insideV")),
    tl2br: parseTableBorderEdge(getChild(element, "tl2br")),
    tr2bl: parseTableBorderEdge(getChild(element, "tr2bl")),
  };
}

// =============================================================================
// Cell Margins Parsing
// =============================================================================

function parseCellMargins(element: XmlElement | undefined): TableCellMargins | undefined {
  if (!element) {return undefined;}

  const top = parseTableWidth(getChild(element, "top"));
  const left = parseTableWidth(getChild(element, "left") ?? getChild(element, "start"));
  const bottom = parseTableWidth(getChild(element, "bottom"));
  const right = parseTableWidth(getChild(element, "right") ?? getChild(element, "end"));

  return {
    top: top ? px(top.value * TWIPS_TO_PX) : undefined,
    left: left ? px(left.value * TWIPS_TO_PX) : undefined,
    bottom: bottom ? px(bottom.value * TWIPS_TO_PX) : undefined,
    right: right ? px(right.value * TWIPS_TO_PX) : undefined,
  };
}

// =============================================================================
// Alignment Parsing
// =============================================================================

function parseTableAlignment(value: string | undefined): TableAlignment | undefined {
  switch (value) {
    case "start":
    case "center":
    case "end":
    case "left":
    case "right":
      return value;
    default:
      return undefined;
  }
}

function parseCellVerticalAlignment(value: string | undefined): TableCellVerticalAlignment | undefined {
  switch (value) {
    case "top":
    case "center":
    case "bottom":
    case "both":
      return value;
    default:
      return undefined;
  }
}

function parseTableLayout(value: string | undefined): TableLayoutType | undefined {
  switch (value) {
    case "fixed":
    case "autofit":
      return value;
    default:
      return undefined;
  }
}

function parseTextDirection(value: string | undefined): "lrTb" | "tbRl" | "btLr" | "lrTbV" | "tbRlV" | "tbLrV" | undefined {
  switch (value) {
    case "lrTb":
    case "tbRl":
    case "btLr":
    case "lrTbV":
    case "tbRlV":
    case "tbLrV":
      return value;
    default:
      return undefined;
  }
}

// =============================================================================
// Table Positioning Parsing
// =============================================================================

function parseTablePositioning(element: XmlElement | undefined): DocxTablePositioning | undefined {
  if (!element) {return undefined;}

  return {
    horzAnchor: parseAnchor(getAttr(element, "horzAnchor")),
    vertAnchor: parseAnchor(getAttr(element, "vertAnchor")),
    tblpX: parseTwips(getAttr(element, "tblpX")),
    tblpXSpec: parseHorizontalAlign(getAttr(element, "tblpXSpec")),
    tblpY: parseTwips(getAttr(element, "tblpY")),
    tblpYSpec: parseVerticalAlign(getAttr(element, "tblpYSpec")),
    leftFromText: parseTwips(getAttr(element, "leftFromText")),
    rightFromText: parseTwips(getAttr(element, "rightFromText")),
    topFromText: parseTwips(getAttr(element, "topFromText")),
    bottomFromText: parseTwips(getAttr(element, "bottomFromText")),
  };
}

function parseAnchor(value: string | undefined): "margin" | "page" | "text" | undefined {
  switch (value) {
    case "margin":
    case "page":
    case "text":
      return value;
    default:
      return undefined;
  }
}

function parseHorizontalAlign(value: string | undefined): "left" | "center" | "right" | "inside" | "outside" | undefined {
  switch (value) {
    case "left":
    case "center":
    case "right":
    case "inside":
    case "outside":
      return value;
    default:
      return undefined;
  }
}

function parseVerticalAlign(value: string | undefined): "top" | "center" | "bottom" | "inside" | "outside" | undefined {
  switch (value) {
    case "top":
    case "center":
    case "bottom":
    case "inside":
    case "outside":
      return value;
    default:
      return undefined;
  }
}

// =============================================================================
// Table Look Parsing
// =============================================================================

function parseTableLook(element: XmlElement | undefined): DocxTableLook | undefined {
  if (!element) {return undefined;}

  return {
    firstRow: parseBoolean(getAttr(element, "firstRow")),
    lastRow: parseBoolean(getAttr(element, "lastRow")),
    firstColumn: parseBoolean(getAttr(element, "firstColumn")),
    lastColumn: parseBoolean(getAttr(element, "lastColumn")),
    noHBand: parseBoolean(getAttr(element, "noHBand")),
    noVBand: parseBoolean(getAttr(element, "noVBand")),
  };
}

// =============================================================================
// Table Properties Parsing
// =============================================================================

/**
 * Parse table properties element.
 *
 * @see ECMA-376 Part 1, Section 17.4.60 (tblPr)
 */
function parseTableProperties(element: XmlElement | undefined): DocxTableProperties | undefined {
  if (!element) {return undefined;}

  return {
    tblStyle: parseStyleId(getChildVal(element, "tblStyle")),
    tblW: parseTableWidth(getChild(element, "tblW")),
    jc: parseTableAlignment(getChildVal(element, "jc")),
    tblInd: parseTableWidth(getChild(element, "tblInd")),
    tblBorders: parseTableBorders(getChild(element, "tblBorders")),
    shd: parseShading(getChild(element, "shd")),
    tblCellMar: parseCellMargins(getChild(element, "tblCellMar")),
    tblCellSpacing: parseTableCellSpacing(getChild(element, "tblCellSpacing")),
    tblLayout: parseTableLayout(getChildVal(element, "tblLayout")),
    tblpPr: parseTablePositioning(getChild(element, "tblpPr")),
    tblLook: parseTableLook(getChild(element, "tblLook")),
    tblCaption: getChildVal(element, "tblCaption"),
    tblDescription: getChildVal(element, "tblDescription"),
    tblOverlap: parseTableOverlap(getChildVal(element, "tblOverlap")),
    bidiVisual: parseToggleChild(element, "bidiVisual"),
  };
}

function parseTableCellSpacing(element: XmlElement | undefined): DocxTableCellSpacing | undefined {
  if (!element) {return undefined;}

  return {
    w: parseInt32(getAttr(element, "w")),
    type: parseWidthType(getAttr(element, "type")),
  };
}

function parseTableOverlap(value: string | undefined): "never" | "overlap" | undefined {
  switch (value) {
    case "never":
    case "overlap":
      return value;
    default:
      return undefined;
  }
}

// =============================================================================
// Table Grid Parsing
// =============================================================================

/**
 * Parse table grid element.
 *
 * @see ECMA-376 Part 1, Section 17.4.49 (tblGrid)
 */
function parseTableGrid(element: XmlElement | undefined): DocxTableGrid | undefined {
  if (!element) {return undefined;}

  const columns: TableGridColumn[] = [];
  for (const gridCol of getChildren(element, "gridCol")) {
    const w = parseTwips(getAttr(gridCol, "w"));
    if (w !== undefined) {
      columns.push({ width: px(w * TWIPS_TO_PX) });
    }
  }

  if (columns.length === 0) {return undefined;}

  return { columns };
}

// =============================================================================
// Row Height Parsing
// =============================================================================

function parseRowHeight(element: XmlElement | undefined): DocxRowHeight | undefined {
  if (!element) {return undefined;}

  const val = parseTwips(getAttr(element, "val"));
  if (val === undefined) {return undefined;}

  return {
    val,
    hRule: parseHeightRule(getAttr(element, "hRule")),
  };
}

function parseHeightRule(value: string | undefined): "auto" | "atLeast" | "exact" | undefined {
  switch (value) {
    case "auto":
    case "atLeast":
    case "exact":
      return value;
    default:
      return undefined;
  }
}

// =============================================================================
// Row Properties Parsing
// =============================================================================

/**
 * Parse table row properties element.
 *
 * @see ECMA-376 Part 1, Section 17.4.82 (trPr)
 */
function parseRowProperties(element: XmlElement | undefined): DocxTableRowProperties | undefined {
  if (!element) {return undefined;}

  return {
    trHeight: parseRowHeight(getChild(element, "trHeight")),
    tblHeader: parseToggleChild(element, "tblHeader"),
    cantSplit: parseToggleChild(element, "cantSplit"),
    jc: parseTableAlignment(getChildVal(element, "jc")),
    hidden: parseToggleChild(element, "hidden"),
    gridBefore: parseInt32(getChildVal(element, "gridBefore")),
    wBefore: parseTableWidth(getChild(element, "wBefore")),
    gridAfter: parseInt32(getChildVal(element, "gridAfter")),
    wAfter: parseTableWidth(getChild(element, "wAfter")),
  };
}

// =============================================================================
// Cell Properties Parsing
// =============================================================================

function parseGridSpan(value: string | undefined): GridSpan | undefined {
  const num = parseInt32(value);
  if (num === undefined || num < 1) {return undefined;}
  return gridSpan(num);
}

function parseVerticalMerge(value: string | undefined): VerticalMerge | undefined {
  if (value === undefined || value === "") {
    return "continue";
  }
  switch (value) {
    case "restart":
    case "continue":
      return value;
    default:
      return undefined;
  }
}

function parseHorizontalMerge(value: string | undefined): "restart" | "continue" | undefined {
  switch (value) {
    case "restart":
    case "continue":
      return value;
    default:
      return undefined;
  }
}

/**
 * Parse table cell properties element.
 *
 * @see ECMA-376 Part 1, Section 17.4.66 (tcPr)
 */
function parseCellProperties(element: XmlElement | undefined): DocxTableCellProperties | undefined {
  if (!element) {return undefined;}

  return {
    tcW: parseTableWidth(getChild(element, "tcW")),
    gridSpan: parseGridSpan(getChildVal(element, "gridSpan")),
    hMerge: parseHorizontalMerge(getChildVal(element, "hMerge")),
    vMerge: getChild(element, "vMerge") ? parseVerticalMerge(getChildVal(element, "vMerge")) : undefined,
    tcBorders: parseCellBorders(getChild(element, "tcBorders")),
    shd: parseShading(getChild(element, "shd")),
    tcMar: parseCellMargins(getChild(element, "tcMar")),
    textDirection: parseTextDirection(getChildVal(element, "textDirection")),
    vAlign: parseCellVerticalAlignment(getChildVal(element, "vAlign")),
    noWrap: parseToggleChild(element, "noWrap"),
    tcFitText: parseToggleChild(element, "tcFitText"),
    hideMark: parseToggleChild(element, "hideMark"),
  };
}

// =============================================================================
// Table Cell Parsing
// =============================================================================

/**
 * Parse table cell element.
 *
 * @see ECMA-376 Part 1, Section 17.4.65 (tc)
 */
function parseTableCell(element: XmlElement, context?: DocxParseContext): DocxTableCell {
  const properties = parseCellProperties(getChild(element, "tcPr"));

  const content: (DocxParagraph | DocxTable)[] = [];
  for (const node of element.children) {
    if (!isXmlElement(node)) {continue;}
    const localName = node.name.split(":").pop() ?? node.name;
    if (localName === "p") {
      content.push(parseParagraph(node, context));
    } else if (localName === "tbl") {
      content.push(parseTable(node, context));
    }
  }

  return {
    type: "tableCell",
    properties,
    content,
  };
}

// =============================================================================
// Table Row Parsing
// =============================================================================

/**
 * Parse table row element.
 *
 * @see ECMA-376 Part 1, Section 17.4.79 (tr)
 */
function parseTableRow(element: XmlElement, context?: DocxParseContext): DocxTableRow {
  const properties = parseRowProperties(getChild(element, "trPr"));

  const cells: DocxTableCell[] = [];
  for (const tc of getChildren(element, "tc")) {
    cells.push(parseTableCell(tc, context));
  }

  return {
    type: "tableRow",
    properties,
    cells,
  };
}

// =============================================================================
// Table Parsing
// =============================================================================

/**
 * Parse table element.
 *
 * @see ECMA-376 Part 1, Section 17.4.38 (tbl)
 */
export function parseTable(element: XmlElement, context?: DocxParseContext): DocxTable {
  const properties = parseTableProperties(getChild(element, "tblPr"));
  const grid = parseTableGrid(getChild(element, "tblGrid"));

  const rows: DocxTableRow[] = [];
  for (const tr of getChildren(element, "tr")) {
    rows.push(parseTableRow(tr, context));
  }

  return {
    type: "table",
    properties,
    grid,
    rows,
  };
}
