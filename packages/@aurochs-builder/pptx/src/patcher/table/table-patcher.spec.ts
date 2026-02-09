/** @file Unit tests for table patching operations */
import {
  createElement,
  createText,
  getChild,
  getChildren,
  getTextByPath,
  isXmlElement,
  type XmlElement,
} from "@aurochs/xml";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import type { TextBody } from "@aurochs-office/pptx/domain/text";
import type { TableColumn, TableRow } from "@aurochs-office/pptx/domain/table/types";
import { addTableColumn, addTableRow, patchTable, patchTableCell } from "./table-patcher";

function textBody(text: string): TextBody {
  return {
    bodyProperties: {},
    paragraphs: [
      {
        properties: {},
        runs: [{ type: "text", text }],
      },
    ],
  };
}

function buildTable(): XmlElement {
  return createElement("a:tbl", {}, [
    createElement("a:tblPr"),
    createElement("a:tblGrid", {}, [
      createElement("a:gridCol", { w: "100" }),
      createElement("a:gridCol", { w: "100" }),
    ]),
    createElement("a:tr", { h: "100" }, [
      createElement("a:tc", {}, [
        createElement("a:txBody", {}, [
          createElement("a:bodyPr"),
          createElement("a:lstStyle"),
          createElement("a:p", {}, [createElement("a:r", {}, [createElement("a:t", {}, [createText("R0C0")])])]),
        ]),
        createElement("a:tcPr"),
      ]),
      createElement("a:tc", {}, [
        createElement("a:txBody", {}, [
          createElement("a:bodyPr"),
          createElement("a:lstStyle"),
          createElement("a:p", {}, [createElement("a:r", {}, [createElement("a:t", {}, [createText("R0C1")])])]),
        ]),
        createElement("a:tcPr"),
      ]),
    ]),
    createElement("a:tr", { h: "100" }, [
      createElement("a:tc", {}, [
        createElement("a:txBody", {}, [
          createElement("a:bodyPr"),
          createElement("a:lstStyle"),
          createElement("a:p", {}, [createElement("a:r", {}, [createElement("a:t", {}, [createText("R1C0")])])]),
        ]),
        createElement("a:tcPr"),
      ]),
      createElement("a:tc", {}, [
        createElement("a:txBody", {}, [
          createElement("a:bodyPr"),
          createElement("a:lstStyle"),
          createElement("a:p", {}, [createElement("a:r", {}, [createElement("a:t", {}, [createText("R1C1")])])]),
        ]),
        createElement("a:tcPr"),
      ]),
    ]),
  ]);
}

function getCellText(table: XmlElement, row: number, col: number): string | undefined {
  const rows = getChildren(table, "a:tr");
  const rowEl = rows[row];
  if (!rowEl) {
    throw new Error("test: missing row");
  }
  const cells = getChildren(rowEl, "a:tc");
  const cell = cells[col];
  if (!cell) {
    throw new Error("test: missing cell");
  }
  return getTextByPath(cell, ["a:txBody", "a:p", "a:r", "a:t"]);
}

describe("patchTable", () => {
  it("updates cell content", () => {
    const tbl = buildTable();
    const patched = patchTable(tbl, [{ type: "cell", row: 0, col: 1, content: textBody("UPDATED") }]);
    expect(getCellText(patched, 0, 1)).toBe("UPDATED");
  });

  it("adds a row", () => {
    const tbl = buildTable();
    const newRow: TableRow = {
      height: px(10),
      cells: [
        { properties: {}, textBody: textBody("N0") },
        { properties: {}, textBody: textBody("N1") },
      ],
    };

    const patched = patchTable(tbl, [{ type: "addRow", row: newRow }]);
    expect(getChildren(patched, "a:tr")).toHaveLength(3);
    expect(getCellText(patched, 2, 0)).toBe("N0");
  });

  it("removes a row", () => {
    const tbl = buildTable();
    const patched = patchTable(tbl, [{ type: "removeRow", rowIndex: 0 }]);
    expect(getChildren(patched, "a:tr")).toHaveLength(1);
    expect(getCellText(patched, 0, 0)).toBe("R1C0");
  });

  it("adds a column", () => {
    const tbl = buildTable();
    const patched = patchTable(tbl, [{ type: "addColumn", column: { width: px(10) }, position: 1 }]);
    const gridCols = getChildren(getChild(patched, "a:tblGrid")!, "a:gridCol");
    expect(gridCols).toHaveLength(3);

    const rows = getChildren(patched, "a:tr");
    for (const row of rows) {
      expect(getChildren(row, "a:tc")).toHaveLength(3);
    }
  });

  it("removes a column", () => {
    const tbl = buildTable();
    const patched = patchTable(tbl, [{ type: "removeColumn", colIndex: 0 }]);
    const gridCols = getChildren(getChild(patched, "a:tblGrid")!, "a:gridCol");
    expect(gridCols).toHaveLength(1);

    const rows = getChildren(patched, "a:tr");
    for (const row of rows) {
      expect(getChildren(row, "a:tc")).toHaveLength(1);
    }
  });

  it("merges and splits a cell range", () => {
    const tbl = buildTable();
    const merged = patchTable(tbl, [{ type: "merge", startRow: 0, startCol: 0, rowSpan: 2, colSpan: 2 }]);

    const firstRow = getChildren(merged, "a:tr")[0];
    const topLeft = firstRow ? getChildren(firstRow, "a:tc")[0] : undefined;
    if (!topLeft) {
      throw new Error("test: missing top-left");
    }
    const tcPr = getChild(topLeft, "a:tcPr");
    expect(tcPr?.attrs.gridSpan).toBe("2");
    expect(tcPr?.attrs.rowSpan).toBe("2");

    const split = patchTable(merged, [{ type: "split", startRow: 0, startCol: 0, rowSpan: 2, colSpan: 2 }]);
    const splitFirstRow = getChildren(split, "a:tr")[0];
    const splitTopLeft = splitFirstRow ? getChildren(splitFirstRow, "a:tc")[0] : undefined;
    if (!splitTopLeft || !isXmlElement(splitTopLeft)) {
      throw new Error("test: missing split top-left");
    }
    const splitTcPr = getChild(splitTopLeft, "a:tcPr");
    expect(splitTcPr?.attrs.gridSpan).toBeUndefined();
    expect(splitTcPr?.attrs.rowSpan).toBeUndefined();
    expect(splitTcPr?.attrs.hMerge).toBeUndefined();
    expect(splitTcPr?.attrs.vMerge).toBeUndefined();
  });

  it("throws when element is not a:tbl", () => {
    const el = createElement("a:other");
    expect(() => patchTable(el, [])).toThrow("expected a:tbl");
  });

  it("throws when row out of range (cell change)", () => {
    const tbl = buildTable();
    expect(() => patchTable(tbl, [{ type: "cell", row: 5, col: 0, content: textBody("X") }])).toThrow(
      "row out of range",
    );
  });

  it("throws when col out of range (cell change)", () => {
    const tbl = buildTable();
    expect(() => patchTable(tbl, [{ type: "cell", row: 0, col: 5, content: textBody("X") }])).toThrow(
      "col out of range",
    );
  });

  it("adds a row at a specific position", () => {
    const tbl = buildTable();
    const newRow: TableRow = {
      height: px(10),
      cells: [
        { properties: {}, textBody: textBody("INS0") },
        { properties: {}, textBody: textBody("INS1") },
      ],
    };
    const patched = patchTable(tbl, [{ type: "addRow", row: newRow, position: 1 }]);
    expect(getChildren(patched, "a:tr")).toHaveLength(3);
    expect(getCellText(patched, 1, 0)).toBe("INS0");
  });

  it("adds a column at default position (appends)", () => {
    const tbl = buildTable();
    const col: TableColumn = { width: px(50) };
    const patched = patchTable(tbl, [{ type: "addColumn", column: col }]);
    const gridCols = getChildren(getChild(patched, "a:tblGrid")!, "a:gridCol");
    expect(gridCols).toHaveLength(3);
  });

  it("throws when addRow cell count does not match column count", () => {
    const tbl = buildTable();
    const newRow: TableRow = {
      height: px(10),
      cells: [{ properties: {}, textBody: textBody("only one") }],
    };
    expect(() => patchTable(tbl, [{ type: "addRow", row: newRow }])).toThrow("must match column count");
  });

  it("throws when addRow position is out of range", () => {
    const tbl = buildTable();
    const newRow: TableRow = {
      height: px(10),
      cells: [
        { properties: {}, textBody: textBody("A") },
        { properties: {}, textBody: textBody("B") },
      ],
    };
    expect(() => patchTable(tbl, [{ type: "addRow", row: newRow, position: -1 }])).toThrow("position out of range");
  });

  it("throws when addColumn position is out of range", () => {
    const tbl = buildTable();
    const col: TableColumn = { width: px(50) };
    expect(() => patchTable(tbl, [{ type: "addColumn", column: col, position: -1 }])).toThrow(
      "position out of range",
    );
  });

  it("throws when removeRow rowIndex out of range (negative)", () => {
    const tbl = buildTable();
    expect(() => patchTable(tbl, [{ type: "removeRow", rowIndex: -1 }])).toThrow("rowIndex out of range");
  });

  it("throws when removeRow rowIndex out of range (too large)", () => {
    const tbl = buildTable();
    expect(() => patchTable(tbl, [{ type: "removeRow", rowIndex: 10 }])).toThrow("rowIndex out of range");
  });

  it("throws when removeColumn colIndex out of range (negative)", () => {
    const tbl = buildTable();
    expect(() => patchTable(tbl, [{ type: "removeColumn", colIndex: -1 }])).toThrow("colIndex out of range");
  });

  it("throws when removeColumn colIndex out of range (too large)", () => {
    const tbl = buildTable();
    expect(() => patchTable(tbl, [{ type: "removeColumn", colIndex: 10 }])).toThrow("colIndex out of range");
  });

  it("throws when merge rowSpan < 1", () => {
    const tbl = buildTable();
    expect(() => patchTable(tbl, [{ type: "merge", startRow: 0, startCol: 0, rowSpan: 0, colSpan: 1 }])).toThrow(
      "rowSpan and colSpan must be >= 1",
    );
  });

  it("throws when merge start position is negative", () => {
    const tbl = buildTable();
    expect(() => patchTable(tbl, [{ type: "merge", startRow: -1, startCol: 0, rowSpan: 1, colSpan: 1 }])).toThrow(
      "startRow/startCol must be >= 0",
    );
  });

  it("throws when merge row range out of bounds", () => {
    const tbl = buildTable();
    expect(() => patchTable(tbl, [{ type: "merge", startRow: 0, startCol: 0, rowSpan: 10, colSpan: 1 }])).toThrow(
      "row range out of bounds",
    );
  });

  it("throws when merge column range out of bounds", () => {
    const tbl = buildTable();
    expect(() => patchTable(tbl, [{ type: "merge", startRow: 0, startCol: 0, rowSpan: 1, colSpan: 10 }])).toThrow(
      "column range out of bounds",
    );
  });

  it("throws when split rowSpan < 1", () => {
    const tbl = buildTable();
    expect(() => patchTable(tbl, [{ type: "split", startRow: 0, startCol: 0, rowSpan: 0, colSpan: 1 }])).toThrow(
      "rowSpan and colSpan must be >= 1",
    );
  });

  it("throws when split start position is negative", () => {
    const tbl = buildTable();
    expect(() => patchTable(tbl, [{ type: "split", startRow: -1, startCol: 0, rowSpan: 1, colSpan: 1 }])).toThrow(
      "startRow/startCol must be >= 0",
    );
  });

  it("throws when split row range out of bounds", () => {
    const tbl = buildTable();
    expect(() => patchTable(tbl, [{ type: "split", startRow: 0, startCol: 0, rowSpan: 10, colSpan: 1 }])).toThrow(
      "row range out of bounds",
    );
  });

  it("throws when split column range out of bounds", () => {
    const tbl = buildTable();
    expect(() => patchTable(tbl, [{ type: "split", startRow: 0, startCol: 0, rowSpan: 1, colSpan: 10 }])).toThrow(
      "column range out of bounds",
    );
  });

  it("serializes cell with id", () => {
    const tbl = buildTable();
    const newRow: TableRow = {
      height: px(10),
      cells: [
        { id: "cell-1", properties: {}, textBody: textBody("A") },
        { id: "cell-2", properties: {}, textBody: textBody("B") },
      ],
    };
    const patched = patchTable(tbl, [{ type: "addRow", row: newRow }]);
    const rows = getChildren(patched, "a:tr");
    const lastRow = rows[rows.length - 1]!;
    const firstCell = getChildren(lastRow, "a:tc")[0]!;
    expect(firstCell.attrs.id).toBe("cell-1");
  });

  it("serializes cell without textBody (creates empty txBody)", () => {
    const tbl = buildTable();
    const newRow: TableRow = {
      height: px(10),
      cells: [{ properties: {} }, { properties: {} }],
    };
    const patched = patchTable(tbl, [{ type: "addRow", row: newRow }]);
    const rows = getChildren(patched, "a:tr");
    const lastRow = rows[rows.length - 1]!;
    const firstCell = getChildren(lastRow, "a:tc")[0]!;
    const txBody = getChild(firstCell, "a:txBody");
    expect(txBody).toBeDefined();
    expect(getChild(txBody!, "a:bodyPr")).toBeDefined();
  });

  it("serializes cell with rowSpan/colSpan/hMerge/vMerge properties", () => {
    const tbl = buildTable();
    const newRow: TableRow = {
      height: px(10),
      cells: [
        { properties: { rowSpan: 2, colSpan: 3, horizontalMerge: true, verticalMerge: true } },
        { properties: {} },
      ],
    };
    const patched = patchTable(tbl, [{ type: "addRow", row: newRow }]);
    const rows = getChildren(patched, "a:tr");
    const lastRow = rows[rows.length - 1]!;
    const firstCell = getChildren(lastRow, "a:tc")[0]!;
    const tcPr = getChild(firstCell, "a:tcPr");
    expect(tcPr).toBeDefined();
    expect(tcPr!.attrs.rowSpan).toBe("2");
    expect(tcPr!.attrs.gridSpan).toBe("3");
    expect(tcPr!.attrs.hMerge).toBe("1");
    expect(tcPr!.attrs.vMerge).toBe("1");
  });

  it("merges a single-row multi-column range (hMerge only)", () => {
    const tbl = buildTable();
    const merged = patchTable(tbl, [{ type: "merge", startRow: 0, startCol: 0, rowSpan: 1, colSpan: 2 }]);
    const firstRow = getChildren(merged, "a:tr")[0]!;
    const topLeft = getChildren(firstRow, "a:tc")[0]!;
    const topLeftPr = getChild(topLeft, "a:tcPr");
    expect(topLeftPr?.attrs.gridSpan).toBe("2");
    expect(topLeftPr?.attrs.rowSpan).toBeUndefined();

    const topRight = getChildren(firstRow, "a:tc")[1]!;
    const topRightPr = getChild(topRight, "a:tcPr");
    expect(topRightPr?.attrs.hMerge).toBe("1");
  });

  it("merges a multi-row single-column range (vMerge only)", () => {
    const tbl = buildTable();
    const merged = patchTable(tbl, [{ type: "merge", startRow: 0, startCol: 0, rowSpan: 2, colSpan: 1 }]);
    const firstRow = getChildren(merged, "a:tr")[0]!;
    const topLeft = getChildren(firstRow, "a:tc")[0]!;
    const topLeftPr = getChild(topLeft, "a:tcPr");
    expect(topLeftPr?.attrs.rowSpan).toBe("2");
    expect(topLeftPr?.attrs.gridSpan).toBeUndefined();

    const secondRow = getChildren(merged, "a:tr")[1]!;
    const bottomLeft = getChildren(secondRow, "a:tc")[0]!;
    const bottomLeftPr = getChild(bottomLeft, "a:tcPr");
    expect(bottomLeftPr?.attrs.vMerge).toBe("1");
  });

  it("returns unchanged table for empty changes", () => {
    const tbl = buildTable();
    const patched = patchTable(tbl, []);
    expect(patched).toBe(tbl);
  });

  it("inserts row into table with no existing rows", () => {
    const tbl = createElement("a:tbl", {}, [
      createElement("a:tblGrid", {}, [createElement("a:gridCol", { w: "100" })]),
    ]);
    const newRow: TableRow = {
      height: px(10),
      cells: [{ properties: {}, textBody: textBody("first") }],
    };
    const patched = addTableRow(tbl, newRow);
    expect(getChildren(patched, "a:tr")).toHaveLength(1);
  });
});

describe("patchTableCell", () => {
  it("throws when element is not a:tc", () => {
    const el = createElement("a:other");
    expect(() => patchTableCell(el, textBody("X"))).toThrow("expected a:tc");
  });

  it("patches cell that already has a:txBody", () => {
    const cell = createElement("a:tc", {}, [
      createElement("a:txBody", {}, [createElement("a:bodyPr"), createElement("a:p")]),
      createElement("a:tcPr"),
    ]);
    const patched = patchTableCell(cell, textBody("New"));
    const txBody = getChild(patched, "a:txBody");
    expect(txBody).toBeDefined();
    expect(getTextByPath(patched, ["a:txBody", "a:p", "a:r", "a:t"])).toBe("New");
  });

  it("inserts txBody before a:tcPr when cell has no txBody", () => {
    const cell = createElement("a:tc", {}, [createElement("a:tcPr")]);
    const patched = patchTableCell(cell, textBody("Inserted"));
    const children = patched.children.filter(isXmlElement);
    expect(children[0]!.name).toBe("a:txBody");
    expect(children[1]!.name).toBe("a:tcPr");
  });

  it("prepends txBody when cell has no txBody and no tcPr", () => {
    const cell = createElement("a:tc", {}, [createElement("a:extLst")]);
    const patched = patchTableCell(cell, textBody("Prepended"));
    const children = patched.children.filter(isXmlElement);
    expect(children[0]!.name).toBe("a:txBody");
  });
});

describe("addTableRow", () => {
  it("throws when element is not a:tbl", () => {
    const el = createElement("a:other");
    const newRow: TableRow = { height: px(10), cells: [] };
    expect(() => addTableRow(el, newRow)).toThrow("expected a:tbl");
  });

  it("throws when table is missing a:tblGrid", () => {
    const tbl = createElement("a:tbl", {}, []);
    const newRow: TableRow = { height: px(10), cells: [] };
    expect(() => addTableRow(tbl, newRow)).toThrow("missing required child");
  });
});

describe("addTableColumn", () => {
  it("throws when element is not a:tbl", () => {
    const el = createElement("a:other");
    const col: TableColumn = { width: px(10) };
    expect(() => addTableColumn(el, col)).toThrow("expected a:tbl");
  });

  it("appends column at end by default", () => {
    const tbl = buildTable();
    const col: TableColumn = { width: px(50) };
    const patched = addTableColumn(tbl, col);
    const gridCols = getChildren(getChild(patched, "a:tblGrid")!, "a:gridCol");
    expect(gridCols).toHaveLength(3);
  });

  it("inserts column at position 0", () => {
    const tbl = buildTable();
    const col: TableColumn = { width: px(50) };
    const patched = addTableColumn(tbl, col, 0);
    const gridCols = getChildren(getChild(patched, "a:tblGrid")!, "a:gridCol");
    expect(gridCols).toHaveLength(3);
    // All rows should have 3 cells
    const rows = getChildren(patched, "a:tr");
    for (const row of rows) {
      expect(getChildren(row, "a:tc")).toHaveLength(3);
    }
  });

  it("throws when position is out of range (too large)", () => {
    const tbl = buildTable();
    const col: TableColumn = { width: px(50) };
    expect(() => addTableColumn(tbl, col, 100)).toThrow("position out of range");
  });

  it("preserves text nodes in table children when adding column", () => {
    const tbl = createElement("a:tbl", {}, [
      createText("\n"),
      createElement("a:tblPr"),
      createText("\n"),
      createElement("a:tblGrid", {}, [createElement("a:gridCol", { w: "100" })]),
      createText("\n"),
      createElement("a:tr", { h: "100" }, [
        createElement("a:tc", {}, [
          createElement("a:txBody", {}, [createElement("a:bodyPr"), createElement("a:p")]),
          createElement("a:tcPr"),
        ]),
      ]),
      createText("\n"),
    ]);
    const col: TableColumn = { width: px(50) };
    const patched = addTableColumn(tbl, col);
    const gridCols = getChildren(getChild(patched, "a:tblGrid")!, "a:gridCol");
    expect(gridCols).toHaveLength(2);
  });

  it("preserves text nodes in table children when removing column", () => {
    const tbl = createElement("a:tbl", {}, [
      createText("\n"),
      createElement("a:tblPr"),
      createText("\n"),
      createElement("a:tblGrid", {}, [
        createElement("a:gridCol", { w: "100" }),
        createElement("a:gridCol", { w: "100" }),
      ]),
      createText("\n"),
      createElement("a:tr", { h: "100" }, [
        createElement("a:tc", {}, [
          createElement("a:txBody", {}, [createElement("a:bodyPr"), createElement("a:p")]),
          createElement("a:tcPr"),
        ]),
        createElement("a:tc", {}, [
          createElement("a:txBody", {}, [createElement("a:bodyPr"), createElement("a:p")]),
          createElement("a:tcPr"),
        ]),
      ]),
      createText("\n"),
    ]);
    const patched = patchTable(tbl, [{ type: "removeColumn", colIndex: 0 }]);
    const gridCols = getChildren(getChild(patched, "a:tblGrid")!, "a:gridCol");
    expect(gridCols).toHaveLength(1);
  });
});

describe("merge/split with cells missing a:tcPr", () => {
  it("merge adds a:tcPr when cell has none", () => {
    const tbl = createElement("a:tbl", {}, [
      createElement("a:tblGrid", {}, [
        createElement("a:gridCol", { w: "100" }),
        createElement("a:gridCol", { w: "100" }),
      ]),
      createElement("a:tr", { h: "100" }, [
        createElement("a:tc", {}, [createElement("a:txBody", {}, [createElement("a:bodyPr"), createElement("a:p")])]),
        createElement("a:tc", {}, [createElement("a:txBody", {}, [createElement("a:bodyPr"), createElement("a:p")])]),
      ]),
    ]);
    const merged = patchTable(tbl, [{ type: "merge", startRow: 0, startCol: 0, rowSpan: 1, colSpan: 2 }]);
    const row = getChildren(merged, "a:tr")[0]!;
    const topLeft = getChildren(row, "a:tc")[0]!;
    const tcPr = getChild(topLeft, "a:tcPr");
    expect(tcPr).toBeDefined();
    expect(tcPr!.attrs.gridSpan).toBe("2");
  });

  it("merge with non-tc children in row (e.g. text nodes)", () => {
    const tbl = createElement("a:tbl", {}, [
      createElement("a:tblGrid", {}, [
        createElement("a:gridCol", { w: "100" }),
        createElement("a:gridCol", { w: "100" }),
      ]),
      createElement("a:tr", { h: "100" }, [
        createText("\n"),
        createElement("a:tc", {}, [
          createElement("a:txBody", {}, [createElement("a:bodyPr"), createElement("a:p")]),
          createElement("a:tcPr"),
        ]),
        createText("\n"),
        createElement("a:tc", {}, [
          createElement("a:txBody", {}, [createElement("a:bodyPr"), createElement("a:p")]),
          createElement("a:tcPr"),
        ]),
        createText("\n"),
      ]),
    ]);
    const merged = patchTable(tbl, [{ type: "merge", startRow: 0, startCol: 0, rowSpan: 1, colSpan: 2 }]);
    const row = getChildren(merged, "a:tr")[0]!;
    const topLeft = getChildren(row, "a:tc")[0]!;
    const tcPr = getChild(topLeft, "a:tcPr");
    expect(tcPr).toBeDefined();
    expect(tcPr!.attrs.gridSpan).toBe("2");
  });

  it("split with non-tc children in row (e.g. text nodes)", () => {
    const tbl = createElement("a:tbl", {}, [
      createElement("a:tblGrid", {}, [
        createElement("a:gridCol", { w: "100" }),
        createElement("a:gridCol", { w: "100" }),
      ]),
      createElement("a:tr", { h: "100" }, [
        createText("\n"),
        createElement("a:tc", {}, [
          createElement("a:txBody", {}, [createElement("a:bodyPr"), createElement("a:p")]),
          createElement("a:tcPr", { gridSpan: "2" }),
        ]),
        createText("\n"),
        createElement("a:tc", {}, [
          createElement("a:txBody", {}, [createElement("a:bodyPr"), createElement("a:p")]),
          createElement("a:tcPr", { hMerge: "1" }),
        ]),
        createText("\n"),
      ]),
    ]);
    const split = patchTable(tbl, [{ type: "split", startRow: 0, startCol: 0, rowSpan: 1, colSpan: 2 }]);
    const row = getChildren(split, "a:tr")[0]!;
    const topLeft = getChildren(row, "a:tc")[0]!;
    const tcPr = getChild(topLeft, "a:tcPr");
    expect(tcPr?.attrs.gridSpan).toBeUndefined();
    expect(tcPr?.attrs.hMerge).toBeUndefined();
  });
});
