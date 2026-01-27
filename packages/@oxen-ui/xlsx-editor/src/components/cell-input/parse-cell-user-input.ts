/**
 * @file parse-cell-user-input
 *
 * Converts user input text into either a CellValue commit or a formula commit.
 *
 * Notes:
 * - Formula evaluation is intentionally out of scope. We only store the formula string.
 * - A leading "=" indicates a formula *only if* it has a non-empty expression.
 */

import type { CellValue } from "@oxen/xlsx/domain/cell/types";

export type ParseCellUserInputResult =
  | { readonly type: "value"; readonly value: CellValue }
  | { readonly type: "formula"; readonly formula: string };

const NUMBER_LIKE = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;

function parseBooleanLiteral(trimmed: string): boolean | undefined {
  const upper = trimmed.toUpperCase();
  if (upper === "TRUE") {
    return true;
  }
  if (upper === "FALSE") {
    return false;
  }
  return undefined;
}

function parseNumberLiteral(trimmed: string): number | undefined {
  if (!NUMBER_LIKE.test(trimmed)) {
    return undefined;
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n)) {
    return undefined;
  }
  return n;
}

/**
 * Parse user-entered text into a value or formula commit.
 *
 * - Empty input becomes `CellValue(empty)`
 * - A leading `=` becomes a formula only when it has a non-empty expression
 * - `TRUE`/`FALSE` become boolean values
 * - Number-like inputs become numbers
 * - Otherwise the original (untrimmed) string is preserved
 */
export function parseCellUserInput(input: string): ParseCellUserInputResult {
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    return { type: "value", value: { type: "empty" } };
  }

  if (trimmed.startsWith("=")) {
    const expression = trimmed.slice(1).trim();
    if (expression.length > 0) {
      return { type: "formula", formula: expression };
    }
    return { type: "value", value: { type: "string", value: "=" } };
  }

  const bool = parseBooleanLiteral(trimmed);
  if (bool !== undefined) {
    return { type: "value", value: { type: "boolean", value: bool } };
  }

  const num = parseNumberLiteral(trimmed);
  if (num !== undefined) {
    return { type: "value", value: { type: "number", value: num } };
  }

  return { type: "value", value: { type: "string", value: input } };
}
