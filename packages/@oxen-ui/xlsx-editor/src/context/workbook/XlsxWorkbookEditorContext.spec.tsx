/**
 * @file XlsxWorkbookEditorContext tests
 */

// @vitest-environment jsdom

import { render, screen, renderHook } from "@testing-library/react";
import type { XlsxWorkbook } from "@oxen/xlsx/domain/workbook";
import { colIdx, rowIdx } from "@oxen/xlsx/domain/types";
import { createDefaultStyleSheet } from "@oxen/xlsx/domain/style/types";
import type { CellAddress } from "@oxen/xlsx/domain/cell/address";
import {
  XlsxWorkbookEditorProvider,
  useXlsxWorkbookEditor,
  useXlsxWorkbookEditorOptional,
} from "./XlsxWorkbookEditorContext";

function createAddress(col: number, row: number): CellAddress {
  return {
    col: colIdx(col),
    row: rowIdx(row),
    colAbsolute: false,
    rowAbsolute: false,
  };
}

function createEmptyWorkbook(): XlsxWorkbook {
  return {
    dateSystem: "1900",
    sheets: [
      {
        dateSystem: "1900",
        name: "Sheet1",
        sheetId: 1,
        state: "visible",
        rows: [],
        xmlPath: "xl/worksheets/sheet1.xml",
      },
    ],
    styles: createDefaultStyleSheet(),
    sharedStrings: [],
  };
}

function createWorkbookWithOneCell(): XlsxWorkbook {
  return {
    dateSystem: "1900",
    sheets: [
      {
        dateSystem: "1900",
        name: "Sheet1",
        sheetId: 1,
        state: "visible",
        rows: [
          {
            rowNumber: rowIdx(1),
            cells: [
              {
                address: createAddress(1, 1),
                value: { type: "string", value: "Hello" },
              },
            ],
          },
        ],
        xmlPath: "xl/worksheets/sheet1.xml",
      },
    ],
    styles: createDefaultStyleSheet(),
    sharedStrings: [],
  };
}

describe("XlsxWorkbookEditorContext", () => {
  it("provides workbook and active sheet", () => {
    const workbook = createWorkbookWithOneCell();

    function Test() {
      const { workbook: wb, activeSheet, activeSheetIndex } = useXlsxWorkbookEditor();
      return (
        <div>
          <div data-testid="sheetCount">{wb.sheets.length}</div>
          <div data-testid="activeSheetIndex">{String(activeSheetIndex)}</div>
          <div data-testid="activeSheetName">{activeSheet?.name ?? "none"}</div>
        </div>
      );
    }

    render(
      <XlsxWorkbookEditorProvider initialWorkbook={workbook}>
        <Test />
      </XlsxWorkbookEditorProvider>,
    );

    expect(screen.getByTestId("sheetCount").textContent).toBe("1");
    expect(screen.getByTestId("activeSheetIndex").textContent).toBe("0");
    expect(screen.getByTestId("activeSheetName").textContent).toBe("Sheet1");
  });

  it("provides canUndo/canRedo false initially", () => {
    const workbook = createEmptyWorkbook();

    function Test() {
      const { canUndo, canRedo } = useXlsxWorkbookEditor();
      return (
        <div>
          <div data-testid="canUndo">{String(canUndo)}</div>
          <div data-testid="canRedo">{String(canRedo)}</div>
        </div>
      );
    }

    render(
      <XlsxWorkbookEditorProvider initialWorkbook={workbook}>
        <Test />
      </XlsxWorkbookEditorProvider>,
    );

    expect(screen.getByTestId("canUndo").textContent).toBe("false");
    expect(screen.getByTestId("canRedo").textContent).toBe("false");
  });

  it("throws when useXlsxWorkbookEditor is used outside provider", () => {
    expect(() => {
      renderHook(() => useXlsxWorkbookEditor());
    }).toThrow("useXlsxWorkbookEditor must be used within XlsxWorkbookEditorProvider");
  });

  it("returns null when useXlsxWorkbookEditorOptional is used outside provider", () => {
    const { result } = renderHook(() => useXlsxWorkbookEditorOptional());
    expect(result.current).toBeNull();
  });
});
