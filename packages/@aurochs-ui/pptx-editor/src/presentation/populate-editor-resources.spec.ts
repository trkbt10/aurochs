/**
 * @file Tests for populate-editor-resources
 *
 * Verifies that editor-created charts and diagrams get default data
 * populated in the ResourceStore, enabling rendering without PPTX archive.
 */

import { describe, it, expect } from "vitest";
import type { GraphicFrame, Shape } from "@aurochs-office/pptx/domain";
import type { ResourceStore } from "@aurochs-office/pptx/domain/resource-store";
import { createResourceStore } from "@aurochs-office/pptx/domain/resource-store";
import { px, deg } from "@aurochs-office/drawing-ml/domain/units";
import type { ShapeId, ResourceId } from "@aurochs-office/pptx/domain/types";
import { populateEditorCreatedResources } from "./populate-editor-resources";

// =============================================================================
// Helpers
// =============================================================================

function createDiagramFrame(id: string, width: number, height: number): GraphicFrame {
  return {
    type: "graphicFrame",
    nonVisual: { id: id as ShapeId, name: `Diagram ${id}` },
    transform: {
      x: px(100),
      y: px(100),
      width: px(width),
      height: px(height),
      rotation: deg(0),
      flipH: false,
      flipV: false,
    },
    content: {
      type: "diagram",
      data: { dataResourceId: `diagram-${id}` as ResourceId },
    },
  };
}

function createChartFrame(id: string): GraphicFrame {
  return {
    type: "graphicFrame",
    nonVisual: { id: id as ShapeId, name: `Chart ${id}` },
    transform: {
      x: px(100),
      y: px(100),
      width: px(400),
      height: px(300),
      rotation: deg(0),
      flipH: false,
      flipV: false,
    },
    content: {
      type: "chart",
      data: { resourceId: `chart-${id}` as ResourceId, chartType: "barChart" },
    },
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("populateEditorCreatedResources", () => {
  describe("diagram", () => {
    it("should populate ResourceStore for a diagram shape", () => {
      const store = createResourceStore();
      const diagramShape = createDiagramFrame("1", 500, 400);

      populateEditorCreatedResources([diagramShape], store);

      expect(store.has("diagram-1")).toBe(true);
      const entry = store.get<{ shapes: readonly Shape[]; dataModel: unknown }>("diagram-1");
      expect(entry).toBeDefined();
      expect(entry!.kind).toBe("diagram");
      expect(entry!.source).toBe("created");
      expect(entry!.parsed).toBeDefined();
      expect(entry!.parsed!.shapes).toBeDefined();
      expect(entry!.parsed!.shapes.length).toBeGreaterThan(0);
      expect(entry!.parsed!.dataModel).toBeDefined();
    });

    it("should generate shapes with positive dimensions", () => {
      const store = createResourceStore();
      const diagramShape = createDiagramFrame("2", 600, 300);

      populateEditorCreatedResources([diagramShape], store);

      const entry = store.get<{ shapes: readonly Shape[] }>("diagram-2");
      expect(entry!.parsed!.shapes.length).toBeGreaterThan(0);

      for (const shape of entry!.parsed!.shapes) {
        if (shape.type === "sp" && shape.properties.transform) {
          const t = shape.properties.transform;
          expect((t.width as number)).toBeGreaterThan(0);
          expect((t.height as number)).toBeGreaterThan(0);
        }
      }
    });

    it("should not overwrite existing ResourceStore entry", () => {
      const store = createResourceStore();
      const existingEntry = {
        kind: "diagram" as const,
        source: "parsed" as const,
        data: new ArrayBuffer(0),
        parsed: { shapes: [], dataModel: { points: [], connections: [] } },
      };
      store.set("diagram-3" as string, existingEntry);

      const diagramShape = createDiagramFrame("3", 500, 400);
      populateEditorCreatedResources([diagramShape], store);

      const entry = store.get("diagram-3");
      expect(entry!.source).toBe("parsed"); // Unchanged
      expect(entry!.parsed).toBe(existingEntry.parsed); // Same reference
    });

    it("should skip diagram with undefined dataResourceId", () => {
      const store = createResourceStore();
      const shape: GraphicFrame = {
        type: "graphicFrame",
        nonVisual: { id: "4" as ShapeId, name: "Diagram 4" },
        transform: {
          x: px(0), y: px(0), width: px(500), height: px(400),
          rotation: deg(0), flipH: false, flipV: false,
        },
        content: {
          type: "diagram",
          data: {}, // no dataResourceId
        },
      };

      populateEditorCreatedResources([shape], store);

      // Store should be empty — no resource was created
      expect([...store.keys()]).toHaveLength(0);
    });

    it("should handle multiple diagram shapes", () => {
      const store = createResourceStore();
      const shapes = [
        createDiagramFrame("a", 500, 400),
        createDiagramFrame("b", 300, 200),
      ];

      populateEditorCreatedResources(shapes, store);

      expect(store.has("diagram-a")).toBe(true);
      expect(store.has("diagram-b")).toBe(true);
    });

    it("should generate SpShape domain objects (not layout results)", () => {
      const store = createResourceStore();
      populateEditorCreatedResources([createDiagramFrame("5", 500, 400)], store);

      const entry = store.get<{ shapes: readonly Shape[] }>("diagram-5");
      for (const shape of entry!.parsed!.shapes) {
        // Generated shapes should be SpShape with type "sp"
        expect(shape.type).toBe("sp");
        if (shape.type === "sp") {
          expect(shape.nonVisual).toBeDefined();
          expect(shape.properties).toBeDefined();
          expect(shape.properties.transform).toBeDefined();
        }
      }
    });
  });

  describe("chart", () => {
    it("should populate ResourceStore for a chart shape", () => {
      const store = createResourceStore();
      populateEditorCreatedResources([createChartFrame("1")], store);

      expect(store.has("chart-1")).toBe(true);
      const entry = store.get("chart-1");
      expect(entry!.kind).toBe("chart");
      expect(entry!.source).toBe("created");
      expect(entry!.parsed).toBeDefined();
    });
  });

  describe("mixed shapes", () => {
    it("should handle a mix of shape types including non-graphicFrame", () => {
      const store = createResourceStore();
      const spShape: Shape = {
        type: "sp",
        nonVisual: { id: "sp1" as ShapeId, name: "Shape 1" },
        properties: {
          transform: {
            x: px(0), y: px(0), width: px(100), height: px(100),
            rotation: deg(0), flipH: false, flipV: false,
          },
        },
      };

      populateEditorCreatedResources(
        [spShape, createChartFrame("c1"), createDiagramFrame("d1", 400, 300)],
        store,
      );

      expect(store.has("chart-c1")).toBe(true);
      expect(store.has("diagram-d1")).toBe(true);
      expect([...store.keys()]).toHaveLength(2);
    });
  });
});
