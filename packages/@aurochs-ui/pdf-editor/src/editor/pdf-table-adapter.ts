/**
 * @file PDF Table Operation Adapter
 *
 * Implements TableOperationAdapter for PdfTable type.
 * Table mutations delegate to @aurochs/pdf domain (SoT).
 */

import type { PdfTable } from "@aurochs/pdf/domain";
import type { TableOperationAdapter, AbstractTable } from "@aurochs-ui/editor-core/table-operations";
import {
  insertRow,
  removeRow,
  insertColumn,
  removeColumn,
  setColumnWidth,
  setRowHeight,
  mergeCells,
  splitCell,
} from "@aurochs/pdf";

/** Convert PdfTable to AbstractTable for shared UI components. */
function toAbstract(table: PdfTable): AbstractTable {
  return {
    rowCount: table.rows.length,
    colCount: table.columns.length,
    columns: table.columns.map((col) => ({ width: col.width })),
    rows: table.rows.map((row) => ({
      height: row.height,
      cells: row.cells.map((cell) => ({
        text: cell.text,
        rowSpan: cell.rowSpan,
        colSpan: cell.colSpan,
      })),
    })),
  };
}

/** TableOperationAdapter implementation for PdfTable. */
export const pdfTableOperationAdapter: TableOperationAdapter<PdfTable> = {
  toAbstract,
  insertRow,
  removeRow,
  insertColumn,
  removeColumn,
  setColumnWidth,
  setRowHeight,
  mergeCells,
  splitCell,
};
