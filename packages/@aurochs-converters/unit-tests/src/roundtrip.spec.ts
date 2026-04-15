/**
 * @file Roundtrip integration tests for fig↔pptx conversion
 *
 * Verifies that shapes survive conversion in both directions:
 *   FigDesignDocument → PresentationDocument → FigDesignDocument
 *   PresentationDocument → FigDesignDocument → PresentationDocument
 *
 * Goals:
 *   - No shapes are lost (count preservation)
 *   - Shape types are preserved or sensibly mapped
 *   - Fills, strokes, and effects survive with acceptable precision
 *   - Text content is preserved
 *
 * Non-goals:
 *   - Perfect visual fidelity (some metadata like slide transitions is lost)
 *   - Preserving headings, placeholder types, or other PPTX-specific metadata
 */

import { convert as figToPptx } from "@aurochs-converters/fig-to-pptx";
import { convert as pptxToFig } from "@aurochs-converters/pptx-to-fig";
import type { FigDesignDocument, FigDesignNode, FigPage } from "@aurochs/fig/domain";
import type { FigPageId, FigNodeId } from "@aurochs/fig/domain";
import type { PresentationDocument, SlideWithId } from "@aurochs-office/pptx/app/presentation-document";
import type { Shape, SpShape } from "@aurochs-office/pptx/domain/shape";
import type { Slide } from "@aurochs-office/pptx/domain/slide/types";
import type { Pixels, Degrees } from "@aurochs-office/drawing-ml/domain/units";
import { px, deg } from "@aurochs-office/drawing-ml/domain/units";
import { createResourceStore } from "@aurochs-office/ooxml/domain/resource-store";
import { EMPTY_FONT_SCHEME } from "@aurochs-office/ooxml/domain/font-scheme";
import { DEFAULT_PAGE_BACKGROUND } from "@aurochs/fig/domain";

// =============================================================================
// Test Fixtures
// =============================================================================

function createFigDocument(nodes: readonly FigDesignNode[]): FigDesignDocument {
  const page: FigPage = {
    id: "0:1" as FigPageId,
    name: "Test Page",
    backgroundColor: DEFAULT_PAGE_BACKGROUND,
    children: nodes,
  };
  return {
    pages: [page],
    components: new Map(),
    images: new Map(),
    metadata: null,
  };
}

type CreateNodeOptions = { id: string; x: number; y: number; w: number; h: number };

function createRectNode({ id, x, y, w, h }: CreateNodeOptions): FigDesignNode {
  return {
    id: id as FigNodeId,
    type: "RECTANGLE",
    name: `Rect ${id}`,
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: x, m10: 0, m11: 1, m12: y },
    size: { x: w, y: h },
    fills: [{
      type: "SOLID" as const,
      visible: true,
      opacity: 1,
      color: { r: 0.2, g: 0.4, b: 0.8, a: 1 },
    }],
    strokes: [],
    strokeWeight: 0,
    effects: [],
  };
}

function createEllipseNode({ id, x, y, w, h }: CreateNodeOptions): FigDesignNode {
  return {
    id: id as FigNodeId,
    type: "ELLIPSE",
    name: `Ellipse ${id}`,
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: x, m10: 0, m11: 1, m12: y },
    size: { x: w, y: h },
    fills: [{
      type: "SOLID" as const,
      visible: true,
      opacity: 1,
      color: { r: 1, g: 0.5, b: 0, a: 0.8 },
    }],
    strokes: [{
      type: "SOLID" as const,
      visible: true,
      opacity: 1,
      color: { r: 0, g: 0, b: 0, a: 1 },
    }],
    strokeWeight: 2,
    effects: [],
  };
}

type CreateTextNodeOptions = { id: string; x: number; y: number; text: string };

function createTextNode({ id, x, y, text }: CreateTextNodeOptions): FigDesignNode {
  return {
    id: id as FigNodeId,
    type: "TEXT",
    name: `Text ${id}`,
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: x, m10: 0, m11: 1, m12: y },
    size: { x: 200, y: 30 },
    fills: [],
    strokes: [],
    strokeWeight: 0,
    effects: [],
    textData: {
      characters: text,
      fontSize: 14,
      fontName: { family: "Arial", style: "Regular", postscript: "Arial-Regular" },
    },
  };
}

function createPptxDocument(shapes: readonly Shape[]): PresentationDocument {
  const slide: Slide = { shapes };
  const slideWithId: SlideWithId = { id: "slide-1", slide };
  return {
    presentation: {
      slideSize: { width: px(960) as Pixels, height: px(540) as Pixels },
    },
    slides: [slideWithId],
    slideWidth: px(960) as Pixels,
    slideHeight: px(540) as Pixels,
    colorContext: {
      colorScheme: {
        dk1: "000000", lt1: "FFFFFF", dk2: "1F497D", lt2: "EEECE1",
        accent1: "4F81BD", accent2: "C0504D", accent3: "9BBB59",
        accent4: "8064A2", accent5: "4BACC6", accent6: "F79646",
        hlink: "0000FF", folHlink: "800080",
      },
      colorMap: {},
    },
    fontScheme: EMPTY_FONT_SCHEME,
    resourceStore: createResourceStore(),
  };
}

function createPptxRect({ id, x, y, w, h }: CreateNodeOptions): SpShape {
  return {
    type: "sp",
    nonVisual: { id, name: `Shape ${id}` },
    properties: {
      transform: {
        x: px(x) as Pixels, y: px(y) as Pixels,
        width: px(w) as Pixels, height: px(h) as Pixels,
        rotation: deg(0) as Degrees, flipH: false, flipV: false,
      },
      geometry: { type: "preset", preset: "rect", adjustValues: [] },
      fill: {
        type: "solidFill",
        color: { spec: { type: "srgb", value: "3366CC" } },
      },
    },
  };
}

// =============================================================================
// Fig → PPTX → Fig roundtrip
// =============================================================================

describe("Fig → PPTX → Fig roundtrip", () => {
  it("preserves shape count", async () => {
    const figDoc = createFigDocument([
      createRectNode({ id: "0:2", x: 10, y: 10, w: 100, h: 80 }),
      createEllipseNode({ id: "0:3", x: 150, y: 10, w: 60, h: 60 }),
      createTextNode({ id: "0:4", x: 10, y: 120, text: "Hello World" }),
    ]);

    const pptxResult = await figToPptx(figDoc);
    const figResult = await pptxToFig(pptxResult.data);

    expect(figResult.data.pages).toHaveLength(1);
    const page = figResult.data.pages[0];
    expect(page.children).toHaveLength(3);
  });

  it("preserves rectangle fill color through roundtrip", async () => {
    const figDoc = createFigDocument([
      createRectNode({ id: "0:2", x: 50, y: 50, w: 200, h: 100 }),
    ]);

    const pptxResult = await figToPptx(figDoc);
    const figResult = await pptxToFig(pptxResult.data);

    const node = figResult.data.pages[0].children[0];
    expect(node.fills).toHaveLength(1);

    const fill = node.fills[0];
    expect(fill.type).toBe("SOLID");
    if (fill.type === "SOLID") {
      // Allow small rounding differences from hex conversion
      expect(fill.color.r).toBeCloseTo(0.2, 1);
      expect(fill.color.g).toBeCloseTo(0.4, 1);
      expect(fill.color.b).toBeCloseTo(0.8, 1);
    }
  });

  it("preserves text content through roundtrip", async () => {
    const figDoc = createFigDocument([
      createTextNode({ id: "0:2", x: 10, y: 10, text: "Roundtrip text" }),
    ]);

    const pptxResult = await figToPptx(figDoc);
    const figResult = await pptxToFig(pptxResult.data);

    const node = figResult.data.pages[0].children[0];
    expect(node.textData).toBeDefined();
    expect(node.textData!.characters).toBe("Roundtrip text");
  });

  it("preserves stroke through roundtrip", async () => {
    const figDoc = createFigDocument([
      createEllipseNode({ id: "0:2", x: 10, y: 10, w: 80, h: 80 }),
    ]);

    const pptxResult = await figToPptx(figDoc);
    const figResult = await pptxToFig(pptxResult.data);

    const node = figResult.data.pages[0].children[0];
    expect(node.strokes.length).toBeGreaterThanOrEqual(1);
    expect(typeof node.strokeWeight === "number" ? node.strokeWeight : 0).toBeCloseTo(2, 0);
  });
});

// =============================================================================
// PPTX → Fig → PPTX roundtrip
// =============================================================================

describe("PPTX → Fig → PPTX roundtrip", () => {
  it("preserves shape count", async () => {
    const pptxDoc = createPptxDocument([
      createPptxRect({ id: "1", x: 10, y: 10, w: 200, h: 100 }),
      createPptxRect({ id: "2", x: 250, y: 10, w: 200, h: 100 }),
    ]);

    const figResult = await pptxToFig(pptxDoc);
    const pptxResult = await figToPptx(figResult.data);

    expect(pptxResult.data.slides).toHaveLength(1);
    expect(pptxResult.data.slides[0].slide.shapes).toHaveLength(2);
  });

  it("preserves solid fill through roundtrip", async () => {
    const pptxDoc = createPptxDocument([
      createPptxRect({ id: "1", x: 50, y: 50, w: 100, h: 100 }),
    ]);

    const figResult = await pptxToFig(pptxDoc);
    const pptxResult = await figToPptx(figResult.data);

    const shape = pptxResult.data.slides[0].slide.shapes[0];
    expect(shape.type).toBe("sp");
    if (shape.type === "sp") {
      expect(shape.properties.fill).toBeDefined();
      expect(shape.properties.fill!.type).toBe("solidFill");
    }
  });
});
