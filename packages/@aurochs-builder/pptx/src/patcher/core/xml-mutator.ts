/**
 * @file XML Mutator for PPTX patcher
 *
 * Re-exports generic immutable XML operations from @aurochs-builder/core
 * and adds PresentationML-specific shape operations.
 *
 * SoT for generic operations: @aurochs-builder/core/xml-mutator
 */

import type { XmlElement, XmlNode } from "@aurochs/xml";
import { isXmlElement } from "@aurochs/xml";

// Re-export all generic operations from core (SoT)
export {
  setAttribute,
  setAttributes,
  removeAttribute,
  appendChild,
  prependChild,
  insertChildAt,
  removeChildAt,
  removeChildren,
  replaceChildAt,
  replaceChild,
  replaceChildByName,
  setChildren,
  updateChildByName,
  findElement,
  findElements,
  updateAtPath,
  updateDocumentRoot,
  getDocumentRoot,
} from "@aurochs-builder/core/xml-mutator";

// =============================================================================
// PresentationML Shape Operations
// =============================================================================

/**
 * Find a shape element by its ID.
 * Searches for p:cNvPr/@id within p:nvSpPr, p:nvPicPr, p:nvGrpSpPr, etc.
 *
 * @param spTree - The p:spTree element to search in
 * @param shapeId - The shape ID to find
 * @returns The shape element (p:sp, p:pic, p:grpSp, etc.) or null
 */
export function findShapeById(spTree: XmlElement, shapeId: string): XmlElement | null {
  for (const child of spTree.children) {
    if (!isXmlElement(child)) {
      continue;
    }

    const shapeTypes = ["p:sp", "p:pic", "p:grpSp", "p:cxnSp", "p:graphicFrame"];
    if (!shapeTypes.includes(child.name)) {
      continue;
    }

    const nvPrNames = ["p:nvSpPr", "p:nvPicPr", "p:nvGrpSpPr", "p:nvCxnSpPr", "p:nvGraphicFramePr"];

    for (const nvPrName of nvPrNames) {
      const nvPr = child.children.find((c): c is XmlElement => isXmlElement(c) && c.name === nvPrName);
      if (nvPr) {
        const cNvPr = nvPr.children.find((c): c is XmlElement => isXmlElement(c) && c.name === "p:cNvPr");
        if (cNvPr && cNvPr.attrs.id === shapeId) {
          return child;
        }
        break;
      }
    }

    if (child.name === "p:grpSp") {
      const found = findShapeById(child, shapeId);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

/**
 * Get all shape IDs from a spTree.
 */
export function getShapeIds(spTree: XmlElement): string[] {
  const ids: string[] = [];

  for (const child of spTree.children) {
    if (!isXmlElement(child)) {
      continue;
    }

    const shapeTypes = ["p:sp", "p:pic", "p:grpSp", "p:cxnSp", "p:graphicFrame"];
    if (!shapeTypes.includes(child.name)) {
      continue;
    }

    const nvPrNames = ["p:nvSpPr", "p:nvPicPr", "p:nvGrpSpPr", "p:nvCxnSpPr", "p:nvGraphicFramePr"];

    for (const nvPrName of nvPrNames) {
      const nvPr = child.children.find((c): c is XmlElement => isXmlElement(c) && c.name === nvPrName);
      if (nvPr) {
        const cNvPr = nvPr.children.find((c): c is XmlElement => isXmlElement(c) && c.name === "p:cNvPr");
        if (cNvPr && cNvPr.attrs.id) {
          ids.push(cNvPr.attrs.id);
        }
        break;
      }
    }

    if (child.name === "p:grpSp") {
      ids.push(...getShapeIds(child));
    }
  }

  return ids;
}

/**
 * Replace a shape in spTree by ID.
 */
export function replaceShapeById(spTree: XmlElement, shapeId: string, newShape: XmlElement): XmlElement {
  return {
    ...spTree,
    children: spTree.children.map((child) => {
      if (!isXmlElement(child)) {
        return child;
      }

      const shapeTypes = ["p:sp", "p:pic", "p:grpSp", "p:cxnSp", "p:graphicFrame"];
      if (!shapeTypes.includes(child.name)) {
        return child;
      }

      const nvPrNames = ["p:nvSpPr", "p:nvPicPr", "p:nvGrpSpPr", "p:nvCxnSpPr", "p:nvGraphicFramePr"];

      for (const nvPrName of nvPrNames) {
        const nvPr = child.children.find((c): c is XmlElement => isXmlElement(c) && c.name === nvPrName);
        if (nvPr) {
          const cNvPr = nvPr.children.find((c): c is XmlElement => isXmlElement(c) && c.name === "p:cNvPr");
          if (cNvPr && cNvPr.attrs.id === shapeId) {
            return newShape;
          }
          break;
        }
      }

      if (child.name === "p:grpSp") {
        return replaceShapeById(child, shapeId, newShape);
      }

      return child;
    }),
  };
}

/**
 * Remove a shape from spTree by ID.
 */
export function removeShapeById(spTree: XmlElement, shapeId: string): XmlElement {
  const newChildren: XmlNode[] = [];

  for (const child of spTree.children) {
    if (!isXmlElement(child)) {
      newChildren.push(child);
      continue;
    }

    const shapeTypes = ["p:sp", "p:pic", "p:grpSp", "p:cxnSp", "p:graphicFrame"];
    if (!shapeTypes.includes(child.name)) {
      newChildren.push(child);
      continue;
    }

    const nvPrNames = ["p:nvSpPr", "p:nvPicPr", "p:nvGrpSpPr", "p:nvCxnSpPr", "p:nvGraphicFramePr"];

    const hasTargetId = nvPrNames.some((nvPrName) => {
      const nvPr = child.children.find((c): c is XmlElement => isXmlElement(c) && c.name === nvPrName);
      if (!nvPr) {
        return false;
      }
      const cNvPr = nvPr.children.find((c): c is XmlElement => isXmlElement(c) && c.name === "p:cNvPr");
      return cNvPr && cNvPr.attrs.id === shapeId;
    });

    if (hasTargetId) {
      continue;
    }

    if (child.name === "p:grpSp") {
      newChildren.push(removeShapeById(child, shapeId));
    } else {
      newChildren.push(child);
    }
  }

  return {
    ...spTree,
    children: newChildren,
  };
}
