/**
 * @file Cell display text (SpreadsheetML)
 *
 * Formats cell values (and formula results) for display using numFmtId + styles.numberFormats.
 *
 * NOTE: This is an MVP formatter. It intentionally supports a limited subset of Excel format codes.
 */

import type { CellAddress } from "../../xlsx/domain/cell/address";
import type { Cell, CellValue } from "../../xlsx/domain/cell/types";
import type { XlsxWorksheet } from "../../xlsx/domain/workbook";
import type { XlsxStyleSheet } from "../../xlsx/domain/style/types";
import type { XlsxDifferentialFormat } from "../../xlsx/domain/style/dxf";
import type { XlsxDateSystem } from "../../xlsx/domain/date-system";
import { resolveFormatCode } from "../../xlsx/domain/style/number-format";
import { formatNumberByCode } from "../../xlsx/domain/style/format-value";
import type { FormulaScalar } from "../../xlsx/formula/types";
import { isFormulaError, toDisplayText } from "../../xlsx/formula/types";
import { resolveCellXf } from "./cell-xf";

/**
 * Resolve the effective number format code for a cell.
 */
export function resolveCellFormatCode(params: {
  readonly styles: XlsxStyleSheet;
  readonly sheet: XlsxWorksheet;
  readonly address: CellAddress;
  readonly cell: Cell | undefined;
  readonly conditionalFormat?: XlsxDifferentialFormat;
}): string {
  const conditionalNumFmt = params.conditionalFormat?.numFmt?.formatCode;
  if (conditionalNumFmt) {
    return conditionalNumFmt;
  }
  const { styles, sheet, address, cell } = params;
  const { xf } = resolveCellXf({ styles, sheet, address, cell });
  return resolveFormatCode(xf.numFmtId as number, styles.numberFormats);
}

/**
 * Format a raw cell value for grid display given a resolved format code.
 */
export function formatCellValueForDisplay(value: CellValue, formatCode: string, options?: { readonly dateSystem?: XlsxDateSystem }): string {
  if (value.type === "empty") {
    return "";
  }
  if (value.type === "string") {
    return value.value;
  }
  if (value.type === "boolean") {
    return value.value ? "TRUE" : "FALSE";
  }
  if (value.type === "error") {
    return value.value;
  }
  if (value.type === "date") {
    // If caller wants date formatting for numeric serials, that should be supplied as number.
    return value.value.toISOString();
  }
  return formatNumberByCode(value.value, formatCode, options);
}

/**
 * Format a formula evaluation result for grid display given a resolved format code.
 */
export function formatFormulaScalarForDisplay(
  value: FormulaScalar,
  formatCode: string,
  options?: { readonly dateSystem?: XlsxDateSystem },
): string {
  if (value === null) {
    return "";
  }
  if (typeof value === "number") {
    return formatNumberByCode(value, formatCode, options);
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return toDisplayText(value);
  }
  if (isFormulaError(value)) {
    return value.value;
  }
  return "";
}
