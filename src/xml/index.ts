/**
 * @file XML module exports
 * XML document manipulation utilities, extending markup base
 *
 * Inheritance hierarchy:
 *   markup (base) -> xml -> ooxml (PPTX-specific)
 */

import { isXmlElement, isXmlText, getTextContent } from "./ast";

// =============================================================================
// AST Types (new parser output)
// =============================================================================

export type { XmlElement, XmlText, XmlNode, XmlDocument } from "./ast";
export {
  isXmlElement,
  isXmlText,
  isXmlDocument,
  getChild,
  getChildren,
  getTextContent,
  getAttr,
  hasAttr,
  getByPath,
  getAttrByPath,
  getTextByPath,
  getChildrenByPath,
  mapChildren,
  findChild,
  hasChild,
} from "./ast";

// =============================================================================
// Text Extraction (ECMA-376 compliant)
// =============================================================================

/**
 * Extract text content from XML AST nodes.
 *
 * This function uses type guards to safely extract text from various node types.
 * It accepts `unknown` to handle transitional code that may pass different formats.
 *
 * Handles:
 * - Plain strings (passed through)
 * - XmlText nodes `{ type: "text", value: "..." }` (returns value property)
 * - XmlElement nodes (returns concatenated text children)
 *
 * @see ECMA-376 Part 1, Section 21.1.2.3.12 (a:t - Text)
 * @param value - Value to extract text from
 * @returns Text content or undefined
 */
export function getXmlText(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  // Handle plain string
  if (typeof value === "string") {
    return value;
  }

  // Handle XmlText node (type: "text")
  if (isXmlText(value)) {
    return value.value;
  }

  // Handle XmlElement - get concatenated text content
  if (isXmlElement(value)) {
    const text = getTextContent(value);
    if (text.length > 0) {
      return text;
    }
    return undefined;
  }

  return undefined;
}

// =============================================================================
// Parser
// =============================================================================

export { parseXml } from "./parser";

// =============================================================================
// Serializer
// =============================================================================

export type { SerializeOptions } from "./serializer";
export { serializeElement, serializeDocument, serializeNode } from "./serializer";

// =============================================================================
// Markup Compatibility (ECMA-376 Part 3)
// =============================================================================

export type { MarkupCompatibilityOptions } from "./markup-compatibility";
export { applyMarkupCompatibility } from "./markup-compatibility";

// =============================================================================
// Escape / Decode Utilities
// =============================================================================

export type { XmlString } from "./escape";
export { escapeXml, decodeXmlEntities, unsafeXml, emptyXml } from "./escape";

// =============================================================================
// String Utilities
// =============================================================================

export {
  stripCdata,
  escapeTab,
  escapeSpace,
  escapeWhitespace,
  trimTrailingSemicolon,
  getBasename,
  normalizePptPath,
  replaceDspNamespace,
} from "./string-utils";
