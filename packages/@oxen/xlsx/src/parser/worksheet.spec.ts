/**
 * @file Worksheet Parser Tests
 *
 * Tests for parsing worksheet XML elements from XLSX files.
 */

import { parseXml } from "@oxen/xml";
import type { XmlElement } from "@oxen/xml";
import { createDefaultParseContext } from "./context";
import {
  parseColumn,
  parseCols,
  parseRow,
  parseSheetData,
  parseMergeCells,
  parsePane,
  parseSelection,
  parseSheetView,
  parseWorksheet,
} from "./worksheet";

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Helper to parse XML string and get the root element.
 */
function parseElement(xml: string): XmlElement {
  const doc = parseXml(xml);
  const root = doc.children.find((c): c is XmlElement => c.type === "element");
  if (!root) {
    throw new Error("No root element found");
  }
  return root;
}

// =============================================================================
// parseColumn Tests
// =============================================================================

describe("parseColumn", () => {
  it("should parse basic column attributes", () => {
    const el = parseElement('<col min="1" max="3" width="12.5" />');
    const col = parseColumn(el);

    expect(col.min).toBe(1);
    expect(col.max).toBe(3);
    expect(col.width).toBe(12.5);
  });

  it("should parse hidden and bestFit attributes", () => {
    const el = parseElement('<col min="1" max="1" hidden="1" bestFit="1" />');
    const col = parseColumn(el);

    expect(col.hidden).toBe(true);
    expect(col.bestFit).toBe(true);
  });

  it("should parse style attribute", () => {
    const el = parseElement('<col min="1" max="1" style="5" />');
    const col = parseColumn(el);

    expect(col.styleId).toBe(5);
  });

  it("should default min/max to 1 when missing", () => {
    const el = parseElement("<col />");
    const col = parseColumn(el);

    expect(col.min).toBe(1);
    expect(col.max).toBe(1);
  });
});

// =============================================================================
// parseCols Tests
// =============================================================================

describe("parseCols", () => {
  it("should return empty array when colsElement is undefined", () => {
    const result = parseCols(undefined);
    expect(result).toEqual([]);
  });

  it("should parse multiple columns", () => {
    const el = parseElement(`
      <cols>
        <col min="1" max="1" width="10" />
        <col min="2" max="5" width="15" hidden="1" />
      </cols>
    `);
    const cols = parseCols(el);

    expect(cols).toHaveLength(2);
    expect(cols[0].min).toBe(1);
    expect(cols[0].max).toBe(1);
    expect(cols[0].width).toBe(10);
    expect(cols[1].min).toBe(2);
    expect(cols[1].max).toBe(5);
    expect(cols[1].hidden).toBe(true);
  });
});

// =============================================================================
// parseRow Tests
// =============================================================================

describe("parseRow", () => {
  const context = createDefaultParseContext();

  it("should parse row number", () => {
    const el = parseElement('<row r="5" />');
    const row = parseRow(el, context, undefined);

    expect(row.rowNumber).toBe(5);
  });

  it("should parse row height and custom height", () => {
    const el = parseElement('<row r="1" ht="20.5" customHeight="1" />');
    const row = parseRow(el, context, undefined);

    expect(row.height).toBe(20.5);
    expect(row.customHeight).toBe(true);
  });

  it("should parse hidden attribute", () => {
    const el = parseElement('<row r="1" hidden="1" />');
    const row = parseRow(el, context, undefined);

    expect(row.hidden).toBe(true);
  });

  it("should parse row style", () => {
    const el = parseElement('<row r="1" s="3" />');
    const row = parseRow(el, context, undefined);

    expect(row.styleId).toBe(3);
  });

  it("should parse cells in the row", () => {
    const el = parseElement(`
      <row r="1">
        <c r="A1" t="n"><v>42</v></c>
        <c r="B1" t="n"><v>100</v></c>
      </row>
    `);
    const row = parseRow(el, context, undefined);

    expect(row.cells).toHaveLength(2);
    expect(row.cells[0].address.col).toBe(1);
    expect(row.cells[0].address.row).toBe(1);
    expect(row.cells[1].address.col).toBe(2);
    expect(row.cells[1].address.row).toBe(1);
  });

  it("should default row number to 1 when missing", () => {
    const el = parseElement("<row />");
    const row = parseRow(el, context, undefined);

    expect(row.rowNumber).toBe(1);
  });
});

// =============================================================================
// parseSheetData Tests
// =============================================================================

describe("parseSheetData", () => {
  const context = createDefaultParseContext();

  it("should parse multiple rows", () => {
    const el = parseElement(`
      <sheetData>
        <row r="1">
          <c r="A1" t="n"><v>1</v></c>
        </row>
        <row r="2">
          <c r="A2" t="n"><v>2</v></c>
        </row>
        <row r="3">
          <c r="A3" t="n"><v>3</v></c>
        </row>
      </sheetData>
    `);
    const rows = parseSheetData(el, context, undefined);

    expect(rows).toHaveLength(3);
    expect(rows[0].rowNumber).toBe(1);
    expect(rows[1].rowNumber).toBe(2);
    expect(rows[2].rowNumber).toBe(3);
  });

  it("should handle empty sheetData", () => {
    const el = parseElement("<sheetData />");
    const rows = parseSheetData(el, context, undefined);

    expect(rows).toHaveLength(0);
  });

  it("should assign sequential row numbers when row r is missing", () => {
    const el = parseElement(`
      <sheetData>
        <row>
          <c r="A1" t="n"><v>1</v></c>
        </row>
        <row>
          <c r="A2" t="n"><v>2</v></c>
        </row>
        <row>
          <c r="A3" t="n"><v>3</v></c>
        </row>
      </sheetData>
    `);
    const rows = parseSheetData(el, context, undefined);

    expect(rows).toHaveLength(3);
    expect(rows[0].rowNumber).toBe(1);
    expect(rows[1].rowNumber).toBe(2);
    expect(rows[2].rowNumber).toBe(3);
  });
});

// =============================================================================
// parseMergeCells Tests
// =============================================================================

describe("parseMergeCells", () => {
  it("should return empty array when mergeCellsElement is undefined", () => {
    const result = parseMergeCells(undefined);
    expect(result).toEqual([]);
  });

  it("should parse merged cell ranges", () => {
    const el = parseElement(`
      <mergeCells count="2">
        <mergeCell ref="A1:B2" />
        <mergeCell ref="C3:D5" />
      </mergeCells>
    `);
    const ranges = parseMergeCells(el);

    expect(ranges).toHaveLength(2);
    expect(ranges[0].start.col).toBe(1);
    expect(ranges[0].start.row).toBe(1);
    expect(ranges[0].end.col).toBe(2);
    expect(ranges[0].end.row).toBe(2);
    expect(ranges[1].start.col).toBe(3);
    expect(ranges[1].start.row).toBe(3);
    expect(ranges[1].end.col).toBe(4);
    expect(ranges[1].end.row).toBe(5);
  });

  it("should skip mergeCell elements without ref attribute", () => {
    const el = parseElement(`
      <mergeCells>
        <mergeCell ref="A1:B2" />
        <mergeCell />
        <mergeCell ref="C3:D5" />
      </mergeCells>
    `);
    const ranges = parseMergeCells(el);

    expect(ranges).toHaveLength(2);
  });
});

// =============================================================================
// parsePane Tests
// =============================================================================

describe("parsePane", () => {
  it("should return undefined when paneElement is undefined", () => {
    const result = parsePane(undefined);
    expect(result).toBeUndefined();
  });

  it("should parse pane attributes", () => {
    const el = parseElement(
      '<pane xSplit="2" ySplit="3" topLeftCell="C4" activePane="bottomRight" state="frozen" />',
    );
    const pane = parsePane(el);

    expect(pane).toBeDefined();
    expect(pane!.xSplit).toBe(2);
    expect(pane!.ySplit).toBe(3);
    expect(pane!.topLeftCell).toBe("C4");
    expect(pane!.activePane).toBe("bottomRight");
    expect(pane!.state).toBe("frozen");
  });

  it("should handle minimal pane element", () => {
    const el = parseElement("<pane />");
    const pane = parsePane(el);

    expect(pane).toBeDefined();
    expect(pane!.xSplit).toBeUndefined();
    expect(pane!.ySplit).toBeUndefined();
  });
});

// =============================================================================
// parseSelection Tests
// =============================================================================

describe("parseSelection", () => {
  it("should return undefined when selectionElement is undefined", () => {
    const result = parseSelection(undefined);
    expect(result).toBeUndefined();
  });

  it("should parse selection attributes", () => {
    const el = parseElement(
      '<selection pane="bottomRight" activeCell="D5" sqref="D5:E10" />',
    );
    const selection = parseSelection(el);

    expect(selection).toBeDefined();
    expect(selection!.pane).toBe("bottomRight");
    expect(selection!.activeCell).toBe("D5");
    expect(selection!.sqref).toBe("D5:E10");
  });

  it("should handle minimal selection element", () => {
    const el = parseElement("<selection />");
    const selection = parseSelection(el);

    expect(selection).toBeDefined();
    expect(selection!.pane).toBeUndefined();
    expect(selection!.activeCell).toBeUndefined();
  });
});

// =============================================================================
// parseSheetView Tests
// =============================================================================

describe("parseSheetView", () => {
  it("should parse sheet view attributes", () => {
    const el = parseElement(
      '<sheetView tabSelected="1" showGridLines="0" showRowColHeaders="1" zoomScale="100" />',
    );
    const view = parseSheetView(el);

    expect(view.tabSelected).toBe(true);
    expect(view.showGridLines).toBe(false);
    expect(view.showRowColHeaders).toBe(true);
    expect(view.zoomScale).toBe(100);
  });

  it("should parse nested pane element", () => {
    const el = parseElement(`
      <sheetView>
        <pane ySplit="1" state="frozen" />
      </sheetView>
    `);
    const view = parseSheetView(el);

    expect(view.pane).toBeDefined();
    expect(view.pane!.ySplit).toBe(1);
    expect(view.pane!.state).toBe("frozen");
  });

  it("should parse nested selection element", () => {
    const el = parseElement(`
      <sheetView>
        <selection activeCell="A1" sqref="A1" />
      </sheetView>
    `);
    const view = parseSheetView(el);

    expect(view.selection).toBeDefined();
    expect(view.selection!.activeCell).toBe("A1");
    expect(view.selection!.sqref).toBe("A1");
  });

  it("should handle minimal sheetView element", () => {
    const el = parseElement("<sheetView />");
    const view = parseSheetView(el);

    expect(view.tabSelected).toBeUndefined();
    expect(view.pane).toBeUndefined();
    expect(view.selection).toBeUndefined();
  });
});

// =============================================================================
// parseWorksheet Tests
// =============================================================================

describe("parseWorksheet", () => {
  const context = createDefaultParseContext();
  const sheetInfo = {
    name: "Sheet1",
    sheetId: 1,
    state: "visible" as const,
    xmlPath: "xl/worksheets/sheet1.xml",
  };

  it("should parse complete worksheet", () => {
    const el = parseElement(`
      <worksheet>
        <dimension ref="A1:C3" />
        <sheetViews>
          <sheetView tabSelected="1" />
        </sheetViews>
        <cols>
          <col min="1" max="1" width="10" />
        </cols>
        <sheetData>
          <row r="1">
            <c r="A1" t="n"><v>100</v></c>
          </row>
        </sheetData>
        <mergeCells>
          <mergeCell ref="B2:C3" />
        </mergeCells>
      </worksheet>
    `);
    const ws = parseWorksheet(el, context, undefined, sheetInfo);

    expect(ws.name).toBe("Sheet1");
    expect(ws.sheetId).toBe(1);
    expect(ws.state).toBe("visible");
    expect(ws.xmlPath).toBe("xl/worksheets/sheet1.xml");

    // Dimension
    expect(ws.dimension).toBeDefined();
    expect(ws.dimension!.start.col).toBe(1);
    expect(ws.dimension!.start.row).toBe(1);
    expect(ws.dimension!.end.col).toBe(3);
    expect(ws.dimension!.end.row).toBe(3);

    // Sheet view
    expect(ws.sheetView).toBeDefined();
    expect(ws.sheetView!.tabSelected).toBe(true);

    // Columns
    expect(ws.columns).toHaveLength(1);
    expect(ws.columns![0].width).toBe(10);

    // Rows
    expect(ws.rows).toHaveLength(1);
    expect(ws.rows[0].cells).toHaveLength(1);

    // Merge cells
    expect(ws.mergeCells).toHaveLength(1);
    expect(ws.mergeCells![0].start.col).toBe(2);
  });

  it("should handle minimal worksheet", () => {
    const el = parseElement(`
      <worksheet>
        <sheetData />
      </worksheet>
    `);
    const ws = parseWorksheet(el, context, undefined, sheetInfo);

    expect(ws.name).toBe("Sheet1");
    expect(ws.dimension).toBeUndefined();
    expect(ws.sheetView).toBeUndefined();
    expect(ws.columns).toEqual([]);
    expect(ws.rows).toEqual([]);
    expect(ws.mergeCells).toEqual([]);
  });

  it("should handle worksheet without sheetData", () => {
    const el = parseElement("<worksheet />");
    const ws = parseWorksheet(el, context, undefined, sheetInfo);

    expect(ws.rows).toEqual([]);
  });

  it("should handle hidden sheet state", () => {
    const hiddenSheetInfo = {
      ...sheetInfo,
      state: "hidden" as const,
    };
    const el = parseElement("<worksheet><sheetData /></worksheet>");
    const ws = parseWorksheet(el, context, undefined, hiddenSheetInfo);

    expect(ws.state).toBe("hidden");
  });

  it("should use default dimension when ref is missing", () => {
    const el = parseElement(`
      <worksheet>
        <dimension />
        <sheetData />
      </worksheet>
    `);
    const ws = parseWorksheet(el, context, undefined, sheetInfo);

    // When ref is missing, defaults to "A1"
    expect(ws.dimension).toBeDefined();
    expect(ws.dimension!.start.col).toBe(1);
    expect(ws.dimension!.start.row).toBe(1);
  });
});
