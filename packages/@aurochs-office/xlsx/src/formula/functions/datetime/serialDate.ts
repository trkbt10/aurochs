/**
 * @file Helpers for converting between spreadsheet date serials and UTC dates.
 *
 * Re-exports from domain/date-serial.ts for formula function use.
 * Formula functions typically use 1900 date system (default).
 */

import {
  dateToSerial,
  serialToDate as serialToDateWithSystem,
  datePartsToSerial as datePartsToSerialWithSystem,
  serialToComponents,
} from "../../../domain/date-serial";

/**
 * Convert date parts to serial (1900 system, for formula compatibility).
 */
export const datePartsToSerial = (year: number, month: number, day: number): number => {
  return datePartsToSerialWithSystem({ year, month, day, dateSystem: "1900" });
};

/**
 * Convert Date to serial (1900 system, for formula compatibility).
 */
export const dateTimeToSerial = (date: Date): number => {
  return dateToSerial(date, "1900");
};

/**
 * Convert serial to Date (1900 system, for formula compatibility).
 */
export const serialToDate = (serial: number): Date => {
  return serialToDateWithSystem(serial, "1900");
};

/**
 * Extract UTC components from serial (1900 system).
 */
export const serialToUTCComponents = (
  serial: number,
): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
} => {
  return serialToComponents(serial, "1900");
};

/**
 * Normalize time components to day fraction.
 */
export const normalizeTimeToFraction = (hours: number, minutes: number, seconds: number): number => {
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  if (!Number.isFinite(totalSeconds)) {
    throw new Error("TIME arguments must be finite");
  }
  if (totalSeconds < 0) {
    throw new Error("TIME arguments must not produce negative durations");
  }
  return totalSeconds / 86_400;
};

/**
 * Get the number of days in a month.
 */
export const daysInMonth = (year: number, month: number): number => {
  const boundary = new Date(Date.UTC(year, month, 0));
  return boundary.getUTCDate();
};
