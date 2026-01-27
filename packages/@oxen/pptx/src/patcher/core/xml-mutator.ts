/**
 * @file XML Mutator - Immutable XmlElement update helpers
 *
 * All functions in this module produce new objects without mutating the original.
 * This is required because XmlElement and all its properties are readonly.
 *
 * @see src/xml/ast.ts for type definitions
 */

import type { XmlElement, XmlNode, XmlDocument } from "@oxen/xml";
import { isXmlElement } from "@oxen/xml";

// =============================================================================
// Attribute Operations
// =============================================================================

/**
 * Set or update an attribute on an element.
 * Returns a new element with the updated attribute.
 *
 * @example
 * ```typescript
 * const updated = setAttribute(element, "id", "123");
 * // element.attrs.id is unchanged
 * // updated.attrs.id === "123"
 * ```
 */
export function setAttribute(
  element: XmlElement,
  name: string,
  value: string,
): XmlElement {
  return {
    ...element,
    attrs: {
      ...element.attrs,
      [name]: value,
    },
  };
}

/**
 * Set multiple attributes at once.
 */
export function setAttributes(
  element: XmlElement,
  attrs: Readonly<Record<string, string>>,
): XmlElement {
  return {
    ...element,
    attrs: {
      ...element.attrs,
      ...attrs,
    },
  };
}

/**
 * Remove an attribute from an element.
 */
export function removeAttribute(element: XmlElement, name: string): XmlElement {
  const { [name]: _, ...rest } = element.attrs;
  return {
    ...element,
    attrs: rest,
  };
}

// =============================================================================
// Child Operations
// =============================================================================

/**
 * Append a child node to the end of an element's children.
 */
export function appendChild(parent: XmlElement, child: XmlNode): XmlElement {
  return {
    ...parent,
    children: [...parent.children, child],
  };
}

/**
 * Prepend a child node to the beginning of an element's children.
 */
export function prependChild(parent: XmlElement, child: XmlNode): XmlElement {
  return {
    ...parent,
    children: [child, ...parent.children],
  };
}

/**
 * Insert a child node at a specific index.
 */
export function insertChildAt(
  parent: XmlElement,
  child: XmlNode,
  index: number,
): XmlElement {
  const children = [...parent.children];
  children.splice(index, 0, child);
  return {
    ...parent,
    children,
  };
}

/**
 * Remove a child node at a specific index.
 */
export function removeChildAt(parent: XmlElement, index: number): XmlElement {
  return {
    ...parent,
    children: parent.children.filter((_, i) => i !== index),
  };
}

/**
 * Remove children that match a predicate.
 */
export function removeChildren(
  parent: XmlElement,
  predicate: (child: XmlNode, index: number) => boolean,
): XmlElement {
  return {
    ...parent,
    children: parent.children.filter((child, i) => !predicate(child, i)),
  };
}

/**
 * Replace a child node at a specific index.
 */
export function replaceChildAt(
  parent: XmlElement,
  index: number,
  newChild: XmlNode,
): XmlElement {
  return {
    ...parent,
    children: parent.children.map((child, i) => (i === index ? newChild : child)),
  };
}

/**
 * Replace the first child matching a predicate.
 */
export function replaceChild(
  parent: XmlElement,
  predicate: (child: XmlNode) => boolean,
  newChild: XmlNode,
): XmlElement {
  const index = parent.children.findIndex(predicate);
  if (index === -1) {
    return parent;
  }
  return replaceChildAt(parent, index, newChild);
}

/**
 * Replace the first child element with the given name.
 * If not found, returns the parent unchanged.
 */
export function replaceChildByName(
  parent: XmlElement,
  name: string,
  newChild: XmlElement,
): XmlElement {
  return replaceChild(
    parent,
    (child) => isXmlElement(child) && child.name === name,
    newChild,
  );
}

/**
 * Replace all children of an element.
 */
export function setChildren(
  parent: XmlElement,
  children: readonly XmlNode[],
): XmlElement {
  return {
    ...parent,
    children,
  };
}

/**
 * Update a child element by name using an updater function.
 * If the child doesn't exist, returns parent unchanged.
 */
export function updateChildByName(
  parent: XmlElement,
  name: string,
  updater: (child: XmlElement) => XmlElement,
): XmlElement {
  return {
    ...parent,
    children: parent.children.map((child) => {
      if (isXmlElement(child) && child.name === name) {
        return updater(child);
      }
      return child;
    }),
  };
}

// =============================================================================
// Search Operations
// =============================================================================

/**
 * Find the first element matching a predicate (depth-first search).
 */
export function findElement(
  root: XmlElement,
  predicate: (el: XmlElement) => boolean,
): XmlElement | null {
  if (predicate(root)) {
    return root;
  }
  for (const child of root.children) {
    if (isXmlElement(child)) {
      const found = findElement(child, predicate);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

/**
 * Find all elements matching a predicate (depth-first search).
 */
export function findElements(
  root: XmlElement,
  predicate: (el: XmlElement) => boolean,
): XmlElement[] {
  const results: XmlElement[] = [];
  if (predicate(root)) {
    results.push(root);
  }
  for (const child of root.children) {
    if (isXmlElement(child)) {
      results.push(...findElements(child, predicate));
    }
  }
  return results;
}

/**
 * Find a shape element by its ID.
 * Searches for p:cNvPr/@id within p:nvSpPr, p:nvPicPr, p:nvGrpSpPr, etc.
 *
 * @param spTree - The p:spTree element to search in
 * @param shapeId - The shape ID to find
 * @returns The shape element (p:sp, p:pic, p:grpSp, etc.) or null
 */
export function findShapeById(
  spTree: XmlElement,
  shapeId: string,
): XmlElement | null {
  for (const child of spTree.children) {
    if (!isXmlElement(child)) {
      continue;
    }

    // Check if this is a shape element (p:sp, p:pic, p:grpSp, p:cxnSp, p:graphicFrame)
    const shapeTypes = ["p:sp", "p:pic", "p:grpSp", "p:cxnSp", "p:graphicFrame"];
    if (!shapeTypes.includes(child.name)) {
      continue;
    }

    // Find the non-visual properties element
    const nvPrNames = [
      "p:nvSpPr",
      "p:nvPicPr",
      "p:nvGrpSpPr",
      "p:nvCxnSpPr",
      "p:nvGraphicFramePr",
    ];

    for (const nvPrName of nvPrNames) {
      const nvPr = child.children.find(
        (c): c is XmlElement => isXmlElement(c) && c.name === nvPrName,
      );
      if (nvPr) {
        // Find p:cNvPr within nvPr
        const cNvPr = nvPr.children.find(
          (c): c is XmlElement => isXmlElement(c) && c.name === "p:cNvPr",
        );
        if (cNvPr && cNvPr.attrs.id === shapeId) {
          return child;
        }
        break;
      }
    }

    // Recursively search in group shapes
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

    const nvPrNames = [
      "p:nvSpPr",
      "p:nvPicPr",
      "p:nvGrpSpPr",
      "p:nvCxnSpPr",
      "p:nvGraphicFramePr",
    ];

    for (const nvPrName of nvPrNames) {
      const nvPr = child.children.find(
        (c): c is XmlElement => isXmlElement(c) && c.name === nvPrName,
      );
      if (nvPr) {
        const cNvPr = nvPr.children.find(
          (c): c is XmlElement => isXmlElement(c) && c.name === "p:cNvPr",
        );
        if (cNvPr && cNvPr.attrs.id) {
          ids.push(cNvPr.attrs.id);
        }
        break;
      }
    }

    // Recursively get IDs from group shapes
    if (child.name === "p:grpSp") {
      ids.push(...getShapeIds(child));
    }
  }

  return ids;
}

// =============================================================================
// Deep Update Operations
// =============================================================================

/**
 * Update an element at a path.
 * Path is an array of element names to traverse.
 * Returns a new tree with the updated element.
 */
export function updateAtPath(
  root: XmlElement,
  path: readonly string[],
  updater: (el: XmlElement) => XmlElement,
): XmlElement {
  if (path.length === 0) {
    return updater(root);
  }

  const [first, ...rest] = path;
  let found = false;

  const newChildren = root.children.map((child) => {
    if (found) return child;
    if (isXmlElement(child) && child.name === first) {
      found = true;
      return updateAtPath(child, rest, updater);
    }
    return child;
  });

  return {
    ...root,
    children: newChildren,
  };
}

/**
 * Replace a shape in spTree by ID.
 */
export function replaceShapeById(
  spTree: XmlElement,
  shapeId: string,
  newShape: XmlElement,
): XmlElement {
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

      // Check if this shape has the target ID
      const nvPrNames = [
        "p:nvSpPr",
        "p:nvPicPr",
        "p:nvGrpSpPr",
        "p:nvCxnSpPr",
        "p:nvGraphicFramePr",
      ];

      for (const nvPrName of nvPrNames) {
        const nvPr = child.children.find(
          (c): c is XmlElement => isXmlElement(c) && c.name === nvPrName,
        );
        if (nvPr) {
          const cNvPr = nvPr.children.find(
            (c): c is XmlElement => isXmlElement(c) && c.name === "p:cNvPr",
          );
          if (cNvPr && cNvPr.attrs.id === shapeId) {
            return newShape;
          }
          break;
        }
      }

      // Recursively update group shapes
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

    // Check if this shape has the target ID
    const nvPrNames = [
      "p:nvSpPr",
      "p:nvPicPr",
      "p:nvGrpSpPr",
      "p:nvCxnSpPr",
      "p:nvGraphicFramePr",
    ];

    let hasTargetId = false;
    for (const nvPrName of nvPrNames) {
      const nvPr = child.children.find(
        (c): c is XmlElement => isXmlElement(c) && c.name === nvPrName,
      );
      if (nvPr) {
        const cNvPr = nvPr.children.find(
          (c): c is XmlElement => isXmlElement(c) && c.name === "p:cNvPr",
        );
        if (cNvPr && cNvPr.attrs.id === shapeId) {
          hasTargetId = true;
        }
        break;
      }
    }

    if (hasTargetId) {
      // Skip this child (remove it)
      continue;
    }

    // Recursively update group shapes
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

// =============================================================================
// Document Operations
// =============================================================================

/**
 * Update the root element of a document.
 */
export function updateDocumentRoot(
  doc: XmlDocument,
  updater: (root: XmlElement) => XmlElement,
): XmlDocument {
  const rootIndex = doc.children.findIndex(isXmlElement);
  if (rootIndex === -1) {
    return doc;
  }

  const root = doc.children[rootIndex] as XmlElement;
  const updatedRoot = updater(root);

  return {
    ...doc,
    children: doc.children.map((child, i) => (i === rootIndex ? updatedRoot : child)),
  };
}

/**
 * Get the root element of a document.
 */
export function getDocumentRoot(doc: XmlDocument): XmlElement | null {
  const root = doc.children.find(isXmlElement);
  return root ?? null;
}

