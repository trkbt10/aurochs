/**
 * @file Fill processing (solid, gradient, pattern, picture)
 *
 * @see src/pptx/ooxml/color.ts - Fill type definitions
 */

import type { FillType, GradientFill, FillResult } from "./types";
import type {
  OoxmlElement,
  FillElements,
  GradientFillElement,
  PatternFillElement,
  BlipFillElement,
  PathGradientElement,
  ShapeElement,
  GroupShapeElement,
} from "../../../ooxml/index";
import type { ColorResolveContext } from "../../../domain/resolution";
import type { ResourceContext, SlideRenderContext } from "../../../reader/slide/accessor";
import { angleToDegrees } from "../../units/conversion";
import { base64ArrayBuffer } from "../../../../buffer/index";
import { getMimeType } from "../../../../files/index";
import { escapeHtml } from "../../../../html/index";
import { getSolidFill } from "./color";

// =============================================================================
// Fill Handler Interface
// =============================================================================

/**
 * Shape node with fill properties
 */
type ShapeWithFill = ShapeElement | OoxmlElement;

/**
 * Unified handler for each fill type.
 * Consolidates XML key, extraction, and formatting logic in one place.
 */
type FillHandler = {
  /** XML element key (e.g., "a:solidFill") */
  readonly xmlKey: string;
  /** Fill type identifier */
  readonly type: FillType;
  /** Extract fill data from node */
  extract: (
    nodeObj: ShapeWithFill,
    ctx: SlideRenderContext,
    source: string,
  ) => unknown;
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

  const nodeObj = node as FillElements;
  const handler = findHandlerByXmlKey(nodeObj);

  if (handler === undefined) {
    return "";
  }

  return handler.type;
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
export function getGradientFill(
  node: unknown,
  colorCtx: ColorResolveContext,
  phClr?: string,
): GradientFill {
  const gradFill = node as GradientFillElement;
  const gsLst = gradFill["a:gsLst"];
  const gsNodes = gsLst?.["a:gs"];

  const colorArray: Array<{ pos: string; color: string }> = [];

  if (gsNodes !== undefined) {
    const stops = Array.isArray(gsNodes) ? gsNodes : [gsNodes];
    for (let i = 0; i < stops.length; i++) {
      const gsNode = stops[i];
      const color = getSolidFill(gsNode, phClr, colorCtx) ?? "";
      const pos = gsNode.attrs?.pos;
      colorArray.push({
        pos: pos ?? String((i / (stops.length - 1)) * 100000),
        color,
      });
    }
  }

  // Check for path gradient (radial/shape)
  const pathGradient = parsePathGradient(gradFill);
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
  const rot = getGradientRotation(gradFill);

  return {
    color: colorArray,
    rot,
    type: "linear",
  };
}

function parsePathGradient(gradFill: GradientFillElement): {
  pathShadeType: "circle" | "rect" | "shape";
  fillToRect?: { l: number; t: number; r: number; b: number };
} | null {
  const pathNode = gradFill["a:path"];
  if (pathNode === undefined) {
    return null;
  }

  const pathShadeType = (pathNode.attrs?.path as "circle" | "rect" | "shape" | undefined) ?? "circle";

  // Get fill-to-rect if present
  const fillToRect = parseFillToRect(pathNode);

  return { pathShadeType, fillToRect };
}

function parseFillToRect(
  pathNode: PathGradientElement,
): { l: number; t: number; r: number; b: number } | undefined {
  const fillToRectNode = pathNode["a:fillToRect"];
  const attrs = fillToRectNode?.attrs;
  if (attrs === undefined) {
    return undefined;
  }
  return {
    l: parseInt(attrs.l ?? "0", 10),
    t: parseInt(attrs.t ?? "0", 10),
    r: parseInt(attrs.r ?? "0", 10),
    b: parseInt(attrs.b ?? "0", 10),
  };
}

function getGradientRotation(gradFill: GradientFillElement): number {
  const lin = gradFill["a:lin"];
  if (lin === undefined) {
    return 0;
  }
  return angleToDegrees(lin.attrs?.ang ?? "0") + 90;
}

/**
 * Get picture fill using ResourceContext
 */
export function getPicFillFromContext(
  node: unknown,
  resourceCtx: ResourceContext,
): string | undefined {
  const blipFill = node as BlipFillElement;
  const blip = blipFill["a:blip"];
  const rId = blip?.attrs?.["r:embed"];
  if (rId === undefined) {
    return undefined;
  }

  const rawImgPath = resourceCtx.resolveResource(rId);
  if (rawImgPath === undefined) {
    return undefined;
  }

  const imgPath = escapeHtml(rawImgPath);
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
export function getPatternFill(
  node: unknown,
  colorCtx: ColorResolveContext,
): [string, string?, string?] {
  const pattFill = node as PatternFillElement;
  const bgClr = pattFill["a:bgClr"];
  const fgClr = pattFill["a:fgClr"];
  const prst = pattFill.attrs?.prst ?? "";

  const fgColor = getSolidFill(fgClr, undefined, colorCtx) ?? "";
  const bgColor = getSolidFill(bgClr, undefined, colorCtx) ?? "";

  return getLinearGradient(prst, bgColor, fgColor);
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
  wdUpDiag: (fg, bg) => [
    `repeating-linear-gradient(-45deg, transparent 1px, transparent 4px, #${fg} 7px) #${bg};`,
  ],
  dkUpDiag: (fg, bg) => [
    `repeating-linear-gradient(-45deg, transparent 1px, #${bg} 5px) #${fg};`,
  ],
  ltUpDiag: (fg, bg) => [
    `repeating-linear-gradient(-45deg, transparent 1px, transparent 2px, #${fg} 4px) #${bg};`,
  ],
  wdDnDiag: (fg, bg) => [
    `repeating-linear-gradient(45deg, transparent 1px, transparent 4px, #${fg} 7px) #${bg};`,
  ],
  dkDnDiag: (fg, bg) => [
    `repeating-linear-gradient(45deg, transparent 1px, #${bg} 5px) #${fg};`,
  ],
  ltDnDiag: (fg, bg) => [
    `repeating-linear-gradient(45deg, transparent 1px, transparent 2px, #${fg} 4px) #${bg};`,
  ],
  dkHorz: (fg, bg) => [
    `repeating-linear-gradient(0deg, transparent 1px, transparent 2px, #${bg} 7px) #${fg};`,
  ],
  ltHorz: (fg, bg) => [
    `repeating-linear-gradient(0deg, transparent 1px, transparent 5px, #${fg} 7px) #${bg};`,
  ],
  narHorz: (fg, bg) => [
    `repeating-linear-gradient(0deg, transparent 1px, transparent 2px, #${fg} 4px) #${bg};`,
  ],
  dkVert: (fg, bg) => [
    `repeating-linear-gradient(90deg, transparent 1px, transparent 2px, #${bg} 7px) #${fg};`,
  ],
  ltVert: (fg, bg) => [
    `repeating-linear-gradient(90deg, transparent 1px, transparent 5px, #${fg} 7px) #${bg};`,
  ],
  narVert: (fg, bg) => [
    `repeating-linear-gradient(90deg, transparent 1px, transparent 2px, #${fg} 4px) #${bg};`,
  ],
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
export function getLinearGradient(
  prst: string,
  bgColor: string,
  fgColor: string,
): [string, string?, string?] {
  const renderer = PATTERN_RENDERERS[prst];
  if (renderer !== undefined) {
    return renderer(fgColor, bgColor);
  }

  const pctPattern = PCT_PATTERNS[prst];
  if (pctPattern !== undefined) {
    return [
      `radial-gradient(#${fgColor} ${pctPattern[0]}, transparent ${pctPattern[1]}) #${bgColor};`,
      pctPattern[2],
    ];
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
  extract: (nodeObj, ctx) => {
    const shpFill = (nodeObj as ShapeElement)["p:spPr"]?.["a:solidFill"];
    return getSolidFill(shpFill, undefined, ctx.toColorContext());
  },
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
  extract: (nodeObj, ctx) => {
    const shpFill = (nodeObj as ShapeElement)["p:spPr"]?.["a:gradFill"];
    return getGradientFill(shpFill, ctx.toColorContext());
  },
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
  extract: (nodeObj, ctx) => {
    const shpFill = (nodeObj as ShapeElement)["p:spPr"]?.["a:pattFill"];
    return getPatternFill(shpFill, ctx.toColorContext());
  },
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
  extract: (nodeObj, ctx) => {
    const shpFill = (nodeObj as ShapeElement)["p:spPr"]?.["a:blipFill"];
    return getPicFillFromContext(shpFill, ctx.toResourceContext());
  },
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
  extract: () => undefined,
  format: (_, isSvgMode) => (isSvgMode ? "none" : ""),
};

/**
 * Group fill handler (placeholder - actual processing is recursive)
 * Handles: a:grpFill
 */
const GROUP_FILL_HANDLER: FillHandler = {
  xmlKey: "a:grpFill",
  type: "GROUP_FILL",
  extract: () => undefined,
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

const FILL_XML_KEYS = Object.keys(FILL_HANDLERS_BY_XML_KEY);

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
export function formatFillResult(
  fillType: FillType,
  fillColor: unknown,
  isSvgMode: boolean,
): FillResult {
  const handler = FILL_HANDLERS_BY_TYPE[fillType];
  if (handler === undefined) {
    return isSvgMode ? "none" : "";
  }
  return handler.format(fillColor, isSvgMode);
}

// =============================================================================
// Internal Helper Functions
// =============================================================================

function findHandlerByXmlKey(nodeObj: FillElements): FillHandler | undefined {
  const foundKey = FILL_XML_KEYS.find((key) => (nodeObj as Record<string, unknown>)[key] !== undefined);
  if (foundKey === undefined) {
    return undefined;
  }
  return FILL_HANDLERS_BY_XML_KEY[foundKey];
}

function extractFillColor(
  handler: FillHandler,
  nodeObj: ShapeWithFill,
  ctx: SlideRenderContext,
  source: string,
): unknown {
  return handler.extract(nodeObj, ctx, source);
}

function tryDrawingMLFillRef(
  nodeObj: ShapeElement,
  ctx: SlideRenderContext,
): { color: unknown; isEmpty: boolean } {
  const fillRef = nodeObj["p:style"]?.["a:fillRef"];
  const idx = parseInt(fillRef?.attrs?.idx ?? "0", 10);

  if (idx === 0 || idx === 1000) {
    return { color: undefined, isEmpty: true };
  }

  return { color: getSolidFill(fillRef, undefined, ctx.toColorContext()), isEmpty: false };
}

function tryGroupFill(
  nodeObj: ShapeElement,
  pNode: unknown,
  isSvgMode: boolean,
  ctx: SlideRenderContext,
  source: string,
): FillResult | undefined {
  const spPr = nodeObj["p:spPr"];
  // Check for group fill - spPr has FillElements which includes a:grpFill
  const grpFill = (spPr as FillElements | undefined)?.["a:grpFill"];
  if (grpFill === undefined) {
    return undefined;
  }
  const pNodeTyped = pNode as GroupShapeElement;
  const grpShpFill = pNodeTyped["p:grpSpPr"];
  const spShpNode = { "p:spPr": grpShpFill } as ShapeElement;
  return getShapeFill(spShpNode, nodeObj, isSvgMode, ctx, source);
}

function getEmptyFillResult(isSvgMode: boolean): FillResult {
  return NO_FILL_HANDLER.format(undefined, isSvgMode);
}

function getDefaultFillResult(isSvgMode: boolean): FillResult {
  if (isSvgMode) {
    return "none";
  }
  return "background-color: inherit;";
}

/**
 * Get shape fill (main entry point for fill processing)
 */
export function getShapeFill(
  node: unknown,
  pNode: unknown,
  isSvgMode: boolean,
  ctx: SlideRenderContext,
  source: string,
): FillResult {
  const nodeObj = node as ShapeElement;
  const spPr = nodeObj["p:spPr"];
  const handler = spPr !== undefined ? findHandlerByXmlKey(spPr as FillElements) : undefined;

  if (handler === undefined) {
    // No explicit fill found, try fallbacks
    return tryFallbackFills(nodeObj, pNode, isSvgMode, ctx, source);
  }

  if (handler.type === "NO_FILL") {
    return getEmptyFillResult(isSvgMode);
  }

  if (handler.type === "GROUP_FILL") {
    const groupFillResult = tryGroupFill(nodeObj, pNode, isSvgMode, ctx, source);
    if (groupFillResult !== undefined) {
      return groupFillResult;
    }
    return getDefaultFillResult(isSvgMode);
  }

  const fillColor = extractFillColor(handler, nodeObj, ctx, source);

  if (fillColor !== undefined) {
    return handler.format(fillColor, isSvgMode);
  }

  return tryFallbackFills(nodeObj, pNode, isSvgMode, ctx, source);
}

/**
 * Try fallback fill sources (drawingML ref, group fill)
 */
function tryFallbackFills(
  nodeObj: ShapeElement,
  pNode: unknown,
  isSvgMode: boolean,
  ctx: SlideRenderContext,
  source: string,
): FillResult {
  // Try drawingML namespace fill reference
  const drawingMLResult = tryDrawingMLFillRef(nodeObj, ctx);
  if (drawingMLResult.isEmpty) {
    return getEmptyFillResult(isSvgMode);
  }
  if (drawingMLResult.color !== undefined) {
    return SOLID_FILL_HANDLER.format(drawingMLResult.color, isSvgMode);
  }

  // Check for group fill
  const groupFillResult = tryGroupFill(nodeObj, pNode, isSvgMode, ctx, source);
  if (groupFillResult !== undefined) {
    return groupFillResult;
  }

  return getDefaultFillResult(isSvgMode);
}
