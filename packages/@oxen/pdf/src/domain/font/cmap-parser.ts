/**
 * @file ToUnicode CMap parser
 *
 * Pure PDF CMap parsing functions for ToUnicode mappings.
 * PDF Reference Section 5.9.1 - ToUnicode CMaps
 */

import type { FontMapping } from "./types";

/**
 * CMap parse result containing mapping and detected byte width
 */
export type CMapParseResult = {
  readonly mapping: FontMapping;
  readonly codeByteWidth: 1 | 2;
};

export type CMapParserOptions = {
  /**
   * Maximum entries to generate from a single `bfrange`.
   *
   * Default: 256.
   */
  readonly maxRangeEntries?: number;
};

/* eslint-disable no-restricted-syntax -- parsers require mutable state for regex iteration */

/**
 * Maximum number of entries to generate from a single `bfrange`.
 *
 * ## Background
 *
 * CID fonts can have up to 65536 character codes (2-byte codes).
 * A single `bfrange` can theoretically cover this entire range:
 *
 *   beginbfrange
 *   <0000> <FFFF> <0020>
 *   endbfrange
 *
 * However, generating 65536 entries would:
 * - Use significant memory (Map entry overhead varies by runtime)
 * - Take noticeable time to process
 * - Rarely be necessary (most ranges are small)
 *
 * ## Chosen Limit: 256
 *
 * Memory estimate (rough): 256 entries ≈ a few KB.
 *
 * This handles:
 * - Standard 8-bit encoding ranges
 * - Common CID subsets (e.g., ASCII, Latin-1)
 *
 * For larger ranges, entries beyond this limit are skipped.
 *
 * @see PDF Reference 1.7, Section 5.9.2 (ToUnicode CMaps)
 */
const BFRANGE_MAX_ENTRIES = 256;

/**
 * Parse ToUnicode CMap data and detect byte width
 */
export function parseToUnicodeCMap(
  data: string,
  options: CMapParserOptions = {}
): CMapParseResult {
  const mapping: FontMapping = new Map();
  let maxSourceHexLength = 0;

  // Parse beginbfchar sections (single character mappings)
  const bfcharLength = parseBfChar(data, mapping);
  maxSourceHexLength = Math.max(maxSourceHexLength, bfcharLength);

  // Parse beginbfrange sections (range mappings)
  const bfrangeLength = parseBfRange(data, mapping, options);
  maxSourceHexLength = Math.max(maxSourceHexLength, bfrangeLength);

  // Determine byte width from source hex length
  // 2 hex digits = 1 byte, 4 hex digits = 2 bytes
  const codeByteWidth: 1 | 2 = maxSourceHexLength > 2 ? 2 : 1;

  return { mapping, codeByteWidth };
}

/**
 * Parse beginbfchar sections
 * Format: <source> <destination>
 * Returns the maximum source hex length found
 */
export function parseBfChar(data: string, mapping: FontMapping): number {
  const sectionRegex = /beginbfchar\s*\n?([\s\S]*?)endbfchar/gi;
  let sectionMatch;
  let maxSourceLength = 0;

  while ((sectionMatch = sectionRegex.exec(data)) !== null) {
    const content = sectionMatch[1];
    if (!content) {
      continue;
    }

    // Match each <source> <destination> pair
    const entryRegex = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;
    let entryMatch;

    while ((entryMatch = entryRegex.exec(content)) !== null) {
      const sourceHex = entryMatch[1];
      const destHex = entryMatch[2];
      if (!sourceHex || !destHex) {
        continue;
      }

      maxSourceLength = Math.max(maxSourceLength, sourceHex.length);

      const source = parseInt(sourceHex, 16);
      const unicode = hexToString(destHex);

      if (unicode) {
        mapping.set(source, unicode);
      }
    }
  }

  return maxSourceLength;
}

/**
 * Parse beginbfrange sections
 * Format: <start> <end> <destStart> or <start> <end> [<dest1> <dest2> ...]
 * Returns the maximum source hex length found
 */
export function parseBfRange(
  data: string,
  mapping: FontMapping,
  options: CMapParserOptions = {}
): number {
  const sectionRegex = /beginbfrange\s*\n?([\s\S]*?)endbfrange/gi;
  let sectionMatch;
  let maxSourceLength = 0;
  const maxRangeEntries = options.maxRangeEntries ?? BFRANGE_MAX_ENTRIES;

  while ((sectionMatch = sectionRegex.exec(data)) !== null) {
    const content = sectionMatch[1];
    if (!content) {
      continue;
    }

    // Match range entries: <start> <end> <destStart>
    const simpleRangeRegex =
      /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;
    let simpleMatch;

    while ((simpleMatch = simpleRangeRegex.exec(content)) !== null) {
      const startHex = simpleMatch[1];
      const endHex = simpleMatch[2];
      const destHex = simpleMatch[3];
      if (!startHex || !endHex || !destHex) {
        continue;
      }

      maxSourceLength = Math.max(maxSourceLength, startHex.length, endHex.length);

      const start = parseInt(startHex, 16);
      const end = parseInt(endHex, 16);
      const destStart = parseInt(destHex, 16);

      const rangeSize = end - start + 1;
      if (rangeSize > maxRangeEntries) {
        console.warn(
          `[PDF CMap] bfrange from 0x${start.toString(16)} to 0x${end.toString(16)} ` +
            `has ${rangeSize} entries, limiting to ${maxRangeEntries}. ` +
            "Some character mappings may be missing."
        );
      }

      const actualSize = Math.min(rangeSize, maxRangeEntries);

      for (let i = 0; i < actualSize; i++) {
        const source = start + i;
        const unicode = String.fromCodePoint(destStart + i);
        mapping.set(source, unicode);
      }
    }

    // Match array range entries: <start> <end> [<dest1> <dest2> ...]
    const arrayRangeRegex =
      /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*\[([\s\S]*?)\]/g;
    let arrayMatch;

    while ((arrayMatch = arrayRangeRegex.exec(content)) !== null) {
      const startHex = arrayMatch[1];
      const endHex = arrayMatch[2];
      const arrayContent = arrayMatch[3];
      if (!startHex || !endHex || !arrayContent) {
        continue;
      }

      maxSourceLength = Math.max(maxSourceLength, startHex.length, endHex.length);

      const start = parseInt(startHex, 16);
      const end = parseInt(endHex, 16);

      const rangeSize = end - start + 1;
      if (rangeSize > maxRangeEntries) {
        console.warn(
          `[PDF CMap] bfrange from 0x${start.toString(16)} to 0x${end.toString(16)} ` +
            `has ${rangeSize} entries, limiting to ${maxRangeEntries}. ` +
            "Some character mappings may be missing."
        );
      }

      // Parse array elements
      const destRegex = /<([0-9a-fA-F]+)>/g;
      const dests: string[] = [];
      let destMatch;
      const maxDestEntriesToRead = Math.min(rangeSize, maxRangeEntries);

      while ((destMatch = destRegex.exec(arrayContent)) !== null) {
        if (dests.length >= maxDestEntriesToRead) {
          break;
        }
        const hex = destMatch[1];
        if (hex) {
          const unicode = hexToString(hex);
          if (unicode) {dests.push(unicode);}
        }
      }

      // Apply mappings
      const actualSize = Math.min(rangeSize, dests.length, maxRangeEntries);
      for (let i = 0; i < actualSize; i++) {
        const unicode = dests[i];
        if (unicode) {
          mapping.set(start + i, unicode);
        }
      }
    }
  }

  return maxSourceLength;
}

/**
 * Convert hex string to Unicode string
 * Handles both 2-byte (BMP) and 4-byte (surrogate) encodings
 */
export function hexToString(hex: string): string | null {
  if (hex.length === 0 || hex.length % 2 !== 0) {return null;}

  try {
    // For 4-digit hex (2 bytes), it's a single BMP character
    if (hex.length <= 4) {
      const code = parseInt(hex, 16);
      return String.fromCodePoint(code);
    }

    // For longer hex, treat as UTF-16BE
    let result = "";
    for (let i = 0; i < hex.length; i += 4) {
      const chunk = hex.slice(i, i + 4);
      const code = parseInt(chunk, 16);
      result += String.fromCodePoint(code);
    }
    return result;
  } catch {
    return null;
  }
}
