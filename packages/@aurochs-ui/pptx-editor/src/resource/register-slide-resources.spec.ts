/**
 * @file Tests for prepareSlide (register-slide-resources)
 *
 * Verifies the key invariant: prepareSlide does NOT overwrite entries
 * that already exist in the ResourceStore (archive-loaded resources),
 * but DOES fill in entries for editor-created shapes that have no
 * store entry yet.
 */

import type { Slide } from "@aurochs-office/pptx/domain";
import type { Shape } from "@aurochs-office/pptx/domain";
import type { ShapeId, ResourceId } from "@aurochs-office/pptx/domain/types";
import { px, deg } from "@aurochs-office/drawing-ml/domain/units";
import { createResourceStore, type ResolvedResourceEntry } from "@aurochs-office/ooxml/domain/resource-store";
import { prepareSlide } from "./register-slide-resources";

// =============================================================================
// Fixtures
// =============================================================================

function createDiagramSlide(
  diagramType: "process" | "cycle" | "hierarchy" | "relationship",
  resourceId = "diagram-diag-1" as ResourceId,
): Slide {
  return {
    shapes: [
      {
        type: "graphicFrame",
        nonVisual: { id: "diag-1" as ShapeId, name: "Diagram 1" },
        transform: {
          x: px(100), y: px(100), width: px(400), height: px(300),
          rotation: deg(0), flipH: false, flipV: false,
        },
        content: {
          type: "diagram",
          data: {
            dataResourceId: resourceId,
            diagramType,
          },
        },
      },
    ],
  };
}

function createChartSlide(
  chartType: "barChart" | "lineChart" | "pieChart" = "barChart",
  resourceId = "chart-res-1" as ResourceId,
): Slide {
  return {
    shapes: [
      {
        type: "graphicFrame",
        nonVisual: { id: "chart-1" as ShapeId, name: "Chart 1" },
        transform: {
          x: px(100), y: px(100), width: px(400), height: px(300),
          rotation: deg(0), flipH: false, flipV: false,
        },
        content: {
          type: "chart",
          data: {
            resourceId,
            chartType,
          },
        },
      },
    ],
  };
}

// =============================================================================
// Pre-populated ResourceStore: archive entries must NOT be overwritten
// =============================================================================

describe("prepareSlide with pre-populated ResourceStore", () => {
  it("should NOT overwrite a diagram entry that already exists in the store (archive-loaded)", () => {
    const slide = createDiagramSlide("process");
    const store = createResourceStore();

    // Simulate archive-loaded entry (parser already populated the store)
    const markerShape: Shape = {
      type: "sp",
      nonVisual: { id: "archive-marker" as ShapeId, name: "Archive Shape" },
      properties: {},
    };
    const archiveEntry: ResolvedResourceEntry<{ shapes: readonly Shape[] }> = {
      kind: "diagram",
      source: "parsed",
      data: new ArrayBuffer(16),
      parsed: { shapes: [markerShape] },
    };
    store.set("diagram-diag-1", archiveEntry);

    prepareSlide(slide, store);

    // The archive entry must remain untouched
    const entry = store.get<{ shapes: readonly Shape[] }>("diagram-diag-1");
    expect(entry).toBeDefined();
    expect(entry!.source).toBe("parsed");
    expect(entry!.parsed!.shapes).toHaveLength(1);
    expect(entry!.parsed!.shapes[0]).toBe(markerShape);
  });

  it("should NOT overwrite a chart entry that already exists in the store (archive-loaded)", () => {
    const slide = createChartSlide("barChart");
    const store = createResourceStore();

    // Simulate archive-loaded chart
    const archiveChartData = { title: "Revenue 2025", series: [{ name: "Q1" }] };
    const archiveEntry: ResolvedResourceEntry = {
      kind: "chart",
      source: "parsed",
      data: new ArrayBuffer(32),
      parsed: archiveChartData,
    };
    store.set("chart-res-1", archiveEntry);

    prepareSlide(slide, store);

    // The archive entry must remain untouched
    const entry = store.get("chart-res-1");
    expect(entry).toBeDefined();
    expect(entry!.source).toBe("parsed");
    expect(entry!.parsed).toBe(archiveChartData);
  });

  it("should preserve archive diagram data byte count (no ArrayBuffer replacement)", () => {
    const slide = createDiagramSlide("hierarchy");
    const store = createResourceStore();

    const originalData = new ArrayBuffer(256);
    store.set("diagram-diag-1", {
      kind: "diagram",
      source: "parsed",
      data: originalData,
      parsed: { shapes: [] },
    });

    prepareSlide(slide, store);

    const entry = store.get("diagram-diag-1");
    expect(entry!.data).toBe(originalData);
    expect(entry!.data.byteLength).toBe(256);
  });
});

// =============================================================================
// Empty ResourceStore: editor-created shapes must be filled in
// =============================================================================

describe("prepareSlide with empty ResourceStore (editor-created shapes)", () => {
  const DIAGRAM_TYPES = ["process", "cycle", "hierarchy", "relationship"] as const;

  for (const diagramType of DIAGRAM_TYPES) {
    it(`should register builder-generated ${diagramType} diagram when store has no entry`, () => {
      const slide = createDiagramSlide(diagramType);
      const store = createResourceStore();

      // Store is empty — no archive data
      expect(store.has("diagram-diag-1")).toBe(false);

      prepareSlide(slide, store);

      // Builder should have registered the diagram
      expect(store.has("diagram-diag-1")).toBe(true);

      const entry = store.get<{ shapes: readonly Shape[] }>("diagram-diag-1");
      expect(entry).toBeDefined();
      expect(entry!.kind).toBe("diagram");
      expect(entry!.source).toBe("created");
      expect(entry!.parsed).toBeDefined();
      expect(entry!.parsed!.shapes.length).toBeGreaterThan(0);
    });
  }

  it("should register builder-generated chart when store has no entry", () => {
    const slide = createChartSlide("barChart");
    const store = createResourceStore();

    expect(store.has("chart-res-1")).toBe(false);

    prepareSlide(slide, store);

    expect(store.has("chart-res-1")).toBe(true);

    const entry = store.get("chart-res-1");
    expect(entry).toBeDefined();
    expect(entry!.kind).toBe("chart");
    expect(entry!.source).toBe("created");
    expect(entry!.parsed).toBeDefined();
  });
});

// =============================================================================
// Mixed slide: some shapes archive-loaded, some editor-created
// =============================================================================

describe("prepareSlide with mixed archive and editor-created shapes", () => {
  it("should preserve archive diagram but register editor-created chart on the same slide", () => {
    const slide: Slide = {
      shapes: [
        // Diagram with archive data already loaded
        {
          type: "graphicFrame",
          nonVisual: { id: "diag-1" as ShapeId, name: "Diagram 1" },
          transform: {
            x: px(50), y: px(50), width: px(400), height: px(300),
            rotation: deg(0), flipH: false, flipV: false,
          },
          content: {
            type: "diagram",
            data: {
              dataResourceId: "diagram-archive" as ResourceId,
              diagramType: "process",
            },
          },
        },
        // Chart with NO archive data (editor-created)
        {
          type: "graphicFrame",
          nonVisual: { id: "chart-1" as ShapeId, name: "Chart 1" },
          transform: {
            x: px(500), y: px(50), width: px(400), height: px(300),
            rotation: deg(0), flipH: false, flipV: false,
          },
          content: {
            type: "chart",
            data: {
              resourceId: "chart-new" as ResourceId,
              chartType: "lineChart",
            },
          },
        },
      ],
    };

    const store = createResourceStore();

    // Pre-populate ONLY the diagram (archive-loaded)
    const archiveShapes = [{ type: "sp" as const, nonVisual: { id: "from-archive" }, properties: {} }];
    store.set("diagram-archive", {
      kind: "diagram",
      source: "parsed",
      data: new ArrayBuffer(64),
      parsed: { shapes: archiveShapes },
    });

    prepareSlide(slide, store);

    // Diagram: archive entry preserved
    const diagramEntry = store.get<{ shapes: readonly unknown[] }>("diagram-archive");
    expect(diagramEntry!.source).toBe("parsed");
    expect(diagramEntry!.parsed!.shapes[0]).toBe(archiveShapes[0]);

    // Chart: builder filled in
    const chartEntry = store.get("chart-new");
    expect(chartEntry).toBeDefined();
    expect(chartEntry!.kind).toBe("chart");
    expect(chartEntry!.source).toBe("created");
  });
});
