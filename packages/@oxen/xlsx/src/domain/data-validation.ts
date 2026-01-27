/**
 * @file SpreadsheetML data validation domain types
 *
 * Represents worksheet data validation rules (`<dataValidations>` / `<dataValidation>`).
 *
 * @see ECMA-376 Part 4, Section 18.3.1.32 (dataValidations)
 * @see ECMA-376 Part 4, Section 18.3.1.33 (dataValidation)
 */

import type { CellRange } from "./cell/address";

export type XlsxDataValidationErrorStyle = "stop" | "warning" | "information";

export type XlsxDataValidationType =
  | "none"
  | "whole"
  | "decimal"
  | "list"
  | "date"
  | "time"
  | "textLength"
  | "custom";

export type XlsxDataValidationOperator =
  | "between"
  | "notBetween"
  | "equal"
  | "notEqual"
  | "greaterThan"
  | "lessThan"
  | "greaterThanOrEqual"
  | "lessThanOrEqual";

/**
 * Worksheet data validation rule.
 *
 * Notes:
 * - The `sqref` field preserves the raw reference string as written in the file.
 * - `ranges` is the parsed representation of `sqref` (space-separated ranges).
 * - `formula1`/`formula2` are stored as raw strings; evaluation is handled elsewhere.
 */
export type XlsxDataValidation = {
  readonly type?: XlsxDataValidationType;
  readonly operator?: XlsxDataValidationOperator;
  readonly allowBlank?: boolean;
  readonly showInputMessage?: boolean;
  readonly showErrorMessage?: boolean;
  readonly showDropDown?: boolean;
  readonly errorStyle?: XlsxDataValidationErrorStyle;
  readonly promptTitle?: string;
  readonly prompt?: string;
  readonly errorTitle?: string;
  readonly error?: string;
  readonly sqref: string;
  readonly ranges: readonly CellRange[];
  readonly formula1?: string;
  readonly formula2?: string;
};

