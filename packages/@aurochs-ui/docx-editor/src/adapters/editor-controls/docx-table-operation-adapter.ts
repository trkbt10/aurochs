/**
 * @file DOCX Table Operation Adapter
 *
 * Implements TableOperationAdapter for DocxTable type.
 * Delegates to existing mutation.ts functions.
 */

import type { DocxTable } from "@aurochs-office/docx/domain/table";
import type { DocxParagraph } from "@aurochs-office/docx/domain/paragraph";
import type { TableOperationAdapter, AbstractTable } from "@aurochs-ui/editor-core/table-operations";
import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";
import { twips } from "@aurochs-office/docx/domain/types";
import {
  insertRow,
  removeRow,
  insertColumn,
  removeColumn,
  setColumnWidth as docxSetColumnWidth,
  mergeCellsHorizontally,
  mergeCellsVertically,
  getColumnCount,
} from "../../table/mutation";

/** Extract plain text from DOCX cell content. */
function getCellText(content: readonly (DocxParagraph | DocxTable)[]): string {
  const texts: string[] = [];
  for (const block of content) {
    if (block.type === "paragraph") {
      for (const item of block.content) {
        if (item.type === "run") {
          for (const child of item.content) {
            if (child.type === "text" && "value" in child) {
              texts.push(child.value);
            }
          }
        }
      }
    }
  }
  return texts.join(" ");
}

/** Convert DocxTable to AbstractTable for shared UI components. */
function toAbstract(table: DocxTable): AbstractTable {
  const colCount = getColumnCount(table);

  return {
    rowCount: table.rows.length,
    colCount,
    columns: (table.grid?.columns ?? []).map((col) => ({ width: col.width })),
    rows: table.rows.map((row) => ({
      // trHeight.val is branded Twips — cast to number for generic UI
      height: (row.properties?.trHeight?.val as number) ?? 30,
      cells: row.cells.map((cell) => ({
        text: getCellText(cell.content),
        // GridSpan is a branded number, not an object with .val
        colSpan: cell.properties?.gridSpan as number | undefined,
      })),
    })),
  };
}

/** Set row height (DOCX uses trHeight in row properties, value in Twips). */
function setRowHeight(table: DocxTable, rowIndex: number, height: number): DocxTable {
  if (rowIndex < 0 || rowIndex >= table.rows.length) {
    return table;
  }

  return {
    ...table,
    rows: table.rows.map((row, i) => {
      if (i !== rowIndex) { return row; }
      return {
        ...row,
        properties: {
          ...row.properties,
          trHeight: { val: twips(height), hRule: "atLeast" as const },
        },
      };
    }),
  };
}

/** Merge cells in the given range (uses both horizontal and vertical merge). */
function mergeCells(table: DocxTable, range: { startRow: number; startCol: number; endRow: number; endCol: number }): DocxTable {
  const { startRow, startCol, endRow, endCol } = range;
  // eslint-disable-next-line no-restricted-syntax -- accumulator pattern
  let result = table;

  // Horizontal merge on each row
  if (startCol < endCol) {
    for (let ri = startRow; ri <= endRow; ri++) {
      result = mergeCellsHorizontally({ table: result, rowIndex: ri, startCol, endCol });
    }
  }

  // Vertical merge on each column
  if (startRow < endRow) {
    const actualEndCol = Math.min(endCol, startCol); // After horizontal merge, columns have been collapsed
    for (let ci = startCol; ci <= actualEndCol; ci++) {
      result = mergeCellsVertically({ table: result, colIndex: ci, startRow, endRow });
    }
  }

  return result;
}

/** Split a cell by removing merge properties. */
function splitCell(table: DocxTable, row: number, col: number): DocxTable {
  const cell = table.rows[row]?.cells[col];
  if (!cell) { return table; }

  return {
    ...table,
    rows: table.rows.map((r, ri) => {
      if (ri !== row) { return r; }
      return {
        ...r,
        cells: r.cells.map((c, ci) => {
          if (ci !== col) { return c; }
          const { gridSpan: _gs, vMerge: _vm, hMerge: _hm, ...restProps } = c.properties ?? {};
          return {
            ...c,
            properties: Object.keys(restProps).length > 0 ? restProps : undefined,
          };
        }),
      };
    }),
  };
}

/** TableOperationAdapter implementation for DocxTable. */
export const docxTableOperationAdapter: TableOperationAdapter<DocxTable> = {
  toAbstract,
  insertRow: (table, rowIndex) => insertRow(table, rowIndex),
  removeRow: (table, rowIndex) => removeRow(table, rowIndex),
  insertColumn: (table, colIndex) => insertColumn(table, colIndex),
  removeColumn: (table, colIndex) => removeColumn(table, colIndex),
  setColumnWidth: (table, colIndex, width) => docxSetColumnWidth(table, colIndex, width as Pixels),
  setRowHeight,
  mergeCells,
  splitCell,
};
