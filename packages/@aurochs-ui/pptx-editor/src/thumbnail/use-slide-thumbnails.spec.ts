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
import { createResourceStore } from "@aurochs-office/ooxml/domain/resource-store";
import { prepareSlide } from "../resource/register-slide-resources";
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
    prepareSlide(slide, store);

    // renderSlideSvg reads from ctx.resourceStore (which is store)
    const result = renderSlideSvg(slide, ctx);
    expect(result.svg).not.toContain("[Diagram]");
  });

  it("should generate diagram shapes with unique IDs", () => {
    const slide = createDiagramSlide("process");
    const store = createResourceStore();
    prepareSlide(slide, store);

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

    prepareSlide(slide, writeStore);

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
    prepareSlide(slide, store);

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

    prepareSlide(slide, store);

    // Builder must NOT overwrite — parser's entry takes precedence
    const entry = store.get<{ shapes: readonly unknown[] }>("diagram-diag-1");
    expect(entry!.source).toBe("parsed");
    expect(entry!.parsed!.shapes[0]).toBe(markerShape);
  });

  it("should work with NULL_FILE_READER on editor-created diagram (prepareSlide handles both steps)", () => {
    // prepareSlide runs loadSlideExternalContent (no-op with NULL_FILE_READER)
    // then registerBuilderResources fills in the gap.

    const slide = createDiagramSlide("process");
    const store = createResourceStore();
    const ctx = createCoreRenderContext({
      slideSize: { width: px(960), height: px(540) },
      resourceStore: store,
    });

    const enrichedSlide = prepareSlide(slide, store);

    // Builder should have registered the diagram
    expect(store.has("diagram-diag-1")).toBe(true);

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

    prepareSlide(slide, store);

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
      const slideWithId: SlideWithId = { id: "slide-1", slide: createDiagramSlide(diagramType)};

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
    const slideWithId: SlideWithId = { id: "slide-chart", slide: createChartSlide()};

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

// =============================================================================
// useSlideThumbnails recomputation and thumbnailMap invariants
// =============================================================================

describe("useSlideThumbnails recomputation", () => {
  it("should recompute thumbnails when slides array reference changes", () => {
    const slide1: SlideWithId = { id: "slide-1", slide: createDiagramSlide("process") };
    const slide2: SlideWithId = { id: "slide-2", slide: createChartSlide() };

    const initialSlides = [slide1];

    const { result, rerender } = renderHook(
      ({ slides }) =>
        useSlideThumbnails({
          slideWidth: px(960) as Pixels,
          slideHeight: px(540) as Pixels,
          slides,
        }),
      { initialProps: { slides: initialSlides } },
    );

    const svgBefore = result.current.getThumbnailSvg(slide1);
    expect(svgBefore.length).toBeGreaterThan(0);

    // Rerender with a new slides array that includes slide2
    const updatedSlides = [slide1, slide2];
    rerender({ slides: updatedSlides });

    // After rerender, both slides should have thumbnails
    const svg1After = result.current.getThumbnailSvg(slide1);
    const svg2After = result.current.getThumbnailSvg(slide2);
    expect(svg1After.length).toBeGreaterThan(0);
    expect(svg2After.length).toBeGreaterThan(0);
  });

  it("should return non-empty SVG from getThumbnailSvg for each slide", () => {
    const slides: SlideWithId[] = [
      { id: "slide-a", slide: createDiagramSlide("process") },
      { id: "slide-b", slide: createDiagramSlide("cycle") },
      { id: "slide-c", slide: createChartSlide() },
      { id: "slide-d", slide: { shapes: [] } },
    ];

    const { result } = renderHook(() =>
      useSlideThumbnails({
        slideWidth: px(960) as Pixels,
        slideHeight: px(540) as Pixels,
        slides,
      }),
    );

    for (const slideWithId of slides) {
      const svg = result.current.getThumbnailSvg(slideWithId);
      // Every slide — including empty ones — should produce a non-empty SVG string
      // (at minimum the <svg> wrapper element is present)
      expect(svg.length).toBeGreaterThan(0);
    }
  });

  it("should return empty string for a slide not in the current slides array", () => {
    const slideInArray: SlideWithId = { id: "slide-in", slide: { shapes: [] } };
    const slideNotInArray: SlideWithId = { id: "slide-out", slide: { shapes: [] } };

    const { result } = renderHook(() =>
      useSlideThumbnails({
        slideWidth: px(960) as Pixels,
        slideHeight: px(540) as Pixels,
        slides: [slideInArray],
      }),
    );

    // slide that was rendered should have SVG
    expect(result.current.getThumbnailSvg(slideInArray).length).toBeGreaterThan(0);
    // slide that was NOT in the array should return empty string (fallback in useCallback)
    expect(result.current.getThumbnailSvg(slideNotInArray)).toBe("");
  });

  it("should produce distinct SVGs for slides with different content", () => {
    const diagramSlide: SlideWithId = { id: "slide-diagram", slide: createDiagramSlide("hierarchy") };
    const chartSlide: SlideWithId = { id: "slide-chart", slide: createChartSlide() };
    const emptySlide: SlideWithId = { id: "slide-empty", slide: { shapes: [] } };

    const { result } = renderHook(() =>
      useSlideThumbnails({
        slideWidth: px(960) as Pixels,
        slideHeight: px(540) as Pixels,
        slides: [diagramSlide, chartSlide, emptySlide],
      }),
    );

    const svgDiagram = result.current.getThumbnailSvg(diagramSlide);
    const svgChart = result.current.getThumbnailSvg(chartSlide);
    const svgEmpty = result.current.getThumbnailSvg(emptySlide);

    // Slides with different content should produce different SVG strings
    expect(svgDiagram).not.toBe(svgChart);
    expect(svgDiagram).not.toBe(svgEmpty);
    expect(svgChart).not.toBe(svgEmpty);
  });

  it("should not recompute when same slides reference is passed", () => {
    const slides: SlideWithId[] = [
      { id: "slide-1", slide: createDiagramSlide("process") },
    ];

    const { result, rerender } = renderHook(
      ({ slides }) =>
        useSlideThumbnails({
          slideWidth: px(960) as Pixels,
          slideHeight: px(540) as Pixels,
          slides,
        }),
      { initialProps: { slides } },
    );

    const getThumbnailBefore = result.current.getThumbnailSvg;

    // Rerender with the SAME reference
    rerender({ slides });

    // useMemo should return the same thumbnailMap, so getThumbnailSvg
    // should be referentially identical (useCallback depends on thumbnailMap)
    const getThumbnailAfter = result.current.getThumbnailSvg;
    expect(getThumbnailAfter).toBe(getThumbnailBefore);
  });

  it("should drop old slide thumbnails when slides array shrinks", () => {
    const slide1: SlideWithId = { id: "slide-1", slide: createDiagramSlide("process") };
    const slide2: SlideWithId = { id: "slide-2", slide: createChartSlide() };

    const { result, rerender } = renderHook(
      ({ slides }) =>
        useSlideThumbnails({
          slideWidth: px(960) as Pixels,
          slideHeight: px(540) as Pixels,
          slides,
        }),
      { initialProps: { slides: [slide1, slide2] } },
    );

    // Both slides have thumbnails initially
    expect(result.current.getThumbnailSvg(slide1).length).toBeGreaterThan(0);
    expect(result.current.getThumbnailSvg(slide2).length).toBeGreaterThan(0);

    // Remove slide2 from the array
    rerender({ slides: [slide1] });

    // slide1 still has a thumbnail, slide2 is gone (empty string fallback)
    expect(result.current.getThumbnailSvg(slide1).length).toBeGreaterThan(0);
    expect(result.current.getThumbnailSvg(slide2)).toBe("");
  });
});
