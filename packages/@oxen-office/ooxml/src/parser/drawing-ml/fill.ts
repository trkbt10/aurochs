/**
 * @file DrawingML fill parser (BaseFill)
 *
 * Parses DrawingML fill elements to OOXML BaseFill domain objects.
 * BlipFill is intentionally excluded as it requires format-specific resource handling.
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Fill Properties)
 */

import type { GradientFill, GradientStop, GroupFill, LinearGradient, NoFill, PathGradient, PatternFill, PatternType, SolidFill } from "../../domain/fill";
import type { BaseFill } from "../../domain/fill";
import { deg, pct } from "../../domain/units";
import {
  findChild,
  getAttr,
  getChild,
  getChildren,
  type XmlElement,
} from "@oxen/xml";
import { parseColorFromParent } from "./color";
import {
  getAngleAttr,
  getBoolAttrOr,
  getPercent100kAttr,
} from "../primitive";

const FILL_ELEMENT_NAMES = [
  "a:noFill",
  "a:solidFill",
  "a:gradFill",
  "a:blipFill",
  "a:pattFill",
  "a:grpFill",
] as const;






export function findFillElement(parent: XmlElement): XmlElement | undefined {
  return findChild(parent, (child) =>
    FILL_ELEMENT_NAMES.includes(child.name as typeof FILL_ELEMENT_NAMES[number]),
  );
}

function parseNoFill(): NoFill {
  return { type: "noFill" };
}

function parseSolidFill(element: XmlElement): SolidFill | undefined {
  const color = parseColorFromParent(element);
  if (!color) {return undefined;}
  return { type: "solidFill", color };
}

function parseGradientStop(element: XmlElement): GradientStop | undefined {
  const pos = getPercent100kAttr(element, "pos");
  if (pos === undefined) {return undefined;}

  const color = parseColorFromParent(element);
  if (!color) {return undefined;}

  return { position: pos, color };
}

function parseLinearGradient(element: XmlElement): LinearGradient | undefined {
  const lin = getChild(element, "a:lin");
  if (!lin) {return undefined;}

  return {
    angle: getAngleAttr(lin, "ang") ?? deg(0),
    scaled: getBoolAttrOr(lin, "scaled", true),
  };
}

function parseFillToRect(fillToRect: XmlElement): NonNullable<PathGradient["fillToRect"]> {
  return {
    left: getPercent100kAttr(fillToRect, "l") ?? pct(0),
    top: getPercent100kAttr(fillToRect, "t") ?? pct(0),
    right: getPercent100kAttr(fillToRect, "r") ?? pct(0),
    bottom: getPercent100kAttr(fillToRect, "b") ?? pct(0),
  };
}

function parsePathGradient(element: XmlElement): PathGradient | undefined {
  const path = getChild(element, "a:path");
  if (!path) {return undefined;}

  const pathType = getAttr(path, "path") as "circle" | "rect" | "shape" | undefined;
  if (!pathType) {return undefined;}

  const fillToRect = getChild(path, "a:fillToRect");
  const fillRect = fillToRect ? parseFillToRect(fillToRect) : undefined;

  return { path: pathType, fillToRect: fillRect };
}

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

function parseGradientFill(element: XmlElement): GradientFill | undefined {
  const gsLst = getChild(element, "a:gsLst");
  if (!gsLst) {return undefined;}

  const stops: GradientStop[] = [];
  for (const gs of getChildren(gsLst, "a:gs")) {
    const stop = parseGradientStop(gs);
    if (stop) {stops.push(stop);}
  }

  if (stops.length === 0) {return undefined;}

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
    preset: preset as PatternType,
    foregroundColor,
    backgroundColor,
  };
}

function parseGroupFill(): GroupFill {
  return { type: "groupFill" };
}






export function parseBaseFill(element: XmlElement | undefined): BaseFill | undefined {
  if (!element) {return undefined;}

  switch (element.name) {
    case "a:noFill":
      return parseNoFill();
    case "a:solidFill":
      return parseSolidFill(element);
    case "a:gradFill":
      return parseGradientFill(element);
    case "a:pattFill":
      return parsePatternFill(element);
    case "a:grpFill":
      return parseGroupFill();
    case "a:blipFill":
      // BlipFill is format-specific (resource IDs), intentionally excluded.
      return undefined;
    default:
      return undefined;
  }
}






export function parseBaseFillFromParent(parent: XmlElement | undefined): BaseFill | undefined {
  if (!parent) {return undefined;}
  const fillEl = findFillElement(parent);
  return parseBaseFill(fillEl);
}

