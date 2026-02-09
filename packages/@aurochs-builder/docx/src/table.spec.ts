/**
 * @file Tests for DOCX table serialization
 */
import { getChild, getChildren } from "@aurochs/xml";
import type {
  DocxTableGrid,
  DocxTableCell,
  DocxTableRow,
  DocxTable,
  DocxTableBorders,
  DocxCellBorders,
  DocxTableCellSpacing,
} from "@aurochs-office/docx/domain/table";
import type { TableWidth, TableCellMargins } from "@aurochs-office/ooxml/domain/table";
import {
  serializeTableWidth,
  serializeTableBorders,
  serializeTableCellMargins,
  serializeTableProperties,
  serializeTableGrid,
  serializeTableRowProperties,
  serializeTableCellBorders,
  serializeTableCellProperties,
  serializeTableCell,
  serializeTableRow,
  serializeTable,
} from "./table";

// =============================================================================
// serializeTableWidth
// =============================================================================

describe("serializeTableWidth", () => {
  it("serializes width with value and type", () => {
    const width: TableWidth = { value: 5000, type: "pct" };
    const el = serializeTableWidth(width, "tblW");
    expect(el.name).toBe("w:tblW");
    expect(el.attrs["w:w"]).toBe("5000");
    expect(el.attrs["w:type"]).toBe("pct");
  });

  it("serializes auto width", () => {
    const width: TableWidth = { type: "auto" } as TableWidth;
    const el = serializeTableWidth(width, "tcW");
    expect(el.name).toBe("w:tcW");
    expect(el.attrs["w:w"]).toBeUndefined();
    expect(el.attrs["w:type"]).toBe("auto");
  });
});

// =============================================================================
// serializeTableBorders
// =============================================================================

describe("serializeTableBorders", () => {
  it("serializes all 6 border edges", () => {
    const edge = { val: "single", sz: 4, space: 0, color: "000000" };
    const borders: DocxTableBorders = {
      top: edge, left: edge, bottom: edge, right: edge,
      insideH: edge, insideV: edge,
    };
    const el = serializeTableBorders(borders);
    expect(el.name).toBe("w:tblBorders");
    expect(getChild(el, "w:top")).toBeDefined();
    expect(getChild(el, "w:left")).toBeDefined();
    expect(getChild(el, "w:bottom")).toBeDefined();
    expect(getChild(el, "w:right")).toBeDefined();
    expect(getChild(el, "w:insideH")).toBeDefined();
    expect(getChild(el, "w:insideV")).toBeDefined();
  });

  it("serializes partial borders", () => {
    const el = serializeTableBorders({ top: { val: "single" } } as DocxTableBorders);
    expect(getChild(el, "w:top")).toBeDefined();
    expect(getChild(el, "w:insideH")).toBeUndefined();
  });
});

// =============================================================================
// serializeTableCellMargins
// =============================================================================

describe("serializeTableCellMargins", () => {
  it("serializes all margins with dxa type", () => {
    const margins: TableCellMargins = { top: 55, left: 108, bottom: 55, right: 108 };
    const el = serializeTableCellMargins(margins, "tblCellMar");
    expect(el.name).toBe("w:tblCellMar");
    const top = getChild(el, "w:top")!;
    expect(top.attrs["w:w"]).toBe("55");
    expect(top.attrs["w:type"]).toBe("dxa");
    expect(getChild(el, "w:left")?.attrs["w:w"]).toBe("108");
    expect(getChild(el, "w:bottom")?.attrs["w:w"]).toBe("55");
    expect(getChild(el, "w:right")?.attrs["w:w"]).toBe("108");
  });

  it("omits undefined margins", () => {
    const margins: TableCellMargins = { left: 108 } as TableCellMargins;
    const el = serializeTableCellMargins(margins, "tcMar");
    expect(el.name).toBe("w:tcMar");
    expect(getChild(el, "w:left")).toBeDefined();
    expect(getChild(el, "w:top")).toBeUndefined();
  });
});

// =============================================================================
// serializeTableProperties
// =============================================================================

describe("serializeTableProperties", () => {
  it("returns undefined for undefined", () => {
    expect(serializeTableProperties(undefined)).toBeUndefined();
  });

  it("returns undefined for empty props", () => {
    expect(serializeTableProperties({})).toBeUndefined();
  });

  it("serializes tblStyle", () => {
    const el = serializeTableProperties({ tblStyle: "TableGrid" })!;
    expect(getChild(el, "w:tblStyle")?.attrs["w:val"]).toBe("TableGrid");
  });

  it("serializes tblpPr with all attributes", () => {
    const el = serializeTableProperties({
      tblpPr: {
        leftFromText: 180,
        rightFromText: 180,
        topFromText: 0,
        bottomFromText: 0,
        vertAnchor: "text",
        horzAnchor: "margin",
        tblpX: 720,
        tblpXSpec: "center",
        tblpY: 360,
        tblpYSpec: "top",
      },
    })!;
    const tblpPr = getChild(el, "w:tblpPr")!;
    expect(tblpPr.attrs["w:leftFromText"]).toBe("180");
    expect(tblpPr.attrs["w:rightFromText"]).toBe("180");
    expect(tblpPr.attrs["w:topFromText"]).toBe("0");
    expect(tblpPr.attrs["w:bottomFromText"]).toBe("0");
    expect(tblpPr.attrs["w:vertAnchor"]).toBe("text");
    expect(tblpPr.attrs["w:horzAnchor"]).toBe("margin");
    expect(tblpPr.attrs["w:tblpX"]).toBe("720");
    expect(tblpPr.attrs["w:tblpXSpec"]).toBe("center");
    expect(tblpPr.attrs["w:tblpY"]).toBe("360");
    expect(tblpPr.attrs["w:tblpYSpec"]).toBe("top");
  });

  it("serializes bidiVisual", () => {
    const el = serializeTableProperties({ bidiVisual: true })!;
    expect(getChild(el, "w:bidiVisual")).toBeDefined();
  });

  it("serializes tblOverlap", () => {
    const el = serializeTableProperties({ tblOverlap: "never" })!;
    expect(getChild(el, "w:tblOverlap")?.attrs["w:val"]).toBe("never");
  });

  it("serializes tblW", () => {
    const el = serializeTableProperties({ tblW: { value: 5000, type: "pct" } })!;
    const tblW = getChild(el, "w:tblW")!;
    expect(tblW.attrs["w:w"]).toBe("5000");
    expect(tblW.attrs["w:type"]).toBe("pct");
  });

  it("serializes jc", () => {
    const el = serializeTableProperties({ jc: "center" })!;
    expect(getChild(el, "w:jc")?.attrs["w:val"]).toBe("center");
  });

  it("serializes tblCellSpacing", () => {
    const el = serializeTableProperties({
      tblCellSpacing: { w: 15, type: "dxa" } as DocxTableCellSpacing,
    })!;
    const sp = getChild(el, "w:tblCellSpacing")!;
    expect(sp.attrs["w:w"]).toBe("15");
  });

  it("serializes tblInd", () => {
    const el = serializeTableProperties({ tblInd: { value: 108, type: "dxa" } })!;
    expect(getChild(el, "w:tblInd")?.attrs["w:w"]).toBe("108");
  });

  it("serializes tblBorders", () => {
    const el = serializeTableProperties({
      tblBorders: { top: { val: "single" } } as DocxTableBorders,
    })!;
    expect(getChild(el, "w:tblBorders")).toBeDefined();
  });

  it("serializes shd", () => {
    const el = serializeTableProperties({
      shd: { val: "clear", fill: "E0E0E0" },
    })!;
    expect(getChild(el, "w:shd")?.attrs["w:fill"]).toBe("E0E0E0");
  });

  it("serializes tblLayout", () => {
    const el = serializeTableProperties({ tblLayout: "fixed" })!;
    expect(getChild(el, "w:tblLayout")?.attrs["w:type"]).toBe("fixed");
  });

  it("serializes tblCellMar", () => {
    const el = serializeTableProperties({
      tblCellMar: { top: 0, left: 108, bottom: 0, right: 108 },
    })!;
    expect(getChild(el, "w:tblCellMar")).toBeDefined();
  });

  it("serializes tblLook with all flags", () => {
    const el = serializeTableProperties({
      tblLook: {
        firstRow: true,
        lastRow: false,
        firstColumn: true,
        lastColumn: false,
        noHBand: true,
        noVBand: false,
      },
    })!;
    const look = getChild(el, "w:tblLook")!;
    expect(look.attrs["w:firstRow"]).toBe("1");
    expect(look.attrs["w:lastRow"]).toBe("0");
    expect(look.attrs["w:firstColumn"]).toBe("1");
    expect(look.attrs["w:lastColumn"]).toBe("0");
    expect(look.attrs["w:noHBand"]).toBe("1");
    expect(look.attrs["w:noVBand"]).toBe("0");
  });

  it("serializes tblCaption and tblDescription", () => {
    const el = serializeTableProperties({
      tblCaption: "Table 1",
      tblDescription: "Summary of data",
    })!;
    expect(getChild(el, "w:tblCaption")?.attrs["w:val"]).toBe("Table 1");
    expect(getChild(el, "w:tblDescription")?.attrs["w:val"]).toBe("Summary of data");
  });
});

// =============================================================================
// serializeTableGrid
// =============================================================================

describe("serializeTableGrid", () => {
  it("serializes grid columns", () => {
    const grid: DocxTableGrid = { columns: [{ width: 2880 }, { width: 2880 }, { width: 2880 }] };
    const el = serializeTableGrid(grid);
    expect(el.name).toBe("w:tblGrid");
    const cols = getChildren(el, "w:gridCol");
    expect(cols).toHaveLength(3);
    expect(cols[0].attrs["w:w"]).toBe("2880");
  });

  it("serializes empty grid", () => {
    const el = serializeTableGrid({ columns: [] });
    expect(el.name).toBe("w:tblGrid");
    expect(el.children).toHaveLength(0);
  });
});

// =============================================================================
// serializeTableRowProperties
// =============================================================================

describe("serializeTableRowProperties", () => {
  it("returns undefined for undefined", () => {
    expect(serializeTableRowProperties(undefined)).toBeUndefined();
  });

  it("returns undefined for empty", () => {
    expect(serializeTableRowProperties({})).toBeUndefined();
  });

  it("serializes gridBefore and gridAfter", () => {
    const el = serializeTableRowProperties({ gridBefore: 1, gridAfter: 2 })!;
    expect(getChild(el, "w:gridBefore")?.attrs["w:val"]).toBe("1");
    expect(getChild(el, "w:gridAfter")?.attrs["w:val"]).toBe("2");
  });

  it("serializes wBefore and wAfter", () => {
    const el = serializeTableRowProperties({
      wBefore: { value: 720, type: "dxa" },
      wAfter: { value: 360, type: "dxa" },
    })!;
    expect(getChild(el, "w:wBefore")?.attrs["w:w"]).toBe("720");
    expect(getChild(el, "w:wAfter")?.attrs["w:w"]).toBe("360");
  });

  it("serializes trHeight", () => {
    const el = serializeTableRowProperties({
      trHeight: { val: 720, hRule: "atLeast" },
    })!;
    const h = getChild(el, "w:trHeight")!;
    expect(h.attrs["w:val"]).toBe("720");
    expect(h.attrs["w:hRule"]).toBe("atLeast");
  });

  it("serializes tblHeader, jc, hidden, cantSplit", () => {
    const el = serializeTableRowProperties({
      tblHeader: true,
      jc: "center",
      hidden: false,
      cantSplit: true,
    })!;
    expect(getChild(el, "w:tblHeader")).toBeDefined();
    expect(getChild(el, "w:jc")?.attrs["w:val"]).toBe("center");
    expect(getChild(el, "w:hidden")?.attrs["w:val"]).toBe("0");
    expect(getChild(el, "w:cantSplit")).toBeDefined();
  });
});

// =============================================================================
// serializeTableCellBorders
// =============================================================================

describe("serializeTableCellBorders", () => {
  it("serializes all 8 edges including diagonals", () => {
    const edge = { val: "single", sz: 4, color: "000000" };
    const borders: DocxCellBorders = {
      top: edge, left: edge, bottom: edge, right: edge,
      insideH: edge, insideV: edge,
      tl2br: edge, tr2bl: edge,
    };
    const el = serializeTableCellBorders(borders);
    expect(el.name).toBe("w:tcBorders");
    expect(getChild(el, "w:top")).toBeDefined();
    expect(getChild(el, "w:tl2br")).toBeDefined();
    expect(getChild(el, "w:tr2bl")).toBeDefined();
  });

  it("serializes border with shadow and frame", () => {
    const borders: DocxCellBorders = {
      top: { val: "single", shadow: true, frame: false },
    } as DocxCellBorders;
    const el = serializeTableCellBorders(borders);
    const top = getChild(el, "w:top")!;
    expect(top.attrs["w:shadow"]).toBe("1");
    expect(top.attrs["w:frame"]).toBe("0");
  });
});

// =============================================================================
// serializeTableCellProperties
// =============================================================================

describe("serializeTableCellProperties", () => {
  it("returns undefined for undefined", () => {
    expect(serializeTableCellProperties(undefined)).toBeUndefined();
  });

  it("returns undefined for empty", () => {
    expect(serializeTableCellProperties({})).toBeUndefined();
  });

  it("serializes tcW", () => {
    const el = serializeTableCellProperties({
      tcW: { value: 2880, type: "dxa" },
    })!;
    const tcW = getChild(el, "w:tcW")!;
    expect(tcW.attrs["w:w"]).toBe("2880");
    expect(tcW.attrs["w:type"]).toBe("dxa");
  });

  it("serializes gridSpan", () => {
    const el = serializeTableCellProperties({ gridSpan: 3 })!;
    expect(getChild(el, "w:gridSpan")?.attrs["w:val"]).toBe("3");
  });

  it("serializes hMerge and vMerge", () => {
    const el = serializeTableCellProperties({ hMerge: "restart", vMerge: "continue" })!;
    expect(getChild(el, "w:hMerge")?.attrs["w:val"]).toBe("restart");
    expect(getChild(el, "w:vMerge")?.attrs["w:val"]).toBe("continue");
  });

  it("serializes cell borders", () => {
    const el = serializeTableCellProperties({
      tcBorders: { top: { val: "single" } } as DocxCellBorders,
    })!;
    expect(getChild(el, "w:tcBorders")).toBeDefined();
  });

  it("serializes shading", () => {
    const el = serializeTableCellProperties({
      shd: { val: "clear", fill: "FFFF00" },
    })!;
    expect(getChild(el, "w:shd")?.attrs["w:fill"]).toBe("FFFF00");
  });

  it("serializes noWrap, tcFitText, hideMark", () => {
    const el = serializeTableCellProperties({
      noWrap: true,
      tcFitText: false,
      hideMark: true,
    })!;
    expect(getChild(el, "w:noWrap")).toBeDefined();
    expect(getChild(el, "w:tcFitText")?.attrs["w:val"]).toBe("0");
    expect(getChild(el, "w:hideMark")).toBeDefined();
  });

  it("serializes tcMar", () => {
    const el = serializeTableCellProperties({
      tcMar: { top: 0, left: 108, bottom: 0, right: 108 },
    })!;
    expect(getChild(el, "w:tcMar")).toBeDefined();
  });

  it("serializes textDirection and vAlign", () => {
    const el = serializeTableCellProperties({
      textDirection: "btLr",
      vAlign: "center",
    })!;
    expect(getChild(el, "w:textDirection")?.attrs["w:val"]).toBe("btLr");
    expect(getChild(el, "w:vAlign")?.attrs["w:val"]).toBe("center");
  });
});

// =============================================================================
// serializeTableCell
// =============================================================================

describe("serializeTableCell", () => {
  it("serializes cell with properties and paragraph content", () => {
    const cell: DocxTableCell = {
      type: "tableCell",
      properties: { tcW: { value: 2880, type: "dxa" } },
      content: [{ type: "paragraph", content: [{ type: "run", content: [{ type: "text", value: "Cell" }] }] }],
    };
    const el = serializeTableCell(cell);
    expect(el.name).toBe("w:tc");
    expect(getChild(el, "w:tcPr")).toBeDefined();
    expect(getChild(el, "w:p")).toBeDefined();
  });

  it("serializes nested table in cell", () => {
    const cell: DocxTableCell = {
      type: "tableCell",
      content: [
        { type: "table", rows: [{ type: "tableRow", cells: [{ type: "tableCell", content: [{ type: "paragraph", content: [] }] }] }] },
      ],
    };
    const el = serializeTableCell(cell);
    expect(getChild(el, "w:tbl")).toBeDefined();
  });
});

// =============================================================================
// serializeTableRow
// =============================================================================

describe("serializeTableRow", () => {
  it("serializes row with properties and cells", () => {
    const row: DocxTableRow = {
      type: "tableRow",
      properties: { tblHeader: true },
      cells: [
        { type: "tableCell", content: [{ type: "paragraph", content: [] }] },
        { type: "tableCell", content: [{ type: "paragraph", content: [] }] },
      ],
    };
    const el = serializeTableRow(row);
    expect(el.name).toBe("w:tr");
    expect(getChild(el, "w:trPr")).toBeDefined();
    expect(getChildren(el, "w:tc")).toHaveLength(2);
  });

  it("serializes row without properties", () => {
    const row: DocxTableRow = {
      type: "tableRow",
      cells: [{ type: "tableCell", content: [{ type: "paragraph", content: [] }] }],
    };
    const el = serializeTableRow(row);
    expect(getChild(el, "w:trPr")).toBeUndefined();
  });
});

// =============================================================================
// serializeTable
// =============================================================================

describe("serializeTable", () => {
  it("serializes complete table", () => {
    const table: DocxTable = {
      type: "table",
      properties: { tblStyle: "TableGrid" },
      grid: { columns: [{ width: 4320 }, { width: 4320 }] },
      rows: [
        {
          type: "tableRow",
          cells: [
            { type: "tableCell", content: [{ type: "paragraph", content: [] }] },
            { type: "tableCell", content: [{ type: "paragraph", content: [] }] },
          ],
        },
      ],
    };
    const el = serializeTable(table);
    expect(el.name).toBe("w:tbl");
    expect(getChild(el, "w:tblPr")).toBeDefined();
    expect(getChild(el, "w:tblGrid")).toBeDefined();
    expect(getChildren(el, "w:tr")).toHaveLength(1);
  });

  it("serializes table without optional parts", () => {
    const table: DocxTable = {
      type: "table",
      rows: [{ type: "tableRow", cells: [{ type: "tableCell", content: [{ type: "paragraph", content: [] }] }] }],
    };
    const el = serializeTable(table);
    expect(getChild(el, "w:tblPr")).toBeUndefined();
    expect(getChild(el, "w:tblGrid")).toBeUndefined();
    expect(getChildren(el, "w:tr")).toHaveLength(1);
  });
});
