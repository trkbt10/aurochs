/** @file Unit tests for diagram shape generator */
import type { DiagramColorsDefinition, DiagramDataModel } from "@aurochs-office/diagram/domain";
import type { TextBody } from "../../text";
import { generateDiagramShapes } from "./shape-generator";

function createTextBody(text: string): TextBody {
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

describe("generateDiagramShapes (PPTX adapter)", () => {
  it("generates SpShape with id/name/modelId", () => {
    const dataModel: DiagramDataModel = {
      points: [{ modelId: "n1", type: "node" }],
      connections: [],
    };

    const result = generateDiagramShapes({
      dataModel,
      layoutDefinition: undefined,
      styleDefinition: undefined,
      colorDefinition: undefined,
      config: { bounds: { x: 0, y: 0, width: 500, height: 400 } },
    });

    expect(result.shapes).toHaveLength(1);
    expect(result.shapes[0].nonVisual.id).toBe("shape-n1");
    expect(result.shapes[0].nonVisual.name).toBe("Diagram Shape n1");
    expect(result.shapes[0].modelId).toBe("n1");
  });

  it("applies diagram textFill to runs without fill", () => {
    const dataModel: DiagramDataModel = {
      points: [
        {
          modelId: "n1",
          type: "node",
          propertySet: { presentationStyleLabel: "node0" },
          textBody: createTextBody("Hello"),
        },
      ],
      connections: [],
    };

    const colorDef: DiagramColorsDefinition = {
      styleLabels: [
        {
          name: "node0",
          textFillColors: {
            colors: [{ spec: { type: "srgb", value: "00FF00" } }],
          },
        },
      ],
    };

    const result = generateDiagramShapes({
      dataModel,
      layoutDefinition: undefined,
      styleDefinition: undefined,
      colorDefinition: colorDef,
      config: { bounds: { x: 0, y: 0, width: 500, height: 400 } },
    });

    expect(result.shapes).toHaveLength(1);
    const textBody = result.shapes[0].textBody;
    expect(textBody).toBeDefined();
    if (!textBody) {
      throw new Error("Expected shape.textBody to be defined");
    }

    const run = textBody.paragraphs[0]?.runs?.[0];
    expect(run?.type).toBe("text");
    if (run?.type === "text") {
      expect(run.properties?.fill).toEqual({
        type: "solidFill",
        color: { spec: { type: "srgb", value: "00FF00" } },
      });
    }
  });
});
