/**
 * @file PDF text decoder
 *
 * Pure PDF text decoding using font mappings.
 * PDF Reference Section 5.9 - ToUnicode CMaps
 */

import type { FontInfo, FontMappings } from "./types";
import { decodeCIDFallback } from "./cid-ordering";

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

  if (!fontInfo) {
    return rawText;
  }

  const { mapping, codeByteWidth, ordering, encodingMap } = fontInfo;

  // For 2-byte CID fonts, try CID fallback if mapping is empty or incomplete
  if (codeByteWidth === 2) {
    // Identity ordering has no standard CID fallback mappings
    const fallbackOrdering = ordering === "Identity" ? undefined : ordering;
    return decodeTwoByteText(rawText, mapping, fallbackOrdering);
  }

  // For single-byte fonts, use ToUnicode mapping if available
  if (mapping.size > 0) {
    return decodeSingleByteText(rawText, mapping);
  }

  // Fall back to encoding map if available (WinAnsi, MacRoman, etc.)
  if (encodingMap && encodingMap.size > 0) {
    // Convert ReadonlyMap to Map for decodeSingleByteText
    const mutableMap = new Map(encodingMap);
    return decodeSingleByteText(rawText, mutableMap);
  }

  // No mapping available, return raw text
  return rawText;
}

/**
 * Decode text with 2-byte (CID) encoding.
 *
 * CID fonts use 2-byte character codes that map to Unicode via ToUnicode CMap.
 * Unlike single-byte fonts, the character code does NOT correspond to Unicode
 * code points directly.
 *
 * When ToUnicode mapping is not available or incomplete, attempts CID fallback
 * based on the font's CID ordering (Japan1, GB1, etc.).
 *
 * @see PDF Reference 1.7, Section 5.9 (ToUnicode CMaps)
 */
function decodeTwoByteText(
  rawText: string,
  mapping: Map<number, string>,
  ordering?: "Japan1" | "GB1" | "CNS1" | "Korea1"
): string {
  const chars: string[] = [];
  for (let i = 0; i < rawText.length; i += 2) {
    const highByte = rawText.charCodeAt(i);
    const lowByte = i + 1 < rawText.length ? rawText.charCodeAt(i + 1) : 0;
    const code = (highByte << 8) | lowByte;

    // Try ToUnicode mapping first
    const mapped = mapping.get(code);
    if (mapped) {
      chars.push(mapped);
      continue;
    }

    // Try CID fallback based on ordering
    const cidFallback = decodeCIDFallback(code, ordering ?? null);
    if (cidFallback) {
      chars.push(cidFallback);
      continue;
    }

    // No mapping found - use replacement character (U+FFFD)
    // Do NOT fall back to ASCII interpretation, as 2-byte codes
    // are not ASCII-compatible in CID fonts
    chars.push("\uFFFD");
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
