/**
 * @file DiagramEditor data model tests
 */

import type { DiagramDataModel, DiagramPoint, DiagramConnection } from "@aurochs-office/diagram/domain";
import { createDefaultDiagramDataModel, createDefaultDiagramPoint, createDefaultDiagramConnection } from "./index";

describe("diagram-editor: data model handling", () => {
  it("creates valid default diagram data model", () => {
    const dataModel = createDefaultDiagramDataModel();
    expect(Array.isArray(dataModel.points)).toBe(true);
    expect(Array.isArray(dataModel.connections)).toBe(true);
  });

  it("creates valid default diagram point", () => {
    const point = createDefaultDiagramPoint();
    expect(typeof point.modelId).toBe("string");
    expect(point.type).toBe("node");
  });

  it("creates valid default diagram connection", () => {
    const connection = createDefaultDiagramConnection();
    expect(typeof connection.modelId).toBe("string");
    expect(connection.type).toBe("parOf");
  });

  it("handles diagram with multiple points", () => {
    const dataModel: DiagramDataModel = {
      points: [
        { modelId: "1", type: "node" },
        { modelId: "2", type: "node" },
        { modelId: "3", type: "asst" },
      ],
      connections: [],
    };

    expect(dataModel.points.length).toBe(3);
    expect(dataModel.points[2].type).toBe("asst");
  });

  it("handles diagram with connections", () => {
    const dataModel: DiagramDataModel = {
      points: [
        { modelId: "1", type: "node" },
        { modelId: "2", type: "node" },
      ],
      connections: [{ modelId: "c1", type: "parOf", sourceId: "1", destinationId: "2" }],
    };

    expect(dataModel.connections.length).toBe(1);
    expect(dataModel.connections[0].sourceId).toBe("1");
    expect(dataModel.connections[0].destinationId).toBe("2");
  });

  it("accepts diagram point with text body-like payload", () => {
    const point: DiagramPoint = {
      modelId: "1",
      type: "node",
      textBody: {
        paragraphs: [
          {
            runs: [{ type: "text", text: "Node text" }],
          },
        ],
      },
    };

    expect(point.textBody).toBeDefined();
  });

  it("handles connection types", () => {
    const connections: DiagramConnection[] = [
      { modelId: "1", type: "parOf" },
      { modelId: "2", type: "presOf" },
      { modelId: "3", type: "presParOf" },
    ];

    expect(connections[0].type).toBe("parOf");
    expect(connections[1].type).toBe("presOf");
    expect(connections[2].type).toBe("presParOf");
  });
});
