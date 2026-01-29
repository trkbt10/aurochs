/**
 * @file DiagramEditor component tests
 *
 * Tests the DiagramEditor handles diagram data model correctly.
 */

import type { DiagramDataModel, DiagramPoint, DiagramConnection } from "@oxen-office/diagram/domain";
import type { BodyProperties } from "@oxen-office/pptx/domain/text";
import { px } from "@oxen-office/ooxml/domain/units";
import { createDefaultDiagramDataModel, createDefaultDiagramPoint, createDefaultDiagramConnection } from "@oxen-ui/diagram-editor";

const createDefaultBodyProperties = (): BodyProperties => ({
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
});

describe("DiagramEditor: Data model handling", () => {
  describe("createDefaultDiagramDataModel", () => {
    it("creates valid default diagram data model", () => {
      const dataModel = createDefaultDiagramDataModel();

      expect(dataModel.points).toBeDefined();
      expect(Array.isArray(dataModel.points)).toBe(true);
      expect(dataModel.connections).toBeDefined();
      expect(Array.isArray(dataModel.connections)).toBe(true);
    });
  });

  describe("createDefaultDiagramPoint", () => {
    it("creates valid default diagram point", () => {
      const point = createDefaultDiagramPoint();

      expect(point.modelId).toBeDefined();
      expect(typeof point.modelId).toBe("string");
      expect(point.type).toBe("node");
    });
  });

  describe("createDefaultDiagramConnection", () => {
    it("creates valid default diagram connection", () => {
      const connection = createDefaultDiagramConnection();

      expect(connection.modelId).toBeDefined();
      expect(typeof connection.modelId).toBe("string");
      expect(connection.type).toBe("parOf");
    });
  });

  describe("DiagramDataModel structure", () => {
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
        connections: [
          { modelId: "c1", type: "parOf", sourceId: "1", destinationId: "2" },
        ],
      };

      expect(dataModel.connections.length).toBe(1);
      expect(dataModel.connections[0].sourceId).toBe("1");
      expect(dataModel.connections[0].destinationId).toBe("2");
    });

    it("handles diagram point with text body", () => {
      const point: DiagramPoint = {
        modelId: "1",
        type: "node",
        textBody: {
          bodyProperties: createDefaultBodyProperties(),
          paragraphs: [
            {
              properties: { level: 0, alignment: "left" },
              runs: [{ type: "text", text: "Node text" }],
            },
          ],
        },
      };

      expect(point.textBody).toBeDefined();
      const textBody = point.textBody;
      expect(isTextBodyWithParagraphs(textBody)).toBe(true);
      if (!isTextBodyWithParagraphs(textBody)) {
        throw new Error("expected textBody to have paragraphs");
      }
      expect(textBody.paragraphs[0].runs[0]).toMatchObject({ type: "text", text: "Node text" });
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
});

function isTextBodyWithParagraphs(
  value: unknown,
): value is { readonly paragraphs: readonly { readonly runs: readonly unknown[] }[] } {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (!("paragraphs" in value)) {
    return false;
  }
  const paragraphs = (value as { readonly paragraphs?: unknown }).paragraphs;
  if (!Array.isArray(paragraphs)) {
    return false;
  }
  return paragraphs.every((p) => typeof p === "object" && p !== null && "runs" in p && Array.isArray((p as { runs?: unknown }).runs));
}
