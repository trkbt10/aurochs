/**
 * @file SVG node tree serializer.
 *
 * Converts SVG node trees (XmlNode/XmlElement) to safe XML strings
 * using @aurochs/xml as the single source of truth for escaping.
 *
 * For single elements, use `serializeElement` from @aurochs/xml directly.
 * This module provides `serializeSvgFragment` and `serializeSvgNode` for
 * fragment serialization — the cases where @aurochs/xml's API doesn't
 * directly cover (multiple sibling nodes without a wrapper element).
 */

import type { XmlNode } from "@aurochs/xml";
import { escapeXml, serializeElement } from "@aurochs/xml";
import type { SvgFragment } from "./svg-node";

/**
 * Serialize an SvgFragment (array of nodes) to an XML string.
 *
 * Fragments arise when a render function produces multiple top-level
 * nodes (e.g., `<defs>` + `<path>`). The nodes are serialized in
 * order and concatenated.
 */
export function serializeSvgFragment(fragment: SvgFragment): string {
  const parts: string[] = [];
  for (const node of fragment) {
    parts.push(serializeSvgNode(node));
  }
  return parts.join("");
}

/**
 * Serialize a single SVG node (element or text) to an XML string.
 */
export function serializeSvgNode(node: XmlNode): string {
  if (node.type === "element") {
    return serializeElement(node);
  }
  return escapeXml(node.value);
}
