/**
 * @file Fill parser
 *
 * Parses DrawingML fill elements to Fill domain objects.
 *
 * @see ECMA-376 Part 1, Section 20.1.8 - Fill Properties
 */

import type {
  BlipFill,
  Fill,
  GradientFill,
  GradientStop,
  GroupFill,
  LinearGradient,
  NoFill,
  PathGradient,
  PatternFill,
  SolidFill,
  StretchFill,
  StyleReference,
  TileFill,
  TileFlipMode,
} from "../../domain/index";
import { deg, pct, px } from "../../domain/types";
import {
  findChild,
  getAttr,
  getChild,
  getChildren,
  type XmlElement,
} from "../../../xml/index";
import { parseColorFromParent } from "./color-parser";
import {
  getAngleAttr,
  getBoolAttrOr,
  getEmuAttr,
  getPercent100kAttr,
  parseBlipCompression,
  parseRectAlignment,
} from "../primitive";

// =============================================================================
// Fill Type Detection
// =============================================================================

/** Fill element names */
const FILL_ELEMENT_NAMES = [
  "a:noFill",
  "a:solidFill",
  "a:gradFill",
  "a:blipFill",
  "a:pattFill",
  "a:grpFill",
] as const;

/**
 * Find fill element within a parent (e.g., spPr)
 */
export function findFillElement(parent: XmlElement): XmlElement | undefined {
  return findChild(parent, (child) =>
    FILL_ELEMENT_NAMES.includes(child.name as typeof FILL_ELEMENT_NAMES[number])
  );
}

// =============================================================================
// Individual Fill Parsers
// =============================================================================

/**
 * Parse no fill
 * @see ECMA-376 Part 1, Section 20.1.8.44
 */
function parseNoFill(): NoFill {
  return { type: "noFill" };
}

/**
 * Parse solid fill
 * @see ECMA-376 Part 1, Section 20.1.8.54
 *
 * ```xml
 * <a:solidFill>
 *   <a:srgbClr val="FF0000"/>
 * </a:solidFill>
 * ```
 */
function parseSolidFill(element: XmlElement): SolidFill | undefined {
  const color = parseColorFromParent(element);
  if (!color) {return undefined;}
  return { type: "solidFill", color };
}

/**
 * Parse gradient stop
 * @see ECMA-376 Part 1, Section 20.1.8.36
 *
 * ```xml
 * <a:gs pos="0">
 *   <a:srgbClr val="FF0000"/>
 * </a:gs>
 * ```
 */
function parseGradientStop(element: XmlElement): GradientStop | undefined {
  const pos = getPercent100kAttr(element, "pos");
  if (pos === undefined) {return undefined;}

  const color = parseColorFromParent(element);
  if (!color) {return undefined;}

  return { position: pos, color };
}

/**
 * Parse linear gradient properties
 * @see ECMA-376 Part 1, Section 20.1.8.41
 *
 * ```xml
 * <a:lin ang="5400000" scaled="1"/>
 * ```
 */
function parseLinearGradient(element: XmlElement): LinearGradient | undefined {
  const lin = getChild(element, "a:lin");
  if (!lin) {return undefined;}

  return {
    angle: getAngleAttr(lin, "ang") ?? deg(0),
    scaled: getBoolAttrOr(lin, "scaled", true),
  };
}

/**
 * Parse path gradient properties
 * @see ECMA-376 Part 1, Section 20.1.8.46
 *
 * ```xml
 * <a:path path="circle">
 *   <a:fillToRect l="50000" t="50000" r="50000" b="50000"/>
 * </a:path>
 * ```
 */
function parsePathGradient(element: XmlElement): PathGradient | undefined {
  const path = getChild(element, "a:path");
  if (!path) {return undefined;}

  const pathType = getAttr(path, "path") as "circle" | "rect" | "shape" | undefined;
  if (!pathType) {return undefined;}

  const fillToRect = getChild(path, "a:fillToRect");
  const fillRect = fillToRect ? parseFillToRect(fillToRect) : undefined;

  return { path: pathType, fillToRect: fillRect };
}

function parseFillToRect(fillToRect: XmlElement): NonNullable<PathGradient["fillToRect"]> {
  return {
    left: getPercent100kAttr(fillToRect, "l") ?? pct(0),
    top: getPercent100kAttr(fillToRect, "t") ?? pct(0),
    right: getPercent100kAttr(fillToRect, "r") ?? pct(0),
    bottom: getPercent100kAttr(fillToRect, "b") ?? pct(0),
  };
}

/**
 * Parse tile rectangle
 */
function parseTileRect(element: XmlElement): GradientFill["tileRect"] | undefined {
  const tileRect = getChild(element, "a:tileRect");
  if (!tileRect) {return undefined;}

  return {
    left: getPercent100kAttr(tileRect, "l") ?? pct(0),
    top: getPercent100kAttr(tileRect, "t") ?? pct(0),
    right: getPercent100kAttr(tileRect, "r") ?? pct(0),
    bottom: getPercent100kAttr(tileRect, "b") ?? pct(0),
  };
}

/**
 * Parse gradient fill
 * @see ECMA-376 Part 1, Section 20.1.8.33
 *
 * ```xml
 * <a:gradFill rotWithShape="1">
 *   <a:gsLst>
 *     <a:gs pos="0"><a:srgbClr val="FF0000"/></a:gs>
 *     <a:gs pos="100000"><a:srgbClr val="0000FF"/></a:gs>
 *   </a:gsLst>
 *   <a:lin ang="5400000" scaled="1"/>
 * </a:gradFill>
 * ```
 */
function parseGradientFill(element: XmlElement): GradientFill | undefined {
  // Parse gradient stops
  const gsLst = getChild(element, "a:gsLst");
  if (!gsLst) {return undefined;}

  const stops: GradientStop[] = [];
  for (const gs of getChildren(gsLst, "a:gs")) {
    const stop = parseGradientStop(gs);
    if (stop) {stops.push(stop);}
  }

  if (stops.length === 0) {return undefined;}

  // Sort by position
  stops.sort((a, b) => a.position - b.position);

  return {
    type: "gradientFill",
    stops,
    linear: parseLinearGradient(element),
    path: parsePathGradient(element),
    tileRect: parseTileRect(element),
    rotWithShape: getBoolAttrOr(element, "rotWithShape", true),
  };
}

/**
 * Parse stretch fill mode
 * @see ECMA-376 Part 1, Section 20.1.8.56
 */
function parseStretchFill(element: XmlElement): StretchFill | undefined {
  const stretch = getChild(element, "a:stretch");
  if (!stretch) {return undefined;}

  const fillRect = getChild(stretch, "a:fillRect");
  if (!fillRect) {return {};}

  return {
    fillRect: {
      left: getPercent100kAttr(fillRect, "l") ?? pct(0),
      top: getPercent100kAttr(fillRect, "t") ?? pct(0),
      right: getPercent100kAttr(fillRect, "r") ?? pct(0),
      bottom: getPercent100kAttr(fillRect, "b") ?? pct(0),
    },
  };
}

/**
 * Parse tile fill mode
 * @see ECMA-376 Part 1, Section 20.1.8.58
 */
function parseTileFillMode(element: XmlElement): TileFill | undefined {
  const tile = getChild(element, "a:tile");
  if (!tile) {return undefined;}

  const flip = getAttr(tile, "flip") as TileFlipMode | undefined;

  return {
    tx: getEmuAttr(tile, "tx") ?? px(0),
    ty: getEmuAttr(tile, "ty") ?? px(0),
    sx: getPercent100kAttr(tile, "sx") ?? pct(100),
    sy: getPercent100kAttr(tile, "sy") ?? pct(100),
    flip: flip ?? "none",
    alignment: parseRectAlignment(getAttr(tile, "algn")) ?? "tl",
  };
}

/**
 * Parse source rectangle
 */
function parseSourceRect(element: XmlElement): BlipFill["sourceRect"] | undefined {
  const srcRect = getChild(element, "a:srcRect");
  if (!srcRect) {return undefined;}

  return {
    left: getPercent100kAttr(srcRect, "l") ?? pct(0),
    top: getPercent100kAttr(srcRect, "t") ?? pct(0),
    right: getPercent100kAttr(srcRect, "r") ?? pct(0),
    bottom: getPercent100kAttr(srcRect, "b") ?? pct(0),
  };
}

/**
 * Parse blip (picture) fill
 * @see ECMA-376 Part 1, Section 20.1.8.14
 *
 * ```xml
 * <a:blipFill rotWithShape="1">
 *   <a:blip r:embed="rId1"/>
 *   <a:stretch>
 *     <a:fillRect/>
 *   </a:stretch>
 * </a:blipFill>
 * ```
 */
function parseBlipFill(element: XmlElement): BlipFill | undefined {
  const blip = getChild(element, "a:blip");
  if (!blip) {return undefined;}

  // Get resource ID (r:embed or r:link)
  const resourceId = getAttr(blip, "r:embed") ?? getAttr(blip, "r:link");
  if (!resourceId) {return undefined;}

  return {
    type: "blipFill",
    resourceId,
    compressionState: parseBlipCompression(getAttr(blip, "cstate")),
    stretch: parseStretchFill(element),
    tile: parseTileFillMode(element),
    sourceRect: parseSourceRect(element),
    rotWithShape: getBoolAttrOr(element, "rotWithShape", true),
  };
}

/**
 * Parse pattern fill
 * @see ECMA-376 Part 1, Section 20.1.8.47
 *
 * ```xml
 * <a:pattFill prst="pct5">
 *   <a:fgClr><a:srgbClr val="000000"/></a:fgClr>
 *   <a:bgClr><a:srgbClr val="FFFFFF"/></a:bgClr>
 * </a:pattFill>
 * ```
 */
function parsePatternFill(element: XmlElement): PatternFill | undefined {
  const preset = getAttr(element, "prst");
  if (!preset) {return undefined;}

  const fgClr = getChild(element, "a:fgClr");
  const bgClr = getChild(element, "a:bgClr");

  const foregroundColor = parseColorFromParent(fgClr);
  const backgroundColor = parseColorFromParent(bgClr);

  if (!foregroundColor || !backgroundColor) {return undefined;}

  return {
    type: "patternFill",
    preset,
    foregroundColor,
    backgroundColor,
  };
}

/**
 * Parse group fill
 * @see ECMA-376 Part 1, Section 20.1.8.35
 */
function parseGroupFill(): GroupFill {
  return { type: "groupFill" };
}

// =============================================================================
// Main Fill Parsing
// =============================================================================

/**
 * Parse fill element to Fill domain object
 */
export function parseFill(element: XmlElement | undefined): Fill | undefined {
  if (!element) {return undefined;}

  switch (element.name) {
    case "a:noFill":
      return parseNoFill();
    case "a:solidFill":
      return parseSolidFill(element);
    case "a:gradFill":
      return parseGradientFill(element);
    case "a:blipFill":
      return parseBlipFill(element);
    case "a:pattFill":
      return parsePatternFill(element);
    case "a:grpFill":
      return parseGroupFill();
    default:
      return undefined;
  }
}

/**
 * Parse fill from parent element (finds fill child automatically)
 */
export function parseFillFromParent(parent: XmlElement | undefined): Fill | undefined {
  if (!parent) {return undefined;}
  const fillEl = findFillElement(parent);
  return parseFill(fillEl);
}

/**
 * Resolve fill from style reference (a:fillRef)
 *
 * Per ECMA-376 Part 1, Section 20.1.4.2.10 (a:fillRef):
 * - idx attribute references fillStyleLst (1-based index)
 * - idx 1-3 reference fillStyleLst elements
 * - idx 1001+ reference bgFillStyleLst elements (idx - 1000)
 * - Child color element (e.g., a:schemeClr) overrides phClr in the style
 *
 * @see ECMA-376 Part 1, Section 20.1.4.2.10
 */
export function resolveFillFromStyleReference(
  fillRef: StyleReference | undefined,
  fillStyles: readonly XmlElement[],
): Fill | undefined {
  if (!fillRef || fillRef.index === 0) {return undefined;}

  // Determine which style list to use
  // idx 1-3: fillStyleLst (normal fills)
  // idx 1001+: bgFillStyleLst (background fills, idx - 1000)
  const styleIndex = resolveFillStyleIndex(fillRef.index);

  if (styleIndex < 0 || styleIndex >= fillStyles.length) {
    return undefined;
  }

  const styleElement = fillStyles[styleIndex];

  // Parse the style element as a fill
  // The style element is a fill type (solidFill, gradFill, etc.)
  const parsedFill = parseFill(styleElement);

  if (!parsedFill) {return undefined;}

  // If the fillRef specifies a color, use it to replace phClr
  if (fillRef.color) {
    // Replace phClr placeholder with the specified color
    return applyColorOverride(parsedFill, fillRef.color);
  }

  return parsedFill;
}

function resolveFillStyleIndex(index: number): number {
  if (index >= 1001) {
    // Background fill style (we don't have bgFillStyleLst in current context)
    // Fall back to regular fill styles for now
    return index - 1001;
  }
  return index - 1; // Convert to 0-based
}

/**
 * Apply color override from fillRef to a parsed fill.
 *
 * When a fillRef specifies a color (e.g., a:schemeClr val="accent1"),
 * this replaces any phClr (placeholder color) in the style with that color.
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.21 (a:phClr)
 */
function applyColorOverride(fill: Fill, overrideColor: Fill): Fill {
  // If the override is a solidFill, use its color for solidFill targets
  if (fill.type === "solidFill" && overrideColor.type === "solidFill") {
    // The fill from theme might have phClr; replace with override color
    return {
      type: "solidFill",
      color: overrideColor.color,
    };
  }

  // For gradient fills, we would need to replace phClr in each stop
  // This is complex; for now, if we have a solid override color,
  // use it for all phClr stops
  if (fill.type === "gradientFill" && overrideColor.type === "solidFill") {
    return {
      ...fill,
      stops: fill.stops.map((stop) => {
        // If the stop was using phClr (indicated by spec.type === "scheme" && spec.value === "phClr"),
        // replace it with the override color
        if (stop.color.spec.type === "scheme" && stop.color.spec.value === "phClr") {
          return {
            ...stop,
            color: overrideColor.color,
          };
        }
        return stop;
      }),
    };
  }

  // Return original fill if no override applies
  return fill;
}
