/**
 * @file Group shape (p:grpSp) parser
 *
 * @see ECMA-376 Part 1, Section 19.3.1.22 (p:grpSp)
 */

import { getChild, isXmlElement, type XmlElement } from "../../../xml";
import type { GrpShape, Shape, GroupLocks } from "../../domain";
import type { PlaceholderContext, MasterStylesInfo, FormatScheme } from "../context";
import { parseNonVisualProperties } from "./non-visual";
import { parseGroupShapeProperties } from "./properties";
import { getBoolAttr } from "../primitive";

function parseGroupLocksElement(element: XmlElement | undefined): GroupLocks | undefined {
  if (!element) {
    return undefined;
  }
  const noGrp = getBoolAttr(element, "noGrp");
  const noUngrp = getBoolAttr(element, "noUngrp");
  const noSelect = getBoolAttr(element, "noSelect");
  const noRot = getBoolAttr(element, "noRot");
  const noChangeAspect = getBoolAttr(element, "noChangeAspect");
  const noMove = getBoolAttr(element, "noMove");
  const noResize = getBoolAttr(element, "noResize");
  if (
    noGrp === undefined &&
    noUngrp === undefined &&
    noSelect === undefined &&
    noRot === undefined &&
    noChangeAspect === undefined &&
    noMove === undefined &&
    noResize === undefined
  ) {
    return undefined;
  }
  return {
    noGrp,
    noUngrp,
    noSelect,
    noRot,
    noChangeAspect,
    noMove,
    noResize,
  };
}

function parseGroupLocksFromParent(parent: XmlElement | undefined): GroupLocks | undefined {
  if (!parent) {
    return undefined;
  }
  return parseGroupLocksElement(getChild(parent, "a:grpSpLocks"));
}

// Forward declaration - will be imported from index.ts to avoid circular dependencies
type ParseShapeElementFn = (
  element: XmlElement,
  ctx?: PlaceholderContext,
  masterStylesInfo?: MasterStylesInfo,
  formatScheme?: FormatScheme,
) => Shape | undefined;

/**
 * Parse group shape (p:grpSp)
 *
 * Note: Uses a function parameter for parseShapeElement to avoid circular dependencies.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.22
 */
export function parseGrpShape(
  element: XmlElement,
  ctx: PlaceholderContext | undefined,
  masterStylesInfo: MasterStylesInfo | undefined,
  formatScheme: FormatScheme | undefined,
  parseShapeElement: ParseShapeElementFn,
): GrpShape | undefined {
  const nvGrpSpPr = getChild(element, "p:nvGrpSpPr");
  const cNvPr = nvGrpSpPr ? getChild(nvGrpSpPr, "p:cNvPr") : undefined;
  const cNvGrpSpPr = nvGrpSpPr ? getChild(nvGrpSpPr, "p:cNvGrpSpPr") : undefined;
  const groupLocks = parseGroupLocksFromParent(cNvGrpSpPr);

  const grpSpPr = getChild(element, "p:grpSpPr");

  // Parse children recursively with context
  const children: Shape[] = [];
  for (const child of element.children) {
    if (!isXmlElement(child)) {
      continue;
    }
    const shape = parseShapeElement(child, ctx, masterStylesInfo, formatScheme);
    if (shape) {
      children.push(shape);
    }
  }

  return {
    type: "grpSp",
    nonVisual: {
      ...parseNonVisualProperties(cNvPr),
      groupLocks,
    },
    properties: parseGroupShapeProperties(grpSpPr),
    children,
  };
}
