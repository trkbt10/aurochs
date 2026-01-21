/**
 * @file SpreadsheetML number/date formatting helpers (ECMA-376 style/numFmt)
 *
 * Provides basic formatting for Excel-style format codes (e.g. `0.00`, `#,##0.00`, `000.00`).
 *
 * NOTE:
 * - This is intentionally a limited implementation, expanded incrementally via POI fixtures.
 * - The goal is stable, deterministic display for the editor and formula `TEXT()` evaluation.
 */

import { isDateFormat } from "./number-format";
import type { XlsxDateSystem } from "../date-system";
import { EXCEL_1904_TO_1900_DAY_OFFSET } from "../date-system";

function stripQuotedStrings(formatCode: string): string {
  return formatCode.replace(/"[^"]*"/gu, "");
}

function removeEscapes(section: string): string {
  return section.replace(/\\./gu, "");
}

function removeBracketCodes(section: string): string {
  return section.replace(/\[[^\]]+\]/gu, "");
}

function removeFillAndPadding(section: string): string {
  // `_x` adds spacing and `*x` fills by repeating chars. They are not part of numeric formatting output here.
  return section.replace(/_.?/gu, "").replace(/\*.?/gu, "");
}

function removeLiteralsForPattern(section: string): string {
  return removeFillAndPadding(removeBracketCodes(removeEscapes(stripQuotedStrings(section))));
}

function pickFormatSection(formatCode: string, value: number): { readonly section: string; readonly hasNegativeSection: boolean } {
  const sections = formatCode.split(";");
  if (sections.length <= 1) {
    return { section: formatCode, hasNegativeSection: false };
  }
  if (value > 0) {
    return { section: sections[0]!, hasNegativeSection: true };
  }
  if (value < 0) {
    return { section: sections[1] ?? sections[0]!, hasNegativeSection: true };
  }
  return { section: sections[2] ?? sections[0]!, hasNegativeSection: true };
}

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

function isPercent(section: string): boolean {
  return removeLiteralsForPattern(section).includes("%");
}

function isScientific(section: string): boolean {
  return /E\+0+/iu.test(removeLiteralsForPattern(section));
}

function extractAffixes(section: string): { readonly prefix: string; readonly suffix: string } {
  const first = section.search(/[0#]/u);
  if (first === -1) {
    return { prefix: unescapeAffix(section), suffix: "" };
  }
  const last = section.lastIndexOf("0") > section.lastIndexOf("#") ? section.lastIndexOf("0") : section.lastIndexOf("#");
  const prefixRaw = section.slice(0, first);
  const suffixRaw = last === -1 ? "" : section.slice(last + 1);
  return { prefix: unescapeAffix(prefixRaw), suffix: unescapeAffix(suffixRaw) };
}

function unescapeAffix(text: string): string {
  const noBrackets = removeBracketCodes(text);
  const noPadding = removeFillAndPadding(noBrackets);
  const unescaped = noPadding.replace(/\\(.)/gu, "$1");
  return unescaped.replace(/"([^"]*)"/gu, "$1");
}

function excelSerialToUtcDate1900(serial: number): Date {
  // 1900 date system with leap-year bug:
  // - serial 1 = 1900-01-01
  // - serial 60 = 1900-02-29 (non-existent but preserved by Excel)
  const days = Math.floor(serial);
  const fraction = serial - days;
  const msInDay = 86_400_000;
  const timeMs = Math.round(fraction * msInDay);
  const adjustedDays = days >= 60 ? days - 1 : days;

  const baseUtcMs = Date.UTC(1899, 11, 31);
  const dateUtcMs = baseUtcMs + adjustedDays * msInDay + timeMs;
  return new Date(dateUtcMs);
}

function excelSerialToUtcDate(serial: number, dateSystem: XlsxDateSystem): Date {
  const normalizedSerial = dateSystem === "1904" ? serial + EXCEL_1904_TO_1900_DAY_OFFSET : serial;
  return excelSerialToUtcDate1900(normalizedSerial);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
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

function removeNonTimeBracketCodes(section: string): string {
  // Preserve time elapsed tokens like [h], [m], [s] but drop colors/conditions like [Red], [<100], etc.
  return section.replace(/\[[^\]]+\]/gu, (token) => {
    const inner = token.slice(1, -1).toLowerCase();
    if (inner === "h" || inner === "hh" || inner === "m" || inner === "mm" || inner === "s" || inner === "ss") {
      return token;
    }
    return "";
  });
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

function formatDateByCode(serial: number, section: string, dateSystem: XlsxDateSystem): string {
  const date = excelSerialToUtcDate(serial, dateSystem);
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const weekday = date.getUTCDay();
  const hh = date.getUTCHours();
  const mm = date.getUTCMinutes();
  const ss = date.getUTCSeconds();
  const ms = date.getUTCMilliseconds();

  const raw = removeNonTimeBracketCodes(section);
  const rawLower = raw.toLowerCase();
  const usesAmPm = rawLower.includes("am/pm") || rawLower.includes("a/p");

  const parts: string[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i]!;
    if (ch === "." && i + 1 < raw.length) {
      const zeroRun = /^[0]+/u.exec(raw.slice(i + 1));
      if (zeroRun) {
        const digits = zeroRun[0].length;
        parts.push(`.${String(ms).padStart(digits, "0")}`);
        i += digits;
        continue;
      }
    }
    if (ch === "\\" && i + 1 < raw.length) {
      parts.push(raw[i + 1]!);
      i += 1;
      continue;
    }
    if (ch === "\"") {
      const end = raw.indexOf("\"", i + 1);
      if (end === -1) {
        continue;
      }
      parts.push(raw.slice(i + 1, end));
      i = end;
      continue;
    }

    const token = rawLower.slice(i);
    if (token.startsWith("am/pm")) {
      parts.push(formatAmPmToken(raw.slice(i, i + "AM/PM".length), hh));
      i += "AM/PM".length - 1;
      continue;
    }
    if (token.startsWith("a/p")) {
      parts.push(formatAmPmToken(raw.slice(i, i + "A/P".length), hh));
      i += "A/P".length - 1;
      continue;
    }
    if (token.startsWith("dddd")) {
      parts.push(WEEKDAY_LONG[weekday] ?? "");
      i += 3;
      continue;
    }
    if (token.startsWith("ddd")) {
      parts.push(WEEKDAY_SHORT[weekday] ?? "");
      i += 2;
      continue;
    }
    if (token.startsWith("yyyy")) {
      parts.push(String(y));
      i += 3;
      continue;
    }
    if (token.startsWith("yyy")) {
      parts.push(String(y));
      i += 2;
      continue;
    }
    if (token.startsWith("yy")) {
      parts.push(pad2(y % 100));
      i += 1;
      continue;
    }
    if (token.startsWith("y")) {
      parts.push(pad2(y % 100));
      continue;
    }
    if (token.startsWith("mmmm")) {
      parts.push(MONTH_LONG[m - 1] ?? "");
      i += 3;
      continue;
    }
    if (token.startsWith("mmm")) {
      parts.push(MONTH_SHORT[m - 1] ?? "");
      i += 2;
      continue;
    }
    if (token.startsWith("mm")) {
      if (looksLikeTimeMinutesContext(rawLower, i)) {
        parts.push(pad2(mm));
      } else {
        parts.push(pad2(m));
      }
      i += 1;
      continue;
    }
    if (token.startsWith("m")) {
      if (looksLikeTimeMinutesContext(rawLower, i)) {
        parts.push(String(mm));
      } else {
        parts.push(String(m));
      }
      continue;
    }
    if (token.startsWith("dd")) {
      parts.push(pad2(d));
      i += 1;
      continue;
    }
    if (token.startsWith("d")) {
      parts.push(String(d));
      continue;
    }
    if (token.startsWith("hh")) {
      const hour12Base = hh % 12;
      const hour12 = hour12Base === 0 ? 12 : hour12Base;
      parts.push(pad2(usesAmPm ? hour12 : hh));
      i += 1;
      continue;
    }
    if (token.startsWith("h")) {
      const hour12Base = hh % 12;
      const hour12 = hour12Base === 0 ? 12 : hour12Base;
      parts.push(String(usesAmPm ? hour12 : hh));
      continue;
    }
    if (token.startsWith("ss")) {
      parts.push(pad2(ss));
      i += 1;
      continue;
    }
    if (token.startsWith("s")) {
      parts.push(String(ss));
      continue;
    }

    parts.push(ch);
  }

  return parts.join("");
}

/**
 * Format a number (or Excel serial date) by an Excel/SpreadsheetML format code.
 */
export function formatNumberByCode(value: number, formatCode: string, options?: { readonly dateSystem?: XlsxDateSystem }): string {
  const { section, hasNegativeSection } = pickFormatSection(formatCode, value);
  const cleaned = removeLiteralsForPattern(section);

  const trimmed = cleaned.trim();
  if (trimmed === "General" || trimmed === "@") {
    return String(value);
  }

  if (isDateFormat(cleaned)) {
    return formatDateByCode(value, section, options?.dateSystem ?? "1900");
  }

  const percent = isPercent(section);
  const scaled = percent ? value * 100 : value;

  if (isScientific(section)) {
    const expDigitsMatch = /E\+0+/iu.exec(cleaned);
    const expDigits = expDigitsMatch ? expDigitsMatch[0].length - 2 : 2;

    const dot = cleaned.indexOf(".");
    const fractionPattern = dot === -1 ? "" : cleaned.slice(dot + 1);
    const { min, max } = countFractionDigits(fractionPattern);
    const decimals = Math.max(min, max);

    const exp = scaled.toExponential(decimals);
    const [mantissa, exponentRaw] = exp.split("e");
    const exponent = Number.parseInt(exponentRaw ?? "0", 10);
    const sign = exponent >= 0 ? "+" : "-";
    const abs = Math.abs(exponent);
    return `${mantissa}E${sign}${String(abs).padStart(expDigits, "0")}`;
  }

  const dot = cleaned.indexOf(".");
  const integerPattern = dot === -1 ? cleaned : cleaned.slice(0, dot);
  const fractionPattern = dot === -1 ? "" : cleaned.slice(dot + 1);

  const minIntegerDigits = Math.max(1, countIntegerZeros(integerPattern));
  const { min: minFractionDigits, max: maxFractionDigits } = countFractionDigits(fractionPattern);
  const grouping = wantsGrouping(integerPattern);

  const formatter = new Intl.NumberFormat("en-US", {
    useGrouping: grouping,
    minimumIntegerDigits: minIntegerDigits,
    minimumFractionDigits: minFractionDigits,
    maximumFractionDigits: maxFractionDigits,
  });

  const isNegative = scaled < 0;
  const formattedCore = formatter.format(Math.abs(scaled));
  const { prefix, suffix } = extractAffixes(section);
  const negativePrefix = isNegative && !hasNegativeSection ? "-" : "";

  const percentSuffix = percent ? "%" : "";
  return `${negativePrefix}${prefix}${formattedCore}${suffix}${percentSuffix}`;
}
