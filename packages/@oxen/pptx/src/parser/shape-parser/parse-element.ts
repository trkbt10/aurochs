/**
 * @file Shape element parser
 *
 * Parses PresentationML shape elements to Shape domain objects.
 *
 * @see ECMA-376 Part 1, Section 19.3.1 - Presentation ML Shapes
 */

import { getAttr, getChild, getChildren, isXmlElement, type XmlElement } from "@oxen/xml";
import type { Shape } from "../../domain";
import type { PlaceholderContext, MasterStylesInfo, FormatScheme, ResourceContext } from "../context";

import { parseSpShape } from "./sp";
import { parsePicShape } from "./pic";
import { parseGrpShape } from "./grp";
import { parseCxnShape } from "./cxn";
import { parseGraphicFrame } from "./graphic-frame";
import { isChoiceSupported } from "./alternate-content";
import { parseContentPartShape } from "./content-part";

const LOCKED_CANVAS_NAME_MAP = new Map<string, string>([
  ["a:nvGrpSpPr", "p:nvGrpSpPr"],
  ["a:grpSpPr", "p:grpSpPr"],
  ["a:grpSp", "p:grpSp"],
  ["a:txSp", "p:sp"],
  ["a:sp", "p:sp"],
  ["a:pic", "p:pic"],
  ["a:cxnSp", "p:cxnSp"],
  ["a:graphicFrame", "p:graphicFrame"],
  ["a:nvSpPr", "p:nvSpPr"],
  ["a:cNvPr", "p:cNvPr"],
  ["a:cNvSpPr", "p:cNvSpPr"],
  ["a:nvPicPr", "p:nvPicPr"],
  ["a:cNvPicPr", "p:cNvPicPr"],
  ["a:nvCxnSpPr", "p:nvCxnSpPr"],
  ["a:cNvCxnSpPr", "p:cNvCxnSpPr"],
  ["a:nvGraphicFramePr", "p:nvGraphicFramePr"],
  ["a:cNvGraphicFramePr", "p:cNvGraphicFramePr"],
  ["a:spPr", "p:spPr"],
  ["a:txBody", "p:txBody"],
  ["a:style", "p:style"],
  ["a:blipFill", "p:blipFill"],
  ["a:oleObj", "p:oleObj"],
]);

function remapLockedCanvasName(name: string): string {
  return LOCKED_CANVAS_NAME_MAP.get(name) ?? name;
}

function mapLockedCanvasElement(newName: string, source: XmlElement): XmlElement {
  return {
    type: "element",
    name: newName,
    attrs: source.attrs,
    children: source.children.map((child) => {
      if (isXmlElement(child)) {
        const remapped = remapLockedCanvasName(child.name);
        if (remapped !== child.name) {
          return mapLockedCanvasElement(remapped, child);
        }
      }
      return child;
    }),
  };
}

// =============================================================================
// Main Shape Parsing
// =============================================================================

/**
 * Parse shape element to Shape domain object
 */
export function parseShapeElement(
  element: XmlElement,
  ctx?: PlaceholderContext,
  masterStylesInfo?: MasterStylesInfo,
  formatScheme?: FormatScheme,
  resourceContext?: ResourceContext,
): Shape | undefined {
  switch (element.name) {
    case "p:sp":
      return parseSpShape(element, ctx, masterStylesInfo, formatScheme);
    case "a:txSp": {
      const mapped = mapLockedCanvasElement("p:sp", element);
      const parsed = parseSpShape(mapped, ctx, masterStylesInfo, formatScheme);
      if (parsed?.type !== "sp") {
        return parsed;
      }
      const useShapeTextRect = getChild(element, "a:useSpRect") !== undefined;
      return useShapeTextRect ? { ...parsed, useShapeTextRect } : parsed;
    }
    case "p:pic":
      return parsePicShape(element, formatScheme, resourceContext);
    case "p:grpSp":
      return parseGrpShape(element, ctx, masterStylesInfo, formatScheme, (el, c, m, f) =>
        parseShapeElement(el, c, m, f, resourceContext),
      );
    case "p:cxnSp":
      return parseCxnShape(element, formatScheme);
    case "p:graphicFrame":
      return parseGraphicFrame(element);
    case "p:contentPart":
      return parseContentPartShape(element);
    case "lc:lockedCanvas": {
      const mapped = mapLockedCanvasElement("p:grpSp", element);
      return parseGrpShape(mapped, ctx, masterStylesInfo, formatScheme, (el, c, m, f) =>
        parseShapeElement(el, c, m, f, resourceContext),
      );
    }
    case "mc:AlternateContent": {
      // Process mc:AlternateContent per ECMA-376 Part 3, Section 10.2.1
      // 1. Evaluate each mc:Choice in order, check if Requires namespaces are supported
      // 2. Use mc:Fallback only if no Choice matches
      const choices = getChildren(element, "mc:Choice");
      for (const choice of choices) {
        const requires = getAttr(choice, "Requires");
        if (isChoiceSupported(requires)) {
          for (const child of choice.children) {
            if (isXmlElement(child)) {
              const shape = parseShapeElement(child, ctx, masterStylesInfo, formatScheme, resourceContext);
              if (shape) {
                return shape;
              }
            }
          }
        }
      }
      // No supported Choice found, use mc:Fallback per spec
      const fallback = getChild(element, "mc:Fallback");
      if (fallback) {
        for (const child of fallback.children) {
          if (isXmlElement(child)) {
            const shape = parseShapeElement(child, ctx, masterStylesInfo, formatScheme, resourceContext);
            if (shape) {
              return shape;
            }
          }
        }
      }
      return undefined;
    }
    default:
      return undefined;
  }
}

/**
 * Parse all shapes from shape tree (p:spTree) with placeholder inheritance
 *
 * @param spTree - The shape tree element (p:spTree)
 * @param ctx - Optional placeholder context for inheritance resolution
 * @param masterStylesInfo - Optional master styles info for text style resolution
 * @param formatScheme - Optional format scheme for style reference resolution
 * @param resourceContext - Optional resource context for image resolution
 * @returns Array of parsed Shape domain objects
 */
export function parseShapeTree(
  spTree: XmlElement | undefined,
  ctx?: PlaceholderContext,
  masterStylesInfo?: MasterStylesInfo,
  formatScheme?: FormatScheme,
  resourceContext?: ResourceContext,
): readonly Shape[] {
  if (!spTree) {
    return [];
  }

  const shapes: Shape[] = [];

  for (const child of spTree.children) {
    if (!isXmlElement(child)) {
      continue;
    }
    // Skip nvGrpSpPr and grpSpPr
    if (child.name === "p:nvGrpSpPr" || child.name === "p:grpSpPr") {
      continue;
    }

    const shape = parseShapeElement(child, ctx, masterStylesInfo, formatScheme, resourceContext);
    if (shape) {
      shapes.push(shape);
    }
  }

  return shapes;
}
