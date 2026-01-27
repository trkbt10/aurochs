/**
 * @file Unicode Script detection based on UAX #24
 *
 * Detects script type from Unicode code points.
 * Used for ECMA-376 font element selection (a:latin, a:ea, a:cs).
 *
 * @see Unicode Standard Annex #24 - Unicode Script Property
 * @see https://www.unicode.org/reports/tr24/
 */

/**
 * Script type for ECMA-376 font elements.
 *
 * - latin: a:latin element (Western scripts)
 * - eastAsian: a:ea element (CJK scripts)
 * - complexScript: a:cs element (RTL, Indic, Southeast Asian scripts)
 */
export type ScriptType = "latin" | "eastAsian" | "complexScript";

/**
 * Detect script type from text content based on Unicode Script Property (UAX #24).
 *
 * Analyzes the first non-ASCII character to determine the dominant script.
 * Returns the script type for ECMA-376 font element selection.
 *
 * @param text - Text content to analyze
 * @returns Script type based on Unicode code point ranges
 */
export function detectScriptFromText(text: string): ScriptType {
  for (const char of text) {
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined || codePoint < 0x80) {
      // ASCII - continue to next character
      continue;
    }

    const script = getScriptType(codePoint);
    if (script !== "latin") {
      return script;
    }
  }

  return "latin";
}

/**
 * Get script type for a Unicode code point.
 *
 * Based on Unicode Script Property (UAX #24) code point ranges.
 * Simplified mapping for ECMA-376 font element selection.
 *
 * @see https://www.unicode.org/Public/UCD/latest/ucd/Scripts.txt
 */
function getScriptType(codePoint: number): ScriptType {
  // === East Asian (CJK) Scripts ===

  // CJK Unified Ideographs and Extensions
  if (
    (codePoint >= 0x4e00 && codePoint <= 0x9fff) || // CJK Unified Ideographs
    (codePoint >= 0x3400 && codePoint <= 0x4dbf) || // CJK Extension A
    (codePoint >= 0x20000 && codePoint <= 0x2a6df) || // CJK Extension B
    (codePoint >= 0x2a700 && codePoint <= 0x2b73f) || // CJK Extension C
    (codePoint >= 0x2b740 && codePoint <= 0x2b81f) || // CJK Extension D
    (codePoint >= 0x2b820 && codePoint <= 0x2ceaf) || // CJK Extension E
    (codePoint >= 0x2ceb0 && codePoint <= 0x2ebef) || // CJK Extension F
    (codePoint >= 0x30000 && codePoint <= 0x3134f) || // CJK Extension G
    (codePoint >= 0xf900 && codePoint <= 0xfaff) || // CJK Compatibility Ideographs
    (codePoint >= 0x2f800 && codePoint <= 0x2fa1f) // CJK Compatibility Ideographs Supplement
  ) {
    return "eastAsian";
  }

  // Hiragana
  if (codePoint >= 0x3040 && codePoint <= 0x309f) {
    return "eastAsian";
  }

  // Katakana
  if (
    (codePoint >= 0x30a0 && codePoint <= 0x30ff) || // Katakana
    (codePoint >= 0x31f0 && codePoint <= 0x31ff) // Katakana Phonetic Extensions
  ) {
    return "eastAsian";
  }

  // Hangul (Korean)
  if (
    (codePoint >= 0xac00 && codePoint <= 0xd7af) || // Hangul Syllables
    (codePoint >= 0x1100 && codePoint <= 0x11ff) || // Hangul Jamo
    (codePoint >= 0x3130 && codePoint <= 0x318f) || // Hangul Compatibility Jamo
    (codePoint >= 0xa960 && codePoint <= 0xa97f) || // Hangul Jamo Extended-A
    (codePoint >= 0xd7b0 && codePoint <= 0xd7ff) // Hangul Jamo Extended-B
  ) {
    return "eastAsian";
  }

  // Bopomofo (Chinese phonetic)
  if (
    (codePoint >= 0x3100 && codePoint <= 0x312f) || // Bopomofo
    (codePoint >= 0x31a0 && codePoint <= 0x31bf) // Bopomofo Extended
  ) {
    return "eastAsian";
  }

  // CJK Symbols and Punctuation
  if (codePoint >= 0x3000 && codePoint <= 0x303f) {
    return "eastAsian";
  }

  // Halfwidth and Fullwidth Forms (CJK portion)
  if (codePoint >= 0xff00 && codePoint <= 0xffef) {
    return "eastAsian";
  }

  // === Complex Scripts (RTL, Indic, Southeast Asian) ===

  // Arabic
  if (
    (codePoint >= 0x0600 && codePoint <= 0x06ff) || // Arabic
    (codePoint >= 0x0750 && codePoint <= 0x077f) || // Arabic Supplement
    (codePoint >= 0x08a0 && codePoint <= 0x08ff) || // Arabic Extended-A
    (codePoint >= 0xfb50 && codePoint <= 0xfdff) || // Arabic Presentation Forms-A
    (codePoint >= 0xfe70 && codePoint <= 0xfeff) // Arabic Presentation Forms-B
  ) {
    return "complexScript";
  }

  // Hebrew
  if (
    (codePoint >= 0x0590 && codePoint <= 0x05ff) || // Hebrew
    (codePoint >= 0xfb00 && codePoint <= 0xfb4f) // Alphabetic Presentation Forms (Hebrew)
  ) {
    return "complexScript";
  }

  // Syriac
  if (codePoint >= 0x0700 && codePoint <= 0x074f) {
    return "complexScript";
  }

  // Thaana (Maldivian)
  if (codePoint >= 0x0780 && codePoint <= 0x07bf) {
    return "complexScript";
  }

  // Devanagari (Hindi, Sanskrit)
  if (
    (codePoint >= 0x0900 && codePoint <= 0x097f) || // Devanagari
    (codePoint >= 0xa8e0 && codePoint <= 0xa8ff) // Devanagari Extended
  ) {
    return "complexScript";
  }

  // Bengali
  if (codePoint >= 0x0980 && codePoint <= 0x09ff) {
    return "complexScript";
  }

  // Gurmukhi (Punjabi)
  if (codePoint >= 0x0a00 && codePoint <= 0x0a7f) {
    return "complexScript";
  }

  // Gujarati
  if (codePoint >= 0x0a80 && codePoint <= 0x0aff) {
    return "complexScript";
  }

  // Oriya (Odia)
  if (codePoint >= 0x0b00 && codePoint <= 0x0b7f) {
    return "complexScript";
  }

  // Tamil
  if (codePoint >= 0x0b80 && codePoint <= 0x0bff) {
    return "complexScript";
  }

  // Telugu
  if (codePoint >= 0x0c00 && codePoint <= 0x0c7f) {
    return "complexScript";
  }

  // Kannada
  if (codePoint >= 0x0c80 && codePoint <= 0x0cff) {
    return "complexScript";
  }

  // Malayalam
  if (codePoint >= 0x0d00 && codePoint <= 0x0d7f) {
    return "complexScript";
  }

  // Sinhala
  if (codePoint >= 0x0d80 && codePoint <= 0x0dff) {
    return "complexScript";
  }

  // Thai
  if (codePoint >= 0x0e00 && codePoint <= 0x0e7f) {
    return "complexScript";
  }

  // Lao
  if (codePoint >= 0x0e80 && codePoint <= 0x0eff) {
    return "complexScript";
  }

  // Tibetan
  if (codePoint >= 0x0f00 && codePoint <= 0x0fff) {
    return "complexScript";
  }

  // Myanmar (Burmese)
  if (
    (codePoint >= 0x1000 && codePoint <= 0x109f) || // Myanmar
    (codePoint >= 0xaa60 && codePoint <= 0xaa7f) // Myanmar Extended-A
  ) {
    return "complexScript";
  }

  // Georgian
  if (
    (codePoint >= 0x10a0 && codePoint <= 0x10ff) || // Georgian
    (codePoint >= 0x2d00 && codePoint <= 0x2d2f) // Georgian Supplement
  ) {
    return "complexScript";
  }

  // Ethiopic
  if (
    (codePoint >= 0x1200 && codePoint <= 0x137f) || // Ethiopic
    (codePoint >= 0x1380 && codePoint <= 0x139f) || // Ethiopic Supplement
    (codePoint >= 0x2d80 && codePoint <= 0x2ddf) // Ethiopic Extended
  ) {
    return "complexScript";
  }

  // Khmer (Cambodian)
  if (
    (codePoint >= 0x1780 && codePoint <= 0x17ff) || // Khmer
    (codePoint >= 0x19e0 && codePoint <= 0x19ff) // Khmer Symbols
  ) {
    return "complexScript";
  }

  // Mongolian
  if (codePoint >= 0x1800 && codePoint <= 0x18af) {
    return "complexScript";
  }

  // Default to Latin for unrecognized scripts
  return "latin";
}
