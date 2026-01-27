/**
 * @file DOCX Section Parser
 *
 * Parses section properties from WordprocessingML.
 *
 * @see ECMA-376 Part 1, Section 17.6 (Sections)
 */

import { getAttr, getChild, getChildren, type XmlElement } from "@oxen/xml";
import type {
  DocxSectionProperties,
  DocxPageSize,
  DocxPageMargins,
  DocxPageBorders,
  DocxPageBorderEdge,
  DocxColumns,
  DocxColumn,
  DocxHeaderFooterRef,
  DocxLineNumbering,
  DocxPageNumberType,
  DocxPageNumberFormat,
  DocxDocGrid,
  DocxDocGridType,
  DocxVerticalJc,
  DocxNotePr,
} from "../domain/section";
import type { SectionBreakType, HeaderFooterType } from "../domain/types";
import { parseTwips, parseRelId, parseInt32, parseBoolean, getChildVal, getChildIntVal } from "./primitive";

// =============================================================================
// Page Size Parsing
// =============================================================================

/**
 * Parse page size element.
 *
 * @see ECMA-376 Part 1, Section 17.6.13 (pgSz)
 */
function parsePageSize(element: XmlElement | undefined): DocxPageSize | undefined {
  if (!element) {return undefined;}

  const w = parseTwips(getAttr(element, "w"));
  const h = parseTwips(getAttr(element, "h"));

  if (w === undefined || h === undefined) {return undefined;}

  return {
    w,
    h,
    orient: parseOrientation(getAttr(element, "orient")),
    code: parseInt32(getAttr(element, "code")),
  };
}

function parseOrientation(value: string | undefined): "portrait" | "landscape" | undefined {
  switch (value) {
    case "portrait":
    case "landscape":
      return value;
    default:
      return undefined;
  }
}

// =============================================================================
// Page Margins Parsing
// =============================================================================

/**
 * Parse page margins element.
 *
 * @see ECMA-376 Part 1, Section 17.6.11 (pgMar)
 */
function parsePageMargins(element: XmlElement | undefined): DocxPageMargins | undefined {
  if (!element) {return undefined;}

  const top = parseTwips(getAttr(element, "top"));
  const right = parseTwips(getAttr(element, "right"));
  const bottom = parseTwips(getAttr(element, "bottom"));
  const left = parseTwips(getAttr(element, "left"));

  if (top === undefined || right === undefined || bottom === undefined || left === undefined) {
    return undefined;
  }

  return {
    top,
    right,
    bottom,
    left,
    header: parseTwips(getAttr(element, "header")),
    footer: parseTwips(getAttr(element, "footer")),
    gutter: parseTwips(getAttr(element, "gutter")),
  };
}

// =============================================================================
// Page Borders Parsing
// =============================================================================

function parsePageBorderEdge(element: XmlElement | undefined): DocxPageBorderEdge | undefined {
  if (!element) {return undefined;}

  const val = getAttr(element, "val");
  if (!val) {return undefined;}

  return {
    val,
    sz: parseInt32(getAttr(element, "sz")),
    space: parseInt32(getAttr(element, "space")),
    color: getAttr(element, "color") ?? undefined,
    themeColor: getAttr(element, "themeColor") ?? undefined,
    shadow: parseBoolean(getAttr(element, "shadow")),
    frame: parseBoolean(getAttr(element, "frame")),
  };
}

/**
 * Parse page borders element.
 *
 * @see ECMA-376 Part 1, Section 17.6.10 (pgBorders)
 */
function parsePageBorders(element: XmlElement | undefined): DocxPageBorders | undefined {
  if (!element) {return undefined;}

  return {
    display: parseDisplayOption(getAttr(element, "display")),
    offsetFrom: parseOffsetFrom(getAttr(element, "offsetFrom")),
    zOrder: parseZOrder(getAttr(element, "zOrder")),
    top: parsePageBorderEdge(getChild(element, "top")),
    left: parsePageBorderEdge(getChild(element, "left")),
    bottom: parsePageBorderEdge(getChild(element, "bottom")),
    right: parsePageBorderEdge(getChild(element, "right")),
  };
}

function parseDisplayOption(value: string | undefined): "allPages" | "firstPage" | "notFirstPage" | undefined {
  switch (value) {
    case "allPages":
    case "firstPage":
    case "notFirstPage":
      return value;
    default:
      return undefined;
  }
}

function parseOffsetFrom(value: string | undefined): "page" | "text" | undefined {
  switch (value) {
    case "page":
    case "text":
      return value;
    default:
      return undefined;
  }
}

function parseZOrder(value: string | undefined): "front" | "back" | undefined {
  switch (value) {
    case "front":
    case "back":
      return value;
    default:
      return undefined;
  }
}

// =============================================================================
// Columns Parsing
// =============================================================================

function parseColumn(element: XmlElement): DocxColumn {
  return {
    w: parseTwips(getAttr(element, "w")),
    space: parseTwips(getAttr(element, "space")),
  };
}

/**
 * Parse columns element.
 *
 * @see ECMA-376 Part 1, Section 17.6.4 (cols)
 */
function parseColumns(element: XmlElement | undefined): DocxColumns | undefined {
  if (!element) {return undefined;}

  const col: DocxColumn[] = [];
  for (const c of getChildren(element, "col")) {
    col.push(parseColumn(c));
  }

  return {
    num: parseInt32(getAttr(element, "num")),
    equalWidth: parseBoolean(getAttr(element, "equalWidth")),
    space: parseTwips(getAttr(element, "space")),
    sep: parseBoolean(getAttr(element, "sep")),
    col: col.length > 0 ? col : undefined,
  };
}

// =============================================================================
// Header/Footer References Parsing
// =============================================================================

function parseHeaderFooterType(value: string | undefined): HeaderFooterType | undefined {
  switch (value) {
    case "default":
    case "first":
    case "even":
      return value;
    default:
      return undefined;
  }
}

function parseHeaderFooterRef(element: XmlElement): DocxHeaderFooterRef | undefined {
  const type = parseHeaderFooterType(getAttr(element, "type"));
  const rId = parseRelId(getAttr(element, "r:id"));

  if (!type || !rId) {return undefined;}

  return { type, rId };
}

function parseHeaderReferences(element: XmlElement): readonly DocxHeaderFooterRef[] | undefined {
  const refs: DocxHeaderFooterRef[] = [];
  for (const ref of getChildren(element, "headerReference")) {
    const parsed = parseHeaderFooterRef(ref);
    if (parsed) {
      refs.push(parsed);
    }
  }
  return refs.length > 0 ? refs : undefined;
}

function parseFooterReferences(element: XmlElement): readonly DocxHeaderFooterRef[] | undefined {
  const refs: DocxHeaderFooterRef[] = [];
  for (const ref of getChildren(element, "footerReference")) {
    const parsed = parseHeaderFooterRef(ref);
    if (parsed) {
      refs.push(parsed);
    }
  }
  return refs.length > 0 ? refs : undefined;
}

// =============================================================================
// Line Numbering Parsing
// =============================================================================

/**
 * Parse line numbering element.
 *
 * @see ECMA-376 Part 1, Section 17.6.8 (lnNumType)
 */
function parseLineNumbering(element: XmlElement | undefined): DocxLineNumbering | undefined {
  if (!element) {return undefined;}

  return {
    countBy: parseInt32(getAttr(element, "countBy")),
    start: parseInt32(getAttr(element, "start")),
    restart: parseLineNumberRestart(getAttr(element, "restart")),
    distance: parseTwips(getAttr(element, "distance")),
  };
}

function parseLineNumberRestart(value: string | undefined): "continuous" | "newPage" | "newSection" | undefined {
  switch (value) {
    case "continuous":
    case "newPage":
    case "newSection":
      return value;
    default:
      return undefined;
  }
}

// =============================================================================
// Page Numbering Parsing
// =============================================================================

function parsePageNumberFormat(value: string | undefined): DocxPageNumberFormat | undefined {
  switch (value) {
    case "decimal":
    case "upperRoman":
    case "lowerRoman":
    case "upperLetter":
    case "lowerLetter":
    case "ordinal":
    case "cardinalText":
    case "ordinalText":
    case "none":
      return value;
    default:
      return undefined;
  }
}

function parseChapSep(value: string | undefined): "colon" | "period" | "hyphen" | "emDash" | "enDash" | undefined {
  switch (value) {
    case "colon":
    case "period":
    case "hyphen":
    case "emDash":
    case "enDash":
      return value;
    default:
      return undefined;
  }
}

/**
 * Parse page number type element.
 *
 * @see ECMA-376 Part 1, Section 17.6.12 (pgNumType)
 */
function parsePageNumberType(element: XmlElement | undefined): DocxPageNumberType | undefined {
  if (!element) {return undefined;}

  return {
    fmt: parsePageNumberFormat(getAttr(element, "fmt")),
    start: parseInt32(getAttr(element, "start")),
    chapStyle: parseInt32(getAttr(element, "chapStyle")),
    chapSep: parseChapSep(getAttr(element, "chapSep")),
  };
}

// =============================================================================
// Document Grid Parsing
// =============================================================================

function parseDocGridType(value: string | undefined): DocxDocGridType | undefined {
  switch (value) {
    case "default":
    case "lines":
    case "linesAndChars":
    case "snapToChars":
      return value;
    default:
      return undefined;
  }
}

/**
 * Parse document grid element.
 *
 * @see ECMA-376 Part 1, Section 17.6.5 (docGrid)
 */
function parseDocGrid(element: XmlElement | undefined): DocxDocGrid | undefined {
  if (!element) {return undefined;}

  return {
    type: parseDocGridType(getAttr(element, "type")),
    linePitch: parseTwips(getAttr(element, "linePitch")),
    charSpace: parseInt32(getAttr(element, "charSpace")),
  };
}

// =============================================================================
// Section Break Type Parsing
// =============================================================================

function parseSectionBreakType(value: string | undefined): SectionBreakType | undefined {
  switch (value) {
    case "continuous":
    case "evenPage":
    case "nextColumn":
    case "nextPage":
    case "oddPage":
      return value;
    default:
      return undefined;
  }
}

// =============================================================================
// Vertical Alignment Parsing
// =============================================================================

function parseVerticalJc(value: string | undefined): DocxVerticalJc | undefined {
  switch (value) {
    case "top":
    case "center":
    case "both":
    case "bottom":
      return value;
    default:
      return undefined;
  }
}

// =============================================================================
// Text Direction Parsing
// =============================================================================

/**
 * Parse text direction value.
 *
 * @see ECMA-376-1:2016 Section 17.6.23 (textDirection)
 * @see ECMA-376-1:2016 Section 17.18.93 (ST_TextDirection)
 */
function parseSectionTextDirection(
  value: string | undefined,
): "lrTb" | "tbRl" | "btLr" | "lrTbV" | "tbRlV" | "tbLrV" | undefined {
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
// Note Properties Parsing
// =============================================================================

function parseNotePos(value: string | undefined): "pageBottom" | "beneathText" | "sectEnd" | "docEnd" | undefined {
  switch (value) {
    case "pageBottom":
    case "beneathText":
    case "sectEnd":
    case "docEnd":
      return value;
    default:
      return undefined;
  }
}

function parseNumRestart(value: string | undefined): "continuous" | "eachSect" | "eachPage" | undefined {
  switch (value) {
    case "continuous":
    case "eachSect":
    case "eachPage":
      return value;
    default:
      return undefined;
  }
}

function parseNotePr(element: XmlElement | undefined): DocxNotePr | undefined {
  if (!element) {return undefined;}

  return {
    pos: parseNotePos(getChildVal(element, "pos")),
    numFmt: parsePageNumberFormat(getChildVal(element, "numFmt")),
    numStart: getChildIntVal(element, "numStart"),
    numRestart: parseNumRestart(getChildVal(element, "numRestart")),
  };
}

// =============================================================================
// Section Properties Parsing
// =============================================================================

/**
 * Parse section properties element.
 *
 * @see ECMA-376 Part 1, Section 17.6.17 (sectPr)
 */
export function parseSectionProperties(element: XmlElement | undefined): DocxSectionProperties | undefined {
  if (!element) {return undefined;}

  return {
    type: parseSectionBreakType(getChildVal(element, "type")),
    pgSz: parsePageSize(getChild(element, "pgSz")),
    pgMar: parsePageMargins(getChild(element, "pgMar")),
    pgBorders: parsePageBorders(getChild(element, "pgBorders")),
    cols: parseColumns(getChild(element, "cols")),
    headerReference: parseHeaderReferences(element),
    footerReference: parseFooterReferences(element),
    titlePg: getChild(element, "titlePg") !== undefined,
    lnNumType: parseLineNumbering(getChild(element, "lnNumType")),
    pgNumType: parsePageNumberType(getChild(element, "pgNumType")),
    docGrid: parseDocGrid(getChild(element, "docGrid")),
    bidi: getChild(element, "bidi") !== undefined,
    rtlGutter: getChild(element, "rtlGutter") !== undefined,
    textDirection: parseSectionTextDirection(getChildVal(element, "textDirection")),
    vAlign: parseVerticalJc(getChildVal(element, "vAlign")),
    footnotePr: parseNotePr(getChild(element, "footnotePr")),
    endnotePr: parseNotePr(getChild(element, "endnotePr")),
    noEndnote: getChild(element, "noEndnote") !== undefined,
  };
}
