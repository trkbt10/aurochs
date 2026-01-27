/**
 * @file Tests for shape generator
 *
 * @see ECMA-376 Part 1, Section 21.4 - DrawingML Diagrams
 */

import type {
  DiagramDataModel,
  DiagramLayoutDefinition,
  DiagramColorsDefinition,
  DiagramPoint,
  DiagramConnection,
} from "../types";
import type { SpShape } from "../../shape";
import type { SolidFill } from "@oxen/ooxml/domain/fill";
import type { Fill, Line } from "../../color/types";
import type { TextBody } from "../../text";
import { px, deg } from "@oxen/ooxml/domain/units";
import {
  generateDiagramShapes,
  shapeToSvgAttributes,
  generateShapeSvg,
  type ShapeGenerationConfig,
} from "./shape-generator";

// =============================================================================
// Helper Functions for SpShape Access
// =============================================================================

function getShapeX(shape: SpShape): number {
  return shape.properties.transform?.x ?? 0;
}

function getShapeY(shape: SpShape): number {
  return shape.properties.transform?.y ?? 0;
}

function getShapeWidth(shape: SpShape): number {
  return shape.properties.transform?.width ?? 0;
}

function getShapeHeight(shape: SpShape): number {
  return shape.properties.transform?.height ?? 0;
}

function getShapeId(shape: SpShape): string {
  return shape.nonVisual.id;
}

function getShapeFillColor(shape: SpShape): string | undefined {
  const fill = shape.properties.fill;
  if (!fill || fill.type !== "solidFill") {
    return undefined;
  }
  const spec = (fill as SolidFill).color.spec;
  if (spec.type === "srgb") {
    return `#${spec.value}`;
  }
  return undefined;
}

function getShapeText(shape: SpShape): string | undefined {
  if (!shape.textBody?.paragraphs) {
    return undefined;
  }
  const text = shape.textBody.paragraphs
    .flatMap((p) => p.runs?.map((r) => {
      // Only RegularRun has text property
      if (r.type === "text") {
        return r.text;
      }
      return "";
    }) ?? [])
    .join("");
  return text || undefined;
}

// =============================================================================
// Test Fixtures
// =============================================================================

function createTextBodyForPoint(text: string): TextBody {
  return {
    bodyProperties: {},
    paragraphs: [
      {
        properties: {},
        runs: [{ type: "text" as const, text }],
      },
    ],
  };
}

function createPoint(
  modelId: string,
  type?: string,
  text?: string
): DiagramPoint {
  return {
    modelId,
    type,
    textBody: text ? createTextBodyForPoint(text) : undefined,
  };
}

function createConnection(
  modelId: string,
  sourceId: string,
  destinationId: string
): DiagramConnection {
  return {
    modelId,
    type: "parOf",
    sourceId,
    destinationId,
  };
}

function createSimpleDataModel(): DiagramDataModel {
  return {
    points: [
      createPoint("root", "doc", "Root"),
      createPoint("child1", "node", "Child 1"),
      createPoint("child2", "node", "Child 2"),
      createPoint("child3", "node", "Child 3"),
    ],
    connections: [
      createConnection("c1", "child1", "root"),
      createConnection("c2", "child2", "root"),
      createConnection("c3", "child3", "root"),
    ],
  };
}

function createDefaultConfig(): ShapeGenerationConfig {
  return {
    bounds: { x: 0, y: 0, width: 500, height: 400 },
    defaultNodeWidth: 100,
    defaultNodeHeight: 60,
    defaultSpacing: 10,
  };
}

// =============================================================================
// generateDiagramShapes Tests
// =============================================================================

describe("generateDiagramShapes", () => {
  it("generates shapes from data model", () => {
    const dataModel = createSimpleDataModel();
    const config = createDefaultConfig();

    const result = generateDiagramShapes(
      dataModel,
      undefined,
      undefined,
      undefined,
      config
    );

    expect(result.shapes.length).toBeGreaterThan(0);
    expect(result.treeResult.nodeCount).toBe(4);
  });

  it("returns empty shapes for empty data model", () => {
    const dataModel: DiagramDataModel = {
      points: [],
      connections: [],
    };
    const config = createDefaultConfig();

    const result = generateDiagramShapes(
      dataModel,
      undefined,
      undefined,
      undefined,
      config
    );

    expect(result.shapes).toHaveLength(0);
  });

  it("generates shapes with correct bounds", () => {
    const dataModel = createSimpleDataModel();
    const config = createDefaultConfig();

    const result = generateDiagramShapes(
      dataModel,
      undefined,
      undefined,
      undefined,
      config
    );

    for (const shape of result.shapes) {
      expect(getShapeX(shape)).toBeGreaterThanOrEqual(0);
      expect(getShapeY(shape)).toBeGreaterThanOrEqual(0);
      expect(getShapeWidth(shape)).toBeGreaterThan(0);
      expect(getShapeHeight(shape)).toBeGreaterThan(0);
    }
  });

  it("includes text content in shapes", () => {
    const dataModel = createSimpleDataModel();
    const config = createDefaultConfig();

    const result = generateDiagramShapes(
      dataModel,
      undefined,
      undefined,
      undefined,
      config
    );

    const shapesWithText = result.shapes.filter((s) => getShapeText(s));
    expect(shapesWithText.length).toBeGreaterThan(0);
    expect(shapesWithText.some((s) => getShapeText(s) === "Root")).toBe(true);
  });

  it("assigns unique IDs to shapes", () => {
    const dataModel = createSimpleDataModel();
    const config = createDefaultConfig();

    const result = generateDiagramShapes(
      dataModel,
      undefined,
      undefined,
      undefined,
      config
    );

    const ids = result.shapes.map((s) => getShapeId(s));
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("returns shapes without fills when no color definition provided", () => {
    const dataModel = createSimpleDataModel();
    const config = createDefaultConfig();

    const result = generateDiagramShapes(
      dataModel,
      undefined,
      undefined,
      undefined,
      config
    );

    // Without color definition, shapes have no fills
    // This is correct behavior - fills come from color definitions, not defaults
    expect(result.shapes.every((s) => getShapeFillColor(s) === undefined)).toBe(true);
  });

  it("applies layout definition", () => {
    const dataModel = createSimpleDataModel();
    const config = createDefaultConfig();
    const layoutDef: DiagramLayoutDefinition = {
      layoutNode: {
        algorithm: { type: "lin", params: [{ type: "linDir", value: "fromT" }] },
        shape: { type: "rect" },
      },
    };

    const result = generateDiagramShapes(
      dataModel,
      layoutDef,
      undefined,
      undefined,
      config
    );

    expect(result.shapes.length).toBeGreaterThan(0);
  });

  it("applies color definition", () => {
    const dataModel: DiagramDataModel = {
      points: [
        {
          ...createPoint("1", "node", "Test"),
          propertySet: { presentationStyleLabel: "node0" },
        },
      ],
      connections: [],
    };
    const config = createDefaultConfig();
    const colorDef: DiagramColorsDefinition = {
      styleLabels: [
        {
          name: "node0",
          fillColors: {
            colors: [{ spec: { type: "srgb", value: "FF0000" } }],
          },
        },
      ],
    };

    const result = generateDiagramShapes(
      dataModel,
      undefined,
      undefined,
      colorDef,
      config
    );

    expect(result.shapes.length).toBeGreaterThan(0);
    expect(getShapeFillColor(result.shapes[0])?.toUpperCase()).toBe("#FF0000");
  });
});


// =============================================================================
// SpShape Test Helper
// =============================================================================

function createTestTextBody(text: string): TextBody {
  return {
    bodyProperties: {},
    paragraphs: [{
      properties: {},
      runs: [{ type: "text" as const, text }],
    }],
  } as TextBody;
}

function createTestSpShape(overrides: {
  id?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  fill?: Fill;
  line?: Line;
  text?: string;
}): SpShape {
  const textBody: TextBody | undefined = overrides.text ? createTestTextBody(overrides.text) : undefined;

  return {
    type: "sp",
    nonVisual: {
      id: overrides.id ?? "test-shape",
      name: "Test Shape",
    },
    properties: {
      transform: {
        x: px(overrides.x ?? 0),
        y: px(overrides.y ?? 0),
        width: px(overrides.width ?? 100),
        height: px(overrides.height ?? 60),
        rotation: deg(overrides.rotation ?? 0),
        flipH: false,
        flipV: false,
      },
      fill: overrides.fill,
      line: overrides.line,
    },
    textBody,
  };
}

function createTestLine(width: number, hexColor: string): Line {
  return {
    width: px(width),
    fill: {
      type: "solidFill",
      color: { spec: { type: "srgb", value: hexColor } },
    },
    cap: "flat",
    compound: "sng",
    alignment: "ctr",
    dash: "solid",
    join: "round",
  };
}

// =============================================================================
// shapeToSvgAttributes Tests
// =============================================================================

describe("shapeToSvgAttributes", () => {
  it("generates basic attributes", () => {
    const shape = createTestSpShape({
      x: 10,
      y: 20,
      width: 100,
      height: 60,
    });

    const attrs = shapeToSvgAttributes(shape);

    expect(attrs.x).toBe("10");
    expect(attrs.y).toBe("20");
    expect(attrs.width).toBe("100");
    expect(attrs.height).toBe("60");
  });

  it("includes fill color", () => {
    const shape = createTestSpShape({
      fill: {
        type: "solidFill",
        color: { spec: { type: "srgb", value: "FF0000" } },
      },
    });

    const attrs = shapeToSvgAttributes(shape);

    expect(attrs.fill).toBe("#FF0000");
  });

  it("sets fill to none when no fill", () => {
    const shape = createTestSpShape({});

    const attrs = shapeToSvgAttributes(shape);

    expect(attrs.fill).toBe("none");
  });

  it("includes stroke attributes", () => {
    const shape = createTestSpShape({
      line: createTestLine(2, "000000"),
    });

    const attrs = shapeToSvgAttributes(shape);

    expect(attrs.stroke).toBe("#000000");
    expect(attrs["stroke-width"]).toBe("2");
  });

  it("includes rotation transform", () => {
    const shape = createTestSpShape({
      rotation: 45,
    });

    const attrs = shapeToSvgAttributes(shape);

    expect(attrs.transform).toContain("rotate(45");
  });
});

// =============================================================================
// generateShapeSvg Tests
// =============================================================================

describe("generateShapeSvg", () => {
  it("generates rect element", () => {
    const shape = createTestSpShape({
      x: 10,
      y: 20,
      width: 100,
      height: 60,
    });

    const svg = generateShapeSvg(shape);

    expect(svg).toContain("<rect");
    expect(svg).toContain('x="10"');
    expect(svg).toContain('y="20"');
  });

  it("includes text element", () => {
    const shape = createTestSpShape({
      text: "Hello",
    });

    const svg = generateShapeSvg(shape);

    expect(svg).toContain("<text");
    expect(svg).toContain("Hello");
  });

  it("escapes XML special characters in text", () => {
    const shape = createTestSpShape({
      text: "<Test & More>",
    });

    const svg = generateShapeSvg(shape);

    expect(svg).toContain("&lt;Test &amp; More&gt;");
  });

  it("includes fill color in rect", () => {
    const shape = createTestSpShape({
      fill: {
        type: "solidFill",
        color: { spec: { type: "srgb", value: "FF0000" } },
      },
    });

    const svg = generateShapeSvg(shape);

    expect(svg).toContain('fill="#FF0000"');
  });
});
