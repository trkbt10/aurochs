/**
 * @file Error handling helpers for information/error functions (ODF 1.3 §6.15).
 */

import type { ErrorValue } from "../../../domain/cell/types";

export type FormulaErrorCode = ErrorValue;

const ERROR_TYPE_NUMBER_MAP: Record<FormulaErrorCode, number> = {
  "#NULL!": 1,
  "#DIV/0!": 2,
  "#VALUE!": 3,
  "#REF!": 4,
  "#NAME?": 5,
  "#NUM!": 6,
  "#N/A": 7,
  "#GETTING_DATA": 8,
};

/**
 * Error type carrying an ECMA-376/Excel-style error code (e.g. `#DIV/0!`).
 *
 * The evaluator throws this to short-circuit computation while preserving the spreadsheet error
 * semantics; callers can map it back to a cell error value.
 */
export class FormulaError extends Error {
  constructor(readonly code: FormulaErrorCode, message?: string) {
    super(message ?? code);
    this.name = "FormulaError";
  }
}

export const createFormulaError = (code: FormulaErrorCode, message?: string): FormulaError => {
  return new FormulaError(code, message);
};

const messagePatterns: Array<{ pattern: RegExp; code: FormulaErrorCode }> = [
  { pattern: /#null!?/iu, code: "#NULL!" },
  { pattern: /#div[^a-z0-9]*0!?/iu, code: "#DIV/0!" },
  { pattern: /#value!?/iu, code: "#VALUE!" },
  { pattern: /#ref!?/iu, code: "#REF!" },
  { pattern: /#name\??/iu, code: "#NAME?" },
  { pattern: /#num!?/iu, code: "#NUM!" },
  { pattern: /#n\/a/iu, code: "#N/A" },
  { pattern: /#getting_data!?/iu, code: "#GETTING_DATA" },
  { pattern: /division by zero/iu, code: "#DIV/0!" },
  { pattern: /(could not find|not find|no (exact )?match|not available|not found)/iu, code: "#N/A" },
  { pattern: /(unknown function|not implemented|undefined)/iu, code: "#NAME?" },
  { pattern: /(unknown sheet)/iu, code: "#REF!" },
  { pattern: /(out of bounds|invalid cell|cross-sheet range|dependency)/iu, code: "#REF!" },
  { pattern: /(must be greater than zero|must be positive|negative|converge)/iu, code: "#NUM!" },
  { pattern: /(circular dependency)/iu, code: "#REF!" },
];

const normaliseMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return (error.message ?? "").trim();
  }
  if (error === null || error === undefined) {
    return "";
  }
  return String(error).trim();
};

export const getErrorCodeFromError = (error: unknown): FormulaErrorCode => {
  if (error instanceof FormulaError) {
    return error.code;
  }

  const message = normaliseMessage(error);
  if (message.length === 0) {
    return "#VALUE!";
  }

  for (const { pattern, code } of messagePatterns) {
    if (pattern.test(message)) {
      return code;
    }
  }

  return "#VALUE!";
};

export const getErrorTypeNumber = (code: FormulaErrorCode): number => {
  return ERROR_TYPE_NUMBER_MAP[code];
};

export const isNAError = (error: unknown): boolean => {
  return getErrorCodeFromError(error) === "#N/A";
};

export const isFormulaError = (error: unknown): error is FormulaError => {
  return error instanceof FormulaError;
};
