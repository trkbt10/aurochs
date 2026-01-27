/**
 * @file XlsxSheetGridCellsLayer tests
 */

// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import type { XlsxWorkbook, XlsxWorksheet } from "@oxen/xlsx/domain/workbook";
import { createDefaultStyleSheet } from "@oxen/xlsx/domain/style/types";
import { colIdx, rowIdx } from "@oxen/xlsx/domain/types";
import { createSheetLayout } from "../../selectors/sheet-layout";
import { createFormulaEvaluator } from "@oxen/xlsx/formula/evaluator";
import { XlsxSheetGridCellsLayer } from "./cells-layer";

describe("xlsx-editor/components/sheet-grid/cells-layer", () => {
  it("renders cell text in the visible range", () => {
    const sheet: XlsxWorksheet = {
      dateSystem: "1900",
      name: "Sheet1",
      sheetId: 1,
      state: "visible",
      rows: [
        {
          rowNumber: rowIdx(1),
          cells: [{ address: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false }, value: { type: "string", value: "Hello" } }],
        },
      ],
      xmlPath: "xl/worksheets/sheet1.xml",
    };
    const workbook: XlsxWorkbook = {
      dateSystem: "1900",
      sheets: [sheet],
      styles: createDefaultStyleSheet(),
      sharedStrings: [],
    };
    const formulaEvaluator = createFormulaEvaluator(workbook);
    const layout = createSheetLayout(sheet, { rowCount: 10, colCount: 10, defaultRowHeightPx: 20, defaultColWidthPx: 50 });

    render(
      <div style={{ position: "relative", width: 200, height: 100 }}>
        <XlsxSheetGridCellsLayer
          sheetIndex={0}
          sheet={sheet}
          styles={workbook.styles}
          layout={layout}
          rowRange={{ start: 0, end: 0 }}
          colRange={{ start: 0, end: 0 }}
          scrollTop={0}
          scrollLeft={0}
          normalizedMerges={[]}
          formulaEvaluator={formulaEvaluator}
        />
      </div>,
    );

    expect(screen.getByText("Hello")).toBeDefined();
  });

  it("renders very long text via canvas without inserting the full string into the DOM", () => {
    const long = "A".repeat(25_000);
    const sheet: XlsxWorksheet = {
      dateSystem: "1900",
      name: "Sheet1",
      sheetId: 1,
      state: "visible",
      rows: [
        {
          rowNumber: rowIdx(1),
          cells: [{ address: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false }, value: { type: "string", value: long } }],
        },
      ],
      xmlPath: "xl/worksheets/sheet1.xml",
    };
    const workbook: XlsxWorkbook = {
      dateSystem: "1900",
      sheets: [sheet],
      styles: createDefaultStyleSheet(),
      sharedStrings: [],
    };
    const formulaEvaluator = createFormulaEvaluator(workbook);
    const layout = createSheetLayout(sheet, { rowCount: 10, colCount: 10, defaultRowHeightPx: 20, defaultColWidthPx: 50 });

    render(
      <div style={{ position: "relative", width: 200, height: 100 }}>
        <XlsxSheetGridCellsLayer
          sheetIndex={0}
          sheet={sheet}
          styles={workbook.styles}
          layout={layout}
          rowRange={{ start: 0, end: 0 }}
          colRange={{ start: 0, end: 0 }}
          scrollTop={0}
          scrollLeft={0}
          normalizedMerges={[]}
          formulaEvaluator={formulaEvaluator}
        />
      </div>,
    );

    expect(screen.getByTestId("xlsx-cell-canvas-text")).toBeDefined();
    expect(screen.queryByText(long)).toBeNull();
  });
});
