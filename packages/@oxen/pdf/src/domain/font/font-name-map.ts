/**
 * @file Font name normalization
 *
 * Normalizes PDF font names to clean font-family names.
 *
 * PDF Standard 14 Fonts (ISO 32000-1:2008 Section 9.6.2.2):
 * These are the only fonts guaranteed to be available without embedding.
 * They map to common system fonts for web rendering.
 */

/**
 * PDF Standard 14 fonts → System font mapping
 *
 * ISO 32000-1:2008 Section 9.6.2.2 defines exactly 14 standard fonts.
 * These are the ONLY fonts that should be mapped to system equivalents.
 * All other fonts should use their original name (possibly embedded).
 */
const PDF_STANDARD_14_FONTS: Record<string, string> = {
  // Helvetica family (4 variants) → Arial
  "Helvetica": "Arial",
  "Helvetica-Bold": "Arial",
  "Helvetica-Oblique": "Arial",
  "Helvetica-BoldOblique": "Arial",

  // Times family (4 variants) → Times New Roman
  "Times-Roman": "Times New Roman",
  "Times-Bold": "Times New Roman",
  "Times-Italic": "Times New Roman",
  "Times-BoldItalic": "Times New Roman",

  // Courier family (4 variants) → Courier New
  "Courier": "Courier New",
  "Courier-Bold": "Courier New",
  "Courier-Oblique": "Courier New",
  "Courier-BoldOblique": "Courier New",

  // Symbol fonts (2 variants)
  "Symbol": "Symbol",
  "ZapfDingbats": "Wingdings",
};

/**
 * Normalize PDF font name to a clean font-family name.
 *
 * For embedded fonts, returns the font name as-is (after cleanup).
 * For PDF Standard 14 fonts, maps to system font equivalents.
 *
 * IMPORTANT: Do NOT modify font names beyond removing PDF syntax artifacts.
 * Embedded fonts use their exact names for @font-face declarations.
 * Changing the name (e.g., hyphens to spaces) would break font matching.
 *
 * @param pdfFontName - Raw font name from PDF (BaseFont entry)
 * @returns Normalized font-family name
 */
export function normalizeFontFamily(pdfFontName: string): string {
  // Step 1: Remove leading slash (PDF name syntax)
  const cleanName = pdfFontName.startsWith("/") ? pdfFontName.slice(1) : pdfFontName;

  // Step 2: Remove subset prefix (e.g., "ABCDEF+" → "")
  // ISO 32000-1 Section 9.6.4: Subset fonts use 6-letter tag + "+"
  const plusIndex = cleanName.indexOf("+");
  const baseName = plusIndex > 0 ? cleanName.slice(plusIndex + 1) : cleanName;

  // Step 3: Check PDF Standard 14 fonts (exact match required)
  // ISO 32000-1:2008 Section 9.6.2.2 defines exactly 14 standard fonts
  const standard14 = PDF_STANDARD_14_FONTS[baseName];
  if (standard14) {
    return standard14;
  }

  // Step 4: Return font name as-is
  // Non-standard fonts are preserved exactly for @font-face matching
  return baseName;
}
