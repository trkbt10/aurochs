/**
 * @file Fill processing (solid, gradient, pattern, picture)
 *
 * @see ECMA-376 Part 1, Section 20.1.8 - Fill Properties
 */

import type { XmlElement } from "@oxen/xml";
import { isXmlElement, getChild, getChildren, getAttr, escapeXml } from "@oxen/xml";
import type { ColorResolveContext } from "../../domain/color/context";
import type { ResourceContext } from "../slide/context";
import { angleToDegrees } from "../../domain/unit-conversion";
import { base64ArrayBuffer } from "@oxen/buffer";
import { getMimeType } from "@oxen/files";
import { getSolidFill } from "./color";

// =============================================================================
// Parser-specific Fill Types
// =============================================================================

/**
 * Fill type enumeration (parser layer)
 *
 * Note: This is a parser-specific representation, not the domain Fill type.
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Fill Types)
 */
export type FillType =
  | "SOLID_FILL"
  | "GRADIENT_FILL"
  | "PIC_FILL"
  | "PATTERN_FILL"
  | "GROUP_FILL"
  | "NO_FILL"
  | "";

/**
 * Gradient fill data (parser layer)
 *
 * Note: This is a parser-specific representation for legacy rendering.
 * Domain code should use GradientFill from domain/color.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.33 (a:gradFill)
 */
export type GradientFill = {
  /** Color stops with position (in 1/100000 units) and hex color */
  readonly color: ReadonlyArray<{ readonly pos: string; readonly color: string }>;
  /** Rotation angle in degrees */
  readonly rot: number;
  /** Gradient type: 'linear' (default) or 'path' (radial/shape) */
  readonly type?: "linear" | "path";
  /**
   * Path gradient shade type (for type='path')
   * @see ECMA-376 Part 1, Section 20.1.8.46 (a:path)
   */
  readonly pathShadeType?: "circle" | "rect" | "shape";
  /**
   * Fill-to-rect for path gradients (in 1/100000 units)
   * @see ECMA-376 Part 1, Section 20.1.8.30 (a:fillToRect)
   */
  readonly fillToRect?: {
    readonly l: number;
    readonly t: number;
    readonly r: number;
    readonly b: number;
  };
};

/**
 * Fill result from parsing (parser layer)
 *
 * Can be:
 * - string: CSS color value (e.g., "#FF0000")
 * - GradientFill: Gradient data
 * - null: No fill / transparent
 */
export type FillResult = string | GradientFill | null;

// =============================================================================
// Fill Element Keys (ECMA-376)
// =============================================================================

/**
 * All fill element keys per ECMA-376 Part 1, Section 20.1.8
 */
export const FILL_ELEMENT_KEYS = [
  "a:noFill",
  "a:solidFill",
  "a:gradFill",
  "a:pattFill",
  "a:blipFill",
  "a:grpFill",
] as const;

export type FillElementKey = (typeof FILL_ELEMENT_KEYS)[number];

// =============================================================================
// Fill Handler Interface
// =============================================================================

/**
 * Unified handler for each fill type.
 * Provides XML key identification and formatting logic.
 */
type FillHandler = {
  /** XML element key (e.g., "a:solidFill") */
  readonly xmlKey: string;
  /** Fill type identifier */
  readonly type: FillType;
  /** Format fill data for CSS or SVG output */
  format: (fillColor: unknown, isSvgMode: boolean) => FillResult;
};

/**
 * Determine the fill type of a node
 */
export function getFillType(node: unknown): FillType {
  if (node === undefined || node === null) {
    return "";
  }

  if (!isXmlElement(node)) {
    return "";
  }

  const handler = findHandlerByXmlKey(node);
  if (handler === undefined) {
    return "";
  }

  return handler.type;
}

/**
 * Find fill element in XmlElement
 */
export function findFillElement(node: XmlElement): { key: FillElementKey; element: XmlElement } | undefined {
  for (const key of FILL_ELEMENT_KEYS) {
    const element = getChild(node, key);
    if (element !== undefined) {
      return { key, element };
    }
  }
  return undefined;
}

/**
 * Get gradient fill colors and rotation
 *
 * @param node - Gradient fill element (a:gradFill)
 * @param colorCtx - Color resolution context
 * @param phClr - Placeholder color to substitute for phClr in gradient stops
 *
 * @see ECMA-376 Part 1, Section 20.1.8.33 (a:gradFill)
 */
export function getGradientFill(node: unknown, colorCtx: ColorResolveContext, phClr?: string): GradientFill {
  if (!isXmlElement(node)) {
    return { color: [], rot: 0 };
  }

  const gsLst = getChild(node, "a:gsLst");
  const gsNodes = gsLst !== undefined ? getChildren(gsLst, "a:gs") : [];

  const colorArray: Array<{ pos: string; color: string }> = [];

  for (let i = 0; i < gsNodes.length; i++) {
    const gsNode = gsNodes[i];
    const color = getSolidFill(gsNode, phClr, colorCtx) ?? "";
    const pos = getAttr(gsNode, "pos");
    colorArray.push({
      pos: pos ?? String((i / (gsNodes.length - 1)) * 100000),
      color,
    });
  }

  // Check for path gradient (radial/shape)
  const pathGradient = parsePathGradient(node);
  if (pathGradient !== null) {
    return {
      color: colorArray,
      rot: 0,
      type: "path",
      pathShadeType: pathGradient.pathShadeType,
      fillToRect: pathGradient.fillToRect,
    };
  }

  // Linear gradient
  const rot = getGradientRotation(node);

  return {
    color: colorArray,
    rot,
    type: "linear",
  };
}

function parsePathGradient(gradFill: XmlElement): {
  pathShadeType: "circle" | "rect" | "shape";
  fillToRect?: { l: number; t: number; r: number; b: number };
} | null {
  const pathNode = getChild(gradFill, "a:path");
  if (pathNode === undefined) {
    return null;
  }

  const pathAttr = getAttr(pathNode, "path");
  const pathShadeType = (pathAttr as "circle" | "rect" | "shape" | undefined) ?? "circle";

  // Get fill-to-rect if present
  const fillToRect = parseFillToRect(pathNode);

  return { pathShadeType, fillToRect };
}

function parseFillToRect(pathNode: XmlElement): { l: number; t: number; r: number; b: number } | undefined {
  const fillToRectNode = getChild(pathNode, "a:fillToRect");
  if (fillToRectNode === undefined) {
    return undefined;
  }
  return {
    l: parseInt(getAttr(fillToRectNode, "l") ?? "0", 10),
    t: parseInt(getAttr(fillToRectNode, "t") ?? "0", 10),
    r: parseInt(getAttr(fillToRectNode, "r") ?? "0", 10),
    b: parseInt(getAttr(fillToRectNode, "b") ?? "0", 10),
  };
}

function getGradientRotation(gradFill: XmlElement): number {
  const lin = getChild(gradFill, "a:lin");
  if (lin === undefined) {
    return 0;
  }
  return angleToDegrees(getAttr(lin, "ang") ?? "0") + 90;
}

/**
 * Get picture fill using ResourceContext
 */
export function getPicFillFromContext(node: unknown, resourceCtx: ResourceContext): string | undefined {
  if (!isXmlElement(node)) {
    return undefined;
  }

  const blip = getChild(node, "a:blip");
  const rId = blip !== undefined ? getAttr(blip, "r:embed") : undefined;
  if (rId === undefined) {
    return undefined;
  }

  const rawImgPath = resourceCtx.resolveResource(rId);
  if (rawImgPath === undefined) {
    return undefined;
  }

  const imgPath = escapeXml(rawImgPath);
  const imgExt = imgPath.split(".").pop() ?? "";
  if (imgExt === "xml") {
    return undefined;
  }

  const imgArrayBuffer = resourceCtx.readFile(imgPath);
  if (imgArrayBuffer === null) {
    return undefined;
  }

  const imgMimeType = getMimeType(imgExt);
  return "data:" + imgMimeType + ";base64," + base64ArrayBuffer(imgArrayBuffer);
}

/**
 * Get pattern fill (CSS gradient patterns)
 */
export function getPatternFill(node: unknown, colorCtx: ColorResolveContext): [string, string?, string?] {
  if (!isXmlElement(node)) {
    return [""];
  }

  const bgClr = getChild(node, "a:bgClr");
  const fgClr = getChild(node, "a:fgClr");
  const prst = getAttr(node, "prst") ?? "";

  const fgColor = getSolidFill(fgClr, undefined, colorCtx) ?? "";
  const bgColor = getSolidFill(bgClr, undefined, colorCtx) ?? "";

  return getLinearGradient(prst, bgColor, fgColor);
}

/**
 * Detect image fill mode from blipFill element
 * - a:stretch → "stretch" (fill without preserving aspect ratio)
 * - a:tile → "tile" (tile the image)
 * - default → "cover" (scale to cover)
 */
export function detectImageFillMode(node: unknown): "stretch" | "tile" | "cover" {
  if (!isXmlElement(node)) {
    return "cover";
  }

  // Check for stretch mode
  if (getChild(node, "a:stretch") !== undefined) {
    return "stretch";
  }
  // Check for tile mode
  if (getChild(node, "a:tile") !== undefined) {
    return "tile";
  }
  // Default to cover
  return "cover";
}

type PatternRenderer = (fg: string, bg: string) => [string, string?, string?];

const PATTERN_RENDERERS: Record<string, PatternRenderer> = {
  smGrid: (fg, bg) => [
    `linear-gradient(to right, #${fg} -1px, transparent 1px), ` +
      `linear-gradient(to bottom, #${fg} -1px, transparent 1px) #${bg};`,
    "4px 4px",
  ],
  dotGrid: (fg, bg) => [
    `linear-gradient(to right, #${fg} -1px, transparent 1px), ` +
      `linear-gradient(to bottom, #${fg} -1px, transparent 1px) #${bg};`,
    "8px 8px",
  ],
  lgGrid: (fg, bg) => [
    `linear-gradient(to right, #${fg} -1px, transparent 1.5px), ` +
      `linear-gradient(to bottom, #${fg} -1px, transparent 1.5px) #${bg};`,
    "8px 8px",
  ],
  wdUpDiag: (fg, bg) => [`repeating-linear-gradient(-45deg, transparent 1px, transparent 4px, #${fg} 7px) #${bg};`],
  dkUpDiag: (fg, bg) => [`repeating-linear-gradient(-45deg, transparent 1px, #${bg} 5px) #${fg};`],
  ltUpDiag: (fg, bg) => [`repeating-linear-gradient(-45deg, transparent 1px, transparent 2px, #${fg} 4px) #${bg};`],
  wdDnDiag: (fg, bg) => [`repeating-linear-gradient(45deg, transparent 1px, transparent 4px, #${fg} 7px) #${bg};`],
  dkDnDiag: (fg, bg) => [`repeating-linear-gradient(45deg, transparent 1px, #${bg} 5px) #${fg};`],
  ltDnDiag: (fg, bg) => [`repeating-linear-gradient(45deg, transparent 1px, transparent 2px, #${fg} 4px) #${bg};`],
  dkHorz: (fg, bg) => [`repeating-linear-gradient(0deg, transparent 1px, transparent 2px, #${bg} 7px) #${fg};`],
  ltHorz: (fg, bg) => [`repeating-linear-gradient(0deg, transparent 1px, transparent 5px, #${fg} 7px) #${bg};`],
  narHorz: (fg, bg) => [`repeating-linear-gradient(0deg, transparent 1px, transparent 2px, #${fg} 4px) #${bg};`],
  dkVert: (fg, bg) => [`repeating-linear-gradient(90deg, transparent 1px, transparent 2px, #${bg} 7px) #${fg};`],
  ltVert: (fg, bg) => [`repeating-linear-gradient(90deg, transparent 1px, transparent 5px, #${fg} 7px) #${bg};`],
  narVert: (fg, bg) => [`repeating-linear-gradient(90deg, transparent 1px, transparent 2px, #${fg} 4px) #${bg};`],
  lgCheck: (fg, bg) => [
    `linear-gradient(45deg, #${fg} 25%, transparent 0, transparent 75%, #${fg} 0), ` +
      `linear-gradient(45deg, #${fg} 25%, transparent 0, transparent 75%, #${fg} 0) #${bg};`,
    "8px 8px",
    "0 0, 4px 4px, 4px 4px, 8px 8px",
  ],
  smCheck: (fg, bg) => [
    `linear-gradient(45deg, #${fg} 25%, transparent 0, transparent 75%, #${fg} 0), ` +
      `linear-gradient(45deg, #${fg} 25%, transparent 0, transparent 75%, #${fg} 0) #${bg};`,
    "4px 4px",
    "0 0, 2px 2px, 2px 2px, 4px 4px",
  ],
  dashUpDiag: (fg, bg) => [
    `repeating-linear-gradient(152deg, #${fg}, #${fg} 5%, transparent 0, transparent 70%) #${bg};`,
    "4px 4px",
  ],
  dashDnDiag: (fg, bg) => [
    `repeating-linear-gradient(45deg, #${fg}, #${fg} 5%, transparent 0, transparent 70%) #${bg};`,
    "4px 4px",
  ],
  dashHorz: (fg, bg) => [
    `repeating-linear-gradient(90deg, #${fg}, #${fg} 5%, transparent 0, transparent 70%) #${bg};`,
    "4px 4px",
  ],
  dashVert: (fg, bg) => [
    `repeating-linear-gradient(0deg, #${fg}, #${fg} 5%, transparent 0, transparent 70%) #${bg};`,
    "4px 4px",
  ],
};

const PCT_PATTERNS: Record<string, [string, string, string]> = {
  pct5: ["0.05px", "100%", "2px 2px"],
  pct10: ["0.1px", "100%", "2px 2px"],
  pct20: ["0.2px", "100%", "2px 2px"],
  pct25: ["0.25px", "100%", "2px 2px"],
  pct30: ["0.35px", "100%", "2px 2px"],
  pct40: ["0.45px", "100%", "2px 2px"],
  pct50: ["0.5px", "100%", "2px 2px"],
  pct60: ["0.55px", "100%", "2px 2px"],
  pct70: ["0.6px", "100%", "2px 2px"],
  pct75: ["0.65px", "100%", "2px 2px"],
  pct80: ["0.85px", "100%", "2px 2px"],
  pct90: ["1px", "100%", "2px 2px"],
};

/**
 * Get linear gradient CSS for pattern fills
 */
export function getLinearGradient(prst: string, bgColor: string, fgColor: string): [string, string?, string?] {
  const renderer = PATTERN_RENDERERS[prst];
  if (renderer !== undefined) {
    return renderer(fgColor, bgColor);
  }

  const pctPattern = PCT_PATTERNS[prst];
  if (pctPattern !== undefined) {
    return [`radial-gradient(#${fgColor} ${pctPattern[0]}, transparent ${pctPattern[1]}) #${bgColor};`, pctPattern[2]];
  }

  return ["#" + bgColor];
}

// =============================================================================
// Fill Handlers - Each fill type's operations consolidated in one place
// =============================================================================

/**
 * Solid fill handler
 * Handles: a:solidFill
 */
const SOLID_FILL_HANDLER: FillHandler = {
  xmlKey: "a:solidFill",
  type: "SOLID_FILL",
  format: (fillColor, isSvgMode) => {
    if (isSvgMode) {
      return `#${fillColor}`;
    }
    return `background-color: #${fillColor};`;
  },
};

/**
 * Gradient fill handler
 * Handles: a:gradFill
 */
const GRADIENT_FILL_HANDLER: FillHandler = {
  xmlKey: "a:gradFill",
  type: "GRADIENT_FILL",
  format: (fillColor, isSvgMode) => {
    const gradFill = fillColor as GradientFill;
    if (isSvgMode) {
      return gradFill;
    }
    const colorStops = gradFill.color.map((c) => `#${c.color}`).join(", ");
    return `background: linear-gradient(${gradFill.rot}deg,${colorStops});`;
  },
};

/**
 * Pattern fill handler
 * Handles: a:pattFill
 */
const PATTERN_FILL_HANDLER: FillHandler = {
  xmlKey: "a:pattFill",
  type: "PATTERN_FILL",
  format: (fillColor) => {
    const patternFill = fillColor as [string, string?, string?];
    const parts = [`background: ${patternFill[0]}`];
    if (patternFill[1]) {
      parts.push(` background-size:${patternFill[1]};`);
    }
    if (patternFill[2]) {
      parts.push(` background-position:${patternFill[2]};`);
    }
    return parts.join("");
  },
};

/**
 * Picture fill handler
 * Handles: a:blipFill
 */
const PIC_FILL_HANDLER: FillHandler = {
  xmlKey: "a:blipFill",
  type: "PIC_FILL",
  format: (fillColor, isSvgMode) => {
    if (isSvgMode) {
      return fillColor as string;
    }
    return `background-image:url(${fillColor});`;
  },
};

/**
 * No fill handler
 * Handles: a:noFill
 */
const NO_FILL_HANDLER: FillHandler = {
  xmlKey: "a:noFill",
  type: "NO_FILL",
  format: (_, isSvgMode) => (isSvgMode ? "none" : ""),
};

/**
 * Group fill handler (placeholder - actual processing is recursive)
 * Handles: a:grpFill
 */
const GROUP_FILL_HANDLER: FillHandler = {
  xmlKey: "a:grpFill",
  type: "GROUP_FILL",
  format: () => "",
};

// =============================================================================
// Fill Handler Registry
// =============================================================================

/** All fill handlers indexed by XML key */
const FILL_HANDLERS_BY_XML_KEY: Record<string, FillHandler> = {
  "a:noFill": NO_FILL_HANDLER,
  "a:solidFill": SOLID_FILL_HANDLER,
  "a:gradFill": GRADIENT_FILL_HANDLER,
  "a:pattFill": PATTERN_FILL_HANDLER,
  "a:blipFill": PIC_FILL_HANDLER,
  "a:grpFill": GROUP_FILL_HANDLER,
};

/** All fill handlers indexed by fill type */
const FILL_HANDLERS_BY_TYPE: Record<string, FillHandler> = {
  NO_FILL: NO_FILL_HANDLER,
  SOLID_FILL: SOLID_FILL_HANDLER,
  GRADIENT_FILL: GRADIENT_FILL_HANDLER,
  PATTERN_FILL: PATTERN_FILL_HANDLER,
  PIC_FILL: PIC_FILL_HANDLER,
  GROUP_FILL: GROUP_FILL_HANDLER,
};

// =============================================================================
// Public Handler Access
// =============================================================================

/**
 * Get the handler for a specific fill type
 */
export function getFillHandler(fillType: FillType): FillHandler | undefined {
  return FILL_HANDLERS_BY_TYPE[fillType];
}

/**
 * Format fill result using the appropriate handler
 */
export function formatFillResult(fillType: FillType, fillColor: unknown, isSvgMode: boolean): FillResult {
  const handler = FILL_HANDLERS_BY_TYPE[fillType];
  if (handler === undefined) {
    return isSvgMode ? "none" : "";
  }
  return handler.format(fillColor, isSvgMode);
}

// =============================================================================
// Internal Helper Functions
// =============================================================================

/**
 * Find fill handler by examining the node.
 *
 * Handles two cases:
 * 1. Node is a container (e.g., p:bgPr) with fill element as child
 * 2. Node IS the fill element itself (e.g., from theme bgFillStyleLst)
 */
function findHandlerByXmlKey(nodeObj: XmlElement): FillHandler | undefined {
  // Check if the node itself is a fill element (case 2: from theme)
  const selfHandler = FILL_HANDLERS_BY_XML_KEY[nodeObj.name as FillElementKey];
  if (selfHandler !== undefined) {
    return selfHandler;
  }

  // Check for fill element as child (case 1: container like p:bgPr)
  for (const key of FILL_ELEMENT_KEYS) {
    if (getChild(nodeObj, key) !== undefined) {
      return FILL_HANDLERS_BY_XML_KEY[key];
    }
  }
  return undefined;
}
