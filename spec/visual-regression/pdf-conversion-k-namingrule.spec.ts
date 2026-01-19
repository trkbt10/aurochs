/**
 * @file PDF→PPTX conversion visual regression (k-namingrule-dl.pdf)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { importPdf } from "../../src/pdf/importer/pdf-importer";
import { exportPptxAsBuffer } from "../../src/pptx/exporter";
import { openPresentation } from "../../src/pptx";
import { loadPptxFile } from "../../scripts/lib/pptx-loader";
import { compareSvgToPdfBaseline } from "./compare";
import { px } from "../../src/ooxml/domain/units";

describe("PDF→PPTX visual regression: k-namingrule-dl.pdf page 2", () => {
  const pdfPath = path.resolve("fixtures/samples/k-namingrule-dl.pdf");
  const snapshotName = "k-namingrule-dl-page2-vs-pdf";
  const slideNumber = 1;
  const outPptxPath = path.resolve("spec/visual-regression/__output__/k-namingrule-dl-page2.pptx");

  it("matches PDF baseline snapshot (pdftoppm)", async () => {
    if (!fs.existsSync(pdfPath)) {
      console.warn(`SKIPPED: PDF not found: ${pdfPath}`);
      return;
    }

    const pdfBytes = fs.readFileSync(pdfPath);
    const result = await importPdf(new Uint8Array(pdfBytes), {
      pages: [2],
      slideSize: { width: px(960), height: px(540) },
      fit: "contain",
      setWhiteBackground: true,
      addPageNumbers: false,
    });

    const pptx = await exportPptxAsBuffer(result.document);
    fs.mkdirSync(path.dirname(outPptxPath), { recursive: true });
    fs.writeFileSync(outPptxPath, Buffer.from(pptx));

    const { presentationFile } = await loadPptxFile(outPptxPath);
    const presentation = openPresentation(presentationFile);
    const slide = presentation.getSlide(slideNumber);
    const svg = slide.renderSVG();

    let compare: ReturnType<typeof compareSvgToPdfBaseline>;
    try {
        compare = compareSvgToPdfBaseline(
        svg,
        snapshotName,
        slideNumber,
        {
          pdfPath,
          pageNumber: 2,
          targetWidth: 960,
          targetHeight: 540,
          dpi: 144,
          renderScale: 4,
          background: { r: 255, g: 255, b: 255, a: 255 },
        },
        { threshold: 0.25, maxDiffPercent: 2.0 },
      );
    } catch (e) {
      const msg = (e as Error)?.message ?? String(e);
      if (msg.includes("pdftoppm failed") || msg.includes("Install poppler")) {
        console.warn(`SKIPPED: ${msg}`);
        return;
      }
      throw e;
    }

    if (!compare.match) {
      console.log(`\n--- PDF conversion diff: ${snapshotName} slide ${slideNumber} ---`);
      console.log(`Diff: ${compare.diffPercent.toFixed(2)}% (max: 2.00%)`);
      console.log(`Expected: ${compare.baselinePath}`);
      console.log(`Actual: ${compare.actualPath}`);
      if (compare.diffImagePath) {
        console.log(`Diff image: ${compare.diffImagePath}`);
      }
    }

    expect(compare.match).toBe(true);
  });
});
