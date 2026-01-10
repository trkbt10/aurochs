/**
 * @file XML Serializer
 * Converts XmlElement/XmlDocument to XML string representation.
 *
 * Design principles:
 * - Preserves element order and structure
 * - Properly escapes text content and attribute values
 * - Supports optional formatting (indentation)
 * - Handles self-closing tags for empty elements
 */

import type { XmlElement, XmlDocument, XmlNode, XmlText } from "./ast";
import { isXmlElement, isXmlText } from "./ast";
import { escapeXml } from "./escape";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for XML serialization
 */
export type SerializeOptions = {
  /** Include XML declaration (<?xml version="1.0"...?>) */
  readonly declaration?: boolean;
  /** Encoding to specify in declaration (default: "UTF-8") */
  readonly encoding?: string;
  /** Standalone attribute in declaration */
  readonly standalone?: boolean;
  /** Enable pretty printing with indentation */
  readonly indent?: boolean;
  /** Indentation string (default: "  " = 2 spaces) */
  readonly indentString?: string;
  /** Use self-closing tags for empty elements (default: true) */
  readonly selfClosing?: boolean;
};

const DEFAULT_OPTIONS: Required<SerializeOptions> = {
  declaration: false,
  encoding: "UTF-8",
  standalone: true,
  indent: false,
  indentString: "  ",
  selfClosing: true,
};

// =============================================================================
// Serialization Functions
// =============================================================================

/**
 * Serialize an XmlElement to an XML string.
 *
 * @example
 * ```typescript
 * const element: XmlElement = {
 *   type: "element",
 *   name: "p:sp",
 *   attrs: { id: "1" },
 *   children: [
 *     { type: "element", name: "a:t", attrs: {}, children: [
 *       { type: "text", value: "Hello" }
 *     ]}
 *   ]
 * };
 * serializeElement(element)
 * // => '<p:sp id="1"><a:t>Hello</a:t></p:sp>'
 * ```
 */
export function serializeElement(
  element: XmlElement,
  options: SerializeOptions = {},
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  return serializeElementInternal(element, opts, 0);
}

/**
 * Serialize an XmlDocument to an XML string.
 *
 * @example
 * ```typescript
 * const doc: XmlDocument = {
 *   children: [
 *     { type: "element", name: "root", attrs: {}, children: [] }
 *   ]
 * };
 * serializeDocument(doc, { declaration: true })
 * // => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<root/>'
 * ```
 */
export function serializeDocument(
  document: XmlDocument,
  options: SerializeOptions = {},
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const parts: string[] = [];

  // Add XML declaration if requested
  if (opts.declaration) {
    parts.push(buildDeclaration(opts));
    if (opts.indent) {
      parts.push("\n");
    }
  }

  // Serialize all children
  for (const child of document.children) {
    parts.push(serializeNode(child, opts, 0));
  }

  return parts.join("");
}

/**
 * Serialize a single XmlNode (element or text).
 */
export function serializeNode(
  node: XmlNode,
  options: SerializeOptions = {},
  depth: number = 0,
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (isXmlText(node)) {
    return serializeText(node);
  }

  if (isXmlElement(node)) {
    return serializeElementInternal(node, opts, depth);
  }

  // Should never happen with proper typing
  return "";
}

// =============================================================================
// Internal Functions
// =============================================================================

function serializeElementInternal(
  element: XmlElement,
  opts: Required<SerializeOptions>,
  depth: number,
): string {
  const indent = opts.indent ? opts.indentString.repeat(depth) : "";
  const newline = opts.indent ? "\n" : "";

  // Build opening tag
  const attrs = serializeAttributes(element.attrs);
  const attrStr = attrs.length > 0 ? " " + attrs : "";

  // Check if element has children
  if (element.children.length === 0) {
    // Self-closing tag for empty elements
    if (opts.selfClosing) {
      return `${indent}<${element.name}${attrStr}/>`;
    }
    return `${indent}<${element.name}${attrStr}></${element.name}>`;
  }

  // Check if all children are text nodes (inline content)
  const hasOnlyText = element.children.every((child) => isXmlText(child));

  if (hasOnlyText) {
    // Inline text content (no indentation for text-only elements)
    const textContent = element.children
      .filter(isXmlText)
      .map((t) => escapeXml(t.value))
      .join("");
    return `${indent}<${element.name}${attrStr}>${textContent}</${element.name}>`;
  }

  // Mixed or element-only content
  const parts: string[] = [];
  parts.push(`${indent}<${element.name}${attrStr}>`);

  for (const child of element.children) {
    if (isXmlText(child)) {
      // Text nodes in mixed content - don't add extra whitespace
      parts.push(escapeXml(child.value));
    } else if (isXmlElement(child)) {
      if (opts.indent) {
        parts.push(newline);
      }
      parts.push(serializeElementInternal(child, opts, depth + 1));
    }
  }

  if (opts.indent) {
    parts.push(newline);
    parts.push(indent);
  }
  parts.push(`</${element.name}>`);

  return parts.join("");
}

function serializeText(text: XmlText): string {
  return escapeXml(text.value);
}

function serializeAttributes(attrs: Readonly<Record<string, string>>): string {
  const parts: string[] = [];

  // Preserve attribute order (Object.entries maintains insertion order in modern JS)
  for (const [key, value] of Object.entries(attrs)) {
    parts.push(`${key}="${escapeXml(value)}"`);
  }

  return parts.join(" ");
}

function buildDeclaration(opts: Required<SerializeOptions>): string {
  const parts = ['<?xml version="1.0"'];

  if (opts.encoding) {
    parts.push(` encoding="${opts.encoding}"`);
  }

  if (opts.standalone !== undefined) {
    parts.push(` standalone="${opts.standalone ? "yes" : "no"}"`);
  }

  parts.push("?>");
  return parts.join("");
}
