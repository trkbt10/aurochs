/**
 * @file XlsxSheetGridCellViewport tests
 *
 * Tests the interactive overlay: selection rectangles, fill handle drag.
 * Cell viewport lives inside CoreSheetViewport and receives viewport
 * dimensions via context.
 */

// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import type { XlsxWorksheet } from "@aurochs-office/xlsx/domain/workbook";
import { createDefaultStyleSheet } from "@aurochs-office/xlsx/domain/style/types";
import { colIdx, rowIdx, sheetId } from "@aurochs-office/xlsx/domain/types";
import { createSheetLayout } from "@aurochs-ui/xlsx-sheet/selectors/sheet-layout";
import { CoreSheetViewport } from "@aurochs-ui/xlsx-sheet/core";
import type { XlsxEditorAction } from "../../context/workbook/editor/types";
import { XlsxSheetGridCellViewport } from "./cell-viewport";

function createTestSheet(): XlsxWorksheet {
  return {
    dateSystem: "1900",
    name: "Sheet1",
    sheetId: sheetId(1),
    state: "visible",
    rows: [],
    xmlPath: "xl/worksheets/sheet1.xml",
  };
}

function createTestLayout(sheet: XlsxWorksheet) {
  return createSheetLayout(sheet, {
    rowCount: 10,
    colCount: 10,
    defaultRowHeightPx: 20,
    defaultColWidthPx: 50,
  });
}

const testMetrics = { rowCount: 10, colCount: 10 };
const testStyles = createDefaultStyleSheet();

type CellViewportSelection = Parameters<typeof XlsxSheetGridCellViewport>[0]["selection"];

/**
 * Wraps cell viewport inside CoreSheetViewport, matching the real component tree.
 */
function renderInViewport(params: {
  readonly sheet: XlsxWorksheet;
  readonly dispatch: (action: XlsxEditorAction) => void;
  readonly selection: CellViewportSelection;
}) {
  const layout = createTestLayout(params.sheet);
  return render(
    <div style={{ position: "relative", width: 320, height: 200 }}>
      <CoreSheetViewport
        sheet={params.sheet}
        styles={testStyles}
        layout={layout}
        rowRange={{ start: 0, end: 2 }}
        colRange={{ start: 0, end: 2 }}
        scrollTop={0}
        scrollLeft={0}
        viewportWidth={264}
        viewportHeight={178}
        rowCount={10}
        colCount={10}
        normalizedMerges={[]}
        headerOffsetX={56}
        headerOffsetY={22}
      >
        <XlsxSheetGridCellViewport
          sheet={params.sheet}
          layout={layout}
          metrics={testMetrics}
          scrollTop={0}
          scrollLeft={0}
          zoom={1}
          focusGridRoot={() => undefined}
          selection={params.selection}
          state={{ editing: undefined }}
          activeSheetIndex={0}
          editingSheetName={undefined}
          normalizedMerges={[]}
          dispatch={params.dispatch}
        >
          <div data-testid="cells" />
        </XlsxSheetGridCellViewport>
      </CoreSheetViewport>
    </div>,
  );
}

describe("xlsx-editor/components/sheet-grid/cell-viewport", () => {
  it("renders cells and gridlines inside viewport", () => {
    const sheet = createTestSheet();
    const dispatch = (action: XlsxEditorAction): void => {
      void action;
    };

    renderInViewport({
      sheet,
      dispatch,
      selection: { selectedRanges: [], activeRange: undefined, activeCell: undefined },
    });

    expect(screen.getByTestId("xlsx-gridlines")).toBeDefined();
    expect(screen.getByTestId("cells")).toBeDefined();
  });

  it("renders selection overlays for multi-range selections", () => {
    const sheet = createTestSheet();
    const dispatch = (action: XlsxEditorAction): void => {
      void action;
    };

    renderInViewport({
      sheet,
      dispatch,
      selection: {
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
      },
    });

    expect(screen.getAllByTestId("xlsx-selection-outline-multi")).toHaveLength(2);
    expect(screen.getAllByTestId("xlsx-selection-fill-multi")).toHaveLength(2);
    expect(screen.getByTestId("xlsx-selection-outline")).toBeDefined();
    expect(screen.getByTestId("xlsx-selection-fill")).toBeDefined();
  });

  it("starts fill drag when dragging the selection fill handle", () => {
    const sheet = createTestSheet();
    const actions: XlsxEditorAction[] = [];
    const dispatch = (action: XlsxEditorAction): void => {
      actions.push(action);
    };

    renderInViewport({
      sheet,
      dispatch,
      selection: {
        selectedRanges: [],
        activeRange: {
          start: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
          end: { col: colIdx(2), row: rowIdx(2), colAbsolute: false, rowAbsolute: false },
        },
        activeCell: undefined,
      },
    });

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
