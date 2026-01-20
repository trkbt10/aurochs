/**
 * @file format-cell-edit-text
 */

import type { CellAddress } from "../../../xlsx/domain/cell/address";
import type { XlsxWorksheet } from "../../../xlsx/domain/workbook";
import { getCell } from "../../cell/query";

export function formatCellEditText(sheet: XlsxWorksheet, address: CellAddress): string {
  const cell = getCell(sheet, address);
  if (!cell) {
    return "";
  }
  if (cell.formula) {
    return `=${cell.formula}`;
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

