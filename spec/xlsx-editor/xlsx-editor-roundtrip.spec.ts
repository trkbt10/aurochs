/**
 * @file XLSX editor roundtrip regression test (POI fixture)
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseXlsxWorkbook } from "@oxen-office/xlsx/parser";
import { exportXlsx } from "@oxen-builder/xlsx/exporter";
import { colIdx, rowIdx } from "@oxen-office/xlsx/domain/types";
import type { CellAddress } from "@oxen-office/xlsx/domain/cell/address";
import type { XlsxWorkbook } from "@oxen-office/xlsx/domain/workbook";
import { getCellValue } from "@oxen-ui/xlsx-editor/cell/query";
import { createInitialState, xlsxEditorReducer } from "@oxen-ui/xlsx-editor";
import { createGetZipTextFileContentFromBytes } from "@oxen-office/opc";

function createAddress(col: number, row: number): CellAddress {
  return { col: colIdx(col), row: rowIdx(row), colAbsolute: false, rowAbsolute: false };
}

async function parseWorkbookFromBytes(bytes: ArrayBuffer | Uint8Array): Promise<XlsxWorkbook> {
  const getFileContent = await createGetZipTextFileContentFromBytes(bytes);
  return parseXlsxWorkbook(getFileContent);
}

describe("xlsx-editor roundtrip (fixtures)", () => {
  it("loads a fixture, edits a cell, exports, and reparses", async () => {
    const fixturePath = path.join(
      process.cwd(),
      "fixtures/poi-test-data/test-data/spreadsheet/1_NoIden.xlsx",
	  );
    const bytes = await readFile(fixturePath);

    const workbook = await parseWorkbookFromBytes(bytes);
    const initialState = createInitialState(workbook);

    const address = createAddress(1, 1);
    const state = xlsxEditorReducer(initialState, {
      type: "UPDATE_CELL",
      address,
      value: { type: "string", value: "XLSX-EDITOR-ROUNDTRIP" },
    });

    const exported = await exportXlsx(state.workbookHistory.present);
    const reparsed = await parseWorkbookFromBytes(exported);

    const sheet = reparsed.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }
    const v = getCellValue(sheet, address);
    expect(v).toEqual({ type: "string", value: "XLSX-EDITOR-ROUNDTRIP" });
  });
});
