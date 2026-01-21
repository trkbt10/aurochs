/**
 * @file XlsxSheetGridCellsLayer tests
 */

// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import type { XlsxWorkbook, XlsxWorksheet } from "../../../xlsx/domain/workbook";
import { createDefaultStyleSheet } from "../../../xlsx/domain/style/types";
import { colIdx, rowIdx } from "../../../xlsx/domain/types";
import { createSheetLayout } from "../../selectors/sheet-layout";
import { createFormulaEvaluator } from "../../../xlsx/formula/evaluator";
import type { XlsxEditorAction } from "../../context/workbook/editor/types";
import { XlsxSheetGridCellsLayer } from "./cells-layer";

describe("xlsx-editor/components/sheet-grid/cells-layer", () => {
  it("renders cell text in the visible range", () => {
    const sheet: XlsxWorksheet = {
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
      sheets: [sheet],
      styles: createDefaultStyleSheet(),
      sharedStrings: [],
    };
    const formulaEvaluator = createFormulaEvaluator(workbook);
    const layout = createSheetLayout(sheet, { rowCount: 10, colCount: 10, defaultRowHeightPx: 20, defaultColWidthPx: 50 });
    const dispatch = (action: XlsxEditorAction): void => {
      void action;
    };

    render(
      <div style={{ position: "relative", width: 200, height: 100 }}>
        <XlsxSheetGridCellsLayer
          sheetIndex={0}
          sheet={sheet}
          styles={workbook.styles}
          layout={layout}
          metrics={{ rowCount: 10, colCount: 10 }}
          rowRange={{ start: 0, end: 0 }}
          colRange={{ start: 0, end: 0 }}
          scrollTop={0}
          scrollLeft={0}
          normalizedMerges={[]}
          dispatch={dispatch}
          focusGridRoot={() => undefined}
          formulaEvaluator={formulaEvaluator}
        />
      </div>,
    );

    expect(screen.getByText("Hello")).toBeDefined();
  });
});
