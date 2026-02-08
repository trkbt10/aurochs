/**
 * @file Formula preview formatting helpers
 *
 * Small UI-only utilities for the xlsx formula catalog pages.
 */

import type { FormulaScalar } from "@aurochs-office/xlsx/formula/types";
import { isFormulaError } from "@aurochs-office/xlsx/formula/types";

/**
 * Format a formula evaluator result into a human-readable string for UI display.
 */
export function formatValue(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }
  if (typeof value === "number") {
    return value.toString();
  }
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return `[${value.map((element) => formatValue(element)).join(", ")}]`;
  }
  if (typeof value === "object" && value !== null && "type" in value) {
    const maybeScalar = value as FormulaScalar;
    if (isFormulaError(maybeScalar)) {
      return maybeScalar.value;
    }
  }
  return String(value);
}

/**
 * Check if a string can be parsed as a finite number.
 */
export function isNumericString(value: string): boolean {
  const n = Number(value);
  return Number.isFinite(n);
}

/**
 * Deep equality check for primitives/arrays/plain objects for sample comparison.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }
  if (typeof a !== typeof b) {
    return false;
  }
  if (typeof a === "object" && a !== null && typeof b === "object" && b !== null) {
    const ak = Object.keys(a as Record<string, unknown>).sort();
    const bk = Object.keys(b as Record<string, unknown>).sort();
    if (!deepEqual(ak, bk)) {
      return false;
    }
    for (const k of ak) {
      if (!deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) {
        return false;
      }
    }
    return true;
  }
  return false;
}
