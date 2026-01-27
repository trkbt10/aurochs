/**
 * @file Conditional formatting domain types
 *
 * Defines SpreadsheetML conditional formatting structures on a worksheet.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.18 (conditionalFormatting)
 * @see ECMA-376 Part 4, Section 18.3.1.10 (cfRule)
 */

import type { CellRange } from "./cell/address";

export type XlsxConditionalFormattingRule = {
  readonly type: string;
  readonly dxfId?: number;
  readonly priority?: number;
  readonly operator?: string;
  readonly stopIfTrue?: boolean;
  readonly formulas: readonly string[];
};

export type XlsxConditionalFormatting = {
  readonly sqref: string;
  readonly ranges: readonly CellRange[];
  readonly rules: readonly XlsxConditionalFormattingRule[];
};

