/**
 * @file SpreadsheetML numFmt affix extraction
 *
 * Extracts prefix/suffix parts around the first/last numeric placeholders (0/#),
 * applying unescape rules for editor display output.
 */

import { scanFormatCodeSection } from "./scan";
import { removeBracketCodes, removeFillAndPadding } from "./normalize";

export type NumberPlaceholderIndices = Readonly<{ first: number; last: number }>;

/**
 * Find the first/last numeric placeholder index (`0`/`#`) in a format section.
 *
 * @param section - A single format section
 */
export function findNumberPlaceholderIndices(section: string): NumberPlaceholderIndices {
  const state = { first: -1, last: -1 };
  scanFormatCodeSection(section, {
    onChar: (ch, index) => {
      if (ch !== "0" && ch !== "#") {
        return;
      }
      if (state.first === -1) {
        state.first = index;
      }
      state.last = index;
    },
  });
  return { first: state.first, last: state.last };
}

/**
 * Convert an affix fragment (prefix or suffix) into its displayed literal form.
 *
 * @param text - Raw affix text
 */
export function unescapeAffix(text: string): string {
  const noBrackets = removeBracketCodes(text);
  const noPadding = removeFillAndPadding(noBrackets);
  const unescaped = noPadding.replace(/\\(.)/gu, "$1");
  return unescaped.replace(/"([^"]*)"/gu, "$1");
}

/**
 * Extract literal prefix and suffix around numeric placeholders.
 *
 * @param section - A single format section
 */
export function extractAffixes(section: string): { readonly prefix: string; readonly suffix: string } {
  const { first, last } = findNumberPlaceholderIndices(section);
  if (first === -1) {
    return { prefix: unescapeAffix(section), suffix: "" };
  }
  const prefixRaw = section.slice(0, first);
  const suffixRaw = last === -1 ? "" : section.slice(last + 1);
  return { prefix: unescapeAffix(prefixRaw), suffix: unescapeAffix(suffixRaw) };
}

