/**
 * @file Font style detection
 *
 * Utilities for detecting font styles from PDF font names.
 * Based on common PDF font naming conventions.
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
