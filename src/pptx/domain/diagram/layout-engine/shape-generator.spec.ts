/**
 * @file Tests for shape generator
 *
 * @see ECMA-376 Part 1, Section 21.4 - DrawingML Diagrams
 */

import { describe, it, expect } from "vitest";
import type {
  DiagramDataModel,
  DiagramLayoutDefinition,
  DiagramStyleDefinition,
  DiagramColorsDefinition,
  DiagramPoint,
  DiagramConnection,
} from "../types";
import type { SpShape } from "../../shape";
import type { Fill, SolidFill } from "../../color";
import {
  generateDiagramShapes,
  flattenShapes,
  shapeToSvgAttributes,
  generateShapeSvg,
  spShapeToGeneratedShape,
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

function createPoint(
  modelId: string,
  type?: string,
  text?: string
): DiagramPoint {
  return {
    modelId,
    type,
    textBody: text
      ? {
          bodyProperties: {},
          paragraphs: [
            {
              properties: {},
              runs: [{ type: "text" as const, text }],
            },
          ],
        }
      : undefined,
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

  it("uses provided theme colors", () => {
    const dataModel = createSimpleDataModel();
    const config: ShapeGenerationConfig = {
      ...createDefaultConfig(),
      themeColors: new Map([["accent1", "#FF0000"]]),
    };

    const result = generateDiagramShapes(
      dataModel,
      undefined,
      undefined,
      undefined,
      config
    );

    // Should have fill colors applied
    expect(result.shapes.some((s) => getShapeFillColor(s))).toBe(true);
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
// flattenShapes Tests
// =============================================================================

describe("flattenShapes", () => {
  it("returns empty array for empty input", () => {
    const result = flattenShapes([]);
    expect(result).toHaveLength(0);
  });

  it("flattens nested shapes", () => {
    const dataModel = createSimpleDataModel();
    const config = createDefaultConfig();

    const genResult = generateDiagramShapes(
      dataModel,
      undefined,
      undefined,
      undefined,
      config
    );

    const flattened = flattenShapes(genResult.shapes);

    // Should have all shapes flattened
    expect(flattened.length).toBeGreaterThanOrEqual(genResult.shapes.length);
  });

  it("preserves all shape properties", () => {
    const dataModel = createSimpleDataModel();
    const config = createDefaultConfig();

    const genResult = generateDiagramShapes(
      dataModel,
      undefined,
      undefined,
      undefined,
      config
    );

    // Ensure we have shapes
    expect(genResult.shapes.length).toBeGreaterThan(0);

    const result = flattenShapes(genResult.shapes);

    // Verify properties are preserved
    expect(result[0].type).toBe("sp");
    expect(result[0].nonVisual.id).toBeTruthy();
    expect(result[0].properties.transform).toBeDefined();
  });

  it("converts to legacy GeneratedShape format correctly", () => {
    const dataModel = createSimpleDataModel();
    const config = createDefaultConfig();

    const genResult = generateDiagramShapes(
      dataModel,
      undefined,
      undefined,
      undefined,
      config
    );

    const legacyShapes = genResult.shapes.map(spShapeToGeneratedShape);

    expect(legacyShapes[0].id).toBeTruthy();
    expect(legacyShapes[0].x).toBeGreaterThanOrEqual(0);
    expect(legacyShapes[0].width).toBeGreaterThan(0);
    expect(legacyShapes[0].children).toEqual([]);
  });
});

// =============================================================================
// shapeToSvgAttributes Tests
// =============================================================================

describe("shapeToSvgAttributes", () => {
  it("generates basic attributes", () => {
    const shape = {
      id: "s1",
      shapeType: "rect" as const,
      x: 10,
      y: 20,
      width: 100,
      height: 60,
      children: [],
      sourceNodeId: "n1",
    };

    const attrs = shapeToSvgAttributes(shape);

    expect(attrs.x).toBe("10");
    expect(attrs.y).toBe("20");
    expect(attrs.width).toBe("100");
    expect(attrs.height).toBe("60");
  });

  it("includes fill color", () => {
    const shape = {
      id: "s1",
      shapeType: "rect" as const,
      x: 0,
      y: 0,
      width: 100,
      height: 60,
      fillColor: "#FF0000",
      children: [],
      sourceNodeId: "n1",
    };

    const attrs = shapeToSvgAttributes(shape);

    expect(attrs.fill).toBe("#FF0000");
  });

  it("sets fill to none when no fill color", () => {
    const shape = {
      id: "s1",
      shapeType: "rect" as const,
      x: 0,
      y: 0,
      width: 100,
      height: 60,
      children: [],
      sourceNodeId: "n1",
    };

    const attrs = shapeToSvgAttributes(shape);

    expect(attrs.fill).toBe("none");
  });

  it("includes stroke attributes", () => {
    const shape = {
      id: "s1",
      shapeType: "rect" as const,
      x: 0,
      y: 0,
      width: 100,
      height: 60,
      lineColor: "#000000",
      lineWidth: 2,
      children: [],
      sourceNodeId: "n1",
    };

    const attrs = shapeToSvgAttributes(shape);

    expect(attrs.stroke).toBe("#000000");
    expect(attrs["stroke-width"]).toBe("2");
  });

  it("includes rotation transform", () => {
    const shape = {
      id: "s1",
      shapeType: "rect" as const,
      x: 0,
      y: 0,
      width: 100,
      height: 60,
      rotation: 45,
      children: [],
      sourceNodeId: "n1",
    };

    const attrs = shapeToSvgAttributes(shape);

    expect(attrs.transform).toContain("rotate(45");
  });
});

// =============================================================================
// generateShapeSvg Tests
// =============================================================================

describe("generateShapeSvg", () => {
  it("generates rect element", () => {
    const shape = {
      id: "s1",
      shapeType: "rect" as const,
      x: 10,
      y: 20,
      width: 100,
      height: 60,
      children: [],
      sourceNodeId: "n1",
    };

    const svg = generateShapeSvg(shape);

    expect(svg).toContain("<rect");
    expect(svg).toContain('x="10"');
    expect(svg).toContain('y="20"');
  });

  it("includes text element", () => {
    const shape = {
      id: "s1",
      shapeType: "rect" as const,
      x: 0,
      y: 0,
      width: 100,
      height: 60,
      text: "Hello",
      children: [],
      sourceNodeId: "n1",
    };

    const svg = generateShapeSvg(shape);

    expect(svg).toContain("<text");
    expect(svg).toContain("Hello");
  });

  it("escapes XML special characters in text", () => {
    const shape = {
      id: "s1",
      shapeType: "rect" as const,
      x: 0,
      y: 0,
      width: 100,
      height: 60,
      text: "<Test & More>",
      children: [],
      sourceNodeId: "n1",
    };

    const svg = generateShapeSvg(shape);

    expect(svg).toContain("&lt;Test &amp; More&gt;");
  });

  it("includes fill color in rect", () => {
    const shape = {
      id: "s1",
      shapeType: "rect" as const,
      x: 0,
      y: 0,
      width: 100,
      height: 60,
      fillColor: "#FF0000",
      children: [],
      sourceNodeId: "n1",
    };

    const svg = generateShapeSvg(shape);

    expect(svg).toContain('fill="#FF0000"');
  });

  it("uses text color for text element", () => {
    const shape = {
      id: "s1",
      shapeType: "rect" as const,
      x: 0,
      y: 0,
      width: 100,
      height: 60,
      text: "Test",
      textColor: "#0000FF",
      children: [],
      sourceNodeId: "n1",
    };

    const svg = generateShapeSvg(shape);

    expect(svg).toContain('fill="#0000FF"');
  });
});
