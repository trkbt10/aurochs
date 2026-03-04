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

export function escapeXmlText(value: string): string {
  let escaped = value;
  for (const pattern of XML_TEXT_PATTERNS) {
    escaped = escaped.replace(pattern.from, pattern.to);
  }
  return escaped;
}

export function escapeXmlAttr(value: string): string {
  let escaped = value;
  for (const pattern of XML_ATTR_PATTERNS) {
    escaped = escaped.replace(pattern.from, pattern.to);
  }
  return escaped;
}
