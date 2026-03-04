import { Buffer } from "node:buffer";
import { createDefaultGraphicsState, type PdfGraphicsState, type PdfImage, type PdfPage, type PdfPath, type PdfText } from "@aurochs/pdf/domain";
import { renderPdfDocumentPageToSvg, renderPdfDocumentToSvgs, renderPdfPageToSvg } from "./render-page-svg";

function createGraphicsState(overrides: Partial<PdfGraphicsState> = {}): PdfGraphicsState {
  return {
    ...createDefaultGraphicsState(),
    ...overrides,
  };
}

describe("renderPdfPageToSvg", () => {
  it("renders path/text elements with PDF->SVG coordinate conversion", () => {
    const path: PdfPath = {
      type: "path",
      operations: [
        { type: "moveTo", point: { x: 10, y: 10 } },
        { type: "lineTo", point: { x: 30, y: 10 } },
        { type: "lineTo", point: { x: 30, y: 30 } },
        { type: "closePath" },
      ],
      paintOp: "fill",
      graphicsState: createGraphicsState({
        fillColor: { colorSpace: "DeviceRGB", components: [1, 0, 0] },
        fillAlpha: 0.8,
      }),
    };

    const text: PdfText = {
      type: "text",
      text: "Hello PDF",
      x: 40,
      y: 40,
      width: 50,
      height: 12,
      fontName: "ABCDEE+ArialMT",
      fontSize: 12,
      graphicsState: createGraphicsState({
        fillColor: { colorSpace: "DeviceRGB", components: [0, 0, 1] },
      }),
      charSpacing: 0,
      wordSpacing: 0,
      horizontalScaling: 100,
      fontMetrics: { ascender: 800, descender: -200 },
    };

    const page: PdfPage = {
      pageNumber: 1,
      width: 200,
      height: 100,
      elements: [path, text],
    };

    const svg = renderPdfPageToSvg(page, { backgroundColor: "transparent" });

    expect(svg).toContain("<svg");
    expect(svg).toContain('viewBox="0 0 200 100"');
    expect(svg).toContain('d="M 10 90 L 30 90 L 30 70 Z"');
    expect(svg).toContain('fill="#FF0000"');
    expect(svg).toContain('fill-opacity="0.8"');
    expect(svg).toContain('x="40"');
    expect(svg).toContain('y="48"');
    expect(svg).toContain('font-family="ArialMT"');
    expect(svg).toContain("Hello PDF");
  });

  it("renders image CTM and clip-path definition", () => {
    const pngBytes = Uint8Array.from(
      Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2ZQfQAAAAASUVORK5CYII=", "base64"),
    );

    const image: PdfImage = {
      type: "image",
      data: pngBytes,
      width: 1,
      height: 1,
      colorSpace: "DeviceRGB",
      bitsPerComponent: 8,
      graphicsState: createGraphicsState({
        ctm: [100, 0, 0, 50, 20, 10],
        clipBBox: [15, 5, 80, 40],
      }),
    };

    const page: PdfPage = {
      pageNumber: 1,
      width: 200,
      height: 100,
      elements: [image],
    };

    const svg = renderPdfPageToSvg(page, { backgroundColor: "transparent" });

    expect(svg).toContain("<defs><clipPath id=\"pdf-clip-1\"");
    expect(svg).toContain('clip-path="url(#pdf-clip-1)"');
    expect(svg).toContain('transform="matrix(100 0 0 50 20 40)"');
    expect(svg).toContain("data:image/png;base64,");
  });

  it("renders document helpers for all pages and a target page", () => {
    const emptyPage: PdfPage = {
      pageNumber: 1,
      width: 10,
      height: 10,
      elements: [],
    };

    const document = {
      pages: [emptyPage],
      metadata: { title: "sample" },
    };

    const pages = renderPdfDocumentToSvgs(document, { backgroundColor: "none" });
    expect(pages).toHaveLength(1);
    expect(pages[0]).toContain("<svg");

    const page1 = renderPdfDocumentPageToSvg(document, 1);
    expect(page1).toContain("<svg");

    expect(() => renderPdfDocumentPageToSvg(document, 2)).toThrow("out of range");
  });

  it("renders vertical writing text without rotating glyphs sideways", () => {
    const text: PdfText = {
      type: "text",
      text: "縦書き",
      x: 80,
      y: 100,
      width: 16,
      height: 40,
      fontName: "IPAexMincho",
      fontSize: 12,
      baselineStartX: 90,
      baselineStartY: 140,
      baselineEndX: 90,
      baselineEndY: 100,
      writingMode: 1,
      graphicsState: createGraphicsState({
        fillColor: { colorSpace: "DeviceRGB", components: [0, 0, 0] },
      }),
      horizontalScaling: 100,
    };

    const page: PdfPage = {
      pageNumber: 1,
      width: 200,
      height: 200,
      elements: [text],
    };

    const svg = renderPdfPageToSvg(page, { backgroundColor: "transparent" });

    expect(svg).toContain('x="90"');
    expect(svg).toContain('y="60"');
    expect(svg).toContain('dominant-baseline="text-before-edge"');
    expect(svg).toContain('writing-mode="vertical-rl"');
    expect(svg).toContain('text-orientation="upright"');
    expect(svg).not.toContain('transform="rotate(');
  });
});
