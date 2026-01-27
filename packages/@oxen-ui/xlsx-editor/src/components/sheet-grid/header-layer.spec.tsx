/**
 * @file XlsxSheetGridHeaderLayer tests
 */

// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import type { XlsxWorksheet } from "@oxen/xlsx/domain/workbook";
import { createSheetLayout } from "../../selectors/sheet-layout";
import { createIdleDragState } from "../../context/workbook/editor/types";
import { XlsxSheetGridHeaderLayer } from "./header-layer";

describe("xlsx-editor/components/sheet-grid/header-layer", () => {
  it("dispatches column selection on header click", () => {
    const sheet: XlsxWorksheet = {
      dateSystem: "1900",
      name: "Sheet1",
      sheetId: 1,
      state: "visible",
      rows: [],
      xmlPath: "xl/worksheets/sheet1.xml",
    };
    const layout = createSheetLayout(sheet, { rowCount: 10, colCount: 10, defaultRowHeightPx: 20, defaultColWidthPx: 50 });

    const actions: unknown[] = [];
    render(
      <div style={{ position: "relative", width: 300, height: 200 }}>
        <XlsxSheetGridHeaderLayer
          sheet={sheet}
          layout={layout}
          metrics={{
            rowCount: 10,
            colCount: 10,
            rowHeightPx: 20,
            colWidthPx: 50,
            headerSizePx: 32,
            rowHeaderWidthPx: 56,
            colHeaderHeightPx: 22,
          }}
          rowRange={{ start: 0, end: 3 }}
          colRange={{ start: 0, end: 3 }}
          scrollTop={0}
          scrollLeft={0}
          selectionBounds={null}
          isWholeSheetSelected={false}
          activeCell={undefined}
          drag={createIdleDragState()}
          dispatch={(action) => {
            actions.push(action);
          }}
          focusGridRoot={() => undefined}
          zoom={1}
        />
      </div>,
    );

    fireEvent.pointerDown(screen.getByTestId("xlsx-col-header-1"), { pointerId: 1, button: 0 });
    expect(actions[0]).toMatchObject({ type: "SELECT_RANGE" });
  });
});
