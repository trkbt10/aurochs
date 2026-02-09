/** @file Table serializer tests */
import { getChild, getChildren, getTextContent } from "@aurochs/xml";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import type { Line } from "@aurochs-office/pptx/domain";
import type {
  Table,
  TableCell,
  TableCellProperties,
  TableProperties,
} from "@aurochs-office/pptx/domain/table/types";
import { serializeDrawingTable } from "./table";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EMU_PER_PIXEL = 9525;

function makeLine(): Line {
  return {
    width: px(1),
    cap: "flat",
    compound: "sng",
    alignment: "ctr",
    fill: { type: "solidFill", color: { spec: { type: "srgb", value: "000000" } } },
    dash: "solid",
    join: "round",
  };
}

function makeMinimalCell(overrides?: Partial<TableCell>): TableCell {
  return {
    properties: {},
    ...overrides,
  };
}

function makeMinimalTable(overrides?: Partial<Table>): Table {
  return {
    properties: {},
    grid: { columns: [{ width: px(100) }] },
    rows: [{ height: px(40), cells: [makeMinimalCell()] }],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// serializeDrawingTable (main export)
// ---------------------------------------------------------------------------

describe("serializeDrawingTable", () => {
  it("serializes basic table with grid and single row", () => {
    const table = makeMinimalTable();
    const el = serializeDrawingTable(table);

    expect(el.name).toBe("a:tbl");
    // Should contain: a:tblPr, a:tblGrid, a:tr
    expect(getChild(el, "a:tblPr")).toBeDefined();
    expect(getChild(el, "a:tblGrid")).toBeDefined();
    const rows = getChildren(el, "a:tr");
    expect(rows).toHaveLength(1);
  });

  it("serializes table with multiple rows and columns", () => {
    const table = makeMinimalTable({
      grid: { columns: [{ width: px(100) }, { width: px(200) }, { width: px(150) }] },
      rows: [
        { height: px(30), cells: [makeMinimalCell(), makeMinimalCell(), makeMinimalCell()] },
        { height: px(40), cells: [makeMinimalCell(), makeMinimalCell(), makeMinimalCell()] },
      ],
    });

    const el = serializeDrawingTable(table);
    const gridCols = getChildren(getChild(el, "a:tblGrid")!, "a:gridCol");
    expect(gridCols).toHaveLength(3);

    const rows = getChildren(el, "a:tr");
    expect(rows).toHaveLength(2);
    expect(getChildren(rows[0], "a:tc")).toHaveLength(3);
    expect(getChildren(rows[1], "a:tc")).toHaveLength(3);
  });

  it("serializes grid column widths in EMU", () => {
    const table = makeMinimalTable({
      grid: { columns: [{ width: px(100) }, { width: px(200) }] },
    });

    const el = serializeDrawingTable(table);
    const gridCols = getChildren(getChild(el, "a:tblGrid")!, "a:gridCol");
    expect(gridCols[0].attrs.w).toBe(String(100 * EMU_PER_PIXEL));
    expect(gridCols[1].attrs.w).toBe(String(200 * EMU_PER_PIXEL));
  });

  it("serializes row heights in EMU", () => {
    const table = makeMinimalTable({
      rows: [
        { height: px(30), cells: [makeMinimalCell()] },
        { height: px(50), cells: [makeMinimalCell()] },
      ],
    });

    const el = serializeDrawingTable(table);
    const rows = getChildren(el, "a:tr");
    expect(rows[0].attrs.h).toBe(String(30 * EMU_PER_PIXEL));
    expect(rows[1].attrs.h).toBe(String(50 * EMU_PER_PIXEL));
  });
});

// ---------------------------------------------------------------------------
// serializeTableProperties (via table.properties)
// ---------------------------------------------------------------------------

describe("serializeTableProperties", () => {
  it("serializes all boolean flags", () => {
    const props: TableProperties = {
      rtl: true,
      firstRow: true,
      firstCol: false,
      lastRow: true,
      lastCol: false,
      bandRow: true,
      bandCol: false,
    };
    const table = makeMinimalTable({ properties: props });
    const el = serializeDrawingTable(table);
    const tblPr = getChild(el, "a:tblPr")!;

    expect(tblPr.attrs.rtl).toBe("1");
    expect(tblPr.attrs.firstRow).toBe("1");
    expect(tblPr.attrs.firstCol).toBe("0");
    expect(tblPr.attrs.lastRow).toBe("1");
    expect(tblPr.attrs.lastCol).toBe("0");
    expect(tblPr.attrs.bandRow).toBe("1");
    expect(tblPr.attrs.bandCol).toBe("0");
  });

  it("serializes table properties with fill", () => {
    const props: TableProperties = {
      fill: { type: "solidFill", color: { spec: { type: "srgb", value: "FF0000" } } },
    };
    const table = makeMinimalTable({ properties: props });
    const el = serializeDrawingTable(table);
    const tblPr = getChild(el, "a:tblPr")!;

    const solidFill = getChild(tblPr, "a:solidFill");
    expect(solidFill).toBeDefined();
    expect(getChild(solidFill!, "a:srgbClr")?.attrs.val).toBe("FF0000");
  });

  it("serializes table properties with tableStyleId", () => {
    const props: TableProperties = {
      tableStyleId: "{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}",
    };
    const table = makeMinimalTable({ properties: props });
    const el = serializeDrawingTable(table);
    const tblPr = getChild(el, "a:tblPr")!;

    const styleId = getChild(tblPr, "a:tableStyleId");
    expect(styleId).toBeDefined();
    expect(getTextContent(styleId!)).toBe("{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}");
  });

  it("serializes empty table properties with no attrs or children", () => {
    const table = makeMinimalTable({ properties: {} });
    const el = serializeDrawingTable(table);
    const tblPr = getChild(el, "a:tblPr")!;

    expect(tblPr.name).toBe("a:tblPr");
    expect(Object.keys(tblPr.attrs)).toHaveLength(0);
    expect(tblPr.children).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// serializeCellAnchor (via cell properties)
// ---------------------------------------------------------------------------

describe("serializeCellAnchor", () => {
  function serializeCellAndGetTcPr(cellProps: TableCellProperties) {
    const table = makeMinimalTable({
      rows: [{ height: px(30), cells: [makeMinimalCell({ properties: cellProps })] }],
    });
    const el = serializeDrawingTable(table);
    const tc = getChildren(getChildren(el, "a:tr")[0], "a:tc")[0];
    return getChild(tc, "a:tcPr")!;
  }

  it("maps anchor 'top' to 't'", () => {
    const tcPr = serializeCellAndGetTcPr({ anchor: "top" });
    expect(tcPr.attrs.anchor).toBe("t");
  });

  it("maps anchor 'center' to 'ctr'", () => {
    const tcPr = serializeCellAndGetTcPr({ anchor: "center" });
    expect(tcPr.attrs.anchor).toBe("ctr");
  });

  it("maps anchor 'bottom' to 'b'", () => {
    const tcPr = serializeCellAndGetTcPr({ anchor: "bottom" });
    expect(tcPr.attrs.anchor).toBe("b");
  });

  it("omits anchor attr when undefined", () => {
    const tcPr = serializeCellAndGetTcPr({});
    expect(tcPr.attrs.anchor).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// serializeTableCellProperties
// ---------------------------------------------------------------------------

describe("serializeTableCellProperties", () => {
  function serializeCellAndGetTcPr(cellProps: TableCellProperties) {
    const table = makeMinimalTable({
      rows: [{ height: px(30), cells: [makeMinimalCell({ properties: cellProps })] }],
    });
    const el = serializeDrawingTable(table);
    const tc = getChildren(getChildren(el, "a:tr")[0], "a:tc")[0];
    return getChild(tc, "a:tcPr")!;
  }

  it("serializes margins as marL/marR/marT/marB in EMU", () => {
    const tcPr = serializeCellAndGetTcPr({
      margins: { left: px(5), right: px(10), top: px(3), bottom: px(7) },
    });
    expect(tcPr.attrs.marL).toBe(String(5 * EMU_PER_PIXEL));
    expect(tcPr.attrs.marR).toBe(String(10 * EMU_PER_PIXEL));
    expect(tcPr.attrs.marT).toBe(String(3 * EMU_PER_PIXEL));
    expect(tcPr.attrs.marB).toBe(String(7 * EMU_PER_PIXEL));
  });

  it("serializes anchorCenter as anchorCtr", () => {
    const tcPr = serializeCellAndGetTcPr({ anchorCenter: true });
    expect(tcPr.attrs.anchorCtr).toBe("1");
  });

  it("serializes anchorCenter false", () => {
    const tcPr = serializeCellAndGetTcPr({ anchorCenter: false });
    expect(tcPr.attrs.anchorCtr).toBe("0");
  });

  it("serializes horzOverflow", () => {
    const tcPr = serializeCellAndGetTcPr({ horzOverflow: "clip" });
    expect(tcPr.attrs.horzOverflow).toBe("clip");
  });

  it("serializes verticalType as vert attr", () => {
    const tcPr = serializeCellAndGetTcPr({ verticalType: "vert270" });
    expect(tcPr.attrs.vert).toBe("vert270");
  });

  it("serializes rowSpan", () => {
    const tcPr = serializeCellAndGetTcPr({ rowSpan: 3 });
    expect(tcPr.attrs.rowSpan).toBe("3");
  });

  it("serializes colSpan as gridSpan", () => {
    const tcPr = serializeCellAndGetTcPr({ colSpan: 2 });
    expect(tcPr.attrs.gridSpan).toBe("2");
  });

  it("serializes horizontalMerge as hMerge='1'", () => {
    const tcPr = serializeCellAndGetTcPr({ horizontalMerge: true });
    expect(tcPr.attrs.hMerge).toBe("1");
  });

  it("does not set hMerge when horizontalMerge is false", () => {
    const tcPr = serializeCellAndGetTcPr({ horizontalMerge: false });
    expect(tcPr.attrs.hMerge).toBeUndefined();
  });

  it("serializes verticalMerge as vMerge='1'", () => {
    const tcPr = serializeCellAndGetTcPr({ verticalMerge: true });
    expect(tcPr.attrs.vMerge).toBe("1");
  });

  it("does not set vMerge when verticalMerge is false", () => {
    const tcPr = serializeCellAndGetTcPr({ verticalMerge: false });
    expect(tcPr.attrs.vMerge).toBeUndefined();
  });

  it("serializes borders (left, right, top, bottom)", () => {
    const tcPr = serializeCellAndGetTcPr({
      borders: {
        left: makeLine(),
        right: makeLine(),
        top: makeLine(),
        bottom: makeLine(),
      },
    });

    expect(getChild(tcPr, "a:lnL")).toBeDefined();
    expect(getChild(tcPr, "a:lnR")).toBeDefined();
    expect(getChild(tcPr, "a:lnT")).toBeDefined();
    expect(getChild(tcPr, "a:lnB")).toBeDefined();
  });

  it("serializes diagonal borders (tlToBr, blToTr)", () => {
    const tcPr = serializeCellAndGetTcPr({
      borders: {
        tlToBr: makeLine(),
        blToTr: makeLine(),
      },
    });

    expect(getChild(tcPr, "a:lnTlToBr")).toBeDefined();
    expect(getChild(tcPr, "a:lnBlToTr")).toBeDefined();
  });

  it("serializes border line attributes (width in EMU)", () => {
    const tcPr = serializeCellAndGetTcPr({
      borders: { left: makeLine() },
    });

    const lnL = getChild(tcPr, "a:lnL")!;
    expect(lnL.attrs.w).toBe(String(1 * EMU_PER_PIXEL));
  });

  it("serializes cell fill", () => {
    const tcPr = serializeCellAndGetTcPr({
      fill: { type: "solidFill", color: { spec: { type: "srgb", value: "00FF00" } } },
    });

    const solidFill = getChild(tcPr, "a:solidFill");
    expect(solidFill).toBeDefined();
    expect(getChild(solidFill!, "a:srgbClr")?.attrs.val).toBe("00FF00");
  });
});

// ---------------------------------------------------------------------------
// serializeTableCell
// ---------------------------------------------------------------------------

describe("serializeTableCell", () => {
  function serializeAndGetTc(cell: TableCell) {
    const table = makeMinimalTable({
      rows: [{ height: px(30), cells: [cell] }],
    });
    const el = serializeDrawingTable(table);
    return getChildren(getChildren(el, "a:tr")[0], "a:tc")[0];
  }

  it("creates empty txBody when no textBody provided", () => {
    const tc = serializeAndGetTc(makeMinimalCell());
    const txBody = getChild(tc, "a:txBody");
    expect(txBody).toBeDefined();
    expect(getChild(txBody!, "a:bodyPr")).toBeDefined();
    expect(getChild(txBody!, "a:lstStyle")).toBeDefined();
    expect(getChild(txBody!, "a:p")).toBeDefined();
  });

  it("serializes cell with id attribute", () => {
    const tc = serializeAndGetTc(makeMinimalCell({ id: "cell-42" }));
    expect(tc.attrs.id).toBe("cell-42");
  });

  it("omits id attribute when not provided", () => {
    const tc = serializeAndGetTc(makeMinimalCell());
    expect(tc.attrs.id).toBeUndefined();
  });

  it("uses serializeDrawingTextBody when textBody is provided", () => {
    const cell: TableCell = {
      properties: {},
      textBody: {
        bodyProperties: {},
        paragraphs: [
          {
            runs: [{ type: "text", text: "Hello", properties: {} }],
            properties: {},
          },
        ],
      },
    };
    const tc = serializeAndGetTc(cell);
    const txBody = getChild(tc, "a:txBody");
    expect(txBody).toBeDefined();
    // serializeDrawingTextBody produces a:txBody with a:bodyPr, a:lstStyle, a:p
    expect(getChild(txBody!, "a:bodyPr")).toBeDefined();
    expect(getChild(txBody!, "a:lstStyle")).toBeDefined();
    const p = getChild(txBody!, "a:p");
    expect(p).toBeDefined();
    // The paragraph should contain a run with the text
    const r = getChild(p!, "a:r");
    expect(r).toBeDefined();
    expect(getTextContent(getChild(r!, "a:t")!)).toBe("Hello");
  });

  it("always includes a:tcPr child", () => {
    const tc = serializeAndGetTc(makeMinimalCell());
    expect(getChild(tc, "a:tcPr")).toBeDefined();
  });
});
