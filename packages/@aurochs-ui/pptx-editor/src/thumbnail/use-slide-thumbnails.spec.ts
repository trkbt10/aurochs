/**
 * @file Tests for useSlideThumbnails
 *
 * Verifies that the SVG thumbnail rendering path produces diagram shapes
 * instead of [Diagram] placeholder. This is the non-React SVG string path
 * (renderSlideSvg) which is separate from the React SlideRenderer path.
 *
 * Also verifies the structural invariant: registerSlideResources
 * writes to the same ResourceStore that renderSlideSvg reads from.
 */

// @vitest-environment jsdom

import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import type { SlideWithId } from "@aurochs-office/pptx/app";
import type { Slide, Shape } from "@aurochs-office/pptx/domain";
import type { ShapeId, ResourceId } from "@aurochs-office/pptx/domain/types";

import { px, deg } from "@aurochs-office/drawing-ml/domain/units";
import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";
import { renderSlideSvg } from "@aurochs-renderer/pptx/svg";
import { createCoreRenderContext } from "@aurochs-renderer/pptx";
import { createResourceStore } from "@aurochs-office/pptx/domain/resource-store";
import { loadSlideExternalContent, NULL_FILE_READER } from "@aurochs-office/pptx/parser/slide/external-content-loader";
import { registerEditorResources } from "../resource/register-slide-resources";
import { useSlideThumbnails } from "./use-slide-thumbnails";

// =============================================================================
// Fixtures
// =============================================================================

function createDiagramSlide(diagramType: "process" | "cycle" | "hierarchy" | "relationship"): Slide {
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
            dataResourceId: "diagram-diag-1" as ResourceId,
            diagramType,
          },
        },
      },
    ],
  };
}

function createChartSlide(): Slide {
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
            resourceId: "chart-res-1" as ResourceId,
            chartType: "barChart",
          },
        },
      },
    ],
  };
}

// =============================================================================
// Structural invariant test: same ResourceStore for write and read
// =============================================================================

describe("renderSlideSvg structural invariant", () => {
  it("should render diagram when registerSlideResources and renderSlideSvg share the same ResourceStore", () => {
    const slide = createDiagramSlide("process");
    const store = createResourceStore();
    const ctx = createCoreRenderContext({
      slideSize: { width: px(960), height: px(540) },
      resourceStore: store,
    });

    // Write to the SAME store that ctx references
    registerEditorResources(slide, store);

    // renderSlideSvg reads from ctx.resourceStore (which is store)
    const result = renderSlideSvg(slide, ctx);
    expect(result.svg).not.toContain("[Diagram]");
  });

  it("should generate diagram shapes with unique IDs", () => {
    const slide = createDiagramSlide("process");
    const store = createResourceStore();
    registerEditorResources(slide, store);

    const entry = store.get<{ shapes: readonly Shape[] }>("diagram-diag-1");
    const ids = entry!.parsed!.shapes
      .filter((s): s is Shape & { nonVisual: { id: string } } => "nonVisual" in s)
      .map((s) => s.nonVisual.id);

    // All IDs must be unique (layout engine must not emit duplicates)
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(duplicates, `All IDs: ${JSON.stringify(ids)}`).toEqual([]);
  });

  it("should FAIL when registerSlideResources writes to a DIFFERENT store than renderSlideSvg reads from (diagram)", () => {
    const slide = createDiagramSlide("process");
    const writeStore = createResourceStore();
    const readStore = createResourceStore();
    const ctx = createCoreRenderContext({
      slideSize: { width: px(960), height: px(540) },
      resourceStore: readStore,
    });

    registerEditorResources(slide, writeStore);

    expect(() => renderSlideSvg(slide, ctx)).toThrow();
  });

  it("should register diagram when parser left no entry (editor-created diagram, no archive)", () => {
    const slide = createDiagramSlide("process");
    const store = createResourceStore();
    const ctx = createCoreRenderContext({
      slideSize: { width: px(960), height: px(540) },
      resourceStore: store,
    });

    // Parser (loadSlideExternalContent) does not register if no archive data found.
    // Builder (registerSlideResources) fills in the gap.
    registerEditorResources(slide, store);

    const result = renderSlideSvg(slide, ctx);
    expect(result.svg).not.toContain("[Diagram]");
  });

  it("should not overwrite parser-registered diagram with shapes", () => {
    const slide = createDiagramSlide("process");
    const store = createResourceStore();
    const ctx = createCoreRenderContext({
      slideSize: { width: px(960), height: px(540) },
      resourceStore: store,
    });

    // Parser registered real shapes from archive
    const markerShape = { type: "sp" as const, nonVisual: { id: "marker" }, properties: {} };
    store.set("diagram-diag-1", {
      kind: "diagram",
      source: "parsed",
      data: new ArrayBuffer(0),
      parsed: { shapes: [markerShape] },
    });

    registerEditorResources(slide, store);

    // Builder must NOT overwrite — parser's entry takes precedence
    const entry = store.get<{ shapes: readonly unknown[] }>("diagram-diag-1");
    expect(entry!.source).toBe("parsed");
    expect(entry!.parsed!.shapes[0]).toBe(markerShape);
  });

  it("should work after loadSlideExternalContent runs on editor-created diagram (simulates apiSlide present)", () => {
    // This simulates the browser failure path:
    // 1. buildRenderContext creates ctx with its own ResourceStore
    // 2. loadSlideExternalContent runs (parser) — for editor-created diagram, no archive data
    // 3. registerSlideResources runs (builder) — should fill in the gap
    // 4. renderSlideSvg runs (renderer) — should find data in ctx.resourceStore

    const slide = createDiagramSlide("process");
    const store = createResourceStore();
    const ctx = createCoreRenderContext({
      slideSize: { width: px(960), height: px(540) },
      resourceStore: store,
    });

    // Step 2: Parser enrichment with no archive (NULL_FILE_READER)
    const enrichedSlide = loadSlideExternalContent(slide, NULL_FILE_READER, store);

    // Parser must NOT have registered an empty entry
    expect(store.has("diagram-diag-1")).toBe(false);

    // Step 3: Builder fills in
    registerEditorResources(enrichedSlide, store);

    // Step 4: Renderer reads from the SAME store
    const result = renderSlideSvg(enrichedSlide, ctx);
    expect(result.svg).not.toContain("[Diagram]");
  });

  it("should render chart when registerSlideResources and renderSlideSvg share the same ResourceStore", () => {
    const slide = createChartSlide();
    const store = createResourceStore();
    const ctx = createCoreRenderContext({
      slideSize: { width: px(960), height: px(540) },
      resourceStore: store,
    });

    registerEditorResources(slide, store);

    const result = renderSlideSvg(slide, ctx);
    expect(result.svg).not.toContain("[Chart]");
  });
});

// =============================================================================
// useSlideThumbnails integration tests (apiSlide=undefined path)
// =============================================================================

describe("useSlideThumbnails", () => {
  const DIAGRAM_TYPES = ["process", "cycle", "hierarchy", "relationship"] as const;

  for (const diagramType of DIAGRAM_TYPES) {
    it(`should render ${diagramType} diagram shapes in SVG thumbnail (not [Diagram] placeholder)`, () => {
      const slideWithId: SlideWithId = { id: "slide-1", slide: createDiagramSlide(diagramType) };

      const { result } = renderHook(() =>
        useSlideThumbnails({
          slideWidth: px(960) as Pixels,
          slideHeight: px(540) as Pixels,
          slides: [slideWithId],

        }),
      );

      // Calls renderSlideSvg → renderGraphicFrameSvg → renderDiagramShapesSvg
      // If ResourceStore mismatch exists, renderGraphicFrameSvg throws
      const svg = result.current.getThumbnailSvg(slideWithId);

      expect(svg).not.toContain("[Diagram]");
      expect(svg).toContain("<g");
      expect(svg.length).toBeGreaterThan(100);
    });
  }

  it("should render chart in SVG thumbnail (not [Chart] placeholder)", () => {
    const slideWithId: SlideWithId = { id: "slide-chart", slide: createChartSlide() };

    const { result } = renderHook(() =>
      useSlideThumbnails({
        slideWidth: px(960) as Pixels,
        slideHeight: px(540) as Pixels,
        slides: [slideWithId],
      }),
    );

    const svg = result.current.getThumbnailSvg(slideWithId);
    expect(svg).not.toContain("[Chart]");
    expect(svg).toContain("<g");
  });

  it("should render empty slide without error", () => {
    const slideWithId: SlideWithId = {
      id: "slide-empty",
      slide: { shapes: [] },
    };

    const { result } = renderHook(() =>
      useSlideThumbnails({
        slideWidth: px(960) as Pixels,
        slideHeight: px(540) as Pixels,
        slides: [slideWithId],
      }),
    );

    const svg = result.current.getThumbnailSvg(slideWithId);
    expect(svg).toBeDefined();
    expect(svg).not.toContain("[Diagram]");
  });
});
