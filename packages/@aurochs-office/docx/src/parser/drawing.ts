/**
 * @file DOCX Drawing Parser
 *
 * Parses drawing elements (w:drawing) containing inline and anchor images.
 *
 * @see ECMA-376 Part 1, Section 17.3.3.9 (drawing)
 * @see ECMA-376 Part 1, Section 20.4 (DrawingML - WordprocessingML Drawing)
 */

import { getTextContent, isXmlElement, type XmlElement } from "@aurochs/xml";
import { emu } from "@aurochs-office/drawing-ml/domain/units";
import { docxRelId } from "../domain/types";
import type {
  DrawingExtent,
  DrawingEffectExtent,
  DrawingBlip,
  DrawingBlipFill,
  DrawingPicture,
  NonVisualDrawingProps,
  DrawingShapeProperties,
} from "@aurochs-office/ooxml/domain/drawing";
import {
  parseInt32,
  parseBoolean as parseOoxmlBoolean,
  parseAlignH,
  parseAlignV,
  parseRelFromH,
  parseRelFromV,
  parseWrapText,
} from "@aurochs-office/ooxml/parser";
import type {
  DocxDrawing,
  DocxInlineDrawing,
  DocxAnchorDrawing,
  DocxPositionH,
  DocxPositionV,
  DocxWrapType,
  DocxWordprocessingShape,
  DocxTextBoxContent,
  DocxShapeStyle,
  DocxBodyProperties,
  DocxChart,
} from "../domain/drawing";
import { parseParagraph } from "./paragraph";
import type { DocxParseContext } from "./context";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get local name from potentially namespaced element name.
 */
function getLocalName(name: string): string {
  return name.split(":").pop() ?? name;
}

/**
 * Get child element by local name (ignoring namespace prefix).
 * This is necessary because OOXML uses various namespace prefixes (wp:, a:, pic:, etc.)
 */
function getChildByLocalName(element: XmlElement, localName: string): XmlElement | undefined {
  for (const child of element.children) {
    if (isXmlElement(child) && getLocalName(child.name) === localName) {
      return child;
    }
  }
  return undefined;
}

/**
 * Parse integer attribute using ooxml primitive.
 */
function parseIntAttr(element: XmlElement, attrName: string): number | undefined {
  return parseInt32(element.attrs[attrName]);
}

/**
 * Parse boolean attribute using ooxml primitive.
 */
function parseBoolAttr(element: XmlElement, attrName: string): boolean | undefined {
  return parseOoxmlBoolean(element.attrs[attrName]);
}

// =============================================================================
// Extent Parsing
// =============================================================================

/**
 * Parse extent element (wp:extent or a:ext).
 */
function parseExtent(element: XmlElement | undefined): DrawingExtent {
  if (element === undefined) {
    return { cx: emu(0), cy: emu(0) };
  }
  return {
    cx: emu(parseIntAttr(element, "cx") ?? 0),
    cy: emu(parseIntAttr(element, "cy") ?? 0),
  };
}

/**
 * Parse effect extent element (wp:effectExtent).
 */
function parseEffectExtent(element: XmlElement | undefined): DrawingEffectExtent | undefined {
  if (element === undefined) {
    return undefined;
  }
  return {
    l: emu(parseIntAttr(element, "l") ?? 0),
    t: emu(parseIntAttr(element, "t") ?? 0),
    r: emu(parseIntAttr(element, "r") ?? 0),
    b: emu(parseIntAttr(element, "b") ?? 0),
  };
}

// =============================================================================
// Non-Visual Properties Parsing
// =============================================================================

/**
 * Parse document properties element (wp:docPr).
 */
function parseDocPr(element: XmlElement | undefined): NonVisualDrawingProps {
  if (element === undefined) {
    return { id: 0, name: "" };
  }
  return {
    id: parseIntAttr(element, "id") ?? 0,
    name: element.attrs.name ?? "",
    descr: element.attrs.descr,
    title: element.attrs.title,
    hidden: parseBoolAttr(element, "hidden"),
  };
}

// =============================================================================
// Blip Fill Parsing
// =============================================================================

/**
 * Parse blip element (a:blip).
 */
function parseBlip(element: XmlElement | undefined): DrawingBlip | undefined {
  if (element === undefined) {
    return undefined;
  }

  // Relationship IDs have namespace prefix
  const rEmbed = element.attrs["r:embed"] ?? element.attrs.embed;
  const rLink = element.attrs["r:link"] ?? element.attrs.link;

  return {
    rEmbed: rEmbed !== undefined ? docxRelId(rEmbed) : undefined,
    rLink: rLink !== undefined ? docxRelId(rLink) : undefined,
    cstate: element.attrs.cstate as DrawingBlip["cstate"],
  };
}

/**
 * Parse blip fill element (pic:blipFill).
 */
function parseBlipFill(element: XmlElement | undefined): DrawingBlipFill | undefined {
  if (element === undefined) {
    return undefined;
  }

  const blipEl = getChildByLocalName(element, "blip");
  const stretchEl = getChildByLocalName(element, "stretch");
  const srcRectEl = getChildByLocalName(element, "srcRect");

  function parseSrcRect(el: XmlElement | undefined): DrawingBlipFill["srcRect"] | undefined {
    if (!el) {
      return undefined;
    }
    return {
      l: parseIntAttr(el, "l"),
      t: parseIntAttr(el, "t"),
      r: parseIntAttr(el, "r"),
      b: parseIntAttr(el, "b"),
    };
  }

  return {
    blip: parseBlip(blipEl),
    stretch: stretchEl !== undefined,
    srcRect: parseSrcRect(srcRectEl),
  };
}

// =============================================================================
// Shape Properties Parsing
// =============================================================================

/**
 * Parse shape properties element (pic:spPr).
 */
function parseSpPr(element: XmlElement | undefined): DrawingShapeProperties | undefined {
  if (element === undefined) {
    return undefined;
  }

  const xfrmEl = getChildByLocalName(element, "xfrm");
  const prstGeomEl = getChildByLocalName(element, "prstGeom");

  function parseXfrm(el: XmlElement | undefined): DrawingShapeProperties["xfrm"] | undefined {
    if (!el) {
      return undefined;
    }
    return {
      rot: parseIntAttr(el, "rot"),
      flipH: parseBoolAttr(el, "flipH"),
      flipV: parseBoolAttr(el, "flipV"),
    };
  }

  return {
    xfrm: parseXfrm(xfrmEl),
    prstGeom: prstGeomEl?.attrs.prst,
  };
}

// =============================================================================
// Picture Parsing
// =============================================================================

/**
 * Parse picture element (pic:pic).
 */
function parsePicture(element: XmlElement | undefined): DrawingPicture | undefined {
  if (element === undefined) {
    return undefined;
  }

  const nvPicPrEl = getChildByLocalName(element, "nvPicPr");
  const cNvPrEl = nvPicPrEl !== undefined ? getChildByLocalName(nvPicPrEl, "cNvPr") : undefined;
  const blipFillEl = getChildByLocalName(element, "blipFill");
  const spPrEl = getChildByLocalName(element, "spPr");

  function parseNvPicPr(args: {
    readonly nvPicPrEl: XmlElement | undefined;
    readonly cNvPrEl: XmlElement | undefined;
  }): DrawingPicture["nvPicPr"] | undefined {
    const { nvPicPrEl, cNvPrEl } = args;
    if (!nvPicPrEl) {
      return undefined;
    }
    return {
      cNvPr: cNvPrEl !== undefined ? parseDocPr(cNvPrEl) : undefined,
    };
  }

  return {
    nvPicPr: parseNvPicPr({ nvPicPrEl, cNvPrEl }),
    blipFill: parseBlipFill(blipFillEl),
    spPr: parseSpPr(spPrEl),
  };
}

// =============================================================================
// Position Parsing
// =============================================================================

/**
 * Parse horizontal position element (wp:positionH).
 * Uses ooxml primitive parsers for type-safe enum parsing.
 */
function parsePositionH(element: XmlElement | undefined): DocxPositionH | undefined {
  if (element === undefined) {
    return undefined;
  }

  const relativeFrom = parseRelFromH(element.attrs.relativeFrom);
  const posOffsetEl = getChildByLocalName(element, "posOffset");
  const alignEl = getChildByLocalName(element, "align");

  return {
    relativeFrom: relativeFrom ?? "column",
    posOffset: posOffsetEl !== undefined ? parseInt32(getTextContent(posOffsetEl)) : undefined,
    align: alignEl !== undefined ? parseAlignH(getTextContent(alignEl).trim()) : undefined,
  };
}

/**
 * Parse vertical position element (wp:positionV).
 * Uses ooxml primitive parsers for type-safe enum parsing.
 */
function parsePositionV(element: XmlElement | undefined): DocxPositionV | undefined {
  if (element === undefined) {
    return undefined;
  }

  const relativeFrom = parseRelFromV(element.attrs.relativeFrom);
  const posOffsetEl = getChildByLocalName(element, "posOffset");
  const alignEl = getChildByLocalName(element, "align");

  return {
    relativeFrom: relativeFrom ?? "paragraph",
    posOffset: posOffsetEl !== undefined ? parseInt32(getTextContent(posOffsetEl)) : undefined,
    align: alignEl !== undefined ? parseAlignV(getTextContent(alignEl).trim()) : undefined,
  };
}

// =============================================================================
// Wrap Parsing
// =============================================================================

/**
 * Parse wrap element.
 * Uses ooxml parseWrapText for type-safe enum parsing.
 */
function parseWrap(inlineEl: XmlElement): DocxWrapType | undefined {
  for (const child of inlineEl.children) {
    if (!isXmlElement(child)) {
      continue;
    }
    const localName = getLocalName(child.name);

    switch (localName) {
      case "wrapNone":
        return { type: "none" };
      case "wrapTopAndBottom":
        return { type: "topAndBottom" };
      case "wrapSquare":
        return { type: "square", wrapText: parseWrapText(child.attrs.wrapText) };
      case "wrapTight":
        return { type: "tight", wrapText: parseWrapText(child.attrs.wrapText) };
      case "wrapThrough":
        return { type: "through", wrapText: parseWrapText(child.attrs.wrapText) };
    }
  }
  return undefined;
}

// =============================================================================
// Shape Parsing
// =============================================================================

/**
 * Parse body properties element (wps:bodyPr).
 */
function parseBodyPr(element: XmlElement | undefined): DocxBodyProperties | undefined {
  if (element === undefined) {
    return undefined;
  }

  return {
    rot: parseIntAttr(element, "rot"),
    wrap: element.attrs.wrap as DocxBodyProperties["wrap"],
    lIns: parseIntAttr(element, "lIns"),
    tIns: parseIntAttr(element, "tIns"),
    rIns: parseIntAttr(element, "rIns"),
    bIns: parseIntAttr(element, "bIns"),
    anchor: element.attrs.anchor as DocxBodyProperties["anchor"],
    anchorCtr: parseBoolAttr(element, "anchorCtr"),
    vert: element.attrs.vert as DocxBodyProperties["vert"],
    upright: parseBoolAttr(element, "upright"),
  };
}

/**
 * Parse shape style element (wps:style).
 */
function parseShapeStyle(element: XmlElement | undefined): DocxShapeStyle | undefined {
  if (element === undefined) {
    return undefined;
  }

  const lnRefEl = getChildByLocalName(element, "lnRef");
  const fillRefEl = getChildByLocalName(element, "fillRef");
  const effectRefEl = getChildByLocalName(element, "effectRef");
  const fontRefEl = getChildByLocalName(element, "fontRef");

  return {
    lnRef: lnRefEl !== undefined ? parseIntAttr(lnRefEl, "idx") : undefined,
    fillRef: fillRefEl !== undefined ? parseIntAttr(fillRefEl, "idx") : undefined,
    effectRef: effectRefEl !== undefined ? parseIntAttr(effectRefEl, "idx") : undefined,
    fontRef: fontRefEl !== undefined ? parseIntAttr(fontRefEl, "idx") : undefined,
  };
}

/**
 * Parse text box content element (wps:txbx).
 */
function parseTextBoxContent(
  element: XmlElement | undefined,
  context?: DocxParseContext,
): DocxTextBoxContent | undefined {
  if (element === undefined) {
    return undefined;
  }

  // The txbx contains a txbxContent element which contains paragraphs
  const txbxContentEl = getChildByLocalName(element, "txbxContent");
  if (txbxContentEl === undefined) {
    return undefined;
  }

  const paragraphs = [];
  for (const child of txbxContentEl.children) {
    if (isXmlElement(child) && getLocalName(child.name) === "p") {
      paragraphs.push(parseParagraph(child, context));
    }
  }

  return { content: paragraphs };
}

/**
 * Parse WordprocessingML Shape element (wps:wsp).
 */
function parseWordprocessingShape(
  element: XmlElement | undefined,
  context?: DocxParseContext,
): DocxWordprocessingShape | undefined {
  if (element === undefined) {
    return undefined;
  }

  const cNvPrEl = getChildByLocalName(element, "cNvPr");
  const spPrEl = getChildByLocalName(element, "spPr");
  const styleEl = getChildByLocalName(element, "style");
  const txbxEl = getChildByLocalName(element, "txbx");
  const bodyPrEl = getChildByLocalName(element, "bodyPr");

  return {
    cNvPr: cNvPrEl !== undefined ? parseDocPr(cNvPrEl) : undefined,
    spPr: parseSpPr(spPrEl),
    style: parseShapeStyle(styleEl),
    txbx: parseTextBoxContent(txbxEl, context),
    bodyPr: parseBodyPr(bodyPrEl),
  };
}

// =============================================================================
// Chart Parsing
// =============================================================================

/**
 * Parse chart element (c:chart).
 *
 * Charts are referenced by relationship ID. The actual chart data
 * is stored in a separate part (word/charts/chartN.xml).
 */
function parseChart(element: XmlElement | undefined): DocxChart | undefined {
  if (element === undefined) {
    return undefined;
  }

  // The r:id attribute contains the relationship ID
  const rId = element.attrs["r:id"] ?? element.attrs.id;
  if (rId === undefined) {
    return undefined;
  }

  return {
    type: "chart",
    rId,
  };
}

// =============================================================================
// Inline Drawing Parsing
// =============================================================================

/**
 * Parse inline drawing element (wp:inline).
 */
function parseInlineDrawing(element: XmlElement, context?: DocxParseContext): DocxInlineDrawing {
  const extentEl = getChildByLocalName(element, "extent");
  const effectExtentEl = getChildByLocalName(element, "effectExtent");
  const docPrEl = getChildByLocalName(element, "docPr");

  // Find the graphic element and extract the picture, shape, or chart
  const graphicEl = getChildByLocalName(element, "graphic");
  const graphicDataEl = graphicEl !== undefined ? getChildByLocalName(graphicEl, "graphicData") : undefined;
  const picEl = graphicDataEl !== undefined ? getChildByLocalName(graphicDataEl, "pic") : undefined;
  const wspEl = graphicDataEl !== undefined ? getChildByLocalName(graphicDataEl, "wsp") : undefined;
  const chartEl = graphicDataEl !== undefined ? getChildByLocalName(graphicDataEl, "chart") : undefined;

  return {
    type: "inline",
    distT: parseIntAttr(element, "distT"),
    distB: parseIntAttr(element, "distB"),
    distL: parseIntAttr(element, "distL"),
    distR: parseIntAttr(element, "distR"),
    extent: parseExtent(extentEl),
    effectExtent: parseEffectExtent(effectExtentEl),
    docPr: parseDocPr(docPrEl),
    pic: parsePicture(picEl),
    wsp: parseWordprocessingShape(wspEl, context),
    chart: parseChart(chartEl),
  };
}

// =============================================================================
// Anchor Drawing Parsing
// =============================================================================

/**
 * Parse anchor drawing element (wp:anchor).
 */
function parseAnchorDrawing(element: XmlElement, context?: DocxParseContext): DocxAnchorDrawing {
  const extentEl = getChildByLocalName(element, "extent");
  const effectExtentEl = getChildByLocalName(element, "effectExtent");
  const docPrEl = getChildByLocalName(element, "docPr");
  const positionHEl = getChildByLocalName(element, "positionH");
  const positionVEl = getChildByLocalName(element, "positionV");

  // Find the graphic element and extract the picture, shape, or chart
  const graphicEl = getChildByLocalName(element, "graphic");
  const graphicDataEl = graphicEl !== undefined ? getChildByLocalName(graphicEl, "graphicData") : undefined;
  const picEl = graphicDataEl !== undefined ? getChildByLocalName(graphicDataEl, "pic") : undefined;
  const wspEl = graphicDataEl !== undefined ? getChildByLocalName(graphicDataEl, "wsp") : undefined;
  const chartEl = graphicDataEl !== undefined ? getChildByLocalName(graphicDataEl, "chart") : undefined;

  return {
    type: "anchor",
    distT: parseIntAttr(element, "distT"),
    distB: parseIntAttr(element, "distB"),
    distL: parseIntAttr(element, "distL"),
    distR: parseIntAttr(element, "distR"),
    simplePos: parseBoolAttr(element, "simplePos"),
    allowOverlap: parseBoolAttr(element, "allowOverlap"),
    behindDoc: parseBoolAttr(element, "behindDoc"),
    locked: parseBoolAttr(element, "locked"),
    layoutInCell: parseBoolAttr(element, "layoutInCell"),
    relativeHeight: parseIntAttr(element, "relativeHeight"),
    positionH: parsePositionH(positionHEl),
    positionV: parsePositionV(positionVEl),
    extent: parseExtent(extentEl),
    effectExtent: parseEffectExtent(effectExtentEl),
    wrap: parseWrap(element),
    docPr: parseDocPr(docPrEl),
    pic: parsePicture(picEl),
    wsp: parseWordprocessingShape(wspEl, context),
    chart: parseChart(chartEl),
  };
}

// =============================================================================
// Main Drawing Parser
// =============================================================================

/**
 * Parse drawing element (w:drawing).
 *
 * @param element - The w:drawing XML element
 * @param context - Optional parse context
 * @returns The parsed drawing, or undefined if invalid
 */
export function parseDrawing(element: XmlElement, context?: DocxParseContext): DocxDrawing | undefined {
  // Find inline or anchor child
  for (const child of element.children) {
    if (!isXmlElement(child)) {
      continue;
    }

    const localName = getLocalName(child.name);

    if (localName === "inline") {
      return parseInlineDrawing(child, context);
    }

    if (localName === "anchor") {
      return parseAnchorDrawing(child, context);
    }
  }

  return undefined;
}
