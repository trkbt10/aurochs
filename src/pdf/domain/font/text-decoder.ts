/**
 * @file PDF text decoder
 *
 * Pure PDF text decoding using font mappings.
 * PDF Reference Section 5.9 - ToUnicode CMaps
 */

import type { FontInfo, FontMappings } from "./types";

/**
 * Find font info by name with fallback strategies
 */
function findFontInfo(fontName: string, mappings: FontMappings): FontInfo | undefined {
  // Clean font name (remove leading slash and subset prefix)
  const cleanName = fontName.startsWith("/") ? fontName.slice(1) : fontName;

  // Try exact match first
  const exactMatch = mappings.get(cleanName);
  if (exactMatch) {
    return exactMatch;
  }

  // Try without subset prefix (e.g., "XGIAKD+Arial" → "Arial")
  const plusIndex = cleanName.indexOf("+");
  if (plusIndex > 0) {
    const baseName = cleanName.slice(plusIndex + 1);
    const baseMatch = mappings.get(baseName);
    if (baseMatch) {
      return baseMatch;
    }
  }

  // Try matching by prefix
  for (const [key, value] of mappings.entries()) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      return value;
    }
  }

  return undefined;
}

/**
 * Decode text using font mapping
 */
export function decodeText(
  rawText: string,
  fontName: string,
  mappings: FontMappings
): string {
  const fontInfo = findFontInfo(fontName, mappings);

  if (!fontInfo || fontInfo.mapping.size === 0) {
    return rawText;
  }

  const { mapping, codeByteWidth } = fontInfo;

  return codeByteWidth === 2
    ? decodeTwoByteText(rawText, mapping)
    : decodeSingleByteText(rawText, mapping);
}

/**
 * Decode text with 2-byte (CID) encoding
 */
function decodeTwoByteText(rawText: string, mapping: Map<number, string>): string {
  const chars: string[] = [];
  // eslint-disable-next-line no-restricted-syntax -- index iteration for byte processing
  for (let i = 0; i < rawText.length; i += 2) {
    const highByte = rawText.charCodeAt(i);
    const lowByte = i + 1 < rawText.length ? rawText.charCodeAt(i + 1) : 0;
    const code = (highByte << 8) | lowByte;

    const mapped = mapping.get(code);
    if (mapped) {
      chars.push(mapped);
    } else if (code >= 32 && code < 127) {
      // Preserve printable ASCII
      chars.push(String.fromCharCode(code));
    }
  }
  return chars.join("");
}

/**
 * Decode text with single-byte encoding
 */
function decodeSingleByteText(rawText: string, mapping: Map<number, string>): string {
  return Array.from(rawText)
    .map((char) => {
      const code = char.charCodeAt(0);
      return mapping.get(code) ?? char;
    })
    .join("");
}
