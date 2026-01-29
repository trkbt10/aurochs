/**
 * @file PDF→PPTX conversion visual regression (k-namingrule-dl.pdf)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { importPdf } from "../../src/importer/pdf-importer";
import { exportPptxAsBuffer } from "@oxen-office/pptx/exporter";
import { openPresentation } from "@oxen-office/pptx";
import { loadPptxFile } from "../../../../../scripts/lib/pptx-loader";
import { compareSvgToPdfBaseline } from "./compare";
import { px } from "@oxen-office/ooxml/domain/units";
import { renderSlideToSvg } from "@oxen-renderer/pptx/svg";

const ROOT_DIR = path.resolve(__dirname, "../../../../../");

function guessFontExtension(bytes: Uint8Array): "ttf" | "otf" {
  if (bytes.length >= 4) {
    const sig = String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!);
    if (sig === "OTTO") {return "otf";}
  }
  return "ttf";
}

describe("PDF→PPTX visual regression: k-namingrule-dl.pdf", () => {
  const pdfPath = path.join(ROOT_DIR, "fixtures/samples/k-namingrule-dl.pdf");
  const slideNumber = 1;
  const renderPdfPageToSvg = async (pageNumber: number, outPptxPath: string): Promise<{ svg: string; fontFiles: readonly string[]; cleanupFonts: () => void }> => {
    const pdfBytes = fs.readFileSync(pdfPath);
    const result = await importPdf(new Uint8Array(pdfBytes), {
      pages: [pageNumber],
      slideSize: { width: px(960), height: px(540) },
      fit: "contain",
      setWhiteBackground: true,
      addPageNumbers: false,
    });

    const pptx = await exportPptxAsBuffer(result.document);
    fs.mkdirSync(path.dirname(outPptxPath), { recursive: true });
    fs.writeFileSync(outPptxPath, Buffer.from(pptx));

    const { presentationFile, zipPackage } = await loadPptxFile(outPptxPath);
    const presentation = openPresentation(presentationFile);
    const slide = presentation.getSlide(slideNumber);
    const { svg } = renderSlideToSvg(slide);

    const fontEntries = zipPackage
      .listFiles()
      .filter((p) => p.startsWith("ppt/fonts/") && p.endsWith(".fntdata"))
      .sort();

    if (fontEntries.length === 0) {
      return { svg, fontFiles: [], cleanupFonts: () => {} };
    }

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "web-pptx-fonts-"));
    const fontFiles: string[] = [];
    for (const entry of fontEntries) {
      const buf = zipPackage.readBinary(entry);
      if (!buf) {continue;}
      const bytes = new Uint8Array(buf);
      const ext = guessFontExtension(bytes);
      const outPath = path.join(dir, `${path.basename(entry, ".fntdata")}.${ext}`);
      fs.writeFileSync(outPath, Buffer.from(bytes));
      fontFiles.push(outPath);
    }

    const cleanupFonts = () => {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    };

    return { svg, fontFiles, cleanupFonts };
  };

  const run = async (pageNumber: number) => {
    if (!fs.existsSync(pdfPath)) {
      console.warn(`SKIPPED: PDF not found: ${pdfPath}`);
      return;
    }

    const snapshotName = `k-namingrule-dl-page${pageNumber}-vs-pdf`;
    const outPptxPath = path.join(__dirname, `__output__/k-namingrule-dl-page${pageNumber}.pptx`);
    const { svg, fontFiles, cleanupFonts } = await renderPdfPageToSvg(pageNumber, outPptxPath);

    let compare: ReturnType<typeof compareSvgToPdfBaseline>;
    try {
      compare = compareSvgToPdfBaseline(
        svg,
        snapshotName,
        slideNumber,
        {
          pdfPath,
          pageNumber,
          targetWidth: 960,
          targetHeight: 540,
          dpi: 144,
          renderScale: 4,
          background: { r: 255, g: 255, b: 255, a: 255 },
        },
        { threshold: 0.25, maxDiffPercent: 2.0, resvgFontFiles: fontFiles },
      );
    } catch (e) {
      cleanupFonts();
      const msg = (e as Error)?.message ?? String(e);
      if (msg.includes("pdftoppm failed") || msg.includes("Install poppler")) {
        console.warn(`SKIPPED: ${msg}`);
        return;
      }
      throw e;
    }
    cleanupFonts();

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
  };

  it("matches PDF baseline snapshot (page 1)", async () => {
    await run(1);
  });

  it("matches PDF baseline snapshot (page 2)", async () => {
    await run(2);
  });
});
