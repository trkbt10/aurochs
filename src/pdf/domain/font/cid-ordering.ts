/**
 * @file CID Ordering fallback mappings
 *
 * Provides basic CID-to-Unicode fallback mappings for CID fonts
 * when ToUnicode CMap is not available.
 *
 * PDF Reference 5.6.1 - CIDSystemInfo Dictionary
 *
 * ## Background
 *
 * CID fonts use character identifiers (CIDs) rather than character codes.
 * The mapping from CID to Unicode is typically provided via ToUnicode CMap.
 * When ToUnicode is missing, we can use standard Adobe mappings based on
 * the font's CIDSystemInfo Ordering field.
 *
 * ## Limitations
 *
 * Full CID-to-Unicode mappings contain thousands of entries. This module
 * provides a minimal fallback for common character ranges:
 * - ASCII-compatible range (CID 1-94 for most orderings)
 * - Common punctuation and symbols
 *
 * For complete mappings, external CMap files would be needed.
 */

import type { CIDOrdering } from "./types";
import { JAPAN1_KANJI_MAPPINGS } from "./japan1-kanji-mappings";

/**
 * CID-to-Unicode fallback mapping
 */
export type CIDFallbackMapping = ReadonlyMap<number, string>;

/**
 * ASCII range mapping (CID 1-94 maps to U+0021-U+007E in most orderings)
 *
 * This covers basic Latin characters which are commonly at these CID positions
 * in Adobe's character collections.
 */
const ASCII_OFFSET_MAPPING: CIDFallbackMapping = (() => {
  const map = new Map<number, string>();
  // CID 1 typically maps to U+0020 (space) in Adobe orderings
  // CID 2-95 maps to U+0021-U+007E (printable ASCII)
  for (let cid = 1; cid <= 95; cid++) {
    map.set(cid, String.fromCodePoint(0x001f + cid)); // CID 1 -> U+0020
  }
  return map;
})();

/**
 * Japan1 specific common mappings
 *
 * Adobe-Japan1 ordering has well-defined mappings for:
 * - CID 0: .notdef (not mapped)
 * - CID 1-94: Half-width ASCII
 * - CID 231-325: Full-width ASCII (mapped to half-width equivalents)
 * - CID 633-695: Half-width katakana
 * - CID 842-935: Hiragana
 * - CID 936-1028: Full-width Katakana
 */
const JAPAN1_EXTRA_MAPPINGS: CIDFallbackMapping = (() => {
  const map = new Map<number, string>();

  // Full-width ASCII to Unicode (CID 231-325 -> U+FF01-U+FF5E)
  // These are full-width forms but we map to standard ASCII for compatibility
  for (let i = 0; i <= 94; i++) {
    map.set(231 + i, String.fromCodePoint(0x0021 + i));
  }

  // Half-width katakana (CID 633-695 -> U+FF61-U+FF9F)
  for (let i = 0; i <= 62; i++) {
    map.set(633 + i, String.fromCodePoint(0xff61 + i));
  }

  // Hiragana (CID 842-935 -> U+3041-U+3096)
  // Small hiragana and regular hiragana
  for (let i = 0; i <= 93; i++) {
    map.set(842 + i, String.fromCodePoint(0x3041 + i));
  }

  // Full-width Katakana (CID 936-1028 -> U+30A1-U+30FA)
  // Small katakana and regular katakana
  for (let i = 0; i <= 92; i++) {
    map.set(936 + i, String.fromCodePoint(0x30a1 + i));
  }

  // Common punctuation (Japan1 specific CIDs)
  // CID 96: Japanese comma (U+3001)
  map.set(96, "\u3001"); // 、
  // CID 97: Japanese period (U+3002)
  map.set(97, "\u3002"); // 。
  // CID 98: Japanese quotation marks (left)
  map.set(98, "\u300C"); // 「
  // CID 99: Japanese quotation marks (right)
  map.set(99, "\u300D"); // 」
  // CID 100: Full-width comma
  map.set(100, "\uFF0C"); // ，
  // CID 101: Full-width period
  map.set(101, "\uFF0E"); // ．
  // CID 102: Full-width colon
  map.set(102, "\uFF1A"); // ：
  // CID 103: Full-width semicolon
  map.set(103, "\uFF1B"); // ；
  // CID 104: Full-width question mark
  map.set(104, "\uFF1F"); // ？
  // CID 105: Full-width exclamation mark
  map.set(105, "\uFF01"); // ！

  // Japanese brackets
  // CID 106: Full-width left parenthesis
  map.set(106, "\uFF08"); // （
  // CID 107: Full-width right parenthesis
  map.set(107, "\uFF09"); // ）

  // Katakana middle dot
  map.set(327, "\u30FB"); // ・

  // Long vowel mark
  map.set(328, "\u30FC"); // ー

  return map;
})();

/**
 * GB1 (Simplified Chinese) specific mappings
 *
 * Adobe-GB1 ordering for Simplified Chinese.
 * Provides common punctuation mappings.
 */
const GB1_EXTRA_MAPPINGS: CIDFallbackMapping = (() => {
  const map = new Map<number, string>();

  // Common Chinese punctuation
  // CID 7716: Chinese comma (U+FF0C)
  map.set(7716, "\uFF0C"); // ，
  // CID 7717: Chinese period (U+3002)
  map.set(7717, "\u3002"); // 。
  // CID 7718: Chinese semicolon
  map.set(7718, "\uFF1B"); // ；
  // CID 7719: Chinese colon
  map.set(7719, "\uFF1A"); // ：
  // CID 7720: Chinese question mark
  map.set(7720, "\uFF1F"); // ？
  // CID 7721: Chinese exclamation mark
  map.set(7721, "\uFF01"); // ！

  // Ideographic comma and period
  map.set(117, "\u3001"); // 、
  map.set(118, "\u3002"); // 。

  return map;
})();

/**
 * Korea1 (Korean) specific mappings
 *
 * Adobe-Korea1 ordering for Korean.
 * Provides common punctuation mappings.
 */
const KOREA1_EXTRA_MAPPINGS: CIDFallbackMapping = (() => {
  const map = new Map<number, string>();

  // Common Korean punctuation (similar to Japanese/Chinese)
  map.set(96, "\u3001"); // 、
  map.set(97, "\u3002"); // 。

  return map;
})();

/**
 * Get fallback mapping for a given CID ordering
 *
 * Returns a combined mapping of ASCII range plus ordering-specific mappings.
 */
export function getCIDFallbackMapping(ordering: CIDOrdering): CIDFallbackMapping {
  const combined = new Map<number, string>(ASCII_OFFSET_MAPPING);

  switch (ordering) {
    case "Japan1":
      for (const [k, v] of JAPAN1_EXTRA_MAPPINGS) {
        combined.set(k, v);
      }
      // Add kanji mappings (CJK Unified Ideographs)
      for (const [k, v] of JAPAN1_KANJI_MAPPINGS) {
        combined.set(k, v);
      }
      break;
    case "GB1":
      for (const [k, v] of GB1_EXTRA_MAPPINGS) {
        combined.set(k, v);
      }
      break;
    case "CNS1":
      // CNS1 (Traditional Chinese) shares similar structure with GB1
      // Basic ASCII range is already included
      break;
    case "Korea1":
      for (const [k, v] of KOREA1_EXTRA_MAPPINGS) {
        combined.set(k, v);
      }
      break;
  }

  return combined;
}

/**
 * Detect CID ordering from font ordering string
 *
 * The Ordering string in CIDSystemInfo typically contains the ordering name.
 *
 * - Adobe character collections: Japan1, GB1, CNS1, Korea1 (provide script type)
 * - Identity: Modern generic encoding (no script type info, ISO 32000-1 Section 9.7.5)
 */
export function detectCIDOrdering(ordering: string): CIDOrdering | null {
  const normalized = ordering.toLowerCase();

  if (normalized.includes("japan")) {
    return "Japan1";
  }
  if (normalized.includes("gb")) {
    return "GB1";
  }
  if (normalized.includes("cns")) {
    return "CNS1";
  }
  if (normalized.includes("korea") || normalized.includes("ksc")) {
    return "Korea1";
  }
  if (normalized.includes("identity")) {
    return "Identity";
  }

  return null;
}

/**
 * Try to decode a CID using fallback mapping
 *
 * Returns the Unicode character if found, or null if no mapping exists.
 */
export function decodeCIDFallback(
  cid: number,
  ordering: CIDOrdering | null
): string | null {
  // CID 0 is .notdef (no glyph)
  if (cid === 0) {
    return null;
  }

  // Try ASCII range first (most common case)
  const asciiChar = ASCII_OFFSET_MAPPING.get(cid);
  if (asciiChar) {
    return asciiChar;
  }

  // Try ordering-specific mappings
  if (ordering) {
    const orderingMap = getCIDFallbackMapping(ordering);
    const orderingChar = orderingMap.get(cid);
    if (orderingChar) {
      return orderingChar;
    }
  }

  return null;
}
