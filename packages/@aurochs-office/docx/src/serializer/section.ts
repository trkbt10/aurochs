/**
 * @file DOCX Section Properties Serializer
 *
 * Serializes section properties to WordprocessingML XML.
 *
 * @see ECMA-376 Part 1, Section 17.6 (Sections)
 */

import type { XmlElement, XmlNode } from "@aurochs/xml";
import type {
  DocxSectionProperties,
  DocxPageSize,
  DocxPageMargins,
  DocxPageBorders,
  DocxPageBorderEdge,
  DocxColumns,
  DocxHeaderFooterRef,
  DocxLineNumbering,
  DocxPageNumberType,
  DocxDocGrid,
  DocxNotePr,
} from "../domain/section";
import { wEl, valEl, optAttr, children } from "./primitive";

// =============================================================================
// Page Size Serialization
// =============================================================================

function serializePageSize(pgSz: DocxPageSize | undefined): XmlElement | undefined {
  if (!pgSz) {return undefined;}
  const attrs: Record<string, string> = {
    w: String(pgSz.w),
    h: String(pgSz.h),
  };
  optAttr(attrs, "orient", pgSz.orient);
  optAttr(attrs, "code", pgSz.code);
  return wEl("pgSz", attrs);
}

// =============================================================================
// Page Margins Serialization
// =============================================================================

function serializePageMargins(pgMar: DocxPageMargins | undefined): XmlElement | undefined {
  if (!pgMar) {return undefined;}
  const attrs: Record<string, string> = {
    top: String(pgMar.top),
    right: String(pgMar.right),
    bottom: String(pgMar.bottom),
    left: String(pgMar.left),
  };
  optAttr(attrs, "header", pgMar.header);
  optAttr(attrs, "footer", pgMar.footer);
  optAttr(attrs, "gutter", pgMar.gutter);
  return wEl("pgMar", attrs);
}

// =============================================================================
// Page Borders Serialization
// =============================================================================

function serializePageBorderEdge(localName: string, edge: DocxPageBorderEdge | undefined): XmlElement | undefined {
  if (!edge) {return undefined;}
  const attrs: Record<string, string> = { val: edge.val };
  optAttr(attrs, "sz", edge.sz);
  optAttr(attrs, "space", edge.space);
  optAttr(attrs, "color", edge.color);
  optAttr(attrs, "themeColor", edge.themeColor);
  optAttr(attrs, "shadow", edge.shadow);
  optAttr(attrs, "frame", edge.frame);
  return wEl(localName, attrs);
}

function serializePageBorders(pgBorders: DocxPageBorders | undefined): XmlElement | undefined {
  if (!pgBorders) {return undefined;}
  const attrs: Record<string, string> = {};
  optAttr(attrs, "display", pgBorders.display);
  optAttr(attrs, "offsetFrom", pgBorders.offsetFrom);
  optAttr(attrs, "zOrder", pgBorders.zOrder);
  const ch = children(
    serializePageBorderEdge("top", pgBorders.top),
    serializePageBorderEdge("left", pgBorders.left),
    serializePageBorderEdge("bottom", pgBorders.bottom),
    serializePageBorderEdge("right", pgBorders.right),
  );
  return wEl("pgBorders", attrs, ch);
}

// =============================================================================
// Columns Serialization
// =============================================================================

function serializeColumns(cols: DocxColumns | undefined): XmlElement | undefined {
  if (!cols) {return undefined;}
  const attrs: Record<string, string> = {};
  optAttr(attrs, "num", cols.num);
  optAttr(attrs, "equalWidth", cols.equalWidth);
  optAttr(attrs, "space", cols.space);
  optAttr(attrs, "sep", cols.sep);
  const ch: XmlNode[] = [];
  if (cols.col) {
    for (const col of cols.col) {
      const colAttrs: Record<string, string> = {};
      optAttr(colAttrs, "w", col.w);
      optAttr(colAttrs, "space", col.space);
      ch.push(wEl("col", colAttrs));
    }
  }
  return wEl("cols", attrs, ch);
}

// =============================================================================
// Header/Footer References Serialization
// =============================================================================

function serializeHeaderFooterRefs(tagName: string, refs: readonly DocxHeaderFooterRef[] | undefined): XmlNode[] {
  if (!refs) {return [];}
  return refs.map((ref) => wEl(tagName, { type: ref.type, "r:id": String(ref.rId) }));
}

// =============================================================================
// Line Numbering Serialization
// =============================================================================

function serializeLineNumbering(lnNumType: DocxLineNumbering | undefined): XmlElement | undefined {
  if (!lnNumType) {return undefined;}
  const attrs: Record<string, string> = {};
  optAttr(attrs, "countBy", lnNumType.countBy);
  optAttr(attrs, "start", lnNumType.start);
  optAttr(attrs, "restart", lnNumType.restart);
  optAttr(attrs, "distance", lnNumType.distance);
  return wEl("lnNumType", attrs);
}

// =============================================================================
// Page Number Type Serialization
// =============================================================================

function serializePageNumberType(pgNumType: DocxPageNumberType | undefined): XmlElement | undefined {
  if (!pgNumType) {return undefined;}
  const attrs: Record<string, string> = {};
  optAttr(attrs, "fmt", pgNumType.fmt);
  optAttr(attrs, "start", pgNumType.start);
  optAttr(attrs, "chapStyle", pgNumType.chapStyle);
  optAttr(attrs, "chapSep", pgNumType.chapSep);
  return wEl("pgNumType", attrs);
}

// =============================================================================
// Document Grid Serialization
// =============================================================================

function serializeDocGrid(docGrid: DocxDocGrid | undefined): XmlElement | undefined {
  if (!docGrid) {return undefined;}
  const attrs: Record<string, string> = {};
  optAttr(attrs, "type", docGrid.type);
  optAttr(attrs, "linePitch", docGrid.linePitch);
  optAttr(attrs, "charSpace", docGrid.charSpace);
  return wEl("docGrid", attrs);
}

// =============================================================================
// Note Properties Serialization
// =============================================================================

function serializeNotePr(localName: string, notePr: DocxNotePr | undefined): XmlElement | undefined {
  if (!notePr) {return undefined;}
  const ch = children(
    notePr.pos ? valEl("pos", notePr.pos) : undefined,
    notePr.numFmt ? valEl("numFmt", notePr.numFmt) : undefined,
    notePr.numStart !== undefined ? valEl("numStart", String(notePr.numStart)) : undefined,
    notePr.numRestart ? valEl("numRestart", notePr.numRestart) : undefined,
  );
  return wEl(localName, {}, ch);
}

// =============================================================================
// Section Properties Serialization
// =============================================================================

/**
 * Serialize section properties to XmlElement.
 *
 * @see ECMA-376 Part 1, Section 17.6.17 (sectPr)
 */
export function serializeSectionProperties(sectPr: DocxSectionProperties | undefined): XmlElement | undefined {
  if (!sectPr) {return undefined;}

  const ch: XmlNode[] = [
    ...serializeHeaderFooterRefs("headerReference", sectPr.headerReference),
    ...serializeHeaderFooterRefs("footerReference", sectPr.footerReference),
    ...children(
      sectPr.type ? valEl("type", sectPr.type) : undefined,
      serializePageSize(sectPr.pgSz),
      serializePageMargins(sectPr.pgMar),
      serializePageBorders(sectPr.pgBorders),
      serializeColumns(sectPr.cols),
      sectPr.titlePg ? wEl("titlePg") : undefined,
      serializeLineNumbering(sectPr.lnNumType),
      serializePageNumberType(sectPr.pgNumType),
      serializeDocGrid(sectPr.docGrid),
      sectPr.bidi ? wEl("bidi") : undefined,
      sectPr.rtlGutter ? wEl("rtlGutter") : undefined,
      sectPr.textDirection ? valEl("textDirection", sectPr.textDirection) : undefined,
      sectPr.vAlign ? valEl("vAlign", sectPr.vAlign) : undefined,
      serializeNotePr("footnotePr", sectPr.footnotePr),
      serializeNotePr("endnotePr", sectPr.endnotePr),
      sectPr.noEndnote ? wEl("noEndnote") : undefined,
    ),
  ];

  return wEl("sectPr", {}, ch);
}
