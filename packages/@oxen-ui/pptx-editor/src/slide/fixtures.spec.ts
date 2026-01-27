/**
 * @file Test fixture validation tests
 *
 * Ensures test fixtures conform to domain types to prevent runtime errors.
 * These tests catch issues like missing required fields before they cause
 * runtime crashes in components.
 *
 * Covers ALL shape types used by PropertyPanel:
 * - SpShape (auto shapes)
 * - PicShape (pictures)
 * - CxnShape (connectors)
 * - GrpShape (groups)
 * - GraphicFrame (table, chart, diagram, oleObject)
 */

import type { Slide, SpShape, PicShape, CxnShape, GrpShape, GraphicFrame, Shape } from "@oxen/pptx/domain";
import type { PresetGeometry } from "@oxen/pptx/domain/shape";
import type { Table, TableRow, TableCell, TableGrid } from "@oxen/pptx/domain/table/types";
import { px, deg, pct } from "@oxen/ooxml/domain/units";

// =============================================================================
// Test Fixtures (same as SlideEditorTest.tsx)
// =============================================================================

const createTestShape = (
  id: string,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fillColor: string,
  rotation = 0
): SpShape => ({
  type: "sp",
  nonVisual: {
    id,
    name,
    description: `Test shape: ${name}`,
  },
  properties: {
    transform: {
      x: px(x),
      y: px(y),
      width: px(width),
      height: px(height),
      rotation: deg(rotation),
      flipH: false,
      flipV: false,
    },
    fill: {
      type: "solidFill",
      color: {
        spec: {
          type: "srgb",
          value: fillColor,
        },
      },
    },
    line: {
      width: px(2),
      cap: "flat",
      compound: "sng",
      alignment: "ctr",
      dash: "solid",
      join: "round",
      fill: {
        type: "solidFill",
        color: {
          spec: {
            type: "srgb",
            value: "333333",
          },
        },
      },
    },
    geometry: {
      type: "preset",
      preset: "rect",
      adjustValues: [],
    },
  },
});

const createTestSlide = (): Slide => ({
  shapes: [
    createTestShape("1", "Rectangle 1", 100, 100, 200, 120, "4A90D9"),
    createTestShape("2", "Rectangle 2", 350, 80, 180, 150, "D94A4A"),
    createTestShape("3", "Rectangle 3", 200, 280, 250, 100, "4AD97A", 15),
    createTestShape("4", "Small Box", 560, 200, 80, 80, "D9C54A"),
    createTestShape("5", "Wide Box", 50, 420, 300, 60, "9B4AD9"),
  ],
});

// =============================================================================
// PicShape Fixture
// =============================================================================

const createTestPicShape = (id: string, name: string): PicShape => ({
  type: "pic",
  nonVisual: {
    id,
    name,
  },
  blipFill: {
    resourceId: "rId1",
    stretch: true,
    rotateWithShape: true,
  },
  properties: {
    transform: {
      x: px(100),
      y: px(100),
      width: px(200),
      height: px(150),
      rotation: deg(0),
      flipH: false,
      flipV: false,
    },
  },
});

// =============================================================================
// CxnShape Fixture
// =============================================================================

const createTestCxnShape = (id: string, name: string): CxnShape => ({
  type: "cxnSp",
  nonVisual: {
    id,
    name,
  },
  properties: {
    transform: {
      x: px(100),
      y: px(100),
      width: px(200),
      height: px(0),
      rotation: deg(0),
      flipH: false,
      flipV: false,
    },
    geometry: {
      type: "preset",
      preset: "line",
      adjustValues: [],
    },
    line: {
      width: px(2),
      cap: "flat",
      compound: "sng",
      alignment: "ctr",
      dash: "solid",
      join: "round",
      fill: {
        type: "solidFill",
        color: {
          spec: {
            type: "srgb",
            value: "000000",
          },
        },
      },
    },
  },
});

// =============================================================================
// GrpShape Fixture
// =============================================================================

const createTestGrpShape = (id: string, name: string): GrpShape => ({
  type: "grpSp",
  nonVisual: {
    id,
    name,
  },
  properties: {
    transform: {
      x: px(100),
      y: px(100),
      width: px(300),
      height: px(200),
      rotation: deg(0),
      flipH: false,
      flipV: false,
      childOffsetX: px(0),
      childOffsetY: px(0),
      childExtentWidth: px(300),
      childExtentHeight: px(200),
    },
  },
  children: [
    createTestShape("child1", "Child 1", 0, 0, 100, 100, "FF0000"),
    createTestShape("child2", "Child 2", 100, 50, 100, 100, "00FF00"),
  ],
});

// =============================================================================
// GraphicFrame (Table) Fixture
// =============================================================================

const createTestTableCell = (text: string): TableCell => ({
  textBody: {
    bodyProperties: {
      verticalType: "horz",
      wrapping: "square",
      anchor: "top",
      anchorCenter: false,
      overflow: "overflow",
      autoFit: { type: "none" },
      insets: {
        left: px(0),
        top: px(0),
        right: px(0),
        bottom: px(0),
      },
    },
    paragraphs: [
      {
        runs: [
          {
            type: "text",
            text,
            properties: {},
          },
        ],
        properties: {
          level: 0,
          alignment: "left",
        },
        endProperties: {},
      },
    ],
  },
  properties: {},
});

const createTestTableRow = (cells: string[]): TableRow => ({
  height: px(30),
  cells: cells.map(createTestTableCell),
});

const createTestTable = (): Table => ({
  grid: {
    columns: [{ width: px(100) }, { width: px(100) }, { width: px(100) }],
  },
  rows: [
    createTestTableRow(["A1", "B1", "C1"]),
    createTestTableRow(["A2", "B2", "C2"]),
    createTestTableRow(["A3", "B3", "C3"]),
  ],
  properties: {},
});

const createTestTableFrame = (id: string, name: string): GraphicFrame => ({
  type: "graphicFrame",
  nonVisual: {
    id,
    name,
  },
  transform: {
    x: px(100),
    y: px(100),
    width: px(300),
    height: px(150),
    rotation: deg(0),
    flipH: false,
    flipV: false,
  },
  content: {
    type: "table",
    data: {
      table: createTestTable(),
    },
  },
});

// =============================================================================
// Fixture Validation Tests
// =============================================================================

describe("Test fixture validation", () => {
  describe("createTestShape", () => {
    it("creates shape with all required nonVisual properties", () => {
      const shape = createTestShape("1", "Test", 0, 0, 100, 100, "FF0000");

      expect(shape.nonVisual).toBeDefined();
      expect(shape.nonVisual.id).toBe("1");
      expect(shape.nonVisual.name).toBe("Test");
    });

    it("creates shape with complete transform", () => {
      const shape = createTestShape("1", "Test", 10, 20, 100, 50, "FF0000", 45);
      const transform = shape.properties.transform;

      expect(transform).toBeDefined();
      if (transform) {
        expect(transform.x).toBe(10);
        expect(transform.y).toBe(20);
        expect(transform.width).toBe(100);
        expect(transform.height).toBe(50);
        expect(transform.rotation).toBe(45);
        expect(transform.flipH).toBe(false);
        expect(transform.flipV).toBe(false);
      }
    });

    it("creates shape with valid fill", () => {
      const shape = createTestShape("1", "Test", 0, 0, 100, 100, "4A90D9");
      const fill = shape.properties.fill;

      expect(fill).toBeDefined();
      expect(fill?.type).toBe("solidFill");
      if (fill?.type === "solidFill") {
        expect(fill.color.spec.type).toBe("srgb");
        if (fill.color.spec.type === "srgb") {
          expect(fill.color.spec.value).toBe("4A90D9");
        }
      }
    });

    it("creates shape with valid line", () => {
      const shape = createTestShape("1", "Test", 0, 0, 100, 100, "FF0000");
      const line = shape.properties.line;

      expect(line).toBeDefined();
      expect(line?.width).toBe(2);
      expect(line?.fill?.type).toBe("solidFill");
    });

    it("creates shape with complete geometry including adjustValues", () => {
      const shape = createTestShape("1", "Test", 0, 0, 100, 100, "FF0000");
      const geometry = shape.properties.geometry as PresetGeometry;

      expect(geometry).toBeDefined();
      expect(geometry.type).toBe("preset");
      expect(geometry.preset).toBe("rect");
      // This is the critical check - adjustValues must be defined
      expect(geometry.adjustValues).toBeDefined();
      expect(Array.isArray(geometry.adjustValues)).toBe(true);
    });
  });

  describe("createTestSlide", () => {
    it("creates slide with correct number of shapes", () => {
      const slide = createTestSlide();
      expect(slide.shapes.length).toBe(5);
    });

    it("all shapes have valid geometry with adjustValues", () => {
      const slide = createTestSlide();

      for (const shape of slide.shapes) {
        if (shape.type === "sp") {
          const geometry = shape.properties.geometry;
          if (geometry?.type === "preset") {
            expect(geometry.adjustValues).toBeDefined();
            expect(Array.isArray(geometry.adjustValues)).toBe(true);
          }
        }
      }
    });

    it("all shapes have unique IDs", () => {
      const slide = createTestSlide();
      const ids = slide.shapes
        .filter((s): s is SpShape => s.type === "sp")
        .map((s) => s.nonVisual.id);

      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});

// =============================================================================
// Domain Type Conformance Tests
// =============================================================================

describe("Domain type conformance", () => {
  it("SpShape has all required properties for PropertyPanel", () => {
    const shape = createTestShape("1", "Test", 0, 0, 100, 100, "FF0000");

    // These are accessed by PropertyPanel without null checks
    expect(shape.type).toBe("sp");
    expect(shape.nonVisual).toBeDefined();
    expect(shape.properties).toBeDefined();

    // These are checked with && before use, so can be undefined
    // but if defined, must be complete
    if (shape.properties.transform) {
      expect(typeof shape.properties.transform.x).toBe("number");
      expect(typeof shape.properties.transform.y).toBe("number");
      expect(typeof shape.properties.transform.width).toBe("number");
      expect(typeof shape.properties.transform.height).toBe("number");
    }

    if (shape.properties.geometry) {
      expect(shape.properties.geometry.type).toBeDefined();
      if (shape.properties.geometry.type === "preset") {
        expect(shape.properties.geometry.preset).toBeDefined();
        expect(shape.properties.geometry.adjustValues).toBeDefined();
      }
    }
  });

  it("PicShape has all required properties for PicShapePanel", () => {
    const shape = createTestPicShape("1", "Test Image");

    expect(shape.type).toBe("pic");
    expect(shape.nonVisual).toBeDefined();
    expect(shape.nonVisual.id).toBe("1");
    expect(shape.blipFill).toBeDefined();
    expect(shape.blipFill.resourceId).toBeDefined();
    expect(shape.properties).toBeDefined();
    expect(shape.properties.transform).toBeDefined();
  });

  it("CxnShape has all required properties for CxnShapePanel", () => {
    const shape = createTestCxnShape("1", "Test Connector");

    expect(shape.type).toBe("cxnSp");
    expect(shape.nonVisual).toBeDefined();
    expect(shape.properties).toBeDefined();
    expect(shape.properties.transform).toBeDefined();
    expect(shape.properties.geometry).toBeDefined();
    if (shape.properties.geometry?.type === "preset") {
      expect(shape.properties.geometry.adjustValues).toBeDefined();
    }
    expect(shape.properties.line).toBeDefined();
  });

  it("GrpShape has all required properties for GrpShapePanel", () => {
    const shape = createTestGrpShape("1", "Test Group");

    expect(shape.type).toBe("grpSp");
    expect(shape.nonVisual).toBeDefined();
    expect(shape.properties).toBeDefined();
    expect(shape.properties.transform).toBeDefined();
    expect(shape.children).toBeDefined();
    expect(Array.isArray(shape.children)).toBe(true);
    expect(shape.children.length).toBe(2);
  });

  it("GraphicFrame (table) has all required properties for TableFramePanel", () => {
    const shape = createTestTableFrame("1", "Test Table");

    expect(shape.type).toBe("graphicFrame");
    expect(shape.nonVisual).toBeDefined();
    expect(shape.transform).toBeDefined();
    expect(shape.content).toBeDefined();
    expect(shape.content.type).toBe("table");
    if (shape.content.type === "table") {
      expect(shape.content.data.table).toBeDefined();
      expect(shape.content.data.table.grid).toBeDefined();
      expect(shape.content.data.table.rows).toBeDefined();
      expect(shape.content.data.table.rows.length).toBeGreaterThan(0);
      expect(shape.content.data.table.rows[0].cells.length).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// Comprehensive Shape Slide Test
// =============================================================================

describe("Comprehensive slide with all shape types", () => {
  const createComprehensiveSlide = (): Slide => ({
    shapes: [
      createTestShape("sp1", "Auto Shape", 100, 100, 200, 120, "4A90D9"),
      createTestPicShape("pic1", "Picture"),
      createTestCxnShape("cxn1", "Connector"),
      createTestGrpShape("grp1", "Group"),
      createTestTableFrame("tbl1", "Table"),
    ],
  });

  it("creates slide with all shape types", () => {
    const slide = createComprehensiveSlide();
    expect(slide.shapes.length).toBe(5);

    const types = slide.shapes.map((s) => s.type);
    expect(types).toContain("sp");
    expect(types).toContain("pic");
    expect(types).toContain("cxnSp");
    expect(types).toContain("grpSp");
    expect(types).toContain("graphicFrame");
  });

  it("all shapes have nonVisual with id", () => {
    const slide = createComprehensiveSlide();

    for (const shape of slide.shapes) {
      expect("nonVisual" in shape).toBe(true);
      if ("nonVisual" in shape) {
        expect(shape.nonVisual.id).toBeDefined();
      }
    }
  });

  it("all shapes with properties have transform", () => {
    const slide = createComprehensiveSlide();

    for (const shape of slide.shapes) {
      if ("properties" in shape && shape.properties) {
        expect(shape.properties.transform).toBeDefined();
      }
      if (shape.type === "graphicFrame") {
        expect(shape.transform).toBeDefined();
      }
    }
  });
});
