/**
 * @file Tests for slide thumbnail rendering
 *
 * Two groups:
 *
 * 1. **renderSlideSvg structural invariant** — Verifies that prepareSlide
 *    and renderSlideSvg share the same ResourceStore. This is the SVG string
 *    rendering path (used by export/conversion), not the thumbnail React path.
 *
 * 2. **SlideThumbnailPreview** — Verifies that the React component-based
 *    thumbnail rendering produces correct output. Uses SlideRenderer
 *    (same pipeline as the main editor canvas) for shape-level memoization.
 */

// @vitest-environment jsdom

import { render } from "@testing-library/react";
import type { Slide, Shape } from "@aurochs-office/pptx/domain";
import type { ShapeId, ResourceId } from "@aurochs-office/pptx/domain/types";

// jsdom does not implement SVG text measurement APIs.
// Mock getComputedTextLength so that SlideRenderer's text layout engine
// can complete without throwing. The actual text measurement is not
// the subject of these tests — we are verifying component mounting and
// resource registration.
beforeAll(() => {
  if (typeof SVGElement !== "undefined" && !("getComputedTextLength" in SVGElement.prototype)) {
    // getComputedTextLength belongs to SVGTextContentElement, which jsdom
    // does not implement. Patch it on SVGElement so that the text layout
    // engine can run without throwing.
    Object.defineProperty(SVGElement.prototype, "getComputedTextLength", {
      value() {
        return 0;
      },
      writable: true,
      configurable: true,
    });
  }
});

import { px, deg } from "@aurochs-office/drawing-ml/domain/units";
import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";
import { renderSlideSvg } from "@aurochs-renderer/pptx/svg";
import { createCoreRenderContext } from "@aurochs-renderer/pptx";
import { createResourceStore } from "@aurochs-office/ooxml/domain/resource-store";
import { prepareSlide } from "../resource/register-slide-resources";
import { SlideThumbnailPreview } from "./SlideThumbnailPreview";

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

function createTextSlide(): Slide {
  return {
    shapes: [
      {
        type: "sp",
        nonVisual: { id: "text-1" as ShapeId, name: "TextBox 1" },
        properties: {
          transform: {
            x: px(100), y: px(100), width: px(400), height: px(200),
            rotation: deg(0), flipH: false, flipV: false,
          },
        },
        textBody: {
          bodyProperties: {},
          paragraphs: [
            {
              properties: {},
              runs: [{ type: "text" as const, text: "Hello World", properties: {} }],
            },
          ],
        },
      },
    ],
  };
}

const SLIDE_WIDTH = px(960) as Pixels;
const SLIDE_HEIGHT = px(540) as Pixels;

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

    prepareSlide(slide, store);

    const result = renderSlideSvg(slide, ctx);
    expect(result.svg).not.toContain("[Diagram]");
  });

  it("should not overwrite parser-registered diagram with shapes", () => {
    const slide = createDiagramSlide("process");
    const store = createResourceStore();

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
    const slide = createDiagramSlide("process");
    const store = createResourceStore();
    const ctx = createCoreRenderContext({
      slideSize: { width: px(960), height: px(540) },
      resourceStore: store,
    });

    const enrichedSlide = prepareSlide(slide, store);

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
// SlideThumbnailPreview React component tests
// =============================================================================

describe("SlideThumbnailPreview", () => {
  it("should render empty slide without error", () => {
    const { container } = render(
      <SlideThumbnailPreview
        slide={{ shapes: [] }}
        slideWidth={SLIDE_WIDTH}
        slideHeight={SLIDE_HEIGHT}
      />,
    );

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute("viewBox")).toBe(`0 0 ${SLIDE_WIDTH} ${SLIDE_HEIGHT}`);
  });

  it("should render a slide with a text shape", () => {
    const { container } = render(
      <SlideThumbnailPreview
        slide={createTextSlide()}
        slideWidth={SLIDE_WIDTH}
        slideHeight={SLIDE_HEIGHT}
      />,
    );

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    // SlideRenderer renders shapes as <g> elements
    const groups = svg!.querySelectorAll("g");
    expect(groups.length).toBeGreaterThan(0);
  });

  it("should render a diagram slide with ResourceStore", () => {
    const slide = createDiagramSlide("process");
    const store = createResourceStore();

    const { container } = render(
      <SlideThumbnailPreview
        slide={slide}
        slideWidth={SLIDE_WIDTH}
        slideHeight={SLIDE_HEIGHT}
        resourceStore={store}
      />,
    );

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    // prepareSlide should have registered the diagram in the store
    expect(store.has("diagram-diag-1")).toBe(true);
  });

  it("should render a chart slide with ResourceStore", () => {
    const slide = createChartSlide();
    const store = createResourceStore();

    const { container } = render(
      <SlideThumbnailPreview
        slide={slide}
        slideWidth={SLIDE_WIDTH}
        slideHeight={SLIDE_HEIGHT}
        resourceStore={store}
      />,
    );

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(store.has("chart-res-1")).toBe(true);
  });

  it("should preserve correct viewBox aspect ratio", () => {
    const customWidth = px(1280) as Pixels;
    const customHeight = px(720) as Pixels;

    const { container } = render(
      <SlideThumbnailPreview
        slide={{ shapes: [] }}
        slideWidth={customWidth}
        slideHeight={customHeight}
      />,
    );

    const svg = container.querySelector("svg");
    expect(svg!.getAttribute("viewBox")).toBe(`0 0 ${customWidth} ${customHeight}`);
    expect(svg!.getAttribute("preserveAspectRatio")).toBe("xMidYMid meet");
  });

  it("should render multiple diagram types", () => {
    const diagramTypes = ["process", "cycle", "hierarchy", "relationship"] as const;

    for (const diagramType of diagramTypes) {
      const slide = createDiagramSlide(diagramType);
      const store = createResourceStore();

      const { container, unmount } = render(
        <SlideThumbnailPreview
          slide={slide}
          slideWidth={SLIDE_WIDTH}
          slideHeight={SLIDE_HEIGHT}
          resourceStore={store}
        />,
      );

      const svg = container.querySelector("svg");
      expect(svg).not.toBeNull();
      expect(store.has("diagram-diag-1")).toBe(true);

      unmount();
    }
  });
});
