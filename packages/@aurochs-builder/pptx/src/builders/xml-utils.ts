/**
 * @file XML utility functions for builders
 */

import type { XmlElement, XmlNode } from "@aurochs/xml";

/**
 * Set children of an XML element (immutable)
 */
export function setChildren(element: XmlElement, children: XmlNode[]): XmlElement {
  return { ...element, children };
}
