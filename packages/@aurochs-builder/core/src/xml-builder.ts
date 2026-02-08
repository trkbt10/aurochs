/**
 * @file XML building utilities shared across all format builders
 *
 * Provides helper functions for constructing and manipulating XML elements
 * in an immutable, functional style.
 */

import type { XmlElement, XmlNode } from "@aurochs/xml";

/**
 * Create an XML element with the given name, attributes, and children
 */
export function createElement(name: string, attrs: Record<string, string> = {}, children: XmlNode[] = []): XmlElement {
  return { type: "element", name, attrs, children };
}

/**
 * Set children of an XML element (immutable)
 */
export function setChildren(element: XmlElement, children: XmlNode[]): XmlElement {
  return { ...element, children };
}

/**
 * Add a child to an XML element (immutable)
 */
export function addChild(element: XmlElement, child: XmlNode): XmlElement {
  return { ...element, children: [...element.children, child] };
}

/**
 * Add multiple children to an XML element (immutable)
 */
export function addChildren(element: XmlElement, newChildren: XmlNode[]): XmlElement {
  return { ...element, children: [...element.children, ...newChildren] };
}

/**
 * Set attributes on an XML element (immutable, merges with existing)
 */
export function setAttrs(element: XmlElement, attrs: Record<string, string>): XmlElement {
  return { ...element, attrs: { ...element.attrs, ...attrs } };
}

/**
 * Remove an attribute from an XML element (immutable)
 */
export function removeAttr(element: XmlElement, attrName: string): XmlElement {
  const { [attrName]: _, ...remaining } = element.attrs;
  return { ...element, attrs: remaining };
}

/**
 * Find a child element by name
 */
export function findChild(element: XmlElement, name: string): XmlElement | undefined {
  for (const child of element.children) {
    if (typeof child === "object" && "name" in child && child.name === name) {
      return child as XmlElement;
    }
  }
  return undefined;
}

/**
 * Find all child elements by name
 */
export function findChildren(element: XmlElement, name: string): XmlElement[] {
  return element.children.filter(
    (child): child is XmlElement => typeof child === "object" && "name" in child && child.name === name,
  );
}

/**
 * Update a child element by name (immutable)
 * If the child doesn't exist, the element is returned unchanged
 */
export function updateChild(element: XmlElement, name: string, updater: (child: XmlElement) => XmlElement): XmlElement {
  const children = element.children.map((child) => {
    if (typeof child === "object" && "name" in child && child.name === name) {
      return updater(child as XmlElement);
    }
    return child;
  });
  return { ...element, children };
}

/**
 * Remove child elements by name (immutable)
 */
export function removeChildren(element: XmlElement, name: string): XmlElement {
  return {
    ...element,
    children: element.children.filter(
      (child) => !(typeof child === "object" && "name" in child && child.name === name),
    ),
  };
}

/**
 * Create a conditional attribute object
 * Only includes attributes where the value is defined
 */
export function conditionalAttrs(attrs: Record<string, string | number | boolean | undefined>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined) {
      result[key] = typeof value === "string" ? value : String(value);
    }
  }
  return result;
}

/**
 * Create a conditional child array
 * Only includes non-undefined elements
 */
export function conditionalChildren(children: (XmlNode | undefined | null)[]): XmlNode[] {
  return children.filter((child): child is XmlNode => child != null);
}
