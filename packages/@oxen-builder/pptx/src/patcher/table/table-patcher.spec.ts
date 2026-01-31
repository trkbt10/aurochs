/** @file Unit tests for table patching operations */
import { createElement, createText, getChild, getChildren, getTextByPath, isXmlElement, type XmlElement } from "@oxen/xml";
import { px } from "@oxen-office/ooxml/domain/units";
import type { TextBody } from "@oxen-office/pptx/domain/text";
import type { TableRow } from "@oxen-office/pptx/domain/table/types";
import { patchTable } from "./table-patcher";

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
});
