/**
 * @file Formula Types for Excel Cell Formulas
 *
 * Defines types for representing formulas including normal formulas,
 * array formulas, shared formulas, and data table formulas.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.40 (Formula Element)
 * @see ECMA-376 Part 4, Section 18.18.6 (Formula Type)
 */

import type { CellRange } from "./address";

// =============================================================================
// Types
// =============================================================================

/**
 * The type of formula as defined in ECMA-376.
 *
 * - normal: Standard formula in a single cell
 * - array: Array formula (entered with Ctrl+Shift+Enter)
 * - dataTable: What-if data table formula
 * - shared: Shared formula (same formula used across multiple cells)
 */
export type FormulaType = "normal" | "array" | "dataTable" | "shared";

/**
 * A cell formula.
 *
 * Represents an Excel formula expression with its type and optional attributes.
 */
export type Formula = {
  /** The formula expression (e.g., "SUM(A1:A10)") */
  readonly expression: string;
  /** The type of formula */
  readonly type: FormulaType;
  /** Range for array or shared formulas */
  readonly ref?: CellRange;
  /** Shared formula index (si attribute) */
  readonly sharedIndex?: number;
  /** Calculate always flag (ca attribute) */
  readonly calculateAlways?: boolean;
};

/**
 * A data table formula.
 *
 * Data tables are used for what-if analysis, allowing calculation
 * of multiple results based on varying input values.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.40 (Formula Element - Data Table attributes)
 */
export type DataTableFormula = Formula & {
  readonly type: "dataTable";
  /** Whether this is a 2D data table (dt2D attribute) */
  readonly dt2D?: boolean;
  /** Whether row input is used (dtr attribute) */
  readonly dtr?: boolean;
  /** Row input cell reference (r1 attribute) */
  readonly r1?: string;
  /** Column input cell reference (r2 attribute) */
  readonly r2?: string;
};
