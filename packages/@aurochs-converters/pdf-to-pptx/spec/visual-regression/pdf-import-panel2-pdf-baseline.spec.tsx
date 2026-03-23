/**
 * @file PDF import visual regression (panel2.pdf) against PDF raster baseline (tsx).
 *
 * This test compares our rendered SVG (after PDF→PPTX conversion) against
 * a rasterized baseline produced directly from the original PDF via `pdftoppm`.
 *
 * Why: catches layout regressions (line breaks / spacing / positioning) that are
 * hard to validate with text-only assertions.
 */

/**
 * @vitest-environment jsdom
 */

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import type { Slide } from "@aurochs-office/pptx/domain/slide/types";
import type { Shape } from "@aurochs-office/pptx/domain/shape";
import type { PdfPage, PdfPath, PdfText } from "@aurochs/pdf/domain";
import { parsePdf } from "@aurochs/pdf/parser/core/pdf-parser";
import { getSampleFixturePath } from "@aurochs/pdf/test-utils/pdf-fixtures";
import { importPdf } from "../../src/importer/pdf-importer";
import { convertBBox, convertPoint, convertSize, createFitContext } from "../../src/converter/transform-converter";
import { detectTableRegionsFromPaths } from "../../src/converter/table-detection";
import { render } from "@testing-library/react";
import { SlideRendererSvg } from "@aurochs-renderer/pptx/react";
import { compareSvgToPdfBaseline, compareTextRegionMasks, type MaskRect } from "./compare";

function hasPdftoppm(): boolean {
  try {
    execFileSync("pdftoppm", ["-v"], { stdio: "ignore" });
    return true;
  } catch (error) {
    if (error instanceof Error) {
      return false;
    }
    return false;
  }
}

describe("PDF import visual regression (panel2.pdf)", () => {
  const PDF_PATH = getSampleFixturePath("panel2.pdf");
  const SLIDE_WIDTH = 960;
  const SLIDE_HEIGHT = 540;

  // Mock getComputedTextLength for JSDOM (used by text layout paths).
  const ensureSvgTextMeasurement = () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    svg.appendChild(text);
    document.body.appendChild(svg);
    const proto = Object.getPrototypeOf(text);
    if (!proto.getComputedTextLength) {
      proto.getComputedTextLength = function () {
        return (this.textContent?.length ?? 0) * 8;
      };
    }
    document.body.removeChild(svg);
  };

  const rectArea = (rect: MaskRect): number => Math.max(0, rect.width) * Math.max(0, rect.height);
  const rectOverlapArea = (a: MaskRect, b: MaskRect): number => {
    const x0 = Math.max(a.x, b.x);
    const y0 = Math.max(a.y, b.y);
    const x1 = Math.min(a.x + a.width, b.x + b.width);
    const y1 = Math.min(a.y + a.height, b.y + b.height);
    if (!(x1 > x0) || !(y1 > y0)) {
      return 0;
    }
    return (x1 - x0) * (y1 - y0);
  };
  const rectIou = (a: MaskRect, b: MaskRect): number => {
    const overlap = rectOverlapArea(a, b);
    const union = rectArea(a) + rectArea(b) - overlap;
    return union > 0 ? overlap / union : 0;
  };

  function collectSlideTextRegionRects(slide: Slide): readonly MaskRect[] {
    const collectFromShape = (shape: Shape): readonly MaskRect[] => {
      if (shape.type === "sp" && shape.textBody && shape.properties.transform) {
        const tr = shape.properties.transform;
        return [{ x: tr.x as number, y: tr.y as number, width: tr.width as number, height: tr.height as number }];
      }

      if (shape.type === "grpSp") {
        return shape.children.flatMap((child) => collectFromShape(child));
      }

      return [];
    };

    return slide.shapes.flatMap((shape) => collectFromShape(shape)).filter((rect) => rect.width > 0 && rect.height > 0);
  }

  function collectSlideTableRects(slide: Slide): readonly MaskRect[] {
    const collectFromShape = (shape: Shape): readonly MaskRect[] => {
      if (shape.type === "graphicFrame" && shape.content.type === "table") {
        const tr = shape.transform;
        return [{ x: tr.x as number, y: tr.y as number, width: tr.width as number, height: tr.height as number }];
      }
      if (shape.type === "grpSp") {
        return shape.children.flatMap((child) => collectFromShape(child));
      }
      return [];
    };
    return slide.shapes.flatMap((shape) => collectFromShape(shape)).filter((rect) => rect.width > 0 && rect.height > 0);
  }

  function collectPdfTableRects(page: PdfPage): readonly MaskRect[] {
    const paths = page.elements.filter((element): element is PdfPath => element.type === "path");
    const context = createFitContext({
      pdfWidth: page.width,
      pdfHeight: page.height,
      slideWidth: px(SLIDE_WIDTH),
      slideHeight: px(SLIDE_HEIGHT),
      fit: "contain",
    });
    return detectTableRegionsFromPaths(paths, { width: page.width, height: page.height }).map((region) => {
      const bbox = convertBBox([region.x0, region.y0, region.x1, region.y1], context);
      return {
        x: bbox.x as number,
        y: bbox.y as number,
        width: bbox.width as number,
        height: bbox.height as number,
      };
    });
  }

  function collectPdfTextRects(page: PdfPage, args?: { readonly excludeInside?: readonly MaskRect[] }): readonly MaskRect[] {
    const context = createFitContext({
      pdfWidth: page.width,
      pdfHeight: page.height,
      slideWidth: px(SLIDE_WIDTH),
      slideHeight: px(SLIDE_HEIGHT),
      fit: "contain",
    });

    return page.elements
      .filter((element): element is PdfText => element.type === "text")
      .map((text) => {
        const position = convertPoint({ x: text.x, y: text.y }, context);
        const size = convertSize(text.width, text.height, context);
        return {
          x: position.x as number,
          y: (position.y as number) - (size.height as number),
          width: size.width as number,
          height: size.height as number,
        };
      })
      .filter((rect) => {
        const excludeInside = args?.excludeInside;
        if (!excludeInside || excludeInside.length === 0) {
          return true;
        }
        const area = rectArea(rect);
        if (!(area > 0)) {
          return false;
        }
        const overlap = Math.max(...excludeInside.map((zone) => rectOverlapArea(rect, zone)), 0);
        return overlap / area < 0.6;
      })
      .filter((rect) => rect.width > 0 && rect.height > 0);
  }

  function assertTablePlacement(pageNumber: number, pdfPage: PdfPage, slide: Slide): void {
    const baselineTables = collectPdfTableRects(pdfPage);
    const actualTables = collectSlideTableRects(slide);
    if (baselineTables.length === 0 || actualTables.length === 0) {
      return;
    }
    for (const actual of actualTables) {
      const bestIou = Math.max(0, ...baselineTables.map((baseline) => rectIou(actual, baseline)));
      console.log(`tableIoU(page=${pageNumber})=${bestIou.toFixed(3)}`);
      expect(bestIou).toBeGreaterThanOrEqual(0.6);
    }
  }

  async function renderImportedPdfPage(args: {
    readonly pageNumber: number;
  }): Promise<{ readonly svg: string; readonly slide: Slide; readonly pdfPage: PdfPage }> {
    const { pageNumber } = args;
    const pdfBytes = readFileSync(PDF_PATH);
    const parsed = await parsePdf(pdfBytes, { pages: [pageNumber] });
    const pdfPage = parsed.pages[0];
    if (!pdfPage) {
      throw new Error(`Expected parsed PDF page ${pageNumber}`);
    }

    const { document } = await importPdf(pdfBytes, {
      pages: [pageNumber],
      slideSize: { width: px(SLIDE_WIDTH), height: px(SLIDE_HEIGHT) },
      fit: "contain",
      setWhiteBackground: true,
      addPageNumbers: false,
      grouping: { preset: "auto" },
    });

    const slide = document.slides[0]?.slide;
    if (!slide) {
      throw new Error(`Expected imported slide for page ${pageNumber}`);
    }

    ensureSvgTextMeasurement();

    const { container } = render(
      <SlideRendererSvg
        slide={slide}
        slideSize={{ width: document.slideWidth, height: document.slideHeight }}
        colorContext={document.colorContext}
        resources={document.resources}
        resourceStore={document.resourceStore}
        embeddedFontCss={document.embeddedFontCss}
      />,
    );

    const svg = container.querySelector("svg");
    if (!svg) {
      throw new Error("Expected rendered <svg>");
    }
    return { svg: svg.outerHTML, slide, pdfPage };
  }

  it("matches original PDF raster within tolerance (page 1)", async () => {
    if (!hasPdftoppm()) {
      console.warn("SKIPPED: pdftoppm is not installed (install poppler).");
      return;
    }

    const { svg, slide, pdfPage } = await renderImportedPdfPage({ pageNumber: 1 });

    const result = compareSvgToPdfBaseline({
      svg,
      snapshotName: "pdf-import-panel2",
      slideNumber: 1,
      baseline: {
        pdfPath: PDF_PATH,
        pageNumber: 1,
        dpi: 144,
        targetWidth: SLIDE_WIDTH,
        targetHeight: SLIDE_HEIGHT,
        renderScale: 2,
        fit: "contain",
        background: { r: 255, g: 255, b: 255, a: 255 },
      },
      options: { maxDiffPercent: 5, threshold: 0.1 },
    });

    if (!result.match) {
      console.log(`\n--- PDF baseline diff: panel2.pdf page 1 ---`);
      console.log(`Diff: ${result.diffPercent.toFixed(2)}% (max: 5%)`);
      console.log(`Diff pixels: ${result.diffPixels} / ${result.totalPixels}`);
      console.log(`Baseline: ${result.baselinePath}`);
      console.log(`Actual:   ${result.actualPath}`);
      if (result.diffImagePath) {
        console.log(`Diff:     ${result.diffImagePath}`);
      }
    }

    expect(result.match).toBe(true);
    assertTablePlacement(1, pdfPage, slide);
    const pdfTableRects = collectSlideTableRects(slide).length > 0 ? collectPdfTableRects(pdfPage) : [];

    const textRegion = compareTextRegionMasks({
      snapshotName: "pdf-import-panel2-text-layout",
      slideNumber: 1,
      width: SLIDE_WIDTH,
      height: SLIDE_HEIGHT,
      baselineRects: collectPdfTextRects(pdfPage, { excludeInside: pdfTableRects }),
      actualRects: collectSlideTextRegionRects(slide),
    });
    console.log("\n--- Text region mask: panel2.pdf page 1 ---");
    console.log(
      `precision=${textRegion.precision.toFixed(3)} recall=${textRegion.recall.toFixed(3)} f1=${textRegion.f1.toFixed(3)} iou=${textRegion.iou.toFixed(3)}`,
    );
    console.log(`baselineMask: ${textRegion.baselinePath}`);
    console.log(`actualMask:   ${textRegion.actualPath}`);
    console.log(`diffMask:     ${textRegion.diffPath}`);
    expect(textRegion.recall).toBeGreaterThanOrEqual(0.98);
    expect(textRegion.precision).toBeGreaterThanOrEqual(0.8);
    expect(textRegion.f1).toBeGreaterThanOrEqual(0.88);
  });

  it("matches original PDF raster within tolerance (page 2)", async () => {
    if (!hasPdftoppm()) {
      console.warn("SKIPPED: pdftoppm is not installed (install poppler).");
      return;
    }

    const { svg, slide, pdfPage } = await renderImportedPdfPage({ pageNumber: 2 });

    const result = compareSvgToPdfBaseline({
      svg,
      snapshotName: "pdf-import-panel2",
      slideNumber: 2,
      baseline: {
        pdfPath: PDF_PATH,
        pageNumber: 2,
        dpi: 144,
        targetWidth: SLIDE_WIDTH,
        targetHeight: SLIDE_HEIGHT,
        renderScale: 2,
        fit: "contain",
        background: { r: 255, g: 255, b: 255, a: 255 },
      },
      options: { maxDiffPercent: 7, threshold: 0.1 },
    });

    if (!result.match) {
      console.log(`\n--- PDF baseline diff: panel2.pdf page 2 ---`);
      console.log(`Diff: ${result.diffPercent.toFixed(2)}% (max: 7%)`);
      console.log(`Diff pixels: ${result.diffPixels} / ${result.totalPixels}`);
      console.log(`Baseline: ${result.baselinePath}`);
      console.log(`Actual:   ${result.actualPath}`);
      if (result.diffImagePath) {
        console.log(`Diff:     ${result.diffImagePath}`);
      }
    }

    expect(result.match).toBe(true);
    assertTablePlacement(2, pdfPage, slide);
    const pdfTableRects = collectSlideTableRects(slide).length > 0 ? collectPdfTableRects(pdfPage) : [];

    const textRegion = compareTextRegionMasks({
      snapshotName: "pdf-import-panel2-text-layout",
      slideNumber: 2,
      width: SLIDE_WIDTH,
      height: SLIDE_HEIGHT,
      baselineRects: collectPdfTextRects(pdfPage, { excludeInside: pdfTableRects }),
      actualRects: collectSlideTextRegionRects(slide),
    });
    console.log("\n--- Text region mask: panel2.pdf page 2 ---");
    console.log(
      `precision=${textRegion.precision.toFixed(3)} recall=${textRegion.recall.toFixed(3)} f1=${textRegion.f1.toFixed(3)} iou=${textRegion.iou.toFixed(3)}`,
    );
    console.log(`baselineMask: ${textRegion.baselinePath}`);
    console.log(`actualMask:   ${textRegion.actualPath}`);
    console.log(`diffMask:     ${textRegion.diffPath}`);
    expect(textRegion.recall).toBeGreaterThanOrEqual(0.95);
    expect(textRegion.precision).toBeGreaterThanOrEqual(0.66);
    expect(textRegion.f1).toBeGreaterThanOrEqual(0.8);
  });
});
