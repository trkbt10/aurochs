/**
 * @file Tests for diagram layout result generator
 */

import type {
  DiagramColorsDefinition,
  DiagramConnection,
  DiagramDataModel,
  DiagramPoint,
} from "../domain/types";
import { generateDiagramLayoutResults, type ShapeGenerationConfig } from "./shape-generator";

function createPoint(
  modelId: string,
  opts: { type?: string; styleLabel?: string; textBody?: unknown } = {}
): DiagramPoint {
  return {
    modelId,
    type: opts.type,
    propertySet: opts.styleLabel ? { presentationStyleLabel: opts.styleLabel } : undefined,
    textBody: opts.textBody,
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
      createPoint("root", { type: "doc", textBody: { t: "Root" } }),
      createPoint("child1", { type: "node", textBody: { t: "Child 1" } }),
      createPoint("child2", { type: "node", textBody: { t: "Child 2" } }),
    ],
    connections: [
      createConnection("c1", "child1", "root"),
      createConnection("c2", "child2", "root"),
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

describe("generateDiagramLayoutResults", () => {
  it("generates layout results from data model", () => {
    const dataModel = createSimpleDataModel();
    const result = generateDiagramLayoutResults(
      dataModel,
      undefined,
      undefined,
      undefined,
      createDefaultConfig()
    );

    expect(result.shapes.length).toBeGreaterThan(0);
    expect(result.treeResult.nodeCount).toBe(3);
  });

  it("propagates modelId and textBody", () => {
    const dataModel: DiagramDataModel = {
      points: [createPoint("n1", { type: "node", textBody: { t: "X" } })],
      connections: [],
    };

    const result = generateDiagramLayoutResults(
      dataModel,
      undefined,
      undefined,
      undefined,
      createDefaultConfig()
    );

    expect(result.shapes).toHaveLength(1);
    expect(result.shapes[0].modelId).toBe("n1");
    expect(result.shapes[0].textBody).toEqual({ t: "X" });
  });

  it("applies fill from color definition when style label matches", () => {
    const dataModel: DiagramDataModel = {
      points: [
        createPoint("n1", {
          type: "node",
          styleLabel: "node0",
        }),
      ],
      connections: [],
    };

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

    const result = generateDiagramLayoutResults(
      dataModel,
      undefined,
      undefined,
      colorDef,
      createDefaultConfig()
    );

    expect(result.shapes).toHaveLength(1);
    expect(result.shapes[0].fill?.type).toBe("solidFill");
    if (result.shapes[0].fill?.type === "solidFill") {
      expect(result.shapes[0].fill.color.spec).toEqual({ type: "srgb", value: "FF0000" });
    }
  });
});

