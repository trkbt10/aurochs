/**
 * @file PresentationML shape tree operations
 *
 * PPTX-specific operations for shape lookup/mutation in p:spTree.
 * These depend on PresentationML schema (p:cNvPr/@id) and cannot
 * be generic XML operations.
 *
 * For generic XML mutations, import from @aurochs/xml (SoT).
 */

import type { XmlElement, XmlNode } from "@aurochs/xml";
import { isXmlElement } from "@aurochs/xml";

// =============================================================================
// Constants (ECMA-376 PresentationML element names)
// =============================================================================

const SHAPE_TYPES = ["p:sp", "p:pic", "p:grpSp", "p:cxnSp", "p:graphicFrame"];
const NV_PR_NAMES = ["p:nvSpPr", "p:nvPicPr", "p:nvGrpSpPr", "p:nvCxnSpPr", "p:nvGraphicFramePr"];

// =============================================================================
// Internal helpers
// =============================================================================

/** Check if an element is a recognized shape type. */
function isShapeElement(el: XmlElement): boolean {
  return SHAPE_TYPES.includes(el.name);
}

/** Find the p:cNvPr element within a shape element. */
function findCNvPr(shape: XmlElement): XmlElement | undefined {
  for (const nvPrName of NV_PR_NAMES) {
    const nvPr = shape.children.find((c): c is XmlElement => isXmlElement(c) && c.name === nvPrName);
    if (nvPr) {
      return nvPr.children.find((c): c is XmlElement => isXmlElement(c) && c.name === "p:cNvPr");
    }
  }
  return undefined;
}

/** Get the shape ID from a shape element, or undefined. */
function getShapeId(shape: XmlElement): string | undefined {
  return findCNvPr(shape)?.attrs.id;
}

/** Check if a shape element has the given ID. */
function hasShapeId(shape: XmlElement, shapeId: string): boolean {
  return getShapeId(shape) === shapeId;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Find a shape element by its ID (depth-first, including nested groups).
 *
 * @param spTree - The p:spTree element to search in
 * @param shapeId - The shape ID to find (p:cNvPr/@id)
 * @returns The shape element (p:sp, p:pic, p:grpSp, etc.) or null
 */
export function findShapeById(spTree: XmlElement, shapeId: string): XmlElement | null {
  for (const child of spTree.children) {
    if (!isXmlElement(child) || !isShapeElement(child)) { continue; }
    if (hasShapeId(child, shapeId)) { return child; }
    if (child.name === "p:grpSp") {
      const found = findShapeById(child, shapeId);
      if (found) { return found; }
    }
  }
  return null;
}

/** Get all shape IDs from a spTree (including nested groups). */
export function getShapeIds(spTree: XmlElement): string[] {
  const ids: string[] = [];
  for (const child of spTree.children) {
    if (!isXmlElement(child) || !isShapeElement(child)) { continue; }
    const id = getShapeId(child);
    if (id) { ids.push(id); }
    if (child.name === "p:grpSp") { ids.push(...getShapeIds(child)); }
  }
  return ids;
}

/** Replace a shape in spTree by ID (including nested groups). */
export function replaceShapeById(spTree: XmlElement, shapeId: string, newShape: XmlElement): XmlElement {
  return {
    ...spTree,
    children: spTree.children.map((child) => {
      if (!isXmlElement(child) || !isShapeElement(child)) { return child; }
      if (hasShapeId(child, shapeId)) { return newShape; }
      if (child.name === "p:grpSp") { return replaceShapeById(child, shapeId, newShape); }
      return child;
    }),
  };
}

/** Remove a shape from spTree by ID (including nested groups). */
export function removeShapeById(spTree: XmlElement, shapeId: string): XmlElement {
  const newChildren: XmlNode[] = [];
  for (const child of spTree.children) {
    if (!isXmlElement(child) || !isShapeElement(child)) {
      newChildren.push(child);
      continue;
    }
    if (hasShapeId(child, shapeId)) { continue; }
    if (child.name === "p:grpSp") {
      newChildren.push(removeShapeById(child, shapeId));
    } else {
      newChildren.push(child);
    }
  }
  return { ...spTree, children: newChildren };
}
