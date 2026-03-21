/**
 * @file XML Mutator - Immutable XmlElement/XmlDocument update helpers
 *
 * All functions produce new objects without mutating the original.
 * This is the SoT for immutable XML operations across all builder packages.
 *
 * For element construction, see xml-builder.ts.
 * For format-specific operations (e.g., shape ID lookup), see the respective builder package.
 */

import type { XmlElement, XmlNode, XmlDocument } from "@aurochs/xml";
import { isXmlElement } from "@aurochs/xml";

// =============================================================================
// Attribute Operations
// =============================================================================

/**
 * Set or update an attribute on an element.
 */
export function setAttribute(element: XmlElement, name: string, value: string): XmlElement {
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
export function setAttributes(element: XmlElement, attrs: Readonly<Record<string, string>>): XmlElement {
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
export function insertChildAt(parent: XmlElement, child: XmlNode, index: number): XmlElement {
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
export function removeChildren(parent: XmlElement, predicate: (child: XmlNode, index: number) => boolean): XmlElement {
  return {
    ...parent,
    children: parent.children.filter((child, i) => !predicate(child, i)),
  };
}

/**
 * Replace a child node at a specific index.
 */
export function replaceChildAt(parent: XmlElement, index: number, newChild: XmlNode): XmlElement {
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
export function replaceChildByName(parent: XmlElement, name: string, newChild: XmlElement): XmlElement {
  return replaceChild(parent, (child) => isXmlElement(child) && child.name === name, newChild);
}

/**
 * Replace all children of an element.
 */
export function setChildren(parent: XmlElement, children: readonly XmlNode[]): XmlElement {
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
export function findElement(root: XmlElement, predicate: (el: XmlElement) => boolean): XmlElement | null {
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
export function findElements(root: XmlElement, predicate: (el: XmlElement) => boolean): XmlElement[] {
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
  const firstIndex = root.children.findIndex((child) => isXmlElement(child) && child.name === first);

  const newChildren = root.children.map((child, index) => {
    if (index !== firstIndex) {
      return child;
    }
    return updateAtPath(child as XmlElement, rest, updater);
  });

  return {
    ...root,
    children: newChildren,
  };
}

// =============================================================================
// Document Operations
// =============================================================================

/**
 * Update the root element of a document.
 */
export function updateDocumentRoot(doc: XmlDocument, updater: (root: XmlElement) => XmlElement): XmlDocument {
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
