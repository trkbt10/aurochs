/**
 * @file XlsxSheetGridCellViewport tests
 */

// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import type { XlsxWorkbook, XlsxWorksheet } from "@oxen/xlsx/domain/workbook";
import { createDefaultStyleSheet } from "@oxen/xlsx/domain/style/types";
import { colIdx, rowIdx } from "@oxen/xlsx/domain/types";
import { createSheetLayout } from "../../selectors/sheet-layout";
import type { XlsxEditorAction } from "../../context/workbook/editor/types";
import { XlsxSheetGridCellViewport } from "./cell-viewport";

describe("xlsx-editor/components/sheet-grid/cell-viewport", () => {
  it("shows gridlines by default when sheetView is omitted", () => {
    const sheet: XlsxWorksheet = {
      dateSystem: "1900",
      name: "Sheet1",
      sheetId: 1,
      state: "visible",
      rows: [],
      xmlPath: "xl/worksheets/sheet1.xml",
    };
    const workbook: XlsxWorkbook = {
      dateSystem: "1900",
      sheets: [sheet],
      styles: createDefaultStyleSheet(),
      sharedStrings: [],
    };
    const layout = createSheetLayout(sheet, { rowCount: 10, colCount: 10, defaultRowHeightPx: 20, defaultColWidthPx: 50 });
    const dispatch = (action: XlsxEditorAction): void => {
      void action;
    };

    render(
      <div style={{ position: "relative", width: 320, height: 200 }}>
        <XlsxSheetGridCellViewport
          sheet={sheet}
          workbookStyles={workbook.styles}
          layout={layout}
          metrics={{ rowCount: 10, colCount: 10, rowHeaderWidthPx: 56, colHeaderHeightPx: 22 }}
          rowRange={{ start: 0, end: 2 }}
          colRange={{ start: 0, end: 2 }}
          scrollTop={0}
          scrollLeft={0}
          viewportWidth={320}
          viewportHeight={200}
          zoom={1}
          focusGridRoot={() => undefined}
          selection={{ selectedRanges: [], activeRange: undefined, activeCell: undefined }}
          state={{ editingCell: undefined }}
          activeSheetIndex={0}
          normalizedMerges={[]}
          dispatch={dispatch}
        >
          <div data-testid="cells" />
        </XlsxSheetGridCellViewport>
      </div>,
    );

    expect(screen.getByTestId("xlsx-gridlines")).toBeDefined();
    expect(screen.getByTestId("cells")).toBeDefined();
  });

  it("renders selection overlays for multi-range selections", () => {
    const sheet: XlsxWorksheet = {
      dateSystem: "1900",
      name: "Sheet1",
      sheetId: 1,
      state: "visible",
      rows: [],
      xmlPath: "xl/worksheets/sheet1.xml",
    };
    const workbook: XlsxWorkbook = {
      dateSystem: "1900",
      sheets: [sheet],
      styles: createDefaultStyleSheet(),
      sharedStrings: [],
    };
    const layout = createSheetLayout(sheet, { rowCount: 10, colCount: 10, defaultRowHeightPx: 20, defaultColWidthPx: 50 });
    const dispatch = (action: XlsxEditorAction): void => {
      void action;
    };

    render(
      <div style={{ position: "relative", width: 320, height: 200 }}>
        <XlsxSheetGridCellViewport
          sheet={sheet}
          workbookStyles={workbook.styles}
          layout={layout}
          metrics={{ rowCount: 10, colCount: 10, rowHeaderWidthPx: 56, colHeaderHeightPx: 22 }}
          rowRange={{ start: 0, end: 2 }}
          colRange={{ start: 0, end: 2 }}
          scrollTop={0}
          scrollLeft={0}
          viewportWidth={320}
          viewportHeight={200}
          zoom={1}
          focusGridRoot={() => undefined}
          selection={{
            selectedRanges: [
              {
                start: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
                end: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
              },
              {
                start: { col: colIdx(3), row: rowIdx(3), colAbsolute: false, rowAbsolute: false },
                end: { col: colIdx(4), row: rowIdx(4), colAbsolute: false, rowAbsolute: false },
              },
            ],
            activeRange: {
              start: { col: colIdx(3), row: rowIdx(3), colAbsolute: false, rowAbsolute: false },
              end: { col: colIdx(4), row: rowIdx(4), colAbsolute: false, rowAbsolute: false },
            },
            activeCell: undefined,
          }}
          state={{ editingCell: undefined }}
          activeSheetIndex={0}
          normalizedMerges={[]}
          dispatch={dispatch}
        >
          <div data-testid="cells" />
        </XlsxSheetGridCellViewport>
      </div>,
    );

    expect(screen.getAllByTestId("xlsx-selection-outline-multi")).toHaveLength(2);
    expect(screen.getAllByTestId("xlsx-selection-fill-multi")).toHaveLength(2);
    expect(screen.getByTestId("xlsx-selection-outline")).toBeDefined();
    expect(screen.getByTestId("xlsx-selection-fill")).toBeDefined();
  });

  it("starts fill drag when dragging the selection fill handle", () => {
    const sheet: XlsxWorksheet = {
      dateSystem: "1900",
      name: "Sheet1",
      sheetId: 1,
      state: "visible",
      rows: [],
      xmlPath: "xl/worksheets/sheet1.xml",
    };
    const workbook: XlsxWorkbook = {
      dateSystem: "1900",
      sheets: [sheet],
      styles: createDefaultStyleSheet(),
      sharedStrings: [],
    };
    const layout = createSheetLayout(sheet, { rowCount: 10, colCount: 10, defaultRowHeightPx: 20, defaultColWidthPx: 50 });
    const actions: XlsxEditorAction[] = [];
    const dispatch = (action: XlsxEditorAction): void => {
      actions.push(action);
    };

    render(
      <div style={{ position: "relative", width: 320, height: 200 }}>
        <XlsxSheetGridCellViewport
          sheet={sheet}
          workbookStyles={workbook.styles}
          layout={layout}
          metrics={{ rowCount: 10, colCount: 10, rowHeaderWidthPx: 56, colHeaderHeightPx: 22 }}
          rowRange={{ start: 0, end: 2 }}
          colRange={{ start: 0, end: 2 }}
          scrollTop={0}
          scrollLeft={0}
          viewportWidth={320}
          viewportHeight={200}
          zoom={1}
          focusGridRoot={() => undefined}
          selection={{
            selectedRanges: [],
            activeRange: {
              start: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
              end: { col: colIdx(2), row: rowIdx(2), colAbsolute: false, rowAbsolute: false },
            },
            activeCell: undefined,
          }}
          state={{ editingCell: undefined }}
          activeSheetIndex={0}
          normalizedMerges={[]}
          dispatch={dispatch}
        >
          <div data-testid="cells" />
        </XlsxSheetGridCellViewport>
      </div>,
    );

    fireEvent.pointerDown(screen.getByTestId("xlsx-selection-fill-handle"), { pointerId: 1, button: 0 });
    expect(actions[0]).toEqual({
      type: "START_FILL_DRAG",
      sourceRange: {
        start: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
        end: { col: colIdx(2), row: rowIdx(2), colAbsolute: false, rowAbsolute: false },
      },
    });
  });
});
