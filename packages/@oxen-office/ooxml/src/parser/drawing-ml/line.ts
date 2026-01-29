/**
 * @file DrawingML line parser (BaseLine)
 *
 * Parses DrawingML line (stroke) elements to OOXML BaseLine domain objects.
 *
 * @see ECMA-376 Part 1, Section 20.1.2.2.24 (ln)
 */

import type { BaseLine, CustomDash, LineEnd } from "../../domain/line";
import { px } from "../../domain/units";
import {
  getAttr,
  getChild,
  getChildren,
  type XmlElement,
} from "@oxen/xml";
import { parseBaseFillFromParent } from "./fill";
import { getPercent100kAttr, parseLineWidth } from "../primitive";

function parseLineEnd(element: XmlElement | undefined): LineEnd | undefined {
  if (!element) {return undefined;}

  const type = mapLineEndType(getAttr(element, "type"));
  if (!type || type === "none") {return undefined;}

  return {
    type,
    width: mapLineEndWidth(getAttr(element, "w")),
    length: mapLineEndLength(getAttr(element, "len")),
  };
}

function parseCustomDash(element: XmlElement): CustomDash | undefined {
  const custDash = getChild(element, "a:custDash");
  if (!custDash) {return undefined;}

  const dashes: CustomDash["dashes"][number][] = [];

  for (const ds of getChildren(custDash, "a:ds")) {
    const dashLength = getPercent100kAttr(ds, "d");
    const spaceLength = getPercent100kAttr(ds, "sp");

    if (dashLength !== undefined && spaceLength !== undefined) {
      dashes.push({ dashLength, spaceLength });
    }
  }

  if (dashes.length === 0) {return undefined;}

  return { dashes };
}

function getDashStyle(element: XmlElement): string | CustomDash {
  const prstDash = getChild(element, "a:prstDash");
  if (prstDash) {
    return getAttr(prstDash, "val") ?? "solid";
  }

  const customDash = parseCustomDash(element);
  if (customDash) {return customDash;}

  return "solid";
}

function mapLineEndType(type: string | undefined): LineEnd["type"] | undefined {
  switch (type) {
    case "none": return "none";
    case "triangle": return "triangle";
    case "stealth": return "stealth";
    case "diamond": return "diamond";
    case "oval": return "oval";
    case "arrow": return "arrow";
    default: return undefined;
  }
}

function mapLineEndWidth(w: string | undefined): LineEnd["width"] {
  switch (w) {
    case "sm": return "sm";
    case "med": return "med";
    case "lg": return "lg";
    default: return "med";
  }
}

function mapLineEndLength(len: string | undefined): LineEnd["length"] {
  switch (len) {
    case "sm": return "sm";
    case "med": return "med";
    case "lg": return "lg";
    default: return "med";
  }
}

function mapLineCap(cap: string | undefined): BaseLine["cap"] {
  switch (cap) {
    case "flat": return "flat";
    case "rnd": return "round";
    case "sq": return "square";
    default: return "flat";
  }
}

function mapCompound(cmpd: string | undefined): BaseLine["compound"] {
  switch (cmpd) {
    case "sng": return "sng";
    case "dbl": return "dbl";
    case "thickThin": return "thickThin";
    case "thinThick": return "thinThick";
    case "tri": return "tri";
    default: return "sng";
  }
}

function mapPenAlignment(algn: string | undefined): BaseLine["alignment"] {
  switch (algn) {
    case "ctr": return "ctr";
    case "in": return "in";
    default: return "ctr";
  }
}

function resolveLineJoin(element: XmlElement): BaseLine["join"] {
  if (getChild(element, "a:bevel")) {return "bevel";}
  if (getChild(element, "a:miter")) {return "miter";}
  return "round";
}

export function parseLine(element: XmlElement | undefined): BaseLine | undefined {
  if (!element) {return undefined;}

  const fill = parseBaseFillFromParent(element);
  const width = parseLineWidth(getAttr(element, "w"));
  if (!fill && width === undefined) {return undefined;}

  const join = resolveLineJoin(element);
  const miterEl = getChild(element, "a:miter");
  const miterLimit = miterEl ? getPercent100kAttr(miterEl, "lim") : undefined;

  return {
    width: width ?? px(1),
    cap: mapLineCap(getAttr(element, "cap")),
    compound: mapCompound(getAttr(element, "cmpd")),
    alignment: mapPenAlignment(getAttr(element, "algn")),
    fill: fill ?? { type: "noFill" },
    dash: getDashStyle(element),
    headEnd: parseLineEnd(getChild(element, "a:headEnd")),
    tailEnd: parseLineEnd(getChild(element, "a:tailEnd")),
    join,
    miterLimit,
  };
}

export function getLineFromProperties(spPr: XmlElement | undefined): BaseLine | undefined {
  if (!spPr) {return undefined;}
  return parseLine(getChild(spPr, "a:ln"));
}

