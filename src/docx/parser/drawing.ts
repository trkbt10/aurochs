/**
 * @file DOCX Drawing Parser
 *
 * Parses drawing elements (w:drawing) containing inline and anchor images.
 *
 * @see ECMA-376 Part 1, Section 17.3.3.9 (drawing)
 * @see ECMA-376 Part 1, Section 20.4 (DrawingML - WordprocessingML Drawing)
 */

import { getTextContent, isXmlElement, type XmlElement } from "../../xml";
import { emu } from "../../ooxml/domain/units";
import { docxRelId } from "../domain/types";
import type {
  DocxDrawing,
  DocxInlineDrawing,
  DocxAnchorDrawing,
  DocxExtent,
  DocxEffectExtent,
  DocxNonVisualDrawingProps,
  DocxPicture,
  DocxBlipFill,
  DocxBlip,
  DocxShapeProperties,
  DocxPositionH,
  DocxPositionV,
  DocxWrapType,
} from "../domain/drawing";

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
 * Parse integer attribute.
 */
function parseIntAttr(element: XmlElement, attrName: string): number | undefined {
  const value = element.attrs[attrName];
  if (value === undefined) {
    return undefined;
  }
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/**
 * Parse boolean attribute.
 */
function parseBoolAttr(element: XmlElement, attrName: string): boolean | undefined {
  const value = element.attrs[attrName];
  if (value === undefined) {
    return undefined;
  }
  return value === "1" || value === "true";
}

// =============================================================================
// Extent Parsing
// =============================================================================

/**
 * Parse extent element (wp:extent or a:ext).
 */
function parseExtent(element: XmlElement | undefined): DocxExtent {
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
function parseEffectExtent(element: XmlElement | undefined): DocxEffectExtent | undefined {
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
function parseDocPr(element: XmlElement | undefined): DocxNonVisualDrawingProps {
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
function parseBlip(element: XmlElement | undefined): DocxBlip | undefined {
  if (element === undefined) {
    return undefined;
  }

  // Relationship IDs have namespace prefix
  const rEmbed = element.attrs["r:embed"] ?? element.attrs.embed;
  const rLink = element.attrs["r:link"] ?? element.attrs.link;

  return {
    rEmbed: rEmbed !== undefined ? docxRelId(rEmbed) : undefined,
    rLink: rLink !== undefined ? docxRelId(rLink) : undefined,
    cstate: element.attrs.cstate as DocxBlip["cstate"],
  };
}

/**
 * Parse blip fill element (pic:blipFill).
 */
function parseBlipFill(element: XmlElement | undefined): DocxBlipFill | undefined {
  if (element === undefined) {
    return undefined;
  }

  const blipEl = getChildByLocalName(element, "blip");
  const stretchEl = getChildByLocalName(element, "stretch");
  const srcRectEl = getChildByLocalName(element, "srcRect");

  return {
    blip: parseBlip(blipEl),
    stretch: stretchEl !== undefined,
    srcRect: srcRectEl !== undefined ? {
      l: parseIntAttr(srcRectEl, "l"),
      t: parseIntAttr(srcRectEl, "t"),
      r: parseIntAttr(srcRectEl, "r"),
      b: parseIntAttr(srcRectEl, "b"),
    } : undefined,
  };
}

// =============================================================================
// Shape Properties Parsing
// =============================================================================

/**
 * Parse shape properties element (pic:spPr).
 */
function parseSpPr(element: XmlElement | undefined): DocxShapeProperties | undefined {
  if (element === undefined) {
    return undefined;
  }

  const xfrmEl = getChildByLocalName(element, "xfrm");
  const prstGeomEl = getChildByLocalName(element, "prstGeom");

  return {
    xfrm: xfrmEl !== undefined ? {
      rot: parseIntAttr(xfrmEl, "rot"),
      flipH: parseBoolAttr(xfrmEl, "flipH"),
      flipV: parseBoolAttr(xfrmEl, "flipV"),
    } : undefined,
    prstGeom: prstGeomEl?.attrs.prst,
  };
}

// =============================================================================
// Picture Parsing
// =============================================================================

/**
 * Parse picture element (pic:pic).
 */
function parsePicture(element: XmlElement | undefined): DocxPicture | undefined {
  if (element === undefined) {
    return undefined;
  }

  const nvPicPrEl = getChildByLocalName(element, "nvPicPr");
  const cNvPrEl = nvPicPrEl !== undefined ? getChildByLocalName(nvPicPrEl, "cNvPr") : undefined;
  const blipFillEl = getChildByLocalName(element, "blipFill");
  const spPrEl = getChildByLocalName(element, "spPr");

  return {
    nvPicPr: nvPicPrEl !== undefined ? {
      cNvPr: cNvPrEl !== undefined ? parseDocPr(cNvPrEl) : undefined,
    } : undefined,
    blipFill: parseBlipFill(blipFillEl),
    spPr: parseSpPr(spPrEl),
  };
}

// =============================================================================
// Position Parsing
// =============================================================================

/**
 * Parse horizontal position element (wp:positionH).
 */
function parsePositionH(element: XmlElement | undefined): DocxPositionH | undefined {
  if (element === undefined) {
    return undefined;
  }

  const relativeFrom = element.attrs.relativeFrom as DocxPositionH["relativeFrom"];
  const posOffsetEl = getChildByLocalName(element, "posOffset");
  const alignEl = getChildByLocalName(element, "align");

  return {
    relativeFrom: relativeFrom ?? "column",
    posOffset: posOffsetEl !== undefined ? parseInt(getTextContent(posOffsetEl) ?? "0", 10) : undefined,
    align: alignEl !== undefined ? getTextContent(alignEl) as DocxPositionH["align"] : undefined,
  };
}

/**
 * Parse vertical position element (wp:positionV).
 */
function parsePositionV(element: XmlElement | undefined): DocxPositionV | undefined {
  if (element === undefined) {
    return undefined;
  }

  const relativeFrom = element.attrs.relativeFrom as DocxPositionV["relativeFrom"];
  const posOffsetEl = getChildByLocalName(element, "posOffset");
  const alignEl = getChildByLocalName(element, "align");

  return {
    relativeFrom: relativeFrom ?? "paragraph",
    posOffset: posOffsetEl !== undefined ? parseInt(getTextContent(posOffsetEl) ?? "0", 10) : undefined,
    align: alignEl !== undefined ? getTextContent(alignEl) as DocxPositionV["align"] : undefined,
  };
}

// =============================================================================
// Wrap Parsing
// =============================================================================

/**
 * Parse wrap element.
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
        return { type: "square", wrapText: child.attrs.wrapText as DocxWrapType["type"] extends "square" ? DocxWrapType["type"] : never };
      case "wrapTight":
        return { type: "tight", wrapText: child.attrs.wrapText as DocxWrapType["type"] extends "tight" ? DocxWrapType["type"] : never };
      case "wrapThrough":
        return { type: "through", wrapText: child.attrs.wrapText as DocxWrapType["type"] extends "through" ? DocxWrapType["type"] : never };
    }
  }
  return undefined;
}

// =============================================================================
// Inline Drawing Parsing
// =============================================================================

/**
 * Parse inline drawing element (wp:inline).
 */
function parseInlineDrawing(element: XmlElement): DocxInlineDrawing {
  const extentEl = getChildByLocalName(element, "extent");
  const effectExtentEl = getChildByLocalName(element, "effectExtent");
  const docPrEl = getChildByLocalName(element, "docPr");

  // Find the graphic element and extract the picture
  const graphicEl = getChildByLocalName(element, "graphic");
  const graphicDataEl = graphicEl !== undefined ? getChildByLocalName(graphicEl, "graphicData") : undefined;
  const picEl = graphicDataEl !== undefined ? getChildByLocalName(graphicDataEl, "pic") : undefined;

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
  };
}

// =============================================================================
// Anchor Drawing Parsing
// =============================================================================

/**
 * Parse anchor drawing element (wp:anchor).
 */
function parseAnchorDrawing(element: XmlElement): DocxAnchorDrawing {
  const extentEl = getChildByLocalName(element, "extent");
  const effectExtentEl = getChildByLocalName(element, "effectExtent");
  const docPrEl = getChildByLocalName(element, "docPr");
  const positionHEl = getChildByLocalName(element, "positionH");
  const positionVEl = getChildByLocalName(element, "positionV");

  // Find the graphic element and extract the picture
  const graphicEl = getChildByLocalName(element, "graphic");
  const graphicDataEl = graphicEl !== undefined ? getChildByLocalName(graphicEl, "graphicData") : undefined;
  const picEl = graphicDataEl !== undefined ? getChildByLocalName(graphicDataEl, "pic") : undefined;

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
  };
}

// =============================================================================
// Main Drawing Parser
// =============================================================================

/**
 * Parse drawing element (w:drawing).
 *
 * @param element - The w:drawing XML element
 * @returns The parsed drawing, or undefined if invalid
 */
export function parseDrawing(element: XmlElement): DocxDrawing | undefined {
  // Find inline or anchor child
  for (const child of element.children) {
    if (!isXmlElement(child)) {
      continue;
    }

    const localName = getLocalName(child.name);

    if (localName === "inline") {
      return parseInlineDrawing(child);
    }

    if (localName === "anchor") {
      return parseAnchorDrawing(child);
    }
  }

  return undefined;
}
