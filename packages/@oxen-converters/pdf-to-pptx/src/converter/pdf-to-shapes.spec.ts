/**
 * @file src/pdf/converter/pdf-to-shapes.spec.ts
 */

import type { PdfImage, PdfPage, PdfPath, PdfText } from "@oxen/pdf/domain";
import { createDefaultGraphicsState } from "@oxen/pdf/domain";
import { px } from "@oxen-office/ooxml/domain/units";
import { convertDocumentToSlides, convertPageToShapes } from "./pdf-to-shapes";
import { createSpatialGrouping, spatialGrouping } from "./text-grouping/spatial-grouping";

const graphicsState = {
  ...createDefaultGraphicsState(),
  fillColor: { colorSpace: "DeviceRGB" as const, components: [1, 0, 0] as const },
  strokeColor: { colorSpace: "DeviceRGB" as const, components: [0, 0, 1] as const },
};

const options = {
  slideWidth: px(100),
  slideHeight: px(100),
} as const;

const KAPPA = 0.5522847498307936;

describe("convertPageToShapes", () => {
  it("converts path/text/image into Shape[] with generated IDs", () => {
    const path: PdfPath = {
      type: "path",
      operations: [{ type: "rect", x: 0, y: 0, width: 10, height: 20 }] as const,
      paintOp: "fill",
      graphicsState,
    };

    const text: PdfText = {
      type: "text",
      text: "Hello",
      x: 10,
      y: 10,
      width: 20,
      height: 5,
      fontName: "ArialMT",
      fontSize: 12,
      graphicsState,
    };

    const image: PdfImage = {
      type: "image",
      // Full PNG signature (8 bytes) - detected as PNG and used as-is
      data: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]),
      width: 10,
      height: 10,
      colorSpace: "DeviceRGB",
      bitsPerComponent: 8,
      graphicsState: { ...graphicsState, ctm: [10, 0, 0, 10, 30, 40] as const },
    };

    const page: PdfPage = {
      pageNumber: 1,
      width: 100,
      height: 100,
      elements: [path, text, image] as const,
    };

    const shapes = convertPageToShapes(page, options);

    expect(shapes).toHaveLength(3);
    expect(shapes[0]?.type).toBe("sp");
    expect(shapes[1]?.type).toBe("sp");
    expect(shapes[2]?.type).toBe("pic");

    const s0 = shapes[0];
    const s1 = shapes[1];
    const s2 = shapes[2];
    if (!s0 || s0.type !== "sp") {throw new Error("Expected sp shape");}
    if (!s1 || s1.type !== "sp") {throw new Error("Expected sp shape");}
    if (!s2 || s2.type !== "pic") {throw new Error("Expected pic shape");}
    expect(s0.nonVisual.id).toBe("1");
    expect(s1.nonVisual.id).toBe("2");
    expect(s2.nonVisual.id).toBe("3");

    const sp0 = shapes[0];
    if (sp0?.type !== "sp") {throw new Error("Expected sp shape");}
    expect(sp0.properties.geometry).toEqual({ type: "preset", preset: "rect", adjustValues: [] });
  });

  it("converts ellipse paths into preset ellipse geometry (preserving size + fill/stroke)", () => {
    const cx = 50;
    const cy = 50;
    const rx = 10;
    const ry = 20;

    const ellipse: PdfPath = {
      type: "path",
      operations: [
        { type: "moveTo", point: { x: cx + rx, y: cy } },
        {
          type: "curveTo",
          cp1: { x: cx + rx, y: cy + ry * KAPPA },
          cp2: { x: cx + rx * KAPPA, y: cy + ry },
          end: { x: cx, y: cy + ry },
        },
        {
          type: "curveTo",
          cp1: { x: cx - rx * KAPPA, y: cy + ry },
          cp2: { x: cx - rx, y: cy + ry * KAPPA },
          end: { x: cx - rx, y: cy },
        },
        {
          type: "curveTo",
          cp1: { x: cx - rx, y: cy - ry * KAPPA },
          cp2: { x: cx - rx * KAPPA, y: cy - ry },
          end: { x: cx, y: cy - ry },
        },
        {
          type: "curveTo",
          cp1: { x: cx + rx * KAPPA, y: cy - ry },
          cp2: { x: cx + rx, y: cy - ry * KAPPA },
          end: { x: cx + rx, y: cy },
        },
        { type: "closePath" },
      ] as const,
      paintOp: "fillStroke",
      graphicsState,
    };

    const page: PdfPage = {
      pageNumber: 1,
      width: 100,
      height: 100,
      elements: [ellipse] as const,
    };

    const shapes = convertPageToShapes(page, options);
    expect(shapes).toHaveLength(1);

    const sp = shapes[0];
    if (!sp || sp.type !== "sp") {throw new Error("Expected sp shape");}

    expect(sp.properties.geometry).toEqual({ type: "preset", preset: "ellipse", adjustValues: [] });
    const transform = sp.properties.transform;
    if (!transform) {throw new Error("Expected transform");}
    expect(transform.width).toEqual(px(rx * 2));
    expect(transform.height).toEqual(px(ry * 2));

    expect(sp.properties.fill).toMatchObject({
      type: "solidFill",
      color: { spec: { type: "srgb", value: "FF0000" } },
    });
    expect(sp.properties.line).toMatchObject({
      fill: { type: "solidFill", color: { spec: { type: "srgb", value: "0000FF" } } },
    });
  });

  it("excludes empty paths and non-painted paths", () => {
    const empty: PdfPath = {
      type: "path",
      operations: [] as const,
      paintOp: "stroke",
      graphicsState,
    };

    const none: PdfPath = {
      type: "path",
      operations: [{ type: "rect", x: 0, y: 0, width: 10, height: 10 }] as const,
      paintOp: "none",
      graphicsState,
    };

    const stroke: PdfPath = {
      type: "path",
      operations: [{ type: "rect", x: 0, y: 0, width: 10, height: 10 }] as const,
      paintOp: "stroke",
      graphicsState,
    };

    const page: PdfPage = {
      pageNumber: 1,
      width: 100,
      height: 100,
      elements: [empty, none, stroke] as const,
    };

    const shapes = convertPageToShapes(page, options);
    expect(shapes).toHaveLength(1);
    expect(shapes[0]?.type).toBe("sp");
  });

  it("groups adjacent text by default with spatialGrouping", () => {
    // With spatialGrouping (the default), adjacent texts on the same line
    // with the same font should be grouped into a single TextBox
    const t1: PdfText = {
      type: "text",
      text: "Hello",
      x: 0,
      y: 10,
      width: 10,
      height: 5,
      fontName: "ArialMT",
      fontSize: 12,
      graphicsState,
    };

    const t2: PdfText = {
      type: "text",
      text: "World",
      x: 20,
      y: 11, // Within tolerance (1 < 12 * 0.3 = 3.6)
      width: 10,
      height: 5,
      fontName: "ArialMT",
      fontSize: 12,
      graphicsState,
    };

    const page: PdfPage = {
      pageNumber: 1,
      width: 100,
      height: 100,
      elements: [t1, t2] as const,
    };

    const shapes = convertPageToShapes(page, options);
    // With spatialGrouping, both texts should be grouped into one TextBox
    expect(shapes).toHaveLength(1);
    expect(shapes[0]?.type).toBe("sp");
  });

  it("supports stepwise grouping presets (none/text/full)", () => {
    const t1: PdfText = {
      type: "text",
      text: "Hello",
      x: 0,
      y: 10,
      width: 10,
      height: 5,
      fontName: "ArialMT",
      fontSize: 12,
      graphicsState,
    };

    const t2: PdfText = {
      type: "text",
      text: "World",
      x: 20,
      y: 11,
      width: 10,
      height: 5,
      fontName: "ArialMT",
      fontSize: 12,
      graphicsState,
    };

    const page: PdfPage = {
      pageNumber: 1,
      width: 100,
      height: 100,
      elements: [t1, t2] as const,
    };

    expect(convertPageToShapes(page, { ...options, grouping: { preset: "none" } })).toHaveLength(2);
    expect(convertPageToShapes(page, { ...options, grouping: { preset: "text" } })).toHaveLength(1);
    expect(convertPageToShapes(page, { ...options, grouping: { preset: "full" } })).toHaveLength(1);
  });

  it("can disable table conversion while keeping text grouping", () => {
    const makeText = (text: string, x: number, y: number): PdfText => ({
      type: "text",
      text,
      x,
      y,
      width: 20,
      height: 10,
      fontName: "ArialMT",
      fontSize: 10,
      graphicsState,
    });

    const xs = [0, 70, 140] as const;
    const ys = [100, 88, 76, 64, 52, 40] as const;
    const tableTexts: PdfText[] = [];
    for (let r = 0; r < ys.length; r++) {
      for (let c = 0; c < xs.length; c++) {
        tableTexts.push(makeText(`R${r}C${c}`, xs[c]!, ys[r]!));
      }
    }

    const page: PdfPage = {
      pageNumber: 1,
      width: 200,
      height: 200,
      elements: tableTexts,
    };

    const stableSpatialGrouping = createSpatialGrouping({
      enableColumnSeparation: false,
      enablePageColumnDetection: false,
      // Avoid splitting a single table row into separate "line fragments" per cell.
      // Table inference expects each row to keep multiple cell runs on the same paragraph.
      horizontalGapRatio: 1_000,
    });

    const withTables = convertPageToShapes(page, {
      ...options,
      textGroupingFn: stableSpatialGrouping,
      grouping: { preset: "full" },
    });
    expect(withTables.some((s) => s.type === "graphicFrame")).toBe(true);

    const withoutTables = convertPageToShapes(page, {
      ...options,
      textGroupingFn: stableSpatialGrouping,
      grouping: { preset: "full", tables: { enabled: false } },
    });
    expect(withoutTables.some((s) => s.type === "graphicFrame")).toBe(false);
  });

  it("throws for invalid minPathComplexity", () => {
    const page: PdfPage = {
      pageNumber: 1,
      width: 100,
      height: 100,
      elements: [] as const,
    };

    expect(() => convertPageToShapes(page, { ...options, minPathComplexity: -1 })).toThrow("Invalid minPathComplexity");
    expect(() => convertPageToShapes(page, { ...options, minPathComplexity: Number.NaN })).toThrow("Invalid minPathComplexity");
  });

  it("filters out low-complexity paths", () => {
    const path: PdfPath = {
      type: "path",
      operations: [{ type: "moveTo", point: { x: 0, y: 0 } }] as const,
      paintOp: "stroke",
      graphicsState,
    };

    const page: PdfPage = { pageNumber: 1, width: 100, height: 100, elements: [path] as const };

    expect(convertPageToShapes(page, { ...options, minPathComplexity: 0 })).toHaveLength(1);
    expect(convertPageToShapes(page, { ...options, minPathComplexity: 2 })).toHaveLength(0);
  });
});

describe("convertPageToShapes with spatialGrouping", () => {
  it("groups adjacent texts on the same line into one TextBox", () => {
    const t1: PdfText = {
      type: "text",
      text: "Hello",
      x: 0,
      y: 100,
      width: 40,
      height: 12,
      fontName: "ArialMT",
      fontSize: 12,
      graphicsState,
    };

    const t2: PdfText = {
      type: "text",
      text: "World",
      x: 50,
      y: 100,
      width: 40,
      height: 12,
      fontName: "ArialMT",
      fontSize: 12,
      graphicsState,
    };

    const page: PdfPage = {
      pageNumber: 1,
      width: 100,
      height: 200,
      elements: [t1, t2] as const,
    };

    const shapes = convertPageToShapes(page, {
      ...options,
      textGroupingFn: spatialGrouping,
    });

    // Should create one TextBox containing both texts
    expect(shapes).toHaveLength(1);
    expect(shapes[0]?.type).toBe("sp");

    const sp = shapes[0];
    if (sp?.type !== "sp") {throw new Error("Expected sp shape");}
    expect(sp.textBody?.paragraphs).toHaveLength(1);
    expect(sp.textBody?.paragraphs[0]?.runs).toHaveLength(1);
    const run = sp.textBody?.paragraphs[0]?.runs[0];
    if (!run || run.type !== "text") {throw new Error("Expected text run");}
    expect(run.text).toBe("Hello World");
  });

  it("groups multi-line text with same font into one TextBox preserving line structure", () => {
    // Lines with normal spacing (small gap) are kept as separate paragraphs
    // to avoid PPTX auto-reflow changing the layout on resize.
    const line1: PdfText = {
      type: "text",
      text: "Line 1",
      x: 0,
      y: 100,
      width: 40,
      height: 12,
      fontName: "ArialMT",
      fontSize: 12,
      graphicsState,
    };

    const line2: PdfText = {
      type: "text",
      text: "Line 2",
      x: 0,
      y: 86, // 14pt below (12pt height + 2pt gap) - normal line spacing
      width: 40,
      height: 12,
      fontName: "ArialMT",
      fontSize: 12,
      graphicsState,
    };

    const page: PdfPage = {
      pageNumber: 1,
      width: 100,
      height: 200,
      elements: [line1, line2] as const,
    };

    const shapes = convertPageToShapes(page, {
      ...options,
      textGroupingFn: spatialGrouping,
    });

    // Should create one TextBox with separate paragraphs per line
    expect(shapes).toHaveLength(1);

    const sp = shapes[0];
    if (sp?.type !== "sp") {throw new Error("Expected sp shape");}
    expect(sp.textBody?.paragraphs).toHaveLength(2);
    expect(sp.textBody?.paragraphs[0]?.runs).toHaveLength(1);
    expect(sp.textBody?.paragraphs[1]?.runs).toHaveLength(1);
  });

  it("creates separate TextBoxes for texts with different fonts", () => {
    const t1: PdfText = {
      type: "text",
      text: "Normal",
      x: 0,
      y: 100,
      width: 40,
      height: 12,
      fontName: "ArialMT",
      fontSize: 12,
      graphicsState,
    };

    const t2: PdfText = {
      type: "text",
      text: "Bold",
      x: 0,
      y: 86,
      width: 40,
      height: 12,
      fontName: "Arial-BoldMT",
      fontSize: 12,
      graphicsState,
    };

    const page: PdfPage = {
      pageNumber: 1,
      width: 100,
      height: 200,
      elements: [t1, t2] as const,
    };

    const shapes = convertPageToShapes(page, {
      ...options,
      textGroupingFn: spatialGrouping,
    });

    // Should create two separate TextBoxes
    expect(shapes).toHaveLength(2);
  });

  it("creates separate TextBoxes for texts far apart", () => {
    const t1: PdfText = {
      type: "text",
      text: "Top",
      x: 0,
      y: 180,
      width: 40,
      height: 12,
      fontName: "ArialMT",
      fontSize: 12,
      graphicsState,
    };

    const t2: PdfText = {
      type: "text",
      text: "Bottom",
      x: 0,
      y: 20,
      width: 40,
      height: 12,
      fontName: "ArialMT",
      fontSize: 12,
      graphicsState,
    };

    const page: PdfPage = {
      pageNumber: 1,
      width: 100,
      height: 200,
      elements: [t1, t2] as const,
    };

    const shapes = convertPageToShapes(page, {
      ...options,
      textGroupingFn: spatialGrouping,
    });

    // Should create two separate TextBoxes due to large vertical gap
    expect(shapes).toHaveLength(2);
  });
});

describe("convertDocumentToSlides", () => {
  it("converts all pages into slides", () => {
    const page1: PdfPage = {
      pageNumber: 1,
      width: 100,
      height: 100,
      elements: [] as const,
    };

    const page2: PdfPage = {
      pageNumber: 2,
      width: 100,
      height: 100,
      elements: [
        {
          type: "text",
          text: "P2",
          x: 0,
          y: 0,
          width: 10,
          height: 5,
          fontName: "ArialMT",
          fontSize: 12,
          graphicsState,
        },
      ] as const,
    };

    const result = convertDocumentToSlides({ pages: [page1, page2] } as const, options);

    expect(result.slides).toHaveLength(2);
    expect(result.slides[0]?.shapes).toHaveLength(0);
    expect(result.slides[1]?.shapes).toHaveLength(1);
  });
});
