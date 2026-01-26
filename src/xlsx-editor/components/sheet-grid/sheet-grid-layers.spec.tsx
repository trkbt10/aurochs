/**
 * @file XlsxSheetGridLayers tests
 */

// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import { triggerResizeObservers } from "../../../../spec/test-utils/resize-observer";
import type { XlsxWorkbook } from "../../../xlsx/domain/workbook";
import { createDefaultStyleSheet } from "../../../xlsx/domain/style/types";
import { VirtualScroll } from "../../../office-editor-components";
import { createSheetLayout } from "../../selectors/sheet-layout";
import { createFormulaEvaluator } from "../../../xlsx/formula/evaluator";
import { XlsxWorkbookEditorProvider } from "../../context/workbook/XlsxWorkbookEditorContext";
import { XlsxSheetGridLayers } from "./sheet-grid-layers";

function createResizeObserverEntry(width: number, height: number): ResizeObserverEntry {
  const target = document.createElement("div");
  const rect = new DOMRect(0, 0, width, height);
  const size = [{ inlineSize: width, blockSize: height }];
  return {
    target,
    contentRect: rect,
    borderBoxSize: size,
    contentBoxSize: size,
    devicePixelContentBoxSize: size,
  };
}

describe("xlsx-editor/components/sheet-grid/sheet-grid-layers", () => {
  it("renders header + viewport layers under VirtualScroll", () => {
    const workbook: XlsxWorkbook = {
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
    const sheet = workbook.sheets[0]!;
    const layout = createSheetLayout(sheet, { rowCount: 10, colCount: 10, defaultRowHeightPx: 20, defaultColWidthPx: 50 });
    const formulaEvaluator = createFormulaEvaluator(workbook);

    render(
      <XlsxWorkbookEditorProvider initialWorkbook={workbook}>
        <div style={{ width: 320, height: 200 }}>
          <VirtualScroll contentWidth={1000} contentHeight={1000}>
            <XlsxSheetGridLayers
              sheetIndex={0}
              sheet={sheet}
              metrics={{
                rowCount: 10,
                colCount: 10,
                rowHeightPx: 20,
                colWidthPx: 50,
                headerSizePx: 32,
                rowHeaderWidthPx: 56,
                colHeaderHeightPx: 22,
                overscanRows: 1,
                overscanCols: 1,
              }}
              layout={layout}
              formulaEvaluator={formulaEvaluator}
              zoom={1}
            />
          </VirtualScroll>
        </div>
      </XlsxWorkbookEditorProvider>,
    );

    act(() => {
      triggerResizeObservers([createResizeObserverEntry(320, 200)]);
    });

    expect(screen.getByTestId("xlsx-select-all")).toBeDefined();
    expect(screen.getByTestId("xlsx-gridlines")).toBeDefined();
  });
});
