/**
 * @file PPTX Table Operation Adapter
 *
 * Implements TableOperationAdapter for PPTX Table type.
 * Delegates to mutation functions for structure operations.
 */

import type { Table, TableCell } from "@aurochs-office/pptx/domain/table/types";
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
} from "../../table/mutation";

/** Extract text from a PPTX TableCell's TextBody. */
function getCellText(cell: TableCell): string {
  if (!cell.textBody) {
    return "";
  }

  const texts: string[] = [];
  for (const para of cell.textBody.paragraphs) {
    for (const run of para.runs) {
      if (run.type === "text" && "text" in run) {
        texts.push(run.text);
      }
    }
  }
  return texts.join(" ");
}

/** Convert PPTX Table to AbstractTable for shared UI components. */
function toAbstract(table: Table): AbstractTable {
  return {
    rowCount: table.rows.length,
    colCount: table.grid.columns.length,
    columns: table.grid.columns.map((col) => ({ width: col.width })),
    rows: table.rows.map((row) => ({
      height: row.height,
      cells: row.cells.map((cell) => ({
        text: getCellText(cell),
        rowSpan: cell.properties.rowSpan,
        colSpan: cell.properties.colSpan,
      })),
    })),
  };
}

/** TableOperationAdapter implementation for PPTX Table. */
export const pptxTableOperationAdapter: TableOperationAdapter<Table> = {
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
