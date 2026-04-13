/**
 * @file Font style and classification detection
 *
 * Utilities for detecting font styles and classification from PDF font names.
 * Based on common PDF font naming conventions.
 *
 * Note on "symbol font" vs. PDF Symbolic flag (FontDescriptor Flags bit 3):
 * The Symbolic flag means "contains glyphs outside the Adobe Standard Latin
 * character set" — CJK fonts, Cyrillic fonts, and many embedded fonts also
 * have this flag set. It does NOT reliably indicate a symbol/dingbats font.
 * Therefore, symbol font detection here uses font-name heuristics rather
 * than the Symbolic flag.
 */

/**
 * Normalize PDF font name by removing subset prefix
 *
 * PDF fonts may have a 6-character subset prefix followed by '+'.
 * Example: "ABCDEF+Helvetica" → "Helvetica"
 */
export function normalizeFontName(pdfFontName: string): string {
  const name = pdfFontName.startsWith("/") ? pdfFontName.slice(1) : pdfFontName;
  const plusIndex = name.indexOf("+");
  if (plusIndex > 0) {
    return name.slice(plusIndex + 1);
  }
  return name;
}

/**
 * Detect if font name indicates bold style
 *
 * Based on common PDF font naming conventions:
 * - "Bold" suffix or keyword
 * - "-BD" or "_BD" suffix
 * - "-B" suffix
 */
export function isBoldFont(fontName: string): boolean {
  const lower = fontName.toLowerCase();
  return (
    lower.includes("bold") ||
    lower.includes("-bd") ||
    lower.includes("_bd") ||
    lower.endsWith("-b")
  );
}

/**
 * Detect if font name indicates italic style
 *
 * Based on common PDF font naming conventions:
 * - "Italic" or "Oblique" keyword
 * - "-IT" or "_IT" suffix
 * - "-I" suffix
 */
export function isItalicFont(fontName: string): boolean {
  const lower = fontName.toLowerCase();
  return (
    lower.includes("italic") ||
    lower.includes("oblique") ||
    lower.includes("-it") ||
    lower.includes("_it") ||
    lower.endsWith("-i")
  );
}

/**
 * Known symbol / dingbats font family names (lower-cased).
 *
 * These fonts map glyphs to the Unicode Private Use Area (U+E000–U+F8FF)
 * as their standard encoding. PUA entries in their ToUnicode CMap are
 * correct — not a corruption signal.
 *
 * Entries cover:
 *  - PDF Standard 14: Symbol, ZapfDingbats
 *  - Microsoft TrueType dingbats: Wingdings (1/2/3), Webdings
 *
 * Matching strips the subset prefix (via {@link normalizeFontName}) and
 * the style suffix ("-Regular", "-Bold", …) before comparing.
 */
const SYMBOL_FONT_FAMILIES: ReadonlySet<string> = new Set([
  "symbol",
  "zapfdingbats",
  "wingdings",
  "wingdings2",
  "wingdings3",
  "webdings",
]);

/**
 * Detect whether a PDF BaseFont name refers to a symbol / dingbats font.
 *
 * Symbol fonts legitimately use Private Use Area code points in their
 * ToUnicode CMap. Callers should skip PUA-based corruption heuristics
 * for these fonts.
 *
 * @param baseFont - Raw BaseFont value from the PDF font dictionary
 *                   (e.g. "/CPNHAK+Wingdings-Regular", "Symbol")
 */
export function isSymbolFont(baseFont: string | undefined): boolean {
  if (!baseFont) {
    return false;
  }

  // Remove subset prefix: "/CPNHAK+Wingdings-Regular" → "Wingdings-Regular"
  const name = normalizeFontName(baseFont);

  // Strip style suffix: "Wingdings-Regular" → "Wingdings"
  const dashIndex = name.indexOf("-");
  const family = dashIndex > 0 ? name.slice(0, dashIndex) : name;

  return SYMBOL_FONT_FAMILIES.has(family.toLowerCase());
}
