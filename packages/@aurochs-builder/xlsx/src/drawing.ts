/**
 * @file SpreadsheetML Drawing Serializer
 *
 * Serializes XlsxDrawing domain objects to SpreadsheetDrawing XML.
 *
 * @see ECMA-376 Part 4, Section 20.5 (SpreadsheetML Drawings)
 */

import { createElement, type XmlElement, type XmlNode } from "@aurochs/xml";
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
  XlsxConnectionShape,
} from "@aurochs-office/xlsx/domain/drawing/types";

// =============================================================================
// Namespace Constants
// =============================================================================

const DRAWING_NS = "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing";
const DRAWINGML_NS = "http://schemas.openxmlformats.org/drawingml/2006/main";
const RELATIONSHIPS_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

// =============================================================================
// Primitive Serialization
// =============================================================================

function serializeCellAnchorOffset(
  tagName: string,
  offset: XlsxCellAnchorOffset,
): XmlElement {
  return createElement(tagName, {}, [
    createElement("xdr:col", {}, [{ type: "text", value: String(offset.col) }]),
    createElement("xdr:colOff", {}, [{ type: "text", value: String(offset.colOff) }]),
    createElement("xdr:row", {}, [{ type: "text", value: String(offset.row) }]),
    createElement("xdr:rowOff", {}, [{ type: "text", value: String(offset.rowOff) }]),
  ]);
}

function serializeExtent(ext: XlsxExtent): XmlElement {
  return createElement("xdr:ext", { cx: String(ext.cx), cy: String(ext.cy) }, []);
}

function serializePosition(pos: XlsxAbsolutePosition): XmlElement {
  return createElement("xdr:pos", { x: String(pos.x), y: String(pos.y) }, []);
}

// =============================================================================
// Content Serialization
// =============================================================================

function serializeNonVisualProperties(
  tagName: string,
  props: XlsxNonVisualProperties,
): XmlElement {
  const attrs: Record<string, string> = {
    id: String(props.id),
    name: props.name,
  };
  if (props.descr) {
    attrs["descr"] = props.descr;
  }
  if (props.hidden) {
    attrs["hidden"] = "1";
  }
  return createElement(tagName, attrs, []);
}

function serializePicture(pic: XlsxPicture): XmlElement {
  const nvPicPr = createElement("xdr:nvPicPr", {}, [
    serializeNonVisualProperties("xdr:cNvPr", pic.nvPicPr),
    createElement("xdr:cNvPicPr", {}, [
      createElement("a:picLocks", { noChangeAspect: "1" }, []),
    ]),
  ]);

  const blipAttrs: Record<string, string> = {};
  if (pic.blipRelId) {
    blipAttrs["r:embed"] = pic.blipRelId;
  }
  const blipFill = createElement("xdr:blipFill", {}, [
    createElement("a:blip", blipAttrs, []),
    createElement("a:stretch", {}, [createElement("a:fillRect", {}, [])]),
  ]);

  const spPr = createElement("xdr:spPr", {}, [
    createElement("a:prstGeom", { prst: "rect" }, [
      createElement("a:avLst", {}, []),
    ]),
  ]);

  return createElement("xdr:pic", {}, [nvPicPr, blipFill, spPr]);
}

function serializeShape(shape: XlsxShape): XmlElement {
  const nvSpPr = createElement("xdr:nvSpPr", {}, [
    serializeNonVisualProperties("xdr:cNvPr", shape.nvSpPr),
    createElement("xdr:cNvSpPr", {}, []),
  ]);

  const spPrChildren: XmlNode[] = [];
  if (shape.prstGeom) {
    spPrChildren.push(
      createElement("a:prstGeom", { prst: shape.prstGeom }, [
        createElement("a:avLst", {}, []),
      ]),
    );
  }
  const spPr = createElement("xdr:spPr", {}, spPrChildren);

  const children: XmlNode[] = [nvSpPr, spPr];

  if (shape.txBody) {
    children.push(
      createElement("xdr:txBody", {}, [
        createElement("a:bodyPr", {}, []),
        createElement("a:p", {}, [
          createElement("a:r", {}, [
            createElement("a:t", {}, [{ type: "text", value: shape.txBody }]),
          ]),
        ]),
      ]),
    );
  }

  return createElement("xdr:sp", {}, children);
}

function serializeChartFrame(chart: XlsxChartFrame): XmlElement {
  const nvGraphicFramePr = createElement("xdr:nvGraphicFramePr", {}, [
    serializeNonVisualProperties("xdr:cNvPr", chart.nvGraphicFramePr),
    createElement("xdr:cNvGraphicFramePr", {}, []),
  ]);

  const graphicChildren: XmlNode[] = [];
  if (chart.chartRelId) {
    graphicChildren.push(
      createElement(
        "a:graphicData",
        { uri: "http://schemas.openxmlformats.org/drawingml/2006/chart" },
        [createElement("c:chart", { "r:id": chart.chartRelId }, [])],
      ),
    );
  }
  const graphic = createElement("a:graphic", {}, graphicChildren);

  return createElement("xdr:graphicFrame", {}, [nvGraphicFramePr, graphic]);
}

function serializeConnectionShape(cxnSp: XlsxConnectionShape): XmlElement {
  const nvCxnSpPrChildren: XmlNode[] = [
    serializeNonVisualProperties("xdr:cNvPr", cxnSp.nvCxnSpPr),
  ];

  const cNvCxnSpPrChildren: XmlNode[] = [];
  if (cxnSp.connectorLocks) {
    const lockAttrs: Record<string, string> = {};
    if (cxnSp.connectorLocks.noGrp) { lockAttrs["noGrp"] = "1"; }
    if (cxnSp.connectorLocks.noSelect) { lockAttrs["noSelect"] = "1"; }
    if (cxnSp.connectorLocks.noRot) { lockAttrs["noRot"] = "1"; }
    if (cxnSp.connectorLocks.noChangeAspect) { lockAttrs["noChangeAspect"] = "1"; }
    if (cxnSp.connectorLocks.noMove) { lockAttrs["noMove"] = "1"; }
    if (cxnSp.connectorLocks.noResize) { lockAttrs["noResize"] = "1"; }
    if (cxnSp.connectorLocks.noEditPoints) { lockAttrs["noEditPoints"] = "1"; }
    if (cxnSp.connectorLocks.noAdjustHandles) { lockAttrs["noAdjustHandles"] = "1"; }
    if (cxnSp.connectorLocks.noChangeArrowheads) { lockAttrs["noChangeArrowheads"] = "1"; }
    if (cxnSp.connectorLocks.noChangeShapeType) { lockAttrs["noChangeShapeType"] = "1"; }
    cNvCxnSpPrChildren.push(createElement("a:cxnSpLocks", lockAttrs, []));
  }
  if (cxnSp.startConnection) {
    cNvCxnSpPrChildren.push(createElement("a:stCxn", {
      id: cxnSp.startConnection.shapeId,
      idx: String(cxnSp.startConnection.siteIndex),
    }, []));
  }
  if (cxnSp.endConnection) {
    cNvCxnSpPrChildren.push(createElement("a:endCxn", {
      id: cxnSp.endConnection.shapeId,
      idx: String(cxnSp.endConnection.siteIndex),
    }, []));
  }
  nvCxnSpPrChildren.push(createElement("xdr:cNvCxnSpPr", {}, cNvCxnSpPrChildren));

  const nvCxnSpPr = createElement("xdr:nvCxnSpPr", {}, nvCxnSpPrChildren);

  const spPrChildren: XmlNode[] = [];
  if (cxnSp.prstGeom) {
    spPrChildren.push(
      createElement("a:prstGeom", { prst: cxnSp.prstGeom }, [
        createElement("a:avLst", {}, []),
      ]),
    );
  }
  const spPr = createElement("xdr:spPr", {}, spPrChildren);

  return createElement("xdr:cxnSp", {}, [nvCxnSpPr, spPr]);
}

function serializeGroupShape(grpSp: XlsxGroupShape): XmlElement {
  const nvGrpSpPrChildren: XmlNode[] = [
    serializeNonVisualProperties("xdr:cNvPr", grpSp.nvGrpSpPr),
    createElement("xdr:cNvGrpSpPr", {}, []),
  ];
  const nvGrpSpPr = createElement("xdr:nvGrpSpPr", {}, nvGrpSpPrChildren);

  const grpSpPrChildren: XmlNode[] = [];
  if (grpSp.transform) {
    const t = grpSp.transform;
    const xfrmAttrs: Record<string, string> = {};
    if (t.rot !== undefined) { xfrmAttrs["rot"] = String(t.rot); }
    if (t.flipH) { xfrmAttrs["flipH"] = "1"; }
    if (t.flipV) { xfrmAttrs["flipV"] = "1"; }
    grpSpPrChildren.push(
      createElement("a:xfrm", xfrmAttrs, [
        createElement("a:off", { x: String(t.x), y: String(t.y) }, []),
        createElement("a:ext", { cx: String(t.cx), cy: String(t.cy) }, []),
        createElement("a:chOff", { x: String(t.chOffX), y: String(t.chOffY) }, []),
        createElement("a:chExt", { cx: String(t.chExtCx), cy: String(t.chExtCy) }, []),
      ]),
    );
  }
  const grpSpPr = createElement("xdr:grpSpPr", {}, grpSpPrChildren);

  // Recursively serialize children
  const children: XmlNode[] = [nvGrpSpPr, grpSpPr];
  for (const child of grpSp.children) {
    const childEl = serializeDrawingContent(child);
    if (childEl) {
      children.push(childEl);
    }
  }

  return createElement("xdr:grpSp", {}, children);
}

function serializeDrawingContent(content: XlsxDrawingContent): XmlElement | undefined {
  switch (content.type) {
    case "picture":
      return serializePicture(content);
    case "shape":
      return serializeShape(content);
    case "chartFrame":
      return serializeChartFrame(content);
    case "connectionShape":
      return serializeConnectionShape(content);
    case "groupShape":
      return serializeGroupShape(content);
  }
}

// =============================================================================
// Anchor Serialization
// =============================================================================

function serializeTwoCellAnchor(anchor: XlsxTwoCellAnchor): XmlElement {
  const attrs: Record<string, string> = {};
  if (anchor.editAs) {
    attrs["editAs"] = anchor.editAs;
  }

  const children: XmlNode[] = [
    serializeCellAnchorOffset("xdr:from", anchor.from),
    serializeCellAnchorOffset("xdr:to", anchor.to),
  ];

  if (anchor.content) {
    const contentEl = serializeDrawingContent(anchor.content);
    if (contentEl) {
      children.push(contentEl);
    }
  }

  children.push(createElement("xdr:clientData", {}, []));

  return createElement("xdr:twoCellAnchor", attrs, children);
}

function serializeOneCellAnchor(anchor: XlsxOneCellAnchor): XmlElement {
  const children: XmlNode[] = [
    serializeCellAnchorOffset("xdr:from", anchor.from),
    serializeExtent(anchor.ext),
  ];

  if (anchor.content) {
    const contentEl = serializeDrawingContent(anchor.content);
    if (contentEl) {
      children.push(contentEl);
    }
  }

  children.push(createElement("xdr:clientData", {}, []));

  return createElement("xdr:oneCellAnchor", {}, children);
}

function serializeAbsoluteAnchor(anchor: XlsxAbsoluteAnchor): XmlElement {
  const children: XmlNode[] = [
    serializePosition(anchor.pos),
    serializeExtent(anchor.ext),
  ];

  if (anchor.content) {
    const contentEl = serializeDrawingContent(anchor.content);
    if (contentEl) {
      children.push(contentEl);
    }
  }

  children.push(createElement("xdr:clientData", {}, []));

  return createElement("xdr:absoluteAnchor", {}, children);
}

function serializeAnchor(anchor: XlsxDrawingAnchor): XmlElement {
  switch (anchor.type) {
    case "twoCellAnchor":
      return serializeTwoCellAnchor(anchor);
    case "oneCellAnchor":
      return serializeOneCellAnchor(anchor);
    case "absoluteAnchor":
      return serializeAbsoluteAnchor(anchor);
  }
}

// =============================================================================
// Main Drawing Serializer
// =============================================================================

/**
 * Serialize an XlsxDrawing to a wsDr XML element.
 *
 * @param drawing - The drawing to serialize
 * @returns XmlElement for the drawing
 *
 * @see ECMA-376 Part 4, Section 20.5.2.35 (wsDr)
 */
export function serializeDrawing(drawing: XlsxDrawing): XmlElement {
  const children: XmlNode[] = drawing.anchors.map(serializeAnchor);

  return createElement(
    "xdr:wsDr",
    {
      "xmlns:xdr": DRAWING_NS,
      "xmlns:a": DRAWINGML_NS,
      "xmlns:r": RELATIONSHIPS_NS,
    },
    children,
  );
}
