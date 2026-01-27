/**
 * @file format-cell-edit-text
 */

import type { CellAddress } from "@oxen/xlsx/domain/cell/address";
import type { XlsxWorksheet } from "@oxen/xlsx/domain/workbook";
import { getCell } from "../../cell/query";

/**
 * Build the initial edit text for a cell editor input.
 *
 * - Formulas are returned with a leading "=" to match spreadsheet UX.
 * - Non-formula values are converted to a plain string representation.
 */
export function formatCellEditText(sheet: XlsxWorksheet, address: CellAddress): string {
  const cell = getCell(sheet, address);
  if (!cell) {
    return "";
  }
  if (cell.formula) {
    return `=${cell.formula.expression}`;
  }
  switch (cell.value.type) {
    case "string":
      return cell.value.value;
    case "number":
      return String(cell.value.value);
    case "boolean":
      return cell.value.value ? "TRUE" : "FALSE";
    case "error":
      return cell.value.value;
    case "date":
      return cell.value.value.toISOString();
    case "empty":
      return "";
  }
}
