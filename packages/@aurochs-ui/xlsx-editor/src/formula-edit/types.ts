/**
 * @file Formula editing types
 *
 * Types for the real-time formula analysis system. These are derived state types
 * computed from `CellEditingState.text` and `CellEditingState.caretOffset` —
 * they are never stored in the reducer.
 */

import type { CellRange } from "@aurochs-office/xlsx/domain/cell/address";
import type { FormulaAstNode } from "@aurochs-office/xlsx/formula/ast";

/**
 * A token within the formula text, with precise character offsets.
 *
 * Offsets are relative to the full editing text (including the leading "=").
 */
export type FormulaTextToken = {
  readonly type:
    | "reference"
    | "function"
    | "operator"
    | "literal"
    | "string"
    | "paren"
    | "comma"
    | "error"
    | "whitespace"
    | "colon"
    | "semicolon"
    | "bracket";
  readonly text: string;
  readonly startOffset: number;
  readonly endOffset: number;
};

/**
 * A resolved cell/range reference within the formula, enriched with color assignment.
 *
 * Offsets are relative to the full editing text (including the leading "=").
 */
export type FormulaReferenceToken = {
  readonly range: CellRange;
  readonly sheetName: string | undefined;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly colorIndex: number;
};

/**
 * Complete analysis of a formula being edited.
 *
 * Produced by `analyzeFormula()` and consumed by:
 * - Formula bar syntax coloring
 * - Cell viewport reference highlight overlays
 * - Autocomplete (via `activeFunctionName`)
 */
export type FormulaAnalysis = {
  /** Parsed AST (undefined if formula has syntax errors) */
  readonly ast: FormulaAstNode | undefined;
  /** Resolved references with assigned highlight colors */
  readonly references: readonly FormulaReferenceToken[];
  /** All tokens in the formula text */
  readonly tokens: readonly FormulaTextToken[];
  /** Whether the formula parses without error */
  readonly isValid: boolean;
  /** Name of the function whose argument list the caret is inside */
  readonly activeFunctionName: string | undefined;
  /** 0-based argument index within the active function */
  readonly activeFunctionArgIndex: number | undefined;
};
