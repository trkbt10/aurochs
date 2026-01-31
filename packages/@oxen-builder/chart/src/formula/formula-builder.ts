/**
 * @file Formula builder utilities
 *
 * Provides functions for building Excel formula strings.
 *
 * @see ECMA-376 Part 1, Section 18.17 (Formulas)
 */

/**
 * Quote sheet name for use in formula if needed.
 *
 * Quotes names containing spaces, special characters, or that start with digits.
 *
 * @param sheetName - Sheet name
 * @returns Properly quoted sheet name
 *
 * @example
 * quoteSheetName("Sheet1")     // => "Sheet1"
 * quoteSheetName("My Sheet")   // => "'My Sheet'"
 * quoteSheetName("Data's")     // => "'Data''s'"
 */
export function quoteSheetName(sheetName: string): string {
  // Check if quoting is needed
  const needsQuoting =
    /[\s']/.test(sheetName) ||
    /^[\d]/.test(sheetName) ||
    /[^A-Za-z0-9_]/.test(sheetName);

  if (!needsQuoting) {
    return sheetName;
  }

  // Escape single quotes by doubling them
  const escaped = sheetName.replace(/'/g, "''");
  return `'${escaped}'`;
}

/**
 * Compose formula from sheet name and range reference.
 *
 * @param sheetName - Sheet name
 * @param rangeRef - Range reference (e.g., "$A$2:$A$10")
 * @returns Complete formula
 *
 * @example
 * composeFormula("Sheet1", "$A$2:$A$10")
 * // => "Sheet1!$A$2:$A$10"
 *
 * composeFormula("My Sheet", "$B$1:$B$5")
 * // => "'My Sheet'!$B$1:$B$5"
 */
export function composeFormula(sheetName: string, rangeRef: string): string {
  return `${quoteSheetName(sheetName)}!${rangeRef}`;
}
