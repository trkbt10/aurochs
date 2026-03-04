/**
 * @file Auto-grouping visual regression against both LibreOffice snapshot and PDF baseline.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import { importPdf } from "../../src/importer/pdf-importer";
import { exportPptxAsBuffer } from "@aurochs-builder/pptx/export";
import { openPresentation } from "@aurochs-office/pptx";
import { loadPptxBundleFromBuffer } from "@aurochs-office/pptx/app/pptx-loader";
import { renderSlideToSvg } from "@aurochs-renderer/pptx/svg";
import { getSampleFixturePath } from "@aurochs/pdf/test-utils/pdf-fixtures";
import { compareSvgToPdfBaseline, compareSvgToSnapshot, hasSnapshot } from "./compare";

type VisualCase = {
  readonly name: string;
  readonly pdfPath: string;
  readonly pages: readonly number[];
  readonly pdfMaxDiffPercent: number;
  readonly snapshotName: string;
  readonly snapshotMaxDiffPercent: number;
};

const VISUAL_CASES: readonly VisualCase[] = [
  {
    name: "panel2",
    pdfPath: getSampleFixturePath("panel2.pdf"),
    pages: [1, 2],
    pdfMaxDiffPercent: 7,
    snapshotName: "pdf-import-panel2-libreoffice",
    snapshotMaxDiffPercent: 6,
  },
  {
    name: "k-namingrule-dl",
    pdfPath: getSampleFixturePath("k-namingrule-dl.pdf"),
    pages: [1, 2],
    pdfMaxDiffPercent: 2,
    snapshotName: "k-namingrule-dl-libreoffice",
    snapshotMaxDiffPercent: 5.5,
  },
  {
    name: "k-resource-dl",
    pdfPath: getSampleFixturePath("k-resource-dl.pdf"),
    pages: [2, 4, 5],
    pdfMaxDiffPercent: 5,
    snapshotName: "k-resource-dl-libreoffice",
    snapshotMaxDiffPercent: 6,
  },
] as const;

function guessFontExtension(bytes: Uint8Array): "ttf" | "otf" {
  if (bytes.length >= 4) {
    const sig = String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!);
    if (sig === "OTTO") {
      return "otf";
    }
  }
  return "ttf";
}

async function renderPdfPageToSvg(args: {
  readonly pdfPath: string;
  readonly pageNumber: number;
  readonly outPptxPath: string;
}): Promise<{ readonly svg: string; readonly fontFiles: readonly string[]; readonly cleanupFonts: () => void }> {
  const pdfBytes = fs.readFileSync(args.pdfPath);
  const result = await importPdf(new Uint8Array(pdfBytes), {
    pages: [args.pageNumber],
    slideSize: { width: px(960), height: px(540) },
    fit: "contain",
    setWhiteBackground: true,
    addPageNumbers: false,
    grouping: { preset: "auto" },
  });

  const pptx = await exportPptxAsBuffer(result.document);
  fs.mkdirSync(path.dirname(args.outPptxPath), { recursive: true });
  fs.writeFileSync(args.outPptxPath, Buffer.from(pptx));

  const { presentationFile, zipPackage } = await loadPptxBundleFromBuffer(pptx);
  const presentation = openPresentation(presentationFile);
  const slide = presentation.getSlide(1);
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
    if (!buf) {
      continue;
    }
    const bytes = new Uint8Array(buf);
    const ext = guessFontExtension(bytes);
    const outPath = path.join(dir, `${path.basename(entry, ".fntdata")}.${ext}`);
    fs.writeFileSync(outPath, Buffer.from(bytes));
    fontFiles.push(outPath);
  }

  const cleanupFonts = () => {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (error) {
      if (error instanceof Error) {
        return;
      }
    }
  };

  return { svg, fontFiles, cleanupFonts };
}

describe("PDF→PPTX visual regression with auto grouping", () => {
  for (const testCase of VISUAL_CASES) {
    for (const pageNumber of testCase.pages) {
      it(`${testCase.name} page ${pageNumber}: matches PDF baseline and LibreOffice snapshot`, async () => {
        if (!fs.existsSync(testCase.pdfPath)) {
          console.warn(`SKIPPED: PDF not found: ${testCase.pdfPath}`);
          return;
        }

        const outPptxPath = path.join(
          __dirname,
          `__output__/auto-${testCase.name}-page${pageNumber}.pptx`,
        );

        const { svg, fontFiles, cleanupFonts } = await renderPdfPageToSvg({
          pdfPath: testCase.pdfPath,
          pageNumber,
          outPptxPath,
        });

        const pdfResult = compareSvgToPdfBaseline({
          svg,
          snapshotName: `auto-${testCase.name}-page${pageNumber}-vs-pdf`,
          slideNumber: 1,
          baseline: {
            pdfPath: testCase.pdfPath,
            pageNumber,
            targetWidth: 960,
            targetHeight: 540,
            dpi: 144,
            renderScale: 4,
            background: { r: 255, g: 255, b: 255, a: 255 },
          },
          options: {
            threshold: 0.25,
            maxDiffPercent: testCase.pdfMaxDiffPercent,
            resvgFontFiles: fontFiles,
          },
        });

        if (!pdfResult.match) {
          console.log(`\n--- AUTO PDF diff: ${testCase.name} page ${pageNumber} ---`);
          console.log(`Diff: ${pdfResult.diffPercent.toFixed(2)}% (max: ${testCase.pdfMaxDiffPercent.toFixed(2)}%)`);
          console.log(`Baseline: ${pdfResult.baselinePath}`);
          console.log(`Actual:   ${pdfResult.actualPath}`);
          if (pdfResult.diffImagePath) {
            console.log(`Diff:     ${pdfResult.diffImagePath}`);
          }
        }
        expect(pdfResult.match).toBe(true);

        if (!hasSnapshot(testCase.snapshotName, pageNumber)) {
          console.warn(
            `SKIPPED LibreOffice snapshot check: snapshot not found (${testCase.snapshotName} slide ${pageNumber})`,
          );
          cleanupFonts();
          return;
        }

        const snapshotResult = compareSvgToSnapshot({
          svg,
          snapshotName: testCase.snapshotName,
          slideNumber: pageNumber,
          options: {
            threshold: 0.2,
            maxDiffPercent: testCase.snapshotMaxDiffPercent,
            resvgFontFiles: fontFiles,
          },
        });

        if (!snapshotResult.match) {
          console.log(`\n--- AUTO LibreOffice diff: ${testCase.name} page ${pageNumber} ---`);
          console.log(
            `Diff: ${snapshotResult.diffPercent.toFixed(2)}% (max: ${testCase.snapshotMaxDiffPercent.toFixed(2)}%)`,
          );
          if (snapshotResult.diffImagePath) {
            console.log(`Diff: ${snapshotResult.diffImagePath}`);
          }
        }

        cleanupFonts();
        expect(snapshotResult.match).toBe(true);
      }, 20_000);
    }
  }
});
