/**
 * @file CJK character detection
 * Unicode-based identification of Chinese, Japanese, Korean characters
 */

/**
 * Unicode ranges for CJK characters.
 * Reference: Unicode Standard - East Asian Scripts
 */
const CJK_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x4e00, 0x9fff], // CJK Unified Ideographs
  [0x3400, 0x4dbf], // CJK Unified Ideographs Extension A
  [0x3000, 0x303f], // CJK Symbols and Punctuation
  [0x3040, 0x309f], // Hiragana
  [0x30a0, 0x30ff], // Katakana
  [0xff00, 0xffef], // Halfwidth and Fullwidth Forms
];

/**
 * Check if a Unicode code point is within CJK ranges.
 *
 * @param charCode - Unicode code point
 * @returns true if the character is CJK
 */
export function isCjkCodePoint(charCode: number): boolean {
  for (const [start, end] of CJK_RANGES) {
    if (charCode >= start && charCode <= end) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a character is CJK.
 *
 * @param char - Single character string
 * @returns true if the character is CJK
 */
export function isCjkChar(char: string): boolean {
  return isCjkCodePoint(char.charCodeAt(0));
}
