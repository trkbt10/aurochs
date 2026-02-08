/**
 * @file DOCX Serialization Primitive Utilities
 *
 * Helper functions for creating WordprocessingML XML elements.
 *
 * @see ECMA-376 Part 1, Section 17.18 (Simple Types)
 */

import { createElement, createText, type XmlElement, type XmlNode } from "@aurochs/xml";

// =============================================================================
// Element Construction Helpers
// =============================================================================

/**
 * Create a WordprocessingML element with w: prefix.
 */
export function wEl(
  localName: string,
  attrs: Record<string, string> = {},
  children: readonly XmlNode[] = [],
): XmlElement {
  return createElement(`w:${localName}`, attrs, children);
}

/**
 * Create a w: element with a single val attribute.
 * Produces: <w:name val="value"/>
 */
export function valEl(localName: string, val: string): XmlElement {
  return wEl(localName, { val });
}

/**
 * Create a toggle element (e.g., <w:b/> or <w:b val="0"/>).
 * Returns undefined if value is undefined.
 */
export function toggleEl(localName: string, value: boolean | undefined): XmlElement | undefined {
  if (value === undefined) return undefined;
  return value ? wEl(localName) : wEl(localName, { val: "0" });
}

/**
 * Create a val element only if value is defined.
 */
export function optValEl(localName: string, val: string | number | undefined): XmlElement | undefined {
  if (val === undefined) return undefined;
  return valEl(localName, String(val));
}

/**
 * Create a text element with content.
 * Produces: <w:name>text</w:name>
 */
export function textEl(localName: string, text: string, attrs: Record<string, string> = {}): XmlElement {
  return wEl(localName, attrs, [createText(text)]);
}

// =============================================================================
// Attribute Helpers
// =============================================================================

/**
 * Add optional string attribute to attrs dict.
 */
export function optAttr(
  attrs: Record<string, string>,
  name: string,
  value: string | number | boolean | undefined,
): void {
  if (value === undefined) return;
  if (typeof value === "boolean") {
    attrs[name] = value ? "1" : "0";
  } else {
    attrs[name] = String(value);
  }
}

// =============================================================================
// Child Collection Helper
// =============================================================================

/**
 * Collect non-undefined children into an array.
 */
export function children(...items: (XmlNode | undefined)[]): XmlNode[] {
  return items.filter((item): item is XmlNode => item !== undefined);
}
