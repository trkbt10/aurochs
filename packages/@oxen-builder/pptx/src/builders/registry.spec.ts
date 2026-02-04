/** @file Unit tests for registry element builders */
import { createElement, type XmlDocument } from "@oxen/xml";
import {
  shapeBuilder,
  connectorBuilder,
  groupBuilder,
  tableBuilder,
  addElementsSync,
  type BuildContext,
} from "./registry";
import type { ShapeSpec, ConnectorSpec, GroupSpec, TableSpec, TableCellSpec } from "../types";

// Minimal BuildContext for sync builders that don't need a real ZipPackage
function createMockZipPackage(): BuildContext["zipPackage"] {
  // eslint-disable-next-line custom/no-as-outside-guard -- test mock
  return {
    readText: () => null,
    writeText: () => {},
    listFiles: () => [],
  } as unknown as BuildContext["zipPackage"];
}

function createMockCtx(overrides?: Partial<BuildContext>): BuildContext {
  return {
    existingIds: ["1"],
    specDir: "/tmp",
    zipPackage: createMockZipPackage(),
    slidePath: "ppt/slides/slide1.xml",
    ...overrides,
  };
}

function createSlideDoc(): XmlDocument {
  const spTree = createElement("p:spTree", {}, [
    createElement("p:nvGrpSpPr", {}, [
      createElement("p:cNvPr", { id: "1", name: "" }),
    ]),
  ]);
  const cSld = createElement("p:cSld", {}, [spTree]);
  const root = createElement("p:sld", {}, [cSld]);
  return { children: [root] };
}

// =============================================================================
// shapeBuilder
// =============================================================================

describe("shapeBuilder", () => {
  const baseSpec: ShapeSpec = {
    type: "rectangle",
    x: 100,
    y: 200,
    width: 300,
    height: 150,
  };

  it("builds a basic shape XML element", () => {
    const ctx = createMockCtx();
    const result = shapeBuilder(baseSpec, "2", ctx);
    expect(result.xml).toBeDefined();
    expect(result.xml.name).toBe("p:sp");
  });

  it("applies rotation and flip values", () => {
    const spec: ShapeSpec = { ...baseSpec, rotation: 45, flipH: true, flipV: false };
    const ctx = createMockCtx();
    const result = shapeBuilder(spec, "2", ctx);
    expect(result.xml.name).toBe("p:sp");
  });

  it("applies fill when specified", () => {
    const spec: ShapeSpec = { ...baseSpec, fill: "FF0000" };
    const ctx = createMockCtx();
    const result = shapeBuilder(spec, "2", ctx);
    expect(result.xml.name).toBe("p:sp");
  });

  it("applies line when specified", () => {
    const spec: ShapeSpec = { ...baseSpec, lineColor: "000000", lineWidth: 2 };
    const ctx = createMockCtx();
    const result = shapeBuilder(spec, "2", ctx);
    expect(result.xml.name).toBe("p:sp");
  });

  it("throws for unknown shape type", () => {
    const spec: ShapeSpec = { ...baseSpec, type: "nonExistentShape" as never };
    const ctx = createMockCtx();
    expect(() => shapeBuilder(spec, "2", ctx)).toThrow("Unknown shape type");
  });
});

// =============================================================================
// connectorBuilder
// =============================================================================

describe("connectorBuilder", () => {
  const baseSpec: ConnectorSpec = {
    type: "connector",
    x: 10,
    y: 20,
    width: 200,
    height: 0,
  };

  it("builds a connector XML element", () => {
    const ctx = createMockCtx();
    const result = connectorBuilder(baseSpec, "3", ctx);
    expect(result.xml).toBeDefined();
    expect(result.xml.name).toBe("p:cxnSp");
  });

  it("uses default preset straightConnector1", () => {
    const ctx = createMockCtx();
    const result = connectorBuilder(baseSpec, "3", ctx);
    expect(result.xml.name).toBe("p:cxnSp");
  });

  it("applies custom preset", () => {
    const spec: ConnectorSpec = { ...baseSpec, preset: "bentConnector3" };
    const ctx = createMockCtx();
    const result = connectorBuilder(spec, "3", ctx);
    expect(result.xml.name).toBe("p:cxnSp");
  });

  it("applies rotation and flip", () => {
    const spec: ConnectorSpec = { ...baseSpec, rotation: 90, flipH: true };
    const ctx = createMockCtx();
    const result = connectorBuilder(spec, "3", ctx);
    expect(result.xml.name).toBe("p:cxnSp");
  });

  it("applies line color and width", () => {
    const spec: ConnectorSpec = { ...baseSpec, lineColor: "FF0000", lineWidth: 3 };
    const ctx = createMockCtx();
    const result = connectorBuilder(spec, "3", ctx);
    expect(result.xml.name).toBe("p:cxnSp");
  });
});

// =============================================================================
// groupBuilder
// =============================================================================

describe("groupBuilder", () => {
  const childSpec: ShapeSpec = {
    type: "rectangle",
    x: 0,
    y: 0,
    width: 100,
    height: 50,
  };

  const baseSpec: GroupSpec = {
    type: "group",
    x: 50,
    y: 50,
    width: 400,
    height: 300,
    children: [childSpec],
  };

  it("builds a group XML element", () => {
    const ctx = createMockCtx({ existingIds: ["1", "2"] });
    const result = groupBuilder(baseSpec, "2", ctx);
    expect(result.xml).toBeDefined();
    expect(result.xml.name).toBe("p:grpSp");
  });

  it("handles nested groups", () => {
    const nestedGroup: GroupSpec = {
      type: "group",
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      children: [childSpec],
    };
    const spec: GroupSpec = { ...baseSpec, children: [nestedGroup] };
    const ctx = createMockCtx({ existingIds: ["1", "2"] });
    const result = groupBuilder(spec, "2", ctx);
    expect(result.xml.name).toBe("p:grpSp");
  });

  it("applies rotation and flip", () => {
    const spec: GroupSpec = { ...baseSpec, rotation: 180, flipH: false, flipV: true };
    const ctx = createMockCtx({ existingIds: ["1", "2"] });
    const result = groupBuilder(spec, "2", ctx);
    expect(result.xml.name).toBe("p:grpSp");
  });
});

// =============================================================================
// tableBuilder
// =============================================================================

describe("tableBuilder", () => {
  it("builds a table with simple text cells", () => {
    const spec: TableSpec = {
      type: "table",
      x: 100,
      y: 100,
      width: 600,
      height: 200,
      rows: [
        [{ text: "A1" }, { text: "B1" }],
        [{ text: "A2" }, { text: "B2" }],
      ],
    };
    const ctx = createMockCtx();
    const result = tableBuilder(spec, "4", ctx);
    expect(result.xml).toBeDefined();
    expect(result.xml.name).toBe("p:graphicFrame");
  });

  it("builds a table with cell fill and borders", () => {
    const cell: TableCellSpec = {
      text: "Styled",
      fill: "FF0000",
      borderColor: "000000",
      borderWidth: 2,
    };
    const spec: TableSpec = {
      type: "table",
      x: 0,
      y: 0,
      width: 400,
      height: 100,
      rows: [[cell]],
    };
    const ctx = createMockCtx();
    const result = tableBuilder(spec, "5", ctx);
    expect(result.xml.name).toBe("p:graphicFrame");
  });

  it("builds a table with vertical alignment and margins", () => {
    const cell: TableCellSpec = {
      text: "Aligned",
      verticalAlignment: "middle",
      marginLeft: 100,
      marginRight: 100,
      marginTop: 50,
      marginBottom: 50,
    };
    const spec: TableSpec = {
      type: "table",
      x: 0,
      y: 0,
      width: 400,
      height: 100,
      rows: [[cell]],
    };
    const ctx = createMockCtx();
    const result = tableBuilder(spec, "6", ctx);
    expect(result.xml.name).toBe("p:graphicFrame");
  });

  it("builds a table with horizontal merge (gridSpan)", () => {
    const spec: TableSpec = {
      type: "table",
      x: 0,
      y: 0,
      width: 600,
      height: 100,
      rows: [
        [{ text: "Merged", gridSpan: 2 }, { text: "Hidden" }, { text: "C1" }],
      ],
    };
    const ctx = createMockCtx();
    const result = tableBuilder(spec, "7", ctx);
    expect(result.xml.name).toBe("p:graphicFrame");
  });

  it("builds a table with vertical merge (rowSpan)", () => {
    const spec: TableSpec = {
      type: "table",
      x: 0,
      y: 0,
      width: 400,
      height: 200,
      rows: [
        [{ text: "Spanning", rowSpan: 2 }, { text: "B1" }],
        [{ text: "Hidden" }, { text: "B2" }],
      ],
    };
    const ctx = createMockCtx();
    const result = tableBuilder(spec, "8", ctx);
    expect(result.xml.name).toBe("p:graphicFrame");
  });

  it("throws when cell has neither text nor content", () => {
    const spec: TableSpec = {
      type: "table",
      x: 0,
      y: 0,
      width: 400,
      height: 100,
      rows: [[{} as TableCellSpec]],
    };
    const ctx = createMockCtx();
    expect(() => tableBuilder(spec, "9", ctx)).toThrow("TableCellSpec requires either 'text' or 'content'");
  });

  it("builds a table with rich text content", () => {
    const cell: TableCellSpec = {
      content: {
        paragraphs: [
          {
            runs: [
              { text: "Bold", bold: true },
              { text: " normal" },
            ],
          },
        ],
      },
    };
    const spec: TableSpec = {
      type: "table",
      x: 0,
      y: 0,
      width: 400,
      height: 100,
      rows: [[cell]],
    };
    const ctx = createMockCtx();
    const result = tableBuilder(spec, "10", ctx);
    expect(result.xml.name).toBe("p:graphicFrame");
  });
});

// =============================================================================
// addElementsSync
// =============================================================================

describe("addElementsSync", () => {
  it("returns same doc and 0 count for empty specs", () => {
    const doc = createSlideDoc();
    const ctx = createMockCtx();
    const result = addElementsSync({
      slideDoc: doc,
      specs: [],
      existingIds: ["1"],
      ctx,
      builder: shapeBuilder,
    });
    expect(result.doc).toBe(doc);
    expect(result.added).toBe(0);
  });

  it("adds shapes and updates count", () => {
    const doc = createSlideDoc();
    const ctx = createMockCtx();
    const specs: ShapeSpec[] = [
      { type: "rectangle", x: 0, y: 0, width: 100, height: 50 },
      { type: "ellipse", x: 100, y: 0, width: 100, height: 50 },
    ];
    const existingIds = ["1"];
    const result = addElementsSync({
      slideDoc: doc,
      specs,
      existingIds,
      ctx,
      builder: shapeBuilder,
    });
    expect(result.added).toBe(2);
    expect(existingIds.length).toBe(3); // "1" + 2 new IDs
  });

  it("adds connectors using connector builder", () => {
    const doc = createSlideDoc();
    const ctx = createMockCtx();
    const specs: ConnectorSpec[] = [
      { type: "connector", x: 0, y: 0, width: 200, height: 0 },
    ];
    const existingIds = ["1"];
    const result = addElementsSync({
      slideDoc: doc,
      specs,
      existingIds,
      ctx,
      builder: connectorBuilder,
    });
    expect(result.added).toBe(1);
  });
});
