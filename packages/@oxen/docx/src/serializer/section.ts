/**
 * @file DOCX Section Serializer
 *
 * Serializes section properties to WordprocessingML XML.
 *
 * @see ECMA-376 Part 1, Section 17.6 (Sections)
 */

import type { XmlElement, XmlNode } from "@oxen/xml";
import { createElement } from "@oxen/xml";
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
  DocxDocGrid,
  DocxNotePr,
} from "../domain/section";

// =============================================================================
// Page Size Serialization
// =============================================================================

/**
 * Serialize page size element.
 *
 * @see ECMA-376 Part 1, Section 17.6.13 (pgSz)
 */
export function serializePageSize(pgSz: DocxPageSize): XmlElement {
  const attrs: Record<string, string> = {};

  if (pgSz.w !== undefined) {attrs["w:w"] = String(pgSz.w);}
  if (pgSz.h !== undefined) {attrs["w:h"] = String(pgSz.h);}
  if (pgSz.orient) {attrs["w:orient"] = pgSz.orient;}
  if (pgSz.code !== undefined) {attrs["w:code"] = String(pgSz.code);}

  return createElement("w:pgSz", attrs);
}

// =============================================================================
// Page Margins Serialization
// =============================================================================

/**
 * Serialize page margins element.
 *
 * @see ECMA-376 Part 1, Section 17.6.11 (pgMar)
 */
export function serializePageMargins(pgMar: DocxPageMargins): XmlElement {
  const attrs: Record<string, string> = {};

  if (pgMar.top !== undefined) {attrs["w:top"] = String(pgMar.top);}
  if (pgMar.right !== undefined) {attrs["w:right"] = String(pgMar.right);}
  if (pgMar.bottom !== undefined) {attrs["w:bottom"] = String(pgMar.bottom);}
  if (pgMar.left !== undefined) {attrs["w:left"] = String(pgMar.left);}
  if (pgMar.header !== undefined) {attrs["w:header"] = String(pgMar.header);}
  if (pgMar.footer !== undefined) {attrs["w:footer"] = String(pgMar.footer);}
  if (pgMar.gutter !== undefined) {attrs["w:gutter"] = String(pgMar.gutter);}

  return createElement("w:pgMar", attrs);
}

// =============================================================================
// Page Borders Serialization
// =============================================================================

/**
 * Serialize a page border edge element.
 */
function serializeBorderEdge(border: DocxPageBorderEdge, name: string): XmlElement {
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
 * Serialize page borders element.
 *
 * @see ECMA-376 Part 1, Section 17.6.10 (pgBorders)
 */
export function serializePageBorders(pgBorders: DocxPageBorders): XmlElement {
  const attrs: Record<string, string> = {};

  if (pgBorders.zOrder) {attrs["w:zOrder"] = pgBorders.zOrder;}
  if (pgBorders.display) {attrs["w:display"] = pgBorders.display;}
  if (pgBorders.offsetFrom) {attrs["w:offsetFrom"] = pgBorders.offsetFrom;}

  const children: XmlNode[] = [];

  if (pgBorders.top) {children.push(serializeBorderEdge(pgBorders.top, "top"));}
  if (pgBorders.left) {children.push(serializeBorderEdge(pgBorders.left, "left"));}
  if (pgBorders.bottom) {children.push(serializeBorderEdge(pgBorders.bottom, "bottom"));}
  if (pgBorders.right) {children.push(serializeBorderEdge(pgBorders.right, "right"));}

  return createElement("w:pgBorders", attrs, children);
}

// =============================================================================
// Columns Serialization
// =============================================================================

/**
 * Serialize a column element.
 */
function serializeColumn(col: DocxColumn): XmlElement {
  const attrs: Record<string, string> = {};

  if (col.w !== undefined) {attrs["w:w"] = String(col.w);}
  if (col.space !== undefined) {attrs["w:space"] = String(col.space);}

  return createElement("w:col", attrs);
}

/**
 * Serialize columns element.
 *
 * @see ECMA-376 Part 1, Section 17.6.4 (cols)
 */
export function serializeColumns(cols: DocxColumns): XmlElement {
  const attrs: Record<string, string> = {};

  if (cols.space !== undefined) {attrs["w:space"] = String(cols.space);}
  if (cols.num !== undefined) {attrs["w:num"] = String(cols.num);}
  if (cols.equalWidth !== undefined) {attrs["w:equalWidth"] = cols.equalWidth ? "1" : "0";}
  if (cols.sep !== undefined) {attrs["w:sep"] = cols.sep ? "1" : "0";}

  const children = cols.col?.map(serializeColumn) ?? [];

  return createElement("w:cols", attrs, children);
}

// =============================================================================
// Header/Footer Reference Serialization
// =============================================================================

/**
 * Serialize header reference element.
 *
 * @see ECMA-376 Part 1, Section 17.10.5 (headerReference)
 */
export function serializeHeaderReference(ref: DocxHeaderFooterRef): XmlElement {
  const attrs: Record<string, string> = {
    "w:type": ref.type,
    "r:id": ref.rId,
  };
  return createElement("w:headerReference", attrs);
}

/**
 * Serialize footer reference element.
 *
 * @see ECMA-376 Part 1, Section 17.10.2 (footerReference)
 */
export function serializeFooterReference(ref: DocxHeaderFooterRef): XmlElement {
  const attrs: Record<string, string> = {
    "w:type": ref.type,
    "r:id": ref.rId,
  };
  return createElement("w:footerReference", attrs);
}

// =============================================================================
// Line Numbering Serialization
// =============================================================================

/**
 * Serialize line numbering element.
 *
 * @see ECMA-376 Part 1, Section 17.6.8 (lnNumType)
 */
export function serializeLineNumbering(lnNumType: DocxLineNumbering): XmlElement {
  const attrs: Record<string, string> = {};

  if (lnNumType.countBy !== undefined) {attrs["w:countBy"] = String(lnNumType.countBy);}
  if (lnNumType.start !== undefined) {attrs["w:start"] = String(lnNumType.start);}
  if (lnNumType.distance !== undefined) {attrs["w:distance"] = String(lnNumType.distance);}
  if (lnNumType.restart) {attrs["w:restart"] = lnNumType.restart;}

  return createElement("w:lnNumType", attrs);
}

// =============================================================================
// Page Number Type Serialization
// =============================================================================

/**
 * Serialize page number type element.
 *
 * @see ECMA-376 Part 1, Section 17.6.12 (pgNumType)
 */
export function serializePageNumberType(pgNumType: DocxPageNumberType): XmlElement {
  const attrs: Record<string, string> = {};

  if (pgNumType.fmt) {attrs["w:fmt"] = pgNumType.fmt;}
  if (pgNumType.start !== undefined) {attrs["w:start"] = String(pgNumType.start);}
  if (pgNumType.chapStyle !== undefined) {attrs["w:chapStyle"] = String(pgNumType.chapStyle);}
  if (pgNumType.chapSep) {attrs["w:chapSep"] = pgNumType.chapSep;}

  return createElement("w:pgNumType", attrs);
}

// =============================================================================
// Document Grid Serialization
// =============================================================================

/**
 * Serialize document grid element.
 *
 * @see ECMA-376 Part 1, Section 17.6.5 (docGrid)
 */
export function serializeDocGrid(docGrid: DocxDocGrid): XmlElement {
  const attrs: Record<string, string> = {};

  if (docGrid.type) {attrs["w:type"] = docGrid.type;}
  if (docGrid.linePitch !== undefined) {attrs["w:linePitch"] = String(docGrid.linePitch);}
  if (docGrid.charSpace !== undefined) {attrs["w:charSpace"] = String(docGrid.charSpace);}

  return createElement("w:docGrid", attrs);
}

// =============================================================================
// Note Properties Serialization
// =============================================================================

/**
 * Serialize note properties element (footnote/endnote).
 *
 * @see ECMA-376 Part 1, Section 17.11.7 (footnotePr)
 * @see ECMA-376 Part 1, Section 17.11.4 (endnotePr)
 */
export function serializeNotePr(notePr: DocxNotePr, elementName: string): XmlElement {
  const children: XmlNode[] = [];

  if (notePr.pos) {
    children.push(createElement("w:pos", { "w:val": notePr.pos }));
  }
  if (notePr.numFmt) {
    children.push(createElement("w:numFmt", { "w:val": notePr.numFmt }));
  }
  if (notePr.numStart !== undefined) {
    children.push(createElement("w:numStart", { "w:val": String(notePr.numStart) }));
  }
  if (notePr.numRestart) {
    children.push(createElement("w:numRestart", { "w:val": notePr.numRestart }));
  }

  return createElement(`w:${elementName}`, {}, children);
}

// =============================================================================
// Section Properties Serialization
// =============================================================================

/**
 * Serialize section properties element.
 *
 * @see ECMA-376 Part 1, Section 17.6.17 (sectPr)
 */
export function serializeSectionProperties(sectPr: DocxSectionProperties | undefined): XmlElement | undefined {
  if (!sectPr) {return undefined;}

  const children: XmlNode[] = [];

  // Header references
  if (sectPr.headerReference) {
    for (const ref of sectPr.headerReference) {
      children.push(serializeHeaderReference(ref));
    }
  }

  // Footer references
  if (sectPr.footerReference) {
    for (const ref of sectPr.footerReference) {
      children.push(serializeFooterReference(ref));
    }
  }

  // Footnote properties
  if (sectPr.footnotePr) {
    children.push(serializeNotePr(sectPr.footnotePr, "footnotePr"));
  }

  // Endnote properties
  if (sectPr.endnotePr) {
    children.push(serializeNotePr(sectPr.endnotePr, "endnotePr"));
  }

  // Section type
  if (sectPr.type) {
    children.push(createElement("w:type", { "w:val": sectPr.type }));
  }

  // Page size
  if (sectPr.pgSz) {
    children.push(serializePageSize(sectPr.pgSz));
  }

  // Page margins
  if (sectPr.pgMar) {
    children.push(serializePageMargins(sectPr.pgMar));
  }

  // Page borders
  if (sectPr.pgBorders) {
    children.push(serializePageBorders(sectPr.pgBorders));
  }

  // Line numbering
  if (sectPr.lnNumType) {
    children.push(serializeLineNumbering(sectPr.lnNumType));
  }

  // Page number type
  if (sectPr.pgNumType) {
    children.push(serializePageNumberType(sectPr.pgNumType));
  }

  // Columns
  if (sectPr.cols) {
    children.push(serializeColumns(sectPr.cols));
  }

  // No endnote
  if (sectPr.noEndnote) {
    children.push(createElement("w:noEndnote"));
  }

  // Title page
  if (sectPr.titlePg) {
    children.push(createElement("w:titlePg"));
  }

  // Text direction
  if (sectPr.bidi) {
    children.push(createElement("w:bidi"));
  }

  // RTL gutter
  if (sectPr.rtlGutter) {
    children.push(createElement("w:rtlGutter"));
  }

  // Vertical alignment
  if (sectPr.vAlign) {
    children.push(createElement("w:vAlign", { "w:val": sectPr.vAlign }));
  }

  // Document grid
  if (sectPr.docGrid) {
    children.push(serializeDocGrid(sectPr.docGrid));
  }

  if (children.length === 0) {return undefined;}

  return createElement("w:sectPr", {}, children);
}
