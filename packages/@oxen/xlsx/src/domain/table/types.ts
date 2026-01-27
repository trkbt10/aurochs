/**
 * @file SpreadsheetML table domain types
 *
 * Minimal domain model for SpreadsheetML tables (ListObject).
 * These are used for structured references such as `Table1[[A]:[B]]`.
 *
 * @see ECMA-376 Part 4, Section 18.5.1.2 (table)
 * @see ECMA-376 Part 4, Section 18.5.1.4 (tableColumn)
 */

import type { CellRange } from "../cell/address";

export type XlsxTableColumn = {
  /** Column ID (1-based within the table definition) */
  readonly id: number;
  /** Display name used in structured references */
  readonly name: string;
};

/**
 * Table style info (`tableStyleInfo`) applied to this table.
 *
 * @see ECMA-376 Part 4, Section 18.5.1.10 (tableStyleInfo)
 */
export type XlsxTableStyleInfo = {
  /** Style name (built-in or custom tableStyle) */
  readonly name: string;
  /** Emphasize the first column */
  readonly showFirstColumn?: boolean;
  /** Emphasize the last column */
  readonly showLastColumn?: boolean;
  /** Show banded rows */
  readonly showRowStripes?: boolean;
  /** Show banded columns */
  readonly showColumnStripes?: boolean;
};

export type XlsxTable = {
  /** Table identifier (table/@id) */
  readonly id: number;
  /** Table name (table/@name) */
  readonly name: string;
  /** Display name (table/@displayName) */
  readonly displayName?: string;
  /** The full table reference including headers/totals (table/@ref) */
  readonly ref: CellRange;
  /** Number of header rows (table/@headerRowCount, default 1) */
  readonly headerRowCount: number;
  /** Number of totals rows (table/@totalsRowCount, or derived from totalsRowShown) */
  readonly totalsRowCount: number;
  /** Sheet index the table belongs to (0-based, matches workbook.sheets order) */
  readonly sheetIndex: number;
  /** Table columns in order */
  readonly columns: readonly XlsxTableColumn[];
  /** Table style configuration (optional) */
  readonly styleInfo?: XlsxTableStyleInfo;
};
