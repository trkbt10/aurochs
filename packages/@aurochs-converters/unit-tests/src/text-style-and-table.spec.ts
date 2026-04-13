/**
 * @file Tests for per-character text styling, table style resolution,
 * color transform (tint/shade), autoFit, and group fill rendering.
 *
 * These tests verify the changes from P1–P5 and subsequent fixes:
 * - Per-character styling via characterStyleIDs + styleOverrideTable
 * - Table style resolution (ECMA-376 banding, fillReference)
 * - Color transform (tint, shade, lumMod)
 * - autoFit default for TEXT nodes
 * - GrpShape background fill insertion
 * - translateAndScaleNodes no-enlarge behavior
 */

import { convert as figToPptx } from "@aurochs-converters/fig-to-pptx";
import { convert as pptxToFig } from "@aurochs-converters/pptx-to-fig";
import type { FigDesignDocument, FigDesignNode, FigPage } from "@aurochs/fig/domain";
import type { FigPageId, FigNodeId } from "@aurochs/fig/domain";
import type { PresentationDocument, SlideWithId } from "@aurochs-office/pptx/app/presentation-document";
import type { Shape, SpShape, GraphicFrame } from "@aurochs-office/pptx/domain/shape";
import type { Table, TableStyle } from "@aurochs-office/pptx/domain/table/types";
import type { TableStyleList } from "@aurochs-office/pptx/parser/table/style-parser";
import type { Slide } from "@aurochs-office/pptx/domain/slide/types";
import type { Pixels, Degrees, Points } from "@aurochs-office/drawing-ml/domain/units";
import { px, deg, pt } from "@aurochs-office/drawing-ml/domain/units";
import { createResourceStore } from "@aurochs-office/ooxml/domain/resource-store";
import { EMPTY_FONT_SCHEME } from "@aurochs-office/ooxml/domain/font-scheme";
import { DEFAULT_PAGE_BACKGROUND } from "@aurochs-builder/fig";
import { dmlColorToFig } from "@aurochs-converters/interop-drawing-ml/dml-to-fig";

// =============================================================================
// Helpers
// =============================================================================

function makeTransform({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return {
    x: px(x) as Pixels, y: px(y) as Pixels,
    width: px(w) as Pixels, height: px(h) as Pixels,
    rotation: deg(0) as Degrees, flipH: false, flipV: false,
  };
}

function createPptxDoc(shapes: readonly Shape[], options?: {
  tableStyles?: TableStyleList;
}): PresentationDocument {
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
        dk1: "000000", lt1: "FFFFFF", accent1: "4F81BD",
        accent2: "C0504D", accent3: "9BBB59", accent4: "8064A2",
        accent5: "4BACC6", accent6: "F79646",
        dk2: "1F497D", lt2: "EEECE1",
        hlink: "0000FF", folHlink: "800080",
      },
      colorMap: { accent1: "accent1" },
    },
    fontScheme: EMPTY_FONT_SCHEME,
    resourceStore: createResourceStore(),
    tableStyles: options?.tableStyles,
  };
}

function createFigDocument(nodes: readonly FigDesignNode[]): FigDesignDocument {
  const page: FigPage = {
    id: "0:1" as FigPageId,
    name: "Test",
    backgroundColor: DEFAULT_PAGE_BACKGROUND,
    children: nodes,
  };
  return { pages: [page], components: new Map(), images: new Map(), metadata: null };
}

// =============================================================================
// P1: Per-character text styling (characterStyleIDs + styleOverrideTable)
// =============================================================================

describe("Per-character text styling", () => {
  it("generates characterStyleIDs from PPTX runs with different colors", async () => {
    // PPTX with two runs: "Hello" (black) and " World" (red)
    const shape: SpShape = {
      type: "sp",
      nonVisual: { id: "1", name: "TextBox" },
      properties: {
        transform: makeTransform({ x: 50, y: 50, w: 300, h: 40 }),
        geometry: { type: "preset", preset: "rect", adjustValues: [] },
      },
      textBody: {
        bodyProperties: {},
        paragraphs: [{
          properties: {},
          runs: [
            { type: "text", text: "Hello", properties: { fontSize: pt(14) as Points, fontFamily: "Arial" } },
            { type: "text", text: " World", properties: { fontSize: pt(14) as Points, fontFamily: "Arial", color: { spec: { type: "srgb", value: "FF0000" } } } },
          ],
        }],
      },
    };

    const doc = createPptxDoc([shape]);
    const result = await pptxToFig(doc);
    const node = result.data.pages[0].children[0];

    expect(node.textData).toBeDefined();
    expect(node.textData!.characters).toBe("Hello World");
    expect(node.textData!.characterStyleIDs).toBeDefined();
    expect(node.textData!.characterStyleIDs!.length).toBe(11); // "Hello World" = 11 chars
    expect(node.textData!.styleOverrideTable).toBeDefined();
    expect(node.textData!.styleOverrideTable!.length).toBeGreaterThan(0);

    // The red run should have a different style ID from the black run
    const _helloIDs = new Set(node.textData!.characterStyleIDs!.slice(0, 5));
    const _worldIDs = new Set(node.textData!.characterStyleIDs!.slice(5));
    // They should not all be the same
    const allIDs = new Set(node.textData!.characterStyleIDs!);
    expect(allIDs.size).toBeGreaterThan(1);
  });

  it("roundtrips per-run color through fig→pptx→fig", async () => {
    // PPTX with bold "Abc" and red "def"
    const shape: SpShape = {
      type: "sp",
      nonVisual: { id: "1", name: "RichText" },
      properties: {
        transform: makeTransform({ x: 50, y: 50, w: 300, h: 40 }),
        geometry: { type: "preset", preset: "rect", adjustValues: [] },
      },
      textBody: {
        bodyProperties: {},
        paragraphs: [{
          properties: {},
          runs: [
            { type: "text", text: "Abc ", properties: { fontSize: pt(18) as Points, fontFamily: "Arial", bold: true } },
            { type: "text", text: "def", properties: { fontSize: pt(18) as Points, fontFamily: "Arial", color: { spec: { type: "srgb", value: "FF0000" } } } },
          ],
        }],
      },
    };

    const doc = createPptxDoc([shape]);
    const figResult = await pptxToFig(doc);
    const pptxResult = await figToPptx(figResult.data);

    // The roundtripped PPTX should have multiple runs in the paragraph
    const rtShape = pptxResult.data.slides[0].slide.shapes[0];
    expect(rtShape.type).toBe("sp");
    if (rtShape.type === "sp" && rtShape.textBody) {
      const para = rtShape.textBody.paragraphs[0];
      expect(para.runs.length).toBeGreaterThanOrEqual(2);

      // Find the red run
      const redRun = para.runs.find((r) => {
        if (r.type !== "text") { return false; }
        const spec = r.properties?.color?.spec;
        return spec?.type === "srgb" && spec.value === "FF0000";
      });
      expect(redRun).toBeDefined();
    }
  });

  it("produces no styleOverrideTable when all runs have the same style", async () => {
    const shape: SpShape = {
      type: "sp",
      nonVisual: { id: "1", name: "Uniform" },
      properties: {
        transform: makeTransform({ x: 50, y: 50, w: 200, h: 30 }),
        geometry: { type: "preset", preset: "rect", adjustValues: [] },
      },
      textBody: {
        bodyProperties: {},
        paragraphs: [{
          properties: {},
          runs: [
            { type: "text", text: "Same ", properties: { fontSize: pt(14) as Points, fontFamily: "Arial" } },
            { type: "text", text: "style", properties: { fontSize: pt(14) as Points, fontFamily: "Arial" } },
          ],
        }],
      },
    };

    const doc = createPptxDoc([shape]);
    const result = await pptxToFig(doc);
    const node = result.data.pages[0].children[0];

    expect(node.textData!.characters).toBe("Same style");
    // No override table when all runs have the same style
    expect(node.textData!.characterStyleIDs).toBeUndefined();
    expect(node.textData!.styleOverrideTable).toBeUndefined();
  });
});

// =============================================================================
// Color transform (tint, shade)
// =============================================================================

describe("Color transform resolution", () => {
  it("applies tint to lighten a color towards white", () => {
    // accent1 = #4F81BD, tint 20% should produce a very light blue
    const color = dmlColorToFig(
      { spec: { type: "srgb", value: "4F81BD" }, transform: { tint: 20 } },
    );
    // tint 20 means add 80% of the distance to white
    // R: 0x4F/255 = 0.310 → 0.310 + (1-0.310)*0.8 = 0.862
    expect(color.r).toBeGreaterThan(0.8);
    expect(color.g).toBeGreaterThan(0.8);
    expect(color.b).toBeGreaterThan(0.9);
  });

  it("applies shade to darken a color towards black", () => {
    // White (#FFFFFF) with shade 50% → should be 50% gray
    const color = dmlColorToFig(
      { spec: { type: "srgb", value: "FFFFFF" }, transform: { shade: 50 } },
    );
    expect(color.r).toBeCloseTo(0.5, 1);
    expect(color.g).toBeCloseTo(0.5, 1);
    expect(color.b).toBeCloseTo(0.5, 1);
  });

  it("produces distinct colors for different tint values", () => {
    const tint20 = dmlColorToFig({ spec: { type: "srgb", value: "4F81BD" }, transform: { tint: 20 } });
    const tint40 = dmlColorToFig({ spec: { type: "srgb", value: "4F81BD" }, transform: { tint: 40 } });
    const noTint = dmlColorToFig({ spec: { type: "srgb", value: "4F81BD" } });

    // tint 20 should be lightest, no tint should be darkest
    expect(tint20.r).toBeGreaterThan(tint40.r);
    expect(tint40.r).toBeGreaterThan(noTint.r);
  });
});

// =============================================================================
// Table style resolution
// =============================================================================

describe("Table style resolution", () => {
  const tableStyle: TableStyle = {
    id: "{TEST-STYLE}",
    name: "Test Style",
    wholeTbl: {
      fill: { type: "solidFill", color: { spec: { type: "srgb", value: "DDDDDD" } } },
    },
    firstRow: {
      fill: { type: "solidFill", color: { spec: { type: "srgb", value: "4F81BD" } } },
    },
    band1H: {
      fill: { type: "solidFill", color: { spec: { type: "srgb", value: "B9CDE5" } } },
    },
  };

  const tableStyles: TableStyleList = {
    styles: [tableStyle],
  };

  function makeTable(styleId: string): Table {
    return {
      properties: { tableStyleId: styleId, firstRow: true, bandRow: true },
      grid: { columns: [{ width: px(200) as Pixels }] },
      rows: [
        { height: px(30) as Pixels, cells: [{ properties: {}, textBody: { bodyProperties: {}, paragraphs: [{ properties: {}, runs: [{ type: "text", text: "Header" }] }] } }] },
        { height: px(30) as Pixels, cells: [{ properties: {}, textBody: { bodyProperties: {}, paragraphs: [{ properties: {}, runs: [{ type: "text", text: "Row 1" }] }] } }] },
        { height: px(30) as Pixels, cells: [{ properties: {}, textBody: { bodyProperties: {}, paragraphs: [{ properties: {}, runs: [{ type: "text", text: "Row 2" }] }] } }] },
      ],
    };
  }

  it("resolves firstRow fill from table style", async () => {
    const gf: GraphicFrame = {
      type: "graphicFrame",
      nonVisual: { id: "1", name: "StyledTable" },
      transform: makeTransform({ x: 50, y: 50, w: 200, h: 90 }),
      content: { type: "table", data: { table: makeTable("{TEST-STYLE}") } },
    };

    const doc = createPptxDoc([gf], { tableStyles });
    const result = await pptxToFig(doc);

    const frame = result.data.pages[0].children[0];
    const headerCell = frame.children![0];
    expect(headerCell.fills.length).toBeGreaterThan(0);
    if (headerCell.fills[0].type === "SOLID") {
      // Header should be blue (#4F81BD)
      expect(headerCell.fills[0].color.r).toBeCloseTo(0.31, 1);
      expect(headerCell.fills[0].color.b).toBeCloseTo(0.74, 1);
    }
  });

  it("resolves banding fill for non-header rows", async () => {
    const gf: GraphicFrame = {
      type: "graphicFrame",
      nonVisual: { id: "1", name: "BandedTable" },
      transform: makeTransform({ x: 50, y: 50, w: 200, h: 90 }),
      content: { type: "table", data: { table: makeTable("{TEST-STYLE}") } },
    };

    const doc = createPptxDoc([gf], { tableStyles });
    const result = await pptxToFig(doc);

    const frame = result.data.pages[0].children[0];
    // Row 1 (index 1) should get band1H fill
    const row1Cell = frame.children![1];
    expect(row1Cell.fills.length).toBeGreaterThan(0);
    if (row1Cell.fills[0].type === "SOLID") {
      // band1H = #B9CDE5
      expect(row1Cell.fills[0].color.r).toBeCloseTo(0.725, 1);
    }
  });

  it("resolves fillReference color from table style", async () => {
    // Simulate a style where firstRow uses fillReference (common in real PPTX)
    const styleWithRef: TableStyle = {
      id: "{REF-STYLE}",
      name: "Ref Style",
      wholeTbl: { fill: { type: "noFill" } },
      firstRow: {
        fillReference: {
          index: 1,
          color: { type: "solidFill", color: { spec: { type: "scheme", value: "accent1" } } },
        },
      },
    };

    const table: Table = {
      properties: { tableStyleId: "{REF-STYLE}", firstRow: true },
      grid: { columns: [{ width: px(200) as Pixels }] },
      rows: [
        { height: px(30) as Pixels, cells: [{ properties: {}, textBody: { bodyProperties: {}, paragraphs: [{ properties: {}, runs: [{ type: "text", text: "Header" }] }] } }] },
      ],
    };

    const gf: GraphicFrame = {
      type: "graphicFrame",
      nonVisual: { id: "1", name: "RefTable" },
      transform: makeTransform({ x: 50, y: 50, w: 200, h: 30 }),
      content: { type: "table", data: { table } },
    };

    const doc = createPptxDoc([gf], {
      tableStyles: { styles: [styleWithRef] },
    });
    const result = await pptxToFig(doc);

    const frame = result.data.pages[0].children[0];
    const headerCell = frame.children![0];
    expect(headerCell.fills.length).toBeGreaterThan(0);
    // accent1 = #4F81BD resolved via colorContext
    if (headerCell.fills[0].type === "SOLID") {
      expect(headerCell.fills[0].color.r).toBeCloseTo(0.31, 1);
    }
  });
});

// =============================================================================
// P5: autoFit default
// =============================================================================

describe("autoFit default for TEXT nodes", () => {
  it("uses spAutoFit (shape) when textAutoResize is undefined", async () => {
    const figDoc = createFigDocument([{
      id: "0:2" as FigNodeId,
      type: "TEXT",
      name: "AutoFit Text",
      visible: true,
      opacity: 1,
      transform: { m00: 1, m01: 0, m02: 50, m10: 0, m11: 1, m12: 50 },
      size: { x: 200, y: 30 },
      fills: [],
      strokes: [],
      strokeWeight: 0,
      effects: [],
      textData: {
        characters: "Test autofit",
        fontSize: 14,
        fontName: { family: "Arial", style: "Regular", postscript: "Arial" },
        // textAutoResize is undefined
      },
    }]);

    const result = await figToPptx(figDoc);
    const shape = result.data.slides[0].slide.shapes[0];
    expect(shape.type).toBe("sp");
    if (shape.type === "sp" && shape.textBody) {
      // Should be "shape" (spAutoFit), not "none"
      expect(shape.textBody.bodyProperties.autoFit?.type).toBe("shape");
    }
  });
});

// =============================================================================
// Group/Frame fill rendering
// =============================================================================

describe("FRAME with fill produces background rectangle in PPTX", () => {
  it("inserts a background SpShape for FRAME with fill", async () => {
    const figDoc = createFigDocument([{
      id: "0:2" as FigNodeId,
      type: "FRAME",
      name: "Colored Frame",
      visible: true,
      opacity: 1,
      transform: { m00: 1, m01: 0, m02: 50, m10: 0, m11: 1, m12: 50 },
      size: { x: 200, y: 100 },
      fills: [{ type: "SOLID" as const, visible: true, opacity: 1, color: { r: 1, g: 0, b: 0, a: 1 } }],
      strokes: [],
      strokeWeight: 0,
      effects: [],
      children: [{
        id: "0:3" as FigNodeId,
        type: "TEXT",
        name: "Child Text",
        visible: true,
        opacity: 1,
        transform: { m00: 1, m01: 0, m02: 10, m10: 0, m11: 1, m12: 10 },
        size: { x: 180, y: 30 },
        fills: [],
        strokes: [],
        strokeWeight: 0,
        effects: [],
        textData: {
          characters: "Inside frame",
          fontSize: 14,
          fontName: { family: "Arial", style: "Regular", postscript: "Arial" },
        },
      }],
    }]);

    const result = await figToPptx(figDoc);
    const shape = result.data.slides[0].slide.shapes[0];
    expect(shape.type).toBe("grpSp");
    if (shape.type === "grpSp") {
      // First child should be the background rectangle
      expect(shape.children.length).toBeGreaterThanOrEqual(2);
      const bgShape = shape.children[0];
      expect(bgShape.type).toBe("sp");
      if (bgShape.type === "sp") {
        expect(bgShape.properties.fill).toBeDefined();
        expect(bgShape.properties.fill!.type).toBe("solidFill");
      }
    }
  });

  it("does not insert background when FRAME has no fill", async () => {
    const figDoc = createFigDocument([{
      id: "0:2" as FigNodeId,
      type: "FRAME",
      name: "Empty Frame",
      visible: true,
      opacity: 1,
      transform: { m00: 1, m01: 0, m02: 50, m10: 0, m11: 1, m12: 50 },
      size: { x: 200, y: 100 },
      fills: [],
      strokes: [],
      strokeWeight: 0,
      effects: [],
      children: [{
        id: "0:3" as FigNodeId,
        type: "RECTANGLE",
        name: "Child",
        visible: true,
        opacity: 1,
        transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
        size: { x: 100, y: 50 },
        fills: [{ type: "SOLID" as const, visible: true, opacity: 1, color: { r: 0, g: 0, b: 1, a: 1 } }],
        strokes: [],
        strokeWeight: 0,
        effects: [],
      }],
    }]);

    const result = await figToPptx(figDoc);
    const shape = result.data.slides[0].slide.shapes[0];
    if (shape.type === "grpSp") {
      // Only the child rectangle, no background
      expect(shape.children.length).toBe(1);
    }
  });
});

// =============================================================================
// Slide coordinate preservation (no enlarge)
// =============================================================================

describe("translateAndScaleNodes preserves slide coordinates", () => {
  it("does not enlarge content that fits within the slide", async () => {
    // Create a small shape at (100, 100) with size 200x100
    // This fits well within a 960x540 slide — should not be scaled up
    const figDoc = createFigDocument([{
      id: "0:2" as FigNodeId,
      type: "RECTANGLE",
      name: "Small Rect",
      visible: true,
      opacity: 1,
      transform: { m00: 1, m01: 0, m02: 100, m10: 0, m11: 1, m12: 100 },
      size: { x: 200, y: 100 },
      fills: [{ type: "SOLID" as const, visible: true, opacity: 1, color: { r: 0, g: 0, b: 1, a: 1 } }],
      strokes: [],
      strokeWeight: 0,
      effects: [],
    }]);

    const result = await figToPptx(figDoc, { slideSize: { width: px(960) as Pixels, height: px(540) as Pixels } });
    const shape = result.data.slides[0].slide.shapes[0];
    if (shape.type === "sp") {
      const t = shape.properties.transform!;
      // Position should be preserved (not centered or enlarged)
      expect((t.x as number)).toBeCloseTo(100, 0);
      expect((t.y as number)).toBeCloseTo(100, 0);
      expect((t.width as number)).toBeCloseTo(200, 0);
      expect((t.height as number)).toBeCloseTo(100, 0);
    }
  });
});
