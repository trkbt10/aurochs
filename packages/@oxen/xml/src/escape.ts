/**
 * @file XML escaping utilities
 * XML-specific escape functions, extending markup base
 *
 * Inherits from markup module and re-exports for XML context.
 * OOXML module inherits from this module.
 */

// =============================================================================
// XML String Type
// =============================================================================

/**
 * Branded string type for safe XML content.
 * Inherits from MarkupString.
 */
export type XmlString = string & { readonly __xmlBrand?: "XmlString" };

// =============================================================================
// Escape Functions
// =============================================================================

/**

/**
 * Mark a string as safe XML without escaping.
 * Use only for trusted content.
 */
export function unsafeXml(xml: string): XmlString {
  return unsafeMarkup(xml) as XmlString;
}

/**
 * Create an empty XML string.
 */
export function emptyXml(): XmlString {
  return emptyMarkup() as XmlString;
}

// =============================================================================
// Escape Maps
// =============================================================================

/**
 * Character escape mappings for XML (encode: char -> entity).
 * Covers all characters that need escaping in both content and attributes.
 */
const ENCODE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

/**
 * Entity decode mappings for XML (decode: entity -> char).
 */
const DECODE_MAP: Record<string, string> = {
  "&lt;": "<",
  "&gt;": ">",
  "&amp;": "&",
  "&apos;": "'",
  "&quot;": '"',
};

// =============================================================================
// Escape (Encode) Functions
// =============================================================================

/**
 * Escape XML special characters.
 * Escapes &, <, >, ", and ' for safe inclusion in XML content or attributes.
 *
 * @example
 * escapeXml("a & b") // "a &amp; b"
 * escapeXml("<tag>")  // "&lt;tag&gt;"
 */
export function escapeXml(text: string): XmlString {
  return text.replace(/[&<>"']/g, (char) => ENCODE_MAP[char]) as XmlString;
}

/**
 * Alias for escapeXml (backward compatibility).
 */
export const escapeContent = escapeXml;

/**
 * Alias for escapeXml (backward compatibility).
 */
export const escapeAttr: (value: string) => string = escapeXml;

// =============================================================================
// Decode (Unescape) Functions
// =============================================================================

/**
 * Regex pattern for XML entities (named and numeric).
 */
const ENTITY_REGEX = /&(?:lt|gt|amp|apos|quot|#(\d+)|#x([0-9a-fA-F]+));/g;

/**
 * Decode XML entities in text content.
 * Handles named entities (&lt; &gt; &amp; &apos; &quot;)
 * and numeric entities (&#123; &#x7B;).
 *
 * @example
 * decodeXmlEntities("a &amp; b")    // "a & b"
 * decodeXmlEntities("&lt;tag&gt;")  // "<tag>"
 * decodeXmlEntities("&#65;")        // "A"
 * decodeXmlEntities("&#x41;")       // "A"
 */
export function decodeXmlEntities(text: string): string {
  return text.replace(ENTITY_REGEX, (match, decimal, hex) => {
    // Named entity
    if (match in DECODE_MAP) {
      return DECODE_MAP[match];
    }
    // Decimal numeric entity (&#123;)
    if (decimal !== undefined) {
      return String.fromCharCode(parseInt(decimal, 10));
    }
    // Hexadecimal numeric entity (&#x7B;)
    if (hex !== undefined) {
      return String.fromCharCode(parseInt(hex, 16));
    }
    return match;
  });
}

// =============================================================================
// Unsafe / Helper Functions
// =============================================================================

/**
 * Mark a string as safe markup without escaping.
 * Use only for trusted content that is already properly escaped.
 */
export function unsafeMarkup(content: string): XmlString {
  return content as XmlString;
}

/**
 * Create an empty markup string.
 */
export function emptyMarkup(): XmlString {
  return "" as XmlString;
}
