/**
 * @file SpreadsheetML number formatter (numFmt)
 *
 * Formats numeric values using an IR for number sections, and delegates date/time sections
 * to the date formatter.
 */

import type { XlsxDateSystem } from "../../date-system";
import { isDateFormat } from "../number-format";
import { parseNumberFormatSection } from "../format-code/number-section";
import { pickFormatSection } from "../format-code/section-picker";
import { removeLiteralsForPattern } from "../format-code/normalize";
import { unescapeAffix } from "../format-code/affix";
import { buildDateTimeDetectionPattern, formatDateByCode } from "./date";

function countIntegerZeros(integerPattern: string): number {
  return [...integerPattern].filter((ch) => ch === "0").length;
}

function countFractionDigits(fractionPattern: string): { readonly min: number; readonly max: number } {
  const digits = [...fractionPattern].filter((ch) => ch === "0" || ch === "#");
  const min = digits.filter((ch) => ch === "0").length;
  const max = digits.length;
  return { min, max };
}

function wantsGrouping(integerPattern: string): boolean {
  return integerPattern.includes(",");
}

function isScientific(section: string): boolean {
  return /E\+0+/iu.test(removeLiteralsForPattern(section));
}

type ScientificMarker = Readonly<{
  index: number;
  letter: "e" | "E";
  signMode: "always" | "negativeOnly";
}>;

function findScientificMarker(section: string): ScientificMarker | null {
  const state = { inQuoted: false };
  for (let i = 0; i + 1 < section.length; i += 1) {
    const ch = section[i]!;
    if (ch === "\\" && i + 1 < section.length) {
      i += 1;
      continue;
    }
    if (ch === "\"") {
      if (state.inQuoted && section[i + 1] === "\"") {
        i += 1;
        continue;
      }
      state.inQuoted = !state.inQuoted;
      continue;
    }
    if (state.inQuoted) {
      continue;
    }
    if (ch === "[") {
      const end = section.indexOf("]", i + 1);
      if (end !== -1) {
        i = end;
        continue;
      }
    }

    if (ch === "e" || ch === "E") {
      const sign = section[i + 1];
      if (sign === "+") {
        return { index: i, letter: ch, signMode: "always" };
      }
      if (sign === "-") {
        return { index: i, letter: ch, signMode: "negativeOnly" };
      }
    }
  }
  return null;
}

function parseNumericTemplate(template: string): {
  readonly integerPlaceholders: readonly string[];
  readonly fractionPlaceholders: readonly string[];
  readonly hasGrouping: boolean;
  readonly hasDecimalPoint: boolean;
} {
  const integerPlaceholders: string[] = [];
  const fractionPlaceholders: string[] = [];
  const state = { inQuoted: false, inFraction: false, hasGrouping: false, hasDecimalPoint: false };

  for (let i = 0; i < template.length; i += 1) {
    const ch = template[i]!;
    if (ch === "\\" && i + 1 < template.length) {
      i += 1;
      continue;
    }
    if (ch === "\"") {
      if (state.inQuoted && template[i + 1] === "\"") {
        i += 1;
        continue;
      }
      state.inQuoted = !state.inQuoted;
      continue;
    }
    if (state.inQuoted) {
      continue;
    }
    if (ch === "[") {
      const end = template.indexOf("]", i + 1);
      if (end !== -1) {
        i = end;
        continue;
      }
    }
    if (ch === ".") {
      state.inFraction = true;
      state.hasDecimalPoint = true;
      continue;
    }
    if (ch === ",") {
      if (!state.inFraction) {
        state.hasGrouping = true;
      }
      continue;
    }
    if (ch === "0" || ch === "#" || ch === "?") {
      if (state.inFraction) {
        fractionPlaceholders.push(ch);
      } else {
        integerPlaceholders.push(ch);
      }
    }
  }

  return {
    integerPlaceholders,
    fractionPlaceholders,
    hasGrouping: state.hasGrouping,
    hasDecimalPoint: state.hasDecimalPoint,
  };
}

function trimOptionalFractionDigits(
  digits: string,
  placeholders: readonly string[],
): { readonly digits: string; readonly placeholderCount: number } {
  const minDigits = placeholders.filter((ch) => ch === "0").length;
  const state = { end: digits.length, placeholderEnd: placeholders.length };

  while (state.end > minDigits && state.placeholderEnd > minDigits) {
    const digit = digits[state.end - 1];
    const placeholder = placeholders[state.placeholderEnd - 1];
    if (digit !== "0") {
      break;
    }
    if (placeholder === "0") {
      break;
    }
    state.end -= 1;
    state.placeholderEnd -= 1;
  }

  return { digits: digits.slice(0, state.end), placeholderCount: state.placeholderEnd };
}

function applyGroupingDigits(integerDigits: string): string {
  const negative = integerDigits.startsWith("-");
  const digits = negative ? integerDigits.slice(1) : integerDigits;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/gu, ",");
  return negative ? `-${grouped}` : grouped;
}

function splitNumericRuns(template: string): {
  readonly prefix: string;
  readonly integerRun: string;
  readonly fractionRun: string;
  readonly suffix: string;
  readonly hasDecimalPoint: boolean;
  readonly hasGrouping: boolean;
} {
  const state = { inQuoted: false, foundStart: false };
  const startState = { start: -1, decimal: -1 };

  for (let i = 0; i < template.length; i += 1) {
    const ch = template[i]!;
    if (ch === "\\" && i + 1 < template.length) {
      i += 1;
      continue;
    }
    if (ch === "\"") {
      if (state.inQuoted && template[i + 1] === "\"") {
        i += 1;
        continue;
      }
      state.inQuoted = !state.inQuoted;
      continue;
    }
    if (state.inQuoted) {
      continue;
    }
    if (ch === "[") {
      const end = template.indexOf("]", i + 1);
      if (end !== -1) {
        i = end;
        continue;
      }
    }
    if (!state.foundStart && (ch === "0" || ch === "#" || ch === "?" || ch === ",")) {
      state.foundStart = true;
      startState.start = i;
      continue;
    }
    if (state.foundStart && startState.decimal === -1 && ch === ".") {
      startState.decimal = i;
      continue;
    }
  }

  if (startState.start === -1) {
    return { prefix: template, integerRun: "", fractionRun: "", suffix: "", hasDecimalPoint: false, hasGrouping: false };
  }

  const integerRunStart = startState.start;
  const hasDecimalPoint = startState.decimal !== -1;
  const integerEndState = { end: startState.decimal === -1 ? template.length : startState.decimal };
  if (!hasDecimalPoint) {
    for (let i = integerRunStart; i < template.length; i += 1) {
      const ch = template[i]!;
      if (ch === "0" || ch === "#" || ch === "?" || ch === ",") {
        integerEndState.end = i + 1;
        continue;
      }
      break;
    }
  }
  const integerRunEnd = integerEndState.end;
  const integerRun = template.slice(integerRunStart, integerRunEnd);
  const hasGrouping = integerRun.includes(",");

  if (startState.decimal === -1) {
    return {
      prefix: template.slice(0, integerRunStart),
      integerRun,
      fractionRun: "",
      suffix: template.slice(integerRunEnd),
      hasDecimalPoint,
      hasGrouping,
    };
  }

  const fractionStart = startState.decimal + 1;
  const fractionState = { end: fractionStart };
  for (let i = fractionStart; i < template.length; i += 1) {
    const ch = template[i]!;
    if (ch === "\\" && i + 1 < template.length) {
      i += 1;
      continue;
    }
    if (ch === "\"") {
      break;
    }
    if (ch === "[") {
      break;
    }
    if (ch === "0" || ch === "#" || ch === "?" || ch === ",") {
      fractionState.end = i + 1;
      continue;
    }
    break;
  }

  const fractionRun = template.slice(fractionStart, fractionState.end);
  return {
    prefix: template.slice(0, integerRunStart),
    integerRun,
    fractionRun,
    suffix: template.slice(fractionState.end),
    hasDecimalPoint,
    hasGrouping,
  };
}

function formatNumberByTemplate(value: number, template: string): string {
  const runs = splitNumericRuns(template);
  const integerPlaceholders = [...runs.integerRun].filter((ch) => ch === "0" || ch === "#" || ch === "?");
  const fractionPlaceholders = [...runs.fractionRun].filter((ch) => ch === "0" || ch === "#" || ch === "?");

  const maxFractionDigits = fractionPlaceholders.length;
  const minFractionDigits = fractionPlaceholders.filter((ch) => ch === "0").length;

  const absolute = Math.abs(value);
  const fixed = maxFractionDigits > 0 ? absolute.toFixed(maxFractionDigits) : `${Math.round(absolute)}`;
  const [integerRaw, fractionRaw = ""] = fixed.split(".");
  const integerDigits = integerRaw ?? "0";
  const fractionDigits = fractionRaw ?? "";

  const integerPlaceholderCount = integerPlaceholders.length;
  const integerOverflow = integerDigits.length > integerPlaceholderCount;
  const extraLeadingDigits = integerOverflow ? integerDigits.slice(0, integerDigits.length - integerPlaceholderCount) : "";
  const digitsToUse = integerOverflow ? integerDigits.slice(integerDigits.length - integerPlaceholderCount) : integerDigits;

  const integerState = { digitIndex: digitsToUse.length - 1, parts: [] as string[] };
  for (let i = integerPlaceholderCount - 1; i >= 0; i -= 1) {
    const placeholder = integerPlaceholders[i]!;
    const digit = integerState.digitIndex >= 0 ? digitsToUse[integerState.digitIndex] : undefined;
    integerState.digitIndex -= 1;
    if (digit !== undefined) {
      integerState.parts.push(digit);
      continue;
    }
    if (placeholder === "0") {
      integerState.parts.push("0");
      continue;
    }
    if (placeholder === "?") {
      integerState.parts.push(" ");
      continue;
    }
  }
  const integerCoreRaw = `${extraLeadingDigits}${integerState.parts.reverse().join("")}`;
  const integerCore = runs.hasGrouping ? applyGroupingDigits(integerCoreRaw.replace(/^ +/u, "")) : integerCoreRaw;

  const trimmedFraction = trimOptionalFractionDigits(fractionDigits, fractionPlaceholders);
  const fractionPlaceholdersUsed = fractionPlaceholders.slice(0, trimmedFraction.placeholderCount);
  const fractionState = { index: 0, parts: [] as string[] };
  for (const placeholder of fractionPlaceholdersUsed) {
    const digit = trimmedFraction.digits[fractionState.index];
    if (digit !== undefined) {
      fractionState.parts.push(digit);
      fractionState.index += 1;
      continue;
    }
    if (placeholder === "0") {
      fractionState.parts.push("0");
      continue;
    }
    if (placeholder === "?") {
      fractionState.parts.push(" ");
      continue;
    }
  }
  const fractionCore = fractionState.parts.join("");
  const includeDecimal = runs.hasDecimalPoint && (fractionCore.length > 0 || minFractionDigits > 0);

  const sign = value < 0 ? "-" : "";
  return `${unescapeAffix(runs.prefix)}${sign}${integerCore}${includeDecimal ? `.${fractionCore}` : ""}${unescapeAffix(runs.suffix)}`;
}

function formatExponentByTemplate(exponent: number, template: string, signMode: ScientificMarker["signMode"]): string {
  const signText = exponent < 0 ? "-" : signMode === "always" ? "+" : "";
  const digits = String(Math.abs(exponent));
  const placeholders = [...template].filter((ch) => ch === "0" || ch === "#" || ch === "?");
  const placeholderCount = placeholders.length;

  const minDigits = placeholders.filter((ch) => ch === "0").length;
  const padded = digits.padStart(Math.max(minDigits, placeholderCount), "0");
  const state = { digitIndex: 0, signInserted: false };

  const out: string[] = [];
  const templateState = { inQuoted: false };
  for (let i = 0; i < template.length; i += 1) {
    const ch = template[i]!;
    if (ch === "\\" && i + 1 < template.length) {
      out.push(template[i + 1]!);
      i += 1;
      continue;
    }
    if (ch === "\"") {
      templateState.inQuoted = !templateState.inQuoted;
      continue;
    }
    if (templateState.inQuoted) {
      out.push(ch);
      continue;
    }
    if (ch === "[") {
      const end = template.indexOf("]", i + 1);
      if (end !== -1) {
        i = end;
        continue;
      }
    }
    if (ch === ",") {
      continue;
    }
    if (ch !== "0" && ch !== "#" && ch !== "?") {
      out.push(ch);
      continue;
    }

    if (!state.signInserted) {
      out.push(signText);
      state.signInserted = true;
    }

    const digit = state.digitIndex < padded.length ? padded[state.digitIndex] : undefined;
    state.digitIndex += 1;
    if (digit !== undefined) {
      out.push(digit);
      continue;
    }
    if (ch === "0") {
      out.push("0");
      continue;
    }
    if (ch === "?") {
      out.push(" ");
      continue;
    }
  }
  return out.join("");
}

function resolveApproxScientificDigitsShown(args: {
  readonly abs: number;
  readonly log10Floor: number;
  readonly maxMantissaIntegerDigits: number;
}): number {
  if (args.abs >= 1) {
    const digitsBeforeDecimal = args.log10Floor + 1;
    if (digitsBeforeDecimal <= args.maxMantissaIntegerDigits) {
      return digitsBeforeDecimal;
    }
    return args.maxMantissaIntegerDigits >= 4 ? 2 : 1;
  }
  return args.maxMantissaIntegerDigits >= 7 ? 3 : args.maxMantissaIntegerDigits;
}

function trimDecimalString(value: string): string {
  if (!value.includes(".")) {
    return value;
  }
  const trimmed = value.replace(/0+$/u, "").replace(/\.$/u, "");
  return trimmed.length === 0 ? "0" : trimmed;
}

function scientificToDecimal(mantissa: string, exponent: number): string {
  const negative = mantissa.startsWith("-");
  const mantissaAbs = negative ? mantissa.slice(1) : mantissa;
  const [integerPartRaw, fractionPartRaw = ""] = mantissaAbs.split(".");
  const digits = `${integerPartRaw ?? ""}${fractionPartRaw}`;
  const normalizedDigits = digits.length > 0 ? digits : "0";
  const pointIndex = (integerPartRaw ?? "").length + exponent;

  const signPrefix = negative ? "-" : "";
  if (/^0+$/u.test(normalizedDigits)) {
    return "0";
  }

  if (pointIndex <= 0) {
    const zeros = "0".repeat(Math.max(0, -pointIndex));
    return `${signPrefix}0.${zeros}${normalizedDigits}`;
  }
  if (pointIndex >= normalizedDigits.length) {
    const zeros = "0".repeat(Math.max(0, pointIndex - normalizedDigits.length));
    return `${signPrefix}${normalizedDigits}${zeros}`;
  }
  return `${signPrefix}${normalizedDigits.slice(0, pointIndex)}.${normalizedDigits.slice(pointIndex)}`;
}

function normalizeScientificText(value: string): string {
  const match = /^([-+]?(?:\d+(?:\.\d+)?|\.\d+))[eE]([-+]?\d+)$/u.exec(value);
  if (!match) {
    return value;
  }
  const mantissa = trimDecimalString(match[1] ?? "");
  const exponentNumber = Number.parseInt(match[2] ?? "0", 10);
  const sign = exponentNumber >= 0 ? "+" : "-";
  const abs = Math.abs(exponentNumber);
  return `${mantissa}E${sign}${abs}`;
}

function formatGeneralNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  if (Object.is(value, -0) || value === 0) {
    return "0";
  }

  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1e11 || abs < 1e-9) {
    return `${sign}${normalizeScientificText(abs.toExponential(14))}`;
  }

  const raw = abs.toPrecision(15);

  const expMatch = /^(\d+(?:\.\d+)?|\.\d+)[eE]([-+]?\d+)$/u.exec(raw);
  if (!expMatch) {
    return `${sign}${trimDecimalString(raw)}`;
  }

  const mantissa = expMatch[1] ?? "0";
  const exponent = Number.parseInt(expMatch[2] ?? "0", 10);
  if (!Number.isFinite(exponent)) {
    return `${sign}${trimDecimalString(raw)}`;
  }

  const decimal = scientificToDecimal(mantissa, exponent);
  const trimmed = trimDecimalString(decimal);
  if (trimmed.startsWith("-")) {
    return trimmed;
  }
  return `${sign}${trimmed}`;
}

/**
 * Format a number (or Excel serial date) by an Excel/SpreadsheetML format code.
 */
export function formatNumberByCode(value: number, formatCode: string, options?: { readonly dateSystem?: XlsxDateSystem }): string {
  const { section, hasNegativeSection } = pickFormatSection(formatCode, value);
  const cleaned = removeLiteralsForPattern(section);

  const trimmed = cleaned.trim();
  if (trimmed === "General" || trimmed === "@") {
    return formatGeneralNumber(value);
  }

  const marker = findScientificMarker(section);
  if (marker) {
    const mantissaTemplate = section.slice(0, marker.index);
    const exponentTemplate = section.slice(marker.index + 2);
    const parsed = parseNumericTemplate(mantissaTemplate);

    const abs = Math.abs(value);
    if (abs === 0) {
      const mantissa = formatNumberByTemplate(0, mantissaTemplate);
      const exponent = formatExponentByTemplate(0, exponentTemplate, marker.signMode);
      return `${mantissa}${marker.letter}${exponent}`;
    }

    const maxMantissaIntegerDigits = Math.max(1, parsed.integerPlaceholders.length);
    const log10Floor = Math.floor(Math.log10(abs));

    const digitsShown = resolveApproxScientificDigitsShown({ abs, log10Floor, maxMantissaIntegerDigits });

    const exponent = log10Floor - (digitsShown - 1);
    const mantissaValue = abs / 10 ** exponent;
    const mantissa = formatNumberByTemplate(mantissaValue, mantissaTemplate);
    const exponentText = formatExponentByTemplate(exponent, exponentTemplate, marker.signMode);
    const signPrefix = value < 0 && !hasNegativeSection ? "-" : "";
    return `${signPrefix}${mantissa}${marker.letter}${exponentText}`;
  }

  const datePattern = buildDateTimeDetectionPattern(section);
  if (isDateFormat(datePattern)) {
    return formatDateByCode(value, section, options?.dateSystem ?? "1900");
  }

  const parsed = parseNumberFormatSection(section);
  if (parsed.kind === "literal") {
    return parsed.literal;
  }

  const scaled = (value * 100 ** parsed.percentCount) / 1000 ** parsed.scaleCommas;

  if (isScientific(section)) {
    const templateNoScale = parsed.fractionPattern.length > 0 ? `${parsed.integerPattern}.${parsed.fractionPattern}` : parsed.integerPattern;
    const expDigitsMatch = /E\+0+/iu.exec(templateNoScale);
    const expDigits = expDigitsMatch ? expDigitsMatch[0].length - 2 : 2;

    const dot = templateNoScale.indexOf(".");
    const fractionPatternForDigits = dot === -1 ? "" : templateNoScale.slice(dot + 1);
    const { min, max } = countFractionDigits(fractionPatternForDigits);
    const decimals = Math.max(min, max);

    const exp = scaled.toExponential(decimals);
    const [mantissa, exponentRaw] = exp.split("e");
    const exponent = Number.parseInt(exponentRaw ?? "0", 10);
    const sign = exponent >= 0 ? "+" : "-";
    const abs = Math.abs(exponent);
    return `${mantissa}E${sign}${String(abs).padStart(expDigits, "0")}`;
  }

  const minIntegerDigits = Math.max(1, countIntegerZeros(parsed.integerPattern));
  const { min: minFractionDigits, max: maxFractionDigits } = countFractionDigits(parsed.fractionPattern);
  const grouping = wantsGrouping(parsed.integerPattern);

  const formatter = new Intl.NumberFormat("en-US", {
    useGrouping: grouping,
    minimumIntegerDigits: minIntegerDigits,
    minimumFractionDigits: minFractionDigits,
    maximumFractionDigits: maxFractionDigits,
  });

  const isNegative = scaled < 0;
  const formattedCore = formatter.format(Math.abs(scaled));
  const suffixWithoutScale = parsed.suffix.replace(/^,+/u, "");
  const negativePrefix = isNegative && !hasNegativeSection ? "-" : "";

  return `${negativePrefix}${parsed.prefix}${formattedCore}${suffixWithoutScale}`;
}
