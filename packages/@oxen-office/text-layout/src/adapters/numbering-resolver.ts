/**
 * @file Numbering Resolver
 *
 * Resolves DOCX numbering definitions to bullet/number characters.
 * Handles numFmt conversion, lvlText pattern substitution, and counter management.
 *
 * @see ECMA-376 Part 1, Section 17.9 (Numbering)
 */

import type { NumberFormat } from "@oxen-office/ooxml/domain/numbering";
import type {
  DocxNumbering,
  DocxAbstractNum,
  DocxLevel,
} from "@oxen-office/docx/domain/numbering";
import type { DocxNumberingProperties } from "@oxen-office/docx/domain/paragraph";
import type { BulletConfig } from "../types";
import type { Points } from "@oxen-office/ooxml/domain/units";
import { pt } from "@oxen-office/ooxml/domain/units";
import { SPEC_DEFAULT_FONT_SIZE_PT } from "@oxen-office/docx/domain/ecma376-defaults";

// =============================================================================
// Number Format Conversion
// =============================================================================

/**
 * Convert a number to decimal string.
 */
function toDecimal(n: number): string {
  return n.toString();
}

/**
 * Convert a number to uppercase Roman numerals.
 */
function toUpperRoman(n: number): string {
  const romanNumerals: readonly [number, string][] = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];

  const converted = romanNumerals.reduce(
    (acc, [value, numeral]) => {
      const repeat = Math.floor(acc.remaining / value);
      if (repeat <= 0) {
        return acc;
      }
      return {
        remaining: acc.remaining - repeat * value,
        result: acc.result + numeral.repeat(repeat),
      };
    },
    { remaining: n, result: "" },
  );

  return converted.result;
}

/**
 * Convert a number to lowercase Roman numerals.
 */
function toLowerRoman(n: number): string {
  return toUpperRoman(n).toLowerCase();
}

/**
 * Convert a number to uppercase letter (A, B, C, ..., Z, AA, AB, ...).
 */
function toUpperLetter(n: number): string {
  const convert = (remaining: number, result: string): string => {
    if (remaining <= 0) {
      return result;
    }
    const adjusted = remaining - 1;
    const nextResult = String.fromCharCode(65 + (adjusted % 26)) + result;
    return convert(Math.floor(adjusted / 26), nextResult);
  };

  return convert(n, "");
}

/**
 * Convert a number to lowercase letter (a, b, c, ..., z, aa, ab, ...).
 */
function toLowerLetter(n: number): string {
  return toUpperLetter(n).toLowerCase();
}

/**
 * Convert a number to Japanese hiragana あいうえお order.
 */
function toAiueo(n: number): string {
  const chars = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";
  const index = (n - 1) % chars.length;
  return chars[index];
}

/**
 * Convert a number to Japanese hiragana いろは order.
 */
function toIroha(n: number): string {
  const chars = "いろはにほへとちりぬるをわかよたれそつねならむうゐのおくやまけふこえてあさきゆめみしゑひもせす";
  const index = (n - 1) % chars.length;
  return chars[index];
}

/**
 * Convert a number to full-width decimal.
 */
function toDecimalFullWidth(n: number): string {
  const fullWidthDigits = "０１２３４５６７８９";
  return n
    .toString()
    .split("")
    .map((d) => fullWidthDigits[parseInt(d, 10)])
    .join("");
}

/**
 * Convert a number to circled number (①②③...).
 */
function toDecimalEnclosedCircle(n: number): string {
  if (n >= 1 && n <= 20) {
    return String.fromCodePoint(0x2460 + n - 1);
  }
  // Fallback to decimal for numbers > 20
  return `(${n})`;
}

/**
 * Format a number according to the specified format.
 *
 * @see ECMA-376 Part 1, Section 17.18.59 (ST_NumberFormat)
 */
export function formatNumber(n: number, format: NumberFormat): string {
  switch (format) {
    case "decimal":
    case "decimalHalfWidth":
      return toDecimal(n);
    case "upperRoman":
      return toUpperRoman(n);
    case "lowerRoman":
      return toLowerRoman(n);
    case "upperLetter":
      return toUpperLetter(n);
    case "lowerLetter":
      return toLowerLetter(n);
    case "decimalFullWidth":
    case "decimalFullWidth2":
      return toDecimalFullWidth(n);
    case "aiueo":
      return toAiueo(n);
    case "aiueoFullWidth":
      return toAiueo(n); // Same characters, full-width is handled by font
    case "iroha":
      return toIroha(n);
    case "irohaFullWidth":
      return toIroha(n);
    case "decimalEnclosedCircle":
      return toDecimalEnclosedCircle(n);
    case "decimalZero":
      return n < 10 ? `0${n}` : toDecimal(n);
    case "bullet":
      return "•";
    case "none":
      return "";
    case "numberInDash":
      return `- ${n} -`;
    case "ordinal":
      // English ordinal (1st, 2nd, 3rd, etc.)
      if (n % 100 >= 11 && n % 100 <= 13) {
        return `${n}th`;
      }
      switch (n % 10) {
        case 1:
          return `${n}st`;
        case 2:
          return `${n}nd`;
        case 3:
          return `${n}rd`;
        default:
          return `${n}th`;
      }
    default:
      // For unsupported formats, fall back to decimal
      return toDecimal(n);
  }
}

// =============================================================================
// Level Text Substitution
// =============================================================================

/**
 * Substitute level placeholders in lvlText.
 *
 * lvlText can contain placeholders like %1, %2, etc. that reference
 * the current counter value at each level.
 *
 * Example: "%1." with counter [3] -> "3."
 * Example: "%1.%2" with counter [1, 5] -> "1.5"
 *
 * @param lvlText The level text pattern (e.g., "%1.", "%1.%2")
 * @param counters Array of counter values for each level [level0, level1, ...]
 * @param formats Array of number formats for each level
 */
export function substituteLevelText(
  lvlText: string,
  counters: readonly number[],
  formats: readonly NumberFormat[],
): string {
  return Array.from({ length: 9 }, (_, i) => i).reduce((result, i) => {
    const placeholder = `%${i + 1}`;
    if (!result.includes(placeholder)) {
      return result;
    }
    const counterValue = counters[i] ?? 1;
    const format = formats[i] ?? "decimal";
    const formatted = formatNumber(counterValue, format);
    return result.replace(new RegExp(placeholder, "g"), formatted);
  }, lvlText);
}

// =============================================================================
// Numbering Resolution
// =============================================================================

/**
 * Context for numbering resolution.
 * Tracks counter state across paragraphs.
 */
export type NumberingContext = {
  /** Counter values for each numId -> ilvl combination */
  readonly counters: Map<string, number[]>;
};

/**
 * Create a new numbering context.
 */
export function createNumberingContext(): NumberingContext {
  return {
    counters: new Map(),
  };
}

/**
 * Get counter key for a numId/ilvl combination.
 */
function getCounterKey(numId: number): string {
  return `num-${numId}`;
}

/**
 * Get or initialize counters for a numbering instance.
 */
function getCounters(
  context: NumberingContext,
  numId: number,
  levels: readonly DocxLevel[],
): number[] {
  const key = getCounterKey(numId);
  const existing = context.counters.get(key);
  if (existing !== undefined) {
    return existing;
  }

  // Initialize counters with start values from each level
  const initialized = levels.map((lvl) => lvl.start ?? 1);
  (context.counters as Map<string, number[]>).set(key, initialized);
  return initialized;
}

/**
 * Increment counter at the specified level and reset higher levels.
 */
function incrementCounter(
  counters: number[],
  ilvl: number,
  levels: readonly DocxLevel[],
): void {
  // Increment current level
  counters[ilvl] = (counters[ilvl] ?? 0) + 1;

  // Reset all higher levels to their start values
  levels.slice(ilvl + 1, counters.length).forEach((level, offset) => {
    counters[ilvl + 1 + offset] = level?.start ?? 1;
  });
}

/**
 * Resolve numbering level from DocxNumbering.
 */
function resolveLevel(
  numbering: DocxNumbering,
  numId: number,
  ilvl: number,
): { abstractNum: DocxAbstractNum; level: DocxLevel } | undefined {
  // Find the num instance
  const numInstance = numbering.num.find((n) => (n.numId as number) === numId);
  if (numInstance === undefined) {
    return undefined;
  }

  // Find the abstract numbering
  const abstractNum = numbering.abstractNum.find(
    (an) => (an.abstractNumId as number) === (numInstance.abstractNumId as number),
  );
  if (abstractNum === undefined) {
    return undefined;
  }

  // Check for level override
  const override = numInstance.lvlOverride?.find((o) => (o.ilvl as number) === ilvl);
  if (override?.lvl !== undefined) {
    return { abstractNum, level: override.lvl };
  }

  // Find the level in abstract numbering
  const level = abstractNum.lvl.find((l) => (l.ilvl as number) === ilvl);
  if (level === undefined) {
    return undefined;
  }

  return { abstractNum, level };
}

/**
 * Get all formats for levels 0 through the specified level.
 */
function getLevelFormats(
  abstractNum: DocxAbstractNum,
  upToIlvl: number,
): NumberFormat[] {
  return Array.from({ length: upToIlvl + 1 }, (_, i) => {
    const level = abstractNum.lvl.find((l) => (l.ilvl as number) === i);
    return level?.numFmt ?? "decimal";
  });
}

function resolveBulletChar(
  ...args: readonly [
    level: DocxLevel,
    counters: readonly number[],
    formats: readonly NumberFormat[],
    ilvl: number,
  ]
): string {
  const [level, counters, formats, ilvl] = args;
  const numFmt = level.numFmt ?? "decimal";
  if (numFmt === "bullet") {
    return level.lvlText?.val ?? "•";
  }

  if (level.lvlText?.val !== undefined) {
    return substituteLevelText(level.lvlText.val, counters, formats);
  }

  const counterValue = counters[ilvl] ?? 1;
  return formatNumber(counterValue, numFmt) + ".";
}

/**
 * Resolve bullet configuration for a paragraph.
 *
 * @param numPr Paragraph numbering properties (numId + ilvl)
 * @param numbering Full numbering definitions
 * @param context Numbering context for counter state
 * @returns BulletConfig if numbering applies, undefined otherwise
 */
export function resolveBulletConfig(
  numPr: DocxNumberingProperties,
  numbering: DocxNumbering,
  context: NumberingContext,
): BulletConfig | undefined {
  const numId = numPr.numId;
  const ilvl = numPr.ilvl ?? 0;

  if (numId === undefined) {
    return undefined;
  }

  // Resolve the level definition
  const resolved = resolveLevel(numbering, numId as number, ilvl as number);
  if (resolved === undefined) {
    return undefined;
  }

  const { abstractNum, level } = resolved;

  // Get counters for this numbering instance
  const counters = getCounters(context, numId as number, abstractNum.lvl);

  // Get formats for all levels up to current
  const formats = getLevelFormats(abstractNum, ilvl as number);

  // Generate the bullet/number text
  const bulletChar = resolveBulletChar(level, counters, formats, ilvl as number);

  // Increment counter for next paragraph with same numbering
  incrementCounter(counters, ilvl as number, abstractNum.lvl);

  // Get font properties from level rPr
  const rPr = level.rPr;
  const fontSize: Points = rPr?.sz !== undefined ? pt(rPr.sz / 2) : pt(SPEC_DEFAULT_FONT_SIZE_PT);
  const color = rPr?.color?.val !== undefined ? `#${rPr.color.val}` : "#000000";
  const fontFamily = rPr?.rFonts?.ascii ?? "sans-serif";

  return {
    char: bulletChar,
    fontSize,
    color,
    fontFamily,
    imageUrl: undefined, // Picture bullets not yet supported
  };
}
