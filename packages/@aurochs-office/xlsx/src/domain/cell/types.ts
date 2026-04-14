/**
 * @file Cell Value Types
 *
 * Defines the discriminated union types for cell values in SpreadsheetML.
 * Includes type guards for runtime type checking.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.4 (Cell)
 * @see ECMA-376 Part 4, Section 18.18.11 (Data Type)
 * @see ECMA-376 Part 4, Section 18.18.18 (Error Values)
 */

import type { CellAddress } from "./address";
import { cellAddress } from "./address";
import type { StyleId } from "../types";
import type { Formula } from "./formula";

// =============================================================================
// Error Values
// =============================================================================

/**
 * Standard Excel error values.
 *
 * @see ECMA-376 Part 4, Section 18.18.18 (ST_Error)
 */
export type ErrorValue =
  | "#NULL!"
  | "#DIV/0!"
  | "#VALUE!"
  | "#REF!"
  | "#NAME?"
  | "#NUM!"
  | "#N/A"
  | "#GETTING_DATA";

// =============================================================================
// Cell Value Types (Discriminated Union)
// =============================================================================

/**
 * String cell value.
 */
export type StringCellValue = {
  readonly type: "string";
  readonly value: string;
};

/**
 * Number cell value.
 */
export type NumberCellValue = {
  readonly type: "number";
  readonly value: number;
};

/**
 * Boolean cell value.
 */
export type BooleanCellValue = {
  readonly type: "boolean";
  readonly value: boolean;
};

/**
 * Error cell value.
 */
export type ErrorCellValue = {
  readonly type: "error";
  readonly value: ErrorValue;
};

/**
 * Date cell value.
 */
export type DateCellValue = {
  readonly type: "date";
  readonly value: Date;
};

/**
 * Empty cell value.
 */
export type EmptyCellValue = {
  readonly type: "empty";
};

/**
 * Discriminated union of all cell value types.
 *
 * Use the `type` property to discriminate between variants.
 *
 * @see ECMA-376 Part 4, Section 18.18.11 (ST_CellType)
 *
 * @example
 * function displayValue(cv: CellValue): string {
 *   switch (cv.type) {
 *     case "string":  return cv.value;
 *     case "number":  return cv.value.toString();
 *     case "boolean": return cv.value ? "TRUE" : "FALSE";
 *     case "error":   return cv.value;
 *     case "date":    return cv.value.toISOString();
 *     case "empty":   return "";
 *   }
 * }
 */
export type CellValue =
  | StringCellValue
  | NumberCellValue
  | BooleanCellValue
  | ErrorCellValue
  | DateCellValue
  | EmptyCellValue;

// =============================================================================
// Cell Type
// =============================================================================

/**
 * Represents a single cell in a worksheet.
 *
 * Contains the cell's address, value, optional formula, and optional style.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.4 (c - Cell)
 */
export type Cell = {
  /** Cell address (location in the worksheet) */
  readonly address: CellAddress;
  /** Cell value (discriminated union) */
  readonly value: CellValue;
  /** Optional formula (ECMA-376 <f> element) */
  readonly formula?: Formula;
  /** Optional style index referencing cellXfs in styles.xml */
  readonly styleId?: StyleId;
};

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if a CellValue is a string value.
 */
export function isStringValue(value: CellValue): value is StringCellValue {
  return value.type === "string";
}

/**
 * Check if a CellValue is a number value.
 */
export function isNumberValue(value: CellValue): value is NumberCellValue {
  return value.type === "number";
}

/**
 * Check if a CellValue is a boolean value.
 */
export function isBooleanValue(value: CellValue): value is BooleanCellValue {
  return value.type === "boolean";
}

/**
 * Check if a CellValue is an error value.
 */
export function isErrorValue(value: CellValue): value is ErrorCellValue {
  return value.type === "error";
}

/**
 * Check if a CellValue is a date value.
 */
export function isDateValue(value: CellValue): value is DateCellValue {
  return value.type === "date";
}

/**
 * Check if a CellValue is empty.
 */
export function isEmptyValue(value: CellValue): value is EmptyCellValue {
  return value.type === "empty";
}

// =============================================================================
// CellValue Constructors
// =============================================================================

/** Create a string CellValue. */
export function stringValue(value: string): StringCellValue {
  return { type: "string", value };
}

/** Create a number CellValue. */
export function numberValue(value: number): NumberCellValue {
  return { type: "number", value };
}

/** Create a boolean CellValue. */
export function booleanValue(value: boolean): BooleanCellValue {
  return { type: "boolean", value };
}

/** Create an error CellValue. */
export function errorValue(value: ErrorValue): ErrorCellValue {
  return { type: "error", value };
}

/** Create a date CellValue. */
export function dateValue(value: Date): DateCellValue {
  return { type: "date", value };
}

/** The singleton empty CellValue. */
export const EMPTY_VALUE: EmptyCellValue = { type: "empty" };

// =============================================================================
// Cell Constructors
// =============================================================================

/**
 * Create a Cell at a given (col, row) position with a CellValue.
 *
 * @param col - 1-based column index
 * @param row - 1-based row index
 * @param value - Cell value
 * @param options - Optional formula and styleId
 */
export function createCell(
  col: number,
  row: number,
  value: CellValue,
  options?: { readonly formula?: Formula; readonly styleId?: StyleId },
): Cell {
  return {
    address: cellAddress(col, row),
    value,
    ...(options?.formula ? { formula: options.formula } : {}),
    ...(options?.styleId !== undefined ? { styleId: options.styleId } : {}),
  };
}

/** Shorthand: create a string Cell. */
export function stringCell(col: number, row: number, value: string): Cell {
  return { address: cellAddress(col, row), value: { type: "string", value } };
}

/** Shorthand: create a number Cell. */
export function numberCell(col: number, row: number, value: number): Cell {
  return { address: cellAddress(col, row), value: { type: "number", value } };
}

/** Shorthand: create a boolean Cell. */
export function booleanCell(col: number, row: number, value: boolean): Cell {
  return { address: cellAddress(col, row), value: { type: "boolean", value } };
}

/** Shorthand: create an empty Cell. */
export function emptyCell(col: number, row: number): Cell {
  return { address: cellAddress(col, row), value: EMPTY_VALUE };
}
