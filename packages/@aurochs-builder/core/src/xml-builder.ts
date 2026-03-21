/**
 * @file XML element construction utilities
 *
 * Provides helpers for creating XML elements and conditional construction.
 * For immutable update operations (set/remove/replace/find on existing elements),
 * use xml-mutator.ts instead.
 */

import type { XmlElement, XmlNode } from "@aurochs/xml";

/**
 * Create an XML element with the given name, attributes, and children.
 */
export function createElement(name: string, attrs: Record<string, string> = {}, children: XmlNode[] = []): XmlElement {
  return { type: "element", name, attrs, children };
}

/**
 * Create a conditional attribute object.
 * Only includes attributes where the value is defined.
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
 * Create a conditional child array.
 * Only includes non-undefined elements.
 */
export function conditionalChildren(children: (XmlNode | undefined | null)[]): XmlNode[] {
  return children.filter((child): child is XmlNode => child != null);
}
