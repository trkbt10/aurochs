/**
 * @file SpreadsheetML Drawing parsing helpers
 *
 * Parsing for xdr:* elements used by DrawingML in SpreadsheetML.
 * Returns EMU values without conversion.
 *
 * @see ECMA-376 Part 1, Section 20.5 - DrawingML - SpreadsheetML Drawing
 */

import type { XmlElement } from "@aurochs/xml";
import { getChild, getTextContent } from "@aurochs/xml";
import type { EMU } from "@aurochs-office/drawing-ml/domain/units";
import type { Point2D, Size2D } from "../domain/drawing/position";
import type {
  AbsoluteAnchor,
  AnchorClientData,
  CellMarker,
  OneCellAnchor,
  TwoCellAnchor,
} from "../domain/drawing/anchor";
import type { GraphicFrameLocks, GroupLocks, ConnectorLocks } from "../domain/drawing/locks";
import type { ContentPart } from "../domain/drawing/content";
import {
  getBoolAttr,
  parseBlackWhiteMode,
  parseCoordinateUnqualified,
  parsePositiveCoordinate,
  parseUnsignedInt,
} from "./drawing-primitive";

// =============================================================================
// Primitive Parsing
// =============================================================================

function parsePoint2D(element: XmlElement | undefined): Point2D | undefined {
  if (!element) {
    return undefined;
  }
  const x = parseCoordinateUnqualified(element.attrs.x);
  const y = parseCoordinateUnqualified(element.attrs.y);
  if (x === undefined || y === undefined) {
    return undefined;
  }
  return { x, y };
}

function parseSize2D(element: XmlElement | undefined): Size2D | undefined {
  if (!element) {
    return undefined;
  }
  const cx = parsePositiveCoordinate(element.attrs.cx);
  const cy = parsePositiveCoordinate(element.attrs.cy);
  if (cx === undefined || cy === undefined) {
    return undefined;
  }
  return { cx, cy };
}

// =============================================================================
// Lock Parsing
// =============================================================================

function parseGraphicFrameLocksElement(element: XmlElement | undefined): GraphicFrameLocks | undefined {
  if (!element) {
    return undefined;
  }
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
  if (!element) {
    return undefined;
  }
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
  if (!element) {
    return undefined;
  }
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

// =============================================================================
// Anchor Parsing
// =============================================================================

/**
 * Parse xdr:absoluteAnchor element.
 * @see ECMA-376 Part 1, Section 20.5.2.1 (absoluteAnchor)
 */
export function parseAbsoluteAnchorElement(element: XmlElement | undefined): AbsoluteAnchor | undefined {
  if (!element) {
    return undefined;
  }
  const posElement = getChild(element, "xdr:pos") ?? getChild(element, "a:pos");
  const extElement = getChild(element, "xdr:ext") ?? getChild(element, "a:ext");
  const position = parsePoint2D(posElement);
  const size = parseSize2D(extElement);
  if (!position || !size) {
    return undefined;
  }
  return { position, size };
}

/**
 * Parse xdr:clientData element.
 * @see ECMA-376 Part 1, Section 20.5.2.3 (clientData)
 */
export function parseClientDataElement(element: XmlElement | undefined): AnchorClientData | undefined {
  if (!element) {
    return undefined;
  }
  const locksWithSheet = getBoolAttr(element, "fLocksWithSheet");
  const printsWithSheet = getBoolAttr(element, "fPrintsWithSheet");
  if (locksWithSheet === undefined && printsWithSheet === undefined) {
    return undefined;
  }
  return { locksWithSheet, printsWithSheet };
}

/**
 * Parse xdr:cNvGraphicFramePr element.
 * @see ECMA-376 Part 1, Section 20.5.2.5 (cNvGraphicFramePr)
 */
export function parseCNvGraphicFramePrElement(element: XmlElement | undefined): GraphicFrameLocks | undefined {
  if (!element) {
    return undefined;
  }
  return parseGraphicFrameLocksElement(getChild(element, "a:graphicFrameLocks"));
}

/**
 * Parse xdr:cNvGrpSpPr element.
 * @see ECMA-376 Part 1, Section 20.5.2.6 (cNvGrpSpPr)
 */
export function parseCNvGrpSpPrElement(element: XmlElement | undefined): GroupLocks | undefined {
  if (!element) {
    return undefined;
  }
  return parseGroupLocksElement(getChild(element, "a:grpSpLocks"));
}

/**
 * Parse xdr:cNvSpPr element.
 * @see ECMA-376 Part 1, Section 20.5.2.9 (cNvSpPr)
 */
export function parseCNvSpPrElement(element: XmlElement | undefined): { txBox?: boolean } | undefined {
  if (!element) {
    return undefined;
  }
  const txBox = getBoolAttr(element, "txBox");
  if (txBox === undefined) {
    return undefined;
  }
  return { txBox };
}

/**
 * Parse a:cxnSpLocks element.
 * @see ECMA-376 Part 1, Section 20.1.2.2.11 (cxnSpLocks)
 */
export function parseCxnSpLocksElement(element: XmlElement | undefined): ConnectorLocks | undefined {
  if (!element) {
    return undefined;
  }
  return parseConnectorLocksElement(element);
}

/**
 * Parse xdr:colOff element.
 * @see ECMA-376 Part 1, Section 20.5.2.11 (colOff)
 */
export function parseColOffElement(element: XmlElement | undefined): EMU | undefined {
  if (!element) {
    return undefined;
  }
  return parseCoordinateUnqualified(getTextContent(element).trim());
}

/**
 * Parse xdr:rowOff element.
 * @see ECMA-376 Part 1, Section 20.5.2.28 (rowOff)
 */
export function parseRowOffElement(element: XmlElement | undefined): EMU | undefined {
  if (!element) {
    return undefined;
  }
  return parseCoordinateUnqualified(getTextContent(element).trim());
}

function parseColElement(element: XmlElement | undefined): number | undefined {
  if (!element) {
    return undefined;
  }
  const value = getTextContent(element).trim();
  const col = parseUnsignedInt(value);
  if (col === undefined || col < 0) {
    return undefined;
  }
  return col;
}

function parseRowElement(element: XmlElement | undefined): number | undefined {
  if (!element) {
    return undefined;
  }
  const value = getTextContent(element).trim();
  const row = parseUnsignedInt(value);
  if (row === undefined || row < 0) {
    return undefined;
  }
  return row;
}

function parseMarkerElement(element: XmlElement | undefined): CellMarker | undefined {
  if (!element) {
    return undefined;
  }
  const col = parseColElement(getChild(element, "xdr:col"));
  const row = parseRowElement(getChild(element, "xdr:row"));
  if (col === undefined || row === undefined) {
    return undefined;
  }
  const colOff = parseColOffElement(getChild(element, "xdr:colOff"));
  const rowOff = parseRowOffElement(getChild(element, "xdr:rowOff"));
  return { col, row, colOff, rowOff };
}

/**
 * Parse xdr:contentPart element.
 * @see ECMA-376 Part 1, Section 20.5.2.12 (contentPart)
 */
export function parseContentPartElement(element: XmlElement | undefined): ContentPart | undefined {
  if (!element) {
    return undefined;
  }
  const id = element.attrs["r:id"];
  if (!id) {
    return undefined;
  }
  const bwMode = parseBlackWhiteMode(element.attrs.bwMode);
  return { id, bwMode };
}

/**
 * Parse xdr:oneCellAnchor element.
 * @see ECMA-376 Part 1, Section 20.5.2.24 (oneCellAnchor)
 */
export function parseOneCellAnchorElement(element: XmlElement | undefined): OneCellAnchor | undefined {
  if (!element) {
    return undefined;
  }
  const from = parseMarkerElement(getChild(element, "xdr:from"));
  const extElement = getChild(element, "xdr:ext");
  const size = parseSize2D(extElement);
  if (!from || !size) {
    return undefined;
  }
  const clientData = parseClientDataElement(getChild(element, "xdr:clientData"));
  return { from, size, clientData };
}

/**
 * Parse xdr:twoCellAnchor element.
 * @see ECMA-376 Part 1, Section 20.5.2.33 (twoCellAnchor)
 */
export function parseTwoCellAnchorElement(element: XmlElement | undefined): TwoCellAnchor | undefined {
  if (!element) {
    return undefined;
  }
  const from = parseMarkerElement(getChild(element, "xdr:from"));
  const to = parseMarkerElement(getChild(element, "xdr:to"));
  if (!from || !to) {
    return undefined;
  }
  const clientData = parseClientDataElement(getChild(element, "xdr:clientData"));
  return { from, to, clientData };
}

/**
 * Parse xdr:wsDr element.
 * @see ECMA-376 Part 1, Section 20.5.2.35 (wsDr)
 */
export function parseWsDrElement(element: XmlElement | undefined): XmlElement | undefined {
  return element;
}
