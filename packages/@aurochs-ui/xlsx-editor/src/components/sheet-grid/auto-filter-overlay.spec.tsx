/**
 * @file Tests for AutoFilterOverlay.
 *
 * Verifies React rendering produces the expected DOM structure.
 */

import { render } from "@testing-library/react";
import type { XlsxAutoFilter } from "@aurochs-office/xlsx/domain/auto-filter";
import type { XlsxWorksheet } from "@aurochs-office/xlsx/domain/workbook";
import { colIdx, rowIdx, sheetId } from "@aurochs-office/xlsx/domain/types";
import type { CellRange } from "@aurochs-office/xlsx/domain/cell/address";
import { createSheetLayout } from "@aurochs-ui/xlsx-sheet/selectors/sheet-layout";
import { AutoFilterOverlay } from "./auto-filter-overlay";

function makeRange(params: {
  readonly startCol: number;
  readonly startRow: number;
  readonly endCol: number;
  readonly endRow: number;
}): CellRange {
  return {
    start: { col: colIdx(params.startCol), row: rowIdx(params.startRow), colAbsolute: false, rowAbsolute: false },
    end: { col: colIdx(params.endCol), row: rowIdx(params.endRow), colAbsolute: false, rowAbsolute: false },
  };
}

function makeWorksheet(options?: {
  readonly autoFilter?: XlsxAutoFilter;
  readonly rows?: XlsxWorksheet["rows"];
}): XlsxWorksheet {
  return {
    name: "Sheet1",
    sheetId: sheetId(1),
    state: "visible",
    rows: options?.rows ?? [],
    xmlPath: "xl/worksheets/sheet1.xml",
    dateSystem: "1900",
    autoFilter: options?.autoFilter,
  };
}

function makeLayout(ws: XlsxWorksheet) {
  return createSheetLayout(ws, {
    rowCount: 100,
    colCount: 26,
    defaultRowHeightPx: 20,
    defaultColWidthPx: 64,
  });
}

function noop() {
  // intentionally empty
}

describe("AutoFilterOverlay rendering", () => {
  it("should render a button for each column in the autoFilter range", () => {
    const autoFilter: XlsxAutoFilter = { ref: makeRange({ startCol: 1, startRow: 1, endCol: 3, endRow: 10 }) };
    const layout = makeLayout(makeWorksheet({ autoFilter }));

    const { getAllByTestId } = render(
      <AutoFilterOverlay
        autoFilter={autoFilter}
        layout={layout}
        scrollTop={0}
        scrollLeft={0}
        onButtonClick={noop}
      />,
    );

    expect(getAllByTestId("auto-filter-button").length).toBe(3);
  });

  it("should position button containers with viewport-relative coordinates", () => {
    const autoFilter: XlsxAutoFilter = { ref: makeRange({ startCol: 1, startRow: 1, endCol: 2, endRow: 5 }) };
    const layout = makeLayout(makeWorksheet({ autoFilter }));

    const { getAllByTestId } = render(
      <AutoFilterOverlay
        autoFilter={autoFilter}
        layout={layout}
        scrollTop={0}
        scrollLeft={0}
        onButtonClick={noop}
      />,
    );

    const cells = getAllByTestId(/^auto-filter-cell-/);
    expect(cells.length).toBe(2);

    // First button container: col 1, row 1 → left=0, top=0
    expect(cells[0].style.left).toBe("0px");
    expect(cells[0].style.top).toBe("0px");
    expect(cells[0].style.position).toBe("absolute");

    // Second button container: col 2, row 1 → left=64, top=0
    expect(cells[1].style.left).toBe("64px");
    expect(cells[1].style.top).toBe("0px");
  });

  it("should adjust positions for scroll offset", () => {
    const autoFilter: XlsxAutoFilter = { ref: makeRange({ startCol: 1, startRow: 1, endCol: 2, endRow: 5 }) };
    const layout = makeLayout(makeWorksheet({ autoFilter }));

    const { getAllByTestId } = render(
      <AutoFilterOverlay
        autoFilter={autoFilter}
        layout={layout}
        scrollTop={10}
        scrollLeft={20}
        onButtonClick={noop}
      />,
    );

    const cells = getAllByTestId(/^auto-filter-cell-/);
    expect(cells[0].style.left).toBe("-20px");
    expect(cells[0].style.top).toBe("-10px");
  });

  it("should skip columns with hiddenButton=true", () => {
    const autoFilter: XlsxAutoFilter = {
      ref: makeRange({ startCol: 1, startRow: 1, endCol: 3, endRow: 10 }),
      filterColumns: [{ colId: colIdx(1), hiddenButton: true }],
    };
    const layout = makeLayout(makeWorksheet({ autoFilter }));

    const { getAllByTestId } = render(
      <AutoFilterOverlay
        autoFilter={autoFilter}
        layout={layout}
        scrollTop={0}
        scrollLeft={0}
        onButtonClick={noop}
      />,
    );

    expect(getAllByTestId("auto-filter-button").length).toBe(2);
  });

  it("should set pointerEvents:auto on buttons for click handling", () => {
    const autoFilter: XlsxAutoFilter = { ref: makeRange({ startCol: 1, startRow: 1, endCol: 2, endRow: 5 }) };
    const layout = makeLayout(makeWorksheet({ autoFilter }));

    const { getAllByTestId } = render(
      <AutoFilterOverlay
        autoFilter={autoFilter}
        layout={layout}
        scrollTop={0}
        scrollLeft={0}
        onButtonClick={noop}
      />,
    );

    const buttons = getAllByTestId("auto-filter-button");
    for (const btn of buttons) {
      expect(btn.style.pointerEvents).toBe("auto");
    }
  });

  it("should set pointerEvents:none on the wrapper to pass clicks through to cells", () => {
    const autoFilter: XlsxAutoFilter = { ref: makeRange({ startCol: 1, startRow: 1, endCol: 2, endRow: 5 }) };
    const layout = makeLayout(makeWorksheet({ autoFilter }));

    const { getByTestId } = render(
      <AutoFilterOverlay
        autoFilter={autoFilter}
        layout={layout}
        scrollTop={0}
        scrollLeft={0}
        onButtonClick={noop}
      />,
    );

    const wrapper = getByTestId("auto-filter-overlay");
    expect(wrapper.style.pointerEvents).toBe("none");
  });

  it("should not render buttons when header row is hidden (height=0)", () => {
    const autoFilter: XlsxAutoFilter = { ref: makeRange({ startCol: 1, startRow: 1, endCol: 3, endRow: 10 }) };
    const ws = makeWorksheet({
      autoFilter,
      rows: [{ rowNumber: rowIdx(1), cells: [], hidden: true }],
    });
    const layout = makeLayout(ws);

    const { queryAllByTestId } = render(
      <AutoFilterOverlay
        autoFilter={autoFilter}
        layout={layout}
        scrollTop={0}
        scrollLeft={0}
        onButtonClick={noop}
      />,
    );

    expect(queryAllByTestId("auto-filter-button").length).toBe(0);
  });
});
