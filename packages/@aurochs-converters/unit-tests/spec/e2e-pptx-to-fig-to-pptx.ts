/**
 * @file E2E: Load real PPTX fixtures → pptx-to-fig → fig-to-pptx → export PPTX → LibreOffice PDF
 *
 * Roundtrip conversion of real PPTX files containing tables, charts, diagrams.
 * Outputs both the original and roundtripped PDFs for visual comparison.
 *
 * Usage:
 *   bun packages/@aurochs-converters/unit-tests/spec/e2e-pptx-to-fig-to-pptx.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";
import { execSync } from "node:child_process";
import { loadPptxBundleFromBuffer } from "@aurochs-office/pptx/app/pptx-loader";
import { openPresentation } from "@aurochs-office/pptx/app";
import { convertToPresentationDocument } from "@aurochs-office/pptx/app/presentation-converter";
import { convert as pptxToFig } from "@aurochs-converters/pptx-to-fig";
import { convert as figToPptx } from "@aurochs-converters/fig-to-pptx";
import { exportPptxAsBuffer } from "@aurochs-builder/pptx/export";
import { createBlankPptxPackageFile } from "@aurochs-converters/pdf-to-pptx/importer/pptx-template";

const REPO_ROOT = resolve(import.meta.dir, "../../../..");
const OUT_DIR = resolve(import.meta.dir, "__output__");

const FIXTURES = [
  "fixtures/poi-test-data/test-data/slideshow/table_test.pptx",
  "fixtures/poi-test-data/test-data/slideshow/table-with-theme.pptx",
  "fixtures/poi-test-data/test-data/slideshow/bar-chart.pptx",
  "fixtures/poi-test-data/test-data/slideshow/smartart-simple.pptx",
];

function toPdf(pptxPath: string, outDir: string): string | null {
  try {
    execSync(`soffice --headless --convert-to pdf --outdir "${outDir}" "${pptxPath}"`, {
      timeout: 30000,
      stdio: "pipe",
    });
    return pptxPath.replace(/\.pptx$/, ".pdf");
  } catch (error) {
    console.log(`LibreOffice not available or conversion failed: ${String(error)}`);
    return null;
  }
}

async function processFixture(relativePath: string) {
  const name = basename(relativePath, ".pptx");
  const srcPath = resolve(REPO_ROOT, relativePath);
  if (!existsSync(srcPath)) {
    console.log(`  SKIP: ${relativePath} not found`);
    return;
  }

  console.log(`\n--- ${name} ---`);

  // 1. Convert original to PDF for reference
  console.log("  1. Original → PDF");
  const origPdfPath = resolve(OUT_DIR, `${name}-original.pptx`);
  writeFileSync(origPdfPath, readFileSync(srcPath));
  toPdf(origPdfPath, OUT_DIR);

  // 2. Parse PPTX → PresentationDocument
  console.log("  2. Parsing PPTX...");
  const buf = readFileSync(srcPath);
  const bundle = await loadPptxBundleFromBuffer(buf);
  const pres = openPresentation(bundle.presentationFile);
  const presDoc = convertToPresentationDocument({
    presentation: pres,
    presentationFile: bundle.presentationFile,
  });
  console.log(`     ${presDoc.slides.length} slides`);

  // 3. PPTX → Fig
  console.log("  3. PPTX → Fig...");
  const figResult = await pptxToFig(presDoc);
  const figDoc = figResult.data;
  for (let i = 0; i < figDoc.pages.length; i++) {
    const page = figDoc.pages[i];
    console.log(`     Page ${i + 1}: ${page.children.length} nodes`);
  }

  // 4. Fig → PPTX
  console.log("  4. Fig → PPTX...");
  const pptxResult = await figToPptx(figDoc);
  const roundtrippedDoc = pptxResult.data;
  console.log(`     ${roundtrippedDoc.slides.length} slides, ${roundtrippedDoc.slides[0].slide.shapes.length} shapes`);

  // 5. Export roundtripped PPTX
  console.log("  5. Exporting roundtripped PPTX...");
  const templateFile = createBlankPptxPackageFile(
    roundtrippedDoc.slides.length,
    { width: roundtrippedDoc.slideWidth, height: roundtrippedDoc.slideHeight },
  );
  const templatePres = openPresentation(templateFile);
  const slidesWithApi = roundtrippedDoc.slides.map((s, i) => ({
    ...s,
    apiSlide: templatePres.getSlide(i + 1),
  }));
  const docForExport = {
    ...roundtrippedDoc,
    slides: slidesWithApi,
    presentationFile: templateFile,
  };

  const exportedBuffer = await exportPptxAsBuffer(docForExport);
  const rtPptxPath = resolve(OUT_DIR, `${name}-roundtrip.pptx`);
  writeFileSync(rtPptxPath, new Uint8Array(exportedBuffer));
  console.log(`     Written: ${rtPptxPath} (${exportedBuffer.byteLength} bytes)`);

  // 6. Roundtripped PPTX → PDF
  console.log("  6. Roundtripped → PDF");
  const rtPdf = toPdf(rtPptxPath, OUT_DIR);
  if (rtPdf) {
    console.log(`     PDF generated`);
  } else {
    console.log(`     PDF generation failed (LibreOffice issue)`);
  }
}

async function main() {
  if (!existsSync(OUT_DIR)) {mkdirSync(OUT_DIR, { recursive: true });}

  for (const fixture of FIXTURES) {
    await processFixture(fixture);
  }

  console.log(`\nOutput: ${OUT_DIR}`);
  execSync(`ls -la "${OUT_DIR}"`, { stdio: "inherit" });
}

main().catch((err) => {
  console.error("E2E failed:", err);
  process.exit(1);
});
