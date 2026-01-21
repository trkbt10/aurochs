/**
 * @file XlsxSheetGrid tests
 */

// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { triggerResizeObservers } from "../../../spec/test-utils/resize-observer";
import type { XlsxWorkbook } from "../../xlsx/domain/workbook";
import { colIdx, rowIdx } from "../../xlsx/domain/types";
import { createDefaultStyleSheet } from "../../xlsx/domain/style/types";
import type { CellAddress } from "../../xlsx/domain/cell/address";
import { XlsxWorkbookEditorProvider, useXlsxWorkbookEditor } from "../context/workbook/XlsxWorkbookEditorContext";
import { getCell } from "../cell/query";
import { XlsxSheetGrid } from "./XlsxSheetGrid";

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

function createAddress(col: number, row: number): CellAddress {
  return { col: colIdx(col), row: rowIdx(row), colAbsolute: false, rowAbsolute: false };
}

function createWorkbook(): XlsxWorkbook {
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
            cells: [{ address: createAddress(1, 1), value: { type: "string", value: "Hello" } }],
          },
        ],
        mergeCells: [],
        xmlPath: "xl/worksheets/sheet1.xml",
      },
    ],
    styles: createDefaultStyleSheet(),
    sharedStrings: [],
  };
}

function SelectionDebugger() {
  const { selection } = useXlsxWorkbookEditor();
  const activeCell = selection.activeCell;
  const text = activeCell ? `${Number(activeCell.col)},${Number(activeCell.row)}` : "none";
  return <div data-testid="activeCell">{text}</div>;
}

function RangeDebugger() {
  const { selection } = useXlsxWorkbookEditor();
  const range = selection.selectedRange;
  if (!range) {
    return <div data-testid="selectedRange">none</div>;
  }
  const text = `${Number(range.start.col)},${Number(range.start.row)}-${Number(range.end.col)},${Number(range.end.row)}`;
  return <div data-testid="selectedRange">{text}</div>;
}

function MultiRangeDebugger() {
  const { selection } = useXlsxWorkbookEditor();
  const count = selection.multiRanges?.length ?? 0;
  return <div data-testid="multiRanges">{String(count)}</div>;
}

function CellValueDebugger() {
  const { workbook } = useXlsxWorkbookEditor();
  const sheet = workbook.sheets[0];
  if (!sheet) {
    throw new Error("sheet[0] is required");
  }
  const a1 = getCell(sheet, createAddress(1, 1))?.value;
  const b1 = getCell(sheet, createAddress(2, 1))?.value;
  const text = (v: typeof a1): string => {
    if (!v) {
      return "";
    }
    return v.type === "string" ? v.value : v.type;
  };
  return (
    <div>
      <div data-testid="a1">{text(a1)}</div>
      <div data-testid="b1">{text(b1)}</div>
    </div>
  );
}

describe("XlsxSheetGrid", () => {
  it("shows gridlines by default and hides them when sheetView.showGridLines=false", async () => {
    const base: XlsxWorkbook = {
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

    const { unmount } = render(
      <XlsxWorkbookEditorProvider initialWorkbook={base}>
        <div style={{ width: 320, height: 200 }}>
          <XlsxSheetGrid
            sheetIndex={0}
            metrics={{
              rowCount: 20,
              colCount: 10,
              rowHeightPx: 22,
              colWidthPx: 120,
              headerSizePx: 32,
              overscanRows: 2,
              overscanCols: 2,
            }}
          />
        </div>
      </XlsxWorkbookEditorProvider>,
    );

    act(() => {
      triggerResizeObservers([createResizeObserverEntry(320, 200)]);
    });

    await waitFor(() => {
      expect(screen.getByTestId("xlsx-gridlines")).toBeDefined();
    });

    unmount();

    render(
      <XlsxWorkbookEditorProvider initialWorkbook={{ ...base, sheets: [{ ...base.sheets[0]!, sheetView: { showGridLines: false, showRowColHeaders: true } }] }}>
        <div style={{ width: 320, height: 200 }}>
          <XlsxSheetGrid
            sheetIndex={0}
            metrics={{
              rowCount: 20,
              colCount: 10,
              rowHeightPx: 22,
              colWidthPx: 120,
              headerSizePx: 32,
              overscanRows: 2,
              overscanCols: 2,
            }}
          />
        </div>
      </XlsxWorkbookEditorProvider>,
    );

    act(() => {
      triggerResizeObservers([createResizeObserverEntry(320, 200)]);
    });

    await waitFor(() => {
      expect(screen.queryByTestId("xlsx-gridlines")).toBeNull();
    });
  });

  it("dispatches SELECT_CELL on cell click", async () => {
    const workbook = createWorkbook();

    render(
      <XlsxWorkbookEditorProvider initialWorkbook={workbook}>
        <div style={{ width: 320, height: 200 }}>
          <XlsxSheetGrid
            sheetIndex={0}
            metrics={{
              rowCount: 20,
              colCount: 10,
              rowHeightPx: 22,
              colWidthPx: 120,
              headerSizePx: 32,
              overscanRows: 2,
              overscanCols: 2,
            }}
          />
        </div>
        <SelectionDebugger />
      </XlsxWorkbookEditorProvider>,
    );

    act(() => {
      triggerResizeObservers([createResizeObserverEntry(320, 200)]);
    });

    expect(screen.getByTestId("activeCell").textContent).toBe("none");

    act(() => {
      fireEvent.pointerDown(screen.getByText("Hello"), { pointerId: 1, button: 0 });
      fireEvent.pointerUp(window, { pointerId: 1 });
    });

    await waitFor(() => {
      expect(screen.getByTestId("activeCell").textContent).toBe("1,1");
    });
  });

  it("adds a range to selection via Ctrl/Cmd+Click", async () => {
    const workbook: XlsxWorkbook = {
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
                { address: createAddress(1, 1), value: { type: "string", value: "A1" } },
                { address: createAddress(2, 1), value: { type: "string", value: "B1" } },
              ],
            },
          ],
          mergeCells: [],
          xmlPath: "xl/worksheets/sheet1.xml",
        },
      ],
      styles: createDefaultStyleSheet(),
      sharedStrings: [],
    };

    render(
      <XlsxWorkbookEditorProvider initialWorkbook={workbook}>
        <div style={{ width: 320, height: 200 }}>
          <XlsxSheetGrid
            sheetIndex={0}
            metrics={{
              rowCount: 20,
              colCount: 10,
              rowHeightPx: 22,
              colWidthPx: 120,
              headerSizePx: 32,
              overscanRows: 2,
              overscanCols: 2,
            }}
          />
        </div>
        <RangeDebugger />
        <MultiRangeDebugger />
      </XlsxWorkbookEditorProvider>,
    );

    act(() => {
      triggerResizeObservers([createResizeObserverEntry(320, 200)]);
    });

    act(() => {
      fireEvent.pointerDown(screen.getByText("A1"), { pointerId: 1, button: 0 });
      fireEvent.pointerUp(window, { pointerId: 1 });
    });

    await waitFor(() => {
      expect(screen.getByTestId("selectedRange").textContent).toBe("1,1-1,1");
      expect(screen.getByTestId("multiRanges").textContent).toBe("0");
    });

    act(() => {
      fireEvent.pointerDown(screen.getByText("B1"), { pointerId: 1, button: 0, ctrlKey: true });
      fireEvent.pointerUp(window, { pointerId: 1 });
    });

    await waitFor(() => {
      expect(screen.getByTestId("selectedRange").textContent).toBe("2,1-2,1");
      expect(screen.getByTestId("multiRanges").textContent).toBe("1");
    });
  });

  it("selects a column by clicking its header", async () => {
    const workbook = createWorkbook();

    render(
      <XlsxWorkbookEditorProvider initialWorkbook={workbook}>
        <div style={{ width: 320, height: 200 }}>
          <XlsxSheetGrid
            sheetIndex={0}
            metrics={{
              rowCount: 20,
              colCount: 10,
              rowHeightPx: 22,
              colWidthPx: 120,
              headerSizePx: 32,
              overscanRows: 2,
              overscanCols: 2,
            }}
          />
        </div>
        <RangeDebugger />
      </XlsxWorkbookEditorProvider>,
    );

    act(() => {
      triggerResizeObservers([createResizeObserverEntry(320, 200)]);
    });

    expect(screen.getByTestId("selectedRange").textContent).toBe("none");

    act(() => {
      fireEvent.pointerDown(screen.getByTestId("xlsx-col-header-1"), { pointerId: 1, button: 0 });
    });

    await waitFor(() => {
      expect(screen.getByTestId("selectedRange").textContent).toBe("1,1-1,20");
    });
  });

  it("extends column selection with Shift+click on headers", async () => {
    const workbook = createWorkbook();

    render(
      <XlsxWorkbookEditorProvider initialWorkbook={workbook}>
        <div style={{ width: 320, height: 200 }}>
          <XlsxSheetGrid
            sheetIndex={0}
            metrics={{
              rowCount: 20,
              colCount: 10,
              rowHeightPx: 22,
              colWidthPx: 120,
              headerSizePx: 32,
              overscanRows: 2,
              overscanCols: 2,
            }}
          />
        </div>
        <RangeDebugger />
      </XlsxWorkbookEditorProvider>,
    );

    act(() => {
      triggerResizeObservers([createResizeObserverEntry(320, 200)]);
    });

    act(() => {
      fireEvent.pointerDown(screen.getByTestId("xlsx-col-header-2"), { pointerId: 1, button: 0 });
    });

    await waitFor(() => {
      expect(screen.getByTestId("selectedRange").textContent).toBe("2,1-2,20");
    });

    act(() => {
      fireEvent.pointerDown(screen.getByTestId("xlsx-col-header-4"), { pointerId: 1, button: 0, shiftKey: true });
    });

    await waitFor(() => {
      expect(screen.getByTestId("selectedRange").textContent).toBe("2,1-4,20");
    });
  });

  it("selects a row by clicking its header", async () => {
    const workbook = createWorkbook();

    render(
      <XlsxWorkbookEditorProvider initialWorkbook={workbook}>
        <div style={{ width: 320, height: 200 }}>
          <XlsxSheetGrid
            sheetIndex={0}
            metrics={{
              rowCount: 20,
              colCount: 10,
              rowHeightPx: 22,
              colWidthPx: 120,
              headerSizePx: 32,
              overscanRows: 2,
              overscanCols: 2,
            }}
          />
        </div>
        <RangeDebugger />
      </XlsxWorkbookEditorProvider>,
    );

    act(() => {
      triggerResizeObservers([createResizeObserverEntry(320, 200)]);
    });

    act(() => {
      fireEvent.pointerDown(screen.getByTestId("xlsx-row-header-1"), { pointerId: 1, button: 0 });
    });

    await waitFor(() => {
      expect(screen.getByTestId("selectedRange").textContent).toBe("1,1-10,1");
    });
  });

  it("extends row selection with Shift+click on headers", async () => {
    const workbook = createWorkbook();

    render(
      <XlsxWorkbookEditorProvider initialWorkbook={workbook}>
        <div style={{ width: 320, height: 200 }}>
          <XlsxSheetGrid
            sheetIndex={0}
            metrics={{
              rowCount: 20,
              colCount: 10,
              rowHeightPx: 22,
              colWidthPx: 120,
              headerSizePx: 32,
              overscanRows: 2,
              overscanCols: 2,
            }}
          />
        </div>
        <RangeDebugger />
      </XlsxWorkbookEditorProvider>,
    );

    act(() => {
      triggerResizeObservers([createResizeObserverEntry(320, 200)]);
    });

    act(() => {
      fireEvent.pointerDown(screen.getByTestId("xlsx-row-header-2"), { pointerId: 1, button: 0 });
    });

    await waitFor(() => {
      expect(screen.getByTestId("selectedRange").textContent).toBe("1,2-10,2");
    });

    act(() => {
      fireEvent.pointerDown(screen.getByTestId("xlsx-row-header-4"), { pointerId: 1, button: 0, shiftKey: true });
    });

    await waitFor(() => {
      expect(screen.getByTestId("selectedRange").textContent).toBe("1,2-10,4");
    });
  });

  it("selects all cells by clicking the corner", async () => {
    const workbook = createWorkbook();

    render(
      <XlsxWorkbookEditorProvider initialWorkbook={workbook}>
        <div style={{ width: 320, height: 200 }}>
          <XlsxSheetGrid
            sheetIndex={0}
            metrics={{
              rowCount: 20,
              colCount: 10,
              rowHeightPx: 22,
              colWidthPx: 120,
              headerSizePx: 32,
              overscanRows: 2,
              overscanCols: 2,
            }}
          />
        </div>
        <RangeDebugger />
      </XlsxWorkbookEditorProvider>,
    );

    act(() => {
      triggerResizeObservers([createResizeObserverEntry(320, 200)]);
    });

    act(() => {
      fireEvent.pointerDown(screen.getByTestId("xlsx-select-all"), { pointerId: 1, button: 0 });
    });

    await waitFor(() => {
      expect(screen.getByTestId("selectedRange").textContent).toBe("1,1-10,20");
    });
  });

  it("edits a cell via double-click and Enter commit", async () => {
    const workbook = createWorkbook();

    render(
      <XlsxWorkbookEditorProvider initialWorkbook={workbook}>
        <div style={{ width: 320, height: 200 }}>
          <XlsxSheetGrid
            sheetIndex={0}
            metrics={{
              rowCount: 20,
              colCount: 10,
              rowHeightPx: 22,
              colWidthPx: 120,
              headerSizePx: 32,
              overscanRows: 2,
              overscanCols: 2,
            }}
          />
        </div>
      </XlsxWorkbookEditorProvider>,
    );

    act(() => {
      triggerResizeObservers([createResizeObserverEntry(320, 200)]);
    });

    const cell = screen.getByText("Hello");

    act(() => {
      fireEvent.doubleClick(cell);
    });

    const input = await screen.findByTestId("xlsx-cell-editor");

    act(() => {
      fireEvent.change(input, { target: { value: "42" } });
      fireEvent.keyDown(input, { key: "Enter" });
    });

    await waitFor(() => {
      expect(screen.getByText("42")).toBeDefined();
    });
  });

  it("renders merged cells as a single cell and selects the merge range on click", async () => {
    const workbook: XlsxWorkbook = {
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
                { address: createAddress(1, 1), value: { type: "string", value: "Hello" } },
                { address: createAddress(2, 1), value: { type: "string", value: "IGNORED" } },
              ],
            },
          ],
          mergeCells: [{ start: createAddress(1, 1), end: createAddress(2, 1) }],
          xmlPath: "xl/worksheets/sheet1.xml",
        },
      ],
      styles: createDefaultStyleSheet(),
      sharedStrings: [],
    };

    render(
      <XlsxWorkbookEditorProvider initialWorkbook={workbook}>
        <div style={{ width: 320, height: 200 }}>
          <XlsxSheetGrid
            sheetIndex={0}
            metrics={{
              rowCount: 20,
              colCount: 10,
              rowHeightPx: 22,
              colWidthPx: 120,
              headerSizePx: 32,
              overscanRows: 2,
              overscanCols: 2,
            }}
          />
        </div>
        <RangeDebugger />
      </XlsxWorkbookEditorProvider>,
    );

    act(() => {
      triggerResizeObservers([createResizeObserverEntry(320, 200)]);
    });

    expect(screen.queryByText("IGNORED")).toBeNull();

    act(() => {
      fireEvent.pointerDown(screen.getByText("Hello"), { pointerId: 1, button: 0 });
    });

    act(() => {
      fireEvent.pointerUp(window, { pointerId: 1 });
    });

    await waitFor(() => {
      expect(screen.getByTestId("selectedRange").textContent).toBe("1,1-2,1");
    });
  });

  it("moves selection with Arrow keys", async () => {
    const workbook = createWorkbook();

    render(
      <XlsxWorkbookEditorProvider initialWorkbook={workbook}>
        <div style={{ width: 320, height: 200 }}>
          <XlsxSheetGrid
            sheetIndex={0}
            metrics={{
              rowCount: 20,
              colCount: 10,
              rowHeightPx: 22,
              colWidthPx: 120,
              headerSizePx: 32,
              overscanRows: 2,
              overscanCols: 2,
            }}
          />
        </div>
        <SelectionDebugger />
      </XlsxWorkbookEditorProvider>,
    );

    act(() => {
      triggerResizeObservers([createResizeObserverEntry(320, 200)]);
    });

    const gridRoot = document.body.querySelector('[data-virtual-scroll-root="true"]');
    if (!gridRoot) {
      throw new Error("VirtualScroll root not found");
    }

    act(() => {
      (gridRoot as HTMLElement).focus();
      fireEvent.keyDown(gridRoot, { key: "ArrowRight" });
    });

    await waitFor(() => {
      expect(screen.getByTestId("activeCell").textContent).toBe("2,1");
    });
  });

  it("inserts a column via header context menu", async () => {
    const workbook = createWorkbook();

    render(
      <XlsxWorkbookEditorProvider initialWorkbook={workbook}>
        <div style={{ width: 320, height: 200 }}>
          <XlsxSheetGrid
            sheetIndex={0}
            metrics={{
              rowCount: 20,
              colCount: 10,
              rowHeightPx: 22,
              colWidthPx: 120,
              headerSizePx: 32,
              overscanRows: 2,
              overscanCols: 2,
            }}
          />
        </div>
        <CellValueDebugger />
      </XlsxWorkbookEditorProvider>,
    );

    act(() => {
      triggerResizeObservers([createResizeObserverEntry(320, 200)]);
    });

    expect(screen.getByTestId("a1").textContent).toBe("Hello");
    expect(screen.getByTestId("b1").textContent).toBe("");

    act(() => {
      fireEvent.contextMenu(screen.getByText("A"));
    });

    act(() => {
      fireEvent.click(screen.getByText("Insert column left"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("a1").textContent).toBe("");
      expect(screen.getByTestId("b1").textContent).toBe("Hello");
    });
  });
});
