import type { PdfImage, PdfPage, PdfPath, PdfText } from "../domain";
import { createDefaultGraphicsState } from "../domain";
import { px } from "../../ooxml/domain/units";
import { convertDocumentToSlides, convertPageToShapes } from "./pdf-to-shapes";

const graphicsState = {
  ...createDefaultGraphicsState(),
  fillColor: { colorSpace: "DeviceRGB" as const, components: [1, 0, 0] as const },
  strokeColor: { colorSpace: "DeviceRGB" as const, components: [0, 0, 1] as const },
};

const options = {
  slideWidth: px(100),
  slideHeight: px(100),
} as const;

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
      data: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00]),
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
    if (!s0 || s0.type !== "sp") throw new Error("Expected sp shape");
    if (!s1 || s1.type !== "sp") throw new Error("Expected sp shape");
    if (!s2 || s2.type !== "pic") throw new Error("Expected pic shape");
    expect(s0.nonVisual.id).toBe("1");
    expect(s1.nonVisual.id).toBe("2");
    expect(s2.nonVisual.id).toBe("3");

    const sp0 = shapes[0];
    if (sp0?.type !== "sp") throw new Error("Expected sp shape");
    expect(sp0.properties.geometry).toEqual({ type: "preset", preset: "rect", adjustValues: [] });
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

  it("does not group text by default (preserves PDF TextObject structure)", () => {
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

    const shapes = convertPageToShapes(page, options);
    expect(shapes).toHaveLength(2);
    expect(shapes[0]?.type).toBe("sp");
    expect(shapes[1]?.type).toBe("sp");
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
