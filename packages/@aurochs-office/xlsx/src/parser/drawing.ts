/**
 * @file SpreadsheetML Drawing Parser
 *
 * Parses drawing XML files from XLSX packages.
 * Handles anchors, pictures, shapes, and chart frames.
 *
 * @see ECMA-376 Part 4, Section 20.5 (SpreadsheetML Drawings)
 */

import type { XmlElement } from "@aurochs/xml";
import { getAttr, getChild, getChildren, getTextContent, isXmlElement } from "@aurochs/xml";
import { parseInt32, parseEditAs as parseOoxmlEditAs } from "@aurochs-office/ooxml/parser";
import type { GroupLocks } from "@aurochs-office/ooxml/domain/drawing/locks";
import { rowIdx, colIdx } from "../domain/types";
import type {
  XlsxDrawing,
  XlsxDrawingAnchor,
  XlsxTwoCellAnchor,
  XlsxOneCellAnchor,
  XlsxAbsoluteAnchor,
  XlsxCellAnchorOffset,
  XlsxAbsolutePosition,
  XlsxExtent,
  XlsxNonVisualProperties,
  XlsxDrawingContent,
  XlsxPicture,
  XlsxShape,
  XlsxChartFrame,
  XlsxGroupShape,
  XlsxGroupTransform,
} from "../domain/drawing/types";

// =============================================================================
// Primitive Parsing
// =============================================================================

/**
 * Parse a cell anchor offset (from/to element).
 */
function parseCellAnchorOffset(element: XmlElement): XlsxCellAnchorOffset {
  const colEl = getChild(element, "xdr:col") ?? getChild(element, "col");
  const colOffEl = getChild(element, "xdr:colOff") ?? getChild(element, "colOff");
  const rowEl = getChild(element, "xdr:row") ?? getChild(element, "row");
  const rowOffEl = getChild(element, "xdr:rowOff") ?? getChild(element, "rowOff");

  return {
    col: colIdx(parseInt32(colEl ? getTextContent(colEl) : undefined) ?? 0),
    colOff: parseInt32(colOffEl ? getTextContent(colOffEl) : undefined) ?? 0,
    row: rowIdx(parseInt32(rowEl ? getTextContent(rowEl) : undefined) ?? 0),
    rowOff: parseInt32(rowOffEl ? getTextContent(rowOffEl) : undefined) ?? 0,
  };
}

/**
 * Parse an absolute position element.
 */
function parseAbsolutePosition(element: XmlElement): XlsxAbsolutePosition {
  return {
    x: parseInt32(getAttr(element, "x")) ?? 0,
    y: parseInt32(getAttr(element, "y")) ?? 0,
  };
}

/**
 * Parse an extent element.
 */
function parseExtent(element: XmlElement): XlsxExtent {
  return {
    cx: parseInt32(getAttr(element, "cx")) ?? 0,
    cy: parseInt32(getAttr(element, "cy")) ?? 0,
  };
}

// =============================================================================
// Non-Visual Properties Parsing
// =============================================================================

/**
 * Parse non-visual properties (cNvPr).
 */
function parseNonVisualProperties(cNvPrElement: XmlElement | undefined): XlsxNonVisualProperties {
  if (!cNvPrElement) {
    return { id: 0, name: "" };
  }

  return {
    id: parseInt32(getAttr(cNvPrElement, "id")) ?? 0,
    name: getAttr(cNvPrElement, "name") ?? "",
    descr: getAttr(cNvPrElement, "descr") ?? undefined,
    hidden: getAttr(cNvPrElement, "hidden") === "1" ? true : undefined,
  };
}

// =============================================================================
// Content Parsing
// =============================================================================

/**
 * Parse a picture element.
 */
function parsePicture(picElement: XmlElement): XlsxPicture {
  // xdr:nvPicPr/xdr:cNvPr
  const nvPicPr = getChild(picElement, "xdr:nvPicPr") ?? getChild(picElement, "nvPicPr");
  const cNvPr = nvPicPr ? (getChild(nvPicPr, "xdr:cNvPr") ?? getChild(nvPicPr, "cNvPr")) : undefined;

  // xdr:blipFill/a:blip
  const blipFill = getChild(picElement, "xdr:blipFill") ?? getChild(picElement, "blipFill");
  const blip = blipFill ? (getChild(blipFill, "a:blip") ?? getChild(blipFill, "blip")) : undefined;
  const blipRelId = blip ? (getAttr(blip, "r:embed") ?? getAttr(blip, "embed")) : undefined;

  return {
    type: "picture",
    nvPicPr: parseNonVisualProperties(cNvPr),
    ...(blipRelId && { blipRelId }),
  };
}

/**
 * Extract text content from a txBody element.
 */
function extractTxBodyText(txBody: XmlElement | undefined): string | undefined {
  if (!txBody) {
    return undefined;
  }
  const paragraphs = getChildren(txBody, "a:p").concat(getChildren(txBody, "p"));
  const texts = paragraphs.flatMap((p) => {
    const runs = getChildren(p, "a:r").concat(getChildren(p, "r"));
    return runs.map((r) => {
      const tEl = getChild(r, "a:t") ?? getChild(r, "t");
      return tEl ? getTextContent(tEl) : "";
    });
  });
  return texts.join("").trim() || undefined;
}

/**
 * Parse a shape element.
 */
function parseShape(spElement: XmlElement): XlsxShape {
  // xdr:nvSpPr/xdr:cNvPr
  const nvSpPr = getChild(spElement, "xdr:nvSpPr") ?? getChild(spElement, "nvSpPr");
  const cNvPr = nvSpPr ? (getChild(nvSpPr, "xdr:cNvPr") ?? getChild(nvSpPr, "cNvPr")) : undefined;

  // xdr:spPr/a:prstGeom
  const spPr = getChild(spElement, "xdr:spPr") ?? getChild(spElement, "spPr");
  const prstGeom = spPr ? (getChild(spPr, "a:prstGeom") ?? getChild(spPr, "prstGeom")) : undefined;
  const prstGeomType = prstGeom ? getAttr(prstGeom, "prst") : undefined;

  // xdr:txBody - extract text content
  const txBody = getChild(spElement, "xdr:txBody") ?? getChild(spElement, "txBody");
  const txBodyText = extractTxBodyText(txBody);

  return {
    type: "shape",
    nvSpPr: parseNonVisualProperties(cNvPr),
    ...(prstGeomType && { prstGeom: prstGeomType }),
    ...(txBodyText && { txBody: txBodyText }),
  };
}

function resolveCNvPr(parentElement: XmlElement | undefined): XmlElement | undefined {
  if (!parentElement) {
    return undefined;
  }
  return getChild(parentElement, "xdr:cNvPr") ?? getChild(parentElement, "cNvPr");
}

/**
 * Parse a graphic frame element (usually contains a chart).
 */
function parseGraphicFrame(graphicFrameElement: XmlElement): XlsxChartFrame {
  // xdr:nvGraphicFramePr/xdr:cNvPr
  const nvGraphicFramePr =
    getChild(graphicFrameElement, "xdr:nvGraphicFramePr") ?? getChild(graphicFrameElement, "nvGraphicFramePr");
  const cNvPr = resolveCNvPr(nvGraphicFramePr);

  // xdr:graphic/a:graphicData/c:chart
  const graphic = getChild(graphicFrameElement, "a:graphic") ?? getChild(graphicFrameElement, "graphic");
  const graphicData = graphic ? (getChild(graphic, "a:graphicData") ?? getChild(graphic, "graphicData")) : undefined;
  const chart = graphicData ? (getChild(graphicData, "c:chart") ?? getChild(graphicData, "chart")) : undefined;
  const chartRelId = chart ? (getAttr(chart, "r:id") ?? getAttr(chart, "rId")) : undefined;

  return {
    type: "chartFrame",
    nvGraphicFramePr: parseNonVisualProperties(cNvPr),
    ...(chartRelId && { chartRelId }),
  };
}

// =============================================================================
// Group Shape Parsing
// =============================================================================

/**
 * Parse boolean attribute, returning undefined if not present.
 */
function parseBoolAttr(element: XmlElement, name: string): boolean | undefined {
  const val = getAttr(element, name);
  if (val === undefined) {
    return undefined;
  }
  return val === "1" || val === "true";
}

/**
 * Parse group locks element.
 */
function parseGroupLocksElement(element: XmlElement | undefined): GroupLocks | undefined {
  if (!element) {
    return undefined;
  }
  const noGrp = parseBoolAttr(element, "noGrp");
  const noUngrp = parseBoolAttr(element, "noUngrp");
  const noSelect = parseBoolAttr(element, "noSelect");
  const noRot = parseBoolAttr(element, "noRot");
  const noChangeAspect = parseBoolAttr(element, "noChangeAspect");
  const noMove = parseBoolAttr(element, "noMove");
  const noResize = parseBoolAttr(element, "noResize");
  if (
    noGrp === undefined &&
    noUngrp === undefined &&
    noSelect === undefined &&
    noRot === undefined &&
    noChangeAspect === undefined &&
    noMove === undefined &&
    noResize === undefined
  ) {
    return undefined;
  }
  return {
    noGrp,
    noUngrp,
    noSelect,
    noRot,
    noChangeAspect,
    noMove,
    noResize,
  };
}

/**
 * Parse group transform from xdr:grpSpPr.
 */
function parseGroupTransform(grpSpPr: XmlElement | undefined): XlsxGroupTransform | undefined {
  if (!grpSpPr) {
    return undefined;
  }
  const xfrm = getChild(grpSpPr, "a:xfrm") ?? getChild(grpSpPr, "xfrm");
  if (!xfrm) {
    return undefined;
  }

  const off = getChild(xfrm, "a:off") ?? getChild(xfrm, "off");
  const ext = getChild(xfrm, "a:ext") ?? getChild(xfrm, "ext");
  const chOff = getChild(xfrm, "a:chOff") ?? getChild(xfrm, "chOff");
  const chExt = getChild(xfrm, "a:chExt") ?? getChild(xfrm, "chExt");

  if (!off || !ext || !chOff || !chExt) {
    return undefined;
  }

  const rot = parseInt32(getAttr(xfrm, "rot"));
  const flipH = parseBoolAttr(xfrm, "flipH");
  const flipV = parseBoolAttr(xfrm, "flipV");

  return {
    x: parseInt32(getAttr(off, "x")) ?? 0,
    y: parseInt32(getAttr(off, "y")) ?? 0,
    cx: parseInt32(getAttr(ext, "cx")) ?? 0,
    cy: parseInt32(getAttr(ext, "cy")) ?? 0,
    chOffX: parseInt32(getAttr(chOff, "x")) ?? 0,
    chOffY: parseInt32(getAttr(chOff, "y")) ?? 0,
    chExtCx: parseInt32(getAttr(chExt, "cx")) ?? 0,
    chExtCy: parseInt32(getAttr(chExt, "cy")) ?? 0,
    ...(rot !== undefined && { rot }),
    ...(flipH !== undefined && { flipH }),
    ...(flipV !== undefined && { flipV }),
  };
}

/**
 * Parse a group shape element.
 * Uses parseDrawingContentRecursive to handle nested groups.
 */
function parseGroupShape(
  grpSpElement: XmlElement,
  parseContent: (el: XmlElement) => XlsxDrawingContent | undefined,
): XlsxGroupShape {
  // xdr:nvGrpSpPr
  const nvGrpSpPr = getChild(grpSpElement, "xdr:nvGrpSpPr") ?? getChild(grpSpElement, "nvGrpSpPr");
  const cNvPr = nvGrpSpPr ? (getChild(nvGrpSpPr, "xdr:cNvPr") ?? getChild(nvGrpSpPr, "cNvPr")) : undefined;
  const cNvGrpSpPr = nvGrpSpPr
    ? (getChild(nvGrpSpPr, "xdr:cNvGrpSpPr") ?? getChild(nvGrpSpPr, "cNvGrpSpPr"))
    : undefined;
  const grpSpLocks = cNvGrpSpPr
    ? (getChild(cNvGrpSpPr, "a:grpSpLocks") ?? getChild(cNvGrpSpPr, "grpSpLocks"))
    : undefined;

  // xdr:grpSpPr
  const grpSpPr = getChild(grpSpElement, "xdr:grpSpPr") ?? getChild(grpSpElement, "grpSpPr");

  // Parse children recursively
  const children: XlsxDrawingContent[] = [];
  for (const child of grpSpElement.children) {
    if (!isXmlElement(child)) {
      continue;
    }
    const content = parseContent(child);
    if (content) {
      children.push(content);
    }
  }

  return {
    type: "groupShape",
    nvGrpSpPr: parseNonVisualProperties(cNvPr),
    groupLocks: parseGroupLocksElement(grpSpLocks),
    transform: parseGroupTransform(grpSpPr),
    children,
  };
}

// =============================================================================
// Content Dispatch
// =============================================================================

/**
 * Parse drawing content from a container element (anchor or group).
 * Handles recursive group parsing.
 */
function parseDrawingContentFromElement(element: XmlElement): XlsxDrawingContent | undefined {
  const name = element.name;

  // Picture
  if (name === "xdr:pic" || name === "pic") {
    return parsePicture(element);
  }

  // Shape
  if (name === "xdr:sp" || name === "sp") {
    return parseShape(element);
  }

  // Graphic frame (charts)
  if (name === "xdr:graphicFrame" || name === "graphicFrame") {
    return parseGraphicFrame(element);
  }

  // Group shape (recursive)
  if (name === "xdr:grpSp" || name === "grpSp") {
    return parseGroupShape(element, parseDrawingContentFromElement);
  }

  return undefined;
}

/**
 * Parse drawing content from an anchor element.
 */
function parseDrawingContent(anchorElement: XmlElement): XlsxDrawingContent | undefined {
  // Check for picture
  const picEl = getChild(anchorElement, "xdr:pic") ?? getChild(anchorElement, "pic");
  if (picEl) {
    return parsePicture(picEl);
  }

  // Check for shape
  const spEl = getChild(anchorElement, "xdr:sp") ?? getChild(anchorElement, "sp");
  if (spEl) {
    return parseShape(spEl);
  }

  // Check for graphic frame (charts)
  const graphicFrameEl = getChild(anchorElement, "xdr:graphicFrame") ?? getChild(anchorElement, "graphicFrame");
  if (graphicFrameEl) {
    return parseGraphicFrame(graphicFrameEl);
  }

  // Check for group shape
  const grpSpEl = getChild(anchorElement, "xdr:grpSp") ?? getChild(anchorElement, "grpSp");
  if (grpSpEl) {
    return parseGroupShape(grpSpEl, parseDrawingContentFromElement);
  }

  return undefined;
}

// =============================================================================
// Anchor Parsing
// =============================================================================

/**
 * Parse a twoCellAnchor element.
 */
function parseTwoCellAnchor(anchorElement: XmlElement): XlsxTwoCellAnchor {
  const fromEl = getChild(anchorElement, "xdr:from") ?? getChild(anchorElement, "from");
  const toEl = getChild(anchorElement, "xdr:to") ?? getChild(anchorElement, "to");

  return {
    type: "twoCellAnchor",
    from: fromEl ? parseCellAnchorOffset(fromEl) : { col: colIdx(0), colOff: 0, row: rowIdx(0), rowOff: 0 },
    to: toEl ? parseCellAnchorOffset(toEl) : { col: colIdx(0), colOff: 0, row: rowIdx(0), rowOff: 0 },
    editAs: parseOoxmlEditAs(getAttr(anchorElement, "editAs")),
    content: parseDrawingContent(anchorElement),
  };
}

/**
 * Parse a oneCellAnchor element.
 */
function parseOneCellAnchor(anchorElement: XmlElement): XlsxOneCellAnchor {
  const fromEl = getChild(anchorElement, "xdr:from") ?? getChild(anchorElement, "from");
  const extEl = getChild(anchorElement, "xdr:ext") ?? getChild(anchorElement, "ext");

  return {
    type: "oneCellAnchor",
    from: fromEl ? parseCellAnchorOffset(fromEl) : { col: colIdx(0), colOff: 0, row: rowIdx(0), rowOff: 0 },
    ext: extEl ? parseExtent(extEl) : { cx: 0, cy: 0 },
    content: parseDrawingContent(anchorElement),
  };
}

/**
 * Parse an absoluteAnchor element.
 */
function parseAbsoluteAnchor(anchorElement: XmlElement): XlsxAbsoluteAnchor {
  const posEl = getChild(anchorElement, "xdr:pos") ?? getChild(anchorElement, "pos");
  const extEl = getChild(anchorElement, "xdr:ext") ?? getChild(anchorElement, "ext");

  return {
    type: "absoluteAnchor",
    pos: posEl ? parseAbsolutePosition(posEl) : { x: 0, y: 0 },
    ext: extEl ? parseExtent(extEl) : { cx: 0, cy: 0 },
    content: parseDrawingContent(anchorElement),
  };
}

// =============================================================================
// Main Drawing Parser
// =============================================================================

/**
 * Parse a drawing XML element.
 *
 * @param drawingElement - The root <xdr:wsDr> element
 * @returns Parsed drawing with all anchors
 *
 * @see ECMA-376 Part 4, Section 20.5.2.35 (wsDr)
 */
export function parseDrawing(drawingElement: XmlElement): XlsxDrawing {
  const anchors: XlsxDrawingAnchor[] = [];

  // Parse twoCellAnchors
  // Note: getChildren with "twoCellAnchor" matches both "twoCellAnchor" and "xdr:twoCellAnchor"
  for (const anchor of getChildren(drawingElement, "twoCellAnchor")) {
    anchors.push(parseTwoCellAnchor(anchor));
  }

  // Parse oneCellAnchors
  for (const anchor of getChildren(drawingElement, "oneCellAnchor")) {
    anchors.push(parseOneCellAnchor(anchor));
  }

  // Parse absoluteAnchors
  for (const anchor of getChildren(drawingElement, "absoluteAnchor")) {
    anchors.push(parseAbsoluteAnchor(anchor));
  }

  return { anchors };
}
