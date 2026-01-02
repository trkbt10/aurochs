/**
 * @file Line parser
 *
 * Parses DrawingML line (stroke) elements to Line domain objects.
 *
 * @see ECMA-376 Part 1, Section 20.1.2.2.24 (ln)
 */

import type {
  CustomDash,
  Line,
  LineEnd,
} from "../../domain/index";
import { px } from "../../domain/types";
import {
  getAttr,
  getChild,
  getChildren,
  type XmlElement,
} from "../../../xml/index";
import { parseFillFromParent } from "./fill-parser";
import { getPercent100kAttr, parseLineWidth } from "../primitive";

// =============================================================================
// Line End Parsing
// =============================================================================

/**
 * Parse line end (head or tail)
 * @see ECMA-376 Part 1, Section 20.1.8.37
 *
 * ```xml
 * <a:headEnd type="triangle" w="med" len="med"/>
 * ```
 */
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

// =============================================================================
// Dash Pattern Parsing
// =============================================================================

/**
 * Parse custom dash pattern
 * @see ECMA-376 Part 1, Section 20.1.8.21
 *
 * ```xml
 * <a:custDash>
 *   <a:ds d="100000" sp="50000"/>
 *   <a:ds d="100000" sp="50000"/>
 * </a:custDash>
 * ```
 */
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

/**
 * Get dash style from line element
 * @see ECMA-376 Part 1, Section 20.1.8.48 (prstDash)
 */
function getDashStyle(element: XmlElement): string | CustomDash {
  // Check for preset dash
  const prstDash = getChild(element, "a:prstDash");
  if (prstDash) {
    return getAttr(prstDash, "val") ?? "solid";
  }

  // Check for custom dash
  const customDash = parseCustomDash(element);
  if (customDash) {return customDash;}

  return "solid";
}

// =============================================================================
// OOXML to Domain Mapping Functions
// =============================================================================

/**
 * Map OOXML line end type to domain line end type
 * @see ECMA-376 Part 1, Section 20.1.10.55 (ST_LineEndType)
 */
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

/**
 * Map OOXML line end width to domain line end width
 * @see ECMA-376 Part 1, Section 20.1.10.56 (ST_LineEndWidth)
 */
function mapLineEndWidth(w: string | undefined): LineEnd["width"] {
  switch (w) {
    case "sm": return "sm";
    case "med": return "med";
    case "lg": return "lg";
    default: return "med";
  }
}

/**
 * Map OOXML line end length to domain line end length
 * @see ECMA-376 Part 1, Section 20.1.10.57 (ST_LineEndLength)
 */
function mapLineEndLength(len: string | undefined): LineEnd["length"] {
  switch (len) {
    case "sm": return "sm";
    case "med": return "med";
    case "lg": return "lg";
    default: return "med";
  }
}

/**
 * Map OOXML line cap to domain line cap
 * @see ECMA-376 Part 1, Section 20.1.10.31 (ST_LineCap)
 */
function mapLineCap(cap: string | undefined): Line["cap"] {
  switch (cap) {
    case "flat": return "flat";
    case "rnd": return "round";
    case "sq": return "square";
    default: return "flat";
  }
}

/**
 * Map OOXML compound line type to domain compound type
 * @see ECMA-376 Part 1, Section 20.1.10.33 (ST_CompoundLine)
 */
function mapCompound(cmpd: string | undefined): Line["compound"] {
  switch (cmpd) {
    case "sng": return "sng";
    case "dbl": return "dbl";
    case "thickThin": return "thickThin";
    case "thinThick": return "thinThick";
    case "tri": return "tri";
    default: return "sng";
  }
}

/**
 * Map OOXML pen alignment to domain alignment
 * @see ECMA-376 Part 1, Section 20.1.10.39 (ST_PenAlignment)
 */
function mapPenAlignment(algn: string | undefined): Line["alignment"] {
  switch (algn) {
    case "ctr": return "ctr";
    case "in": return "in";
    default: return "ctr";
  }
}

// =============================================================================
// Main Line Parsing
// =============================================================================

/**
 * Parse line (a:ln) element to Line domain object
 * @see ECMA-376 Part 1, Section 20.1.2.2.24
 *
 * ```xml
 * <a:ln w="12700" cap="flat" cmpd="sng" algn="ctr">
 *   <a:solidFill>
 *     <a:srgbClr val="000000"/>
 *   </a:solidFill>
 *   <a:prstDash val="solid"/>
 *   <a:headEnd type="none"/>
 *   <a:tailEnd type="triangle"/>
 *   <a:round/>
 * </a:ln>
 * ```
 */
export function parseLine(element: XmlElement | undefined): Line | undefined {
  if (!element) {return undefined;}

  // Parse fill (solidFill, gradFill, etc.)
  const fill = parseFillFromParent(element);

  // If no fill and no width, treat as no line
  const width = parseLineWidth(getAttr(element, "w"));
  if (!fill && width === undefined) {return undefined;}

  // Determine join style
  const join = resolveLineJoin(element);

  // Get miter limit
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

function resolveLineJoin(element: XmlElement): Line["join"] {
  if (getChild(element, "a:bevel")) {return "bevel";}
  if (getChild(element, "a:miter")) {return "miter";}
  return "round";
}

/**
 * Get line from shape properties element
 */
export function getLineFromProperties(spPr: XmlElement | undefined): Line | undefined {
  if (!spPr) {return undefined;}
  return parseLine(getChild(spPr, "a:ln"));
}
