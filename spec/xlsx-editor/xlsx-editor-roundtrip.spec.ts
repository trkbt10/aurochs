import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseXlsxWorkbook } from "../../src/xlsx/parser";
import { exportXlsx } from "../../src/xlsx/exporter";
import { colIdx, rowIdx } from "../../src/xlsx/domain/types";
import type { CellAddress } from "../../src/xlsx/domain/cell/address";
import type { XlsxWorkbook } from "../../src/xlsx/domain/workbook";
import { getCellValue } from "../../src/xlsx-editor/cell/query";
import { createInitialState, xlsxEditorReducer } from "../../src/xlsx-editor/context/workbook/editor/reducer";
import { createGetZipTextFileContentFromBytes } from "../../src/files/ooxml-zip";

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
    let state = createInitialState(workbook);

    const address = createAddress(1, 1);
    state = xlsxEditorReducer(state, {
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
