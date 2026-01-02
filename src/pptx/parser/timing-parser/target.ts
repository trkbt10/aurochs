/**
 * @file Target parsing for timing/animation
 *
 * @see ECMA-376 Part 1, Section 19.5.81 (p:tgtEl)
 */

import { getAttr, getChild, isXmlElement, type XmlElement } from "../../../xml";
import type {
  AnimationTarget,
  ShapeTarget,
  TextElementTarget,
  GraphicElementTarget,
} from "../../domain/animation";
import { parseShapeId } from "../primitive";
import { mapChartSubelementType } from "./mapping";

/**
 * Parse text element target (p:txEl).
 * @see ECMA-376 Part 1, Section 19.5.90
 */
export function parseTextElementTarget(txEl: XmlElement): TextElementTarget | undefined {
  const pRg = getChild(txEl, "p:pRg");
  if (pRg) {
    return {
      type: "paragraph",
      start: parseInt(getAttr(pRg, "st") ?? "0", 10),
      end: parseInt(getAttr(pRg, "end") ?? "0", 10),
    };
  }

  const charRg = getChild(txEl, "p:charRg");
  if (charRg) {
    return {
      type: "character",
      start: parseInt(getAttr(charRg, "st") ?? "0", 10),
      end: parseInt(getAttr(charRg, "end") ?? "0", 10),
    };
  }

  return undefined;
}

/**
 * Parse graphic element target (p:graphicEl).
 * @see ECMA-376 Part 1, Section 19.5.45
 */
export function parseGraphicElementTarget(graphicEl: XmlElement): GraphicElementTarget | undefined {
  for (const child of graphicEl.children) {
    if (!isXmlElement(child)) {continue;}
    const id = getAttr(child, "id") ?? getAttr(child, "r:id");
    switch (child.name) {
      case "a:dgm":
        return { type: "diagram", id };
      case "c:chart":
        return { type: "chart", id };
      case "a:tbl":
        return { type: "table", id };
      case "a:graphic":
        return { type: "graphic", id };
      default:
        return { type: "unknown", name: child.name, id };
    }
  }
  return undefined;
}

/**
 * Parse shape target (p:spTgt).
 * @see ECMA-376 Part 1, Section 19.5.70
 */
export function parseShapeTarget(spTgt: XmlElement): ShapeTarget {
  const shapeId = parseShapeId(getAttr(spTgt, "spid")) ?? "";

  // Check for text element target
  const txEl = getChild(spTgt, "p:txEl");
  const textElement = txEl ? parseTextElementTarget(txEl) : undefined;

  // Check for background target
  const bg = getChild(spTgt, "p:bg");
  const targetBackground = bg !== undefined;

  const graphicEl = getChild(spTgt, "p:graphicEl");
  const graphicElement = graphicEl ? parseGraphicElementTarget(graphicEl) : undefined;

  const oleChartEl = getChild(spTgt, "p:oleChartEl");
  const oleChartElement = oleChartEl ? parseOleChartElement(oleChartEl) : undefined;

  const subSp = getChild(spTgt, "p:subSp");
  const subShapeId = subSp ? parseShapeId(getAttr(subSp, "spid")) : undefined;

  return {
    type: "shape",
    shapeId,
    textElement,
    subShapeId,
    targetBackground,
    graphicElement,
    oleChartElement,
  };
}

function parseOleChartElement(oleChartEl: XmlElement): { type?: ReturnType<typeof mapChartSubelementType>; level?: number } {
  const levelValue = getAttr(oleChartEl, "lvl");
  return {
    type: mapChartSubelementType(getAttr(oleChartEl, "type")),
    level: levelValue ? parseInt(levelValue, 10) : undefined,
  };
}

/**
 * Parse target element (p:tgtEl).
 * @see ECMA-376 Part 1, Section 19.5.81
 */
export function parseTargetElement(tgtEl: XmlElement): AnimationTarget | undefined {
  // Shape target
  const spTgt = getChild(tgtEl, "p:spTgt");
  if (spTgt) {
    return parseShapeTarget(spTgt);
  }

  // Slide target
  const sldTgt = getChild(tgtEl, "p:sldTgt");
  if (sldTgt) {
    return { type: "slide" };
  }

  // Sound target
  const sndTgt = getChild(tgtEl, "p:sndTgt");
  if (sndTgt) {
    return {
      type: "sound",
      resourceId: getAttr(sndTgt, "r:embed") ?? "",
      name: getAttr(sndTgt, "name"),
    };
  }

  // Ink target
  const inkTgt = getChild(tgtEl, "p:inkTgt");
  if (inkTgt) {
    return {
      type: "ink",
      shapeId: parseShapeId(getAttr(inkTgt, "spid")) ?? "",
    };
  }

  return undefined;
}
