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
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { px } from "@oxen-office/ooxml/domain/units";
import { importPdf } from "@oxen-office/pdf-to-pptx/importer/pdf-importer";
import { render } from "@testing-library/react";
import { SlideRendererSvg } from "@oxen-office/pptx-render/react";
import { compareSvgToPdfBaseline } from "./compare";

function hasPdftoppm(): boolean {
  try {
    execFileSync("pdftoppm", ["-v"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

describe("PDF import visual regression (panel2.pdf)", () => {
  const PDF_PATH = path.resolve("fixtures/samples/panel2.pdf");
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

  async function renderImportedPdfPageToSvg(pageNumber: number): Promise<string> {
    const pdfBytes = readFileSync(PDF_PATH);
    const { document } = await importPdf(pdfBytes, {
      pages: [pageNumber],
      slideSize: { width: px(SLIDE_WIDTH), height: px(SLIDE_HEIGHT) },
      fit: "contain",
      setWhiteBackground: true,
      addPageNumbers: false,
      grouping: { preset: "text" },
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
        embeddedFontCss={document.embeddedFontCss}
      />,
    );

    const svg = container.querySelector("svg");
    if (!svg) {
      throw new Error("Expected rendered <svg>");
    }
    return svg.outerHTML;
  }

  it("matches original PDF raster within tolerance (page 1)", async () => {
    if (!hasPdftoppm()) {
      console.warn("SKIPPED: pdftoppm is not installed (install poppler).");
      return;
    }

    const svg = await renderImportedPdfPageToSvg(1);

    const result = compareSvgToPdfBaseline(
      svg,
      "pdf-import-panel2",
      1,
      {
        pdfPath: PDF_PATH,
        pageNumber: 1,
        dpi: 144,
        targetWidth: SLIDE_WIDTH,
        targetHeight: SLIDE_HEIGHT,
        renderScale: 2,
        fit: "contain",
        background: { r: 255, g: 255, b: 255, a: 255 },
      },
      { maxDiffPercent: 5, threshold: 0.1 },
    );

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
  });

  it("matches original PDF raster within tolerance (page 2)", async () => {
    if (!hasPdftoppm()) {
      console.warn("SKIPPED: pdftoppm is not installed (install poppler).");
      return;
    }

    const svg = await renderImportedPdfPageToSvg(2);

    const result = compareSvgToPdfBaseline(
      svg,
      "pdf-import-panel2",
      2,
      {
        pdfPath: PDF_PATH,
        pageNumber: 2,
        dpi: 144,
        targetWidth: SLIDE_WIDTH,
        targetHeight: SLIDE_HEIGHT,
        renderScale: 2,
        fit: "contain",
        background: { r: 255, g: 255, b: 255, a: 255 },
      },
      { maxDiffPercent: 7, threshold: 0.1 },
    );

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
  });
});
