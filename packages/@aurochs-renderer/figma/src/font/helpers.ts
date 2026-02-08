/**
 * @file Font helper utilities
 */

import type { AbstractFont } from "./types";

/**
 * Common CJK fallback font families by platform
 *
 * These fonts provide coverage for Chinese, Japanese, and Korean characters.
 */
export const CJK_FALLBACK_FONTS = {
  darwin: ["Hiragino Sans", "PingFang SC", "PingFang TC", "Apple SD Gothic Neo"],
  linux: ["Noto Sans CJK JP", "Noto Sans CJK SC", "Noto Sans CJK TC", "Noto Sans CJK KR"],
  win32: ["Yu Gothic", "Microsoft YaHei", "Microsoft JhengHei", "Malgun Gothic"],
};

/**
 * Check if a font has a glyph for a character
 *
 * @param font - Font object (AbstractFont or opentype.js Font)
 * @param char - Character to check
 * @returns True if the font has a glyph for the character (not .notdef)
 */
export function fontHasGlyph(font: AbstractFont, char: string): boolean {
  const glyph = font.charToGlyph(char);
  // Glyph index 0 is always .notdef
  return glyph.index !== 0;
}

/**
 * Check if a character is a CJK character
 *
 * @param char - Character to check
 * @returns True if the character is in CJK ranges
 */
export function isCJKCharacter(char: string): boolean {
  const code = char.codePointAt(0);
  if (code === undefined) return false;

  return (
    // CJK Unified Ideographs
    (code >= 0x4e00 && code <= 0x9fff) ||
    // CJK Unified Ideographs Extension A
    (code >= 0x3400 && code <= 0x4dbf) ||
    // CJK Unified Ideographs Extension B
    (code >= 0x20000 && code <= 0x2a6df) ||
    // CJK Compatibility Ideographs
    (code >= 0xf900 && code <= 0xfaff) ||
    // Hiragana
    (code >= 0x3040 && code <= 0x309f) ||
    // Katakana
    (code >= 0x30a0 && code <= 0x30ff) ||
    // Hangul Syllables
    (code >= 0xac00 && code <= 0xd7af) ||
    // Hangul Jamo
    (code >= 0x1100 && code <= 0x11ff) ||
    // Bopomofo
    (code >= 0x3100 && code <= 0x312f) ||
    // CJK Symbols and Punctuation
    (code >= 0x3000 && code <= 0x303f)
  );
}
