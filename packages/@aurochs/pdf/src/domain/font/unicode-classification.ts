/**
 * @file Unicode character classification utilities for PDF font handling.
 *
 * Provides predicates for Unicode character categories that are relevant
 * to PDF text decoding and ToUnicode CMap diagnostics.
 */

/**
 * Test whether a code point falls in a Unicode Private Use Area.
 *
 * Unicode defines three PUA blocks (Unicode 15.1, Section 23.5):
 *  - BMP PUA:          U+E000 – U+F8FF       (6,400 code points)
 *  - Supplementary PUA-A: U+F0000 – U+FFFFD  (65,534 code points)
 *  - Supplementary PUA-B: U+100000 – U+10FFFD (65,534 code points)
 *
 * PUA code points are used by symbol/dingbats fonts (Wingdings, Symbol,
 * ZapfDingbats) to map glyphs that have no standard Unicode assignment.
 * Their presence in a ToUnicode CMap is normal for such fonts.
 */
export function isPrivateUseCodePoint(codePoint: number): boolean {
  return (
    (codePoint >= 0xe000 && codePoint <= 0xf8ff) ||
    (codePoint >= 0xf0000 && codePoint <= 0xffffd) ||
    (codePoint >= 0x100000 && codePoint <= 0x10fffd)
  );
}

/**
 * Test whether a string contains any Unicode Private Use Area characters.
 *
 * Used by CMap diagnostics to count PUA mappings, and by the text decoder
 * to decide whether a decoded character should be treated as "missing"
 * when the ToUnicode CMap is suspected of corruption.
 */
export function containsPrivateUseCharacter(text: string): boolean {
  return Array.from(text).some((char) => {
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined) {
      return false;
    }
    return isPrivateUseCodePoint(codePoint);
  });
}
