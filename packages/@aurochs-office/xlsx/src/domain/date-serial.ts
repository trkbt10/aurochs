/**
 * @file Date serial number conversion utilities
 *
 * Provides conversion between JavaScript Date objects and Excel serial date numbers.
 * Excel stores dates as floating-point numbers where:
 * - The integer part represents days since the epoch (1899-12-30 for 1900 system)
 * - The fractional part represents time as a fraction of a day
 *
 * @see ECMA-376 Part 4, Section 18.17.4.1 (Date and Time Formatting)
 */

import type { XlsxDateSystem } from "./date-system";
import { EXCEL_1904_TO_1900_DAY_OFFSET } from "./date-system";

const MILLISECONDS_PER_DAY = 86_400_000;

/**
 * Epoch for the 1900 date system (1899-12-31 UTC).
 * Serial 1 = 1900-01-01, so epoch is one day before.
 */
const SPREADSHEET_1900_EPOCH_MS = Date.UTC(1899, 11, 31);

/**
 * Epoch for the 1904 date system (1904-01-01 UTC).
 */
const SPREADSHEET_1904_EPOCH_MS = Date.UTC(1904, 0, 1);

/**
 * Convert a JavaScript Date to Excel serial number.
 *
 * @param date - The JavaScript Date object
 * @param dateSystem - The workbook's date system ("1900" or "1904")
 * @returns Excel serial date number
 *
 * @example
 * ```ts
 * dateToSerial(new Date("2024-01-15"), "1900"); // 45306
 * dateToSerial(new Date("2024-01-15T12:00:00Z"), "1900"); // 45306.5
 * ```
 */
export function dateToSerial(date: Date, dateSystem: XlsxDateSystem = "1900"): number {
  const epoch = dateSystem === "1904" ? SPREADSHEET_1904_EPOCH_MS : SPREADSHEET_1900_EPOCH_MS;
  let serial = (date.getTime() - epoch) / MILLISECONDS_PER_DAY;

  // Excel 1900 date system bug: serial 60 = 1900-02-29 (doesn't exist)
  // Excel treats 1900 as a leap year, so serials > 59 need +1 adjustment
  if (dateSystem === "1900" && serial > 59) {
    serial += 1;
  }

  return serial;
}

/**
 * Convert an Excel serial number to JavaScript Date.
 *
 * @param serial - Excel serial date number
 * @param dateSystem - The workbook's date system ("1900" or "1904")
 * @returns JavaScript Date object (in UTC)
 * @throws Error if serial is not a finite number
 *
 * @example
 * ```ts
 * serialToDate(45306, "1900"); // Date representing 2024-01-15
 * serialToDate(45306.5, "1900"); // Date representing 2024-01-15 12:00:00 UTC
 * ```
 */
export function serialToDate(serial: number, dateSystem: XlsxDateSystem = "1900"): Date {
  if (!Number.isFinite(serial)) {
    throw new Error("Date serial must be finite");
  }

  // For 1904 system, convert to 1900 equivalent first
  let adjustedSerial = dateSystem === "1904" ? serial + EXCEL_1904_TO_1900_DAY_OFFSET : serial;

  // Excel 1900 date system bug: serial 60 = 1900-02-29 (doesn't exist)
  // Excel treats 1900 as a leap year, so serials > 59 are off by 1 day
  if (dateSystem === "1900" && adjustedSerial > 59) {
    adjustedSerial -= 1;
  }

  const millisecondsOffset = Math.round(adjustedSerial * MILLISECONDS_PER_DAY);
  return new Date(SPREADSHEET_1900_EPOCH_MS + millisecondsOffset);
}

type DatePartsToSerialParams = {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly dateSystem?: XlsxDateSystem;
};

/**
 * Convert date parts (year, month, day) to Excel serial number.
 *
 * @param params.year - Year (e.g., 2024)
 * @param params.month - Month (1-12)
 * @param params.day - Day of month (1-31)
 * @param params.dateSystem - The workbook's date system ("1900" or "1904")
 * @returns Excel serial date number
 */
export function datePartsToSerial(params: DatePartsToSerialParams): number {
  const { year, month, day, dateSystem = "1900" } = params;
  const utcMs = Date.UTC(year, month - 1, day);
  if (!Number.isFinite(utcMs)) {
    throw new Error("Invalid date components");
  }
  return dateToSerial(new Date(utcMs), dateSystem);
}

/**
 * Extract date/time components from an Excel serial number.
 *
 * @param serial - Excel serial date number
 * @param dateSystem - The workbook's date system ("1900" or "1904")
 * @returns Object with year, month, day, hours, minutes, seconds, milliseconds
 */
export function serialToComponents(
  serial: number,
  dateSystem: XlsxDateSystem = "1900",
): {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;
  readonly milliseconds: number;
} {
  const date = serialToDate(serial, dateSystem);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hours: date.getUTCHours(),
    minutes: date.getUTCMinutes(),
    seconds: date.getUTCSeconds(),
    milliseconds: date.getUTCMilliseconds(),
  };
}
