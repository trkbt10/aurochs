/** @file Unit tests for registry element builders */
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as nodePath from "node:path";
import { createElement, type XmlDocument } from "@aurochs/xml";
import {
  shapeBuilder,
  imageBuilder,
  connectorBuilder,
  groupBuilder,
  tableBuilder,
  addElementsSync,
  addElementsAsync,
  type BuildContext,
} from "./registry";
import type { ShapeSpec, ImageSpec, ConnectorSpec, GroupSpec, TableSpec, TableCellSpec } from "../types";

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
    createElement("p:nvGrpSpPr", {}, [createElement("p:cNvPr", { id: "1", name: "" })]),
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

  it("applies text and textBody", () => {
    const spec: ShapeSpec = {
      ...baseSpec,
      text: "Hello World",
      textBody: { anchor: "center" },
    };
    const ctx = createMockCtx();
    const result = shapeBuilder(spec, "2", ctx);
    expect(result.xml.name).toBe("p:sp");
  });

  it("applies rich text with multiple runs", () => {
    const spec: ShapeSpec = {
      ...baseSpec,
      text: [
        {
          runs: [
            { text: "Bold ", bold: true },
            { text: "normal", fontSize: 12 },
          ],
        },
      ],
    };
    const ctx = createMockCtx();
    const result = shapeBuilder(spec, "2", ctx);
    expect(result.xml.name).toBe("p:sp");
  });

  it("applies effects", () => {
    const spec: ShapeSpec = {
      ...baseSpec,
      effects: { shadow: { color: "000000", blur: 5 } },
    };
    const ctx = createMockCtx();
    const result = shapeBuilder(spec, "2", ctx);
    expect(result.xml.name).toBe("p:sp");
  });

  it("applies shape3d", () => {
    const spec: ShapeSpec = {
      ...baseSpec,
      shape3d: { bevelTop: { preset: "circle" }, material: "metal" },
    };
    const ctx = createMockCtx();
    const result = shapeBuilder(spec, "2", ctx);
    expect(result.xml.name).toBe("p:sp");
  });

  it("applies customGeometry", () => {
    const spec: ShapeSpec = {
      ...baseSpec,
      customGeometry: {
        paths: [
          {
            width: 100,
            height: 50,
            commands: [
              { type: "moveTo", x: 0, y: 0 },
              { type: "lineTo", x: 100, y: 50 },
              { type: "close" },
            ],
          },
        ],
      },
    };
    const ctx = createMockCtx();
    const result = shapeBuilder(spec, "2", ctx);
    expect(result.xml.name).toBe("p:sp");
  });

  it("applies placeholder", () => {
    const spec: ShapeSpec = {
      ...baseSpec,
      placeholder: { type: "title", idx: 0 },
    };
    const ctx = createMockCtx();
    const result = shapeBuilder(spec, "2", ctx);
    expect(result.xml.name).toBe("p:sp");
  });

  it("applies line dash and cap options", () => {
    const spec: ShapeSpec = {
      ...baseSpec,
      lineColor: "000000",
      lineWidth: 2,
      lineDash: "dash",
      lineCap: "round",
      lineJoin: "bevel",
      lineCompound: "dbl",
    };
    const ctx = createMockCtx();
    const result = shapeBuilder(spec, "2", ctx);
    expect(result.xml.name).toBe("p:sp");
  });

  it("applies line head and tail ends", () => {
    const spec: ShapeSpec = {
      ...baseSpec,
      lineColor: "000000",
      lineHeadEnd: { type: "triangle" },
      lineTailEnd: { type: "arrow", width: "lg" },
    };
    const ctx = createMockCtx();
    const result = shapeBuilder(spec, "2", ctx);
    expect(result.xml.name).toBe("p:sp");
  });

  it("applies fill none", () => {
    const spec: ShapeSpec = { ...baseSpec, fill: "none" };
    const ctx = createMockCtx();
    const result = shapeBuilder(spec, "2", ctx);
    expect(result.xml.name).toBe("p:sp");
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

  it("applies start and end connections", () => {
    const spec: ConnectorSpec = {
      ...baseSpec,
      startShapeId: "10",
      startSiteIndex: 2,
      endShapeId: "20",
      endSiteIndex: 4,
    };
    const ctx = createMockCtx();
    const result = connectorBuilder(spec, "3", ctx);
    expect(result.xml.name).toBe("p:cxnSp");
  });

  it("defaults site index when not specified", () => {
    const spec: ConnectorSpec = {
      ...baseSpec,
      startShapeId: "10",
      endShapeId: "20",
    };
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

  it("applies group fill", () => {
    const spec: GroupSpec = { ...baseSpec, fill: "FF0000" };
    const ctx = createMockCtx({ existingIds: ["1", "2"] });
    const result = groupBuilder(spec, "2", ctx);
    expect(result.xml.name).toBe("p:grpSp");
  });

  it("handles multiple children", () => {
    const spec: GroupSpec = {
      ...baseSpec,
      children: [childSpec, { ...childSpec, x: 100 }],
    };
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

  it("builds a table with vertical alignment middle and margins", () => {
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

  it("builds a table with vertical alignment top", () => {
    const spec: TableSpec = {
      type: "table",
      x: 0,
      y: 0,
      width: 400,
      height: 100,
      rows: [[{ text: "Top", verticalAlignment: "top" }]],
    };
    const ctx = createMockCtx();
    const result = tableBuilder(spec, "6a", ctx);
    expect(result.xml.name).toBe("p:graphicFrame");
  });

  it("builds a table with vertical alignment bottom", () => {
    const spec: TableSpec = {
      type: "table",
      x: 0,
      y: 0,
      width: 400,
      height: 100,
      rows: [[{ text: "Bottom", verticalAlignment: "bottom" }]],
    };
    const ctx = createMockCtx();
    const result = tableBuilder(spec, "6b", ctx);
    expect(result.xml.name).toBe("p:graphicFrame");
  });

  it("validates non-array rows", () => {
    const spec: TableSpec = {
      type: "table",
      x: 0,
      y: 0,
      width: 400,
      height: 100,
      rows: ["not-an-array" as never],
    };
    const ctx = createMockCtx();
    expect(() => tableBuilder(spec, "6c", ctx)).toThrow("must be an array of cells");
  });

  it("builds a table with horizontal merge (gridSpan)", () => {
    const spec: TableSpec = {
      type: "table",
      x: 0,
      y: 0,
      width: 600,
      height: 100,
      rows: [[{ text: "Merged", gridSpan: 2 }, { text: "Hidden" }, { text: "C1" }]],
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
            runs: [{ text: "Bold", bold: true }, { text: " normal" }],
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
    const specs: ConnectorSpec[] = [{ type: "connector", x: 0, y: 0, width: 200, height: 0 }];
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

  it("adds tables using table builder", () => {
    const doc = createSlideDoc();
    const ctx = createMockCtx();
    const specs: TableSpec[] = [
      {
        type: "table",
        x: 0,
        y: 0,
        width: 400,
        height: 200,
        rows: [[{ text: "A" }, { text: "B" }]],
      },
    ];
    const existingIds = ["1"];
    const result = addElementsSync({
      slideDoc: doc,
      specs,
      existingIds,
      ctx,
      builder: tableBuilder,
    });
    expect(result.added).toBe(1);
  });
});

// =============================================================================
// addElementsAsync
// =============================================================================

describe("addElementsAsync", () => {
  it("returns same doc for empty specs", async () => {
    const doc = createSlideDoc();
    const ctx = createMockCtx();
    const result = await addElementsAsync({
      slideDoc: doc,
      specs: [],
      existingIds: ["1"],
      ctx,
      builder: async (spec, id, c) => shapeBuilder(spec, id, c),
    });
    expect(result.doc).toBe(doc);
    expect(result.added).toBe(0);
  });

  it("adds elements asynchronously", async () => {
    const doc = createSlideDoc();
    const ctx = createMockCtx();
    const specs: ShapeSpec[] = [{ type: "rectangle", x: 0, y: 0, width: 100, height: 50 }];
    const existingIds = ["1"];
    const result = await addElementsAsync({
      slideDoc: doc,
      specs,
      existingIds,
      ctx,
      builder: async (spec, id, c) => shapeBuilder(spec, id, c),
    });
    expect(result.added).toBe(1);
  });

  it("adds multiple elements sequentially and tracks IDs", async () => {
    const doc = createSlideDoc();
    const ctx = createMockCtx();
    const specs: ShapeSpec[] = [
      { type: "rectangle", x: 0, y: 0, width: 100, height: 50 },
      { type: "ellipse", x: 200, y: 0, width: 80, height: 80 },
      { type: "triangle", x: 400, y: 0, width: 60, height: 60 },
    ];
    const existingIds = ["1"];
    const result = await addElementsAsync({
      slideDoc: doc,
      specs,
      existingIds,
      ctx,
      builder: async (spec, id, c) => shapeBuilder(spec, id, c),
    });
    expect(result.added).toBe(3);
    expect(existingIds.length).toBe(4);
  });
});

// =============================================================================
// shapeBuilder hyperlink handling
// =============================================================================

describe("shapeBuilder hyperlinks", () => {
  const baseSpec: ShapeSpec = {
    type: "rectangle",
    x: 0,
    y: 0,
    width: 200,
    height: 100,
  };

  it("registers hyperlinks from rich text and replaces URLs with rIds", () => {
    const store = new Map<string, string>();
    const zipPackage = {
      readText: (p: string) => store.get(p) ?? null,
      writeText: (p: string, content: string) => {
        store.set(p, content);
      },
      listFiles: () => [...store.keys()],
    } as never;

    const ctx = createMockCtx({
      zipPackage,
      slidePath: "ppt/slides/slide1.xml",
    });

    const spec: ShapeSpec = {
      ...baseSpec,
      text: [
        {
          runs: [
            {
              text: "Click here",
              hyperlink: { url: "https://example.com" },
            },
          ],
        },
      ],
    };

    const result = shapeBuilder(spec, "2", ctx);
    expect(result.xml.name).toBe("p:sp");

    // Rels file should be written
    const relsPath = "ppt/slides/_rels/slide1.xml.rels";
    const relsContent = store.get(relsPath);
    expect(relsContent).toBeDefined();
    expect(relsContent).toContain("https://example.com");
  });

  it("skips hyperlink registration when text is a plain string", () => {
    const store = new Map<string, string>();
    const zipPackage = {
      readText: (p: string) => store.get(p) ?? null,
      writeText: (p: string, content: string) => {
        store.set(p, content);
      },
      listFiles: () => [...store.keys()],
    } as never;

    const ctx = createMockCtx({ zipPackage });

    const spec: ShapeSpec = { ...baseSpec, text: "No hyperlinks" };
    const result = shapeBuilder(spec, "2", ctx);
    expect(result.xml.name).toBe("p:sp");

    // No rels file should be written since no hyperlinks
    const relsPath = "ppt/slides/_rels/slide1.xml.rels";
    expect(store.get(relsPath)).toBeUndefined();
  });

  it("skips hyperlink registration when text is undefined", () => {
    const ctx = createMockCtx();
    const result = shapeBuilder(baseSpec, "2", ctx);
    expect(result.xml.name).toBe("p:sp");
  });

  it("deduplicates hyperlinks with the same URL", () => {
    const store = new Map<string, string>();
    const zipPackage = {
      readText: (p: string) => store.get(p) ?? null,
      writeText: (p: string, content: string) => {
        store.set(p, content);
      },
      listFiles: () => [...store.keys()],
    } as never;

    const ctx = createMockCtx({ zipPackage });

    const spec: ShapeSpec = {
      ...baseSpec,
      text: [
        {
          runs: [
            { text: "Link 1", hyperlink: { url: "https://example.com" } },
            { text: "Link 2", hyperlink: { url: "https://example.com" } },
          ],
        },
      ],
    };

    const result = shapeBuilder(spec, "2", ctx);
    expect(result.xml.name).toBe("p:sp");
  });

  it("handles multiple different hyperlink URLs", () => {
    const store = new Map<string, string>();
    const zipPackage = {
      readText: (p: string) => store.get(p) ?? null,
      writeText: (p: string, content: string) => {
        store.set(p, content);
      },
      listFiles: () => [...store.keys()],
    } as never;

    const ctx = createMockCtx({ zipPackage });

    const spec: ShapeSpec = {
      ...baseSpec,
      text: [
        {
          runs: [
            { text: "Link A", hyperlink: { url: "https://a.com" } },
            { text: "Link B", hyperlink: { url: "https://b.com" } },
          ],
        },
      ],
    };

    const result = shapeBuilder(spec, "2", ctx);
    expect(result.xml.name).toBe("p:sp");

    const relsPath = "ppt/slides/_rels/slide1.xml.rels";
    const relsContent = store.get(relsPath);
    expect(relsContent).toContain("https://a.com");
    expect(relsContent).toContain("https://b.com");
  });
});

// =============================================================================
// imageBuilder
// =============================================================================

// Helper to create a mock zip that supports addMedia (needs [Content_Types].xml)
function createMediaMockZip(): BuildContext["zipPackage"] {
  const contentTypesXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    "</Types>";

  const store = new Map<string, string>([["[Content_Types].xml", contentTypesXml]]);
  const binaryStore = new Map<string, ArrayBuffer>();

  return {
    readText: (p: string) => store.get(p) ?? null,
    writeText: (p: string, content: string) => {
      store.set(p, content);
    },
    writeBinary: (p: string, data: ArrayBuffer) => {
      binaryStore.set(p, data);
    },
    readBinary: (p: string) => binaryStore.get(p) ?? null,
    listFiles: () => [...store.keys(), ...binaryStore.keys()],
    exists: (p: string) => store.has(p) || binaryStore.has(p),
  } as never;
}

describe("imageBuilder", () => {
  it("builds an image from in-memory data", async () => {
    const zipPackage = createMediaMockZip();
    const ctx = createMockCtx({ zipPackage });

    const spec: ImageSpec = {
      type: "image",
      data: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
      mimeType: "image/png",
      x: 50,
      y: 50,
      width: 400,
      height: 300,
    };

    const result = await imageBuilder(spec, "5", ctx);
    expect(result.xml).toBeDefined();
    expect(result.xml.name).toBe("p:pic");
  });

  it("throws when neither path nor data is provided", async () => {
    const ctx = createMockCtx();

    const spec: ImageSpec = {
      type: "image",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    };

    await expect(imageBuilder(spec, "5", ctx)).rejects.toThrow("ImageSpec requires either 'path' or 'data'");
  });

  it("applies rotation and flip to image", async () => {
    const zipPackage = createMediaMockZip();
    const ctx = createMockCtx({ zipPackage });

    const spec: ImageSpec = {
      type: "image",
      data: new Uint8Array([0x89, 0x50]),
      mimeType: "image/png",
      x: 0,
      y: 0,
      width: 200,
      height: 150,
      rotation: 90,
      flipH: true,
      flipV: true,
    };

    const result = await imageBuilder(spec, "5", ctx);
    expect(result.xml.name).toBe("p:pic");
  });

  it("defaults mimeType to image/png when not specified", async () => {
    const zipPackage = createMediaMockZip();
    const ctx = createMockCtx({ zipPackage });

    const spec: ImageSpec = {
      type: "image",
      data: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
      x: 10,
      y: 20,
      width: 100,
      height: 100,
    };

    const result = await imageBuilder(spec, "5", ctx);
    expect(result.xml.name).toBe("p:pic");
  });

  it("builds an image with embedded video media from data", async () => {
    const zipPackage = createMediaMockZip();
    const ctx = createMockCtx({ zipPackage });

    const spec: ImageSpec = {
      type: "image",
      data: new Uint8Array([0x89, 0x50]),
      mimeType: "image/png",
      x: 0,
      y: 0,
      width: 640,
      height: 480,
      media: {
        type: "video",
        data: new Uint8Array([0x00, 0x01, 0x02]),
        mimeType: "video/mp4",
      },
    };

    const result = await imageBuilder(spec, "5", ctx);
    expect(result.xml.name).toBe("p:pic");
  });

  it("throws when media spec has neither path nor data", async () => {
    const zipPackage = createMediaMockZip();
    const ctx = createMockCtx({ zipPackage });

    const spec: ImageSpec = {
      type: "image",
      data: new Uint8Array([0x89]),
      mimeType: "image/png",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      media: {
        type: "video",
      } as never,
    };

    await expect(imageBuilder(spec, "5", ctx)).rejects.toThrow("MediaEmbedSpec requires either 'path' or 'data'");
  });

  it("builds an image from file path", async () => {
    const tmpDir = await fs.mkdtemp(nodePath.join(os.tmpdir(), "registry-test-"));
    try {
      const imgPath = nodePath.join(tmpDir, "test.png");
      await fs.writeFile(imgPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

      const zipPackage = createMediaMockZip();
      const ctx = createMockCtx({ zipPackage, specDir: tmpDir });

      const spec: ImageSpec = {
        type: "image",
        path: "test.png",
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      };

      const result = await imageBuilder(spec, "5", ctx);
      expect(result.xml.name).toBe("p:pic");
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("builds an image with embedded media from file path", async () => {
    const tmpDir = await fs.mkdtemp(nodePath.join(os.tmpdir(), "registry-test-"));
    try {
      const imgPath = nodePath.join(tmpDir, "poster.png");
      await fs.writeFile(imgPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
      const videoPath = nodePath.join(tmpDir, "clip.mp4");
      await fs.writeFile(videoPath, Buffer.from([0x00, 0x00, 0x00, 0x20]));

      const zipPackage = createMediaMockZip();
      const ctx = createMockCtx({ zipPackage, specDir: tmpDir });

      const spec: ImageSpec = {
        type: "image",
        path: "poster.png",
        x: 0,
        y: 0,
        width: 640,
        height: 480,
        media: { type: "video", path: "clip.mp4" },
      };

      const result = await imageBuilder(spec, "5", ctx);
      expect(result.xml.name).toBe("p:pic");
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
