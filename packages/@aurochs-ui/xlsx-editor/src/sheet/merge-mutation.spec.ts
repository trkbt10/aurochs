/**
 * @file Merge cell mutation tests
 */

import { colIdx, rowIdx } from "@aurochs-office/xlsx/domain/types";
import type { Cell } from "@aurochs-office/xlsx/domain/cell/types";
import type { CellAddress, CellRange } from "@aurochs-office/xlsx/domain/cell/address";
import type { XlsxRow, XlsxWorksheet } from "@aurochs-office/xlsx/domain/workbook";
import { getCell } from "../cell/query";
import { mergeCells, unmergeCells } from "./merge-mutation";

function addr(col: number, row: number): CellAddress {
  return { col: colIdx(col), row: rowIdx(row), colAbsolute: false, rowAbsolute: false };
}

function range({
  startCol,
  startRow,
  endCol,
  endRow,
}: {
  startCol: number;
  startRow: number;
  endCol: number;
  endRow: number;
}): CellRange {
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

describe("xlsx-editor/sheet/merge-mutation", () => {
  it("mergeCells adds a normalized merge range and clears non-origin contents", () => {
    const worksheet = createWorksheet([
      { address: addr(1, 1), value: { type: "string", value: "A1" } },
      { address: addr(2, 1), value: { type: "string", value: "B1" } },
      { address: addr(1, 2), value: { type: "empty" }, formula: { type: "normal", expression: "1+1" } },
    ]);

    const merged = mergeCells(worksheet, range({ startCol: 2, startRow: 2, endCol: 1, endRow: 1 }));

    expect(merged.mergeCells).toEqual([range({ startCol: 1, startRow: 1, endCol: 2, endRow: 2 })]);
    expect(getCell(merged, addr(1, 1))?.value).toEqual({ type: "string", value: "A1" });
    expect(getCell(merged, addr(2, 1))?.value).toEqual({ type: "empty" });
    expect(getCell(merged, addr(1, 2))?.value).toEqual({ type: "empty" });
    expect(getCell(merged, addr(1, 2))?.formula).toBeUndefined();
  });

  it("mergeCells removes intersecting existing merges before adding the new one", () => {
    const worksheet = createWorksheet([], {
      mergeCells: [
        range({ startCol: 1, startRow: 1, endCol: 2, endRow: 2 }),
        range({ startCol: 5, startRow: 5, endCol: 6, endRow: 6 }),
      ],
    });

    const merged = mergeCells(worksheet, range({ startCol: 2, startRow: 2, endCol: 3, endRow: 3 }));

    expect(merged.mergeCells).toEqual([
      range({ startCol: 5, startRow: 5, endCol: 6, endRow: 6 }),
      range({ startCol: 2, startRow: 2, endCol: 3, endRow: 3 }),
    ]);
  });

  it("unmergeCells removes merges that intersect the target range", () => {
    const worksheet = createWorksheet([], {
      mergeCells: [
        range({ startCol: 1, startRow: 1, endCol: 2, endRow: 2 }),
        range({ startCol: 5, startRow: 5, endCol: 6, endRow: 6 }),
      ],
    });

    const unmerged = unmergeCells(worksheet, range({ startCol: 2, startRow: 2, endCol: 3, endRow: 3 }));

    expect(unmerged.mergeCells).toEqual([range({ startCol: 5, startRow: 5, endCol: 6, endRow: 6 })]);
  });
});
