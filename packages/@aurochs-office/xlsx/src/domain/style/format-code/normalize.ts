/**
 * @file SpreadsheetML formatCode normalization helpers
 *
 * These helpers are used when converting a format section into a number/date/text strategy.
 * They are quote-aware where required and intentionally do not attempt to be a complete Excel renderer.
 */

/**
 * Remove quoted string contents from a format code.
 *
 * @param formatCode - Raw format code
 */
export function stripQuotedStrings(formatCode: string): string {
  return formatCode.replace(/"[^"]*"/gu, "");
}

/**
 * Remove escape sequences (`\x`) from a format code.
 *
 * @param section - Raw section
 */
export function removeEscapes(section: string): string {
  return section.replace(/\\./gu, "");
}

/**
 * Remove bracket codes (`[...]`) from a format code.
 *
 * @param section - Raw section
 */
export function removeBracketCodes(section: string): string {
  return section.replace(/\[[^\]]+\]/gu, "");
}

/**
 * Remove `_x` padding and `*x` fill codes from a format code.
 *
 * @param section - Raw section
 */
export function removeFillAndPadding(section: string): string {
  return section.replace(/_.?/gu, "").replace(/\*.?/gu, "");
}

/**
 * Remove components that are not part of the numeric placeholder pattern.
 *
 * @param section - Raw section
 */
export function removeLiteralsForPattern(section: string): string {
  return removeFillAndPadding(removeBracketCodes(removeEscapes(stripQuotedStrings(section))));
}

