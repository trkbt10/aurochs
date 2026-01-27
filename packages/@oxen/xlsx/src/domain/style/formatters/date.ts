/**
 * @file SpreadsheetML date/time formatter (numFmt)
 *
 * This module formats Excel serial dates using an intermediate representation (IR) for the
 * date/time section, so parsing rules (quotes/escapes/brackets) are not interleaved with rendering.
 */

import type { XlsxDateSystem } from "../../date-system";
import { EXCEL_1904_TO_1900_DAY_OFFSET } from "../../date-system";
import { stripQuotedStrings, removeEscapes, removeFillAndPadding } from "../format-code/normalize";

const MS_IN_DAY = 86_400_000;

function excelSerialToUtcDate1900(serial: number): Date {
  // 1900 date system with leap-year bug:
  // - serial 1 = 1900-01-01
  // - serial 60 = 1900-02-29 (non-existent but preserved by Excel)
  const days = Math.floor(serial);
  const fraction = serial - days;
  const timeMs = Math.round(fraction * MS_IN_DAY);
  const adjustedDays = days >= 60 ? days - 1 : days;

  const baseUtcMs = Date.UTC(1899, 11, 31);
  const dateUtcMs = baseUtcMs + adjustedDays * MS_IN_DAY + timeMs;
  return new Date(dateUtcMs);
}

function excelSerialToUtcDate(serial: number, dateSystem: XlsxDateSystem): Date {
  const normalizedSerial = dateSystem === "1904" ? serial + EXCEL_1904_TO_1900_DAY_OFFSET : serial;
  return excelSerialToUtcDate1900(normalizedSerial);
}

const WEEKDAY_SHORT: readonly string[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_LONG: readonly string[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_SHORT: readonly string[] = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LONG: readonly string[] = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function looksLikeTimeMinutesContext(section: string, index: number): boolean {
  const prev = index > 0 ? section[index - 1] : undefined;
  const next = index + 1 < section.length ? section[index + 1] : undefined;
  return prev === ":" || next === ":";
}

function formatAmPmToken(tokenRaw: string, hours24: number): string {
  const lower = tokenRaw.toLowerCase();
  const isPm = hours24 >= 12;
  if (lower === "a/p") {
    const letter = isPm ? "P" : "A";
    return tokenRaw[0] === tokenRaw[0]?.toLowerCase() ? letter.toLowerCase() : letter.toUpperCase();
  }
  return isPm ? "PM" : "AM";
}

function removeNonTimeBracketCodes(section: string): string {
  // Preserve time elapsed tokens like [h], [m], [s] but drop colors/conditions like [Red], [<100], etc.
  // Important: bracket-looking text can also appear inside quoted literals; those must be preserved verbatim.
  const parts: string[] = [];
  const quoteState = { inQuoted: false };
  for (let i = 0; i < section.length; i += 1) {
    const ch = section[i]!;
    if (ch === "\\" && i + 1 < section.length) {
      parts.push(ch + section[i + 1]!);
      i += 1;
      continue;
    }
    if (ch === "\"") {
      quoteState.inQuoted = !quoteState.inQuoted;
      parts.push(ch);
      continue;
    }
    if (!quoteState.inQuoted && ch === "[") {
      const end = section.indexOf("]", i + 1);
      if (end !== -1) {
        const inner = section.slice(i + 1, end).toLowerCase();
        if (inner === "h" || inner === "hh" || inner === "m" || inner === "mm" || inner === "s" || inner === "ss") {
          parts.push(section.slice(i, end + 1));
        }
        i = end;
        continue;
      }
    }
    parts.push(ch);
  }
  return parts.join("");
}

/**
 * Build a pattern used for date/time detection (for isDateFormat()).
 */
export function buildDateTimeDetectionPattern(section: string): string {
  return removeFillAndPadding(removeEscapes(stripQuotedStrings(removeNonTimeBracketCodes(section))));
}

function resolveTimeRoundingUnitMs(section: string): number {
  const pattern = buildDateTimeDetectionPattern(section).toLowerCase();

  const maxFractionDigits = Math.min(
    3,
    Math.max(
      0,
      [...pattern.matchAll(/\.0+/gu)].reduce((acc, match) => Math.max(acc, match[0].length - 1), 0),
    ),
  );
  if (maxFractionDigits > 0) {
    return 10 ** (3 - maxFractionDigits);
  }

  if (pattern.includes("s")) {
    return 1_000;
  }

  return 1;
}

function roundSerialByUnitMs(serial: number, unitMs: number): number {
  if (unitMs <= 0) {
    throw new Error(`Expected unitMs > 0, got: ${unitMs}`);
  }
  return (Math.round((serial * MS_IN_DAY) / unitMs) * unitMs) / MS_IN_DAY;
}

type DateFormatToken =
  | Readonly<{ kind: "literal"; text: string }>
  | Readonly<{ kind: "elapsedBracket"; unit: "h" | "m" | "s"; digits: 1 | 2 }>
  | Readonly<{ kind: "fraction"; digits: number }>
  | Readonly<{ kind: "ampm"; raw: string }>
  | Readonly<{ kind: "weekday"; long: boolean }>
  | Readonly<{ kind: "year"; digits: 1 | 2 | 3 | 4 }>
  | Readonly<{ kind: "monthName"; long: boolean }>
  | Readonly<{ kind: "monthOrMinute"; digits: 1 | 2; minuteContext: boolean }>
  | Readonly<{ kind: "day"; digits: 1 | 2 }>
  | Readonly<{ kind: "hour"; digits: 1 | 2 }>
  | Readonly<{ kind: "second"; digits: 1 | 2 }>;

type ParsedDateFormatSection = Readonly<{
  raw: string;
  tokens: readonly DateFormatToken[];
  usesElapsedTime: boolean;
  hasElapsedHoursToken: boolean;
  hasElapsedMinutesToken: boolean;
  hasElapsedSecondsToken: boolean;
  usesAmPm: boolean;
  roundingUnitMs: number;
}>;

function parseDateFormatSection(section: string): ParsedDateFormatSection {
  const raw = removeNonTimeBracketCodes(section);
  const rawLower = raw.toLowerCase();

  const usesElapsedTime = /\[(?:h+|m+|s+)\]/iu.test(rawLower);
  const hasElapsedHoursToken = /\[(?:h|hh)\]/iu.test(rawLower);
  const hasElapsedMinutesToken = /\[(?:m|mm)\]/iu.test(rawLower);
  const hasElapsedSecondsToken = /\[(?:s|ss)\]/iu.test(rawLower);
  const usesAmPm = rawLower.includes("am/pm") || rawLower.includes("a/p");
  const roundingUnitMs = resolveTimeRoundingUnitMs(raw);

  const tokens: DateFormatToken[] = [];
  const literalBuffer: string[] = [];
  const quoteState = { inQuoted: false };

  const flushLiteral = (): void => {
    if (literalBuffer.length === 0) {
      return;
    }
    tokens.push({ kind: "literal", text: literalBuffer.join("") });
    literalBuffer.length = 0;
  };

  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i]!;
    if (ch === "\\" && i + 1 < raw.length) {
      const next = raw[i + 1]!;
      if (next === "\"") {
        quoteState.inQuoted = !quoteState.inQuoted;
      } else {
        literalBuffer.push(next);
      }
      i += 1;
      continue;
    }
    if (ch === "\"") {
      quoteState.inQuoted = !quoteState.inQuoted;
      continue;
    }
    if (quoteState.inQuoted) {
      literalBuffer.push(ch);
      continue;
    }

    if (ch === "[" && i + 1 < raw.length) {
      const end = raw.indexOf("]", i + 1);
      if (end !== -1) {
        const innerRaw = raw.slice(i + 1, end);
        const inner = innerRaw.toLowerCase();
        if (inner === "h" || inner === "hh") {
          flushLiteral();
          tokens.push({ kind: "elapsedBracket", unit: "h", digits: inner === "hh" ? 2 : 1 });
          i = end;
          continue;
        }
        if (inner === "m" || inner === "mm") {
          flushLiteral();
          tokens.push({ kind: "elapsedBracket", unit: "m", digits: inner === "mm" ? 2 : 1 });
          i = end;
          continue;
        }
        if (inner === "s" || inner === "ss") {
          flushLiteral();
          tokens.push({ kind: "elapsedBracket", unit: "s", digits: inner === "ss" ? 2 : 1 });
          i = end;
          continue;
        }
      }
    }

    if (ch === "." && i + 1 < raw.length) {
      const zeroRun = /^[0]+/u.exec(raw.slice(i + 1));
      if (zeroRun) {
        flushLiteral();
        tokens.push({ kind: "fraction", digits: zeroRun[0].length });
        i += zeroRun[0].length;
        continue;
      }
    }

    const token = rawLower.slice(i);
    if (token.startsWith("am/pm")) {
      flushLiteral();
      tokens.push({ kind: "ampm", raw: raw.slice(i, i + "AM/PM".length) });
      i += "AM/PM".length - 1;
      continue;
    }
    if (token.startsWith("a/p")) {
      flushLiteral();
      tokens.push({ kind: "ampm", raw: raw.slice(i, i + "A/P".length) });
      i += "A/P".length - 1;
      continue;
    }
    if (token.startsWith("dddd")) {
      flushLiteral();
      tokens.push({ kind: "weekday", long: true });
      i += 3;
      continue;
    }
    if (token.startsWith("ddd")) {
      flushLiteral();
      tokens.push({ kind: "weekday", long: false });
      i += 2;
      continue;
    }
    if (token.startsWith("yyyy")) {
      flushLiteral();
      tokens.push({ kind: "year", digits: 4 });
      i += 3;
      continue;
    }
    if (token.startsWith("yyy")) {
      flushLiteral();
      tokens.push({ kind: "year", digits: 3 });
      i += 2;
      continue;
    }
    if (token.startsWith("yy")) {
      flushLiteral();
      tokens.push({ kind: "year", digits: 2 });
      i += 1;
      continue;
    }
    if (token.startsWith("y")) {
      flushLiteral();
      tokens.push({ kind: "year", digits: 1 });
      continue;
    }
    if (token.startsWith("mmmm")) {
      flushLiteral();
      tokens.push({ kind: "monthName", long: true });
      i += 3;
      continue;
    }
    if (token.startsWith("mmm")) {
      flushLiteral();
      tokens.push({ kind: "monthName", long: false });
      i += 2;
      continue;
    }
    if (token.startsWith("mm")) {
      flushLiteral();
      tokens.push({ kind: "monthOrMinute", digits: 2, minuteContext: looksLikeTimeMinutesContext(rawLower, i) });
      i += 1;
      continue;
    }
    if (token.startsWith("m")) {
      flushLiteral();
      tokens.push({ kind: "monthOrMinute", digits: 1, minuteContext: looksLikeTimeMinutesContext(rawLower, i) });
      continue;
    }
    if (token.startsWith("dd")) {
      flushLiteral();
      tokens.push({ kind: "day", digits: 2 });
      i += 1;
      continue;
    }
    if (token.startsWith("d")) {
      flushLiteral();
      tokens.push({ kind: "day", digits: 1 });
      continue;
    }
    if (token.startsWith("hh")) {
      flushLiteral();
      tokens.push({ kind: "hour", digits: 2 });
      i += 1;
      continue;
    }
    if (token.startsWith("h")) {
      flushLiteral();
      tokens.push({ kind: "hour", digits: 1 });
      continue;
    }
    if (token.startsWith("ss")) {
      flushLiteral();
      tokens.push({ kind: "second", digits: 2 });
      i += 1;
      continue;
    }
    if (token.startsWith("s")) {
      flushLiteral();
      tokens.push({ kind: "second", digits: 1 });
      continue;
    }

    literalBuffer.push(ch);
  }

  flushLiteral();

  return {
    raw,
    tokens,
    usesElapsedTime,
    hasElapsedHoursToken,
    hasElapsedMinutesToken,
    hasElapsedSecondsToken,
    usesAmPm,
    roundingUnitMs,
  };
}

function renderDateFormatSection(args: {
  readonly parsed: ParsedDateFormatSection;
  readonly serial: number;
  readonly dateSystem: XlsxDateSystem;
}): string {
  const { parsed } = args;
  const roundedSerial = roundSerialByUnitMs(args.serial, parsed.roundingUnitMs);

  const date = parsed.usesElapsedTime ? undefined : excelSerialToUtcDate(roundedSerial, args.dateSystem);
  const y = date?.getUTCFullYear() ?? 0;
  const m = (date?.getUTCMonth() ?? 0) + 1;
  const d = date?.getUTCDate() ?? 0;
  const weekday = date?.getUTCDay() ?? 0;
  const hh = date?.getUTCHours() ?? 0;
  const mm = date?.getUTCMinutes() ?? 0;
  const ss = date?.getUTCSeconds() ?? 0;
  const ms = date?.getUTCMilliseconds() ?? 0;

  const elapsedTotalMs = parsed.usesElapsedTime ? Math.round(roundedSerial * MS_IN_DAY) : 0;
  const elapsedTotalSeconds = parsed.usesElapsedTime ? Math.floor(elapsedTotalMs / 1000) : 0;
  const elapsedMilliseconds = parsed.usesElapsedTime ? ((elapsedTotalMs % 1000) + 1000) % 1000 : 0;
  const elapsedTotalMinutes = parsed.usesElapsedTime ? Math.floor(elapsedTotalSeconds / 60) : 0;
  const elapsedTotalHours = parsed.usesElapsedTime ? Math.floor(elapsedTotalMinutes / 60) : 0;
  const elapsedSecondsWithinMinute = parsed.usesElapsedTime ? ((elapsedTotalSeconds % 60) + 60) % 60 : 0;
  const elapsedMinutesWithinHour = parsed.usesElapsedTime ? ((elapsedTotalMinutes % 60) + 60) % 60 : 0;
  const elapsedHoursWithinDay = parsed.usesElapsedTime ? ((elapsedTotalHours % 24) + 24) % 24 : 0;

  const resolveHourValue = (): number => {
    if (!parsed.usesElapsedTime) {
      return hh;
    }
    return parsed.hasElapsedHoursToken ? elapsedTotalHours : elapsedHoursWithinDay;
  };

  const parts: string[] = [];
  for (const token of parsed.tokens) {
    if (token.kind === "literal") {
      parts.push(token.text);
      continue;
    }
    if (token.kind === "elapsedBracket") {
      if (token.unit === "h") {
        const value = elapsedTotalHours;
        parts.push(token.digits === 2 ? String(value).padStart(2, "0") : String(value));
        continue;
      }
      if (token.unit === "m") {
        const value = elapsedTotalMinutes;
        parts.push(token.digits === 2 ? String(value).padStart(2, "0") : String(value));
        continue;
      }
      const value = elapsedTotalSeconds;
      parts.push(token.digits === 2 ? String(value).padStart(2, "0") : String(value));
      continue;
    }
    if (token.kind === "fraction") {
      const digits = token.digits;
      if (digits <= 3) {
        const divisor = 10 ** (3 - digits);
        const fractionDigits = parsed.usesElapsedTime ? elapsedMilliseconds : ms;
        const fraction = Math.floor(fractionDigits / divisor);
        parts.push(`.${String(fraction).padStart(digits, "0")}`);
        continue;
      }
      const fractionDigits = parsed.usesElapsedTime ? elapsedMilliseconds : ms;
      parts.push(`.${String(fractionDigits).padStart(3, "0")}${"0".repeat(digits - 3)}`);
      continue;
    }
    if (token.kind === "ampm") {
      parts.push(formatAmPmToken(token.raw, hh));
      continue;
    }
    if (token.kind === "weekday") {
      parts.push(token.long ? (WEEKDAY_LONG[weekday] ?? "") : (WEEKDAY_SHORT[weekday] ?? ""));
      continue;
    }
    if (token.kind === "year") {
      if (token.digits >= 3) {
        parts.push(String(y));
        continue;
      }
      parts.push(pad2(y % 100));
      continue;
    }
    if (token.kind === "monthName") {
      parts.push(token.long ? (MONTH_LONG[m - 1] ?? "") : (MONTH_SHORT[m - 1] ?? ""));
      continue;
    }
    if (token.kind === "monthOrMinute") {
      if (parsed.usesElapsedTime) {
        const value = parsed.hasElapsedMinutesToken ? elapsedTotalMinutes : elapsedMinutesWithinHour;
        parts.push(token.digits === 2 ? String(value).padStart(2, "0") : String(value));
        continue;
      }
      if (token.minuteContext) {
        parts.push(token.digits === 2 ? pad2(mm) : String(mm));
        continue;
      }
      parts.push(token.digits === 2 ? pad2(m) : String(m));
      continue;
    }
    if (token.kind === "day") {
      parts.push(token.digits === 2 ? pad2(d) : String(d));
      continue;
    }
    if (token.kind === "hour") {
      const hourValue = resolveHourValue();
      const hour12Base = hourValue % 12;
      const hour12 = hour12Base === 0 ? 12 : hour12Base;
      const outputValue = parsed.usesAmPm ? hour12 : hourValue;
      parts.push(token.digits === 2 ? pad2(outputValue) : String(outputValue));
      continue;
    }
    if (token.kind === "second") {
      if (parsed.usesElapsedTime) {
        const value = parsed.hasElapsedSecondsToken ? elapsedTotalSeconds : elapsedSecondsWithinMinute;
        parts.push(token.digits === 2 ? String(value).padStart(2, "0") : String(value));
        continue;
      }
      parts.push(token.digits === 2 ? pad2(ss) : String(ss));
      continue;
    }
  }

  return parts.join("");
}

/**
 * Format an Excel serial date/time by a SpreadsheetML format section.
 *
 * This assumes the caller already decided the section represents a date/time format.
 */
export function formatDateByCode(serial: number, section: string, dateSystem: XlsxDateSystem): string {
  const parsed = parseDateFormatSection(section);
  return renderDateFormatSection({ parsed, serial, dateSystem });
}
