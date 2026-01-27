/**
 * @file Cell style mutation tests
 */

import { EXCEL_MAX_COLS, EXCEL_MAX_ROWS } from "@oxen/xlsx/domain/constants";
import { colIdx, rowIdx, styleId } from "@oxen/xlsx/domain/types";
import type { Cell, CellValue } from "@oxen/xlsx/domain/cell/types";
import type { CellAddress, CellRange } from "@oxen/xlsx/domain/cell/address";
import type { XlsxRow, XlsxWorksheet } from "@oxen/xlsx/domain/workbook";
import { getCell } from "./query";
import { applyStyleToRange } from "./style-mutation";

function addr(col: number, row: number): CellAddress {
  return { col: colIdx(col), row: rowIdx(row), colAbsolute: false, rowAbsolute: false };
}

function range(startCol: number, startRow: number, endCol: number, endRow: number): CellRange {
  return { start: addr(startCol, startRow), end: addr(endCol, endRow) };
}

function createWorksheet(cells: readonly Cell[], opts?: Partial<XlsxWorksheet>): XlsxWorksheet {
  const dateSystem = opts?.dateSystem ?? "1900";
  const resolvedOpts = opts ? { ...opts, dateSystem } : undefined;
  const rowsByNumber = new Map<number, Cell[]>();
  for (const cell of cells) {
    const rowNumber = cell.address.row as number;
    const existing = rowsByNumber.get(rowNumber);
    if (existing) {
      existing.push(cell);
    } else {
      rowsByNumber.set(rowNumber, [cell]);
    }
  }

  const rows: XlsxRow[] = [...rowsByNumber.entries()]
    .sort(([a], [b]) => a - b)
    .map(([rowNumber, rowCells]) => ({
      rowNumber: rowIdx(rowNumber),
      cells: [...rowCells].sort((a, b) => (a.address.col as number) - (b.address.col as number)),
    }));

  return {
    dateSystem,
    name: "Sheet1",
    sheetId: 1,
    state: "visible",
    xmlPath: "xl/worksheets/sheet1.xml",
    rows,
    ...resolvedOpts,
  };
}

function cellAt(
  col: number,
  row: number,
  value: CellValue,
  opts?: { readonly styleId?: number },
): Cell {
  return {
    address: addr(col, row),
    value,
    ...(opts?.styleId !== undefined ? { styleId: styleId(opts.styleId) } : {}),
  };
}

describe("xlsx-editor/cell/style-mutation", () => {
  it("materializes missing cells and applies styleId in a normal range", () => {
    const worksheet = createWorksheet([
      cellAt(1, 1, { type: "string", value: "A1" }),
    ]);

    const updated = applyStyleToRange(worksheet, range(1, 1, 2, 2), styleId(7));

    expect(getCell(updated, addr(1, 1))).toEqual({
      address: addr(1, 1),
      value: { type: "string", value: "A1" },
      styleId: styleId(7),
    });
    expect(getCell(updated, addr(2, 1))).toEqual({
      address: addr(2, 1),
      value: { type: "empty" },
      styleId: styleId(7),
    });
    expect(getCell(updated, addr(1, 2))).toEqual({
      address: addr(1, 2),
      value: { type: "empty" },
      styleId: styleId(7),
    });
    expect(getCell(updated, addr(2, 2))).toEqual({
      address: addr(2, 2),
      value: { type: "empty" },
      styleId: styleId(7),
    });
  });

  it("treats styleId(0) as clearing cell styles without materializing missing cells", () => {
    const worksheet = createWorksheet([
      cellAt(1, 1, { type: "string", value: "A1" }, { styleId: 3 }),
    ]);

    const updated = applyStyleToRange(worksheet, range(1, 1, 2, 2), styleId(0));

    expect(getCell(updated, addr(1, 1))).toEqual({
      address: addr(1, 1),
      value: { type: "string", value: "A1" },
    });
    expect(getCell(updated, addr(2, 2))).toBeUndefined();
  });

  it("applies styleId to whole-column selections via worksheet.columns", () => {
    const worksheet = createWorksheet(
      [],
      {
        columns: [{ min: colIdx(2), max: colIdx(2), width: 12 }],
      },
    );

    const updated = applyStyleToRange(
      worksheet,
      range(2, 1, 3, EXCEL_MAX_ROWS),
      styleId(5),
    );

    expect(updated.columns).toEqual([
      { min: colIdx(2), max: colIdx(2), width: 12, styleId: styleId(5) },
      { min: colIdx(3), max: colIdx(3), styleId: styleId(5) },
    ]);
    expect(updated.rows).toBe(worksheet.rows);
  });

  it("applies styleId to whole-row selections via row.styleId", () => {
    const worksheet = createWorksheet([]);

    const updated = applyStyleToRange(
      worksheet,
      range(1, 10, EXCEL_MAX_COLS, 10),
      styleId(9),
    );

    expect(updated.rows).toEqual([{ rowNumber: rowIdx(10), cells: [], styleId: styleId(9) }]);
  });
});
