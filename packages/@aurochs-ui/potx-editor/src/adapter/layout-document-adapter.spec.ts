/**
 * @file Tests for layout-document-adapter
 *
 * Verifies that layout data is correctly converted to PresentationDocument
 * for consumption by PresentationEditorProvider.
 */

import { createVirtualDocument, layoutToSlideWithId } from "./layout-document-adapter";
import type { LoadedLayoutData } from "@aurochs-ui/ooxml-components";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import type { SlideSize, Slide } from "@aurochs-office/pptx/domain";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import type { FontScheme } from "@aurochs-office/ooxml/domain/font-scheme";
import type { ResourceStore } from "@aurochs-office/ooxml/domain/resource-store";
import { createResourceStore } from "@aurochs-office/ooxml/domain/resource-store";

// =============================================================================
// Helpers
// =============================================================================

function createMockSlide(shapeCount: number): Slide {
  const shapes = Array.from({ length: shapeCount }, (_, i) => ({
    type: "sp" as const,
    nonVisual: { id: `shape-${i}` as never, name: `Shape ${i}` },
    properties: { transform: undefined, geometry: undefined },
  }));
  return { shapes: shapes as never[] };
}

function createMockLayoutData(shapeCount: number): LoadedLayoutData {
  const slide = createMockSlide(shapeCount);
  return {
    shapes: slide.shapes,
    pseudoSlide: slide,
    colorContext: undefined,
    fontScheme: undefined,
    resourceStore: createResourceStore(),
    slideSize: { width: px(960), height: px(540) },
    svg: "<svg></svg>",
  };
}

function createMockResourceStore(): ResourceStore {
  return createResourceStore();
}

const SLIDE_SIZE: SlideSize = { width: px(960), height: px(540) };

const COLOR_CONTEXT: ColorContext = {
  colorScheme: {
    dk1: "#000000",
    lt1: "#FFFFFF",
    dk2: "#1F497D",
    lt2: "#EEECE1",
    accent1: "#4F81BD",
    accent2: "#C0504D",
    accent3: "#9BBB59",
    accent4: "#8064A2",
    accent5: "#4BACC6",
    accent6: "#F79646",
    hlink: "#0000FF",
    folHlink: "#800080",
  },
  colorMap: {},
};

const FONT_SCHEME: FontScheme = {
  majorFont: { latin: "Calibri Light" },
  minorFont: { latin: "Calibri" },
};

// =============================================================================
// layoutToSlideWithId
// =============================================================================

describe("layoutToSlideWithId", () => {
  it("uses layout path as slide ID", () => {
    const data = createMockLayoutData(2);
    const result = layoutToSlideWithId("ppt/slideLayouts/slideLayout1.xml", data);

    expect(result.id).toBe("ppt/slideLayouts/slideLayout1.xml");
  });

  it("uses pseudoSlide from LoadedLayoutData", () => {
    const data = createMockLayoutData(3);
    const result = layoutToSlideWithId("layout1", data);

    expect(result.slide).toBe(data.pseudoSlide);
    expect(result.slide.shapes).toHaveLength(3);
  });

  it("does not set apiSlide (virtual slides have no API context)", () => {
    const data = createMockLayoutData(0);
    const result = layoutToSlideWithId("layout1", data);

    expect(result.apiSlide).toBeUndefined();
  });
});

// =============================================================================
// createVirtualDocument
// =============================================================================

describe("createVirtualDocument", () => {
  it("creates document with correct slide count", () => {
    const layouts = [
      { id: "layout1", data: createMockLayoutData(2) },
      { id: "layout2", data: createMockLayoutData(1) },
      { id: "layout3", data: createMockLayoutData(0) },
    ];

    const doc = createVirtualDocument({
      layouts,
      slideSize: SLIDE_SIZE,
      colorContext: COLOR_CONTEXT,
      fontScheme: FONT_SCHEME,
      resourceStore: createMockResourceStore(),
    });

    expect(doc.slides).toHaveLength(3);
  });

  it("preserves slide dimensions", () => {
    const doc = createVirtualDocument({
      layouts: [],
      slideSize: SLIDE_SIZE,
      colorContext: COLOR_CONTEXT,
      fontScheme: FONT_SCHEME,
      resourceStore: createMockResourceStore(),
    });

    expect(doc.slideWidth).toBe(SLIDE_SIZE.width);
    expect(doc.slideHeight).toBe(SLIDE_SIZE.height);
  });

  it("populates presentation stub with slideSize", () => {
    const doc = createVirtualDocument({
      layouts: [],
      slideSize: SLIDE_SIZE,
      colorContext: COLOR_CONTEXT,
      fontScheme: FONT_SCHEME,
      resourceStore: createMockResourceStore(),
    });

    expect(doc.presentation.slideSize).toBe(SLIDE_SIZE);
  });

  it("passes through colorContext and fontScheme", () => {
    const doc = createVirtualDocument({
      layouts: [],
      slideSize: SLIDE_SIZE,
      colorContext: COLOR_CONTEXT,
      fontScheme: FONT_SCHEME,
      resourceStore: createMockResourceStore(),
    });

    expect(doc.colorContext).toBe(COLOR_CONTEXT);
    expect(doc.fontScheme).toBe(FONT_SCHEME);
  });

  it("passes through presentationFile when provided", () => {
    const mockFile = {} as never;
    const doc = createVirtualDocument({
      layouts: [],
      slideSize: SLIDE_SIZE,
      colorContext: COLOR_CONTEXT,
      fontScheme: FONT_SCHEME,
      resourceStore: createMockResourceStore(),
      presentationFile: mockFile,
    });

    expect(doc.presentationFile).toBe(mockFile);
  });

  it("maps layout IDs to slide IDs in order", () => {
    const layouts = [
      { id: "ppt/slideLayouts/slideLayout1.xml", data: createMockLayoutData(1) },
      { id: "ppt/slideLayouts/slideLayout5.xml", data: createMockLayoutData(2) },
    ];

    const doc = createVirtualDocument({
      layouts,
      slideSize: SLIDE_SIZE,
      colorContext: COLOR_CONTEXT,
      fontScheme: FONT_SCHEME,
      resourceStore: createMockResourceStore(),
    });

    expect(doc.slides[0].id).toBe("ppt/slideLayouts/slideLayout1.xml");
    expect(doc.slides[1].id).toBe("ppt/slideLayouts/slideLayout5.xml");
    expect(doc.slides[0].slide.shapes).toHaveLength(1);
    expect(doc.slides[1].slide.shapes).toHaveLength(2);
  });
});
