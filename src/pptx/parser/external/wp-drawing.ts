/**
 * @file WordprocessingML Drawing parsing helpers
 *
 * Minimal parsing for wp:* elements used by DrawingML in WordprocessingML.
 *
 * @see ECMA-376 Part 1, Section 20.4 - DrawingML - WordprocessingML Drawing
 */

import type { XmlElement } from "../../../xml/index";
import { getAttr, getChild, getChildren, getTextContent } from "../../../xml/index";
import type {
  AlignH,
  AlignV,
  EffectExtent,
  GraphicFrameLocks,
  ConnectionTarget,
  NonVisualProperties,
  PositionH,
  PositionV,
  Point,
  WrapPolygon,
  WrapSquare,
  WrapThrough,
  WrapTight,
  WrapTopAndBottom,
  GroupLocks,
  ContentPartLocks,
  ContentPart,
  LinkedTextbox,
  TextboxInfo,
  ConnectorLocks,
} from "../../domain/index";
import type { Pixels } from "../../domain/types";
import {
  parseAlignH,
  parseAlignV,
  parseEmu,
  parseBoolean,
  parsePositionOffset,
  parseRelFromH,
  parseRelFromV,
  parseWrapDistance,
  parseWrapText,
  getBoolAttr,
  parseBlackWhiteMode,
} from "../primitive";
import { getIntAttr } from "../primitive";
import { parseNonVisualProperties } from "../shape-parser/non-visual";

/**
 * Parse wp:align (horizontal) element.
 * @see ECMA-376 Part 1, Section 20.4.2.1 (align)
 */
export function parseAlignHElement(element: XmlElement | undefined): AlignH | undefined {
  if (!element) {return undefined;}
  return parseAlignH(getTextContent(element).trim());
}

/**
 * Parse wp:align (vertical) element.
 * @see ECMA-376 Part 1, Section 20.4.2.2 (align)
 */
export function parseAlignVElement(element: XmlElement | undefined): AlignV | undefined {
  if (!element) {return undefined;}
  return parseAlignV(getTextContent(element).trim());
}

/**
 * Parse wp:docPr element.
 * @see ECMA-376 Part 1, Section 20.4.2.5 (docPr)
 */
export function parseDocPrElement(element: XmlElement | undefined): NonVisualProperties | undefined {
  if (!element) {return undefined;}
  return parseNonVisualProperties(element);
}

/**
 * Parse wp:effectExtent element.
 * @see ECMA-376 Part 1, Section 20.4.2.6 (effectExtent)
 */
export function parseEffectExtentElement(
  element: XmlElement | undefined,
): EffectExtent | undefined {
  if (!element) {return undefined;}
  const left = parseEmu(element.attrs.l);
  const top = parseEmu(element.attrs.t);
  const right = parseEmu(element.attrs.r);
  const bottom = parseEmu(element.attrs.b);
  if (left === undefined || top === undefined || right === undefined || bottom === undefined) {
    return undefined;
  }
  return { left, top, right, bottom };
}

/**
 * Parse wp:positionH element.
 * @see ECMA-376 Part 1, Section 20.4.2.10 (positionH)
 */
export function parsePositionHElement(element: XmlElement | undefined): PositionH | undefined {
  if (!element) {return undefined;}
  const relativeFrom = parseRelFromH(element.attrs.relativeFrom);
  if (!relativeFrom) {return undefined;}

  const alignElement = getChild(element, "wp:align");
  const align = parseAlignHElement(alignElement);
  const posOffsetElement = align ? undefined : getChild(element, "wp:posOffset");
  const offset = posOffsetElement ? parsePositionOffset(getTextContent(posOffsetElement).trim()) : undefined;

  if (align === undefined && offset === undefined) {return undefined;}
  return { relativeFrom, align, offset };
}

/**
 * Parse wp:positionV element.
 * @see ECMA-376 Part 1, Section 20.4.2.11 (positionV)
 */
export function parsePositionVElement(element: XmlElement | undefined): PositionV | undefined {
  if (!element) {return undefined;}
  const relativeFrom = parseRelFromV(element.attrs.relativeFrom);
  if (!relativeFrom) {return undefined;}

  const alignElement = getChild(element, "wp:align");
  const align = parseAlignVElement(alignElement);
  const posOffsetElement = align ? undefined : getChild(element, "wp:posOffset");
  const offset = posOffsetElement ? parsePositionOffset(getTextContent(posOffsetElement).trim()) : undefined;

  if (align === undefined && offset === undefined) {return undefined;}
  return { relativeFrom, align, offset };
}

/**
 * Parse wp:posOffset element.
 * @see ECMA-376 Part 1, Section 20.4.2.12 (posOffset)
 */
export function parsePosOffsetElement(element: XmlElement | undefined): Pixels | undefined {
  if (!element) {return undefined;}
  return parsePositionOffset(getTextContent(element).trim());
}

/**
 * Parse wp:simplePos element.
 * @see ECMA-376 Part 1, Section 20.4.2.13 (simplePos)
 */
export function parseSimplePosElement(element: XmlElement | undefined): Point | undefined {
  if (!element) {return undefined;}
  const x = parseEmu(element.attrs.x);
  const y = parseEmu(element.attrs.y);
  if (x === undefined || y === undefined) {return undefined;}
  return { x, y };
}

/**
 * Parse wp:wrapNone element.
 * @see ECMA-376 Part 1, Section 20.4.2.15 (wrapNone)
 */
export function parseWrapNoneElement(element: XmlElement | undefined): boolean {
  return Boolean(element);
}

function parsePoint2DElement(element: XmlElement | undefined): Point | undefined {
  if (!element) {return undefined;}
  const x = parseEmu(element.attrs.x);
  const y = parseEmu(element.attrs.y);
  if (x === undefined || y === undefined) {return undefined;}
  return { x, y };
}

/**
 * Parse wp:wrapPolygon element.
 * @see ECMA-376 Part 1, Section 20.4.2.16 (wrapPolygon)
 */
export function parseWrapPolygonElement(
  element: XmlElement | undefined,
): WrapPolygon | undefined {
  if (!element) {return undefined;}
  const start = parsePoint2DElement(getChild(element, "wp:start"));
  if (!start) {return undefined;}
  const lineTos = getChildren(element, "wp:lineTo").map((child) =>
    parsePoint2DElement(child),
  );
  if (lineTos.some((pt) => !pt)) {return undefined;}
  const lineTo = lineTos.filter((pt): pt is Point => Boolean(pt));
  if (lineTo.length < 2) {return undefined;}
  return {
    edited: parseBoolean(element.attrs.edited),
    start,
    lineTo,
  };
}

/**
 * Parse wp:wrapSquare element.
 * @see ECMA-376 Part 1, Section 20.4.2.17 (wrapSquare)
 */
export function parseWrapSquareElement(
  element: XmlElement | undefined,
): WrapSquare | undefined {
  if (!element) {return undefined;}
  const wrapText = parseWrapText(element.attrs.wrapText);
  if (!wrapText) {return undefined;}

  const effectExtent = parseEffectExtentElement(getChild(element, "wp:effectExtent"));
  const distTop = parseWrapDistance(element.attrs.distT);
  const distBottom = parseWrapDistance(element.attrs.distB);
  const distLeft = parseWrapDistance(element.attrs.distL);
  const distRight = parseWrapDistance(element.attrs.distR);

  return {
    wrapText,
    distTop,
    distBottom,
    distLeft,
    distRight,
    effectExtent,
  };
}

/**
 * Parse wp:wrapThrough element.
 * @see ECMA-376 Part 1, Section 20.4.2.18 (wrapThrough)
 */
export function parseWrapThroughElement(
  element: XmlElement | undefined,
): WrapThrough | undefined {
  if (!element) {return undefined;}
  const wrapText = parseWrapText(element.attrs.wrapText);
  if (!wrapText) {return undefined;}
  const polygon = parseWrapPolygonElement(getChild(element, "wp:wrapPolygon"));
  if (!polygon) {return undefined;}

  const distLeft = parseWrapDistance(element.attrs.distL);
  const distRight = parseWrapDistance(element.attrs.distR);

  return {
    wrapText,
    distLeft,
    distRight,
    polygon,
  };
}

/**
 * Parse wp:wrapTight element.
 * @see ECMA-376 Part 1, Section 20.4.2.19 (wrapTight)
 */
export function parseWrapTightElement(element: XmlElement | undefined): WrapTight | undefined {
  if (!element) {return undefined;}
  const wrapText = parseWrapText(element.attrs.wrapText);
  if (!wrapText) {return undefined;}
  const polygon = parseWrapPolygonElement(getChild(element, "wp:wrapPolygon"));
  if (!polygon) {return undefined;}

  const distLeft = parseWrapDistance(element.attrs.distL);
  const distRight = parseWrapDistance(element.attrs.distR);

  return {
    wrapText,
    distLeft,
    distRight,
    polygon,
  };
}

/**
 * Parse wp:wrapTopAndBottom element.
 * @see ECMA-376 Part 1, Section 20.4.2.20 (wrapTopAndBottom)
 */
export function parseWrapTopAndBottomElement(
  element: XmlElement | undefined,
): WrapTopAndBottom | undefined {
  if (!element) {return undefined;}
  const distTop = parseWrapDistance(element.attrs.distT);
  const distBottom = parseWrapDistance(element.attrs.distB);
  return { distTop, distBottom };
}

function parseConnectionTarget(element: XmlElement | undefined): ConnectionTarget | undefined {
  if (!element) {return undefined;}
  const id = getAttr(element, "id");
  const idx = getIntAttr(element, "idx");
  if (!id || idx === undefined) {return undefined;}
  return { shapeId: id, siteIndex: idx };
}

/**
 * Parse wp:cNvCnPr element.
 * @see ECMA-376 Part 1, Section 20.4.2.23 (cNvCnPr)
 */
export function parseCNvCnPrElement(
  element: XmlElement | undefined,
): { startConnection?: ConnectionTarget; endConnection?: ConnectionTarget } | undefined {
  if (!element) {return undefined;}
  const startConnection = parseConnectionTarget(getChild(element, "a:stCxn"));
  const endConnection = parseConnectionTarget(getChild(element, "a:endCxn"));
  if (!startConnection && !endConnection) {return undefined;}
  return { startConnection, endConnection };
}

/**
 * Parse wp:cNvContentPartPr element.
 * @see ECMA-376 Part 1, Section 20.4.2.24 (cNvContentPartPr)
 */
export function parseCNvContentPartPrElement(
  element: XmlElement | undefined,
): { isComment?: boolean; locks?: ContentPartLocks } | undefined {
  if (!element) {return undefined;}
  const isComment = parseBoolean(element.attrs.isComment);
  const locks = parseContentPartLocksElement(getChild(element, "a:cpLocks"));
  if (isComment === undefined && !locks) {return undefined;}
  return { isComment, locks };
}

function parseContentPartLocksElement(element: XmlElement | undefined): ContentPartLocks | undefined {
  if (!element) {return undefined;}
  const noGrp = getBoolAttr(element, "noGrp");
  const noSelect = getBoolAttr(element, "noSelect");
  const noRot = getBoolAttr(element, "noRot");
  const noChangeAspect = getBoolAttr(element, "noChangeAspect");
  const noMove = getBoolAttr(element, "noMove");
  const noResize = getBoolAttr(element, "noResize");
  const noEditPoints = getBoolAttr(element, "noEditPoints");
  const noAdjustHandles = getBoolAttr(element, "noAdjustHandles");
  const noChangeArrowheads = getBoolAttr(element, "noChangeArrowheads");
  const noChangeShapeType = getBoolAttr(element, "noChangeShapeType");
  if (
    noGrp === undefined &&
    noSelect === undefined &&
    noRot === undefined &&
    noChangeAspect === undefined &&
    noMove === undefined &&
    noResize === undefined &&
    noEditPoints === undefined &&
    noAdjustHandles === undefined &&
    noChangeArrowheads === undefined &&
    noChangeShapeType === undefined
  ) {
    return undefined;
  }
  return {
    noGrp,
    noSelect,
    noRot,
    noChangeAspect,
    noMove,
    noResize,
    noEditPoints,
    noAdjustHandles,
    noChangeArrowheads,
    noChangeShapeType,
  };
}

function parseGraphicFrameLocksElement(
  element: XmlElement | undefined,
): GraphicFrameLocks | undefined {
  if (!element) {return undefined;}
  const noGrp = getBoolAttr(element, "noGrp");
  const noDrilldown = getBoolAttr(element, "noDrilldown");
  const noSelect = getBoolAttr(element, "noSelect");
  const noChangeAspect = getBoolAttr(element, "noChangeAspect");
  const noMove = getBoolAttr(element, "noMove");
  const noResize = getBoolAttr(element, "noResize");
  if (
    noGrp === undefined &&
    noDrilldown === undefined &&
    noSelect === undefined &&
    noChangeAspect === undefined &&
    noMove === undefined &&
    noResize === undefined
  ) {
    return undefined;
  }
  return {
    noGrp,
    noDrilldown,
    noSelect,
    noChangeAspect,
    noMove,
    noResize,
  };
}

function parseGroupLocksElement(element: XmlElement | undefined): GroupLocks | undefined {
  if (!element) {return undefined;}
  const noGrp = getBoolAttr(element, "noGrp");
  const noUngrp = getBoolAttr(element, "noUngrp");
  const noSelect = getBoolAttr(element, "noSelect");
  const noRot = getBoolAttr(element, "noRot");
  const noChangeAspect = getBoolAttr(element, "noChangeAspect");
  const noMove = getBoolAttr(element, "noMove");
  const noResize = getBoolAttr(element, "noResize");
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

function parseConnectorLocksElement(element: XmlElement | undefined): ConnectorLocks | undefined {
  if (!element) {return undefined;}
  const noGrp = getBoolAttr(element, "noGrp");
  const noSelect = getBoolAttr(element, "noSelect");
  const noRot = getBoolAttr(element, "noRot");
  const noChangeAspect = getBoolAttr(element, "noChangeAspect");
  const noMove = getBoolAttr(element, "noMove");
  const noResize = getBoolAttr(element, "noResize");
  const noEditPoints = getBoolAttr(element, "noEditPoints");
  const noAdjustHandles = getBoolAttr(element, "noAdjustHandles");
  const noChangeArrowheads = getBoolAttr(element, "noChangeArrowheads");
  const noChangeShapeType = getBoolAttr(element, "noChangeShapeType");
  if (
    noGrp === undefined &&
    noSelect === undefined &&
    noRot === undefined &&
    noChangeAspect === undefined &&
    noMove === undefined &&
    noResize === undefined &&
    noEditPoints === undefined &&
    noAdjustHandles === undefined &&
    noChangeArrowheads === undefined &&
    noChangeShapeType === undefined
  ) {
    return undefined;
  }
  return {
    noGrp,
    noSelect,
    noRot,
    noChangeAspect,
    noMove,
    noResize,
    noEditPoints,
    noAdjustHandles,
    noChangeArrowheads,
    noChangeShapeType,
  };
}

/**
 * Parse wp:cNvFrPr element.
 * @see ECMA-376 Part 1, Section 20.4.2.25 (cNvFrPr)
 */
export function parseCNvFrPrElement(
  element: XmlElement | undefined,
): GraphicFrameLocks | undefined {
  if (!element) {return undefined;}
  return parseGraphicFrameLocksElement(getChild(element, "a:graphicFrameLocks"));
}

/**
 * Parse wp:cNvGrpSpPr element.
 * @see ECMA-376 Part 1, Section 20.4.2.26 (cNvGrpSpPr)
 */
export function parseCNvGrpSpPrElement(element: XmlElement | undefined): GroupLocks | undefined {
  if (!element) {return undefined;}
  return parseGroupLocksElement(getChild(element, "a:grpSpLocks"));
}

/**
 * Parse a:cxnSpLocks element.
 * @see ECMA-376 Part 1, Section 20.1.2.2.11 (cxnSpLocks)
 */
export function parseCxnSpLocksElement(
  element: XmlElement | undefined,
): ConnectorLocks | undefined {
  if (!element) {return undefined;}
  return parseConnectorLocksElement(element);
}

/**
 * Parse wp:cNvSpPr element.
 * @see ECMA-376 Part 1, Section 20.4.2.28 (cNvSpPr)
 */
export function parseCNvSpPrElement(element: XmlElement | undefined): { txBox?: boolean } | undefined {
  if (!element) {return undefined;}
  const txBox = parseBoolean(element.attrs.txBox);
  if (txBox === undefined) {return undefined;}
  return { txBox };
}

/**
 * Parse wp:contentPart element.
 * @see ECMA-376 Part 1, Section 20.4.2.29 (contentPart)
 */
export function parseContentPartElement(element: XmlElement | undefined): ContentPart | undefined {
  if (!element) {return undefined;}
  const id = getAttr(element, "r:id");
  if (!id) {return undefined;}
  const bwMode = parseBlackWhiteMode(element.attrs.bwMode);
  return { id, bwMode };
}

/**
 * Parse wp:linkedTxbx element.
 * @see ECMA-376 Part 1, Section 20.4.2.34 (linkedTxbx)
 */
export function parseLinkedTxbxElement(
  element: XmlElement | undefined,
): LinkedTextbox | undefined {
  if (!element) {return undefined;}
  const id = getIntAttr(element, "id");
  const seq = getIntAttr(element, "seq");
  if (id === undefined || seq === undefined) {return undefined;}
  if (id < 0 || id > 65535 || seq < 0 || seq > 65535) {return undefined;}
  return { id, seq };
}

/**
 * Parse wp:txbx element.
 * @see ECMA-376 Part 1, Section 20.4.2.37 (txbx)
 */
export function parseTxbxElement(element: XmlElement | undefined): TextboxInfo | undefined {
  if (!element) {return undefined;}
  const id = getIntAttr(element, "id");
  if (id === undefined) {return undefined;}
  if (id < 0 || id > 65535) {return undefined;}
  return { id };
}

/**
 * Parse wp:txbxContent element.
 * @see ECMA-376 Part 1, Section 20.4.2.38 (txbxContent)
 */
export function parseTxbxContentElement(element: XmlElement | undefined): XmlElement | undefined {
  return element;
}

/**
 * Parse wp:wgp element.
 * @see ECMA-376 Part 1, Section 20.4.2.39 (wgp)
 */
export function parseWgpElement(element: XmlElement | undefined): XmlElement | undefined {
  return element;
}

/**
 * Parse wp:wpc element.
 * @see ECMA-376 Part 1, Section 20.4.2.41 (wpc)
 */
export function parseWpcElement(element: XmlElement | undefined): XmlElement | undefined {
  return element;
}

/**
 * Parse wp:wsp element.
 * @see ECMA-376 Part 1, Section 20.4.2.42 (wsp)
 */
export function parseWspElement(
  element: XmlElement | undefined,
): { normalEastAsianFlow?: boolean } | undefined {
  if (!element) {return undefined;}
  const normalEastAsianFlow = parseBoolean(element.attrs.normalEastAsianFlow);
  if (normalEastAsianFlow === undefined) {return undefined;}
  return { normalEastAsianFlow };
}
/**
 * Parse wp:positionV element.
 * @see ECMA-376 Part 1, Section 20.4.2.11 (positionV)
 */
