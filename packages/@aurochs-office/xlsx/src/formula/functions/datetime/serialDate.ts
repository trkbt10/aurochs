/**
 * @file Helpers for converting between spreadsheet date serials and UTC dates.
 */

const MILLISECONDS_PER_DAY = 86_400_000;
const SPREADSHEET_EPOCH_MS = Date.UTC(1899, 11, 30);

const toUtcDate = (year: number, monthIndex: number, day: number): Date => {
  const milliseconds = Date.UTC(year, monthIndex, day);
  if (!Number.isFinite(milliseconds)) {
    throw new Error("DATE produced an invalid calendar date");
  }
  return new Date(milliseconds);
};

export const datePartsToSerial = (year: number, month: number, day: number): number => {
  const utcDate = toUtcDate(year, month - 1, day);
  return (utcDate.getTime() - SPREADSHEET_EPOCH_MS) / MILLISECONDS_PER_DAY;
};

export const dateTimeToSerial = (date: Date): number => {
  return (date.getTime() - SPREADSHEET_EPOCH_MS) / MILLISECONDS_PER_DAY;
};

export const serialToDate = (serial: number): Date => {
  if (!Number.isFinite(serial)) {
    throw new Error("Date serial must be finite");
  }
  const millisecondsOffset = Math.round(serial * MILLISECONDS_PER_DAY);
  return new Date(SPREADSHEET_EPOCH_MS + millisecondsOffset);
};

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
  const date = serialToDate(serial);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hours: date.getUTCHours(),
    minutes: date.getUTCMinutes(),
    seconds: date.getUTCSeconds(),
    milliseconds: date.getUTCMilliseconds(),
  };
};

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

export const daysInMonth = (year: number, month: number): number => {
  const boundary = toUtcDate(year, month, 0);
  return boundary.getUTCDate();
};
