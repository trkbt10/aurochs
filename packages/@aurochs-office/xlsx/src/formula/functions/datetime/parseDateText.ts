/**
 * @file Minimal ISO-like date/time parsers for DATEVALUE and TIMEVALUE (ODF 1.3 §6.9).
 */

import { datePartsToSerial, normalizeTimeToFraction } from "./serialDate";

const DATE_PATTERN = /^([+-]?\d{1,4})[-/](\d{1,2})[-/](\d{1,2})$/u;
const TIME_PATTERN = /^([+-]?\d+(?:\.\d+)?):(\d{1,2})(?::(\d{1,2}(?:\.\d+)?))?$/u;

export const parseDateText = (text: string, description: string): number => {
  const trimmed = text.trim();
  const match = DATE_PATTERN.exec(trimmed);
  if (!match) {
    throw new Error(`${description} expects date in YYYY-MM-DD or YYYY/MM/DD format`);
  }
  const [, yearText, monthText, dayText] = match;
  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);
  const day = Number.parseInt(dayText, 10);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new Error(`${description} could not parse calendar components`);
  }
  return datePartsToSerial(year, month, day);
};

export const parseTimeText = (text: string, description: string): number => {
  const trimmed = text.trim();
  const match = TIME_PATTERN.exec(trimmed);
  if (!match) {
    throw new Error(`${description} expects time in HH:MM or HH:MM:SS format`);
  }
  const [, hourText, minuteText, secondText] = match;
  const hours = Number.parseFloat(hourText);
  const minutes = Number.parseFloat(minuteText);
  const seconds = secondText ? Number.parseFloat(secondText) : 0;
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
    throw new Error(`${description} could not parse time components`);
  }
  if (minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) {
    throw new Error(`${description} minutes and seconds must be within [0, 60)`);
  }
  if (hours < 0) {
    throw new Error(`${description} hours must be non-negative`);
  }
  return normalizeTimeToFraction(hours, minutes, seconds);
};
