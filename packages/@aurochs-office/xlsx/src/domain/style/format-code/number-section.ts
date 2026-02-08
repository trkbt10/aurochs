/**
 * @file SpreadsheetML number format section parser (IR)
 *
 * Parses a single `numFmt` format section into an intermediate representation (IR),
 * which can be formatted by number/date/text renderers.
 */

import { scanFormatCodeSection } from "./scan";
import { extractAffixes, findNumberPlaceholderIndices, unescapeAffix } from "./affix";
import { removeLiteralsForPattern } from "./normalize";

export type ParsedNumberFormatSection =
  | Readonly<{ kind: "literal"; literal: string }>
  | Readonly<{
    kind: "number";
    percentCount: number;
    scaleCommas: number;
    integerPattern: string;
    fractionPattern: string;
    prefix: string;
    suffix: string;
  }>;

function countTrailingCommas(pattern: string): number {
  const match = /,+$/u.exec(pattern);
  return match ? match[0].length : 0;
}

function stripTrailingCommas(pattern: string): string {
  return pattern.replace(/,+$/u, "");
}

function splitIntegerAndFractionPatterns(cleanedPattern: string): { readonly integer: string; readonly fraction: string } {
  const dot = cleanedPattern.indexOf(".");
  if (dot === -1) {
    return { integer: cleanedPattern, fraction: "" };
  }
  return { integer: cleanedPattern.slice(0, dot), fraction: cleanedPattern.slice(dot + 1) };
}

function countPercentSigns(section: string): number {
  const state = { count: 0 };
  scanFormatCodeSection(section, {
    onChar: (ch) => {
      if (ch === "%") {
        state.count += 1;
      }
    },
  });
  return state.count;
}

/**
 * Parse a format section into a numeric IR.
 *
 * @param section - A single format section (e.g. `0.00%` or `#,##0`)
 */
export function parseNumberFormatSection(section: string): ParsedNumberFormatSection {
  const placeholders = findNumberPlaceholderIndices(section);
  if (placeholders.first === -1) {
    return { kind: "literal", literal: unescapeAffix(section) };
  }

  const cleaned = removeLiteralsForPattern(section);
  const cleanedTrimmed = cleaned.replace(/\s+$/u, "");
  const scaleCommas = countTrailingCommas(cleanedTrimmed);
  const cleanedNoScale = stripTrailingCommas(cleanedTrimmed);
  const { integer: integerPattern, fraction: fractionPattern } = splitIntegerAndFractionPatterns(cleanedNoScale);
  const { prefix, suffix } = extractAffixes(section);

  return {
    kind: "number",
    percentCount: countPercentSigns(section),
    scaleCommas,
    integerPattern,
    fractionPattern,
    prefix,
    suffix,
  };
}

