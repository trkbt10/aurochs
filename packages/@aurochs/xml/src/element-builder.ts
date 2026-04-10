/**
 * @file XML element builder for string-based serialization
 *
 * Builds XML/SVG element strings from structured attribute objects,
 * ensuring attribute values are always properly escaped.
 *
 * This eliminates the class of bugs caused by template literal interpolation
 * of unescaped values into XML attribute positions — particularly the
 * double-quote collision problem when embedding CSS font-family values
 * inside `style="..."` attributes.
 *
 * ## Design principles
 *
 * - **Attribute values are always escaped** — callers pass raw values,
 *   the builder handles escaping.
 * - **Typed attribute maps** — callers define what attributes their elements
 *   accept, the builder serializes them.
 * - **No `style` attribute concatenation** — SVG presentation attributes
 *   (font-family, font-size, fill, etc.) should be individual attributes,
 *   not packed into a `style` string.
 *
 * @example
 * ```typescript
 * const attrs = { x: 10, y: 20, fill: "#000", "font-family": "'Yu Gothic', sans-serif" };
 * el("text", attrs, escapeXml("Hello"))
 * // => '<text x="10" y="20" fill="#000" font-family="&apos;Yu Gothic&apos;, sans-serif">Hello</text>'
 * ```
 */

import { escapeXml } from "./escape";

// =============================================================================
// Types
// =============================================================================

/**
 * Attribute value type.
 *
 * - `string` — escaped and quoted
 * - `number` — converted to string, no escaping needed
 * - `undefined` — attribute omitted entirely
 */
export type AttrValue = string | number | undefined;

/**
 * Attribute map: key → value.
 *
 * Keys are attribute names (e.g. "x", "font-family", "clip-path").
 * Values of `undefined` are silently omitted.
 */
export type AttrMap = Readonly<Record<string, AttrValue>>;

// =============================================================================
// Attribute Serialization
// =============================================================================

/**
 * Serialize an attribute map to an XML attribute string.
 *
 * - `undefined` values are omitted
 * - String values are XML-escaped and double-quoted
 * - Number values are serialized as-is (no escaping needed)
 *
 * @example
 * ```typescript
 * serializeAttrs({ x: 10, fill: "#000", hidden: undefined })
 * // => 'x="10" fill="#000"'
 * ```
 */
export function serializeAttrs(attrs: AttrMap): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined) {
      continue;
    }
    if (typeof value === "number") {
      parts.push(`${key}="${value}"`);
    } else {
      parts.push(`${key}="${escapeXml(value)}"`);
    }
  }
  return parts.join(" ");
}

// =============================================================================
// Element Builders
// =============================================================================

/**
 * Build an XML element string with escaped attributes and raw children.
 *
 * Children are concatenated as-is (they should already be escaped or
 * be the output of other `el()` calls).
 *
 * @param tag - Element tag name (e.g. "text", "rect", "g")
 * @param attrs - Attribute map (values are escaped automatically)
 * @param children - Inner content (already-escaped XML strings)
 * @returns Complete XML element string
 *
 * @example
 * ```typescript
 * el("rect", { x: 0, y: 0, width: 100, height: 50, fill: "#fff" })
 * // => '<rect x="0" y="0" width="100" height="50" fill="#fff"/>'
 *
 * el("text", { x: 10, "font-family": "'Yu Gothic', sans-serif" }, "Hello")
 * // => '<text x="10" font-family="&apos;Yu Gothic&apos;, sans-serif">Hello</text>'
 * ```
 */
export function el(tag: string, attrs: AttrMap, ...children: readonly string[]): string {
  const attrStr = serializeAttrs(attrs);
  const attrPart = attrStr.length > 0 ? ` ${attrStr}` : "";

  if (children.length === 0) {
    return `<${tag}${attrPart}/>`;
  }

  const content = children.join("");
  return `<${tag}${attrPart}>${content}</${tag}>`;
}

/**
 * Build a self-closing XML element string.
 *
 * Equivalent to `el(tag, attrs)` with no children.
 */
export function selfClosingEl(tag: string, attrs: AttrMap): string {
  const attrStr = serializeAttrs(attrs);
  const attrPart = attrStr.length > 0 ? ` ${attrStr}` : "";
  return `<${tag}${attrPart}/>`;
}
