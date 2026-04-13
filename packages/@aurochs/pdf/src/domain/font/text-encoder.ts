/**
 * @file Text encoder for PDF font writing
 *
 * Re-encodes Unicode text to PDF byte sequences using a ResolvedFont.
 *
 * Two encoding strategies:
 *   - CID fonts (codeByteWidth=2): reverse the ToUnicode CMap to find
 *     the original hex byte sequence for each character.
 *   - Single-byte fonts (codeByteWidth=1): encode via WinAnsiEncoding
 *     (the most common PDF single-byte encoding).
 *
 * Returns null when encoding is impossible (e.g. a character has no
 * mapping in the font). The caller must handle this — typically by
 * falling back to a different font or warning the user.
 */

import type { PdfFontToUnicode } from "../document/types";
import type { ResolvedFont } from "./font-provider";
import { WINANSI_ENCODING } from "./encoding-maps";

// =============================================================================
// Reverse ToUnicode map (CID fonts)
// =============================================================================

/**
 * Build a reverse map from Unicode strings to source hex byte sequences.
 *
 * The ToUnicode CMap maps source bytes → Unicode. This inverts that:
 * Unicode → source hex bytes.
 *
 * When multiple source byte sequences map to the same Unicode string,
 * the first encountered mapping wins (consistent with PDF spec behavior
 * where the first mapping in the CMap takes precedence).
 *
 * @param byteMapping - Forward mapping: hex bytes → Unicode string
 * @returns Reverse mapping: Unicode string → hex bytes (uppercase)
 */
export function buildReverseToUnicodeMap(
  byteMapping: ReadonlyMap<string, string>,
): Map<string, string> {
  const reverse = new Map<string, string>();
  for (const [hexBytes, unicode] of byteMapping) {
    // First mapping wins — don't overwrite
    if (!reverse.has(unicode)) {
      reverse.set(unicode, hexBytes.toUpperCase());
    }
  }
  return reverse;
}

// =============================================================================
// Reverse WinAnsi map (single-byte fonts)
// =============================================================================

/** Build the reverse WinAnsi map: Unicode char → byte value. */
function buildReverseWinAnsi(): ReadonlyMap<string, number> {
  const map = new Map<string, number>();
  for (const [code, unicode] of WINANSI_ENCODING) {
    if (!map.has(unicode)) {
      map.set(unicode, code);
    }
  }
  return map;
}

/**
 * Reverse WinAnsi map: Unicode char → byte value.
 * Eagerly initialized at module load (WINANSI_ENCODING is a constant).
 */
const REVERSE_WINANSI: ReadonlyMap<string, number> = buildReverseWinAnsi();

// =============================================================================
// Encoding result
// =============================================================================

export type TextEncodeResult = {
  /** Encoded byte sequence for the PDF content stream. */
  readonly rawBytes: Uint8Array;
  /** Bytes per character code in the encoded output. */
  readonly codeByteWidth: 1 | 2;
};

// =============================================================================
// Public API
// =============================================================================

/**
 * Encode Unicode text to PDF byte sequences for a given resolved font.
 *
 * For CID fonts: uses the reverse ToUnicode mapping.
 * For single-byte fonts: uses WinAnsiEncoding.
 * For standard14 fonts: uses WinAnsiEncoding.
 *
 * @returns Encoded result, or null if any character cannot be encoded.
 */
export function encodeTextForFont(
  text: string,
  font: ResolvedFont,
): TextEncodeResult | null {
  if (text.length === 0) {
    return { rawBytes: new Uint8Array(0), codeByteWidth: font.codeByteWidth };
  }

  if (font.codeByteWidth === 2) {
    return encodeCIDText(text, font.toUnicode);
  }

  return encodeWinAnsiText(text);
}

/**
 * Encode text using reverse ToUnicode CMap (for CID fonts).
 *
 * Each Unicode character (or surrogate pair) is looked up in the reverse
 * mapping to find its hex byte representation.
 *
 * @returns Encoded result, or null if any character lacks a mapping.
 */
function encodeCIDText(
  text: string,
  toUnicode: PdfFontToUnicode | undefined,
): TextEncodeResult | null {
  if (!toUnicode) {
    // Without a ToUnicode mapping, we cannot encode CID text.
    return null;
  }

  const reverse = buildReverseToUnicodeMap(toUnicode.byteMapping);
  const hexParts: string[] = [];

  // Iterate over Unicode code points (handles surrogate pairs)
  for (const char of text) {
    const hex = reverse.get(char);
    if (hex === undefined) {
      // Character not in the font's ToUnicode mapping — cannot encode
      return null;
    }
    hexParts.push(hex);
  }

  const hexString = hexParts.join("");
  const rawBytes = hexStringToUint8Array(hexString);
  return { rawBytes, codeByteWidth: 2 };
}

/**
 * Encode text using WinAnsiEncoding (for single-byte and Standard 14 fonts).
 *
 * @returns Encoded result, or null if any character is outside WinAnsi range.
 */
function encodeWinAnsiText(text: string): TextEncodeResult | null {
  const reverseMap = REVERSE_WINANSI;
  const bytes = new Uint8Array(text.length);

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = reverseMap.get(char);
    if (code === undefined) {
      // Character not encodable in WinAnsiEncoding
      return null;
    }
    bytes[i] = code;
  }

  return { rawBytes: bytes, codeByteWidth: 1 };
}

// =============================================================================
// Text run splitting by encodability
// =============================================================================

/**
 * A contiguous run of text that can be encoded with a single font.
 *
 * When the primary font cannot encode certain characters, the text is split
 * into runs — some using the primary font, others requiring a fallback.
 */
export type TextRun = {
  /** The text content of this run. */
  readonly text: string;
  /** Whether this run can be encoded by the primary font. */
  readonly encodable: boolean;
};

/**
 * Split text into runs based on whether each character is encodable
 * by the given font.
 *
 * Adjacent characters with the same encodability are merged into a single run.
 * This is the foundation for font fallback: encodable runs use the primary font,
 * non-encodable runs use a fallback font.
 *
 * @param text - Unicode text to split
 * @param font - The primary font to test encodability against
 * @returns Array of TextRun, preserving the original character order
 */
export function splitTextByEncodability(
  text: string,
  font: ResolvedFont,
): readonly TextRun[] {
  if (text.length === 0) {return [];}

  const runs: TextRun[] = [];

  if (font.codeByteWidth === 2) {
    // CID font: check reverse ToUnicode map
    if (!font.toUnicode) {
      // No ToUnicode → entire text is non-encodable
      return [{ text, encodable: false }];
    }
    const reverse = buildReverseToUnicodeMap(font.toUnicode.byteMapping);
    splitByPredicate(text, (char) => reverse.has(char), runs);
  } else {
    // Single-byte font: check WinAnsi map
    const reverseMap = REVERSE_WINANSI;
    splitByPredicate(text, (char) => reverseMap.has(char), runs);
  }

  return runs;
}

/**
 * Split text into runs using a character predicate.
 * Characters where predicate returns true are "encodable", false are not.
 *
 * Uses a reduce-style accumulator to avoid mutable variables.
 */
function splitByPredicate(
  text: string,
  isEncodable: (char: string) => boolean,
  out: TextRun[],
): void {
  type Acc = { text: string; encodable: boolean } | undefined;

  const chars = [...text];
  const final = chars.reduce<Acc>((acc, char) => {
    const encodable = isEncodable(char);
    if (acc === undefined) {
      return { text: char, encodable };
    }
    if (encodable === acc.encodable) {
      return { text: acc.text + char, encodable };
    }
    out.push({ text: acc.text, encodable: acc.encodable });
    return { text: char, encodable };
  }, undefined);

  if (final !== undefined) {
    out.push({ text: final.text, encodable: final.encodable });
  }
}

// =============================================================================
// Hex conversion utilities
// =============================================================================

/**
 * Convert a hex string (e.g. "8140AB") to Uint8Array.
 * Each pair of hex digits becomes one byte.
 */
export function hexStringToUint8Array(hex: string): Uint8Array {
  const length = hex.length / 2;
  const result = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    result[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return result;
}
