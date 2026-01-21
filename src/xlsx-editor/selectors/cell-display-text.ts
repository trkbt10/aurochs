/**
 * @file Cell display text (SpreadsheetML)
 *
 * Formats cell values (and formula results) for display using numFmtId + styles.numberFormats.
 *
 * NOTE: This is an MVP formatter. It intentionally supports a limited subset of Excel format codes.
 */

import type { CellAddress } from "../../xlsx/domain/cell/address";
import type { Cell, CellValue } from "../../xlsx/domain/cell/types";
import type { XlsxWorksheet } from "../../xlsx/domain/workbook";
import type { XlsxStyleSheet } from "../../xlsx/domain/style/types";
import type { XlsxDifferentialFormat } from "../../xlsx/domain/style/dxf";
import { isDateFormat, resolveFormatCode } from "../../xlsx/domain/style/number-format";
import type { FormulaScalar } from "../../xlsx/formula/types";
import { isFormulaError, toDisplayText } from "../../xlsx/formula/types";
import { resolveCellXf } from "./cell-xf";

function stripQuotedStrings(formatCode: string): string {
  return formatCode.replace(/"[^"]*"/gu, "");
}

function pickFormatSection(formatCode: string, value: number): string {
  const sections = formatCode.split(";");
  if (sections.length <= 1) {
    return formatCode;
  }
  if (value > 0) {
    return sections[0]!;
  }
  if (value < 0) {
    return sections[1] ?? sections[0]!;
  }
  return sections[2] ?? sections[0]!;
}

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

function countDecimals(section: string): number {
  const dot = section.indexOf(".");
  if (dot === -1) {
    return 0;
  }
  const tail = section.slice(dot + 1);
  const match = /^[0#]+/u.exec(tail);
  const digits = match?.[0] ?? "";
  return [...digits].filter((ch) => ch === "0").length;
}

function wantsGrouping(section: string): boolean {
  const cleaned = stripQuotedStrings(section);
  const dot = cleaned.indexOf(".");
  const head = dot === -1 ? cleaned : cleaned.slice(0, dot);
  return head.includes(",");
}

function isPercent(section: string): boolean {
  return stripQuotedStrings(section).includes("%");
}

function isScientific(section: string): boolean {
  return /E\+0+/iu.test(stripQuotedStrings(section));
}

function removeLiterals(section: string): string {
  // Remove quoted literals and escaped characters for basic token scanning.
  return section.replace(/"[^"]*"/gu, "").replace(/\\./gu, "");
}

function looksLikeTimeMinutesContext(section: string, index: number): boolean {
  // Heuristic: in time patterns, minutes appear as "h:mm" or "mm:ss".
  const prev = index > 0 ? section[index - 1] : undefined;
  const next = index + 1 < section.length ? section[index + 1] : undefined;
  if (prev === ":" || next === ":") {
    return true;
  }
  return false;
}

function excelSerialToUtcDate(serial: number): Date {
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

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDateByCode(serial: number, section: string): string {
  const date = excelSerialToUtcDate(serial);
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const hh = date.getUTCHours();
  const mm = date.getUTCMinutes();
  const ss = date.getUTCSeconds();

  const raw = removeNonTimeBracketCodes(section);

  // Very small formatter: supports tokens used in built-in formats and common customs.
  const parts: string[] = [];
  const text = raw;

  const isAmPm = /AM\/PM/iu.test(text);
  const hour12Base = hh % 12;
  const hour12 = hour12Base === 0 ? 12 : hour12Base;
  const amPmText = hh < 12 ? "AM" : "PM";

  for (let i = 0; i < text.length; ) {
    const ch = text[i]!;
    if (ch === '"') {
      const end = text.indexOf('"', i + 1);
      parts.push(end === -1 ? "" : text.slice(i + 1, end));
      i = end === -1 ? text.length : end + 1;
      continue;
    }
    if (ch === "\\") {
      parts.push(text[i + 1] ?? "");
      i += 2;
      continue;
    }

    const rest = text.slice(i);
    if (/^yyyy/iu.test(rest)) {
      parts.push(String(y).padStart(4, "0"));
      i += 4;
      continue;
    }
    if (/^yy/iu.test(rest)) {
      parts.push(pad2(y % 100));
      i += 2;
      continue;
    }
    if (/^dd/iu.test(rest)) {
      parts.push(pad2(d));
      i += 2;
      continue;
    }
    if (/^d/iu.test(rest)) {
      parts.push(String(d));
      i += 1;
      continue;
    }
    if (/^hh/iu.test(rest)) {
      parts.push(pad2(isAmPm ? hour12 : hh));
      i += 2;
      continue;
    }
    if (/^h/iu.test(rest)) {
      parts.push(String(isAmPm ? hour12 : hh));
      i += 1;
      continue;
    }
    if (/^ss/iu.test(rest)) {
      parts.push(pad2(ss));
      i += 2;
      continue;
    }
    if (/^s/iu.test(rest)) {
      parts.push(String(ss));
      i += 1;
      continue;
    }
    if (/^AM\/PM/iu.test(rest)) {
      parts.push(amPmText);
      i += "AM/PM".length;
      continue;
    }

    if (/^mm/iu.test(rest)) {
      const minutes = looksLikeTimeMinutesContext(text, i);
      parts.push(minutes ? pad2(mm) : pad2(m));
      i += 2;
      continue;
    }
    if (/^m/iu.test(rest)) {
      const minutes = looksLikeTimeMinutesContext(text, i);
      parts.push(minutes ? String(mm) : String(m));
      i += 1;
      continue;
    }

    parts.push(ch);
    i += 1;
  }

  return parts.join("");
}

function formatNumberByCode(value: number, formatCode: string): string {
  const section = removeNonTimeBracketCodes(pickFormatSection(formatCode, value));

  const cleaned = removeLiterals(section);
  if (cleaned.trim() === "General") {
    return String(value);
  }
  if (cleaned.trim() === "@") {
    return String(value);
  }

  if (isDateFormat(cleaned)) {
    return formatDateByCode(value, section);
  }

  const percent = isPercent(cleaned);
  const decimals = countDecimals(cleaned);
  const grouping = wantsGrouping(cleaned);

  if (isScientific(cleaned)) {
    const expDigitsMatch = /E\+0+/iu.exec(cleaned);
    const expDigits = expDigitsMatch ? expDigitsMatch[0].length - 2 : 2;
    const exp = value.toExponential(decimals);
    const [mantissa, exponentRaw] = exp.split("e");
    const exponent = Number.parseInt(exponentRaw ?? "0", 10);
    const sign = exponent >= 0 ? "+" : "-";
    const abs = Math.abs(exponent);
    return `${mantissa}E${sign}${String(abs).padStart(expDigits, "0")}`;
  }

  const scaled = percent ? value * 100 : value;
  const formatter = new Intl.NumberFormat("en-US", {
    useGrouping: grouping,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const formatted = formatter.format(scaled);
  return percent ? `${formatted}%` : formatted;
}

/**
 * Resolve the effective number format code for a cell.
 */
export function resolveCellFormatCode(params: {
  readonly styles: XlsxStyleSheet;
  readonly sheet: XlsxWorksheet;
  readonly address: CellAddress;
  readonly cell: Cell | undefined;
  readonly conditionalFormat?: XlsxDifferentialFormat;
}): string {
  const conditionalNumFmt = params.conditionalFormat?.numFmt?.formatCode;
  if (conditionalNumFmt) {
    return conditionalNumFmt;
  }
  const { styles, sheet, address, cell } = params;
  const { xf } = resolveCellXf({ styles, sheet, address, cell });
  return resolveFormatCode(xf.numFmtId as number, styles.numberFormats);
}

/**
 * Format a raw cell value for grid display given a resolved format code.
 */
export function formatCellValueForDisplay(value: CellValue, formatCode: string): string {
  if (value.type === "empty") {
    return "";
  }
  if (value.type === "string") {
    return value.value;
  }
  if (value.type === "boolean") {
    return value.value ? "TRUE" : "FALSE";
  }
  if (value.type === "error") {
    return value.value;
  }
  if (value.type === "date") {
    // If caller wants date formatting for numeric serials, that should be supplied as number.
    return value.value.toISOString();
  }
  return formatNumberByCode(value.value, formatCode);
}

/**
 * Format a formula evaluation result for grid display given a resolved format code.
 */
export function formatFormulaScalarForDisplay(value: FormulaScalar, formatCode: string): string {
  if (value === null) {
    return "";
  }
  if (typeof value === "number") {
    return formatNumberByCode(value, formatCode);
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return toDisplayText(value);
  }
  if (isFormulaError(value)) {
    return value.value;
  }
  return "";
}
