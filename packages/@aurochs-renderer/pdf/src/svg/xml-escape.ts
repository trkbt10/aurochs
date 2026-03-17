/** @file XML text and attribute escaping for SVG output. */

const XML_TEXT_PATTERNS = [
  { from: /&/g, to: "&amp;" },
  { from: /</g, to: "&lt;" },
  { from: />/g, to: "&gt;" },
] as const;

const XML_ATTR_PATTERNS = [
  ...XML_TEXT_PATTERNS,
  { from: /"/g, to: "&quot;" },
  { from: /'/g, to: "&apos;" },
] as const;

/** Escape special XML characters in text content. */
export function escapeXmlText(value: string): string {
  // eslint-disable-next-line no-restricted-syntax -- accumulator updated in loop
  let escaped = value;
  for (const pattern of XML_TEXT_PATTERNS) {
    escaped = escaped.replace(pattern.from, pattern.to);
  }
  return escaped;
}

/** Escape special XML characters in attribute values. */
export function escapeXmlAttr(value: string): string {
  // eslint-disable-next-line no-restricted-syntax -- accumulator updated in loop
  let escaped = value;
  for (const pattern of XML_ATTR_PATTERNS) {
    escaped = escaped.replace(pattern.from, pattern.to);
  }
  return escaped;
}
